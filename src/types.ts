export interface VentilatorStats {
  total: number;
  inUse: number;
  available: number;
  pediatric: number;
  highFlow: number;
  transport: number;
}

export interface BedStats {
  total: number;
  inUse: number;
  available: number;
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
}

export interface HealthZone {
  id: string;
  name: string;
  ventilators: VentilatorStats;
  icuBeds: BedStats;
  staff: StaffStats;
  medicineStock: MedicineItem[];
  status: ZoneStatus;
  utilizationRate: number;
  location: {
    lat: number;
    lng: number;
  };
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
