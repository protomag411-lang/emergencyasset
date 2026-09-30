export interface VentilatorStats {
  total: number;
  inUse: number;
  available: number;
  pediatric: number;
  highFlow: number;
  transport: number;
  reserved?: number;
  dispatched?: number;
  received?: number;
}

export interface BedStats {
  total: number;
  inUse: number;
  available: number;
  reservedCapacity?: number;
  allocatedCapacity?: number;
}

export interface StaffStats {
  respiratoryTherapists: number;
  criticalCareNurses: number;
}

export type ZoneStatus = 'critical_overload' | 'moderate_load' | 'optimal' | 'surplus';
export type MedicineStatus = 'critical_shortage' | 'low_stock' | 'adequate' | 'surplus';

export interface CopyrightIssue {
  id: string;
  title: string;
  assetType: 'ventilator_firmware' | 'telemetry_software' | 'pharma_monograph' | 'diagnostic_ai' | 'hardware_schematic';
  affectedFacilityId: string;
  affectedAssetName: string;
  copyrightHolder: string;
  licenseType: 'Proprietary OEM EULA' | 'Closed-Source Commercial' | 'Commercial Closed-Source' | 'Proprietary Telemetry Protocol' | 'Patented Formulation Data' | 'Hardware CAD Schematic' | 'Patented Software Algorithm';
  infringementRisk: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  legalStatute: string;
  dmcaWaiverApplicable: boolean;
  status: 'active_dispute' | 'dmca_exempted' | 'resolved' | 'pending_audit';
  resolutionAction?: string;
  createdAt: string;
}

export interface MedicineItem {
  id: string;
  name: string;
  genericName: string;
  category: 'sedatives' | 'paralytics' | 'vasopressors' | 'bronchodilators' | 'emergency_kits';
  currentUnits: number;
  totalCapacity: number;
  unitMeasurement: string;
  status: MedicineStatus;
  minSafeThreshold: number;
  batchCode: string;
  temperatureRequirement: string;
  controlledSchedule?: string;
  indication: string;
  expiryDate?: string;
  isExpired?: boolean;
  currentRequirement?: number;
}

export type EmergencyResourceType =
  | 'icu_bed'
  | 'oxygen_cylinder'
  | 'medicine'
  | 'defibrillator'
  | 'ventilator'
  | 'infusion_pump'
  | 'patient_monitor'
  | 'stretcher'
  | 'portable_oxygen'
  | 'ambulance';

export interface OxygenCylinderStats {
  total: number;
  available: number;
  required: number;
  reserve: number;
  status: 'adequate' | 'low' | 'critical';
  reserved?: number;
  dispatched?: number;
  received?: number;
}

export interface DefibrillatorDevice {
  id: string;
  model: string;
  hospitalId: string;
  department: string;
  operational: boolean;
  inUse: boolean;
  maintenanceStatus: 'Certified' | 'Maintenance Required' | 'Inspection Overdue';
  batteryStatus: 'Good' | 'Replace Soon' | 'Critical';
  padExpiryDate: string;
}

export interface InfusionPumpStats {
  total: number;
  available: number;
  inUse: number;
  reserve: number;
  operational: boolean;
  maintenanceStatus: 'Certified' | 'Checkup Due';
  reserved?: number;
  dispatched?: number;
  received?: number;
}

export interface PatientMonitorStats {
  total: number;
  available: number;
  inUse: number;
  reserve: number;
  operational: boolean;
  reserved?: number;
  dispatched?: number;
  received?: number;
}

export interface StretcherStats {
  total: number;
  available: number;
  inUse: number;
  reserved: number;
  dispatched?: number;
  received?: number;
}

export interface PortableOxygenStats {
  total: number;
  available: number;
  inUse: number;
  reserve: number;
  batteryStatus: 'Optimal' | 'Degraded' | 'Service Required';
  reserved?: number;
  dispatched?: number;
  received?: number;
}

export interface AmbulanceUnit {
  id: string;
  hospitalId: string;
  hospitalName: string;
  vehicleNumber: string;
  type: 'ALS (Advanced Life Support)' | 'BLS (Basic Life Support)' | 'Neonatal Critical Transport';
  status: 'available' | 'requested' | 'approved' | 'preparing' | 'dispatched' | 'en_route' | 'maintenance' | 'arrived';
  currentAssignment?: string;
  location: string;
  destination?: string;
  eta?: string;
  equipmentReadiness: 'Certified 100%' | 'Restocking Needed' | 'Full Equipment Loaded';
  contactPhone: string;
}

export interface TransferabilityAssessment {
  available: number;
  requirement: number;
  reserve: number;
  safeTransferable: number;
  status: 'can_transfer' | 'limited_transfer' | 'cannot_transfer';
  reason: string;
}

export interface TransferTimelineEvent {
  stage: string;
  timestamp: string;
  actor?: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

export interface HospitalBoardRequest {
  id: string; // e.g. TR-1048
  timestamp: string;
  transferType: 'inter_hospital' | 'intra_hospital';
  resourceType: EmergencyResourceType;
  resourceName: string;
  requestingHospital: string;
  requestingHospitalId?: string;
  requestingDepartment?: string;
  supplyingHospital: string;
  supplyingHospitalId?: string;
  supplyingDepartment?: string;
  requestedQuantity: number;
  currentAvailable?: number;
  safeTransferableQuantity: number;
  transferabilityStatus: 'can_transfer' | 'limited_transfer' | 'cannot_transfer';
  priority: 'Emergency' | 'Critical' | 'Urgent';
  status:
    | 'pending_board_approval'
    | 'approved'
    | 'preparing'
    | 'dispatched'
    | 'in_transit'
    | 'received'
    | 'completed'
    | 'rejected';
  rejectionReason?: string;
  notes?: string;
  eta?: string;
  approvedBy?: string;
  approvedAt?: string;
  inventoryState?: 'available' | 'reserved' | 'dispatched' | 'received';
  timelineHistory?: {
    stage: string;
    timestamp: string;
    actor?: string;
    description: string;
  }[];
}

export interface InAppNotification {
  id: string;
  requestId: string;
  targetRole: 'requesting_hospital' | 'hospital_board';
  targetHospital: string;
  title: string;
  message: string;
  type?:
    | 'emergency_request'
    | 'approved'
    | 'rejected'
    | 'preparing'
    | 'dispatched'
    | 'in_transit'
    | 'received'
    | 'completed'
    | string;
  timestamp: string;
  read: boolean;
  priority?: 'Emergency' | 'Critical' | 'Urgent' | string;
  resourceSummary?: {
    resourceName: string;
    quantity: number;
    unit: string;
    requestingHospital: string;
    supplyingHospital: string;
    currentAvailable: number;
    safeTransferable: number;
  };
}

export type UserRole = 'DISPATCHER' | 'CLINICAL_DIRECTOR' | 'COMPLIANCE_ADMIN' | 'SECURITY_AUDITOR';

export interface OperatorProfile {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  assignedFacility: string;
  clearanceLevel: 'LEVEL_1_OPERATOR' | 'LEVEL_2_DIRECTOR' | 'LEVEL_3_ADMIN' | 'LEVEL_AUDITOR';
}

export interface OperatorSession {
  token: string;
  operator: OperatorProfile;
  expiresAt: string;
}

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resourceId?: string;
  resourceType?: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details: string;
  ip?: string;
}

export interface HealthZone {
  id: string;
  name: string;
  region: 'Kolkata, West Bengal' | 'Maharashtra' | 'Karnataka';
  city: string;
  isDemoPrototype: boolean;
  departments: string[];
  ventilators: VentilatorStats;
  icuBeds: BedStats;
  staff: StaffStats;
  medicineStock: MedicineItem[];
  oxygenCylinders: OxygenCylinderStats;
  defibrillators: DefibrillatorDevice[];
  infusionPumps: InfusionPumpStats;
  patientMonitors: PatientMonitorStats;
  stretchers: StretcherStats;
  portableOxygen: PortableOxygenStats;
  ambulances: AmbulanceUnit[];
  status: ZoneStatus;
  utilizationRate: number;
  location: {
    lat: number;
    lng: number;
  };
  version: number;
}

export interface RuleCheck {
  id: string;
  ruleName: string;
  category: 'regulatory' | 'clinical' | 'logistical' | 'schema' | 'copyright';
  passed: boolean;
  description: string;
}

export interface RecommendedMedicineTransfer {
  medicineId: string;
  name: string;
  units: number;
  unitMeasurement: string;
}

export interface VerificationResponse {
  verified: boolean;
  timestamp: string;
  safetyRating: 'A' | 'B' | 'C' | 'F';
  rules: RuleCheck[];
  analysis: string;
  recommendedTransfer: {
    sourceZoneId: string;
    ventilatorsToMove: number;
    staffToMove: number;
    medicinesToMove?: RecommendedMedicineTransfer[];
    rationale: string;
    estimatedTime: string;
  } | null;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  facilityId?: string;
  metric?: string;
  value?: string;
  status: string;
  message: string;
  type: 'critical' | 'warning' | 'info' | 'success';
}
