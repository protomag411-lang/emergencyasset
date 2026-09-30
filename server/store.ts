import { HealthZone, MedicineItem, ZoneStatus, CopyrightIssue, OperatorProfile } from "../src/types";
import { INITIAL_ZONES, INITIAL_COPYRIGHT_ISSUES, calculateMedicineStatus } from "../src/data/initialData";
import { auditTrail } from "./security";

export class ConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// -------------------------------------------------------------
// Emergency Asset & Resource Store (Server-Authoritative)
// -------------------------------------------------------------
class EmergencyAssetStore {
  private zones: HealthZone[];

  constructor() {
    // Clone initial zones to maintain deep mutation isolation
    this.zones = JSON.parse(JSON.stringify(INITIAL_ZONES));
  }

  public getZones(): HealthZone[] {
    return JSON.parse(JSON.stringify(this.zones));
  }

  public getZone(id: string): HealthZone | null {
    const found = this.zones.find((z) => z.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  // Recalculates utilization rate and zone status strictly on the backend
  private calculateZoneLoad(total: number, inUse: number): { rate: number; status: ZoneStatus } {
    const rate = total > 0 ? Math.round((inUse / total) * 100) : 0;
    let status: ZoneStatus = "optimal";
    if (rate >= 90) status = "critical_overload";
    else if (rate >= 65) status = "moderate_load";
    else if (rate <= 35) status = "surplus";
    return { rate, status };
  }

  /**
   * Update ventilator loading / triage state on a facility
   * Protected with optimistic concurrency (expectedVersion)
   */
  public updateVentilators(
    zoneId: string,
    delta: number,
    expectedVersion: number,
    actor: OperatorProfile,
    ip: string
  ): HealthZone {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) {
      throw new ValidationError(`Facility '${zoneId}' does not exist in regional topology.`);
    }

    // Optimistic Concurrency Control
    if (typeof expectedVersion === "number" && zone.version !== expectedVersion) {
      auditTrail.record({
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        action: "CONCURRENCY_CONFLICT_DETECTED",
        resourceId: zoneId,
        resourceType: "HEALTH_ZONE",
        status: "DENIED",
        details: `Triage update rejected: Zone version is ${zone.version}, but client expected ${expectedVersion}.`,
        ip,
      });
      throw new ConcurrencyConflictError(
        `Concurrent update conflict on ${zoneId}. Expected version ${expectedVersion}, but current version is ${zone.version}. Please refresh.`
      );
    }

    if (typeof delta !== "number" || isNaN(delta) || !Number.isInteger(delta)) {
      throw new ValidationError("Triage delta must be an integer.");
    }

    const newInUse = zone.ventilators.inUse + delta;
    if (newInUse < 0 || newInUse > zone.ventilators.total) {
      throw new ValidationError(
        `Ventilators in-use count (${newInUse}) must be between 0 and total capacity (${zone.ventilators.total}).`
      );
    }

    zone.ventilators.inUse = newInUse;
    zone.ventilators.available = zone.ventilators.total - newInUse;
    const { rate, status } = this.calculateZoneLoad(zone.ventilators.total, newInUse);
    zone.utilizationRate = rate;
    zone.status = status;
    zone.version += 1;

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "FACILITY_TRIAGE_UPDATED",
      resourceId: zoneId,
      resourceType: "VENTILATOR_TELEMETRY",
      status: "SUCCESS",
      details: `In-use adjusted by ${delta > 0 ? "+" : ""}${delta} to ${newInUse}/${zone.ventilators.total} (${rate}%). Version advanced to ${zone.version}.`,
      ip,
    });

    return JSON.parse(JSON.stringify(zone));
  }

  /**
   * Update critical pharmacy buffer stock
   * Protected with optimistic concurrency (expectedVersion)
   */
  public updateMedicineUnits(
    zoneId: string,
    medicineId: string,
    delta: number,
    expectedVersion: number,
    actor: OperatorProfile,
    ip: string
  ): HealthZone {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) {
      throw new ValidationError(`Facility '${zoneId}' not found.`);
    }

    if (typeof expectedVersion === "number" && zone.version !== expectedVersion) {
      auditTrail.record({
        actorId: actor.id,
        actorName: actor.displayName,
        actorRole: actor.role,
        action: "CONCURRENCY_CONFLICT_DETECTED",
        resourceId: `${zoneId}:${medicineId}`,
        resourceType: "MEDICINE_INVENTORY",
        status: "DENIED",
        details: `Pharmacy stock update rejected: Zone version is ${zone.version}, but client expected ${expectedVersion}.`,
        ip,
      });
      throw new ConcurrencyConflictError(
        `Concurrent update conflict on ${zoneId}. Expected version ${expectedVersion}, but current is ${zone.version}.`
      );
    }

    const med = zone.medicineStock.find((m) => m.id === medicineId);
    if (!med) {
      throw new ValidationError(`Medicine '${medicineId}' not registered at facility ${zoneId}.`);
    }

    if (typeof delta !== "number" || isNaN(delta) || !Number.isInteger(delta)) {
      throw new ValidationError("Medicine unit adjustment delta must be an integer.");
    }

    const newUnits = med.currentUnits + delta;
    if (newUnits < 0 || newUnits > med.totalCapacity) {
      throw new ValidationError(
        `Stock adjustment would exceed bounds [0, ${med.totalCapacity}]. Attempted: ${newUnits}.`
      );
    }

    med.currentUnits = newUnits;
    med.status = calculateMedicineStatus(newUnits, med.minSafeThreshold, med.totalCapacity);
    zone.version += 1;

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "MEDICINE_STOCK_ADJUSTED",
      resourceId: `${zoneId}:${medicineId}`,
      resourceType: "PHARMACEUTICAL_LOT",
      status: "SUCCESS",
      details: `${med.name} (${med.batchCode}) updated by ${delta > 0 ? "+" : ""}${delta} units to ${newUnits} (${med.status.toUpperCase()}).`,
      ip,
    });

    return JSON.parse(JSON.stringify(zone));
  }

  /**
   * Transactional Inter-Facility Emergency Reallocation
   * Atomically transfers equipment, medical personnel, and cold-chain pharmaceuticals
   * Validates both zones, bounds, and concurrency locks before committing
   */
  public executeReallocation(
    sourceZoneId: string,
    targetZoneId: string,
    ventilatorsToMove: number,
    staffToMove: number,
    medicinesToMove: Array<{ medicineId: string; units: number }>,
    expectedSourceVersion: number,
    expectedTargetVersion: number,
    actor: OperatorProfile,
    ip: string
  ): { sourceZone: HealthZone; targetZone: HealthZone } {
    if (sourceZoneId === targetZoneId) {
      throw new ValidationError("Source and target facility must be distinct for inter-zone reallocations.");
    }

    const source = this.zones.find((z) => z.id === sourceZoneId);
    const target = this.zones.find((z) => z.id === targetZoneId);

    if (!source) throw new ValidationError(`Source facility '${sourceZoneId}' not found.`);
    if (!target) throw new ValidationError(`Target facility '${targetZoneId}' not found.`);

    // Concurrency verification on both ends of the transaction
    if (typeof expectedSourceVersion === "number" && source.version !== expectedSourceVersion) {
      throw new ConcurrencyConflictError(
        `Source facility ${sourceZoneId} was modified concurrently. Expected version ${expectedSourceVersion}, found ${source.version}.`
      );
    }
    if (typeof expectedTargetVersion === "number" && target.version !== expectedTargetVersion) {
      throw new ConcurrencyConflictError(
        `Target facility ${targetZoneId} was modified concurrently. Expected version ${expectedTargetVersion}, found ${target.version}.`
      );
    }

    // Input bounds validation
    if (!Number.isInteger(ventilatorsToMove) || ventilatorsToMove <= 0) {
      throw new ValidationError("Ventilators to reallocate must be a positive integer.");
    }
    if (ventilatorsToMove > source.ventilators.available) {
      throw new ValidationError(
        `Cannot reallocate ${ventilatorsToMove} ventilators; only ${source.ventilators.available} currently available at ${source.name}.`
      );
    }

    if (!Number.isInteger(staffToMove) || staffToMove < 0) {
      throw new ValidationError("Staff to reallocate must be a non-negative integer.");
    }
    if (staffToMove > source.staff.respiratoryTherapists) {
      throw new ValidationError(
        `Cannot reallocate ${staffToMove} respiratory therapists; source only has ${source.staff.respiratoryTherapists}.`
      );
    }

    // Validate pharmaceutical payload
    const validatedMedTransfers: Array<{ medicineId: string; units: number; name: string }> = [];
    if (Array.isArray(medicinesToMove)) {
      for (const item of medicinesToMove) {
        if (!item.medicineId || !Number.isInteger(item.units) || item.units <= 0) continue;
        const sourceMed = source.medicineStock.find((m) => m.id === item.medicineId);
        if (!sourceMed) {
          throw new ValidationError(`Medicine ${item.medicineId} not found in source inventory.`);
        }
        if (item.units > sourceMed.currentUnits) {
          throw new ValidationError(
            `Insufficient stock for ${sourceMed.name}: requested ${item.units}, available ${sourceMed.currentUnits}.`
          );
        }
        validatedMedTransfers.push({
          medicineId: item.medicineId,
          units: item.units,
          name: sourceMed.name,
        });
      }
    }

    // Atomic Execution: Deduct from source
    source.ventilators.total -= ventilatorsToMove;
    source.ventilators.available = Math.max(0, source.ventilators.total - source.ventilators.inUse);
    source.staff.respiratoryTherapists -= staffToMove;
    const sourceLoad = this.calculateZoneLoad(source.ventilators.total, source.ventilators.inUse);
    source.utilizationRate = sourceLoad.rate;
    source.status = sourceLoad.status;

    for (const medTransfer of validatedMedTransfers) {
      const sourceMed = source.medicineStock.find((m) => m.id === medTransfer.medicineId)!;
      sourceMed.currentUnits -= medTransfer.units;
      sourceMed.status = calculateMedicineStatus(
        sourceMed.currentUnits,
        sourceMed.minSafeThreshold,
        sourceMed.totalCapacity
      );
    }
    source.version += 1;

    // Atomic Execution: Add to target
    target.ventilators.total += ventilatorsToMove;
    target.ventilators.available = Math.max(0, target.ventilators.total - target.ventilators.inUse);
    target.staff.respiratoryTherapists += staffToMove;
    const targetLoad = this.calculateZoneLoad(target.ventilators.total, target.ventilators.inUse);
    target.utilizationRate = targetLoad.rate;
    target.status = targetLoad.status;

    for (const medTransfer of validatedMedTransfers) {
      const targetMed = target.medicineStock.find((m) => m.id === medTransfer.medicineId);
      if (targetMed) {
        targetMed.currentUnits = Math.min(targetMed.totalCapacity, targetMed.currentUnits + medTransfer.units);
        targetMed.status = calculateMedicineStatus(
          targetMed.currentUnits,
          targetMed.minSafeThreshold,
          targetMed.totalCapacity
        );
      }
    }
    target.version += 1;

    const medSummary = validatedMedTransfers.map((m) => `${m.units}x ${m.name}`).join(", ") || "None";

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "EMERGENCY_REALLOCATION_COMMITTED",
      resourceId: `${sourceZoneId}->${targetZoneId}`,
      resourceType: "TRANSACTIONAL_DISPATCH",
      status: "SUCCESS",
      details: `Reallocated ${ventilatorsToMove} ventilators, ${staffToMove} specialists, and cold-chain pharma [${medSummary}] from ${source.name} to ${target.name}. Versions: source=${source.version}, target=${target.version}.`,
      ip,
    });

    return {
      sourceZone: JSON.parse(JSON.stringify(source)),
      targetZone: JSON.parse(JSON.stringify(target)),
    };
  }
}

export const assetStore = new EmergencyAssetStore();

// -------------------------------------------------------------
// Optional Compliance & Digital Rights Service
// Loosely coupled secondary module; enabled via flag only
// -------------------------------------------------------------
class ComplianceService {
  private issues: CopyrightIssue[];
  private enabled: boolean;

  constructor() {
    this.issues = JSON.parse(JSON.stringify(INITIAL_COPYRIGHT_ISSUES));
    this.enabled = process.env.ENABLE_LICENSE_COMPLIANCE === "true";
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(flag: boolean, actor: OperatorProfile, ip: string): void {
    this.enabled = flag;
    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "COMPLIANCE_FEATURE_FLAG_TOGGLED",
      resourceId: "ENABLE_LICENSE_COMPLIANCE",
      resourceType: "CONFIGURATION_FLAG",
      status: "SUCCESS",
      details: `Feature flag ENABLE_LICENSE_COMPLIANCE set to ${flag}.`,
      ip,
    });
  }

  public getIssues(): CopyrightIssue[] {
    return JSON.parse(JSON.stringify(this.issues));
  }

  public createIssue(
    issueData: Omit<CopyrightIssue, "id" | "createdAt">,
    actor: OperatorProfile,
    ip: string
  ): CopyrightIssue {
    const timeStr =
      new Date().toLocaleDateString() +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false }) +
      " IST";
    const newIssue: CopyrightIssue = {
      ...issueData,
      id: `CPR-2026-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: timeStr,
    };
    this.issues.unshift(newIssue);

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "COPYRIGHT_DISPUTE_FILED",
      resourceId: newIssue.id,
      resourceType: "DIGITAL_RIGHTS_RECORD",
      status: "SUCCESS",
      details: `Filed dispute on ${newIssue.affectedAssetName} by ${newIssue.copyrightHolder}. Risk: ${newIssue.infringementRisk.toUpperCase()}.`,
      ip,
    });

    return JSON.parse(JSON.stringify(newIssue));
  }

  public updateIssue(
    id: string,
    updates: Partial<CopyrightIssue>,
    actor: OperatorProfile,
    ip: string
  ): CopyrightIssue {
    const issue = this.issues.find((i) => i.id === id);
    if (!issue) throw new ValidationError(`Compliance issue '${id}' not found.`);

    // Protect immutable fields
    delete (updates as any).id;
    delete (updates as any).createdAt;

    Object.assign(issue, updates);

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "COPYRIGHT_STATUS_TRANSITIONED",
      resourceId: id,
      resourceType: "DIGITAL_RIGHTS_RECORD",
      status: "SUCCESS",
      details: `Issue ${id} transitioned to [${issue.status.toUpperCase()}]. Action: ${issue.resolutionAction || "Adjusted"}.`,
      ip,
    });

    return JSON.parse(JSON.stringify(issue));
  }

  public invokeDMCAWaiver(id: string, actor: OperatorProfile, ip: string): CopyrightIssue {
    return this.updateIssue(
      id,
      {
        status: "dmca_exempted",
        resolutionAction:
          "Applied 17 U.S.C. § 1201 Emergency Healthcare Life-Safety Exemption. Reallocation restriction legally waived.",
      },
      actor,
      ip
    );
  }
}

export const complianceService = new ComplianceService();
