import React, { useState } from 'react';
import { SecurityAuditRecord, UserRole } from '../types';
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck, Lock, Search, RefreshCw, Key } from 'lucide-react';

interface SecurityAuditViewProps {
  records: SecurityAuditRecord[];
  onRefresh: () => void;
  isLoading: boolean;
}

export default function SecurityAuditView({ records, onRefresh, isLoading }: SecurityAuditViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.resourceId && r.resourceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || r.actorRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: SecurityAuditRecord['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            SUCCESS
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            DENIED (403)
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-2 py-0.5 rounded-full">
            <ShieldAlert className="w-3 h-3" />
            FAILED
          </span>
        );
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'CLINICAL_DIRECTOR':
        return 'bg-blue-950/40 text-blue-300 border-blue-800/50';
      case 'COMPLIANCE_ADMIN':
        return 'bg-purple-950/40 text-purple-300 border-purple-800/50';
      case 'SECURITY_AUDITOR':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
      case 'DISPATCHER':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div id="security_audit_view" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Security Audit Log Registry</h2>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded">
                <Lock className="w-3 h-3" />
                Immutable Trail
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Append-only security log recording authenticated actors, sensitive asset allocations, and authorization outcomes.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition border border-slate-700 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, operator, asset ID, or details..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="DISPATCHER">Dispatcher</option>
            <option value="CLINICAL_DIRECTOR">Clinical Director</option>
            <option value="COMPLIANCE_ADMIN">Compliance Admin</option>
            <option value="SECURITY_AUDITOR">Security Auditor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied (403)</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Authenticated Actor</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Target Resource</th>
              <th className="py-2.5 px-3">Outcome</th>
              <th className="py-2.5 px-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                  No security audit records match the current filters.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                    {new Date(r.timestamp).toLocaleTimeString([], { hour12: false })}
                    <span className="text-slate-600 block text-[9px]">{new Date(r.timestamp).toISOString().split('T')[0]}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-sans font-semibold text-slate-200">{r.actorName}</div>
                    <span className={`inline-block mt-0.5 text-[9px] font-mono border px-1.5 py-0.25 rounded ${getRoleBadge(r.actorRole)}`}>
                      {r.actorRole}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-slate-200 font-bold">{r.action}</span>
                    {r.resourceType && (
                      <span className="block text-[9px] text-slate-500">{r.resourceType}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                    {r.resourceId || '—'}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {getStatusBadge(r.status)}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-400 max-w-xs break-words text-[11px] leading-relaxed">
                    {r.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cryptographic Token Verification • RBAC Authorization Boundary Enforced</span>
        </div>
        <span>{records.length} Audit Records Ingested</span>
      </div>
    </div>
  );
}
