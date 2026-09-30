import React, { useState } from 'react';
import { HealthZone, ZoneStatus, MedicineItem } from '../types';
import { Activity, ShieldAlert, BadgePlus, AlertTriangle, Plus, Minus, Stethoscope, Pill, ChevronDown, ChevronUp, ThermometerSnowflake } from 'lucide-react';

interface FacilitiesOverviewProps {
  zones: HealthZone[];
  onUpdateZoneVentilators: (zoneId: string, delta: number) => void;
  onUpdateMedicineUnits: (zoneId: string, medicineId: string, delta: number) => void;
}

export default function FacilitiesOverview({ zones, onUpdateZoneVentilators, onUpdateMedicineUnits }: FacilitiesOverviewProps) {
  const [expandedZoneMedicines, setExpandedZoneMedicines] = useState<Record<string, boolean>>({});

  const toggleZoneMedicines = (zoneId: string) => {
    setExpandedZoneMedicines(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const getStatusBadge = (status: ZoneStatus) => {
    switch (status) {
      case 'critical_overload':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            CRITICAL OVERLOAD
          </span>
        );
      case 'moderate_load':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            MODERATE LOAD
          </span>
        );
      case 'surplus':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <BadgePlus className="w-3.5 h-3.5" />
            HEALTHY SURPLUS
          </span>
        );
      case 'optimal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Activity className="w-3.5 h-3.5" />
            OPTIMAL STATUS
          </span>
        );
    }
  };

  const getMeterColor = (rate: number) => {
    if (rate >= 90) return 'bg-gradient-to-r from-rose-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    if (rate >= 75) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (rate >= 50) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    return 'bg-gradient-to-r from-emerald-500 to-teal-500';
  };

  const getCardStyle = (status: ZoneStatus) => {
    if (status === 'critical_overload') {
      return 'border-rose-900/50 bg-slate-950 shadow-[0_0_24px_rgba(244,63,94,0.06)]';
    }
    return 'border-slate-800 bg-slate-900/40 hover:border-slate-700/80 hover:bg-slate-900/60';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">Regional Facility & Pharmacy Telemetry</h2>
        <p className="text-xs text-slate-400">
          Live monitoring across clinical sectors. Track hardware capacity, clinician staffing, and critical care medicine stock availability.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {zones.map((zone) => {
          const vRate = zone.utilizationRate;
          const criticalMeds = zone.medicineStock.filter(m => m.status === 'critical_shortage');
          const lowMeds = zone.medicineStock.filter(m => m.status === 'low_stock');
          const isExpanded = !!expandedZoneMedicines[zone.id];

          return (
            <div 
              key={zone.id} 
              id={`facility_card_${zone.id}`}
              className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${getCardStyle(zone.status)}`}
            >
              <div>
                {/* Card Title & Status Badge */}
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-100 text-base">{zone.name}</h3>
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">{zone.id} • Lat: {zone.location.lat} Lng: {zone.location.lng}</span>
                  </div>
                  {getStatusBadge(zone.status)}
                </div>

                {/* Main Progress Meter */}
                <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 font-sans">Ventilator Utilization</span>
                    <span className={`font-mono text-sm font-black ${vRate >= 90 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {vRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3.5 overflow-hidden p-[2px] border border-slate-800/80">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ease-out ${getMeterColor(vRate)}`}
                      style={{ width: `${Math.min(vRate, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
                    <span>{zone.ventilators.inUse} In-Use</span>
                    <span>{zone.ventilators.total} Total Units</span>
                    <span>{zone.ventilators.available} Available</span>
                  </div>
                </div>

                {/* Sub-resource breakdown */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* ICU Bed Breakdown */}
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900/60">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1.5 uppercase font-sans">ICU Bed Loading</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-sm font-bold text-slate-200">{zone.icuBeds.inUse}</span>
                      <span className="text-slate-600 text-xs">/</span>
                      <span className="font-mono text-xs text-slate-400">{zone.icuBeds.total}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans block mt-1">{zone.icuBeds.available} free beds</span>
                  </div>

                  {/* Clinician Staffing */}
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900/60">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider block mb-1.5 uppercase font-sans flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-cyan-400" />
                      Staff Ratios
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span className="font-sans text-[10px]">Resp. Therapists:</span>
                        <span className="font-mono font-bold text-slate-200">{zone.staff.respiratoryTherapists}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span className="font-sans text-[10px]">ICU Nurses:</span>
                        <span className="font-mono font-bold text-slate-200">{zone.staff.criticalCareNurses}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medicine Stock Availability Pill / Summary Bar */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill className={`w-4 h-4 ${criticalMeds.length > 0 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
                      <span className="text-xs font-bold text-slate-200 font-sans">ICU Medicine Stock Availability</span>
                    </div>
                    <button
                      id={`toggle_medicines_${zone.id}`}
                      onClick={() => toggleZoneMedicines(zone.id)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? 'Hide Details' : 'View Stock'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* High level status pill */}
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono">
                    {criticalMeds.length > 0 ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {criticalMeds.length} Critical Shortage ({criticalMeds.map(m => m.name.split(' ')[0]).join(', ')})
                      </span>
                    ) : lowMeds.length > 0 ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {lowMeds.length} Low Stock Classes
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        All 5 Critical Medicine Classes Adequate
                      </span>
                    )}

                    <span className="text-slate-500 text-[10px]">
                      {zone.medicineStock.reduce((acc, m) => acc + m.currentUnits, 0)} total units
                    </span>
                  </div>

                  {/* Expanded Medicine Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-900 space-y-2">
                      {zone.medicineStock.map((med) => (
                        <div 
                          key={med.id}
                          className="flex items-center justify-between text-xs bg-slate-900/50 p-2 rounded border border-slate-850"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-200 block truncate">{med.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Threshold: {med.minSafeThreshold} | Batch: {med.batchCode}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-mono text-xs font-bold ${
                              med.status === 'critical_shortage' ? 'text-rose-400' :
                              med.status === 'low_stock' ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {med.currentUnits} {med.unitMeasurement}
                            </span>

                            {/* Quick adjust buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => onUpdateMedicineUnits(zone.id, med.id, -5)}
                                disabled={med.currentUnits <= 0}
                                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-20"
                                title="Dispense 5 units"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => onUpdateMedicineUnits(zone.id, med.id, 5)}
                                disabled={med.currentUnits >= med.totalCapacity}
                                className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 disabled:opacity-20"
                                title="Add 5 units"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hardware Type Schema Detail */}
                <div className="bg-slate-950/20 px-3 py-2 rounded-lg border border-slate-900 text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-slate-500 uppercase tracking-widest font-sans font-bold">Hardware Classes:</span>
                  <div className="flex gap-3">
                    <span>HighFlow: <strong className="text-slate-300 font-bold">{zone.ventilators.highFlow}</strong></span>
                    <span>Pediatric: <strong className="text-slate-300 font-bold">{zone.ventilators.pediatric}</strong></span>
                    <span>Transport: <strong className="text-slate-300 font-bold">{zone.ventilators.transport}</strong></span>
                  </div>
                </div>
              </div>

              {/* Simulation Adjustments */}
              <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between gap-4">
                <span className="text-[10px] text-slate-500 font-sans italic">Simulate ventilator patient triage:</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    id={`decrement_ventilators_${zone.id}`}
                    onClick={() => onUpdateZoneVentilators(zone.id, -1)}
                    disabled={zone.ventilators.inUse <= 0}
                    className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Simulate discharging a critical patient (reduces ventilator use)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-xs font-bold text-slate-300 px-2 min-w-[24px] text-center">
                    {zone.ventilators.inUse}
                  </span>
                  <button 
                    id={`increment_ventilators_${zone.id}`}
                    onClick={() => onUpdateZoneVentilators(zone.id, 1)}
                    disabled={zone.ventilators.inUse >= zone.ventilators.total}
                    className="p-1.5 rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Simulate triaging a new respiratory patient (increases ventilator use)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
