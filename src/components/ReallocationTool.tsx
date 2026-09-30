import React, { useState, useEffect } from 'react';
import { VerificationResponse, HealthZone, RecommendedMedicineTransfer } from '../types';
import { Truck, Navigation, CheckCircle, HelpCircle, UserPlus, RefreshCw, Send, ArrowRight, Pill, ThermometerSnowflake } from 'lucide-react';

interface ReallocationToolProps {
  zones: HealthZone[];
  verificationReport: VerificationResponse | null;
  onExecuteReallocation: (
    sourceZoneId: string, 
    ventilatorsMoved: number, 
    staffMoved: number,
    medicinesMoved: RecommendedMedicineTransfer[]
  ) => void;
  onAddLog: (message: string, type: 'critical' | 'warning' | 'info' | 'success', facilityId?: string) => void;
}

export default function ReallocationTool({ zones, verificationReport, onExecuteReallocation, onAddLog }: ReallocationToolProps) {
  const [ventilatorCount, setVentilatorCount] = useState<number>(0);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [medicineTransfers, setMedicineTransfers] = useState<RecommendedMedicineTransfer[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simProgress, setSimProgress] = useState<number>(0);

  const recommendation = verificationReport?.recommendedTransfer;
  const sourceZone = zones.find(z => z.id === recommendation?.sourceZoneId);

  // Keep state updated with suggestions
  useEffect(() => {
    if (recommendation) {
      setVentilatorCount(recommendation.ventilatorsToMove);
      setStaffCount(recommendation.staffToMove);
      if (recommendation.medicinesToMove && recommendation.medicinesToMove.length > 0) {
        setMedicineTransfers(recommendation.medicinesToMove);
      } else {
        // Default recommended bundle if not specified by AI
        setMedicineTransfers([
          { medicineId: 'med-propofol', name: 'Propofol IV (20mg/mL 50mL)', units: 50, unitMeasurement: 'vials' },
          { medicineId: 'med-rocuronium', name: 'Rocuronium Bromide (50mg/5mL)', units: 30, unitMeasurement: 'vials' },
          { medicineId: 'med-rsi-kit', name: 'Emergency RSI Intubation Kits', units: 8, unitMeasurement: 'kits' }
        ]);
      }
    }
  }, [recommendation]);

  const maxVentilators = sourceZone ? sourceZone.ventilators.available : 0;
  const maxStaff = sourceZone ? sourceZone.staff.respiratoryTherapists : 0;

  const simulationSteps = [
    { label: 'Sterilizing & Packaging hardware profiles', desc: 'Prepping ventilators in sealed sterile pressure cases' },
    { label: 'Cold-Chain Pharma Verification (2°C - 8°C)', desc: 'Validating temperature telemetry and tamper-evident narcotic seals' },
    { label: 'Loading cargo & Dispatching ground-link transport', desc: 'Secure medical transport carrier moving to regional heli-link' },
    { label: 'Emergency flight in-transit', desc: 'Priority clinical helicopter route actively tracked with priority air clearance' },
    { label: 'Arrived & Synchronizing hospital schemas', desc: 'Verifying hardware serials and pharmaceutical NDC lot numbers at CN-HEALTH-ZONE-3' },
    { label: 'Telemetry updated & certified', desc: 'Reallocation process completed and stock buffers restored successfully!' }
  ];

  const handleMedicineQuantityChange = (medicineId: string, units: number) => {
    setMedicineTransfers(prev => prev.map(m => m.medicineId === medicineId ? { ...m, units: Math.max(0, units) } : m));
  };

  const handleDispatch = () => {
    if (!sourceZone || ventilatorCount <= 0) return;
    
    setIsSimulating(true);
    setSimStep(0);
    setSimProgress(0);
    
    const medSummary = medicineTransfers.map(m => `${m.units} ${m.unitMeasurement} ${m.name}`).join(', ');
    onAddLog(
      `ALERT: Initiating resource reallocation. Dispatched ${ventilatorCount} ventilators, ${staffCount} respiratory therapists, and medicine package (${medSummary}) from ${sourceZone.name} to CN-HEALTH-ZONE-3.`,
      'info',
      sourceZone.id
    );
  };

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 3.5;
        if (next >= 100) {
          clearInterval(interval);
          // Complete simulation
          setTimeout(() => {
            setIsSimulating(false);
            onExecuteReallocation(sourceZone!.id, ventilatorCount, staffCount, medicineTransfers);
            onAddLog(
              `SUCCESS: Reallocation complete. ${ventilatorCount} ventilators, ${staffCount} staff, and critical sedation/paralytic medicine supplies safely received at CN-HEALTH-ZONE-3. Regional schemas and pharmacy inventories synchronized.`,
              'success',
              'CN-HEALTH-ZONE-3'
            );
          }, 500);
          return 100;
        }
        
        // Advance steps periodically
        const currentStepIndex = Math.floor((next / 100) * simulationSteps.length);
        if (currentStepIndex !== simStep && currentStepIndex < simulationSteps.length) {
          setSimStep(currentStepIndex);
          onAddLog(
            `DISPATCH STEP: ${simulationSteps[currentStepIndex].label}...`,
            'info',
            'CN-HEALTH-CORE'
          );
        }
        
        return next;
      });
    }, 170);

    return () => clearInterval(interval);
  }, [isSimulating, simStep, ventilatorCount, staffCount, medicineTransfers, sourceZone]);

  if (!verificationReport) {
    return (
      <div id="reallocation_control_panel_standby" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Inter-Hospital Reallocation Dispatch</h2>
            <p className="text-xs text-slate-400 font-sans">
              Awaiting regulatory, pharmaceutical, and cross-schema certification.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>DISPATCH LOCK: Pre-transfer clinical certification required</span>
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            Execute the <strong>Cross-Schema Verification Engine</strong> to audit clinical equipment ratios, schedule IV controlled sedatives, and cold-chain transport parameters. Once certified, the dispatch controls will automatically unlock.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="reallocation_control_panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Blueprint summary */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-rose-500">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Immediate Reallocation & Dispatch Tool</h2>
          <p className="text-xs text-slate-400 font-sans">
            Deploy certified clinical hardware, specialized respiratory staff, and critical sedation pharmaceuticals to CN-HEALTH-ZONE-3.
          </p>
        </div>
      </div>

      {!isSimulating ? (
        <div className="space-y-5">
          
          {/* Dispatch form / source and target indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 bg-slate-950/60 p-4 border border-slate-850 rounded-xl font-mono text-xs">
            <div className="text-center md:text-left">
              <span className="text-slate-500 uppercase font-sans tracking-widest font-semibold">Source Area</span>
              <p className="text-sm font-bold text-slate-200 mt-1 truncate">{sourceZone?.name || 'N/A'}</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">{sourceZone?.ventilators.available || 0} units available • Surplus Pharmacy</p>
            </div>
            
            <div className="flex flex-col items-center justify-center text-slate-600 font-sans py-2">
              <ArrowRight className="w-5 h-5 text-rose-500 hidden md:block" />
              <span className="font-mono text-[10px] text-rose-500/80 bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded-full mt-1">COLD-CHAIN AIR CORRIDOR</span>
            </div>

            <div className="text-center md:text-right">
              <span className="text-slate-500 uppercase font-sans tracking-widest font-semibold">Target Area</span>
              <p className="text-sm font-bold text-slate-200 mt-1">CN Health Zone 3</p>
              <p className="text-[10px] text-rose-400 mt-0.5">Ventilators: 94% • Sedatives: Critical Shortage</p>
            </div>
          </div>

          {/* Rationale overview */}
          {recommendation && (
            <div className="p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-400 font-sans uppercase tracking-wider">Audit Proposal & Clinical Rationale</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{recommendation.rationale}</p>
              <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500">
                <span>ESTIMATED COLD-CHAIN FLIGHT DURATION:</span>
                <span className="text-rose-400 font-bold">{recommendation.estimatedTime}</span>
              </div>
            </div>
          )}

          {/* Transfer controls: Ventilators & Staff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Adjust Ventilators */}
            <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 font-sans">Move Mechanical Ventilators</span>
                <span className="font-mono text-[10px] text-slate-500">Max Available: {maxVentilators}</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  id="ventilator_range_input"
                  type="range" 
                  min="1" 
                  max={maxVentilators || 1} 
                  value={ventilatorCount} 
                  onChange={(e) => setVentilatorCount(parseInt(e.target.value) || 0)}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-rose-400 w-12 text-right">
                  {ventilatorCount}
                </span>
              </div>
            </div>

            {/* Adjust Staff */}
            <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 font-sans flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  Move Respiratory Therapists
                </span>
                <span className="font-mono text-[10px] text-slate-500">Max: {maxStaff}</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  id="staff_range_input"
                  type="range" 
                  min="0" 
                  max={maxStaff || 1} 
                  value={staffCount} 
                  onChange={(e) => setStaffCount(parseInt(e.target.value) || 0)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-sm font-bold text-cyan-400 w-12 text-right">
                  {staffCount}
                </span>
              </div>
            </div>

          </div>

          {/* Medicine Package Allocation */}
          <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 font-sans">Critical Care Medicine Reallocation Bundle</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <ThermometerSnowflake className="w-3 h-3" />
                Cold-Chain Verified (2°C - 8°C)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {medicineTransfers.map((med) => (
                <div key={med.medicineId} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-slate-200 text-xs truncate block">{med.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">Transfer Units:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={med.units}
                      onChange={(e) => handleMedicineQuantityChange(med.medicineId, parseInt(e.target.value) || 0)}
                      className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-400 font-mono text-right focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger button */}
          <button
            id="execute_dispatch_btn"
            onClick={handleDispatch}
            disabled={ventilatorCount <= 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:from-slate-800 disabled:to-slate-800 text-slate-100 font-bold text-sm tracking-wide transition duration-200 shadow-lg hover:shadow-rose-900/35 flex items-center justify-center gap-2 border border-rose-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            INITIATE EMERGENCY REALLOCATION DISPATCH
          </button>

        </div>
      ) : (
        /* Immersive Active dispatch tracking simulator */
        <div id="reallocation_simulator" className="p-6 bg-slate-950/60 border border-slate-850 rounded-xl space-y-6 animate-fade-in">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-5 h-5 text-rose-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-slate-200 text-sm">Priority Clinical & Cold-Chain Transit Underway</h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">Tracking route: {sourceZone?.id} ➔ CN-HEALTH-ZONE-3</p>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-rose-400">{Math.round(simProgress)}%</span>
          </div>

          {/* Custom tracking layout */}
          <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500 transition-all duration-300 ease-out"
              style={{ width: `${simProgress}%` }}
            />
          </div>

          {/* Step progression map list */}
          <div className="grid grid-cols-1 gap-2.5 text-xs">
            {simulationSteps.map((step, idx) => {
              const isActive = idx === simStep;
              const isPast = idx < simStep;
              
              return (
                <div 
                  key={idx}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-rose-950/20 border border-rose-900/50 scale-[1.01]' : 'border border-transparent'}`}
                >
                  <span className="mt-0.5 shrink-0">
                    {isPast ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : isActive ? (
                      <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-slate-700" />
                    )}
                  </span>
                  <div>
                    <span className={`font-semibold tracking-wide ${isActive ? 'text-slate-100' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.label}
                    </span>
                    <p className={`text-[11px] mt-0.5 ${isActive ? 'text-rose-400 font-mono' : 'text-slate-500 font-sans'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
