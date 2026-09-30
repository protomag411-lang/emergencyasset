import { HealthZone, MedicineItem, MedicineStatus, CopyrightIssue } from '../types';

export function calculateMedicineStatus(current: number, minSafe: number, capacity: number): MedicineStatus {
  if (current <= minSafe * 0.5) return 'critical_shortage';
  if (current <= minSafe) return 'low_stock';
  if (current >= capacity * 0.75) return 'surplus';
  return 'adequate';
}

export const INITIAL_ZONES: HealthZone[] = [
  {
    id: 'CN-HEALTH-ZONE-1',
    name: 'CN Health Zone 1 - General Clinical Care',
    ventilators: { total: 40, inUse: 16, available: 24, pediatric: 10, highFlow: 20, transport: 10 },
    icuBeds: { total: 45, inUse: 22, available: 23 },
    staff: { respiratoryTherapists: 14, criticalCareNurses: 30 },
    status: 'optimal',
    utilizationRate: 40,
    location: { lat: 31.2304, lng: 121.4737 },
    medicineStock: [
      {
        id: 'med-propofol',
        name: 'Propofol IV (20mg/mL 50mL)',
        genericName: 'Propofol Injectable Emulsion',
        category: 'sedatives',
        currentUnits: 95,
        totalCapacity: 150,
        unitMeasurement: 'vials',
        status: 'adequate',
        minSafeThreshold: 35,
        batchCode: 'LOT-PRP-8821',
        temperatureRequirement: '20°C - 25°C Controlled',
        controlledSchedule: 'Schedule IV',
        indication: 'Continuous IV sedation for ventilated ICU patients'
      },
      {
        id: 'med-rocuronium',
        name: 'Rocuronium Bromide (50mg/5mL)',
        genericName: 'Rocuronium Bromide',
        category: 'paralytics',
        currentUnits: 65,
        totalCapacity: 100,
        unitMeasurement: 'vials',
        status: 'adequate',
        minSafeThreshold: 25,
        batchCode: 'LOT-ROC-4402',
        temperatureRequirement: '2°C - 8°C Cold-Chain',
        indication: 'Neuromuscular blockade & synchronous ventilator compliance'
      },
      {
        id: 'med-norepinephrine',
        name: 'Norepinephrine (4mg/4mL)',
        genericName: 'Norepinephrine Bitartrate',
        category: 'vasopressors',
        currentUnits: 72,
        totalCapacity: 120,
        unitMeasurement: 'ampoules',
        status: 'adequate',
        minSafeThreshold: 30,
        batchCode: 'LOT-NEP-1099',
        temperatureRequirement: '20°C - 25°C Light-Protected',
        indication: 'Hemodynamic vasopressor support for septic & shock states'
      },
      {
        id: 'med-albuterol',
        name: 'Albuterol / Ipratropium (3mg/0.5mg)',
        genericName: 'Albuterol Sulfate & Ipratropium Bromide',
        category: 'bronchodilators',
        currentUnits: 80,
        totalCapacity: 120,
        unitMeasurement: 'vials',
        status: 'adequate',
        minSafeThreshold: 25,
        batchCode: 'LOT-ALB-3112',
        temperatureRequirement: '15°C - 30°C',
        indication: 'Nebulized bronchodilation for acute airway obstruction'
      },
      {
        id: 'med-rsi-kit',
        name: 'Emergency RSI Intubation Kits',
        genericName: 'Rapid Sequence Intubation Module',
        category: 'emergency_kits',
        currentUnits: 14,
        totalCapacity: 20,
        unitMeasurement: 'kits',
        status: 'adequate',
        minSafeThreshold: 5,
        batchCode: 'LOT-RSI-0091',
        temperatureRequirement: '2°C - 8°C Cold-Chain Monitored',
        indication: 'Pre-packaged emergency airway control and pharmacotherapy kit'
      }
    ]
  },
  {
    id: 'CN-HEALTH-ZONE-2',
    name: 'CN Health Zone 2 - North Specialized Trauma',
    ventilators: { total: 30, inUse: 21, available: 9, pediatric: 5, highFlow: 15, transport: 10 },
    icuBeds: { total: 35, inUse: 26, available: 9 },
    staff: { respiratoryTherapists: 8, criticalCareNurses: 22 },
    status: 'moderate_load',
    utilizationRate: 70,
    location: { lat: 31.2910, lng: 121.5030 },
    medicineStock: [
      {
        id: 'med-propofol',
        name: 'Propofol IV (20mg/mL 50mL)',
        genericName: 'Propofol Injectable Emulsion',
        category: 'sedatives',
        currentUnits: 38,
        totalCapacity: 120,
        unitMeasurement: 'vials',
        status: 'low_stock',
        minSafeThreshold: 35,
        batchCode: 'LOT-PRP-7922',
        temperatureRequirement: '20°C - 25°C Controlled',
        controlledSchedule: 'Schedule IV',
        indication: 'Continuous IV sedation for ventilated ICU patients'
      },
      {
        id: 'med-rocuronium',
        name: 'Rocuronium Bromide (50mg/5mL)',
        genericName: 'Rocuronium Bromide',
        category: 'paralytics',
        currentUnits: 28,
        totalCapacity: 90,
        unitMeasurement: 'vials',
        status: 'low_stock',
        minSafeThreshold: 30,
        batchCode: 'LOT-ROC-3199',
        temperatureRequirement: '2°C - 8°C Cold-Chain',
        indication: 'Neuromuscular blockade & synchronous ventilator compliance'
      },
      {
        id: 'med-norepinephrine',
        name: 'Norepinephrine (4mg/4mL)',
        genericName: 'Norepinephrine Bitartrate',
        category: 'vasopressors',
        currentUnits: 44,
        totalCapacity: 90,
        unitMeasurement: 'ampoules',
        status: 'adequate',
        minSafeThreshold: 25,
        batchCode: 'LOT-NEP-8411',
        temperatureRequirement: '20°C - 25°C Light-Protected',
        indication: 'Hemodynamic vasopressor support for septic & shock states'
      },
      {
        id: 'med-albuterol',
        name: 'Albuterol / Ipratropium (3mg/0.5mg)',
        genericName: 'Albuterol Sulfate & Ipratropium Bromide',
        category: 'bronchodilators',
        currentUnits: 55,
        totalCapacity: 80,
        unitMeasurement: 'vials',
        status: 'adequate',
        minSafeThreshold: 20,
        batchCode: 'LOT-ALB-7210',
        temperatureRequirement: '15°C - 30°C',
        indication: 'Nebulized bronchodilation for acute airway obstruction'
      },
      {
        id: 'med-rsi-kit',
        name: 'Emergency RSI Intubation Kits',
        genericName: 'Rapid Sequence Intubation Module',
        category: 'emergency_kits',
        currentUnits: 6,
        totalCapacity: 15,
        unitMeasurement: 'kits',
        status: 'low_stock',
        minSafeThreshold: 6,
        batchCode: 'LOT-RSI-1102',
        temperatureRequirement: '2°C - 8°C Cold-Chain Monitored',
        indication: 'Pre-packaged emergency airway control and pharmacotherapy kit'
      }
    ]
  },
  {
    id: 'CN-HEALTH-ZONE-3',
    name: 'CN Health Zone 3 - Central Trauma & Critical Care',
    ventilators: { total: 50, inUse: 47, available: 3, pediatric: 12, highFlow: 25, transport: 13 },
    icuBeds: { total: 60, inUse: 56, available: 4 },
    staff: { respiratoryTherapists: 18, criticalCareNurses: 45 },
    status: 'critical_overload',
    utilizationRate: 94,
    location: { lat: 31.2001, lng: 121.4320 },
    medicineStock: [
      {
        id: 'med-propofol',
        name: 'Propofol IV (20mg/mL 50mL)',
        genericName: 'Propofol Injectable Emulsion',
        category: 'sedatives',
        currentUnits: 12,
        totalCapacity: 200,
        unitMeasurement: 'vials',
        status: 'critical_shortage',
        minSafeThreshold: 45,
        batchCode: 'LOT-PRP-9031',
        temperatureRequirement: '20°C - 25°C Controlled',
        controlledSchedule: 'Schedule IV',
        indication: 'Continuous IV sedation for ventilated ICU patients'
      },
      {
        id: 'med-rocuronium',
        name: 'Rocuronium Bromide (50mg/5mL)',
        genericName: 'Rocuronium Bromide',
        category: 'paralytics',
        currentUnits: 8,
        totalCapacity: 150,
        unitMeasurement: 'vials',
        status: 'critical_shortage',
        minSafeThreshold: 35,
        batchCode: 'LOT-ROC-6512',
        temperatureRequirement: '2°C - 8°C Cold-Chain',
        indication: 'Neuromuscular blockade & synchronous ventilator compliance'
      },
      {
        id: 'med-norepinephrine',
        name: 'Norepinephrine (4mg/4mL)',
        genericName: 'Norepinephrine Bitartrate',
        category: 'vasopressors',
        currentUnits: 18,
        totalCapacity: 160,
        unitMeasurement: 'ampoules',
        status: 'low_stock',
        minSafeThreshold: 35,
        batchCode: 'LOT-NEP-3021',
        temperatureRequirement: '20°C - 25°C Light-Protected',
        indication: 'Hemodynamic vasopressor support for septic & shock states'
      },
      {
        id: 'med-albuterol',
        name: 'Albuterol / Ipratropium (3mg/0.5mg)',
        genericName: 'Albuterol Sulfate & Ipratropium Bromide',
        category: 'bronchodilators',
        currentUnits: 32,
        totalCapacity: 120,
        unitMeasurement: 'vials',
        status: 'low_stock',
        minSafeThreshold: 30,
        batchCode: 'LOT-ALB-4921',
        temperatureRequirement: '15°C - 30°C',
        indication: 'Nebulized bronchodilation for acute airway obstruction'
      },
      {
        id: 'med-rsi-kit',
        name: 'Emergency RSI Intubation Kits',
        genericName: 'Rapid Sequence Intubation Module',
        category: 'emergency_kits',
        currentUnits: 2,
        totalCapacity: 25,
        unitMeasurement: 'kits',
        status: 'critical_shortage',
        minSafeThreshold: 8,
        batchCode: 'LOT-RSI-0033',
        temperatureRequirement: '2°C - 8°C Cold-Chain Monitored',
        indication: 'Pre-packaged emergency airway control and pharmacotherapy kit'
      }
    ]
  },
  {
    id: 'CN-HEALTH-ZONE-4',
    name: 'CN Health Zone 4 - East Childrens & Women Care',
    ventilators: { total: 25, inUse: 7, available: 18, pediatric: 15, highFlow: 5, transport: 5 },
    icuBeds: { total: 28, inUse: 12, available: 16 },
    staff: { respiratoryTherapists: 12, criticalCareNurses: 20 },
    status: 'surplus',
    utilizationRate: 28,
    location: { lat: 31.2500, lng: 121.5500 },
    medicineStock: [
      {
        id: 'med-propofol',
        name: 'Propofol IV (20mg/mL 50mL)',
        genericName: 'Propofol Injectable Emulsion',
        category: 'sedatives',
        currentUnits: 165,
        totalCapacity: 180,
        unitMeasurement: 'vials',
        status: 'surplus',
        minSafeThreshold: 30,
        batchCode: 'LOT-PRP-6611',
        temperatureRequirement: '20°C - 25°C Controlled',
        controlledSchedule: 'Schedule IV',
        indication: 'Continuous IV sedation for ventilated ICU patients'
      },
      {
        id: 'med-rocuronium',
        name: 'Rocuronium Bromide (50mg/5mL)',
        genericName: 'Rocuronium Bromide',
        category: 'paralytics',
        currentUnits: 110,
        totalCapacity: 120,
        unitMeasurement: 'vials',
        status: 'surplus',
        minSafeThreshold: 25,
        batchCode: 'LOT-ROC-9920',
        temperatureRequirement: '2°C - 8°C Cold-Chain',
        indication: 'Neuromuscular blockade & synchronous ventilator compliance'
      },
      {
        id: 'med-norepinephrine',
        name: 'Norepinephrine (4mg/4mL)',
        genericName: 'Norepinephrine Bitartrate',
        category: 'vasopressors',
        currentUnits: 95,
        totalCapacity: 110,
        unitMeasurement: 'ampoules',
        status: 'surplus',
        minSafeThreshold: 20,
        batchCode: 'LOT-NEP-5512',
        temperatureRequirement: '20°C - 25°C Light-Protected',
        indication: 'Hemodynamic vasopressor support for septic & shock states'
      },
      {
        id: 'med-albuterol',
        name: 'Albuterol / Ipratropium (3mg/0.5mg)',
        genericName: 'Albuterol Sulfate & Ipratropium Bromide',
        category: 'bronchodilators',
        currentUnits: 88,
        totalCapacity: 100,
        unitMeasurement: 'vials',
        status: 'surplus',
        minSafeThreshold: 20,
        batchCode: 'LOT-ALB-8801',
        temperatureRequirement: '15°C - 30°C',
        indication: 'Nebulized bronchodilation for acute airway obstruction'
      },
      {
        id: 'med-rsi-kit',
        name: 'Emergency RSI Intubation Kits',
        genericName: 'Rapid Sequence Intubation Module',
        category: 'emergency_kits',
        currentUnits: 20,
        totalCapacity: 25,
        unitMeasurement: 'kits',
        status: 'surplus',
        minSafeThreshold: 5,
        batchCode: 'LOT-RSI-7711',
        temperatureRequirement: '2°C - 8°C Cold-Chain Monitored',
        indication: 'Pre-packaged emergency airway control and pharmacotherapy kit'
      }
    ]
  }
];

export const INITIAL_COPYRIGHT_ISSUES: CopyrightIssue[] = [
  {
    id: 'CPR-2026-081',
    title: 'Proprietary Servo-Ventilator OS v4.2 Binary Firmware Lock',
    assetType: 'ventilator_firmware',
    affectedFacilityId: 'CN-HEALTH-ZONE-4',
    affectedAssetName: '6x High-Flow Turbine Ventilators (Model EV-800)',
    copyrightHolder: 'MedTech RespiCare OEM Corp.',
    licenseType: 'Proprietary OEM EULA',
    infringementRisk: 'critical',
    description: 'Vendor EULA §14.2 strictly forbids physical reallocation or multi-tenant IP networking across separate municipal health entities. The proprietary RTOS firmware contains cryptographic node binding; unapproved relocation flags a copyright license revocation notice.',
    legalStatute: '17 U.S.C. § 1201 (DMCA Anti-Circumvention) & OEM Software Restrictive Covenant',
    dmcaWaiverApplicable: true,
    status: 'active_dispute',
    createdAt: '2026-07-02 18:22:10 IST'
  },
  {
    id: 'CPR-2026-094',
    title: 'ICU Telemetry Protocol Parsing API Copyright Dispute',
    assetType: 'telemetry_software',
    affectedFacilityId: 'CN-HEALTH-ZONE-3',
    affectedAssetName: 'Real-time Vital Signs & Ingress Pipeline Driver',
    copyrightHolder: 'AegisHealth Informatics Ltd.',
    licenseType: 'Proprietary Telemetry Protocol',
    infringementRisk: 'high',
    description: 'Aegis claims copyright infringement over their proprietary HL7/JSON packet transformation schema and API function declarations used during cross-schema synchronization into the municipal triage core.',
    legalStatute: 'Title 17 Copyright Act (Software API Method Signatures / Interoperability)',
    dmcaWaiverApplicable: true,
    status: 'active_dispute',
    createdAt: '2026-07-02 20:15:30 IST'
  },
  {
    id: 'CPR-2026-102',
    title: 'Emergency RSI Monograph Dosage Database DRM Restriction',
    assetType: 'pharma_monograph',
    affectedFacilityId: 'CN-HEALTH-ZONE-3',
    affectedAssetName: 'Rapid Sequence Intubation Dosing & Dilution Tables',
    copyrightHolder: 'LexiPharma Publishing Group Inc.',
    licenseType: 'Commercial Closed-Source',
    infringementRisk: 'medium',
    description: 'Digital rights management (DRM) container on pediatric/adult intubation dosing compendium prevents offline schema replication into the emergency helicopter transit dispatch module.',
    legalStatute: 'Digital Millennium Copyright Act (Compendium Database Copyright)',
    dmcaWaiverApplicable: true,
    status: 'dmca_exempted',
    resolutionAction: 'Applied US Copyright Office Section 1201 Emergency Healthcare Life-Safety Exemption.',
    createdAt: '2026-07-01 11:05:44 IST'
  }
];

export interface CopyrightPresetTemplate {
  name: string;
  template: Omit<CopyrightIssue, 'id' | 'createdAt'>;
}

export const COPYRIGHT_PRESET_TEMPLATES: CopyrightPresetTemplate[] = [
  {
    name: 'Ventilator Adaptive Algorithm Copyright Infringement',
    template: {
      title: 'Adaptive Support Ventilation (ASV) Algorithmic Copyright Conflict',
      assetType: 'diagnostic_ai',
      affectedFacilityId: 'CN-HEALTH-ZONE-4',
      affectedAssetName: 'ASV Dynamic Work-of-Breathing Optimization Kernel',
      copyrightHolder: 'Ventilux Global BioEngineering',
      licenseType: 'Patented Software Algorithm',
      infringementRisk: 'critical',
      description: 'Vendor claims proprietary rights over compiled PID tidal volume feedback algorithms, asserting unauthorized multi-hospital execution breaches copyright and trade secrecy agreements.',
      legalStatute: '17 U.S.C. § 106 & Proprietary Closed Source License',
      dmcaWaiverApplicable: true,
      status: 'active_dispute'
    }
  },
  {
    name: '3D Replacement Valve CAD Schematic Copyright Claim',
    template: {
      title: 'Emergency PEEP Valve 3D CAD Blueprint Copyright Cease-and-Desist',
      assetType: 'hardware_schematic',
      affectedFacilityId: 'CN-HEALTH-ZONE-1',
      affectedAssetName: '3D-Printed PEEP Manifold Valve Blueprints',
      copyrightHolder: 'Precision Venturi Medical Ltd.',
      licenseType: 'Hardware CAD Schematic',
      infringementRisk: 'high',
      description: 'OEM legal counsel sent a DMCA notice regarding open hospital fabrication and emergency 3D-printing of proprietary replacement ventilator PEEP valves during regional hardware shortages.',
      legalStatute: 'DMCA § 512 Notice & Copyright in Architectural / Technical CAD Drawings',
      dmcaWaiverApplicable: true,
      status: 'active_dispute'
    }
  },
  {
    name: 'Proprietary Pharmacopeia Formulation Schema Copyright',
    template: {
      title: 'Proprietary Norepinephrine Dilution Schema Copyright Restriction',
      assetType: 'pharma_monograph',
      affectedFacilityId: 'CN-HEALTH-ZONE-2',
      affectedAssetName: 'Smart Infusion Pump Dose-Error Reduction System (DERS)',
      copyrightHolder: 'CardioPharm Clinical Software Systems',
      licenseType: 'Patented Formulation Data',
      infringementRisk: 'medium',
      description: 'Vendor claims copyright over proprietary concentration matrices embedded in IV infusion pump firmware, blocking inter-hospital telemetry synchronization.',
      legalStatute: 'EU Software Directive 2009/24/EC & US Copyright Act § 102',
      dmcaWaiverApplicable: false,
      status: 'pending_audit'
    }
  },
  {
    name: 'EHR Patient Telemetry Ingress Interoperability Lockout',
    template: {
      title: 'Proprietary EHR Telemetry Gateway Interface Lockout',
      assetType: 'telemetry_software',
      affectedFacilityId: 'CN-HEALTH-CORE',
      affectedAssetName: 'Central EHR FHIR-to-Telemetry Ingestion Adapter',
      copyrightHolder: 'ClinicaCore Systems Corp.',
      licenseType: 'Commercial Closed-Source',
      infringementRisk: 'high',
      description: 'Proprietary interface protocol forbids non-certified third-party emergency dispatch systems from deserializing real-time ventilator alarms, asserting copyright over XML/JSON schemas.',
      legalStatute: '21st Century Cures Act Interoperability Mandate vs. Copyright Protections',
      dmcaWaiverApplicable: true,
      status: 'active_dispute'
    }
  }
];

