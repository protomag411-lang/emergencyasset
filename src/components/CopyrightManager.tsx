import React, { useState } from 'react';
import { CopyrightIssue, HealthZone } from '../types';
import { COPYRIGHT_PRESET_TEMPLATES } from '../data/initialData';
import { 
  Scale, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  PlusCircle, 
  Search, 
  FileText, 
  X, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Trash2, 
  Sparkles,
  RefreshCw,
  FileWarning
} from 'lucide-react';

interface CopyrightManagerProps {
  zones: HealthZone[];
  issues: CopyrightIssue[];
  onCreateIssue: (issue: Omit<CopyrightIssue, 'id' | 'createdAt'>) => void;
  onUpdateIssue: (issueId: string, updates: Partial<CopyrightIssue>) => void;
  onDeleteIssue: (issueId: string) => void;
  onInvokeDMCA: (issueId: string) => void;
}

export default function CopyrightManager({
  zones,
  issues,
  onCreateIssue,
  onUpdateIssue,
  onDeleteIssue,
  onInvokeDMCA,
}: CopyrightManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State for New Copyright Issue
  const [newTitle, setNewTitle] = useState('');
  const [newAssetType, setNewAssetType] = useState<CopyrightIssue['assetType']>('ventilator_firmware');
  const [newFacilityId, setNewFacilityId] = useState(zones[0]?.id || 'CN-HEALTH-ZONE-4');
  const [newAssetName, setNewAssetName] = useState('');
  const [newCopyrightHolder, setNewCopyrightHolder] = useState('');
  const [newLicenseType, setNewLicenseType] = useState<CopyrightIssue['licenseType']>('Proprietary OEM EULA');
  const [newInfringementRisk, setNewInfringementRisk] = useState<CopyrightIssue['infringementRisk']>('high');
  const [newLegalStatute, setNewLegalStatute] = useState('17 U.S.C. § 1201 (DMCA Anti-Circumvention Rule)');
  const [newDmcaWaiver, setNewDmcaWaiver] = useState(true);
  const [newDescription, setNewDescription] = useState('');

  const resetForm = () => {
    setNewTitle('');
    setNewAssetType('ventilator_firmware');
    setNewFacilityId(zones[0]?.id || 'CN-HEALTH-ZONE-4');
    setNewAssetName('');
    setNewCopyrightHolder('');
    setNewLicenseType('Proprietary OEM EULA');
    setNewInfringementRisk('high');
    setNewLegalStatute('17 U.S.C. § 1201 (DMCA Anti-Circumvention Rule)');
    setNewDmcaWaiver(true);
    setNewDescription('');
  };

  const handleApplyPreset = (presetIndex: number) => {
    const preset = COPYRIGHT_PRESET_TEMPLATES[presetIndex];
    if (preset) {
      setNewTitle(preset.template.title);
      setNewAssetType(preset.template.assetType);
      setNewFacilityId(preset.template.affectedFacilityId);
      setNewAssetName(preset.template.affectedAssetName);
      setNewCopyrightHolder(preset.template.copyrightHolder);
      setNewLicenseType(preset.template.licenseType);
      setNewInfringementRisk(preset.template.infringementRisk);
      setNewLegalStatute(preset.template.legalStatute);
      setNewDmcaWaiver(preset.template.dmcaWaiverApplicable);
      setNewDescription(preset.template.description);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAssetName.trim() || !newCopyrightHolder.trim()) {
      return;
    }

    onCreateIssue({
      title: newTitle.trim(),
      assetType: newAssetType,
      affectedFacilityId: newFacilityId,
      affectedAssetName: newAssetName.trim(),
      copyrightHolder: newCopyrightHolder.trim(),
      licenseType: newLicenseType,
      infringementRisk: newInfringementRisk,
      legalStatute: newLegalStatute.trim(),
      dmcaWaiverApplicable: newDmcaWaiver,
      status: 'active_dispute',
      description: newDescription.trim() || 'Unresolved intellectual property license conflict detected during cross-schema audit.'
    });

    resetForm();
    setShowCreateModal(false);
  };

  const handleQuickCreatePreset = (presetIndex: number) => {
    const preset = COPYRIGHT_PRESET_TEMPLATES[presetIndex];
    if (preset) {
      onCreateIssue(preset.template);
    }
  };

  // Filtered issues
  const filteredIssues = issues.filter(issue => {
    const matchesStatus = selectedStatusFilter === 'all' || issue.status === selectedStatusFilter;
    const matchesRisk = selectedRiskFilter === 'all' || issue.infringementRisk === selectedRiskFilter;
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.copyrightHolder.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.affectedAssetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.legalStatute.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesRisk && matchesSearch;
  });

  // Summary counts
  const totalIssues = issues.length;
  const activeDisputes = issues.filter(i => i.status === 'active_dispute').length;
  const criticalRiskCount = issues.filter(i => i.infringementRisk === 'critical' && i.status === 'active_dispute').length;
  const dmcaExemptedCount = issues.filter(i => i.status === 'dmca_exempted').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  const getRiskBadge = (risk: CopyrightIssue['infringementRisk']) => {
    switch (risk) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL RISK
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            HIGH RISK
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Scale className="w-3 h-3" />
            MEDIUM RISK
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            LOW RISK
          </span>
        );
    }
  };

  const getStatusBadge = (status: CopyrightIssue['status']) => {
    switch (status) {
      case 'active_dispute':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/40 text-rose-400 border border-rose-800/50">
            <Lock className="w-3 h-3" />
            ACTIVE DISPUTE
          </span>
        );
      case 'dmca_exempted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-800/50">
            <Unlock className="w-3 h-3" />
            DMCA §1201 EXEMPTED
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
            <CheckCircle2 className="w-3 h-3" />
            CLEARED / RESOLVED
          </span>
        );
      case 'pending_audit':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <RefreshCw className="w-3 h-3" />
            PENDING AUDIT
          </span>
        );
    }
  };

  return (
    <div id="copyright_management_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Copyright & IP Licensing Discrepancy Manager</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-800/40 uppercase">
                Digital Rights & EULA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Auditing proprietary medical device firmware, closed-source telemetry APIs, pharmaceutical monographs, and DMCA Section 1201 exemptions.
            </p>
          </div>
        </div>

        {/* Action button to open Create modal */}
        <div className="flex items-center gap-2">
          <button
            id="open_create_copyright_modal_btn"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold text-xs transition duration-200 shadow-md hover:shadow-purple-950/30 flex items-center gap-2 cursor-pointer border border-purple-500/20 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            CREATE COPYRIGHT ISSUE
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl">
          <span className="text-slate-500 text-[10px] block font-sans uppercase">Total IP Tracked</span>
          <span className="text-base font-bold text-slate-200">{totalIssues} Assets</span>
        </div>
        <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl">
          <span className="text-slate-500 text-[10px] block font-sans uppercase">Active Disputes</span>
          <span className={`text-base font-bold ${activeDisputes > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {activeDisputes} Active
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl">
          <span className="text-slate-500 text-[10px] block font-sans uppercase">Critical Lockouts</span>
          <span className={`text-base font-bold ${criticalRiskCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
            {criticalRiskCount} Critical
          </span>
        </div>
        <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl">
          <span className="text-slate-500 text-[10px] block font-sans uppercase">DMCA §1201 Exempted</span>
          <span className="text-base font-bold text-cyan-400">{dmcaExemptedCount} / {resolvedCount} Resolved</span>
        </div>
      </div>

      {/* Quick Ingestion Presets Bar */}
      <div className="p-3.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 font-sans flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Quick Inject Simulated Copyright Conflict:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">1-Click Emergency Scenarios</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {COPYRIGHT_PRESET_TEMPLATES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickCreatePreset(idx)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-purple-300 hover:border-purple-800/60 transition cursor-pointer flex items-center gap-1.5"
              title={preset.template.description}
            >
              <PlusCircle className="w-3 h-3 text-purple-400" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Filter by Status
          </label>
          <select
            id="copyright_status_filter"
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
          >
            <option value="all">All Legal Statuses ({totalIssues})</option>
            <option value="active_dispute">Active Disputes ({activeDisputes})</option>
            <option value="dmca_exempted">DMCA §1201 Exempted ({dmcaExemptedCount})</option>
            <option value="resolved">Resolved / Cleared ({resolvedCount})</option>
            <option value="pending_audit">Pending Audit</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Filter by Risk Severity
          </label>
          <select
            id="copyright_risk_filter"
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
          >
            <option value="all">All Severity Levels</option>
            <option value="critical">Critical Risk</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Search IP / Holder / Statute
          </label>
          <div className="relative">
            <input
              id="copyright_search_input"
              type="text"
              placeholder="e.g. Firmware, DMCA, MedTech, CAD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Issues List Grid */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-850 rounded-xl text-slate-500 text-xs font-sans">
            No copyright or licensing issues match the current filter criteria.
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              id={`copyright_issue_${issue.id}`}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                issue.status === 'active_dispute'
                  ? 'bg-slate-950/80 border-rose-950/40 hover:border-rose-900/60'
                  : issue.status === 'dmca_exempted'
                  ? 'bg-slate-950/80 border-cyan-950/40 hover:border-cyan-900/60'
                  : 'bg-slate-950/60 border-slate-850 hover:border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                      {issue.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{issue.title}</h3>
                    {getRiskBadge(issue.infringementRisk)}
                    {getStatusBadge(issue.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-sans pt-0.5">
                    <span>Target: <strong className="text-slate-200">{issue.affectedAssetName}</strong></span>
                    <span>Facility: <strong className="text-slate-200">{issue.affectedFacilityId}</strong></span>
                    <span>Claimant: <strong className="text-purple-300">{issue.copyrightHolder}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onDeleteIssue(issue.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/30 transition cursor-pointer"
                    title="Dismiss and purge copyright record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description & Legal Context */}
              <div className="bg-slate-900/60 border border-slate-850/80 rounded-lg p-3 text-xs space-y-2 mb-3">
                <p className="text-slate-300 leading-relaxed font-sans">{issue.description}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-850 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-slate-500" />
                    Statutory Framework: <strong className="text-slate-300 font-normal">{issue.legalStatute}</strong>
                  </span>
                  <span className="text-slate-500">License: {issue.licenseType}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[10px] text-slate-500 font-mono">
                  Reported: {issue.createdAt}
                  {issue.resolutionAction && (
                    <span className="text-cyan-400 block mt-0.5 font-sans italic">
                      Resolution: {issue.resolutionAction}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {issue.status === 'active_dispute' && (
                    <>
                      {issue.dmcaWaiverApplicable && (
                        <button
                          id={`invoke_dmca_${issue.id}`}
                          onClick={() => onInvokeDMCA(issue.id)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer"
                          title="Apply federal 17 U.S.C. § 1201 medical emergency exemption"
                        >
                          <Unlock className="w-3 h-3 text-cyan-400" />
                          Invoke Section 1201 DMCA Waiver
                        </button>
                      )}

                      <button
                        onClick={() => onUpdateIssue(issue.id, {
                          status: 'resolved',
                          resolutionAction: 'Deployed Open Cleanroom Hardware Abstraction Layer (HAL) wrapper.'
                        })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer"
                        title="Bypass proprietary driver using open-source cleanroom driver"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Deploy Open HAL Wrapper
                      </button>
                    </>
                  )}

                  {issue.status === 'dmca_exempted' && (
                    <button
                      onClick={() => onUpdateIssue(issue.id, {
                        status: 'resolved',
                        resolutionAction: 'Licensing department negotiated emergency public health settlement.'
                      })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Mark Permanently Cleared
                    </button>
                  )}

                  {issue.status === 'resolved' && (
                    <button
                      onClick={() => onUpdateIssue(issue.id, {
                        status: 'active_dispute',
                        infringementRisk: 'critical',
                        resolutionAction: undefined
                      })}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-sans transition flex items-center gap-1.5 cursor-pointer"
                      title="Reopen dispute simulation"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Simulate Re-Lock
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal / Dialog for Creating a New Copyright Issue */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-fade-in my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950/60 border border-purple-800/40 rounded-lg text-purple-400">
                  <FileWarning className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Create Medical Equipment Copyright Issue</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Log an intellectual property, firmware DRM, or software copyright dispute across hospital assets.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Selector */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Populate from Preset Template:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COPYRIGHT_PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(idx)}
                    className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-purple-950/40 hover:text-purple-300 text-slate-300 border border-slate-800 hover:border-purple-800/50 transition cursor-pointer"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Issue Title / Dispute Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Proprietary Servo-Ventilator OS v4.2 Binary Firmware Lock"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Asset Class
                  </label>
                  <select
                    value={newAssetType}
                    onChange={(e) => setNewAssetType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ventilator_firmware">Ventilator Hardware Firmware</option>
                    <option value="telemetry_software">Telemetry API & Ingress Schema</option>
                    <option value="pharma_monograph">Pharmaceutical Dosing Database</option>
                    <option value="diagnostic_ai">Diagnostic / Dynamic Triage Algorithm</option>
                    <option value="hardware_schematic">3D CAD Replacement Part Blueprint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Affected Facility
                  </label>
                  <select
                    value={newFacilityId}
                    onChange={(e) => setNewFacilityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                    <option value="CN-HEALTH-CORE">CN-HEALTH-CORE (Regional Backbone)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Target Equipment / Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6x Turbine High-Flow Ventilators (Model EV-800)"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Copyright Holder / Licensor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MedTech RespiCare OEM Corp."
                    value={newCopyrightHolder}
                    onChange={(e) => setNewCopyrightHolder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    License Instrument
                  </label>
                  <select
                    value={newLicenseType}
                    onChange={(e) => setNewLicenseType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Proprietary OEM EULA">Proprietary OEM EULA</option>
                    <option value="Closed-Source Commercial">Closed-Source Commercial License</option>
                    <option value="Proprietary Telemetry Protocol">Proprietary Telemetry Protocol</option>
                    <option value="Patented Software Algorithm">Patented Software Algorithm</option>
                    <option value="Hardware CAD Schematic">Hardware CAD Schematic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    Infringement Risk Severity
                  </label>
                  <select
                    value={newInfringementRisk}
                    onChange={(e) => setNewInfringementRisk(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="critical">Critical (Device remote lockout / Injunction)</option>
                    <option value="high">High (Substantial statutory damages risk)</option>
                    <option value="medium">Medium (Audit flag / Non-critical)</option>
                    <option value="low">Low (Technical advisory)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Governing Legal Statute
                </label>
                <input
                  type="text"
                  placeholder="e.g. 17 U.S.C. § 1201 (DMCA Anti-Circumvention Rule)"
                  value={newLegalStatute}
                  onChange={(e) => setNewLegalStatute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Conflict Description & Restrictive Clauses
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe why transferring or executing this device software or database breaches vendor copyright terms..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dmca_checkbox"
                  checked={newDmcaWaiver}
                  onChange={(e) => setNewDmcaWaiver(e.target.checked)}
                  className="accent-purple-500 rounded cursor-pointer"
                />
                <label htmlFor="dmca_checkbox" className="text-slate-300 font-sans cursor-pointer">
                  Eligible for US Copyright Office 17 U.S.C. § 1201 Emergency Medical Device Exemption
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer transition shadow-lg shadow-purple-950/40"
                >
                  Create & Inject Copyright Issue
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
