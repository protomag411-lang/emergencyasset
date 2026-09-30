import React, { useState } from 'react';
import { HealthZone, MedicineItem, MedicineStatus } from '../types';
import { Pill, ThermometerSnowflake, ShieldAlert, AlertTriangle, CheckCircle2, BadgePlus, Plus, Minus, Search, ShieldCheck } from 'lucide-react';

interface MedicineStockViewProps {
  zones: HealthZone[];
  onUpdateMedicineUnits: (zoneId: string, medicineId: string, delta: number) => void;
}

export default function MedicineStockView({ zones, onUpdateMedicineUnits }: MedicineStockViewProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getStatusBadge = (status: MedicineStatus) => {
    switch (status) {
      case 'critical_shortage':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL SHORTAGE
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            LOW STOCK
          </span>
        );
      case 'surplus':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <BadgePlus className="w-3 h-3" />
            SURPLUS
          </span>
        );
      case 'adequate':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            ADEQUATE
          </span>
        );
    }
  };

  const getStockMeterColor = (status: MedicineStatus) => {
    switch (status) {
      case 'critical_shortage':
        return 'bg-gradient-to-r from-rose-600 to-red-500';
      case 'low_stock':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'surplus':
        return 'bg-gradient-to-r from-sky-500 to-cyan-400';
      case 'adequate':
      default:
        return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    }
  };

  const filteredZones = selectedZoneId === 'all' 
    ? zones 
    : zones.filter(z => z.id === selectedZoneId);

  // Flattened medicine list with zone association for searching/filtering
  const allFilteredMedicines = filteredZones.flatMap(zone => 
    zone.medicineStock.map(med => ({
      ...med,
      zoneId: zone.id,
      zoneName: zone.name
    }))
  ).filter(med => {
    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          med.batchCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          med.indication.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate summary counts
  const totalItems = zones.flatMap(z => z.medicineStock).length;
  const criticalCount = zones.flatMap(z => z.medicineStock).filter(m => m.status === 'critical_shortage').length;
  const lowCount = zones.flatMap(z => z.medicineStock).filter(m => m.status === 'low_stock').length;

  return (
    <div id="medicine_stock_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Critical Care Medicine Stock Availability</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 uppercase">
                Live Pharmacy Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Monitoring sedation, paralytics, and vasopressor reserves vital for sustaining ventilated patient loads.
            </p>
          </div>
        </div>

        {/* Global medicine alerts counter */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/20 border border-rose-900/40 flex items-center gap-2">
            <ShieldAlert className={`w-3.5 h-3.5 ${criticalCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-slate-400">Critical Shortages:</span>
            <span className={`font-bold ${criticalCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{criticalCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/20 border border-amber-900/40 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-400">Low Stock:</span>
            <span className="font-bold text-amber-400">{lowCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Zone Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Filter by Facility
          </label>
          <select
            id="medicine_zone_filter"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
          >
            <option value="all">All Regional Health Zones ({zones.length})</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.status.replace('_', ' ').toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Medication Class
          </label>
          <select
            id="medicine_category_filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
          >
            <option value="all">All Classes</option>
            <option value="sedatives">Sedatives & Hypnotics (Propofol)</option>
            <option value="paralytics">Neuromuscular Blockers (Rocuronium)</option>
            <option value="vasopressors">Vasopressors (Norepinephrine)</option>
            <option value="bronchodilators">Bronchodilators (Albuterol)</option>
            <option value="emergency_kits">Emergency Airway & RSI Kits</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Search Drug / Batch / Indication
          </label>
          <div className="relative">
            <input
              id="medicine_search_input"
              type="text"
              placeholder="e.g. Propofol, Cold-Chain, LOT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

      </div>

      {/* Medication Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allFilteredMedicines.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-slate-950/40 border border-slate-850 rounded-xl text-slate-500 text-xs font-sans">
            No pharmaceutical stock items found matching your current filter criteria.
          </div>
        ) : (
          allFilteredMedicines.map((med) => {
            const fillPct = Math.round((med.currentUnits / med.totalCapacity) * 100);
            return (
              <div 
                key={`${med.zoneId}-${med.id}`}
                id={`medicine_card_${med.zoneId}_${med.id}`}
                className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 transition duration-200 hover:border-slate-700/80 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Name & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-100 text-sm truncate">{med.name}</h4>
                        {med.controlledSchedule && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 bg-purple-950/40 text-purple-400 border border-purple-800/40 rounded">
                            {med.controlledSchedule}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">{med.genericName}</p>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        Facility: <strong className="text-slate-300 font-semibold">{med.zoneId}</strong>
                      </span>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(med.status)}
                    </div>
                  </div>

                  {/* Indication Note */}
                  <p className="text-[11px] text-slate-400/90 font-sans italic bg-slate-900/40 p-2 rounded-lg border border-slate-900 mb-3">
                    {med.indication}
                  </p>

                  {/* Stock Level Meter */}
                  <div className="bg-slate-900/80 border border-slate-850 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                      <span className="text-slate-400 text-[11px] font-sans">Stock Buffer:</span>
                      <span className="font-bold text-slate-200">
                        {med.currentUnits} / {med.totalCapacity} {med.unitMeasurement} ({fillPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-[1px] border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${getStockMeterColor(med.status)}`}
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5">
                      <span>Min Safe Buffer: {med.minSafeThreshold} {med.unitMeasurement}</span>
                      <span>Batch: {med.batchCode}</span>
                    </div>
                  </div>

                  {/* Cold chain & storage spec */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-3">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <ThermometerSnowflake className="w-3 h-3" />
                      {med.temperatureRequirement}
                    </span>
                    <span className="text-slate-500">NDC Verified</span>
                  </div>
                </div>

                {/* Simulation Adjustment Controls */}
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-sans">Simulate stock intake / draw:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`dec_medicine_${med.zoneId}_${med.id}`}
                      onClick={() => onUpdateMedicineUnits(med.zoneId, med.id, -5)}
                      disabled={med.currentUnits <= 0}
                      className="p-1.5 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Simulate clinical draw (-5 units)"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold text-slate-300 px-1.5 min-w-[32px] text-center">
                      {med.currentUnits}
                    </span>
                    <button
                      id={`inc_medicine_${med.zoneId}_${med.id}`}
                      onClick={() => onUpdateMedicineUnits(med.zoneId, med.id, 5)}
                      disabled={med.currentUnits >= med.totalCapacity}
                      className="p-1.5 rounded bg-slate-900 border border-slate-850 text-slate-400 hover:text-cyan-400 hover:border-cyan-800/40 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Simulate pharmacy restock (+5 units)"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
