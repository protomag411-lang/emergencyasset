import React, { useState, useEffect, useCallback } from 'react';
import {
  HealthZone,
  SystemLog,
  VerificationResponse,
  RecommendedMedicineTransfer,
  CopyrightIssue,
  OperatorSession,
  OperatorProfile,
  SecurityAuditRecord,
} from './types';
import { INITIAL_ZONES, INITIAL_COPYRIGHT_ISSUES } from './data/initialData';
import FacilitiesOverview from './components/FacilitiesOverview';
import MedicineStockView from './components/MedicineStockView';
import VerificationEngine from './components/VerificationEngine';
import ReallocationTool from './components/ReallocationTool';
import SystemLogs from './components/SystemLogs';
import SecurityAuditView from './components/SecurityAuditView';
import AdminCompliancePanel from './components/AdminCompliancePanel';
import OperatorClearanceModal from './components/OperatorClearanceModal';
import {
  HeartPulse,
  BarChart2,
  Pill,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Scale,
  RefreshCw,
  Lock,
  UserCheck,
  Server,
  Key,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';

const INITIAL_LOGS: SystemLog[] = [
  {
    id: 'log-boot-1',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    facilityId: 'CN-HEALTH-ZONE-3',
    metric: 'VENTILATOR_UTILIZATION_RATE',
    value: '94%',
    status: 'CRITICAL_OVERLOAD',
    message: 'Emergency threshold breached. Concurrency locks and server-side RBAC validation active.',
    type: 'critical',
  },
];

export default function App() {
  const [zones, setZones] = useState<HealthZone[]>(INITIAL_ZONES);
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<OperatorProfile[]>([]);
  const [isClearanceModalOpen, setIsClearanceModalOpen] = useState(false);
  const [auditRecords, setAuditRecords] = useState<SecurityAuditRecord[]>([]);
  const [complianceEnabled, setComplianceEnabled] = useState(false);
  const [copyrightIssues, setCopyrightIssues] = useState<CopyrightIssue[]>(INITIAL_COPYRIGHT_ISSUES);
  const [verificationReport, setVerificationReport] = useState<VerificationResponse | null>(null);
  const [activeTelemetryTab, setActiveTelemetryTab] = useState<'facilities' | 'pharmacy' | 'audit' | 'compliance'>('facilities');
  const [auditPurgeNotice, setAuditPurgeNotice] = useState<string | null>(null);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (
    message: string,
    type: SystemLog['type'],
    facilityId?: string,
    metric?: string,
    value?: string,
    status?: string
  ) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST';
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      facilityId,
      metric,
      value,
      status: status || 'NORMAL',
      message,
      type,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // Helper for authenticated requests
  const authHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  }, [session?.token]);

  // Fetch canonical zones from server
  const fetchZones = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch('/api/zones', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } catch (err) {
      console.error('Failed to load canonical zones from server', err);
    }
  }, [session?.token, authHeaders]);

  // Fetch audit records
  const fetchAuditRecords = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch('/api/audit-logs', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAuditRecords(data);
      }
    } catch (err) {
      // Role may not have audit clearance
    }
  }, [session?.token, authHeaders]);

  // Fetch compliance status and issues
  const fetchCompliance = useCallback(async () => {
    if (!session?.token) return;
    try {
      const statusRes = await fetch('/api/compliance/status', { headers: authHeaders() });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setComplianceEnabled(statusData.enabled);

        if (statusData.enabled) {
          const licRes = await fetch('/api/compliance/licenses', { headers: authHeaders() });
          if (licRes.ok) {
            const licData = await licRes.json();
            setCopyrightIssues(licData);
          }
        }
      }
    } catch (err) {
      console.error('Compliance service check error', err);
    }
  }, [session?.token, authHeaders]);

  // Initial bootstrap on app load
  useEffect(() => {
    async function bootstrap() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/bootstrap');
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          setAvailableProfiles(data.availableProfiles);

          // Once session is established, load zones and audit logs
          const zonesRes = await fetch('/api/zones', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.token}`,
            },
          });
          if (zonesRes.ok) {
            const zonesData = await zonesRes.json();
            setZones(zonesData);
          }

          const auditRes = await fetch('/api/audit-logs', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.token}`,
            },
          });
          if (auditRes.ok) {
            const auditData = await auditRes.json();
            setAuditRecords(auditData);
          }

          const compRes = await fetch('/api/compliance/status', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.token}`,
            },
          });
          if (compRes.ok) {
            const compData = await compRes.json();
            setComplianceEnabled(compData.enabled);
          }
        }
      } catch (err) {
        console.error('Bootstrap failed', err);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  // Switch operator profile (Duty Shift Handover)
  const handleSwitchOperator = async (operatorId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSession(newSession);
        setIsClearanceModalOpen(false);
        addLog(
          `OPERATOR SHIFT HANDOVER: Active duty assumed by ${newSession.operator.displayName} [Clearance: ${newSession.operator.clearanceLevel}].`,
          'info',
          newSession.operator.assignedFacility
        );
        fetchAuditRecords();
        fetchCompliance();
      }
    } catch (err) {
      console.error('Failed to switch operator duty', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe server-authoritative ventilator triage update
  const handleUpdateZoneVentilators = async (zoneId: string, delta: number) => {
    const currentZone = zones.find((z) => z.id === zoneId);
    if (!currentZone) return;

    try {
      const res = await fetch(`/api/zones/${zoneId}/triage`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          delta,
          expectedVersion: currentZone.version,
        }),
      });

      if (res.status === 409) {
        setSecurityAlert(
          `CONCURRENCY CONFLICT (409): Zone ${zoneId} was modified by another operator. Automatically refreshing server state...`
        );
        fetchZones();
        fetchAuditRecords();
        return;
      }

      if (res.ok) {
        const updated = await res.json();
        setZones((prev) => prev.map((z) => (z.id === zoneId ? updated : z)));
        setSecurityAlert(null);
        addLog(
          `Triage updated on ${zoneId}: In-use adjusted by ${delta > 0 ? '+' : ''}${delta} to ${updated.ventilators.inUse}/${updated.ventilators.total} (${updated.utilizationRate}%). Server Version: v${updated.version}.`,
          updated.status === 'critical_overload' ? 'critical' : updated.status === 'moderate_load' ? 'warning' : 'info',
          zoneId,
          'VENTILATOR_LOAD',
          `${updated.utilizationRate}%`,
          updated.status.toUpperCase()
        );
        fetchAuditRecords();
      } else {
        const err = await res.json();
        setSecurityAlert(`Validation Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to update triage on server', err);
    }
  };

  // Safe server-authoritative medicine stock update
  const handleUpdateMedicineUnits = async (zoneId: string, medicineId: string, delta: number) => {
    const currentZone = zones.find((z) => z.id === zoneId);
    if (!currentZone) return;

    try {
      const res = await fetch(`/api/zones/${zoneId}/medicines/${medicineId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          delta,
          expectedVersion: currentZone.version,
        }),
      });

      if (res.status === 409) {
        setSecurityAlert(
          `CONCURRENCY CONFLICT (409): Inventory at ${zoneId} was modified concurrently. Refetched latest state.`
        );
        fetchZones();
        fetchAuditRecords();
        return;
      }

      if (res.ok) {
        const updated = await res.json();
        setZones((prev) => prev.map((z) => (z.id === zoneId ? updated : z)));
        setSecurityAlert(null);
        const med = updated.medicineStock.find((m: any) => m.id === medicineId);
        addLog(
          `Pharmacy inventory updated in ${zoneId}: ${med.name} adjusted to ${med.currentUnits}/${med.totalCapacity} (${med.status.toUpperCase()}). Server Version: v${updated.version}.`,
          med.status === 'critical_shortage' ? 'critical' : med.status === 'low_stock' ? 'warning' : 'info',
          zoneId,
          'MEDICINE_BUFFER_STOCK',
          `${med.currentUnits} ${med.unitMeasurement}`,
          med.status.toUpperCase()
        );
        fetchAuditRecords();
      } else {
        const err = await res.json();
        setSecurityAlert(`Inventory Error: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to update medicine units on server', err);
    }
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
    fetchAuditRecords();
  };

  // Transactional Inter-Zone Emergency Reallocation
  const handleExecuteReallocation = async (
    sourceZoneId: string,
    ventilatorsMoved: number,
    staffMoved: number,
    medicinesMoved: RecommendedMedicineTransfer[]
  ) => {
    const sourceZone = zones.find((z) => z.id === sourceZoneId);
    const targetZone = zones.find((z) => z.id === 'CN-HEALTH-ZONE-3');
    if (!sourceZone || !targetZone) return;

    try {
      const res = await fetch('/api/reallocations/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          sourceZoneId,
          targetZoneId: 'CN-HEALTH-ZONE-3',
          ventilatorsToMove: ventilatorsMoved,
          staffToMove: staffMoved,
          medicinesToMove: medicinesMoved.map((m) => ({ medicineId: m.medicineId, units: m.units })),
          expectedSourceVersion: sourceZone.version,
          expectedTargetVersion: targetZone.version,
        }),
      });

      if (res.status === 409) {
        setSecurityAlert('CONCURRENCY LOCK ERROR (409): Facilities were modified concurrently. Re-fetching fresh state.');
        fetchZones();
        fetchAuditRecords();
        return;
      }

      if (res.ok) {
        const { sourceZone: updatedSource, targetZone: updatedTarget } = await res.json();
        setZones((prev) =>
          prev.map((z) => {
            if (z.id === sourceZoneId) return updatedSource;
            if (z.id === 'CN-HEALTH-ZONE-3') return updatedTarget;
            return z;
          })
        );
        setVerificationReport(null);
        setSecurityAlert(null);
        addLog(
          `TRANSACTION COMMITTED: Transferred ${ventilatorsMoved} ventilators, ${staffMoved} staff, and ICU pharmaceuticals from ${sourceZone.name} to ${targetZone.name}. Versions synchronized to v${updatedSource.version} & v${updatedTarget.version}.`,
          'success',
          'CN-HEALTH-ZONE-3'
        );
        fetchAuditRecords();
      } else {
        const err = await res.json();
        setSecurityAlert(`Reallocation Failed: ${err.error}`);
      }
    } catch (err) {
      console.error('Failed to commit emergency reallocation', err);
    }
  };

  // Test server-side audit trail immutability
  const handleAttemptPurgeAudit = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 403) {
        const err = await res.json();
        setAuditPurgeNotice(
          `IMMUTABILITY VERIFIED (403 Forbidden): Server rejected audit log deletion. Code: ${err.code}. Audit trail is append-only.`
        );
        setTimeout(() => setAuditPurgeNotice(null), 7000);
        fetchAuditRecords();
      }
    } catch (err) {
      console.error('Audit delete test failed', err);
    }
  };

  // Toggle compliance feature flag (Secondary Layer)
  const handleToggleCompliance = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/compliance/toggle', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setComplianceEnabled(data.enabled);
        addLog(
          `ADMIN GOVERNANCE: Compliance & Licensing module feature flag set to [${data.enabled ? 'ENABLED' : 'DISABLED'}].`,
          'info',
          'CN-HEALTH-CORE'
        );
        fetchAuditRecords();
        if (data.enabled) {
          fetchCompliance();
        }
      }
    } catch (err) {
      console.error('Failed to toggle compliance flag', err);
    }
  };

  // Compliance CRUD Handlers
  const handleCreateCopyrightIssue = async (issueData: Omit<CopyrightIssue, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/compliance/licenses', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(issueData),
      });
      if (res.ok) {
        const created = await res.json();
        setCopyrightIssues((prev) => [created, ...prev]);
        fetchAuditRecords();
      }
    } catch (err) {
      console.error('Failed to create compliance issue', err);
    }
  };

  const handleUpdateCopyrightIssue = async (issueId: string, updates: Partial<CopyrightIssue>) => {
    try {
      const res = await fetch(`/api/compliance/licenses/${issueId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setCopyrightIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
        fetchAuditRecords();
      }
    } catch (err) {
      console.error('Failed to update compliance issue', err);
    }
  };

  const handleDeleteCopyrightIssue = (issueId: string) => {
    setCopyrightIssues((prev) => prev.filter((i) => i.id !== issueId));
  };

  const handleInvokeDMCA = async (issueId: string) => {
    try {
      const res = await fetch(`/api/compliance/licenses/${issueId}/dmca-waiver`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        const updated = await res.json();
        setCopyrightIssues((prev) => prev.map((i) => (i.id === issueId ? updated : i)));
        addLog(
          `DMCA §1201 EMERGENCY EXEMPTION INVOKED: Reallocation restriction on ${updated.affectedAssetName} legally superseded under federal public health emergency provisions.`,
          'success',
          updated.affectedFacilityId
        );
        fetchAuditRecords();
      }
    } catch (err) {
      console.error('Failed to invoke DMCA waiver', err);
    }
  };

  // Header quick metrics
  const totalVentilators = zones.reduce((sum, z) => sum + z.ventilators.total, 0);
  const totalInUse = zones.reduce((sum, z) => sum + z.ventilators.inUse, 0);
  const averageUtilization = totalVentilators > 0 ? Math.round((totalInUse / totalVentilators) * 100) : 0;
  const overloadCount = zones.filter((z) => z.status === 'critical_overload').length;
  const allMeds = zones.flatMap((z) => z.medicineStock);
  const totalCriticalShortages = allMeds.filter((m) => m.status === 'critical_shortage').length;

  const isOperatorAdmin =
    session?.operator.role === 'COMPLIANCE_ADMIN' || session?.operator.role === 'CLINICAL_DIRECTOR';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-slate-100"
    >
      {/* Upper Tactical Status Header */}
      <header
        id="control_header"
        className="border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand & Sector Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <h1 className="text-base font-extrabold tracking-wider text-slate-100 uppercase">
                    Emergency Asset Reallocation Console
                  </h1>
                </div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">
                  Tactical Command Sector • CN-HEALTH-CORE • Production Enforced
                </p>
              </div>
            </div>

            {/* Operator Badge Trigger (Mobile) */}
            <button
              onClick={() => setIsClearanceModalOpen(true)}
              className="md:hidden flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-mono"
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-slate-200">{session?.operator.role || 'OPERATOR'}</span>
            </button>
          </div>

          {/* Tactical Quick Stats & Operator Authentication Pill */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono w-full md:w-auto justify-end">
            
            {/* Operator Clearance Pill (Desktop) */}
            <div
              onClick={() => setIsClearanceModalOpen(true)}
              className="hidden md:flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition"
              title="Click to view clearances or switch operator duty shift"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-500 uppercase">Authenticated Operator</span>
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-950/40 border border-rose-900/40 px-1 rounded">
                    {session?.operator.role || 'DISPATCHER'}
                  </span>
                </div>
                <span className="font-bold text-slate-200 block text-xs">
                  {session?.operator.displayName || 'Authenticating...'}
                </span>
              </div>
            </div>

            {/* Live Ventilator Util */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Network Load</span>
                <span className="font-bold text-slate-200">
                  {averageUtilization}% ({totalInUse}/{totalVentilators})
                </span>
              </div>
            </div>

            {/* Pharma Depletions */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <Pill
                className={`w-4 h-4 ${
                  totalCriticalShortages > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                }`}
              />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Pharma Alerts</span>
                <span
                  className={`font-bold ${
                    totalCriticalShortages > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {totalCriticalShortages} Critical
                </span>
              </div>
            </div>

            {/* Overload count */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <ShieldAlert
                className={`w-4 h-4 ${overloadCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-500'}`}
              />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Overloaded Facilities</span>
                <span className={`font-bold ${overloadCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {overloadCount} Facility
                </span>
              </div>
            </div>

            {/* Ingress / Server State */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <span className="text-slate-500 text-[9px] block uppercase">Server Trust</span>
                <span className="font-bold text-emerald-400 uppercase">SECURE</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Security Alerts Banner */}
      {securityAlert && (
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-300 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{securityAlert}</span>
            <button
              onClick={() => setSecurityAlert(null)}
              className="ml-auto text-amber-400 hover:text-amber-200 text-xs uppercase"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Command Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column (2/3 width on desktop): Primary Telemetry & Views */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Core Emergency Navigation Tabs */}
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
                id="tab_audit_view"
                onClick={() => {
                  setActiveTelemetryTab('audit');
                  fetchAuditRecords();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  activeTelemetryTab === 'audit'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                Security Audit Registry ({auditRecords.length})
              </button>

              {/* Admin & Optional Compliance (Secondary Layer) */}
              {isOperatorAdmin && (
                <button
                  id="tab_compliance_view"
                  onClick={() => {
                    setActiveTelemetryTab('compliance');
                    fetchCompliance();
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                    activeTelemetryTab === 'compliance'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40'
                      : 'bg-slate-900/80 text-purple-400 hover:text-purple-200 border border-purple-900/40'
                  }`}
                  title="Admin → Optional Compliance Tools → Software Licensing"
                >
                  <Scale className="w-3.5 h-3.5 text-purple-300" />
                  Admin Compliance Tools
                </button>
              )}

            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Canonical Sync v{zones[0]?.version || 1}</span>
            </div>
          </div>

          {/* Conditional Views */}
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
            <section id="pharmacy_section">
              <MedicineStockView
                zones={zones}
                onUpdateMedicineUnits={handleUpdateMedicineUnits}
              />
            </section>
          )}

          {activeTelemetryTab === 'audit' && (
            <section id="audit_section">
              <SecurityAuditView
                records={auditRecords}
                onRefresh={fetchAuditRecords}
                isLoading={isLoading}
              />
            </section>
          )}

          {activeTelemetryTab === 'compliance' && isOperatorAdmin && (
            <section id="compliance_section">
              <AdminCompliancePanel
                complianceEnabled={complianceEnabled}
                onToggleCompliance={handleToggleCompliance}
                copyrightIssues={copyrightIssues}
                onCreateIssue={handleCreateCopyrightIssue}
                onUpdateIssue={handleUpdateCopyrightIssue}
                onDeleteIssue={handleDeleteCopyrightIssue}
                onInvokeDMCA={handleInvokeDMCA}
                zones={zones}
              />
            </section>
          )}

          {/* Cross-Schema Regulation & Certification Engine */}
          <section id="verification_section">
            <VerificationEngine
              zones={zones}
              authToken={session?.token}
              onVerificationComplete={handleVerificationComplete}
              verificationReport={verificationReport}
            />
          </section>

        </div>

        {/* Right column (1/3 width on desktop): Reallocation Tool & Immutable Log Stream */}
        <div className="space-y-8">
          
          {/* Emergency Reallocation Dispatcher */}
          <section id="reallocation_section">
            <ReallocationTool
              zones={zones}
              verificationReport={verificationReport}
              onExecuteReallocation={handleExecuteReallocation}
              onAddLog={addLog}
            />
          </section>

          {/* Immutable Audit & Telemetry Log Stream */}
          <section id="logs_section">
            <SystemLogs
              logs={logs}
              onAttemptPurgeAudit={handleAttemptPurgeAudit}
              auditPurgeNotice={auditPurgeNotice}
            />
          </section>

        </div>

      </main>

      {/* Operator Clearance & Role Handover Modal */}
      <OperatorClearanceModal
        isOpen={isClearanceModalOpen}
        onClose={() => setIsClearanceModalOpen(false)}
        currentOperator={session?.operator || null}
        availableProfiles={availableProfiles}
        onSwitchOperator={handleSwitchOperator}
        isLoading={isLoading}
      />

    </motion.div>
  );
}
