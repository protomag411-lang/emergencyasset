import React, { useState, useEffect } from 'react';
import {
  HealthZone,
  EmergencyResourceType,
  HospitalBoardRequest,
  TransferabilityAssessment,
  InAppNotification,
  MedicineItem,
} from '../types';
import {
  DEMO_REGIONS,
  EMERGENCY_RESOURCE_METADATA,
  calculateTransferability,
} from '../data/initialData';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Building2,
  Clock,
  Send,
  Check,
  X,
  ChevronRight,
  Shield,
  Activity,
  ArrowRight,
  HelpCircle,
  MapPin,
  Flame,
  Radio,
  Bell,
  BellRing,
  UserCheck,
  RefreshCw,
  Package,
  ArrowLeftRight,
  CheckCheck,
  Eye,
  Layers,
  Sparkles,
} from 'lucide-react';

interface UnifiedEmergencyResourceCoordinatorProps {
  zones: HealthZone[];
  boardRequests: HospitalBoardRequest[];
  onCreateBoardRequest: (req: Omit<HospitalBoardRequest, 'id' | 'timestamp' | 'status'>) => void;
  onApproveBoardRequest: (id: string, approverName?: string) => void;
  onRejectBoardRequest: (id: string, reason?: string) => void;
  onUpdateBoardRequestStatus: (id: string, status: HospitalBoardRequest['status']) => void;
}

export default function UnifiedEmergencyResourceCoordinator({
  zones,
  boardRequests,
  onCreateBoardRequest,
  onApproveBoardRequest,
  onRejectBoardRequest,
  onUpdateBoardRequestStatus,
}: UnifiedEmergencyResourceCoordinatorProps) {
  // -------------------------------------------------------------
  // DEMO ROLE & VIEW SWITCHING
  // -------------------------------------------------------------
  const [demoRole, setDemoRole] = useState<'requesting_hospital' | 'hospital_board'>('requesting_hospital');

  // Resource & Filter state
  const [selectedResourceType, setSelectedResourceType] = useState<EmergencyResourceType>('oxygen_cylinder');
  const [selectedRegion, setSelectedRegion] = useState<string>('Kolkata, West Bengal');
  const [transferScope, setTransferScope] = useState<'inter_hospital' | 'intra_hospital'>('inter_hospital');

  // Requesting Hospital ID (Default to Kolkata Emergency Medical Center: CN-HEALTH-ZONE-3)
  const defaultReqHospital = zones.find((z) => z.id === 'CN-HEALTH-ZONE-3') || zones[0];
  const [requestingHospitalId, setRequestingHospitalId] = useState<string>(defaultReqHospital.id);
  const [requestingDept, setRequestingDept] = useState<string>('Emergency Trauma Dept');
  const [intraSupplyingDept, setIntraSupplyingDept] = useState<string>('Acute Care Centre');

  // Requested Quantity (Default to 6 as in the demo scenario)
  const [requestedQuantity, setRequestedQuantity] = useState<number>(6);
  const [clinicalNotes, setClinicalNotes] = useState<string>(
    'Critical acute respiratory admissions in emergency bay. Immediate oxygen cylinder allocation needed.'
  );

  // Supplying Hospital Board ID for the Hospital Board view (Default to Salt Lake Critical Care: CN-HEALTH-ZONE-2)
  const defaultSupplyingHospital = zones.find((z) => z.id === 'CN-HEALTH-ZONE-2') || zones[1] || zones[0];
  const [activeBoardHospitalId, setActiveBoardHospitalId] = useState<string>(defaultSupplyingHospital.id);

  // In-App Notification Center State
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [localNotifications, setLocalNotifications] = useState<InAppNotification[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Request Transfer Confirmation Modal
  const [activeRequestTarget, setActiveRequestTarget] = useState<{
    supplyingZone: HealthZone;
    assessment: TransferabilityAssessment;
    resourceName: string;
  } | null>(null);

  // Rejection Dialog State
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>(
    'Local emergency reserve required for incoming trauma surge'
  );

  // Banner Notice
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Filter zones by region
  const filteredZones = zones.filter((z) => {
    if (selectedRegion === 'All Regions') return true;
    return z.region === selectedRegion;
  });

  const requestingHospital = zones.find((z) => z.id === requestingHospitalId) || defaultReqHospital;
  const activeBoardHospital = zones.find((z) => z.id === activeBoardHospitalId) || defaultSupplyingHospital;
  const resourceMeta = EMERGENCY_RESOURCE_METADATA[selectedResourceType];

  // -------------------------------------------------------------
  // In-App Notification Sync & Generation
  // -------------------------------------------------------------
  useEffect(() => {
    // Fetch notifications from server
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const notifs: InAppNotification[] = await res.json();
          setLocalNotifications(notifs);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    fetchNotifications();
  }, [boardRequests.length]);

  // Filter notifications for active demo role
  const roleNotifications = localNotifications.filter((n) => {
    if (demoRole === 'requesting_hospital') {
      return n.targetRole === 'requesting_hospital';
    } else {
      return (
        n.targetRole === 'hospital_board' &&
        (n.targetHospital.includes(activeBoardHospital.name) ||
          activeBoardHospital.name.includes(n.targetHospital) ||
          n.targetHospital.includes('Salt Lake Critical Care'))
      );
    }
  });

  const unreadCount = roleNotifications.filter((n) => !n.read).length;

  const markNotificationRead = async (notifId: string) => {
    setLocalNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
    } catch (e) {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // Resource Availability & Transferability Calculation
  // -------------------------------------------------------------
  const getResourceAvailability = (
    zone: HealthZone,
    resType: EmergencyResourceType,
    requestedQty: number
  ): {
    total: number;
    available: number;
    inUse: number;
    reserve: number;
    requirement: number;
    reservedCount: number;
    dispatchedCount: number;
    receivedCount: number;
    assessment: TransferabilityAssessment;
    resourceDetails: string;
    extraNote?: string;
  } => {
    switch (resType) {
      case 'oxygen_cylinder': {
        const stats = zone.oxygenCylinders || { total: 30, available: 10, required: 5, reserve: 5, status: 'adequate' };
        const total = stats.total;
        const available = stats.available;
        const inUse = Math.max(0, total - available);
        const requirement = stats.required;
        const reserve = stats.reserve;
        const reservedCount = stats.reserved || 0;
        const dispatchedCount = stats.dispatched || 0;
        const receivedCount = stats.received || 0;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount,
          dispatchedCount,
          receivedCount,
          assessment,
          resourceDetails: `${available} D-Type cylinders available (${total} total capacity, ${reserve} reserve buffer)`,
          extraNote: 'High-pressure medical O2 cylinders with certified flow regulators.',
        };
      }
      case 'icu_bed': {
        const total = zone.icuBeds.total;
        const available = zone.icuBeds.available;
        const inUse = zone.icuBeds.inUse;
        const reserve = Math.max(2, Math.round(total * 0.1));
        const requirement = Math.round(total * 0.15);
        const reservedCount = zone.icuBeds.reservedCapacity || 0;
        const dispatchedCount = 0;
        const receivedCount = zone.icuBeds.allocatedCapacity || 0;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount,
          dispatchedCount,
          receivedCount,
          assessment,
          resourceDetails: `${available} unoccupied beds (${inUse}/${total} occupied, reserve: ${reserve})`,
          extraNote: 'ICU Capacity reservation within regional network. Physical bed structures remain in-situ.',
        };
      }
      case 'medicine': {
        const primaryMed = zone.medicineStock[0];
        const total = primaryMed ? primaryMed.totalCapacity : 100;
        const available = primaryMed ? primaryMed.currentUnits : 20;
        const inUse = total - available;
        const reserve = primaryMed ? primaryMed.minSafeThreshold : 25;
        const requirement = primaryMed?.currentRequirement || Math.round(total * 0.2);
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: 0,
          dispatchedCount: 0,
          receivedCount: 0,
          assessment,
          resourceDetails: primaryMed
            ? `${primaryMed.name}: ${available} ${primaryMed.unitMeasurement} (Reserve: ${reserve}, Expiry: ${primaryMed.expiryDate || 'Valid'})`
            : `${available} units in stock`,
          extraNote: primaryMed ? `Batch ${primaryMed.batchCode} • Temp: ${primaryMed.temperatureRequirement}` : undefined,
        };
      }
      case 'defibrillator': {
        const defibs = zone.defibrillators || [];
        const total = defibs.length;
        const available = defibs.filter((d) => d.operational && !d.inUse).length;
        const inUse = defibs.filter((d) => d.inUse).length;
        const reserve = 1;
        const requirement = 0;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: 0,
          dispatchedCount: 0,
          receivedCount: 0,
          assessment,
          resourceDetails: `${available}/${total} operational AED units ready for emergency allocation`,
          extraNote: defibs[0] ? `Primary: ${defibs[0].model} • Self-Test: Certified • Battery: ${defibs[0].batteryStatus}` : 'Self-test verified',
        };
      }
      case 'ventilator': {
        const total = zone.ventilators.total;
        const available = zone.ventilators.available;
        const inUse = zone.ventilators.inUse;
        const reserve = Math.max(2, Math.round(total * 0.12));
        const requirement = Math.round(total * 0.1);
        const reservedCount = zone.ventilators.reserved || 0;
        const dispatchedCount = zone.ventilators.dispatched || 0;
        const receivedCount = zone.ventilators.received || 0;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount,
          dispatchedCount,
          receivedCount,
          assessment,
          resourceDetails: `${available} unallocated ventilators (${inUse}/${total} active, reserve: ${reserve})`,
          extraNote: `${zone.ventilators.pediatric} pediatric • ${zone.ventilators.highFlow} high-flow • ${zone.ventilators.transport} transport`,
        };
      }
      case 'infusion_pump': {
        const stats = zone.infusionPumps || { total: 20, available: 8, inUse: 10, reserve: 2, operational: true, maintenanceStatus: 'Certified' };
        const total = stats.total;
        const available = stats.available;
        const inUse = stats.inUse;
        const reserve = stats.reserve;
        const requirement = 2;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: stats.reserved || 0,
          dispatchedCount: stats.dispatched || 0,
          receivedCount: stats.received || 0,
          assessment,
          resourceDetails: `${available}/${total} volumetric pumps ready (Maintenance: ${stats.maintenanceStatus})`,
        };
      }
      case 'patient_monitor': {
        const stats = zone.patientMonitors || { total: 25, available: 10, inUse: 12, reserve: 3, operational: true };
        const total = stats.total;
        const available = stats.available;
        const inUse = stats.inUse;
        const reserve = stats.reserve;
        const requirement = 2;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: stats.reserved || 0,
          dispatchedCount: stats.dispatched || 0,
          receivedCount: stats.received || 0,
          assessment,
          resourceDetails: `${available}/${total} hemodynamic multi-parameter monitors (ECG/SpO2/NIBP)`,
        };
      }
      case 'stretcher': {
        const stats = zone.stretchers || { total: 20, available: 8, inUse: 10, reserved: 2 };
        const total = stats.total;
        const available = stats.available;
        const inUse = stats.inUse;
        const reserve = stats.reserved;
        const requirement = 2;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: stats.reserved || 0,
          dispatchedCount: stats.dispatched || 0,
          receivedCount: stats.received || 0,
          assessment,
          resourceDetails: `${available}/${total} trauma stretchers with hydraulic elevation & safety locks`,
        };
      }
      case 'portable_oxygen': {
        const stats = zone.portableOxygen || { total: 10, available: 5, inUse: 3, reserve: 2, batteryStatus: 'Optimal' };
        const total = stats.total;
        const available = stats.available;
        const inUse = stats.inUse;
        const reserve = stats.reserve;
        const requirement = 1;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: stats.reserved || 0,
          dispatchedCount: stats.dispatched || 0,
          receivedCount: stats.received || 0,
          assessment,
          resourceDetails: `${available}/${total} portable concentrators (Battery: ${stats.batteryStatus})`,
        };
      }
      case 'ambulance': {
        const fleet = zone.ambulances || [];
        const total = fleet.length;
        const available = fleet.filter((a) => a.status === 'available').length;
        const inUse = fleet.filter((a) => a.status !== 'available').length;
        const reserve = 1;
        const requirement = 0;
        const assessment = calculateTransferability(available, requirement, reserve, requestedQty);
        return {
          total,
          available,
          inUse,
          reserve,
          requirement,
          reservedCount: 0,
          dispatchedCount: fleet.filter((a) => a.status === 'dispatched' || a.status === 'en_route').length,
          receivedCount: fleet.filter((a) => a.status === 'arrived').length,
          assessment,
          resourceDetails: `${available}/${total} certified mobile ICU ambulances in ready status`,
          extraNote: fleet[0] ? `Lead Unit: ${fleet[0].vehicleNumber} (${fleet[0].type}) • Ready: ${fleet[0].equipmentReadiness}` : 'ALS ready',
        };
      }
    }
  };

  // -------------------------------------------------------------
  // Confirm and Submit Transfer Request
  // -------------------------------------------------------------
  const handleConfirmRequest = () => {
    if (!activeRequestTarget) return;

    const supplyingName =
      transferScope === 'intra_hospital'
        ? requestingHospital.name
        : activeRequestTarget.supplyingZone.name;

    const supplyingId =
      transferScope === 'intra_hospital'
        ? requestingHospital.id
        : activeRequestTarget.supplyingZone.id;

    onCreateBoardRequest({
      transferType: transferScope,
      resourceType: selectedResourceType,
      resourceName: activeRequestTarget.resourceName,
      requestingHospital: requestingHospital.name,
      requestingHospitalId: requestingHospital.id,
      requestingDepartment: requestingDept,
      supplyingHospital: supplyingName,
      supplyingHospitalId: supplyingId,
      supplyingDepartment: transferScope === 'intra_hospital' ? intraSupplyingDept : undefined,
      requestedQuantity,
      currentAvailable: activeRequestTarget.assessment.available,
      safeTransferableQuantity: activeRequestTarget.assessment.safeTransferable,
      transferabilityStatus: activeRequestTarget.assessment.status,
      priority: 'Emergency',
      notes: clinicalNotes,
      eta: '18 mins (Priority Life-Safety Green Corridor)',
    });

    // Create immediate local notification specifically for supplying hospital board
    const newNotifId = `NOTIF-${Date.now().toString().slice(-4)}`;
    const newBoardNotif: InAppNotification = {
      id: newNotifId,
      requestId: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      targetRole: 'hospital_board',
      targetHospital: supplyingName,
      title: '🚨 Emergency Transfer Request',
      message: `${requestingHospital.name} requested ${requestedQuantity}x ${activeRequestTarget.resourceName}. Safe Transferable: ${activeRequestTarget.assessment.safeTransferable}. Status: 🟢 Within Safe Reserve.`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      read: false,
      priority: 'Emergency',
      resourceSummary: {
        resourceName: activeRequestTarget.resourceName,
        quantity: requestedQuantity,
        unit: resourceMeta.unit,
        requestingHospital: requestingHospital.name,
        supplyingHospital: supplyingName,
        currentAvailable: activeRequestTarget.assessment.available,
        safeTransferable: activeRequestTarget.assessment.safeTransferable,
      },
    };
    setLocalNotifications((prev) => [newBoardNotif, ...prev]);

    // Automatically set the Hospital Board view's active hospital to this supplying hospital
    setActiveBoardHospitalId(supplyingId);

    setBannerNotice({
      type: 'success',
      title: 'Transfer Request Submitted to Hospital Board',
      message: `Emergency request sent to ${supplyingName} Board. Switch Demo View to "Hospital Board" above to review and approve!`,
    });

    setActiveRequestTarget(null);
  };

  // -------------------------------------------------------------
  // Approve Action from Hospital Board View
  // -------------------------------------------------------------
  const handleApprove = (requestId: string) => {
    const req = boardRequests.find((r) => r.id === requestId);
    if (!req) return;

    onApproveBoardRequest(requestId, `${req.supplyingHospital} Board Authorization Desk`);

    // Add in-app notification for the requesting hospital
    const notif: InAppNotification = {
      id: `NOTIF-APP-${Date.now().toString().slice(-4)}`,
      requestId: req.id,
      targetRole: 'requesting_hospital',
      targetHospital: req.requestingHospital,
      title: '✅ Transfer Approved',
      message: `Your emergency resource request has been approved by ${req.supplyingHospital}. Resource: ${req.requestedQuantity} ${req.resourceName}. Status: Approved.`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      read: false,
      priority: 'Emergency',
      resourceSummary: {
        resourceName: req.resourceName,
        quantity: req.requestedQuantity,
        unit: 'units',
        requestingHospital: req.requestingHospital,
        supplyingHospital: req.supplyingHospital,
        currentAvailable: req.currentAvailable || 18,
        safeTransferable: req.safeTransferableQuantity,
      },
    };
    setLocalNotifications((prev) => [notif, ...prev]);

    setBannerNotice({
      type: 'success',
      title: 'Transfer Approved & Quantity Reserved',
      message: `Request ${req.id} approved! ${req.requestedQuantity}x ${req.resourceName} moved to [Reserved] status. Switch back to Requesting Hospital to view notification.`,
    });
  };

  // -------------------------------------------------------------
  // Reject Action from Hospital Board View
  // -------------------------------------------------------------
  const handleConfirmReject = () => {
    if (!rejectingRequestId) return;
    const req = boardRequests.find((r) => r.id === rejectingRequestId);
    if (!req) return;

    onRejectBoardRequest(rejectingRequestId, rejectionReasonInput);

    // Add rejection notification for the requesting hospital
    const notif: InAppNotification = {
      id: `NOTIF-REJ-${Date.now().toString().slice(-4)}`,
      requestId: req.id,
      targetRole: 'requesting_hospital',
      targetHospital: req.requestingHospital,
      title: '⚠️ Transfer Request Rejected',
      message: `Your emergency request for ${req.requestedQuantity}x ${req.resourceName} was rejected by ${req.supplyingHospital}. Reason: ${rejectionReasonInput}. Zero inventory deducted.`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      read: false,
      priority: 'Critical',
    };
    setLocalNotifications((prev) => [notif, ...prev]);

    setBannerNotice({
      type: 'warning',
      title: 'Transfer Request Rejected',
      message: `Request ${req.id} rejected. Rejection reason recorded and transmitted to requesting facility.`,
    });

    setRejectingRequestId(null);
  };

  // -------------------------------------------------------------
  // Lifecycle Stage Colors & Labels
  // -------------------------------------------------------------
  const getStageBadge = (status: HospitalBoardRequest['status']) => {
    switch (status) {
      case 'pending_board_approval':
        return {
          label: 'Pending Hospital Approval',
          color: 'bg-amber-950/70 text-amber-400 border-amber-800/80 animate-pulse',
          icon: <Clock className="w-3 h-3 text-amber-400" />,
        };
      case 'approved':
        return {
          label: 'Approved by Board',
          color: 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
        };
      case 'preparing':
        return {
          label: 'Preparing for Transit',
          color: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80',
          icon: <Package className="w-3 h-3 text-indigo-400" />,
        };
      case 'dispatched':
        return {
          label: 'Dispatched / In Transit',
          color: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/80',
          icon: <Truck className="w-3 h-3 text-cyan-400" />,
        };
      case 'in_transit':
        return {
          label: 'In Transit (En Route)',
          color: 'bg-blue-950/70 text-blue-300 border-blue-800/80 animate-pulse',
          icon: <Truck className="w-3 h-3 text-blue-400" />,
        };
      case 'completed':
        return {
          label: 'Completed & Received',
          color: 'bg-emerald-950 text-emerald-300 border-emerald-700',
          icon: <CheckCheck className="w-3 h-3 text-emerald-400" />,
        };
      case 'rejected':
        return {
          label: 'Rejected by Board',
          color: 'bg-rose-950/70 text-rose-400 border-rose-800/80',
          icon: <XCircle className="w-3 h-3 text-rose-400" />,
        };
      default:
        return {
          label: status,
          color: 'bg-slate-900 text-slate-400 border-slate-800',
          icon: <Activity className="w-3 h-3" />,
        };
    }
  };

  // 8-stage interactive visual timeline helper
  const TIMELINE_STAGES = [
    { key: 'created', label: 'Request Created' },
    { key: 'notified', label: 'Hospital Board Notified' },
    { key: 'approved', label: 'Approved' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'received', label: 'Received' },
    { key: 'completed', label: 'Completed' },
  ];

  const getTimelineStageIndex = (status: HospitalBoardRequest['status']) => {
    switch (status) {
      case 'pending_board_approval':
        return 1; // Notified
      case 'approved':
        return 2;
      case 'preparing':
        return 3;
      case 'dispatched':
        return 4;
      case 'in_transit':
        return 5;
      case 'completed':
        return 7;
      case 'rejected':
        return -1;
      default:
        return 0;
    }
  };

  return (
    <div id="unified_emergency_coordinator" className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP TACTICAL CONTROL BAR: DEMO ROLE SWITCHER & NOTIFICATION BELL */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-rose-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Demo Role Switcher */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                DEMO / PROTOTYPE WORKFLOW
              </span>
              <span className="text-xs text-slate-400 font-mono">Two-Sided Transfer Simulation</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-mono font-bold text-slate-300">Active Demo View:</span>
              
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono shadow-inner">
                {/* Role 1: Requesting Hospital */}
                <button
                  id="btn_role_requesting_hospital"
                  type="button"
                  onClick={() => {
                    setDemoRole('requesting_hospital');
                    setBannerNotice(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    demoRole === 'requesting_hospital'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Requesting Hospital</span>
                  <span className="text-[10px] opacity-75 hidden sm:inline">
                    (Kolkata Emergency Medical Center)
                  </span>
                </button>

                {/* Role 2: Hospital Board */}
                <button
                  id="btn_role_hospital_board"
                  type="button"
                  onClick={() => {
                    setDemoRole('hospital_board');
                    setBannerNotice(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    demoRole === 'hospital_board'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Hospital Board</span>
                  <span className="text-[10px] opacity-75 hidden sm:inline">
                    (Salt Lake Critical Care Hospital)
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: In-App Notification Bell & Quick Stats */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            
            {/* Supplying Hospital selector for board view */}
            {demoRole === 'hospital_board' && (
              <div className="text-xs font-mono flex items-center gap-2">
                <span className="text-slate-500 text-[11px]">Board Facility:</span>
                <select
                  id="select_board_facility"
                  value={activeBoardHospitalId}
                  onChange={(e) => setActiveBoardHospitalId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-emerald-300 font-bold text-xs focus:outline-none focus:border-emerald-500"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name.replace(/\[DEMO\/PROTOTYPE DATA\]/g, '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification Bell Button */}
            <div className="relative">
              <button
                id="btn_in_app_notification_bell"
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                  unreadCount > 0
                    ? 'bg-rose-950/60 border-rose-600 text-rose-300 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title="Open in-app notification center"
              >
                {unreadCount > 0 ? (
                  <BellRing className="w-4 h-4 text-rose-400 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4 text-slate-400" />
                )}
                <span>Notifications</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    unreadCount > 0 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {unreadCount}
                </span>
              </button>

              {/* Notification Center Dropdown Flyout */}
              {isNotificationOpen && (
                <div
                  id="in_app_notification_drawer"
                  className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-rose-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                        {demoRole === 'hospital_board'
                          ? 'Hospital Board Notification Desk'
                          : 'Requesting Hospital Alerts'}
                      </h4>
                    </div>
                    <button
                      onClick={() => setIsNotificationOpen(false)}
                      className="text-slate-500 hover:text-slate-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {roleNotifications.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs font-mono">
                        No notifications for this demo view.
                      </div>
                    ) : (
                      roleNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setSelectedRequestId(n.requestId);
                            setIsNotificationOpen(false);
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            n.read
                              ? 'bg-slate-900/40 border-slate-850 opacity-80'
                              : 'bg-slate-900 border-rose-900/60 shadow-md ring-1 ring-rose-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-slate-200 font-sans flex items-center gap-1.5">
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                              {n.title}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">{n.timestamp}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{n.message}</p>
                          {n.resourceSummary && (
                            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>Req ID: {n.requestId}</span>
                              <span className="text-emerald-400">Safe Surplus: {n.resourceSummary.safeTransferable}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {roleNotifications.length > 0 && (
                    <div className="pt-2 border-t border-slate-850 flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span>Click notification to view request details</span>
                      <button
                        onClick={() => {
                          setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                        }}
                        className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Global Banner Notice */}
        {bannerNotice && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
              bannerNotice.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : bannerNotice.type === 'warning'
                ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <div>
                <strong className="font-bold">{bannerNotice.title}:</strong> {bannerNotice.message}
              </div>
            </div>
            <button
              onClick={() => setBannerNotice(null)}
              className="text-slate-400 hover:text-slate-200 ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: REQUESTING HOSPITAL WORKFLOW                          */}
      {/* ------------------------------------------------------------- */}
      {demoRole === 'requesting_hospital' && (
        <div className="space-y-6">

          {/* SECTION HEADER */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-base font-extrabold text-slate-100 tracking-wide uppercase font-sans">
                  Emergency Resource Request Desk
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Active Requesting Facility: <strong className="text-slate-200">{requestingHospital.name}</strong> • Find Network Availability → Assess Transferability → Request Transfer
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Protocol: Inter-Hospital Life-Safety
            </span>
          </div>

          {/* 1. What emergency resource do you need? */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <span>1. What emergency resource do you need?</span>
                <span className="text-[10px] text-slate-500">(10 Certified Life-Safety Categories)</span>
              </label>
              <span className="text-[10px] font-mono text-rose-400 font-semibold">
                Active Selection: {resourceMeta.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {(Object.keys(EMERGENCY_RESOURCE_METADATA) as EmergencyResourceType[]).map((resKey) => {
                const meta = EMERGENCY_RESOURCE_METADATA[resKey];
                const isSelected = selectedResourceType === resKey;
                return (
                  <button
                    key={resKey}
                    id={`btn_select_resource_${resKey}`}
                    type="button"
                    onClick={() => {
                      setSelectedResourceType(resKey);
                      if (resKey === 'oxygen_cylinder') setRequestedQuantity(6);
                      else if (resKey === 'defibrillator' || resKey === 'ambulance') setRequestedQuantity(1);
                      else setRequestedQuantity(2);
                    }}
                    className={`p-3 rounded-xl border text-left transition duration-150 cursor-pointer flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{meta.icon}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                    </div>
                    <div>
                      <span className={`text-xs font-bold block truncate ${isSelected ? 'text-rose-300' : 'text-slate-200'}`}>
                        {meta.label}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono block truncate">
                        {meta.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Select Location & Parameters */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            
            {/* Region */}
            <div>
              <span className="text-slate-500 text-[10px] uppercase block mb-1">Geographic Region</span>
              <select
                id="select_emergency_region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="All Regions">All Demo Regions</option>
                {DEMO_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordination Scope */}
            <div>
              <span className="text-slate-500 text-[10px] uppercase block mb-1">Coordination Scope</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferScope('inter_hospital')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-bold transition cursor-pointer ${
                    transferScope === 'inter_hospital'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏢 Inter-Hospital
                </button>
                <button
                  type="button"
                  onClick={() => setTransferScope('intra_hospital')}
                  className={`flex-1 py-1.5 px-2 text-[11px] font-bold transition cursor-pointer ${
                    transferScope === 'intra_hospital'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🏥 Intra-Hospital
                </button>
              </div>
            </div>

            {/* Requesting Facility */}
            <div>
              <span className="text-slate-500 text-[10px] uppercase block mb-1">Requesting Facility</span>
              <select
                id="select_requesting_hospital"
                value={requestingHospitalId}
                onChange={(e) => setRequestingHospitalId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 truncate focus:outline-none focus:border-rose-500"
              >
                {filteredZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name.replace(/\[DEMO\/PROTOTYPE DATA\]/g, '').trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Quantity */}
            <div>
              <span className="text-slate-500 text-[10px] uppercase block mb-1">
                Requested Units ({resourceMeta.unit})
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={selectedResourceType === 'defibrillator' || selectedResourceType === 'ambulance'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-rose-500 disabled:opacity-50"
                />
                {(selectedResourceType === 'defibrillator' || selectedResourceType === 'ambulance') && (
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">Single Unit</span>
                )}
              </div>
            </div>

          </div>

          {/* 3. Availability & Safe Transferability Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <span>2. Network Inventory & Safe Transferability Assessments</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                Formula: Available − Requirement − Emergency Reserve = Safe Transferable
              </span>
            </div>

            {/* Facilities Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredZones.map((zone) => {
                const isCurrentRequester = zone.id === requestingHospital.id;
                const availability = getResourceAvailability(zone, selectedResourceType, requestedQuantity);
                const assessment = availability.assessment;

                return (
                  <div
                    key={zone.id}
                    className={`p-4 rounded-xl border transition-all duration-200 space-y-3 ${
                      isCurrentRequester
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-85'
                        : assessment.status === 'can_transfer'
                        ? 'bg-slate-950/90 border-emerald-900/60 hover:border-emerald-700/80 shadow-lg shadow-emerald-950/20'
                        : assessment.status === 'limited_transfer'
                        ? 'bg-slate-950/90 border-amber-900/60 hover:border-amber-700/80'
                        : 'bg-slate-950/60 border-slate-850 opacity-75'
                    }`}
                  >
                    {/* Facility Header */}
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-850">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-200 text-xs sm:text-sm font-sans truncate">
                            {zone.name.replace(/\[DEMO\/PROTOTYPE DATA\]/g, '').trim()}
                          </h4>
                          {isCurrentRequester && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-800/40">
                              REQUESTER
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {zone.city} • {zone.region}
                        </span>
                      </div>

                      {/* Transferability Status Badge */}
                      {!isCurrentRequester && (
                        <div>
                          {assessment.status === 'can_transfer' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
                              🟢 Can Transfer {requestedQuantity}
                            </span>
                          )}
                          {assessment.status === 'limited_transfer' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full font-mono">
                              🟡 Limited ({assessment.safeTransferable} Max)
                            </span>
                          )}
                          {assessment.status === 'cannot_transfer' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded-full font-mono">
                              🔴 Cannot Transfer
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inventory Breakdown Numbers */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Available</span>
                        <span className="font-bold text-slate-200">{availability.available}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Required</span>
                        <span className="text-slate-400">{availability.requirement}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Reserve</span>
                        <span className="text-amber-400 font-semibold">{availability.reserve}</span>
                      </div>
                      <div className="border-l border-slate-800 pl-1">
                        <span className="text-slate-500 text-[10px] block">Transferable</span>
                        <span className={`font-bold ${assessment.safeTransferable > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {assessment.safeTransferable}
                        </span>
                      </div>
                    </div>

                    {/* Inventory Stage Progress Bar (Available -> Reserved -> Dispatched -> Received) */}
                    {(availability.reservedCount > 0 || availability.dispatchedCount > 0 || availability.receivedCount > 0) && (
                      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 text-[10px] font-mono space-y-1">
                        <span className="text-slate-500 block uppercase font-bold">Transfer Stages in Facility:</span>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>📦 Reserved: <strong className="text-amber-400">{availability.reservedCount}</strong></span>
                          <span>🚚 Dispatched: <strong className="text-cyan-400">{availability.dispatchedCount}</strong></span>
                          <span>✅ Received: <strong className="text-emerald-400">{availability.receivedCount}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Assessment Reason */}
                    <p className="text-[11px] font-sans text-slate-400 leading-snug">
                      {assessment.reason}
                    </p>

                    {/* Action Button: Request Transfer */}
                    {!isCurrentRequester && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">
                          {selectedResourceType === 'icu_bed'
                            ? 'Capacity Allocation'
                            : 'Physical Transport'}
                        </span>

                        <button
                          id={`btn_request_transfer_${zone.id}`}
                          type="button"
                          onClick={() => {
                            setActiveRequestTarget({
                              supplyingZone: zone,
                              assessment,
                              resourceName: resourceMeta.label,
                            });
                          }}
                          disabled={assessment.safeTransferable <= 0}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            assessment.status === 'can_transfer'
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                              : assessment.status === 'limited_transfer'
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>Request Transfer</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Active Transfer Requests & 8-Stage Interactive Timeline */}
          <div className="space-y-4 pt-4 border-t border-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <span>3. Active Life-Safety Transfer Requests & Lifecycle Tracker</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Real-time timeline and physical inventory transitions for {requestingHospital.name}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {boardRequests.length} Total Requests Active
              </span>
            </div>

            {boardRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">No active emergency requests logged yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {boardRequests.map((req) => {
                  const stageIndex = getTimelineStageIndex(req.status);
                  const badge = getStageBadge(req.status);
                  const isSelected = selectedRequestId === req.id;
                  const meta = EMERGENCY_RESOURCE_METADATA[req.resourceType] || { icon: '📦', unit: 'units' };

                  return (
                    <div
                      key={req.id}
                      id={`request_card_${req.id}`}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                        isSelected
                          ? 'bg-slate-900/90 border-rose-500 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {/* Request Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xl">
                            {meta.icon}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-100 text-sm font-sans">
                                {req.requestedQuantity}x {req.resourceName}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/60 font-black">
                                🚨 {req.priority.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Request ID: <strong className="text-slate-300">{req.id}</strong> • Filed: {req.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full font-mono border ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Hospital & Department Routing Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Requesting Facility</span>
                          <span className="font-semibold text-slate-200">{req.requestingHospital}</span>
                          {req.requestingDepartment && (
                            <span className="block text-[11px] text-slate-400">Dept: {req.requestingDepartment}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Supplying Facility</span>
                          <span className="font-semibold text-emerald-400">{req.supplyingHospital}</span>
                          {req.supplyingDepartment && (
                            <span className="block text-[11px] text-slate-400">Wing: {req.supplyingDepartment}</span>
                          )}
                        </div>
                      </div>

                      {/* 8-STAGE INTERACTIVE TIMELINE */}
                      {req.status !== 'rejected' ? (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                            Transfer Lifecycle Progress:
                          </span>
                          
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[10px] font-mono">
                            {TIMELINE_STAGES.map((s, idx) => {
                              const isCompleted = idx <= stageIndex;
                              const isCurrent = idx === stageIndex;

                              return (
                                <div
                                  key={s.key}
                                  className={`p-1.5 rounded-lg border flex flex-col items-center justify-between h-14 ${
                                    isCurrent
                                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold shadow-md shadow-rose-950/40 ring-1 ring-rose-500/50'
                                      : isCompleted
                                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                                      : 'bg-slate-900/30 border-slate-850 text-slate-600'
                                  }`}
                                >
                                  <span className="text-xs">
                                    {isCompleted ? '✓' : idx + 1}
                                  </span>
                                  <span className="text-[9px] leading-tight block truncate w-full">
                                    {s.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs font-mono space-y-1">
                          <span className="text-rose-400 font-bold block">❌ Request Rejected by Supplying Board</span>
                          <p className="text-slate-300 text-[11px]">
                            <strong>Reason:</strong> {req.rejectionReason || 'Local hospital reserve protected for acute admissions.'}
                          </p>
                        </div>
                      )}

                      {/* Resource Quantity Stage Tracker */}
                      {req.status !== 'rejected' && (
                        <div className="p-2.5 bg-slate-900/30 rounded-xl border border-slate-850 text-[11px] font-mono flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Resource Stage:</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold uppercase">
                              {req.inventoryState || 'Available'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                            <span>Available</span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className={req.status === 'approved' || req.status === 'preparing' ? 'text-amber-400 font-bold' : ''}>
                              Reserved
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className={req.status === 'dispatched' || req.status === 'in_transit' ? 'text-cyan-400 font-bold' : ''}>
                              Dispatched
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                            <span className={req.status === 'completed' ? 'text-emerald-400 font-bold' : ''}>
                              Received
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action for Requesting Hospital: Confirm Received when In Transit */}
                      {(req.status === 'in_transit' || req.status === 'dispatched') && (
                        <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-cyan-300">
                            🚚 Transit link active. Once carrier arrives at emergency bay:
                          </span>

                          <button
                            id={`btn_confirm_received_${req.id}`}
                            type="button"
                            onClick={() => onUpdateBoardRequestStatus(req.id, 'completed')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                          >
                            <CheckCheck className="w-4 h-4" />
                            <span>Confirm Received & Deployed</span>
                          </button>
                        </div>
                      )}

                      {req.status === 'completed' && (
                        <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs font-mono text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Allocation deployed in {req.requestingHospital}. Intake recorded.
                          </span>
                          <span className="text-[10px] text-slate-500">Inventory Synchronized</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: HOSPITAL BOARD VIEW (SUPPLYING HOSPITAL)              */}
      {/* ------------------------------------------------------------- */}
      {demoRole === 'hospital_board' && (
        <div className="space-y-6">

          {/* SECTION HEADER */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-base font-extrabold text-slate-100 tracking-wide uppercase font-sans">
                  Hospital Board Authorization Desk
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Supplying Hospital: <strong className="text-emerald-400">{activeBoardHospital.name}</strong> • Review Incoming Emergency Requests → Authorize Transfer → Progress Dispatch Lifecycle
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                BOARD AUTHORIZED
              </span>
            </div>
          </div>

          {/* Pending Hospital Board Requests */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <span>Incoming Emergency Requests for {activeBoardHospital.name.replace(/\[DEMO\/PROTOTYPE DATA\]/g, '').trim()}</span>
            </h3>

            {boardRequests.filter(
              (r) =>
                r.supplyingHospital.includes(activeBoardHospital.name) ||
                activeBoardHospital.name.includes(r.supplyingHospital) ||
                r.supplyingHospital.includes('Salt Lake Critical Care')
            ).length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">
                  No active requests currently targeting {activeBoardHospital.name.replace(/\[DEMO\/PROTOTYPE DATA\]/g, '').trim()}.
                </p>
                <p className="text-[11px] text-slate-500">
                  Switch to "Requesting Hospital" view above to file an emergency request for 6 Oxygen Cylinders.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {boardRequests
                  .filter(
                    (r) =>
                      r.supplyingHospital.includes(activeBoardHospital.name) ||
                      activeBoardHospital.name.includes(r.supplyingHospital) ||
                      r.supplyingHospital.includes('Salt Lake Critical Care')
                  )
                  .map((req) => {
                    const isPending = req.status === 'pending_board_approval';
                    const badge = getStageBadge(req.status);
                    const meta = EMERGENCY_RESOURCE_METADATA[req.resourceType] || { icon: '📦', unit: 'units' };

                    return (
                      <div
                        key={req.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                          isPending
                            ? 'bg-slate-950 border-rose-800/80 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {/* Header Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850">
                          <div className="flex items-center gap-3">
                            <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xl">
                              {meta.icon}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-100 text-sm font-sans">
                                  🚨 Emergency Transfer Request: {req.requestedQuantity}x {req.resourceName}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Request ID: <strong className="text-slate-200">{req.id}</strong> • Transmitted: {req.timestamp}
                              </span>
                            </div>
                          </div>

                          <div>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full font-mono border ${badge.color}`}
                            >
                              {badge.icon}
                              <span>{badge.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* Request Details Card: matches user specification */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono bg-slate-900/50 p-3 rounded-xl border border-slate-850">
                          <div>
                            <span className="text-slate-500 text-[10px] block uppercase">Requesting Hospital</span>
                            <span className="font-bold text-slate-100">{req.requestingHospital}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block uppercase">Supplying Hospital</span>
                            <span className="font-bold text-emerald-400">{req.supplyingHospital}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block uppercase">Current Available</span>
                            <span className="font-bold text-slate-200">{req.currentAvailable || 18}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block uppercase">Safe Transferable</span>
                            <span className="font-bold text-emerald-400">
                              {req.safeTransferableQuantity} (🟢 Within Safe Reserve)
                            </span>
                          </div>
                        </div>

                        {/* Clinical Urgency & Context */}
                        <div className="text-xs font-sans text-slate-300 bg-slate-900/30 p-2.5 rounded-lg border border-slate-850">
                          <strong>Clinical Urgency:</strong> {req.notes || 'Emergency life-safety allocation.'}
                        </div>

                        {/* Supplying Hospital Board Actions: Approve | Reject */}
                        {isPending && (
                          <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Board authorization required before resource can be reserved or staged.
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                id={`btn_board_reject_${req.id}`}
                                type="button"
                                onClick={() => {
                                  setRejectingRequestId(req.id);
                                }}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject Transfer</span>
                              </button>

                              <button
                                id={`btn_board_approve_${req.id}`}
                                type="button"
                                onClick={() => handleApprove(req.id)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Transfer</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Progress Actions for Hospital Board after Approval */}
                        {req.status === 'approved' && (
                          <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-emerald-400">
                              ✅ Transfer Approved. Resource state: [Reserved]. Next step: Staging & preparation.
                            </span>

                            <button
                              id={`btn_start_preparing_${req.id}`}
                              type="button"
                              onClick={() => onUpdateBoardRequestStatus(req.id, 'preparing')}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>Start Preparing</span>
                            </button>
                          </div>
                        )}

                        {req.status === 'preparing' && (
                          <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-indigo-300">
                              📦 Resource staged and inspected. Ready for fleet roll-out.
                            </span>

                            <button
                              id={`btn_mark_dispatched_${req.id}`}
                              type="button"
                              onClick={() => onUpdateBoardRequestStatus(req.id, 'dispatched')}
                              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mark Dispatched</span>
                            </button>
                          </div>
                        )}

                        {req.status === 'dispatched' && (
                          <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                            <span className="text-[11px] font-mono text-cyan-300">
                              🚚 Vehicle en route. Telemetry beacon synchronized with transit corridor.
                            </span>

                            <button
                              id={`btn_mark_in_transit_${req.id}`}
                              type="button"
                              onClick={() => onUpdateBoardRequestStatus(req.id, 'in_transit')}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Mark In Transit</span>
                            </button>
                          </div>
                        )}

                        {req.status === 'in_transit' && (
                          <div className="pt-2 border-t border-slate-850 text-xs font-mono text-blue-300">
                            🚨 Carrier is currently in transit. Awaiting arrival and confirmation from Requesting Hospital ({req.requestingHospital}).
                          </div>
                        )}

                        {req.status === 'completed' && (
                          <div className="pt-2 border-t border-slate-850 text-xs font-mono text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Transfer Completed. {req.requestingHospital} confirmed intake and deployment.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REQUEST CONFIRMATION MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {activeRequestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{resourceMeta.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Confirm Emergency Resource Request
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    Protocol: Regional Life-Safety Coordination
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveRequestTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Resource:</span>
                  <span className="font-bold text-slate-200">
                    {activeRequestTarget.resourceName} ({requestedQuantity} {resourceMeta.unit})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requesting Facility:</span>
                  <span className="text-slate-200 font-bold">{requestingHospital.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplying Facility:</span>
                  <span className="text-emerald-400 font-bold">
                    {transferScope === 'intra_hospital'
                      ? requestingHospital.name
                      : activeRequestTarget.supplyingZone.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transfer Scope:</span>
                  <span className="text-cyan-400 uppercase font-bold">
                    {transferScope === 'intra_hospital' ? 'Intra-Hospital' : 'Inter-Hospital'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Safe Transferable Capacity:</span>
                  <span className="text-emerald-400 font-bold">
                    {activeRequestTarget.assessment.safeTransferable} {resourceMeta.unit} Available (🟢 Within Safe Reserve)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Clinical Urgency Note / Patient Context:
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg text-[11px] text-rose-300 font-sans leading-relaxed">
                🚨 This request will generate a direct in-app notification specifically for the Supplying Hospital Board. The authorized personnel make the final decision.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveRequestTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn_confirm_submit_board_request"
                onClick={handleConfirmRequest}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-950/40 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Hospital Board</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REJECTION REASON DIALOG MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Reject Emergency Transfer Request
                </h3>
              </div>
              <button
                onClick={() => setRejectingRequestId(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <label className="block text-[11px] text-slate-400">
                Reason for rejection:
              </label>

              {/* Quick option buttons */}
              <div className="space-y-1.5">
                {[
                  'Local emergency reserve required for incoming trauma surge',
                  'High local ICU bed occupancy threshold breached',
                  'Equipment scheduled for certified mandatory overhaul',
                  'Alternative intra-hospital allocation prioritized',
                ].map((reasonOption) => (
                  <button
                    key={reasonOption}
                    type="button"
                    onClick={() => setRejectionReasonInput(reasonOption)}
                    className={`w-full text-left p-2 rounded-lg border text-[11px] transition ${
                      rejectionReasonInput === reasonOption
                        ? 'bg-rose-950/50 border-rose-600 text-rose-200 font-bold'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {reasonOption}
                  </button>
                ))}
              </div>

              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                rows={2}
                placeholder="Custom reason..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />

              <p className="text-[10px] text-slate-500">
                The requesting facility will be notified with this explanation. Zero inventory will be deducted.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn_confirm_rejection"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
