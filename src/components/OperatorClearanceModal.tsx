import React from 'react';
import { OperatorProfile } from '../types';
import { ShieldCheck, User, Check, X, Shield, Lock } from 'lucide-react';

interface OperatorClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOperator: OperatorProfile | null;
  availableProfiles: OperatorProfile[];
  onSwitchOperator: (operatorId: string) => void;
  isLoading: boolean;
}

export default function OperatorClearanceModal({
  isOpen,
  onClose,
  currentOperator,
  availableProfiles,
  onSwitchOperator,
  isLoading,
}: OperatorClearanceModalProps) {
  if (!isOpen) return null;

  const getRoleDescription = (role: OperatorProfile['role']) => {
    switch (role) {
      case 'DISPATCHER':
        return 'Frontline triage, inter-hospital asset discovery, ambulance/heli-transport routing, and patient volume tracking.';
      case 'CLINICAL_DIRECTOR':
        return 'Full cross-zone clinical authority, pharmaceutical ratio approvals, ICU capacity overrides, and emergency certifications.';
      case 'COMPLIANCE_ADMIN':
        return 'Administrative governance, optional software licensing matrices, EULA records, and DMCA §1201 statutory waivers.';
      case 'SECURITY_AUDITOR':
        return 'Read-only access to tamper-evident audit trails, security event analysis, and cryptographic authorization logs.';
    }
  };

  const getRoleBadgeStyle = (role: OperatorProfile['role']) => {
    switch (role) {
      case 'CLINICAL_DIRECTOR':
        return 'bg-blue-950/40 text-blue-300 border-blue-800/50';
      case 'COMPLIANCE_ADMIN':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/50';
      case 'SECURITY_AUDITOR':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
      case 'DISPATCHER':
      default:
        return 'bg-rose-950/40 text-rose-300 border-rose-800/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Operator Shift & Clearance Handover</h3>
              <p className="text-xs text-slate-500 font-sans">Role-Based Access Control (RBAC) Console Authentication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2 font-mono">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Server validates all mutations. Browser credentials are never exposed.</span>
        </div>

        {/* Profiles List */}
        <div className="space-y-3">
          <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
            Available Verified Duty Rosters:
          </span>
          {availableProfiles.map((p) => {
            const isCurrent = currentOperator?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => !isCurrent && onSwitchOperator(p.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isCurrent
                    ? 'bg-rose-950/20 border-rose-800/60 ring-1 ring-rose-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm font-sans">{p.displayName}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getRoleBadgeStyle(p.role)}`}>
                      {p.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    {getRoleDescription(p.role)}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 pt-1">
                    <span>Facility: {p.assignedFacility}</span>
                    <span>Clearance: {p.clearanceLevel}</span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="p-1 bg-rose-500/20 text-rose-400 rounded-full shrink-0">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close Dialog
          </button>
        </div>

      </div>
    </div>
  );
}
