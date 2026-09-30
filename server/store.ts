import {
  HealthZone,
  MedicineItem,
  ZoneStatus,
  CopyrightIssue,
  OperatorProfile,
  HospitalBoardRequest,
  InAppNotification,
  EmergencyResourceType,
} from "../src/types";
import {
  INITIAL_ZONES,
  INITIAL_COPYRIGHT_ISSUES,
  INITIAL_BOARD_REQUESTS,
  INITIAL_IN_APP_NOTIFICATIONS,
  calculateMedicineStatus,
} from "../src/data/initialData";
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

  /**
   * Transition resource quantities along the transfer lifecycle:
   * Available -> Reserved -> Dispatched -> Received
   */
  public transitionResourceInventory(
    supplyingHospitalName: string,
    requestingHospitalName: string,
    resourceType: EmergencyResourceType,
    quantity: number,
    stage: 'approved' | 'dispatched' | 'completed'
  ): void {
    const norm = (str: string) => str.toLowerCase().replace(/\[demo\/prototype data\]/g, '').trim();
    const supNorm = norm(supplyingHospitalName);
    const reqNorm = norm(requestingHospitalName);

    const supplyingZone = this.zones.find(
      (z) => norm(z.name) === supNorm || supNorm.includes(norm(z.name)) || norm(z.name).includes(supNorm)
    );
    const requestingZone = this.zones.find(
      (z) => norm(z.name) === reqNorm || reqNorm.includes(norm(z.name)) || norm(z.name).includes(reqNorm)
    );

    if (!supplyingZone) return;

    switch (resourceType) {
      case 'oxygen_cylinder': {
        if (!supplyingZone.oxygenCylinders) break;
        if (stage === 'approved') {
          supplyingZone.oxygenCylinders.reserved = (supplyingZone.oxygenCylinders.reserved || 0) + quantity;
        } else if (stage === 'dispatched') {
          supplyingZone.oxygenCylinders.reserved = Math.max(0, (supplyingZone.oxygenCylinders.reserved || 0) - quantity);
          supplyingZone.oxygenCylinders.dispatched = (supplyingZone.oxygenCylinders.dispatched || 0) + quantity;
          supplyingZone.oxygenCylinders.available = Math.max(0, supplyingZone.oxygenCylinders.available - quantity);
        } else if (stage === 'completed') {
          supplyingZone.oxygenCylinders.dispatched = Math.max(0, (supplyingZone.oxygenCylinders.dispatched || 0) - quantity);
          if (requestingZone && requestingZone.oxygenCylinders) {
            requestingZone.oxygenCylinders.available += quantity;
            requestingZone.oxygenCylinders.received = (requestingZone.oxygenCylinders.received || 0) + quantity;
          }
        }
        break;
      }
      case 'ventilator': {
        if (stage === 'approved') {
          supplyingZone.ventilators.reserved = (supplyingZone.ventilators.reserved || 0) + quantity;
        } else if (stage === 'dispatched') {
          supplyingZone.ventilators.reserved = Math.max(0, (supplyingZone.ventilators.reserved || 0) - quantity);
          supplyingZone.ventilators.dispatched = (supplyingZone.ventilators.dispatched || 0) + quantity;
          supplyingZone.ventilators.available = Math.max(0, supplyingZone.ventilators.available - quantity);
        } else if (stage === 'completed') {
          supplyingZone.ventilators.dispatched = Math.max(0, (supplyingZone.ventilators.dispatched || 0) - quantity);
          if (requestingZone) {
            requestingZone.ventilators.available += quantity;
            requestingZone.ventilators.received = (requestingZone.ventilators.received || 0) + quantity;
          }
        }
        break;
      }
      case 'icu_bed': {
        // ICU beds are capacity allocations, not physical moves
        if (stage === 'approved') {
          supplyingZone.icuBeds.reservedCapacity = (supplyingZone.icuBeds.reservedCapacity || 0) + quantity;
        } else if (stage === 'completed') {
          supplyingZone.icuBeds.reservedCapacity = Math.max(0, (supplyingZone.icuBeds.reservedCapacity || 0) - quantity);
          if (requestingZone) {
            requestingZone.icuBeds.allocatedCapacity = (requestingZone.icuBeds.allocatedCapacity || 0) + quantity;
          }
        }
        break;
      }
      case 'ambulance': {
        const amb = supplyingZone.ambulances?.find((a) => a.status === 'available') || supplyingZone.ambulances?.[0];
        if (amb) {
          if (stage === 'approved') amb.status = 'approved';
          else if (stage === 'dispatched') {
            amb.status = 'en_route';
            amb.destination = requestingHospitalName;
            amb.eta = '12 mins';
          } else if (stage === 'completed') {
            amb.status = 'arrived';
          }
        }
        break;
      }
      case 'infusion_pump': {
        if (supplyingZone.infusionPumps) {
          if (stage === 'approved') {
            supplyingZone.infusionPumps.reserved = (supplyingZone.infusionPumps.reserved || 0) + quantity;
          } else if (stage === 'dispatched') {
            supplyingZone.infusionPumps.reserved = Math.max(0, (supplyingZone.infusionPumps.reserved || 0) - quantity);
            supplyingZone.infusionPumps.dispatched = (supplyingZone.infusionPumps.dispatched || 0) + quantity;
            supplyingZone.infusionPumps.available = Math.max(0, supplyingZone.infusionPumps.available - quantity);
          } else if (stage === 'completed') {
            supplyingZone.infusionPumps.dispatched = Math.max(0, (supplyingZone.infusionPumps.dispatched || 0) - quantity);
            if (requestingZone && requestingZone.infusionPumps) {
              requestingZone.infusionPumps.available += quantity;
              requestingZone.infusionPumps.received = (requestingZone.infusionPumps.received || 0) + quantity;
            }
          }
        }
        break;
      }
      case 'patient_monitor': {
        if (supplyingZone.patientMonitors) {
          if (stage === 'approved') {
            supplyingZone.patientMonitors.reserved = (supplyingZone.patientMonitors.reserved || 0) + quantity;
          } else if (stage === 'dispatched') {
            supplyingZone.patientMonitors.reserved = Math.max(0, (supplyingZone.patientMonitors.reserved || 0) - quantity);
            supplyingZone.patientMonitors.dispatched = (supplyingZone.patientMonitors.dispatched || 0) + quantity;
            supplyingZone.patientMonitors.available = Math.max(0, supplyingZone.patientMonitors.available - quantity);
          } else if (stage === 'completed') {
            supplyingZone.patientMonitors.dispatched = Math.max(0, (supplyingZone.patientMonitors.dispatched || 0) - quantity);
            if (requestingZone && requestingZone.patientMonitors) {
              requestingZone.patientMonitors.available += quantity;
              requestingZone.patientMonitors.received = (requestingZone.patientMonitors.received || 0) + quantity;
            }
          }
        }
        break;
      }
      case 'stretcher': {
        if (supplyingZone.stretchers) {
          if (stage === 'approved') {
            supplyingZone.stretchers.reserved = (supplyingZone.stretchers.reserved || 0) + quantity;
          } else if (stage === 'dispatched') {
            supplyingZone.stretchers.reserved = Math.max(0, (supplyingZone.stretchers.reserved || 0) - quantity);
            supplyingZone.stretchers.dispatched = (supplyingZone.stretchers.dispatched || 0) + quantity;
            supplyingZone.stretchers.available = Math.max(0, supplyingZone.stretchers.available - quantity);
          } else if (stage === 'completed') {
            supplyingZone.stretchers.dispatched = Math.max(0, (supplyingZone.stretchers.dispatched || 0) - quantity);
            if (requestingZone && requestingZone.stretchers) {
              requestingZone.stretchers.available += quantity;
              requestingZone.stretchers.received = (requestingZone.stretchers.received || 0) + quantity;
            }
          }
        }
        break;
      }
      case 'portable_oxygen': {
        if (supplyingZone.portableOxygen) {
          if (stage === 'approved') {
            supplyingZone.portableOxygen.reserved = (supplyingZone.portableOxygen.reserved || 0) + quantity;
          } else if (stage === 'dispatched') {
            supplyingZone.portableOxygen.reserved = Math.max(0, (supplyingZone.portableOxygen.reserved || 0) - quantity);
            supplyingZone.portableOxygen.dispatched = (supplyingZone.portableOxygen.dispatched || 0) + quantity;
            supplyingZone.portableOxygen.available = Math.max(0, supplyingZone.portableOxygen.available - quantity);
          } else if (stage === 'completed') {
            supplyingZone.portableOxygen.dispatched = Math.max(0, (supplyingZone.portableOxygen.dispatched || 0) - quantity);
            if (requestingZone && requestingZone.portableOxygen) {
              requestingZone.portableOxygen.available += quantity;
              requestingZone.portableOxygen.received = (requestingZone.portableOxygen.received || 0) + quantity;
            }
          }
        }
        break;
      }
      case 'medicine': {
        const sourceMed = supplyingZone.medicineStock[0];
        if (sourceMed) {
          if (stage === 'dispatched') {
            sourceMed.currentUnits = Math.max(0, sourceMed.currentUnits - quantity);
          } else if (stage === 'completed' && requestingZone) {
            const targetMed = requestingZone.medicineStock.find((m) => m.name === sourceMed.name) || requestingZone.medicineStock[0];
            if (targetMed) targetMed.currentUnits += quantity;
          }
        }
        break;
      }
    }

    supplyingZone.version += 1;
    if (requestingZone && requestingZone.id !== supplyingZone.id) {
      requestingZone.version += 1;
    }
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

// -------------------------------------------------------------
// Hospital Board Emergency Request & Allocation Store
// -------------------------------------------------------------
class HospitalBoardStore {
  private requests: HospitalBoardRequest[];
  private notifications: InAppNotification[];

  constructor() {
    this.requests = JSON.parse(JSON.stringify(INITIAL_BOARD_REQUESTS));
    this.notifications = JSON.parse(JSON.stringify(INITIAL_IN_APP_NOTIFICATIONS));
  }

  public getRequests(): HospitalBoardRequest[] {
    return JSON.parse(JSON.stringify(this.requests));
  }

  public getNotifications(role?: string, hospital?: string): InAppNotification[] {
    let filtered = this.notifications;
    if (role) {
      filtered = filtered.filter((n) => n.targetRole === role);
    }
    if (hospital && hospital !== "All Facilities") {
      const norm = (s: string) => s.toLowerCase().replace(/\[demo\/prototype data\]/g, "").trim();
      const targetNorm = norm(hospital);
      filtered = filtered.filter(
        (n) => norm(n.targetHospital) === targetNorm || n.targetHospital.includes(hospital) || hospital.includes(n.targetHospital)
      );
    }
    return JSON.parse(JSON.stringify(filtered));
  }

  public markNotificationRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
  }

  public createRequest(
    data: Omit<HospitalBoardRequest, "id" | "timestamp" | "status">,
    actor: OperatorProfile,
    ip: string
  ): HospitalBoardRequest {
    const timeStr =
      new Date().toLocaleDateString() +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false }) +
      " IST";
    
    // Format unique Request ID as TR-XXXX (e.g. TR-1048)
    const newReqId = `TR-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReq: HospitalBoardRequest = {
      ...data,
      id: newReqId,
      timestamp: timeStr,
      status: "pending_board_approval",
      inventoryState: "available",
      timelineHistory: [
        {
          stage: "Request Created",
          timestamp: timeStr,
          actor: actor.displayName,
          description: `Initiated emergency life-safety transfer request for ${data.requestedQuantity}x ${data.resourceName}.`,
        },
        {
          stage: "Hospital Board Notified",
          timestamp: timeStr,
          actor: "Emergency Dispatch Router",
          description: `Dispatched direct alert to supplying hospital: ${data.supplyingHospital}.`,
        },
      ],
    };

    this.requests.unshift(newReq);

    // Create in-app notification specifically for the supplying hospital's Hospital Board
    const boardNotif: InAppNotification = {
      id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      requestId: newReq.id,
      targetRole: "hospital_board",
      targetHospital: newReq.supplyingHospital,
      title: "🚨 Emergency Transfer Request",
      message: `${newReq.requestingHospital} requested ${newReq.requestedQuantity}x ${newReq.resourceName}. Safe Transferable: ${newReq.safeTransferableQuantity}. Priority: ${newReq.priority}.`,
      timestamp: timeStr,
      read: false,
      priority: newReq.priority,
      resourceSummary: {
        resourceName: newReq.resourceName,
        quantity: newReq.requestedQuantity,
        unit: newReq.resourceName.includes("Cylinder") ? "cylinders" : "units",
        requestingHospital: newReq.requestingHospital,
        supplyingHospital: newReq.supplyingHospital,
        currentAvailable: newReq.currentAvailable || newReq.safeTransferableQuantity + 8,
        safeTransferable: newReq.safeTransferableQuantity,
      },
    };
    this.notifications.unshift(boardNotif);

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "EMERGENCY_BOARD_REQUEST_FILED",
      resourceId: newReq.id,
      resourceType: newReq.resourceType,
      status: "SUCCESS",
      details: `${newReq.requestingHospital} requested ${newReq.requestedQuantity}x ${newReq.resourceName} from ${newReq.supplyingHospital}. Priority: ${newReq.priority}. Assigned ID: ${newReq.id}.`,
      ip,
    });

    return JSON.parse(JSON.stringify(newReq));
  }

  public approveRequest(
    id: string,
    approverName: string,
    actor: OperatorProfile,
    ip: string
  ): HospitalBoardRequest {
    const req = this.requests.find((r) => r.id === id);
    if (!req) throw new ValidationError(`Board request '${id}' not found.`);

    const timeStr =
      new Date().toLocaleDateString() +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false }) +
      " IST";

    req.status = "approved";
    req.inventoryState = "reserved";
    req.approvedBy = approverName || `${req.supplyingHospital} Board Authorization Desk`;
    req.approvedAt = timeStr;

    if (!req.timelineHistory) req.timelineHistory = [];
    req.timelineHistory.push({
      stage: "Approved",
      timestamp: timeStr,
      actor: req.approvedBy,
      description: `Supplying Hospital Board approved transfer of ${req.requestedQuantity}x ${req.resourceName}. Inventory state updated: [Reserved].`,
    });

    // Update resource's reserved/allocated quantity in inventory
    assetStore.transitionResourceInventory(
      req.supplyingHospital,
      req.requestingHospital,
      req.resourceType,
      req.requestedQuantity,
      "approved"
    );

    // Create notification specifically for requesting hospital
    const reqHospitalNotif: InAppNotification = {
      id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      requestId: req.id,
      targetRole: "requesting_hospital",
      targetHospital: req.requestingHospital,
      title: "✅ Transfer Approved",
      message: `Your emergency resource request has been approved by ${req.supplyingHospital}. Resource: ${req.requestedQuantity} ${req.resourceName}. Status: Approved.`,
      timestamp: timeStr,
      read: false,
      priority: "Emergency",
      resourceSummary: {
        resourceName: req.resourceName,
        quantity: req.requestedQuantity,
        unit: "units",
        requestingHospital: req.requestingHospital,
        supplyingHospital: req.supplyingHospital,
        currentAvailable: req.currentAvailable || req.safeTransferableQuantity + 8,
        safeTransferable: req.safeTransferableQuantity,
      },
    };
    this.notifications.unshift(reqHospitalNotif);

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "HOSPITAL_BOARD_REQUEST_APPROVED",
      resourceId: req.id,
      resourceType: req.resourceType,
      status: "SUCCESS",
      details: `Hospital Board approved ${req.requestedQuantity}x ${req.resourceName} for ${req.requestingHospital}. Authorized by: ${req.approvedBy}. Resource reserved in demo inventory.`,
      ip,
    });

    return JSON.parse(JSON.stringify(req));
  }

  public rejectRequest(
    id: string,
    reason: string,
    actor: OperatorProfile,
    ip: string
  ): HospitalBoardRequest {
    const req = this.requests.find((r) => r.id === id);
    if (!req) throw new ValidationError(`Board request '${id}' not found.`);

    const timeStr =
      new Date().toLocaleDateString() +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false }) +
      " IST";

    req.status = "rejected";
    req.rejectionReason = reason || "Local emergency reserve required for incoming trauma surge";
    req.notes = (req.notes ? req.notes + " | " : "") + `Board Decision: Rejected (${req.rejectionReason})`;

    if (!req.timelineHistory) req.timelineHistory = [];
    req.timelineHistory.push({
      stage: "Rejected",
      timestamp: timeStr,
      actor: `${req.supplyingHospital} Board`,
      description: `Request rejected. Reason: ${req.rejectionReason}. Zero inventory deducted.`,
    });

    // Create rejection notification for requesting hospital
    const notif: InAppNotification = {
      id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      requestId: req.id,
      targetRole: "requesting_hospital",
      targetHospital: req.requestingHospital,
      title: "⚠️ Transfer Request Rejected",
      message: `Your emergency request for ${req.requestedQuantity}x ${req.resourceName} was rejected by ${req.supplyingHospital}. Reason: ${req.rejectionReason}.`,
      timestamp: timeStr,
      read: false,
      priority: "Critical",
      resourceSummary: {
        resourceName: req.resourceName,
        quantity: req.requestedQuantity,
        unit: "units",
        requestingHospital: req.requestingHospital,
        supplyingHospital: req.supplyingHospital,
        currentAvailable: req.currentAvailable || 0,
        safeTransferable: req.safeTransferableQuantity,
      },
    };
    this.notifications.unshift(notif);

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "HOSPITAL_BOARD_REQUEST_REJECTED",
      resourceId: req.id,
      resourceType: req.resourceType,
      status: "SUCCESS",
      details: `Hospital Board rejected request ${req.id} for ${req.resourceName}. Reason: ${req.rejectionReason}.`,
      ip,
    });

    return JSON.parse(JSON.stringify(req));
  }

  public updateStatus(
    id: string,
    status: HospitalBoardRequest["status"],
    actor: OperatorProfile,
    ip: string
  ): HospitalBoardRequest {
    const req = this.requests.find((r) => r.id === id);
    if (!req) throw new ValidationError(`Board request '${id}' not found.`);

    const timeStr =
      new Date().toLocaleDateString() +
      " " +
      new Date().toLocaleTimeString("en-US", { hour12: false }) +
      " IST";

    req.status = status;

    if (!req.timelineHistory) req.timelineHistory = [];

    if (status === "preparing") {
      req.inventoryState = "reserved";
      req.timelineHistory.push({
        stage: "Preparing",
        timestamp: timeStr,
        actor: `${req.supplyingHospital} Logistics`,
        description: `Staging and packaging ${req.requestedQuantity}x ${req.resourceName} for ambulance/carrier pickup.`,
      });

      this.notifications.unshift({
        id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        requestId: req.id,
        targetRole: "requesting_hospital",
        targetHospital: req.requestingHospital,
        title: "📦 Preparing for Dispatch",
        message: `${req.supplyingHospital} has begun staging ${req.requestedQuantity}x ${req.resourceName} for transit.`,
        timestamp: timeStr,
        read: false,
        priority: "Normal" as any,
      });
    } else if (status === "dispatched") {
      req.inventoryState = "dispatched";
      req.timelineHistory.push({
        stage: "Dispatched",
        timestamp: timeStr,
        actor: `${req.supplyingHospital} Fleet / Carrier`,
        description: `${req.requestedQuantity}x ${req.resourceName} dispatched. Inventory updated: [Dispatched].`,
      });

      // Update inventory on backend
      assetStore.transitionResourceInventory(
        req.supplyingHospital,
        req.requestingHospital,
        req.resourceType,
        req.requestedQuantity,
        "dispatched"
      );

      this.notifications.unshift({
        id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        requestId: req.id,
        targetRole: "requesting_hospital",
        targetHospital: req.requestingHospital,
        title: "🚚 Resource Dispatched",
        message: `${req.supplyingHospital} has dispatched ${req.requestedQuantity}x ${req.resourceName}. Fleet vehicle dispatched with priority escort.`,
        timestamp: timeStr,
        read: false,
        priority: "Emergency",
      });
    } else if (status === "in_transit") {
      req.inventoryState = "dispatched";
      req.timelineHistory.push({
        stage: "In Transit",
        timestamp: timeStr,
        actor: "Regional Critical Transit Link",
        description: `Carrier en route to ${req.requestingHospital}. Live GPS beacon telemetry synchronized.`,
      });

      this.notifications.unshift({
        id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        requestId: req.id,
        targetRole: "requesting_hospital",
        targetHospital: req.requestingHospital,
        title: "🚨 Transfer In Transit",
        message: `${req.requestedQuantity}x ${req.resourceName} is in transit. Awaiting arrival confirmation at ${req.requestingHospital}.`,
        timestamp: timeStr,
        read: false,
        priority: "Emergency",
      });
    } else if (status === "received" || status === "completed") {
      req.status = "completed";
      req.inventoryState = "received";
      req.timelineHistory.push({
        stage: "Received & Completed",
        timestamp: timeStr,
        actor: `${req.requestingHospital} Receiving Triage`,
        description: `Receipt confirmed by ${req.requestingHospital}. Lifecycle completed. Inventory allocated.`,
      });

      // Update inventory on backend
      assetStore.transitionResourceInventory(
        req.supplyingHospital,
        req.requestingHospital,
        req.resourceType,
        req.requestedQuantity,
        "completed"
      );

      // Notify supplying board
      this.notifications.unshift({
        id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        requestId: req.id,
        targetRole: "hospital_board",
        targetHospital: req.supplyingHospital,
        title: "✅ Resource Received",
        message: `${req.requestingHospital} confirmed receipt and intake of ${req.requestedQuantity}x ${req.resourceName}. Transfer complete.`,
        timestamp: timeStr,
        read: false,
        priority: "Normal" as any,
      });

      // Also notify requesting hospital
      this.notifications.unshift({
        id: `NOTIF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        requestId: req.id,
        targetRole: "requesting_hospital",
        targetHospital: req.requestingHospital,
        title: "✅ Transfer Completed",
        message: `Emergency allocation of ${req.requestedQuantity}x ${req.resourceName} successfully received and deployed.`,
        timestamp: timeStr,
        read: false,
        priority: "Emergency",
      });
    }

    auditTrail.record({
      actorId: actor.id,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: "RESOURCE_TRANSFER_STATUS_UPDATED",
      resourceId: req.id,
      resourceType: req.resourceType,
      status: "SUCCESS",
      details: `Emergency request ${req.id} transitioned to [${status}]. Inventory state: [${req.inventoryState}].`,
      ip,
    });

    return JSON.parse(JSON.stringify(req));
  }
}

export const hospitalBoardStore = new HospitalBoardStore();

