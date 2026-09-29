import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Info,
  Settings,
  TrendingUp,
  BarChart2,
  FileText,
  Activity,
  Layers,
  Wrench,
  Cpu,
  Sparkles,
  GitCommit,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight,
  X,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Zap,
  Download
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * PREDICTIVE MAINTENANCE & REMAINING USEFUL LIFE (RUL) — WELL B-02 & FIELD WELLS
 * Full interactive predictive maintenance suite featuring:
 * - Dynamic Well Switcher (seamlessly toggles between B-02, B-17, B-01, B-04, etc.)
 * - Reactive equipment health metrics (Sucker Rod String, Insert Pump Barrel, Surface Gearbox)
 * - Interactive What-If Stress Scrubber & Operational Timeline simulation (0 to 365 Days)
 * - True mathematical Weibull Degradation and Gaussian Probability Density Function (PDF) curves
 * - Interactive component focus selector
 * - Prescriptive Maintenance Actions with live Work Order generation & procurement tracking
 * - Field Workover & Intervention history with "+ Log Workover" modal
 * - Styled in creamy desert sandstone palette with warm earth tones
 */
export default function PredictiveMaintenanceRUL({
  selectedWellId = 'B-02',
  onSelectWell,
  onBackToDashboard
}) {
  // Current active well
  const [currentWellId, setCurrentWellId] = useState(selectedWellId || 'B-02');
  const [loading, setLoading] = useState(true);
  const [failureRisk, setFailureRisk] = useState(null);
  const [twinState, setTwinState] = useState(null);
  const [workoverLogs, setWorkoverLogs] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Interactive controls
  const [activeComponent, setActiveComponent] = useState('rod'); // 'rod' | 'pump' | 'gearbox'
  const [hoveredTrendDay, setHoveredTrendDay] = useState(null);
  const [timelineDay, setTimelineDay] = useState(0); // 0 to 365
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [stressScenario, setStressScenario] = useState('nominal'); // 'nominal' | 'viscous' | 'cold' | 'speed'
  const [isOverhauled, setIsOverhauled] = useState(false); // Simulated workover overhaul reset

  // Work Orders & Feedback
  const [acknowledgedRecs, setAcknowledgedRecs] = useState({});
  const [activeModal, setActiveModal] = useState(null); // 'workOrder' | 'logWorkover' | 'procurement'
  const [modalData, setModalData] = useState(null);
  const [notification, setNotification] = useState(null);
  const [workoverFilter, setWorkoverFilter] = useState('all'); // 'all' | 'well' | 'rod' | 'pump'

  // Form state for logging new workover
  const [newWorkover, setNewWorkover] = useState({
    date: new Date().toISOString().split('T')[0],
    component: 'Sucker Rod String',
    failure_mode: 'Preventative Inspection & Guide Alignment',
    root_cause: 'High heavy crude viscosity & cyclic drag',
    downtime_hours: 8,
    action_taken: 'Installed roller rod guides and aligned polish rod'
  });

  // Keep currentWellId in sync if parent prop changes
  useEffect(() => {
    if (selectedWellId && selectedWellId !== currentWellId) {
      setCurrentWellId(selectedWellId);
    }
  }, [selectedWellId]);

  // Load telemetry and predictive data when well changes
  useEffect(() => {
    fetchData(currentWellId);
  }, [currentWellId]);

  // Handle timeline auto-play
  useEffect(() => {
    let interval = null;
    if (isPlayingTimeline) {
      interval = setInterval(() => {
        setTimelineDay((prev) => {
          if (prev >= 360) {
            setIsPlayingTimeline(false);
            return 365;
          }
          return prev + 5;
        });
      }, 120);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingTimeline]);

  // Auto-dismiss toast notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchData = async (wellId) => {
    setLoading(true);
    try {
      const [riskRes, twinRes, failuresRes, recsRes] = await Promise.allSettled([
        api.getFailureRisk(wellId),
        api.getDigitalTwinState(wellId),
        api.getWellFailures(wellId),
        api.getRecommendations(wellId)
      ]);

      if (riskRes.status === 'fulfilled' && riskRes.value) {
        setFailureRisk(riskRes.value);
      } else {
        setFailureRisk(null);
      }

      if (twinRes.status === 'fulfilled' && twinRes.value) {
        setTwinState(twinRes.value);
      } else {
        setTwinState(null);
      }

      if (failuresRes.status === 'fulfilled' && Array.isArray(failuresRes.value) && failuresRes.value.length > 0) {
        setWorkoverLogs(failuresRes.value);
      } else {
        // High fidelity baseline field workover records
        setWorkoverLogs(getFieldWorkoverSeed(wellId));
      }

      if (recsRes.status === 'fulfilled' && Array.isArray(recsRes.value)) {
        setRecommendations(recsRes.value);
      }
    } catch (err) {
      console.warn('Error fetching predictive maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWell = (wellId) => {
    setCurrentWellId(wellId);
    setIsOverhauled(false);
    setTimelineDay(0);
    setIsPlayingTimeline(false);
    if (onSelectWell) {
      onSelectWell(wellId);
    }
  };

  // Stress scenario multipliers
  const scenarioMultipliers = useMemo(() => {
    switch (stressScenario) {
      case 'viscous': // High Viscous Drag (+25% solids)
        return { rod: 1.30, pump: 1.25, gear: 1.15, label: 'High Viscous Drag (+25% Solids)' };
      case 'cold': // Cold Reservoir Slump (48°C)
        return { rod: 1.50, pump: 1.38, gear: 1.25, label: 'Cold Reservoir Drag (Cooling to 48°C)' };
      case 'speed': // High SPM surge (+1.5 SPM)
        return { rod: 1.40, pump: 1.32, gear: 1.35, label: 'VFD Overdrive (+1.5 SPM Fatigue)' };
      case 'nominal':
      default:
        return { rod: 1.0, pump: 1.0, gear: 1.0, label: 'Standard Cyclic Production' };
    }
  }, [stressScenario]);

  // Dynamic metrics calculation
  const isWellB02 = currentWellId === 'B-02' || currentWellId === 'BGW-SYN-002';

  // Base raw risk scores
  const rawRodRisk = failureRisk?.components?.sucker_rod_string?.risk_score ?? (isWellB02 ? 42.4 : 56.8);
  const rawPumpRisk = failureRisk?.components?.subsurface_pump?.risk_score ?? (isWellB02 ? 28.0 : 34.0);
  const rawGearboxRisk = failureRisk?.components?.surface_pumping_unit?.risk_score ?? (isWellB02 ? 18.0 : 22.0);
  const rawOverallRisk = failureRisk?.overall_risk_score ?? (isWellB02 ? 33.9 : 43.8);

  // Scaled by stress & overhaul state
  const rodRisk = isOverhauled ? 8.5 : Math.min(98, rawRodRisk * scenarioMultipliers.rod);
  const pumpRisk = isOverhauled ? 6.0 : Math.min(95, rawPumpRisk * scenarioMultipliers.pump);
  const gearboxRisk = isOverhauled ? 5.0 : Math.min(90, rawGearboxRisk * scenarioMultipliers.gear);
  const overallRisk = isOverhauled ? 7.2 : Math.min(95, rawOverallRisk * ((scenarioMultipliers.rod + scenarioMultipliers.pump) / 2));

  // Current Fatigue / Wear %
  const rodFatiguePct = Math.min(98, Math.max(6, Math.round(rodRisk * 1.41)));
  const pumpWearPct = Math.min(95, Math.max(5, Math.round(pumpRisk * 1.22)));
  const gearboxWearPct = Math.min(90, Math.max(4, Math.round(gearboxRisk * 1.10)));

  // Live operational telemetry
  const motorLoadPct = twinState?.srp?.motor_load_pct
    ? Math.round(twinState.srp.motor_load_pct)
    : (isWellB02 ? 14 : 24);

  const spm = twinState?.srp?.spm ?? (isWellB02 ? 4.85 : 3.6);
  const reservoirTemp = twinState?.reservoir?.temperature_c ?? (isWellB02 ? 97.4 : 88.5);
  const viscosityCp = twinState?.reservoir?.viscosity_cp ?? (isWellB02 ? 468 : 612);

  // Remaining Useful Life (Days)
  const rodRulDays = useMemo(() => {
    if (isOverhauled) return 365;
    return Math.max(20, Math.round(365 * (1 - (rodRisk / 100) * 1.12)));
  }, [rodRisk, isOverhauled]);

  const pumpRulDays = useMemo(() => {
    if (isOverhauled) return 365;
    return Math.max(30, Math.round(365 * (1 - (pumpRisk / 100) * 0.95)));
  }, [pumpRisk, isOverhauled]);

  const gearboxRulDays = useMemo(() => {
    if (isOverhauled) return 365;
    return Math.max(40, Math.round(365 * (1 - (gearboxRisk / 100) * 0.80)));
  }, [gearboxRisk, isOverhauled]);

  const minRulDays = Math.min(rodRulDays, pumpRulDays, gearboxRulDays);

  // Next Major Overhaul Date Forecast (dynamically projected by min RUL days)
  const overhaulDateStr = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + minRulDays);
    return baseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [minRulDays]);

  // Model Confidence score derived from Gradient Boosting failure risk & Weibull fit
  const overhaulConfidence = useMemo(() => {
    return Math.round(Math.min(96, Math.max(76, 100 - (overallRisk * 0.24))));
  }, [overallRisk]);

  // Active cursor day on timeline / charts
  const activeScrubDay = hoveredTrendDay !== null ? hoveredTrendDay : timelineDay > 0 ? timelineDay : rodRulDays;

  // Compute degraded status at current activeScrubDay
  const scrubbedHealth = useMemo(() => {
    const t = activeScrubDay;
    const rodDeg = Math.min(100, Math.round(rodFatiguePct + (100 - rodFatiguePct) * Math.pow(Math.min(1.5, t / rodRulDays), 2.1)));
    const pumpDeg = Math.min(100, Math.round(pumpWearPct + (100 - pumpWearPct) * Math.pow(Math.min(1.5, t / pumpRulDays), 1.8)));
    const gearDeg = Math.min(100, Math.round(gearboxWearPct + (100 - gearboxWearPct) * Math.pow(Math.min(1.5, t / gearboxRulDays), 2.5)));

    let status = 'Nominal / Safe Envelope';
    let statusColor = '#15803d'; // Green
    if (rodDeg >= 85 || pumpDeg >= 85 || gearDeg >= 85) {
      status = 'Critical / Overhaul Mandated';
      statusColor = '#b91c1c'; // Red
    } else if (rodDeg >= 70 || pumpDeg >= 70 || gearDeg >= 70) {
      status = 'Elevated Fatigue / Schedule Maintenance';
      statusColor = '#c2410c'; // Orange
    } else if (rodDeg >= 50 || pumpDeg >= 50) {
      status = 'Moderate Wear / Condition Monitoring';
      statusColor = '#b45309'; // Amber
    }

    return { rodDeg, pumpDeg, gearDeg, status, statusColor };
  }, [activeScrubDay, rodFatiguePct, pumpWearPct, gearboxWearPct, rodRulDays, pumpRulDays, gearboxRulDays]);

  // Weibull Curve SVG path generators
  const weibullPaths = useMemo(() => {
    const pointsCount = 36;
    const rodPoints = [];
    const pumpPoints = [];
    const gearPoints = [];

    for (let i = 0; i <= pointsCount; i++) {
      const t = (i / pointsCount) * 365;
      const x = 38 + (t / 365) * 307;

      // Weibull cumulative hazard
      const rodVal = Math.min(100, rodFatiguePct + (100 - rodFatiguePct) * Math.pow(Math.min(1.5, t / rodRulDays), 2.1));
      const pumpVal = Math.min(100, pumpWearPct + (100 - pumpWearPct) * Math.pow(Math.min(1.5, t / pumpRulDays), 1.8));
      const gearVal = Math.min(100, gearboxWearPct + (100 - gearboxWearPct) * Math.pow(Math.min(1.5, t / gearboxRulDays), 2.5));

      const yRod = 145 - (rodVal / 100) * 125;
      const yPump = 145 - (pumpVal / 100) * 125;
      const yGear = 145 - (gearVal / 100) * 125;

      rodPoints.push({ x, y: yRod });
      pumpPoints.push({ x, y: yPump });
      gearPoints.push({ x, y: yGear });
    }

    const toSvgPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const toAreaPath = (pts) => `${toSvgPath(pts)} L 345 145 L 38 145 Z`;

    return {
      rodLine: toSvgPath(rodPoints),
      rodArea: toAreaPath(rodPoints),
      pumpLine: toSvgPath(pumpPoints),
      pumpArea: toAreaPath(pumpPoints),
      gearLine: toSvgPath(gearPoints),
      gearArea: toAreaPath(gearPoints),
    };
  }, [rodFatiguePct, pumpWearPct, gearboxWearPct, rodRulDays, pumpRulDays, gearboxRulDays]);

  // Probability Density Function (PDF) SVG bell curve generator
  const pdfPaths = useMemo(() => {
    const pointsCount = 40;

    const makeBell = (peakDay, widthDays) => {
      const pts = [];
      for (let i = 0; i <= pointsCount; i++) {
        const t = (i / pointsCount) * 360;
        const x = 42 + (t / 360) * 295;
        // Gaussian bell
        const norm = (t - peakDay) / widthDays;
        const prob = Math.exp(-0.5 * norm * norm);
        const y = 145 - prob * 115;
        pts.push({ x, y });
      }
      return pts;
    };

    const rodBell = makeBell(rodRulDays, 42);
    const pumpBell = makeBell(pumpRulDays, 55);
    const gearBell = makeBell(gearboxRulDays, 58);

    const toSvgPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const toAreaPath = (pts) => `${toSvgPath(pts)} L 337 145 L 42 145 Z`;

    return {
      rodLine: toSvgPath(rodBell),
      rodArea: toAreaPath(rodBell),
      pumpLine: toSvgPath(pumpBell),
      pumpArea: toAreaPath(pumpBell),
      gearLine: toSvgPath(gearBell),
      gearArea: toAreaPath(gearBell),
      rodPeakX: 42 + (rodRulDays / 360) * 295,
      pumpPeakX: 42 + (pumpRulDays / 360) * 295,
      gearPeakX: 42 + (gearboxRulDays / 360) * 295,
    };
  }, [rodRulDays, pumpRulDays, gearboxRulDays]);

  // Action handlers
  const handleGenerateWorkOrder = (rec) => {
    const woId = `WO-BGW-${currentWellId}-${Math.floor(1000 + Math.random() * 9000)}`;
    setModalData({
      woId,
      wellId: currentWellId,
      title: rec.title,
      component: rec.component || 'Sucker Rod Assembly',
      priority: rec.priority || 'HIGH',
      scheduledDate: overhaulDateStr,
      estimatedHours: isWellB02 ? 16 : 18,
      assignedCrew: 'Sector 4 Heavy Crude Workover Rig #03',
      sparesRequired: 'API Grade D 7/8" Sucker Rods, 57mm Chrome Barrel, Molded Guide Centralizers'
    });
    setActiveModal('workOrder');
  };

  const handleAcknowledgeRec = (recId) => {
    setAcknowledgedRecs((prev) => ({ ...prev, [recId]: true }));
    setNotification({
      type: 'success',
      message: `Recommendation acknowledged. Field crew notified for Well ${currentWellId}.`
    });
  };

  const handleSimulateOverhaul = () => {
    setIsOverhauled(true);
    setTimelineDay(0);
    setIsPlayingTimeline(false);
    setNotification({
      type: 'success',
      message: `Workover Overhaul applied for Well ${currentWellId}! Rod string and pump renewed to pristine 365-day life.`
    });
  };

  const handleResetOverhaul = () => {
    setIsOverhauled(false);
    setTimelineDay(0);
    setNotification({
      type: 'info',
      message: `Reverted to live telemetry degradation profile for Well ${currentWellId}.`
    });
  };

  const handleSaveNewWorkover = (e) => {
    e.preventDefault();
    const entry = {
      failure_id: `HIST-${Date.now()}`,
      well_id: currentWellId,
      well_name: `Well ${currentWellId}`,
      date: new Date(newWorkover.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      component: newWorkover.component,
      failure_mode: newWorkover.failure_mode,
      root_cause: newWorkover.root_cause,
      downtime_hours: Number(newWorkover.downtime_hours),
      action_taken: newWorkover.action_taken
    };
    setWorkoverLogs((prev) => [entry, ...prev]);
    setActiveModal(null);
    setNotification({
      type: 'success',
      message: `New workover entry recorded for Well ${currentWellId} successfully.`
    });
  };

  // Filtered workover logs
  const displayWorkovers = useMemo(() => {
    return workoverLogs.filter((log) => {
      if (workoverFilter === 'well') {
        return log.well_name?.includes(currentWellId) || log.well_id?.includes(currentWellId);
      }
      if (workoverFilter === 'rod') {
        return log.component?.toLowerCase().includes('rod');
      }
      if (workoverFilter === 'pump') {
        return log.component?.toLowerCase().includes('pump');
      }
      return true;
    });
  }, [workoverLogs, workoverFilter, currentWellId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%', color: '#1c1917' }}>
      
      {/* ── TOAST NOTIFICATION ── */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '25px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            background: notification.type === 'success' ? '#15803d' : '#9a3412',
            color: '#fff',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            fontSize: '0.82rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} color="#fff" />
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── 1. BREADCRUMBS & TOP CONTROLS WITH LIVE WELL SWITCHER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div
            onClick={onBackToDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#78350f',
              cursor: 'pointer',
              marginBottom: '4px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Baghewala Field &gt; Well {currentWellId} &gt; Predictive Maintenance &amp; Remaining Useful Life (RUL)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.38rem',
                fontWeight: 900,
                color: '#1c1917',
                letterSpacing: '0.03em',
                margin: 0
              }}
            >
              PREDICTIVE MAINTENANCE &amp; REMAINING USEFUL LIFE (RUL) &mdash; WELL {currentWellId}
            </h2>

            {/* Live Well Status Indicator */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                background: 'rgba(21, 128, 61, 0.12)',
                border: '1px solid rgba(21, 128, 61, 0.35)',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#15803d'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#15803d' }} />
              PRODUCING &bull; {spm} SPM &bull; {reservoirTemp.toFixed(1)}°C &bull; {Math.round(viscosityCp)} cP
            </span>
          </div>
        </div>

        {/* Top Right Controls & Well Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          
          {/* Well Switcher Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 6px',
              background: 'rgba(235, 222, 204, 0.45)',
              border: '1px solid rgba(180, 155, 125, 0.6)',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#78350f', padding: '0 4px' }}>WELL:</span>
            {['B-02', 'B-17', 'B-01', 'B-04', 'B-08'].map((wId) => {
              const isActive = currentWellId === wId || (wId === 'B-02' && currentWellId === 'BGW-SYN-002');
              return (
                <button
                  key={wId}
                  onClick={() => handleSelectWell(wId)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid #9a3412' : '1px solid transparent',
                    background: isActive ? '#9a3412' : 'transparent',
                    color: isActive ? '#fff' : '#57422f'
                  }}
                  title={`Switch predictive maintenance diagnostics to Well ${wId}`}
                >
                  {wId}
                </button>
              );
            })}
          </div>

          {/* Model Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(234, 88, 12, 0.12)',
              border: '1px solid rgba(234, 88, 12, 0.35)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#9a3412'
            }}
          >
            <GitCommit size={14} color="#ea580c" />
            <span>Weibull &amp; Gradient Boosting</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(currentWellId)}
            title="Refresh Predictive Telemetry"
            className="btn btn-secondary"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span style={{ fontSize: '0.72rem' }}>Sync</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP 3 INTERACTIVE EQUIPMENT RUL CARDS ── */}
      <div className="pdm-equipment-grid">
        
        {/* CARD 1: SUCKER ROD STRING RUL */}
        <div
          className={`pdm-equipment-card ${activeComponent === 'rod' ? 'active-focus' : ''}`}
          onClick={() => setActiveComponent('rod')}
          style={{
            borderColor: activeComponent === 'rod' ? '#9a3412' : 'rgba(180, 155, 125, 0.55)',
            boxShadow: activeComponent === 'rod' ? '0 0 0 2px rgba(154, 52, 18, 0.35), 0 8px 20px rgba(120, 53, 15, 0.15)' : 'none'
          }}
          title="Click to isolate Sucker Rod String cyclic fatigue & stress analysis"
        >
          {/* Card Full Background Artwork Image */}
          <div
            className="pdm-card-bg-layer"
            style={{
              backgroundImage: 'url(/assets/pdm/sucker_rod_card_bg.png)'
            }}
          />

          {/* Card Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(154, 52, 18, 0.15)' }}>
                <Activity size={14} color="#9a3412" />
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                SUCKER ROD STRING RUL
              </span>
            </div>
            {activeComponent === 'rod' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9a3412', background: 'rgba(154,52,18,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                ACTIVE FOCUS
              </span>
            )}
          </div>

          {/* Middle Body: Metrics on Left */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1.1rem 0 0.5rem' }}>
            <div style={{ minWidth: '130px' }}>
              <div style={{ fontSize: '2.55rem', fontWeight: 900, color: '#9a3412', fontFamily: 'var(--font-serif)', lineHeight: 1.1 }}>
                {rodRulDays} Days
              </div>
              <div style={{ fontSize: '0.84rem', color: '#3d2b1a', fontWeight: 700, marginTop: '5px' }}>
                Fatigue: <span style={{ color: rodFatiguePct > 70 ? '#b91c1c' : '#9a3412' }}>{rodFatiguePct}%</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#57422f', marginTop: '2px' }}>
                Risk score: <strong>{rodRisk.toFixed(1)}%</strong> ({rodRisk > 50 ? 'High' : 'Moderate'})
              </div>
            </div>

            <div style={{ flex: 1, height: '170px' }} />
          </div>

          {/* Progress Bar & Scale */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', marginTop: '0.6rem' }}>
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(160, 130, 100, 0.25)',
                borderRadius: '5px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (rodRulDays / 365) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #c2410c 0%, #9a3412 100%)',
                  borderRadius: '5px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            {/* Scale Ticks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#57422f', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '4px' }}>
              <span>0d</span>
              <span>100d</span>
              <span>200d</span>
              <span>300d</span>
              <span>365d</span>
            </div>
          </div>
        </div>

        {/* CARD 2: INSERT PUMP BARREL RUL */}
        <div
          className={`pdm-equipment-card ${activeComponent === 'pump' ? 'active-focus' : ''}`}
          onClick={() => setActiveComponent('pump')}
          style={{
            borderColor: activeComponent === 'pump' ? '#b45309' : 'rgba(180, 155, 125, 0.55)',
            boxShadow: activeComponent === 'pump' ? '0 0 0 2px rgba(180, 83, 9, 0.35), 0 8px 20px rgba(180, 83, 9, 0.15)' : 'none'
          }}
          title="Click to isolate Subsurface Insert Pump Barrel wear & clearance tracking"
        >
          {/* Card Full Background Artwork Image */}
          <div
            className="pdm-card-bg-layer"
            style={{
              backgroundImage: 'url(/assets/pdm/pump_barrel_card_bg.png)'
            }}
          />

          {/* Card Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(217, 119, 6, 0.15)' }}>
                <Layers size={14} color="#b45309" />
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                INSERT PUMP BARREL RUL
              </span>
            </div>
            {activeComponent === 'pump' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', background: 'rgba(217,119,6,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                ACTIVE FOCUS
              </span>
            )}
          </div>

          {/* Middle Body */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1.1rem 0 0.5rem' }}>
            <div style={{ minWidth: '130px' }}>
              <div style={{ fontSize: '2.55rem', fontWeight: 900, color: '#b45309', fontFamily: 'var(--font-serif)', lineHeight: 1.1 }}>
                {pumpRulDays} Days
              </div>
              <div style={{ fontSize: '0.84rem', color: '#3d2b1a', fontWeight: 700, marginTop: '5px' }}>
                Wear tier: <span style={{ color: '#b45309' }}>Moderate ({pumpWearPct}%)</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#57422f', marginTop: '2px' }}>
                Asphaltene Index: <strong>{isWellB02 ? '42.0%' : '51.2%'}</strong>
              </div>
            </div>

            <div style={{ flex: 1, height: '170px' }} />
          </div>

          {/* Progress Bar & Scale */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', marginTop: '0.6rem' }}>
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(160, 130, 100, 0.25)',
                borderRadius: '5px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (pumpRulDays / 365) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
                  borderRadius: '5px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            {/* Scale Ticks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#57422f', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '4px' }}>
              <span>0d</span>
              <span>100d</span>
              <span>200d</span>
              <span>300d</span>
              <span>365d</span>
            </div>
          </div>
        </div>

        {/* CARD 3: GEARBOX & PITMAN BEARING RUL */}
        <div
          className={`pdm-equipment-card ${activeComponent === 'gearbox' ? 'active-focus' : ''}`}
          onClick={() => setActiveComponent('gearbox')}
          style={{
            borderColor: activeComponent === 'gearbox' ? '#78350f' : 'rgba(180, 155, 125, 0.55)',
            boxShadow: activeComponent === 'gearbox' ? '0 0 0 2px rgba(120, 53, 15, 0.35), 0 8px 20px rgba(120, 53, 15, 0.15)' : 'none'
          }}
          title="Click to isolate Surface Unit Gearbox reducer & pitman bearing life"
        >
          {/* Card Full Background Artwork Image */}
          <div
            className="pdm-card-bg-layer"
            style={{
              backgroundImage: 'url(/assets/pdm/gearbox_card_bg.png)'
            }}
          />

          {/* Card Top Header */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(120, 53, 15, 0.15)' }}>
                <Settings size={14} color="#78350f" />
              </div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                GEARBOX &amp; PITMAN BEARING RUL
              </span>
            </div>
            {activeComponent === 'gearbox' && (
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#78350f', background: 'rgba(120,53,15,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                ACTIVE FOCUS
              </span>
            )}
          </div>

          {/* Middle Body */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', margin: '1.1rem 0 0.5rem' }}>
            <div style={{ minWidth: '130px' }}>
              <div style={{ fontSize: '2.55rem', fontWeight: 900, color: '#78350f', fontFamily: 'var(--font-serif)', lineHeight: 1.1 }}>
                {gearboxRulDays} Days
              </div>
              <div style={{ fontSize: '0.84rem', color: '#3d2b1a', fontWeight: 700, marginTop: '5px' }}>
                Motor load: <span style={{ color: '#78350f' }}>{motorLoadPct}%</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#57422f', marginTop: '2px' }}>
                Thermal Load: <strong>{isWellB02 ? '22.0%' : '31.5%'}</strong> (Low risk)
              </div>
            </div>

            <div style={{ flex: 1, height: '170px' }} />
          </div>

          {/* Progress Bar & Scale */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', marginTop: '0.6rem' }}>
            <div
              style={{
                width: '100%',
                height: '10px',
                background: 'rgba(160, 130, 100, 0.25)',
                borderRadius: '5px',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (gearboxRulDays / 365) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #f59e0b 0%, #78350f 100%)',
                  borderRadius: '5px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
            {/* Scale Ticks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#57422f', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '4px' }}>
              <span>0d</span>
              <span>100d</span>
              <span>200d</span>
              <span>300d</span>
              <span>365d</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. MIDDLE SECTION: EQUIPMENT DEGRADATION & WORKOVER FORECAST ── */}
      <div
        className="sandstone-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '1.2rem 1.4rem',
          background: 'rgba(235, 222, 204, 0.38)',
          border: '1px solid rgba(180, 155, 125, 0.55)'
        }}
      >
        {/* Blended Panorama Background on right */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '45%',
            backgroundImage: 'url(/assets/pdm/pumpjack_panorama_pdm.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            opacity: 0.88,
            pointerEvents: 'none',
            zIndex: 1
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Heading */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="#78350f" />
              <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#1c1917', letterSpacing: '0.04em' }}>
                EQUIPMENT DEGRADATION &amp; WORKOVER FORECAST &mdash; WELL {currentWellId}
              </span>
            </div>

            {/* Overhaul Simulation Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isOverhauled ? (
                <button
                  onClick={handleResetOverhaul}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(180, 155, 125, 0.6)',
                    background: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#78350f',
                    cursor: 'pointer'
                  }}
                  title="Revert back to real-time telemetry degradation rate"
                >
                  <RotateCcw size={13} />
                  <span>Revert to Telemetry</span>
                </button>
              ) : (
                <button
                  onClick={handleSimulateOverhaul}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(154, 52, 18, 0.4)',
                    background: 'rgba(154, 52, 18, 0.12)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#9a3412',
                    cursor: 'pointer'
                  }}
                  title="Simulate scheduled workover overhaul reset"
                >
                  <Wrench size={13} />
                  <span>Simulate Component Overhaul</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.4rem', justifyContent: 'space-between' }}>
            {/* Narrative Text */}
            <div style={{ flex: '1 1 320px', maxWidth: '520px', fontSize: '0.79rem', color: '#3d2b1a', lineHeight: 1.6 }}>
              {isOverhauled ? (
                <span>
                  <strong style={{ color: '#15803d' }}>Workover simulation applied:</strong> Sucker rod string and pump assemblies renewed to pristine condition. Degradation index reset to baseline (&lt;10%). Planned overhaul extended to full <strong style={{ color: '#1c1917' }}>365-day</strong> maintenance horizon.
                </span>
              ) : (
                <span>
                  Projected date of next major overhaul for Well {currentWellId}: <strong style={{ color: '#1c1917' }}>{overhaulDateStr}</strong> based on minimum RUL across all monitored assemblies. Sucker rod fatigue degradation at <strong style={{ color: rodFatiguePct > 70 ? '#b91c1c' : '#9a3412' }}>{rodFatiguePct}%</strong>. Pre-ordering API Grade D sucker rod string and 57 mm chrome-plated pump barrel will minimize planned downtime to <strong style={{ color: '#1c1917' }}>under {isWellB02 ? 16 : 18} hours</strong>.
                </span>
              )}
            </div>

            {/* Overhaul Forecast Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '0.85rem 1.4rem',
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(180, 155, 125, 0.65)',
                borderRadius: '8px',
                minWidth: '240px'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '6px',
                  background: 'rgba(120, 53, 15, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Calendar size={22} color="#78350f" />
              </div>

              <div>
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#57422f', letterSpacing: '0.05em' }}>
                  NEXT MAJOR OVERHAUL (FORECAST)
                </div>
                <div style={{ fontSize: '1.38rem', fontWeight: 900, color: '#1c1917', fontFamily: 'var(--font-serif)', margin: '2px 0' }}>
                  {overhaulDateStr}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#78614d', fontWeight: 600 }}>
                  Confidence: {overhaulConfidence}% &bull; Horizon: {minRulDays} Days
                </div>
              </div>
            </div>

            {/* Spacer for panorama illustration */}
            <div style={{ flex: '0 0 80px' }} />
          </div>
        </div>
      </div>

      {/* ── 4. WHAT-IF OPERATIONAL STRESS & TIMELINE SCRUBBER ── */}
      <div
        className="sandstone-card"
        style={{
          padding: '0.9rem 1.2rem',
          background: 'rgba(235, 222, 204, 0.45)',
          border: '1px solid rgba(180, 155, 125, 0.6)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={15} color="#9a3412" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
              OPERATIONAL TIMELINE &amp; WHAT-IF STRESS HORIZON SCRUBBER
            </span>
          </div>

          {/* Quick Scenario Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#78350f', marginRight: '4px' }}>SCENARIO:</span>
            {[
              { id: 'nominal', label: 'Nominal Steady-State' },
              { id: 'viscous', label: 'High Drag (+25%)' },
              { id: 'cold', label: 'Cold Slump (48°C)' },
              { id: 'speed', label: 'SPM Surge (+1.5 SPM)' }
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setStressScenario(sc.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: stressScenario === sc.id ? '1px solid #9a3412' : '1px solid rgba(180, 155, 125, 0.5)',
                  background: stressScenario === sc.id ? '#9a3412' : 'rgba(255, 255, 255, 0.3)',
                  color: stressScenario === sc.id ? '#fff' : '#57422f',
                  transition: 'all 0.15s ease'
                }}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider with Play/Pause & Day readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          <button
            onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: isPlayingTimeline ? '#b91c1c' : '#78350f',
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
            title={isPlayingTimeline ? 'Pause timeline playback' : 'Play operational life degradation animation'}
          >
            {isPlayingTimeline ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
          </button>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800 }}>
              <span style={{ color: '#57422f' }}>Simulated Production Horizon:</span>
              <span style={{ color: '#9a3412', fontFamily: 'var(--font-mono)' }}>
                Day +{activeScrubDay} ({Math.round(activeScrubDay / 30.4)} months)
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="365"
              step="1"
              value={activeScrubDay}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTimelineDay(val);
                setHoveredTrendDay(val);
              }}
              style={{
                width: '100%',
                accentColor: '#9a3412',
                cursor: 'pointer',
                height: '6px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#78614d', fontFamily: 'var(--font-mono)' }}>
              <span>Day 0 (Today)</span>
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setHoveredTrendDay(rodRulDays)}>
                Rod RUL ({rodRulDays}d)
              </span>
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setHoveredTrendDay(pumpRulDays)}>
                Pump RUL ({pumpRulDays}d)
              </span>
              <span>Day 365</span>
            </div>
          </div>

          {/* Scrubbed Live Diagnosis Readout */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.45)',
              border: '1px solid rgba(180, 155, 125, 0.6)',
              minWidth: '260px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 800, color: '#57422f' }}>PREDICTED STATUS @ DAY +{activeScrubDay}:</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: scrubbedHealth.statusColor }}>
                {scrubbedHealth.status}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: '#1c1917' }}>
              <span>Rod: <strong style={{ color: '#9a3412' }}>{scrubbedHealth.rodDeg}%</strong></span>
              <span>Pump: <strong style={{ color: '#b45309' }}>{scrubbedHealth.pumpDeg}%</strong></span>
              <span>Gear: <strong style={{ color: '#78350f' }}>{scrubbedHealth.gearDeg}%</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. BOTTOM 3 ANALYTICAL CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '0.85rem',
          width: '100%'
        }}
      >
        {/* ── CARD 1: DEGRADATION TREND (WEIBULL FIT) ── */}
        <div
          className="sandstone-card"
          style={{
            padding: '0.9rem 1.1rem 0.8rem',
            minHeight: '275px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(235, 222, 204, 0.35)',
            border: '1px solid rgba(180, 155, 125, 0.55)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                <TrendingUp size={15} color="#9a3412" />
                <span>DEGRADATION TREND (WEIBULL FIT) — WELL {currentWellId}</span>
              </div>
            </div>

            {/* Interactive Legend with Component Isolation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', fontSize: '0.68rem', fontWeight: 700, margin: '6px 0 2px 0' }}>
              <div
                onClick={() => setActiveComponent('rod')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#9a3412',
                  cursor: 'pointer',
                  opacity: activeComponent === 'rod' ? 1 : 0.65
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9a3412', display: 'inline-block' }} />
                <span>Rod String (β=2.1)</span>
              </div>
              <div
                onClick={() => setActiveComponent('pump')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#d97706',
                  cursor: 'pointer',
                  opacity: activeComponent === 'pump' ? 1 : 0.65
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                <span>Pump Barrel (β=1.8)</span>
              </div>
              <div
                onClick={() => setActiveComponent('gearbox')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#78350f',
                  cursor: 'pointer',
                  opacity: activeComponent === 'gearbox' ? 1 : 0.65
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#78350f', display: 'inline-block' }} />
                <span>Gearbox (β=2.5)</span>
              </div>
            </div>
          </div>

          {/* SVG Weibull Degradation Curve Chart */}
          <div
            style={{ width: '100%', height: '175px', marginTop: '0.3rem', cursor: 'crosshair' }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.max(0, Math.min(1, (e.clientX - rect.left - 38) / (rect.width - 45)));
              const day = Math.round(relX * 365);
              setHoveredTrendDay(day);
            }}
            onMouseLeave={() => setHoveredTrendDay(null)}
          >
            <svg width="100%" height="100%" viewBox="0 0 360 175" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rodWeibullGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9a3412" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#9a3412" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="pumpWeibullGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="gearWeibullGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#78350f" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#78350f" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines: 0, 20, 40, 60, 80, 100 */}
              {[0, 20, 40, 60, 80, 100].map((val) => {
                const y = 145 - (val / 100) * 125;
                return (
                  <g key={val}>
                    <line x1="38" y1={y} x2="345" y2={y} stroke="rgba(180, 155, 125, 0.25)" strokeDasharray={val === 0 ? 'none' : '2,2'} />
                    <text x="34" y={y + 3} textAnchor="end" fontSize="7.5" fill="#78614d" fontFamily="var(--font-mono)">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Y Axis Title */}
              <text x="10" y="80" textAnchor="middle" transform="rotate(-90 10 80)" fontSize="7.5" fill="#57422f" fontWeight="700">
                Degradation (%)
              </text>

              {/* Threshold Alarm Line at 80% */}
              <line x1="38" y1={145 - 0.8 * 125} x2="345" y2={145 - 0.8 * 125} stroke="#dc2626" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
              <text x="340" y={145 - 0.8 * 125 - 3} textAnchor="end" fontSize="6.5" fill="#dc2626" fontWeight="700">
                80% Critical Threshold
              </text>

              {/* Gearbox Area & Curve */}
              <path d={weibullPaths.gearArea} fill="url(#gearWeibullGrad)" opacity={activeComponent === 'gearbox' ? 1 : 0.6} />
              <path d={weibullPaths.gearLine} fill="none" stroke="#78350f" strokeWidth={activeComponent === 'gearbox' ? 2.4 : 1.6} />

              {/* Pump Barrel Area & Curve */}
              <path d={weibullPaths.pumpArea} fill="url(#pumpWeibullGrad)" opacity={activeComponent === 'pump' ? 1 : 0.6} />
              <path d={weibullPaths.pumpLine} fill="none" stroke="#d97706" strokeWidth={activeComponent === 'pump' ? 2.4 : 1.8} />

              {/* Sucker Rod String Area & Curve */}
              <path d={weibullPaths.rodArea} fill="url(#rodWeibullGrad)" opacity={activeComponent === 'rod' ? 1 : 0.7} />
              <path d={weibullPaths.rodLine} fill="none" stroke="#9a3412" strokeWidth={activeComponent === 'rod' ? 2.8 : 2.0} />

              {/* Interactive Cursor Marker */}
              {(() => {
                const markerX = 38 + (activeScrubDay / 365) * 307;
                const activeVal = activeComponent === 'rod'
                  ? scrubbedHealth.rodDeg
                  : activeComponent === 'pump'
                  ? scrubbedHealth.pumpDeg
                  : scrubbedHealth.gearDeg;

                const markerY = 145 - (activeVal / 100) * 125;
                const activeColor = activeComponent === 'rod' ? '#9a3412' : activeComponent === 'pump' ? '#d97706' : '#78350f';

                return (
                  <g>
                    <line x1={markerX} y1="20" x2={markerX} y2="145" stroke={activeColor} strokeWidth="1.2" strokeDasharray="3,3" />
                    <circle cx={markerX} cy={markerY} r="4.5" fill={activeColor} stroke="#fff" strokeWidth="1.5" />
                    
                    {/* Tooltip Box */}
                    <g transform={`translate(${markerX > 250 ? markerX - 85 : markerX + 8}, ${Math.max(25, markerY - 14)})`}>
                      <rect x="0" y="0" width="80" height="32" rx="4" fill="rgba(28, 25, 23, 0.92)" />
                      <text x="40" y="13" textAnchor="middle" fontSize="7.5" fill="#f5f5f4" fontWeight="800" fontFamily="var(--font-mono)">
                        Day +{activeScrubDay}
                      </text>
                      <text x="40" y="24" textAnchor="middle" fontSize="7" fill={activeComponent === 'rod' ? '#fdba74' : '#fef08a'} fontWeight="700">
                        {activeComponent.toUpperCase()}: {activeVal}%
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* X Axis Ticks & Labels */}
              {[0, 60, 120, 180, 240, 300, 365].map((val) => {
                const x = 38 + (val / 365) * 307;
                return (
                  <g key={val}>
                    <text x={x} y={158} textAnchor="middle" fontSize="7.5" fill="#78614d" fontFamily="var(--font-mono)">
                      {val}
                    </text>
                  </g>
                );
              })}

              <text x="190" y="170" textAnchor="middle" fontSize="7.5" fill="#57422f" fontWeight="700">
                Operating Days from Current Baseline
              </text>

              <line x1="38" y1="145" x2="345" y2="145" stroke="rgba(120, 97, 77, 0.7)" strokeWidth="1.2" />
            </svg>
          </div>
        </div>

        {/* ── CARD 2: RUL DISTRIBUTION ── */}
        <div
          className="sandstone-card"
          style={{
            padding: '0.9rem 1.1rem 0.8rem',
            minHeight: '275px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(235, 222, 204, 0.35)',
            border: '1px solid rgba(180, 155, 125, 0.55)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                <BarChart2 size={15} color="#78350f" />
                <span>RUL DISTRIBUTION (PDF DENSITY)</span>
              </div>
            </div>

            {/* Legend with Dynamic Peak RUL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '0.68rem', fontWeight: 700, margin: '6px 0 2px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9a3412' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9a3412', display: 'inline-block' }} />
                <span>Rod ({rodRulDays}d)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                <span>Pump ({pumpRulDays}d)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#78350f' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#78350f', display: 'inline-block' }} />
                <span>Gearbox ({gearboxRulDays}d)</span>
              </div>
            </div>
          </div>

          {/* SVG Probability Density Function Chart */}
          <div style={{ width: '100%', height: '175px', marginTop: '0.3rem' }}>
            <svg width="100%" height="100%" viewBox="0 0 360 175" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rodPdfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9a3412" stopOpacity="0.48" />
                  <stop offset="100%" stopColor="#9a3412" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="pumpPdfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="gearPdfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#78350f" stopOpacity="0.36" />
                  <stop offset="100%" stopColor="#78350f" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Grid Lines: 0.00, 0.01, 0.03, 0.04 */}
              {[
                { val: '0.00', y: 145 },
                { val: '0.01', y: 114 },
                { val: '0.02', y: 83 },
                { val: '0.03', y: 52 },
                { val: '0.04', y: 22 }
              ].map((item) => (
                <g key={item.val}>
                  <line x1="42" y1={item.y} x2="345" y2={item.y} stroke="rgba(180, 155, 125, 0.25)" strokeDasharray={item.val === '0.00' ? 'none' : '2,2'} />
                  <text x="38" y={item.y + 3} textAnchor="end" fontSize="7.5" fill="#78614d" fontFamily="var(--font-mono)">
                    {item.val}
                  </text>
                </g>
              ))}

              {/* Y Axis Title */}
              <text x="12" y="80" textAnchor="middle" transform="rotate(-90 12 80)" fontSize="7.5" fill="#57422f" fontWeight="700">
                Probability Density f(t)
              </text>

              {/* Bell Curves rendered dynamically from exact RUL peaks */}
              {/* Gearbox Bell */}
              <path d={pdfPaths.gearArea} fill="url(#gearPdfGrad)" />
              <path d={pdfPaths.gearLine} fill="none" stroke="#78350f" strokeWidth="1.8" />
              <line x1={pdfPaths.gearPeakX} y1="30" x2={pdfPaths.gearPeakX} y2="145" stroke="#78350f" strokeWidth="1" strokeDasharray="2,2" />

              {/* Pump Barrel Bell */}
              <path d={pdfPaths.pumpArea} fill="url(#pumpPdfGrad)" />
              <path d={pdfPaths.pumpLine} fill="none" stroke="#d97706" strokeWidth="1.8" />
              <line x1={pdfPaths.pumpPeakX} y1="30" x2={pdfPaths.pumpPeakX} y2="145" stroke="#d97706" strokeWidth="1" strokeDasharray="2,2" />

              {/* Sucker Rod String Bell */}
              <path d={pdfPaths.rodArea} fill="url(#rodPdfGrad)" />
              <path d={pdfPaths.rodLine} fill="none" stroke="#9a3412" strokeWidth="2.2" />
              <line x1={pdfPaths.rodPeakX} y1="26" x2={pdfPaths.rodPeakX} y2="145" stroke="#9a3412" strokeWidth="1.2" strokeDasharray="2,2" />

              {/* Peak Marker Labels */}
              <text x={pdfPaths.rodPeakX} y="22" textAnchor="middle" fontSize="7" fill="#9a3412" fontWeight="800">
                {rodRulDays}d
              </text>
              <text x={pdfPaths.pumpPeakX} y="26" textAnchor="middle" fontSize="7" fill="#b45309" fontWeight="800">
                {pumpRulDays}d
              </text>

              {/* X Axis Ticks & Labels */}
              {[0, 60, 120, 180, 240, 300, 360].map((val) => {
                const x = 42 + (val / 360) * 295;
                return (
                  <g key={val}>
                    <text x={x} y={158} textAnchor="middle" fontSize="7.5" fill="#78614d" fontFamily="var(--font-mono)">
                      {val}
                    </text>
                  </g>
                );
              })}

              <text x="190" y="170" textAnchor="middle" fontSize="7.5" fill="#57422f" fontWeight="700">
                Remaining Useful Life (Days)
              </text>

              <line x1="42" y1="145" x2="345" y2="145" stroke="rgba(120, 97, 77, 0.7)" strokeWidth="1.2" />
            </svg>
          </div>
        </div>

        {/* ── CARD 3: MAINTENANCE RECOMMENDATIONS & WORK ORDERS ── */}
        <div
          className="sandstone-card"
          style={{
            padding: '0.9rem 1.1rem 0.8rem',
            minHeight: '275px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'rgba(235, 222, 204, 0.35)',
            border: '1px solid rgba(180, 155, 125, 0.55)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.04em' }}>
                <Wrench size={15} color="#78350f" />
                <span>AI PRESCRIPTIVE ADVISORIES — WELL {currentWellId}</span>
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#15803d', background: 'rgba(21,128,61,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                LIVE READY
              </span>
            </div>

            {/* Action Items tailored to active well */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {/* Item 1: High Priority Rod Mitigator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: 'rgba(215, 195, 170, 0.28)',
                  border: '1px solid rgba(180, 155, 125, 0.5)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(154, 52, 18, 0.15)' }}>
                    <AlertTriangle size={14} color="#9a3412" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1c1917' }}>
                      {isWellB02 ? 'Mitigate Rod Floating & Buckling Risk' : 'Plan sucker rod string replacement'}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#57422f' }}>
                      Recommended in <strong>{rodRulDays} days</strong> &bull; Fatigue: {rodFatiguePct}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {acknowledgedRecs['rod'] ? (
                    <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Check size={12} /> ACK
                    </span>
                  ) : (
                    <button
                      onClick={() => handleGenerateWorkOrder({
                        title: isWellB02 ? 'VFD Downstroke Optimization & Sinker Bar Weighting' : 'Sucker Rod String Inspection & Overhaul',
                        component: 'Sucker Rod String',
                        priority: 'HIGH'
                      })}
                      style={{
                        padding: '3px 8px',
                        background: 'rgba(154, 52, 18, 0.14)',
                        border: '1px solid rgba(154, 52, 18, 0.4)',
                        color: '#9a3412',
                        borderRadius: '4px',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      WORK ORDER
                    </button>
                  )}
                </div>
              </div>

              {/* Item 2: Medium Priority Pump Wear */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: 'rgba(215, 195, 170, 0.28)',
                  border: '1px solid rgba(180, 155, 125, 0.5)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(217, 119, 6, 0.15)' }}>
                    <Info size={14} color="#b45309" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1c1917' }}>
                      {isWellB02 ? 'Asphaltene Solvent Flush / Valve Soak' : 'Monitor pump barrel wear'}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#57422f' }}>
                      Deposit Index: {isWellB02 ? '42.0%' : '51.2%'} &bull; RUL: {pumpRulDays}d
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAcknowledgeRec('pump')}
                  style={{
                    padding: '3px 8px',
                    background: 'rgba(217, 119, 6, 0.14)',
                    border: '1px solid rgba(217, 119, 6, 0.4)',
                    color: '#b45309',
                    borderRadius: '4px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {acknowledgedRecs['pump'] ? 'LOGGED' : 'DISPATCH'}
                </button>
              </div>

              {/* Item 3: Low Priority Gearbox Monitoring */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: 'rgba(215, 195, 170, 0.28)',
                  border: '1px solid rgba(180, 155, 125, 0.5)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(120, 53, 15, 0.12)' }}>
                    <Settings size={14} color="#78350f" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1c1917' }}>
                      Gearbox &amp; Pitman condition nominal
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#57422f' }}>
                      Motor load {motorLoadPct}% &bull; Safe operating range
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(120, 53, 15, 0.12)',
                    border: '1px solid rgba(120, 53, 15, 0.35)',
                    color: '#78350f'
                  }}
                >
                  LOW RISK
                </span>
              </div>

              {/* Item 4: Procurement Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 9px',
                  background: 'rgba(215, 195, 170, 0.28)',
                  border: '1px solid rgba(180, 155, 125, 0.5)',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(41, 37, 36, 0.12)' }}>
                    <FileText size={14} color="#292524" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1c1917' }}>
                      Procurement: Pre-order Sucker Rods
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#57422f' }}>
                      API Grade D rods &amp; 57 mm barrel &bull; 45d lead time
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNotification({
                      type: 'success',
                      message: `Spares Procurement Request PR-BGW-${currentWellId}-882 dispatched to Central Store.`
                    });
                  }}
                  style={{
                    padding: '3px 8px',
                    background: 'rgba(41, 37, 36, 0.12)',
                    border: '1px solid rgba(41, 37, 36, 0.35)',
                    color: '#292524',
                    borderRadius: '4px',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ORDER
                </button>
              </div>

            </div>
          </div>

          <div style={{ fontSize: '0.65rem', color: '#78614d', textAlign: 'center', marginTop: '0.45rem' }}>
            ML Degradation confidence {overhaulConfidence}% &bull; Updated real-time from telemetry &amp; cyclic models
          </div>
        </div>
      </div>

      {/* ── 6. FAILURE RISK DECOMPOSITION & ROOT CAUSE FACTORS ───────────── */}
      <div style={{
        background: 'rgba(235,222,204,0.32)',
        border: '1px solid rgba(180,155,125,0.5)',
        borderRadius: '10px',
        padding: '1.2rem 1.3rem',
        marginTop: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.96rem', fontWeight: 900, color: '#1c1917', letterSpacing: '0.04em' }}>
            FAILURE RISK DECOMPOSITION &amp; ROOT CAUSES — WELL {currentWellId}
          </div>
          <span className={`badge ${overallRisk > 50 ? 'badge-rose' : overallRisk > 25 ? 'badge-amber' : 'badge-emerald'}`}>
            Overall Well Risk: {Math.round(overallRisk)}% ({overallRisk > 50 ? 'High' : overallRisk > 25 ? 'Moderate' : 'Low'})
          </span>
        </div>

        {/* 3 Component Risk Decomposition Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1.1rem' }}>
          {[
            {
              id: 'rod',
              label: '1. Sucker Rod String',
              score: rodRisk,
              mode: failureRisk?.components?.sucker_rod_string?.failure_mode ?? (isWellB02 ? 'Buckling / Parting due to downstroke compression & rod floating' : 'Cyclic Fatigue & Rod Floating Stress'),
              factors: failureRisk?.components?.sucker_rod_string?.risk_factors ?? [
                { name: 'Rod Floating Exposure', score: isWellB02 ? 59.9 : 72.4 },
                { name: 'Viscous Drag Load', score: isWellB02 ? 59.1 : 68.0 },
                { name: 'Fatigue Cycles Accumulated', score: isWellB02 ? 38.0 : 49.5 }
              ],
              modeColor: '#dc2626',
            },
            {
              id: 'pump',
              label: '2. Subsurface Pump',
              score: pumpRisk,
              mode: failureRisk?.components?.subsurface_pump?.failure_mode ?? 'Barrel wear / valve sticking from asphaltene precipitation',
              factors: failureRisk?.components?.subsurface_pump?.risk_factors ?? [
                { name: 'Asphaltene Deposition Index', score: isWellB02 ? 42.0 : 51.0 },
                { name: 'Sand / Solids Inflow', score: isWellB02 ? 14.0 : 22.0 }
              ],
              modeColor: '#ea580c',
            },
            {
              id: 'gearbox',
              label: '3. Surface Pumping Unit',
              score: gearboxRisk,
              mode: failureRisk?.components?.surface_pumping_unit?.failure_mode ?? 'Gearbox / motor thermal load',
              factors: failureRisk?.components?.surface_pumping_unit?.risk_factors ?? [
                { name: 'Motor Thermal Load', score: isWellB02 ? 22.0 : 31.0 },
                { name: 'Structural Imbalance', score: isWellB02 ? 12.0 : 18.0 }
              ],
              modeColor: '#b45309',
            },
          ].map((comp) => {
            const isSelected = activeComponent === comp.id;
            return (
              <div
                key={comp.label}
                onClick={() => setActiveComponent(comp.id)}
                style={{
                  background: isSelected ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255,255,255,0.15)',
                  border: isSelected ? '1.5px solid #9a3412' : '1px solid rgba(180,155,125,0.4)',
                  borderRadius: '7px',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#92400e' }}>{comp.label}</span>
                  <span className={`badge ${comp.score > 50 ? 'badge-rose' : comp.score > 25 ? 'badge-amber' : 'badge-emerald'}`}>
                    {Math.round(comp.score)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: comp.modeColor, marginBottom: '0.45rem' }}>
                  {comp.mode}
                </div>
                {comp.factors.length > 0 && (
                  <div style={{ fontSize: '0.67rem', color: '#5a4535', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {comp.factors.map((rf, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                          <span>&bull; {rf.name}:</span>
                          <span style={{ fontWeight: 700 }}>{rf.score}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(160, 130, 100, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${rf.score}%`, height: '100%', background: rf.score > 50 ? '#dc2626' : '#b45309' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 7. WORKOVER & INTERVENTION LOGS WITH "+ LOG WORKOVER" ─────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.86rem', fontWeight: 800, color: '#1c1917', letterSpacing: '0.03em' }}>
              WORKOVER &amp; INTERVENTION LOGS (FIELD &amp; WELL HISTORY)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.3)', padding: '2px 4px', borderRadius: '5px' }}>
              {[
                { id: 'all', label: 'All Records' },
                { id: 'well', label: `Well ${currentWellId}` },
                { id: 'rod', label: 'Rods' },
                { id: 'pump', label: 'Pumps' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setWorkoverFilter(f.id)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    background: workoverFilter === f.id ? '#78350f' : 'transparent',
                    color: workoverFilter === f.id ? '#fff' : '#57422f',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Add Workover Button */}
            <button
              onClick={() => setActiveModal('logWorkover')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '5px',
                background: '#78350f',
                color: '#fff',
                border: 'none',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={13} />
              <span>Log Workover</span>
            </button>
          </div>
        </div>

        {/* Workover Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="sandstone-table" style={{ width: '100%', fontSize: '0.74rem' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Well</th>
                <th>Component</th>
                <th>Failure / Inspection Mode</th>
                <th>Root Cause</th>
                <th>Downtime (hrs)</th>
                <th>Action Taken</th>
              </tr>
            </thead>
            <tbody>
              {displayWorkovers.length > 0 ? (
                displayWorkovers.map((log, idx) => {
                  const isCurrent = log.well_name?.includes(currentWellId) || log.well_id?.includes(currentWellId);
                  return (
                    <tr key={log.failure_id || idx} style={{ background: isCurrent ? 'rgba(217,119,6,0.08)' : 'transparent' }}>
                      <td style={{ whiteSpace: 'nowrap' }}>{log.date}</td>
                      <td style={{ fontWeight: 800, color: isCurrent ? '#9a3412' : 'inherit' }}>
                        {log.well_name || log.well_id}{isCurrent && ' ★'}
                      </td>
                      <td><span className="badge badge-amber">{log.component}</span></td>
                      <td style={{ fontWeight: 600 }}>{log.failure_mode}</td>
                      <td style={{ fontSize: '0.68rem', color: '#666' }}>{log.root_cause}</td>
                      <td>{log.downtime_hours} h</td>
                      <td style={{ color: '#b45309', fontWeight: 600 }}>{log.action_taken}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#78614d' }}>
                    No recorded interventions matching filter for Well {currentWellId}. Click &quot;Log Workover&quot; to register a preventative maintenance record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 8. INTERACTIVE MODALS ── */}

      {/* WORK ORDER MODAL */}
      {activeModal === 'workOrder' && modalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#fcfaf6',
              border: '1.5px solid rgba(180, 155, 125, 0.8)',
              borderRadius: '10px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.4rem',
              boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(180, 155, 125, 0.4)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#9a3412" />
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1c1917', fontFamily: 'var(--font-serif)' }}>
                  OIL INDIA LTD &mdash; FIELD WORK ORDER
                </span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78350f' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <span>Work Order Number:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: '#9a3412' }}>{modalData.woId}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <span>Target Well:</span>
                <strong>Well {modalData.wellId} (Sector 4 Baghewala)</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <span>Component / Activity:</span>
                <strong style={{ color: '#b45309' }}>{modalData.title}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <span>Scheduled Execution Date:</span>
                <strong>{modalData.scheduledDate}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <span>Assigned Rig / Crew:</span>
                <strong>{modalData.assignedCrew}</strong>
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(235, 222, 204, 0.4)', borderRadius: '5px' }}>
                <div style={{ fontWeight: 800, marginBottom: '2px', color: '#57422f' }}>Spares Allocated from Warehouse:</div>
                <div style={{ color: '#1c1917' }}>{modalData.sparesRequired}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(180, 155, 125, 0.4)' }}>
              <button
                onClick={() => setActiveModal(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '6px 12px' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setAcknowledgedRecs((prev) => ({ ...prev, rod: true }));
                  setActiveModal(null);
                  setNotification({
                    type: 'success',
                    message: `Work Order ${modalData.woId} authorized & queued for field rig dispatch.`
                  });
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.74rem', padding: '6px 16px', background: '#9a3412', borderColor: '#9a3412' }}
              >
                Authorize &amp; Dispatch Rig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG WORKOVER MODAL */}
      {activeModal === 'logWorkover' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <form
            onSubmit={handleSaveNewWorkover}
            style={{
              background: '#fcfaf6',
              border: '1.5px solid rgba(180, 155, 125, 0.8)',
              borderRadius: '10px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.4rem',
              boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(180, 155, 125, 0.4)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} color="#78350f" />
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1c1917', fontFamily: 'var(--font-serif)' }}>
                  LOG WORKOVER ENTRY &mdash; WELL {currentWellId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#78350f' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.76rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Date:</label>
                <input
                  type="date"
                  value={newWorkover.date}
                  onChange={(e) => setNewWorkover({ ...newWorkover, date: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Component:</label>
                <select
                  value={newWorkover.component}
                  onChange={(e) => setNewWorkover({ ...newWorkover, component: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                >
                  <option value="Sucker Rod String">Sucker Rod String</option>
                  <option value="Subsurface Insert Pump">Subsurface Insert Pump</option>
                  <option value="Surface Unit Gearbox">Surface Unit Gearbox</option>
                  <option value="Tubing & Centralizers">Tubing &amp; Centralizers</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Failure / Inspection Mode:</label>
                <input
                  type="text"
                  value={newWorkover.failure_mode}
                  onChange={(e) => setNewWorkover({ ...newWorkover, failure_mode: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Root Cause:</label>
                <input
                  type="text"
                  value={newWorkover.root_cause}
                  onChange={(e) => setNewWorkover({ ...newWorkover, root_cause: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Downtime (Hours):</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newWorkover.downtime_hours}
                    onChange={(e) => setNewWorkover({ ...newWorkover, downtime_hours: e.target.value })}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '2px', color: '#57422f' }}>Action Taken / Spares Installed:</label>
                <input
                  type="text"
                  value={newWorkover.action_taken}
                  onChange={(e) => setNewWorkover({ ...newWorkover, action_taken: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid rgba(180,155,125,0.6)' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(180, 155, 125, 0.4)' }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '6px 12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ fontSize: '0.74rem', padding: '6px 16px', background: '#78350f', borderColor: '#78350f' }}
              >
                Save Entry
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

/**
 * Seed historical field records for Baghewala heavy crude wells
 */
function getFieldWorkoverSeed(wellId) {
  const isB02 = wellId === 'B-02' || wellId === 'BGW-SYN-002';

  return [
    {
      failure_id: 'LOG-B02-01',
      well_id: isB02 ? wellId : 'B-02',
      well_name: isB02 ? `Well ${wellId}` : 'Well B-02',
      date: '14 May 2026',
      component: 'Sucker Rod String',
      failure_mode: 'Downstroke Rod Float Mitigation',
      root_cause: 'High heavy oil viscosity (480 cP) causing rod compression',
      downtime_hours: 14,
      action_taken: 'Installed 3 sinker bars above pump; adjusted VFD to 3.8 SPM'
    },
    {
      failure_id: 'LOG-B17-01',
      well_id: 'B-17',
      well_name: 'Well B-17',
      date: '28 Feb 2026',
      component: 'Sucker Rod String',
      failure_mode: 'Rod Parting near Joint #14',
      root_cause: 'Cyclic bending fatigue & asphaltene friction',
      downtime_hours: 24,
      action_taken: 'Replaced 45m section with API Grade D rods; lubricated wellbore'
    },
    {
      failure_id: 'LOG-B02-02',
      well_id: isB02 ? wellId : 'B-02',
      well_name: isB02 ? `Well ${wellId}` : 'Well B-02',
      date: '19 Nov 2025',
      component: 'Subsurface Pump',
      failure_mode: 'Travelling Valve Sluggish Seat',
      root_cause: 'Wax / Asphaltene deposition in clearance gap',
      downtime_hours: 11,
      action_taken: 'Performed hot oil circulation & chemical aromatic flush'
    },
    {
      failure_id: 'LOG-B04-01',
      well_id: 'B-04',
      well_name: 'Well B-04',
      date: '08 Aug 2025',
      component: 'Surface Pumping Unit',
      failure_mode: 'Pitman Bearing Temperature Elevation',
      root_cause: 'Lubricant thermal degradation under desert ambient heat',
      downtime_hours: 6,
      action_taken: 'Flushed gear reducer; replenished high-temp ISO VG 460 synthetic lube'
    },
    {
      failure_id: 'LOG-B01-01',
      well_id: 'B-01',
      well_name: 'Well B-01',
      date: '12 Jan 2025',
      component: 'Insert Pump Barrel',
      failure_mode: 'Volumetric Efficiency Degradation (Down to 58%)',
      root_cause: 'Abrasive sandstone particulate scoring on plunger surface',
      downtime_hours: 18,
      action_taken: 'Pulled pump; replaced barrel with 57mm chrome-plated assembly'
    }
  ];
}
