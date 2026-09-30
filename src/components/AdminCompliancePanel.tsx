import React, { useState } from 'react';
import { CopyrightIssue, HealthZone } from '../types';
import CopyrightManager from './CopyrightManager';
import { ShieldAlert, ShieldCheck, Scale, ToggleLeft, ToggleRight, AlertCircle, Info, Lock } from 'lucide-react';

interface AdminCompliancePanelProps {
  complianceEnabled: boolean;
  onToggleCompliance: (enabled: boolean) => void;
  copyrightIssues: CopyrightIssue[];
  onCreateIssue: (issue: Omit<CopyrightIssue, 'id' | 'createdAt'>) => void;
  onUpdateIssue: (id: string, updates: Partial<CopyrightIssue>) => void;
  onDeleteIssue: (id: string) => void;
  onInvokeDMCA: (id: string) => void;
  zones: HealthZone[];
}

export default function AdminCompliancePanel({
  complianceEnabled,
  onToggleCompliance,
  copyrightIssues,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue,
  onInvokeDMCA,
  zones,
}: AdminCompliancePanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'licensing'>('overview');

  return (
    <div id="admin_compliance_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Admin & Optional Compliance Governance</h2>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/50 border border-purple-800/60 px-2 py-0.5 rounded">
                Secondary Layer
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Admin → Optional Compliance Tools → Software Licensing & EULA Records
            </p>
          </div>
        </div>

        {/* Feature Flag Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Module Status</span>
            <span className={`text-xs font-bold ${complianceEnabled ? 'text-purple-400' : 'text-slate-400'}`}>
              {complianceEnabled ? 'ENABLED (Flag: true)' : 'DISABLED (Flag: false)'}
            </span>
          </div>
          <button
            onClick={() => onToggleCompliance(!complianceEnabled)}
            className="text-purple-400 hover:text-purple-300 transition cursor-pointer"
            title="Toggle ENABLE_LICENSE_COMPLIANCE flag"
          >
            {complianceEnabled ? (
              <ToggleRight className="w-8 h-8 text-purple-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Governance Notice */}
      <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl flex items-start gap-3 text-xs text-purple-300">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">Decoupled Architecture Verification:</p>
          <p className="text-slate-400 leading-relaxed font-sans">
            The Licensing Discrepancy Manager operates strictly as an optional supporting compliance service. It does not interfere with, delay, or block emergency asset discovery, inter-hospital transfers, or ICU medication routing. Ordinary emergency responders never see or navigate licensing workflows.
          </p>
        </div>
      </div>

      {!complianceEnabled ? (
        <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
          <Lock className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Compliance & Digital Rights Service Inactive</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
            The feature flag <code className="text-slate-400 font-mono">ENABLE_LICENSE_COMPLIANCE</code> is currently set to <code className="text-slate-400 font-mono">false</code>. The core emergency console operates with zero dependency on vendor EULA matrices. Toggle the switch above to activate compliance auditing.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-purple-950/60 text-purple-200 border border-purple-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compliance Overview
            </button>
            <button
              onClick={() => setActiveSubTab('licensing')}
              className={`px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                activeSubTab === 'licensing'
                  ? 'bg-purple-950/60 text-purple-200 border border-purple-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Software Licensing & EULA Matrix ({copyrightIssues.length})
            </button>
          </div>

          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Managed EULAs</span>
                <span className="text-2xl font-black text-slate-200">{copyrightIssues.length}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Medical Device Firmware & Telemetry</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Disputes</span>
                <span className="text-2xl font-black text-amber-400">
                  {copyrightIssues.filter((i) => i.status === 'active_dispute').length}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Under statutory review</span>
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">DMCA §1201 Exemptions</span>
                <span className="text-2xl font-black text-emerald-400">
                  {copyrightIssues.filter((i) => i.status === 'dmca_exempted').length}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Life-Safety Waivers Invoked</span>
              </div>
            </div>
          )}

          {activeSubTab === 'licensing' && (
            <CopyrightManager
              issues={copyrightIssues}
              onCreateIssue={onCreateIssue}
              onUpdateIssue={onUpdateIssue}
              onDeleteIssue={onDeleteIssue}
              onInvokeDMCA={onInvokeDMCA}
              zones={zones}
            />
          )}
        </div>
      )}
    </div>
  );
}
