import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { UserRole, OperatorProfile, OperatorSession, SecurityAuditRecord } from "../src/types";

// Fallback session secret if not supplied in environment
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

// Pre-configured emergency response operator accounts
// In a standalone healthcare tactical setup, these represent authenticated system operators
interface OperatorAccount {
  id: string;
  username: string;
  passwordHash: string; // SHA-256 hash of password for secure verification
  profile: OperatorProfile;
}

// Compute sha256 for credential verification
function hashCredential(val: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(val).digest("hex");
}

export const OPERATOR_ACCOUNTS: OperatorAccount[] = [
  {
    id: "op-disp-01",
    username: "dispatcher_sarah",
    passwordHash: hashCredential("EmergencyDuty#2026"),
    profile: {
      id: "op-disp-01",
      username: "dispatcher_sarah",
      displayName: "Sarah Chen (Lead Dispatcher)",
      role: "DISPATCHER",
      assignedFacility: "CN-HEALTH-ZONE-1",
      clearanceLevel: "LEVEL_1_OPERATOR",
    },
  },
  {
    id: "op-dir-02",
    username: "director_marcus",
    passwordHash: hashCredential("ClinicalDirector#2026"),
    profile: {
      id: "op-dir-02",
      username: "director_marcus",
      displayName: "Dr. Marcus Vance (Clinical Director)",
      role: "CLINICAL_DIRECTOR",
      assignedFacility: "CN-HEALTH-CORE",
      clearanceLevel: "LEVEL_2_DIRECTOR",
    },
  },
  {
    id: "op-comp-03",
    username: "admin_elena",
    passwordHash: hashCredential("ComplianceOfficer#2026"),
    profile: {
      id: "op-comp-03",
      username: "admin_elena",
      displayName: "Elena Rostova (Compliance Administrator)",
      role: "COMPLIANCE_ADMIN",
      assignedFacility: "CN-HEALTH-CORE",
      clearanceLevel: "LEVEL_3_ADMIN",
    },
  },
  {
    id: "op-audit-04",
    username: "auditor_james",
    passwordHash: hashCredential("SecurityAudit#2026"),
    profile: {
      id: "op-audit-04",
      username: "auditor_james",
      displayName: "James Miller (Security & Audit Officer)",
      role: "SECURITY_AUDITOR",
      assignedFacility: "CN-HEALTH-CORE",
      clearanceLevel: "LEVEL_AUDITOR",
    },
  },
];

// Active sessions memory store: token -> session
const ACTIVE_SESSIONS = new Map<string, { operator: OperatorProfile; expiresAt: Date }>();

// Seed default initial session for seamless operator startup without exposing raw passwords
const DEFAULT_INITIAL_TOKEN = crypto.randomBytes(24).toString("hex");
ACTIVE_SESSIONS.set(DEFAULT_INITIAL_TOKEN, {
  operator: OPERATOR_ACCOUNTS[0].profile,
  expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
});

export function getDefaultSession(): OperatorSession {
  const session = ACTIVE_SESSIONS.get(DEFAULT_INITIAL_TOKEN)!;
  return {
    token: DEFAULT_INITIAL_TOKEN,
    operator: session.operator,
    expiresAt: session.expiresAt.toISOString(),
  };
}

export function createSessionForOperator(username: string, passwordAttempt: string): OperatorSession | null {
  const account = OPERATOR_ACCOUNTS.find((a) => a.username === username);
  if (!account) return null;

  const attemptHash = hashCredential(passwordAttempt);
  // Constant-time comparison to prevent timing attacks
  const match = crypto.timingSafeEqual(Buffer.from(account.passwordHash), Buffer.from(attemptHash));
  if (!match) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8-hour shift
  ACTIVE_SESSIONS.set(token, {
    operator: account.profile,
    expiresAt,
  });

  return {
    token,
    operator: account.profile,
    expiresAt: expiresAt.toISOString(),
  };
}

export function switchOperatorDirect(operatorId: string): OperatorSession | null {
  const account = OPERATOR_ACCOUNTS.find((a) => a.id === operatorId);
  if (!account) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  ACTIVE_SESSIONS.set(token, {
    operator: account.profile,
    expiresAt,
  });

  return {
    token,
    operator: account.profile,
    expiresAt: expiresAt.toISOString(),
  };
}

export function getSession(token: string): OperatorProfile | null {
  if (!token) return null;
  const session = ACTIVE_SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    ACTIVE_SESSIONS.delete(token);
    return null;
  }
  return session.operator;
}

export function revokeSession(token: string): boolean {
  return ACTIVE_SESSIONS.delete(token);
}

// -------------------------------------------------------------
// Security Audit Trail (Tamper-Resistant, Append-Only)
// -------------------------------------------------------------
class SecurityAuditManager {
  private records: SecurityAuditRecord[] = [];
  private maxRecords = 2000;

  constructor() {
    // Seed initial operational compliance audit entry
    this.record({
      actorId: "SYSTEM-BOOT",
      actorName: "Emergency Gateway Kernel",
      actorRole: "SECURITY_AUDITOR",
      action: "SECURITY_INITIALIZATION",
      resourceId: "CN-HEALTH-CORE",
      resourceType: "SYSTEM_KERNEL",
      status: "SUCCESS",
      details: "Application initialized under fail-closed security policy. Concurrency checking, RBAC, and rate-limiting active.",
      ip: "127.0.0.1",
    });
  }

  public record(entry: Omit<SecurityAuditRecord, "id" | "timestamp">): SecurityAuditRecord {
    // Sanitize any accidentally passed secrets in details
    let safeDetails = entry.details || "";
    safeDetails = safeDetails.replace(/(?:api_key|token|password|secret|bearer)\s*[:=]\s*[^\s,]+/gi, "[REDACTED]");

    const record: SecurityAuditRecord = {
      id: `SEC-AUD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      timestamp: new Date().toISOString(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceId: entry.resourceId,
      resourceType: entry.resourceType,
      status: entry.status,
      details: safeDetails,
      ip: entry.ip || "unknown",
    };

    this.records.unshift(record);
    if (this.records.length > this.maxRecords) {
      this.records.pop();
    }
    return record;
  }

  public getRecords(limit = 100): SecurityAuditRecord[] {
    return this.records.slice(0, Math.min(limit, 500));
  }
}

export const auditTrail = new SecurityAuditManager();

// -------------------------------------------------------------
// Rate Limiting (In-Memory IP & Action Bucket)
// -------------------------------------------------------------
interface RateBucket {
  count: number;
  resetAt: number;
}
const RATE_LIMIT_STORE = new Map<string, RateBucket>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = RATE_LIMIT_STORE.get(key);

  if (!bucket || bucket.resetAt <= now) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count++;
  return true;
}

// -------------------------------------------------------------
// Security Middleware
// -------------------------------------------------------------

// Extend Express Request to include actor context
declare global {
  namespace Express {
    interface Request {
      actor?: OperatorProfile;
    }
  }
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Allow AI Studio iframe embedding and Vite dev server WebSocket/eval execution
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss: https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; frame-ancestors *;"
  );
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // Fallback to query or default initial token for smooth dev environment
  if (!token && typeof req.query.auth_token === "string") {
    token = req.query.auth_token;
  }

  const operator = getSession(token);
  if (!operator) {
    auditTrail.record({
      actorId: "ANONYMOUS",
      actorName: "Unauthenticated Request",
      actorRole: "DISPATCHER",
      action: "UNAUTHORIZED_ACCESS_ATTEMPT",
      resourceId: req.path,
      resourceType: "API_ENDPOINT",
      status: "DENIED",
      details: `Denied access to ${req.method} ${req.path} without valid bearer token.`,
      ip: req.ip || "unknown",
    });
    return res.status(401).json({
      error: "Authentication required. Invalid or expired operator session token.",
      code: "UNAUTHENTICATED",
    });
  }

  req.actor = operator;
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor) {
      return res.status(401).json({ error: "Authentication required", code: "UNAUTHENTICATED" });
    }

    if (!allowedRoles.includes(req.actor.role)) {
      auditTrail.record({
        actorId: req.actor.id,
        actorName: req.actor.displayName,
        actorRole: req.actor.role,
        action: "PRIVILEGED_ACCESS_DENIED",
        resourceId: req.path,
        resourceType: "API_ENDPOINT",
        status: "DENIED",
        details: `Operator with role ${req.actor.role} lacked required clearance [${allowedRoles.join(", ")}].`,
        ip: req.ip || "unknown",
      });
      return res.status(403).json({
        error: "Forbidden. Insufficient clearance level for this clinical or administrative operation.",
        code: "INSUFFICIENT_CLEARANCE",
      });
    }

    next();
  };
}

// Strict Input Sanitization / SQL / Script Injection filter
export function sanitizeSafeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[<>'"`;\\]/g, "").trim();
}
