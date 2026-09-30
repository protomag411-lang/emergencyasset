import React, { useState } from 'react';
import { HealthZone, SystemLog, VerificationResponse, RecommendedMedicineTransfer, CopyrightIssue } from './types';
import { INITIAL_ZONES, calculateMedicineStatus, INITIAL_COPYRIGHT_ISSUES } from './data/initialData';
import FacilitiesOverview from './components/FacilitiesOverview';
import MedicineStockView from './components/MedicineStockView';
import CopyrightManager from './components/CopyrightManager';
import VerificationEngine from './components/VerificationEngine';
import ReallocationTool from './components/ReallocationTool';
import SystemLogs from './components/SystemLogs';
import { ShieldAlert, HeartPulse, RefreshCw, BarChart2, Pill, Activity, Scale } from 'lucide-react';
import { motion } from 'motion/react';

// Initial logs seeded with the user's critical log
const INITIAL_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-02 21:40:50 IST',
    facilityId: 'CN-HEALTH-ZONE-3',
    metric: 'VENTILATOR_UTILIZATION_RATE',
    value: '94%',
    status: 'CRITICAL_OVERLOAD',
    message: 'Emergency threshold breached (94% ventilators, Propofol/Rocuronium < 10% stock). Cross-schema verification required for immediate asset reallocation.',
    type: 'critical'
  }
];

export default function App() {
  const [zones, setZones] = useState<HealthZone[]>(INITIAL_ZONES);
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [copyrightIssues, setCopyrightIssues] = useState<CopyrightIssue[]>(INITIAL_COPYRIGHT_ISSUES);
  const [verificationReport, setVerificationReport] = useState<VerificationResponse | null>(null);
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<'facilities' | 'pharmacy' | 'copyright'>('facilities');

  const addLog = (message: string, type: SystemLog['type'], facilityId?: string, metric?: string, value?: string, status?: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST';
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      facilityId,
      metric,
      value,
      status: status || 'NORMAL',
      message,
      type
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // Copyright issues lifecycle handlers
  const handleCreateCopyrightIssue = (issueData: Omit<CopyrightIssue, 'id' | 'createdAt'>) => {
    const timeStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST';
    const newIssue: CopyrightIssue = {
      ...issueData,
      id: `CPR-2026-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: timeStr
    };
    setCopyrightIssues((prev) => [newIssue, ...prev]);
    addLog(
      `COPYRIGHT DISPUTE CREATED: [${newIssue.id}] "${newIssue.title}" filed against ${newIssue.affectedAssetName} by ${newIssue.copyrightHolder}. Risk: ${newIssue.infringementRisk.toUpperCase()} under ${newIssue.legalStatute}.`,
      newIssue.infringementRisk === 'critical' ? 'critical' : 'warning',
      newIssue.affectedFacilityId,
      'COPYRIGHT_DISPUTE',
      newIssue.infringementRisk.toUpperCase(),
      newIssue.status.toUpperCase()
    );
  };

  const handleUpdateCopyrightIssue = (issueId: string, updates: Partial<CopyrightIssue>) => {
    setCopyrightIssues((prev) =>
      prev.map((issue) => {
        if (issue.id === issueId) {
          const updated = { ...issue, ...updates };
          addLog(
            `COPYRIGHT RECORD UPDATED: [${issueId}] Status transitioned to [${updated.status.toUpperCase()}]. Action: ${updated.resolutionAction || 'Status adjusted.'}`,
            updated.status === 'resolved' ? 'success' : updated.status === 'dmca_exempted' ? 'info' : 'warning',
            updated.affectedFacilityId,
            'LICENSE_STATUS',
            updated.status.toUpperCase(),
            'UPDATED'
          );
          return updated;
        }
        return issue;
      })
    );
  };

  const handleDeleteCopyrightIssue = (issueId: string) => {
    const target = copyrightIssues.find(i => i.id === issueId);
    setCopyrightIssues((prev) => prev.filter((i) => i.id !== issueId));
    addLog(
      `COPYRIGHT RECORD PURGED: Dispute [${issueId}] "${target?.title || ''}" dismissed and purged from hospital compliance registry.`,
      'info',
      target?.affectedFacilityId
    );
  };

  const handleInvokeDMCA = (issueId: string) => {
    const target = copyrightIssues.find(i => i.id === issueId);
    handleUpdateCopyrightIssue(issueId, {
      status: 'dmca_exempted',
      resolutionAction: 'Applied 17 U.S.C. § 1201 Emergency Healthcare Life-Safety Exemption. Statutory restriction waived.'
    });
    addLog(
      `DMCA §1201 EMERGENCY EXEMPTION INVOKED: Reallocation restriction on ${target?.affectedAssetName || 'asset'} legally superseded under federal public health emergency provisions.`,
      'success',
      target?.affectedFacilityId
    );
  };

  // Helper to dynamically calculate status of a zone based on updated utilization rate
  const determineStatusAndRate = (total: number, inUse: number): { rate: number; status: 'critical_overload' | 'moderate_load' | 'optimal' | 'surplus' } => {
    const rate = total > 0 ? Math.round((inUse / total) * 100) : 0;
    let status: 'critical_overload' | 'moderate_load' | 'optimal' | 'surplus' = 'optimal';
    if (rate >= 90) status = 'critical_overload';
    else if (rate >= 65) status = 'moderate_load';
    else if (rate <= 35) status = 'surplus';
    return { rate, status };
  };

  // Callback to simulate discharging/admitting patients locally
  const handleUpdateZoneVentilators = (zoneId: string, delta: number) => {
    setZones((prevZones) =>
      prevZones.map((zone) => {
        if (zone.id === zoneId) {
          const newInUse = Math.max(0, Math.min(zone.ventilators.total, zone.ventilators.inUse + delta));
          const { rate, status } = determineStatusAndRate(zone.ventilators.total, newInUse);
          const newAvailable = zone.ventilators.total - newInUse;
          
          let logType: SystemLog['type'] = 'info';
          if (status === 'critical_overload') logType = 'critical';
          else if (status === 'moderate_load') logType = 'warning';
          
          addLog(
            `Simulated triage change in ${zone.id}: Ventilators in use adjusted to ${newInUse}/${zone.ventilators.total} (${rate}%).`,
            logType,
            zone.id,
            'VENTILATOR_UTILIZATION_RATE',
            `${rate}%`,
            status.toUpperCase()
          );

          return {
            ...zone,
            ventilators: {
              ...zone.ventilators,
              inUse: newInUse,
              available: newAvailable
            },
            status,
            utilizationRate: rate
          };
        }
        return zone;
      })
    );
  };

  // Callback to simulate medicine intake or consumption in a specific facility
  const handleUpdateMedicineUnits = (zoneId: string, medicineId: string, delta: number) => {
    setZones((prevZones) =>
      prevZones.map((zone) => {
        if (zone.id === zoneId) {
          const updatedMeds = zone.medicineStock.map((med) => {
            if (med.id === medicineId) {
              const newUnits = Math.max(0, Math.min(med.totalCapacity, med.currentUnits + delta));
              const newStatus = calculateMedicineStatus(newUnits, med.minSafeThreshold, med.totalCapacity);
              
              addLog(
                `Pharmacy stock update in ${zone.id}: ${med.name} adjusted by ${delta > 0 ? '+' : ''}${delta} ${med.unitMeasurement} (Current: ${newUnits}/${med.totalCapacity} [${newStatus.toUpperCase()}]).`,
                newStatus === 'critical_shortage' ? 'critical' : newStatus === 'low_stock' ? 'warning' : 'info',
                zone.id,
                'MEDICINE_BUFFER_STOCK',
                `${newUnits} ${med.unitMeasurement}`,
                newStatus.toUpperCase()
              );

              return {
                ...med,
                currentUnits: newUnits,
                status: newStatus
              };
            }
            return med;
          });

          return {
            ...zone,
            medicineStock: updatedMeds
          };
        }
        return zone;
      })
    );
  };

  // Save Gemini compliance audit results
  const handleVerificationComplete = (response: VerificationResponse) => {
    setVerificationReport(response);
    const logType = response.verified ? 'success' : 'critical';
    addLog(
      `Cross-schema verification complete. Plan certified with safety rating: [${response.safetyRating}]. Ventilators, clinician staffing, and cold-chain medicine routes validated.`,
      logType,
      'CN-HEALTH-CORE'
    );
  };

  // Execute actual asset & medicine transfer across zones
  const handleExecuteReallocation = (
    sourceZoneId: string, 
    ventilatorsMoved: number, 
    staffMoved: number,
    medicinesMoved: RecommendedMedicineTransfer[]
  ) => {
    setZones((prevZones) => {
      return prevZones.map((zone) => {
        // Deduct from surplus source
        if (zone.id === sourceZoneId) {
          const newInUse = zone.ventilators.inUse;
          const newTotal = Math.max(0, zone.ventilators.total - ventilatorsMoved);
          const newAvailable = Math.max(0, newTotal - newInUse);
          const { rate, status } = determineStatusAndRate(newTotal, newInUse);

          const updatedMeds = zone.medicineStock.map((med) => {
            const transfer = medicinesMoved.find(m => m.medicineId === med.id);
            if (transfer && transfer.units > 0) {
              const newUnits = Math.max(0, med.currentUnits - transfer.units);
              return {
                ...med,
                currentUnits: newUnits,
                status: calculateMedicineStatus(newUnits, med.minSafeThreshold, med.totalCapacity)
              };
            }
            return med;
          });

          return {
            ...zone,
            ventilators: {
              ...zone.ventilators,
              total: newTotal,
              available: newAvailable
            },
            staff: {
              ...zone.staff,
              respiratoryTherapists: Math.max(0, zone.staff.respiratoryTherapists - staffMoved)
            },
            medicineStock: updatedMeds,
            utilizationRate: rate,
            status
          };
        }
        
        // Add to overloaded destination
        if (zone.id === 'CN-HEALTH-ZONE-3') {
          const newInUse = zone.ventilators.inUse;
          const newTotal = zone.ventilators.total + ventilatorsMoved;
          const newAvailable = Math.max(0, newTotal - newInUse);
          const { rate, status } = determineStatusAndRate(newTotal, newInUse);

          const updatedMeds = zone.medicineStock.map((med) => {
            const transfer = medicinesMoved.find(m => m.medicineId === med.id);
            if (transfer && transfer.units > 0) {
              const newUnits = Math.min(med.totalCapacity, med.currentUnits + transfer.units);
              return {
                ...med,
                currentUnits: newUnits,
                status: calculateMedicineStatus(newUnits, med.minSafeThreshold, med.totalCapacity)
              };
            }
            return med;
          });

          return {
            ...zone,
            ventilators: {
              ...zone.ventilators,
              total: newTotal,
              available: newAvailable
            },
            staff: {
              ...zone.staff,
              respiratoryTherapists: zone.staff.respiratoryTherapists + staffMoved
            },
            medicineStock: updatedMeds,
            utilizationRate: rate,
            status
          };
        }
        return zone;
      });
    });

    // Reset report until next audit to avoid double clicks
    setVerificationReport(null);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Summarized stats for regional header
  const totalVentilators = zones.reduce((sum, z) => sum + z.ventilators.total, 0);
  const totalInUse = zones.reduce((sum, z) => sum + z.ventilators.inUse, 0);
  const averageUtilization = Math.round((totalInUse / totalVentilators) * 100);
  const overloadCount = zones.filter((z) => z.status === 'critical_overload').length;
  
  const allMeds = zones.flatMap(z => z.medicineStock);
  const totalCriticalShortages = allMeds.filter(m => m.status === 'critical_shortage').length;
  const activeCopyrightDisputes = copyrightIssues.filter(i => i.status === 'active_dispute').length;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.6 }} 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-slate-100"
    >
      
      {/* Upper Tactical Status Banner */}
      <header id="control_header" className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h1 className="text-base font-extrabold tracking-wider text-slate-100 uppercase">Emergency Resource & Medicine Allocation Console</h1>
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Tactical Command Sector • CN-HEALTH-CORE</p>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-mono">
            
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Network Ventilator Load</span>
                <span className="font-bold text-slate-200">{averageUtilization}% ({totalInUse}/{totalVentilators})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <Pill className={`w-4 h-4 ${totalCriticalShortages > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Pharma Depletions</span>
                <span className={`font-bold ${totalCriticalShortages > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {totalCriticalShortages} Critical Stock
                </span>
              </div>
            </div>

            <div 
              id="header_copyright_stat"
              onClick={() => setActiveTelemetryTab('copyright')}
              className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg cursor-pointer hover:border-purple-800/60 transition"
              title="Click to view and manage copyright issues"
            >
              <Scale className={`w-4 h-4 ${activeCopyrightDisputes > 0 ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Copyright & DRM</span>
                <span className={`font-bold ${activeCopyrightDisputes > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                  {activeCopyrightDisputes} Active Dispute{activeCopyrightDisputes === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <ShieldAlert className={`w-4 h-4 ${overloadCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-500'}`} />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Overloaded Facilities</span>
                <span className={`font-bold ${overloadCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {overloadCount} Facility
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Ingress Pipeline</span>
                <span className="font-bold text-emerald-400 uppercase">SECURE</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Command Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column (2/3 width on desktop): Telemetry & Verification */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Navigation Tab Selector for Telemetry vs Medicine Stock vs Copyright Matrix */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-3 gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="tab_facilities_view"
                onClick={() => setActiveTelemetryTab('facilities')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTelemetryTab === 'facilities'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Facility Telemetry Overview
              </button>
              <button
                id="tab_pharmacy_view"
                onClick={() => setActiveTelemetryTab('pharmacy')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTelemetryTab === 'pharmacy'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                Medicine Stock ({totalCriticalShortages} Alerts)
              </button>
              <button
                id="tab_copyright_view"
                onClick={() => setActiveTelemetryTab('copyright')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTelemetryTab === 'copyright'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-purple-300" />
                Copyright & IP Licensing ({activeCopyrightDisputes} Issues)
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline-block">
              Auto-sync: Active Telemetry
            </span>
          </div>

          {/* Conditional Main Views */}
          {activeTelemetryTab === 'facilities' && (
            <section id="telemetry_section">
              <FacilitiesOverview 
                zones={zones} 
                onUpdateZoneVentilators={handleUpdateZoneVentilators}
                onUpdateMedicineUnits={handleUpdateMedicineUnits}
              />
            </section>
          )}

          {activeTelemetryTab === 'pharmacy' && (
            <section id="medicine_stock_section">
              <MedicineStockView 
                zones={zones} 
                onUpdateMedicineUnits={handleUpdateMedicineUnits} 
              />
            </section>
          )}

          {activeTelemetryTab === 'copyright' && (
            <section id="copyright_section">
              <CopyrightManager
                zones={zones}
                issues={copyrightIssues}
                onCreateIssue={handleCreateCopyrightIssue}
                onUpdateIssue={handleUpdateCopyrightIssue}
                onDeleteIssue={handleDeleteCopyrightIssue}
                onInvokeDMCA={handleInvokeDMCA}
              />
            </section>
          )}

          {/* Schema & Regulation Checker */}
          <section id="verification_section">
            <VerificationEngine 
              zones={zones} 
              copyrightIssues={copyrightIssues}
              onVerificationComplete={handleVerificationComplete} 
              verificationReport={verificationReport}
            />
          </section>

        </div>

        {/* Right column (1/3 width on desktop): Reallocation dispatch & Telemetry Console logs */}
        <div className="space-y-8">
          
          {/* Active Reallocation Controls */}
          <section id="reallocation_section">
            <ReallocationTool 
              zones={zones} 
              verificationReport={verificationReport} 
              onExecuteReallocation={handleExecuteReallocation}
              onAddLog={addLog}
            />
          </section>

          {/* System Console Logs */}
          <section id="logs_section">
            <SystemLogs 
              logs={logs} 
              onClearLogs={handleClearLogs} 
            />
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 px-4 text-center text-[11px] text-slate-600 font-mono mt-auto">
        <p>© 2026 Emergency Resource Allocation Center. Certified under FDA/WHO cross-schema mobilization protocol. All times displayed in IST.</p>
      </footer>

    </motion.div>
  );
}
