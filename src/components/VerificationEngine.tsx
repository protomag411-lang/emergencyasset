import React, { useState } from 'react';
import { HealthZone, VerificationResponse, CopyrightIssue } from '../types';
import { ShieldAlert, ShieldCheck, Cpu, RefreshCw, AlertTriangle, Route, Server, FileCheck, CheckCircle2, Pill, ThermometerSnowflake, UserCheck, Scale } from 'lucide-react';

interface VerificationEngineProps {
  zones: HealthZone[];
  copyrightIssues?: CopyrightIssue[];
  onVerificationComplete: (response: VerificationResponse) => void;
  verificationReport: VerificationResponse | null;
}

export default function VerificationEngine({ zones, copyrightIssues = [], onVerificationComplete, verificationReport }: VerificationEngineProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  const steps = [
    'Connecting to medical core compliance server...',
    'Performing cross-schema table and pharmacy lot validation...',
    'Auditing DMCA §1201 medical firmware copyright & EULA permissions...',
    'Auditing DEA Schedule IV exemptions & 2-8°C cold-chain transport integrity...',
    'Synthesizing safest resource-routing coordinates via clinical agent...'
  ];

  const handleVerify = async () => {
    setLoading(true);
    
    // Aesthetic progressive step loader
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    try {
      const res = await fetch('/api/verify-schemas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zones, copyrightIssues }),
      });
      
      const data = await res.json();
      onVerificationComplete(data);
    } catch (err) {
      console.error('Failed to run verification API', err);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'regulatory':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'clinical':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'logistical':
        return <Route className="w-4 h-4 text-sky-400" />;
      case 'copyright':
        return <Scale className="w-4 h-4 text-purple-400" />;
      case 'schema':
      default:
        return <Server className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'A':
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]';
      case 'B':
        return 'text-sky-400 bg-sky-950/30 border-sky-500/30';
      case 'C':
        return 'text-amber-400 bg-amber-950/30 border-amber-500/30';
      default:
        return 'text-rose-400 bg-rose-950/30 border-rose-500/30';
    }
  };

  const rec = verificationReport?.recommendedTransfer;

  return (
    <div id="verification_engine_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-rose-500">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Cross-Schema Verification Engine</h2>
            <p className="text-xs text-slate-400 font-sans">
              Run an automated multi-layer audit to verify FDA/WHO regulations, equipment schemas, medicine availability, and DMCA copyright clearances.
            </p>
          </div>
        </div>

        <button
          id="trigger_verification_btn"
          onClick={handleVerify}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-slate-100 font-semibold text-xs transition duration-200 shadow-md hover:shadow-rose-900/20 flex items-center justify-center gap-2 border border-rose-500/20 shrink-0 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileCheck className="w-3.5 h-3.5" />
          )}
          {loading ? 'AUDITING...' : 'VERIFY SCHEMAS & REGULATIONS'}
        </button>
      </div>

      {/* Copyright & IP Audit Status Indicator */}
      {copyrightIssues && copyrightIssues.filter(i => i.status === 'active_dispute').length > 0 && (
        <div className="p-3 bg-purple-950/25 border border-purple-800/40 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-300">
            <Scale className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>{copyrightIssues.filter(i => i.status === 'active_dispute').length} Active Copyright / Firmware Conflicts:</strong> System will evaluate whether DMCA §1201 Emergency Healthcare Exemptions or OEM license covenants apply during cross-zone transfer.
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay / state */}
      {loading && (
        <div id="verification_loader" className="p-8 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col items-center justify-center space-y-4 animate-fade-in">
          <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200 tracking-wide">Evaluating Telemetry, Cold-Chain & Legal Schemas</p>
            <p className="text-xs text-rose-400 font-mono mt-1 animate-pulse">{loadingStep}</p>
          </div>
        </div>
      )}

      {/* Audit report display */}
      {!loading && verificationReport && (
        <div id="verification_report" className="space-y-6">
          
          {/* Header certification banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-4 ${verificationReport.verified ? 'bg-emerald-950/15 border-emerald-500/20' : 'bg-rose-950/15 border-rose-500/20'}`}>
            <span className="shrink-0 mt-0.5">
              {verificationReport.verified ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    {verificationReport.verified ? 'LOGISTICS & PHARMA PLAN FULLY CERTIFIED' : 'CERTIFICATION DENIED'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">System Timestamp: {verificationReport.timestamp}</p>
                </div>
                <div className={`px-3 py-1 border rounded-lg flex items-center gap-1.5 font-mono text-xs ${getRatingBadge(verificationReport.safetyRating)}`}>
                  <span>SAFETY RATING:</span>
                  <span className="font-extrabold text-sm">{verificationReport.safetyRating}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-sans font-medium">{verificationReport.analysis}</p>
            </div>
          </div>

          {/* Authorized Allocation Package Card */}
          {rec && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans">
                  Recommended Mobilization Package ({rec.sourceZoneId} ➔ CN-HEALTH-ZONE-3)
                </span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <ThermometerSnowflake className="w-3 h-3" />
                  {rec.estimatedTime}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-sans block">Ventilators</span>
                  <span className="text-sm font-bold text-rose-400">{rec.ventilatorsToMove} High-Flow Units</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-sans block">Specialized Staff</span>
                  <span className="text-sm font-bold text-cyan-400">{rec.staffToMove} Resp. Therapists</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-sans block">Medicine Bundle</span>
                  <span className="text-xs font-bold text-emerald-400 truncate block">
                    {rec.medicinesToMove && rec.medicinesToMove.length > 0 
                      ? `${rec.medicinesToMove.reduce((acc, m) => acc + m.units, 0)} Units (${rec.medicinesToMove.length} types)`
                      : 'Sedation Bundle'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Audit Rule Details Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Verification Checkpoints</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {verificationReport.rules.map((rule) => (
                <div 
                  key={rule.id} 
                  className={`p-3.5 rounded-xl border ${rule.passed ? 'bg-slate-950/40 border-slate-900' : 'bg-rose-950/10 border-rose-900/30'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-0.5">{getCategoryIcon(rule.category)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-slate-500">{rule.id}</span>
                        <span className="text-xs font-semibold text-slate-200 truncate">{rule.ruleName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.25 rounded uppercase border shrink-0 ${rule.passed ? 'text-emerald-400 bg-emerald-950/20 border-emerald-950/20' : 'text-rose-400 bg-rose-950/20 border-rose-950/20'}`}>
                          {rule.passed ? 'PASSED' : 'CONFLICT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">{rule.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Blueprint recommendation fallback reminder */}
      {!loading && !verificationReport && (
        <div className="p-8 bg-slate-950/40 border border-slate-900 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-slate-700 animate-pulse" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Awaiting Verification Audit</p>
          <p className="text-[11px] text-slate-500 max-w-sm">Please execute the Cross-Schema Verification audit above to generate a certified reallocation proposal.</p>
        </div>
      )}

    </div>
  );
}
