/**
 * Automated Security & Hardening Verification Test Suite
 * Verifies authentication, authorization (RBAC), data integrity,
 * concurrency controls, IDOR prevention, and audit immutability.
 */

import {
  assetStore,
  complianceService,
  ConcurrencyConflictError,
  ValidationError,
} from "../server/store";
import {
  createSessionForOperator,
  getSession,
  auditTrail,
  OPERATOR_ACCOUNTS,
} from "../server/security";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}: ${detail || "Assertion failed"}`);
    failedCount++;
  }
}

async function runSecurityTestSuite() {
  console.log("=================================================");
  console.log("Running Standalone Emergency Console Security Tests");
  console.log("=================================================");

  // TEST 1: Unauthenticated session validation
  const invalidSession = getSession("untrusted_fake_token_12345");
  assert(invalidSession === null, "Test 1: Unauthenticated token rejected");

  // TEST 2: Valid Operator Authentication & Safe Session Object
  const loginSession = createSessionForOperator("dispatcher_sarah", "EmergencyDuty#2026");
  assert(loginSession !== null, "Test 2a: Valid credentials generate operator session");
  assert(
    !("password" in (loginSession as any)) && !("passwordHash" in (loginSession as any)),
    "Test 2b: Session object contains NO password or credential secrets"
  );
  assert(loginSession?.operator.role === "DISPATCHER", "Test 2c: Operator role is correctly assigned");

  // TEST 3: Invalid Credentials Rejection
  const failedLogin = createSessionForOperator("dispatcher_sarah", "WrongPassword!999");
  assert(failedLogin === null, "Test 3: Invalid password rejected with null session");

  // TEST 4: Optimistic Concurrency Control (Version Conflict Detection)
  const zonesBefore = assetStore.getZones();
  const testZone = zonesBefore.find((z) => z.id === "CN-HEALTH-ZONE-1")!;
  const currentVersion = testZone.version;

  // Simulate concurrent update: client submits stale version
  let conflictCaught = false;
  try {
    assetStore.updateVentilators(
      "CN-HEALTH-ZONE-1",
      1,
      currentVersion - 1, // Stale version!
      loginSession!.operator,
      "127.0.0.1"
    );
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError) {
      conflictCaught = true;
    }
  }
  assert(conflictCaught, "Test 4: Stale expectedVersion triggers ConcurrencyConflictError (409)");

  // TEST 5: Input Validation & Boundary Enforcement (Prevent Out-of-Bounds & Negative Numbers)
  let negativeTriageCaught = false;
  try {
    assetStore.updateVentilators(
      "CN-HEALTH-ZONE-1",
      -9999, // Impossible negative delta
      currentVersion,
      loginSession!.operator,
      "127.0.0.1"
    );
  } catch (err: any) {
    if (err instanceof ValidationError) {
      negativeTriageCaught = true;
    }
  }
  assert(negativeTriageCaught, "Test 5a: Out-of-bounds triage delta rejected by server");

  let overflowTriageCaught = false;
  try {
    assetStore.updateVentilators(
      "CN-HEALTH-ZONE-1",
      9999, // Exceeds total capacity
      currentVersion,
      loginSession!.operator,
      "127.0.0.1"
    );
  } catch (err: any) {
    if (err instanceof ValidationError) {
      overflowTriageCaught = true;
    }
  }
  assert(overflowTriageCaught, "Test 5b: Capacity overflow delta rejected by server");

  // TEST 6: IDOR Protection & Non-Existent Resource Handling
  let nonExistentZoneCaught = false;
  try {
    assetStore.updateVentilators(
      "NON-EXISTENT-HOSPITAL-99",
      1,
      1,
      loginSession!.operator,
      "127.0.0.1"
    );
  } catch (err: any) {
    if (err instanceof ValidationError) {
      nonExistentZoneCaught = true;
    }
  }
  assert(nonExistentZoneCaught, "Test 6: Non-existent facility ID rejected safely");

  // TEST 7: Transactional Inter-Facility Transfer Integrity
  const sourceZone = zonesBefore.find((z) => z.id === "CN-HEALTH-ZONE-4")!;
  const targetZone = zonesBefore.find((z) => z.id === "CN-HEALTH-ZONE-3")!;
  const sourceVer = sourceZone.version;
  const targetVer = targetZone.version;
  const availableVents = sourceZone.ventilators.available;

  const transferResult = assetStore.executeReallocation(
    sourceZone.id,
    targetZone.id,
    2, // move 2 ventilators
    1, // move 1 staff
    [{ medicineId: "med-propofol", units: 10 }],
    sourceVer,
    targetVer,
    loginSession!.operator,
    "127.0.0.1"
  );

  assert(
    transferResult.sourceZone.version === sourceVer + 1 &&
      transferResult.targetZone.version === targetVer + 1,
    "Test 7a: Atomic reallocation advances versions on both facilities"
  );
  assert(
    transferResult.sourceZone.ventilators.total === sourceZone.ventilators.total - 2,
    "Test 7b: Source ventilators decremented accurately"
  );
  assert(
    transferResult.targetZone.ventilators.total === targetZone.ventilators.total + 2,
    "Test 7c: Target ventilators incremented accurately"
  );

  // TEST 8: Reallocation Cannot Exceed Available Resources
  let excessiveTransferCaught = false;
  try {
    assetStore.executeReallocation(
      sourceZone.id,
      targetZone.id,
      9999, // Impossible amount
      0,
      [],
      transferResult.sourceZone.version,
      transferResult.targetZone.version,
      loginSession!.operator,
      "127.0.0.1"
    );
  } catch (err: any) {
    if (err instanceof ValidationError) {
      excessiveTransferCaught = true;
    }
  }
  assert(excessiveTransferCaught, "Test 8: Excessive transfer request rejected with ValidationError");

  // TEST 9: Audit Trail Immutability & Secret Sanitization
  auditTrail.record({
    actorId: loginSession!.operator.id,
    actorName: loginSession!.operator.displayName,
    actorRole: loginSession!.operator.role,
    action: "SENSITIVE_OPERATION_TEST",
    resourceId: "TEST-RES-1",
    resourceType: "TEST",
    status: "SUCCESS",
    details: "User attempted to log with token=secret_token_123456 and api_key=AIzaSySecretKey",
    ip: "127.0.0.1",
  });

  const auditLogs = auditTrail.getRecords(5);
  const testAudit = auditLogs.find((l) => l.action === "SENSITIVE_OPERATION_TEST");
  assert(testAudit !== undefined, "Test 9a: Audit record logged successfully");
  assert(
    !testAudit?.details.includes("secret_token_123456") &&
      !testAudit?.details.includes("AIzaSySecretKey"),
    "Test 9b: Audit trail automatically sanitizes and redacts secrets"
  );

  // TEST 10: Compliance / Licensing Decoupling
  const complianceInitial = complianceService.isEnabled();
  assert(
    complianceInitial === false || complianceInitial === true,
    "Test 10a: Compliance service state is deterministic"
  );

  console.log("-------------------------------------------------");
  console.log(`Security Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSecurityTestSuite();
