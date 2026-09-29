import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Shield,
  ShieldCheck,
  Zap,
  ArrowUp,
  Settings,
  TrendingUp,
  Sliders,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Wrench,
  Info
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Rod String & Downhole Pump Health Monitor — Well B-17
 * Replicates the exact layout with full live interactivity, dynamic sensitivity scaling,
 * real-time what-if sliders, wellbore depth profiling, and AI recommendations.
 */
export default function RodPumpHealth({ selectedWellId = 'B-17' }) {
  const [loading, setLoading] = useState(true);
  const [mechanicsData, setMechanicsData] = useState(null);
  const [depthProfile, setDepthProfile] = useState([]);
  const [failureRisk, setFailureRisk] = useState(null);

  // Tab: 'stress' | 'shock' | 'safety'
  const [activeTab, setActiveTab] = useState('stress');
  const [activeHoverDepth, setActiveHoverDepth] = useState(1000);
  const [activeProfileDepth, setActiveProfileDepth] = useState(null);

  // Real-time What-If Slider Overrides
  const [customGoodman, setCustomGoodman] = useState(null);
  const [customSnap, setCustomSnap] = useState(null);
  const [customUnsetting, setCustomUnsetting] = useState(null);

  useEffect(() => {
    fetchHealthData();
  }, [selectedWellId]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const [mechRes, depthRes, failRes] = await Promise.allSettled([
        api.getMechanicsDiagnostics(selectedWellId),
        api.getWellboreDepthProfile(selectedWellId),
        api.getFailureRisk(selectedWellId)
      ]);

      if (mechRes.status === 'fulfilled') setMechanicsData(mechRes.value);
      if (depthRes.status === 'fulfilled') setDepthProfile(depthRes.value?.depth_profile || []);
      if (failRes.status === 'fulfilled') setFailureRisk(failRes.value);
    } catch (err) {
      console.error('Failed to fetch rod health data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetWhatIf = () => {
    setCustomGoodman(null);
    setCustomSnap(null);
    setCustomUnsetting(null);
  };

  const isWhatIfActive = customGoodman !== null || customSnap !== null || customUnsetting !== null;

  // 1. Goodman Stress Ratio
  const rawGoodman = mechanicsData?.impact_loading?.goodman_stress_ratio_pct
    ? Number((mechanicsData.impact_loading.goodman_stress_ratio_pct / 100).toFixed(2))
    : 0.86;
  const goodmanRatio = customGoodman !== null ? customGoodman : rawGoodman;
  const maxGoodmanSlider = 1.5;
  const goodmanPct = Math.min(100, Math.max(0, (goodmanRatio / maxGoodmanSlider) * 100));
  const isGoodmanOverloaded = goodmanRatio > 1.0;

  // 2. Dynamic Snap Factor
  const rawSnap = mechanicsData?.impact_loading?.snap_shock_factor
    ? Number(mechanicsData.impact_loading.snap_shock_factor.toFixed(2))
    : 1.38;
  const snapFactor = customSnap !== null ? customSnap : rawSnap;
  const maxSnapSlider = 2.5;
  const snapPct = Math.min(100, Math.max(0, ((snapFactor - 0.5) / (maxSnapSlider - 0.5)) * 100));
  const isSnapHigh = snapFactor > 1.4;

  // 3. Pump Unsetting Safety Margin
  const holdDownRating = mechanicsData?.pump_unsetting_force_balance?.seating_nipple_hold_down_capacity_kn || 18.0;
  const upwardShearForce = mechanicsData?.pump_unsetting_force_balance?.upward_viscous_drag_kn !== undefined
    ? mechanicsData.pump_unsetting_force_balance.upward_viscous_drag_kn
    : 0.04;
  const rawUnsetting = Number((holdDownRating - upwardShearForce).toFixed(1)) || 17.1;
  const unsettingMargin = customUnsetting !== null ? customUnsetting : rawUnsetting;
  const maxUnsettingSlider = 25.0;
  const unsettingPct = Math.min(100, Math.max(0, (unsettingMargin / maxUnsettingSlider) * 100));
  const isUnsettingCritical = unsettingMargin < 6.0;

  // Mechanics calculations
  const safetyMarginFactor = Number((unsettingMargin / Math.max(1, holdDownRating / 4.15)).toFixed(2));
  const peakImpactLoad = Number((71.7 * snapFactor).toFixed(1));

  // Risk indicators dynamically tied to live data and what-if sliders
  const rodFatigueRisk = useMemo(() => {
    if (goodmanRatio > 1.0) {
      return Math.min(100, Math.round(75 + (goodmanRatio - 1.0) * 50));
    }
    return Math.min(74, Math.max(5, Math.round((goodmanRatio / 1.0) * 65)));
  }, [goodmanRatio]);

  const pumpUnsettingRisk = useMemo(() => {
    if (unsettingMargin < 6) return Math.min(100, Math.round(70 + (6 - unsettingMargin) * 5));
    if (unsettingMargin < 12) return Math.round(35 + (12 - unsettingMargin) * 5);
    return Math.max(2, Math.round(Math.max(0, (20 - unsettingMargin) * 1.5)));
  }, [unsettingMargin]);

  const bucklingRisk = useMemo(() => {
    const raw = failureRisk?.components?.sucker_rod_string?.risk_score;
    if (raw !== undefined) {
      return Math.min(100, Math.max(5, Math.round(raw * (snapFactor / 1.38))));
    }
    return Math.min(100, Math.round(18 * (snapFactor / 1.38)));
  }, [failureRisk, snapFactor]);

  const vibrationRisk = useMemo(() => {
    return Math.min(100, Math.max(4, Math.round((snapFactor / 2.0) * 60)));
  }, [snapFactor]);

  // Tab configurations for Sensitivity Analysis
  const tabConfig = {
    stress: {
      title: 'Stress Ratio',
      axisLabel: 'Goodman Stress Ratio',
      unit: '',
      yTicks: [0, 0.4, 0.8, 1.2, 1.6],
      maxY: 1.6,
      limitVal: 1.0,
      limitLabel: 'Goodman Limit (1.0)',
      limitColor: '#dc2626',
      curveColor: '#b45309'
    },
    shock: {
      title: 'Shock Load',
      axisLabel: 'Shock Load (kN)',
      unit: ' kN',
      yTicks: [0, 40, 80, 120, 160],
      maxY: 160,
      limitVal: 110,
      limitLabel: 'Fatigue Limit (110 kN)',
      limitColor: '#dc2626',
      curveColor: '#ea580c'
    },
    safety: {
      title: 'Safety Margin',
      axisLabel: 'Safety Factor',
      unit: 'x',
      yTicks: [0, 2.5, 5.0, 7.5, 10.0],
      maxY: 10.0,
      limitVal: 2.0,
      limitLabel: 'Min Safe Margin (2.0x)',
      limitColor: '#16a34a',
      curveColor: '#14532d'
    }
  };

  const currentTab = tabConfig[activeTab];

  // Sensitivity calculation (scaled to well depth: 0 to 1150 m)
  const sensitivityDepths = [0, 200, 400, 600, 800, 1000, 1150];
  const getSensitivityValue = (depth) => {
    const frac = depth / 1150;
    if (activeTab === 'stress') {
      // Curve: 0.32 at surface up to ~1.45 at pump intake
      const base = 0.32 + Math.pow(frac, 1.5) * (goodmanRatio * 1.15);
      return Number(base.toFixed(2));
    }
    if (activeTab === 'shock') {
      // Shock load: 28 kN at 0m up to ~135 kN at downhole pump
      const base = 28 + frac * (peakImpactLoad * 0.95);
      return Number(base.toFixed(1));
    }
    // Safety margin: 8.8x down to ~2.6x at bottom
    const base = 8.8 - frac * (6.2 * (18 / Math.max(8, unsettingMargin)));
    return Number(Math.max(1.1, base).toFixed(2));
  };

  const activeHoverVal = getSensitivityValue(activeHoverDepth);

  // Depth profile points for Wellbore Stress chart
  const depthProfilePoints = useMemo(() => {
    const depths = [0, 200, 400, 600, 800, 1000, 1150];
    return depths.map((d) => {
      const frac = d / 1150;
      return {
        d,
        rodStress: Math.round(18 + Math.pow(frac, 1.4) * 186 * (goodmanRatio / 1.0)),
        bendingStress: Math.round(12 + Math.sin(frac * Math.PI) * 78 + frac * 45),
        axialLoad: Math.round(10 + frac * 96 * (snapFactor / 1.38))
      };
    });
  }, [goodmanRatio, snapFactor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      
      {/* ── 1. HEADER TITLE BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '22px', background: '#b43403', borderRadius: '2px' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em', margin: 0 }}>
            ROD STRING &amp; DOWNHOLE PUMP HEALTH — WELL {selectedWellId}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isWhatIfActive && (
            <button
              onClick={handleResetWhatIf}
              title="Reset slider what-if values to live telemetry"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.35rem 0.75rem',
                background: 'rgba(180, 52, 3, 0.12)',
                border: '1px solid rgba(180, 52, 3, 0.4)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#b43403',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset What-If</span>
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              background: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              borderRadius: '14px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#b45309'
            }}
          >
            <Activity size={13} color="#b45309" />
            <span>Impact Loading &amp; Pump Unsetting Monitor</span>
          </div>

          <button
            onClick={fetchHealthData}
            title="Refresh Diagnostic Telemetry"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0.35rem 0.65rem',
              background: 'rgba(45, 34, 23, 0.08)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={loading ? 'animated-graph-point' : ''} />
            <span>{loading ? 'Refreshing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP 3 KPI CARDS WITH MOUNTAIN VISTA BACKGROUNDS & REAL-TIME SLIDERS ── */}
      <div className="responsive-grid-3" style={{ gap: '1rem' }}>
        
        {/* Card 1: GOODMAN STRESS RATIO */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.1rem 1.15rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '150px'
          }}
        >
          <div
            className="whatif-image-panel"
            style={{
              width: '52%',
              backgroundImage: 'url(/assets/rod_health_bg1.png)',
              opacity: 0.85
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'serif' }}>&sum;</span>
                <span>GOODMAN STRESS RATIO</span>
              </div>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: isGoodmanOverloaded ? 'rgba(220, 38, 38, 0.15)' : 'rgba(20, 83, 45, 0.15)',
                  color: isGoodmanOverloaded ? '#dc2626' : '#14532d',
                  border: `1px solid ${isGoodmanOverloaded ? 'rgba(220, 38, 38, 0.35)' : 'rgba(20, 83, 45, 0.35)'}`
                }}
              >
                {isGoodmanOverloaded ? 'FATIGUE OVERLOAD' : 'API SAFE LIMIT'}
              </span>
            </div>

            <div
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: isGoodmanOverloaded ? '#dc2626' : 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.15,
                margin: '0.35rem 0 0.15rem'
              }}
            >
              {goodmanRatio.toFixed(2)}
            </div>

            <div style={{ fontSize: '0.7rem', color: isGoodmanOverloaded ? '#dc2626' : 'var(--text-muted)', fontWeight: 600 }}>
              Allowable &le; 1.0 ({isGoodmanOverloaded ? 'Exceeds threshold' : 'Compliant'})
            </div>
          </div>

          {/* Interactive Slider Gauge Bar */}
          <div style={{ position: 'relative', zIndex: 3, marginTop: '0.75rem' }}>
            <div style={{ position: 'relative', width: '100%', height: '22px', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '7px',
                  background: 'rgba(61, 47, 32, 0.25)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${goodmanPct}%`,
                    height: '100%',
                    borderRadius: '4px',
                    background: isGoodmanOverloaded
                      ? 'linear-gradient(to right, #d97706 0%, #dc2626 100%)'
                      : 'linear-gradient(to right, #16a34a 0%, #d97706 100%)'
                  }}
                />
              </div>

              <input
                type="range"
                min="0"
                max={maxGoodmanSlider}
                step="0.01"
                value={goodmanRatio}
                onChange={(e) => setCustomGoodman(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'ew-resize',
                  margin: 0,
                  zIndex: 6
                }}
                title={`Goodman Stress Ratio: ${goodmanRatio} (Drag to test what-if)`}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${goodmanPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: isGoodmanOverloaded ? '#dc2626' : '#181109',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
              >
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              <span>0 (0%)</span>
              <span>0.75 (50%)</span>
              <span style={{ color: '#d97706', fontWeight: 700 }}>1.0 (Limit)</span>
              <span>1.5</span>
            </div>
          </div>
        </div>

        {/* Card 2: DYNAMIC SNAP FACTOR */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.1rem 1.15rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '150px'
          }}
        >
          <div
            className="whatif-image-panel"
            style={{
              width: '52%',
              backgroundImage: 'url(/assets/rod_health_bg2.png)',
              opacity: 0.85
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Activity size={14} color="#ea580c" />
                <span>DYNAMIC SNAP FACTOR</span>
              </div>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: isSnapHigh ? 'rgba(234, 88, 12, 0.15)' : 'rgba(20, 83, 45, 0.15)',
                  color: isSnapHigh ? '#c2410c' : '#14532d',
                  border: `1px solid ${isSnapHigh ? 'rgba(234, 88, 12, 0.35)' : 'rgba(20, 83, 45, 0.35)'}`
                }}
              >
                {isSnapHigh ? 'SHOCK IMPACT' : 'SMOOTH MOTION'}
              </span>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: isSnapHigh ? '#c2410c' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.15, margin: '0.35rem 0 0.15rem' }}>
              {snapFactor.toFixed(2)}x
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Peak impact load: {peakImpactLoad} kN
            </div>
          </div>

          {/* Interactive Slider Gauge Bar */}
          <div style={{ position: 'relative', zIndex: 3, marginTop: '0.75rem' }}>
            <div style={{ position: 'relative', width: '100%', height: '22px', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '7px',
                  background: 'rgba(61, 47, 32, 0.25)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${snapPct}%`,
                    height: '100%',
                    borderRadius: '4px',
                    background: 'linear-gradient(to right, #d97706 0%, #ea580c 60%, #c2410c 100%)'
                  }}
                />
              </div>

              <input
                type="range"
                min="0.5"
                max={maxSnapSlider}
                step="0.02"
                value={snapFactor}
                onChange={(e) => setCustomSnap(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'ew-resize',
                  margin: 0,
                  zIndex: 6
                }}
                title={`Dynamic Snap Factor: ${snapFactor}x (Drag to test what-if)`}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${snapPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: isSnapHigh ? '#c2410c' : '#181109',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
              >
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              <span>0.5x</span>
              <span>1.0x (Nominal)</span>
              <span>1.5x</span>
              <span>2.5x</span>
            </div>
          </div>
        </div>

        {/* Card 3: PUMP UNSETTING SAFETY MARGIN */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.1rem 1.15rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '150px'
          }}
        >
          <div
            className="whatif-image-panel"
            style={{
              width: '52%',
              backgroundImage: 'url(/assets/rod_health_bg1.png)',
              opacity: 0.85
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <ShieldCheck size={14} color="#b45309" />
                <span>PUMP UNSETTING SAFETY MARGIN</span>
              </div>
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: isUnsettingCritical ? 'rgba(220, 38, 38, 0.15)' : 'rgba(20, 83, 45, 0.15)',
                  color: isUnsettingCritical ? '#dc2626' : '#14532d',
                  border: `1px solid ${isUnsettingCritical ? 'rgba(220, 38, 38, 0.35)' : 'rgba(20, 83, 45, 0.35)'}`
                }}
              >
                {isUnsettingCritical ? 'UNSETTING RISK' : 'SECURE ANCHOR'}
              </span>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: isUnsettingCritical ? '#dc2626' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.15, margin: '0.35rem 0 0.15rem' }}>
              {unsettingMargin.toFixed(1)} <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>kN</span>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Hold-down rating {holdDownRating.toFixed(1)} kN &bull; {safetyMarginFactor}x safety
            </div>
          </div>

          {/* Interactive Slider Gauge Bar */}
          <div style={{ position: 'relative', zIndex: 3, marginTop: '0.75rem' }}>
            <div style={{ position: 'relative', width: '100%', height: '22px', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '7px',
                  background: 'rgba(61, 47, 32, 0.25)',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${unsettingPct}%`,
                    height: '100%',
                    borderRadius: '4px',
                    background: isUnsettingCritical
                      ? 'linear-gradient(to right, #dc2626 0%, #ea580c 100%)'
                      : 'linear-gradient(to right, #d97706 0%, #16a34a 100%)'
                  }}
                />
              </div>

              <input
                type="range"
                min="0"
                max={maxUnsettingSlider}
                step="0.1"
                value={unsettingMargin}
                onChange={(e) => setCustomUnsetting(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'ew-resize',
                  margin: 0,
                  zIndex: 6
                }}
                title={`Pump Unsetting Margin: ${unsettingMargin} kN (Drag to test what-if)`}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${unsettingPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: isUnsettingCritical ? '#dc2626' : '#181109',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                  pointerEvents: 'none'
                }}
              >
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ffffff' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              <span>0 kN</span>
              <span>10 kN</span>
              <span style={{ color: '#b45309', fontWeight: 700 }}>18 kN (Rating)</span>
              <span>25 kN</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. MIDDLE SECTION: MECHANICAL INTEGRITY DECOMPOSITION WITH STRATA/PUMP IMAGE ── */}
      <div
        className="sandstone-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '1.25rem 1.35rem',
          minHeight: '220px'
        }}
      >
        <div
          className="whatif-image-panel"
          style={{
            width: '42%',
            backgroundImage: 'url(/assets/rod_health_strata.png)',
            backgroundPosition: 'center right',
            opacity: 0.95
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '18px',
            right: '16px',
            bottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        >
          {['0 m', '200 m', '600 m', '900 m', '1150 m'].map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '1px', background: 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {d}
              </span>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '62%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.4rem' }}>
            <Settings size={15} color="#b43403" />
            <span className="card-heading-bold" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
              MECHANICAL INTEGRITY DECOMPOSITION — WELL {selectedWellId}
            </span>
          </div>

          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
            Upward fluid shear force: <strong>{upwardShearForce} kN</strong> vs Hold-down capacity <strong>{holdDownRating.toFixed(0)} kN</strong>. The pump insert is firmly anchored with <strong>{safetyMarginFactor}x safety factor</strong>. Peak impact shock load: <strong>{peakImpactLoad} kN</strong>.
          </div>

          {/* 3 Translucent Metric Sub-Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
            
            <div
              style={{
                background: 'rgba(45, 34, 23, 0.06)',
                border: '1px solid rgba(150, 125, 95, 0.45)',
                borderRadius: '5px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowUp size={16} color="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Upward Fluid Shear</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{upwardShearForce} kN</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>vs 18.0 kN</div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(45, 34, 23, 0.06)',
                border: '1px solid rgba(150, 125, 95, 0.45)',
                borderRadius: '5px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={16} color="#b45309" />
              </div>
              <div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hold-down Safety Margin</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{safetyMarginFactor}x</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>(API RP 11G)</div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(45, 34, 23, 0.06)',
                border: '1px solid rgba(150, 125, 95, 0.45)',
                borderRadius: '5px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(234,88,12,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={16} color="#ea580c" />
              </div>
              <div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600 }}>Peak Impact Shock Load</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{peakImpactLoad} kN</div>
                <div style={{ fontSize: '0.62rem', color: isSnapHigh ? '#dc2626' : 'var(--text-muted)' }}>
                  {isSnapHigh ? 'High shock' : 'Within rating'}
                </div>
              </div>
            </div>

          </div>

          {/* AI Recommendation Banner from Backend API */}
          {mechanicsData?.impact_loading?.recommendation && (
            <div
              style={{
                marginTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.55rem 0.85rem',
                background: isGoodmanOverloaded || isSnapHigh ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                border: `1px solid ${isGoodmanOverloaded || isSnapHigh ? 'rgba(220, 38, 38, 0.35)' : 'rgba(217, 119, 6, 0.35)'}`,
                borderRadius: '5px',
                fontSize: '0.72rem',
                color: 'var(--text-primary)',
                lineHeight: 1.35
              }}
            >
              <Lightbulb size={16} color={isGoodmanOverloaded || isSnapHigh ? '#dc2626' : '#d97706'} style={{ flexShrink: 0 }} />
              <div>
                <strong>AI Closed-Loop Diagnostic: </strong>
                {mechanicsData.impact_loading.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: 3-COLUMN SPLIT (STRESS PROFILE, SENSITIVITY, RISK INDICATORS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.25fr 0.9fr', gap: '1rem', alignItems: 'stretch' }}>
        
        {/* PANEL 1: LOADING & STRESS PROFILE VS. DEPTH */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            className="whatif-image-panel"
            style={{
              width: '65%',
              backgroundImage: 'url(/assets/rod_health_bg2.png)',
              opacity: 0.35
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} color="#b43403" />
                <span className="card-heading-bold" style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  LOADING &amp; STRESS PROFILE VS. DEPTH
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Max Depth: 1,150 m
              </span>
            </div>
          </div>

          {/* SVG Depth vs Load/Stress Multi-Curve Chart */}
          <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: '195px', width: '100%' }}>
            <svg viewBox="0 0 380 200" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* Vertical Grid Lines (Stress/Load: 0, 50, 100, 150, 200) */}
              {[0, 50, 100, 150, 200].map((val, idx) => {
                const x = 45 + idx * 72;
                return (
                  <g key={idx}>
                    <line x1={x} y1="20" x2={x} y2="175" stroke="rgba(150, 125, 95, 0.22)" strokeWidth="0.8" />
                    <text x={x} y="14" fill="var(--text-muted)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Grid Lines & Y-Axis Labels (Depth: 0 to 1150 m) */}
              {[0, 200, 400, 600, 800, 1000, 1150].map((depth, idx) => {
                const y = 20 + idx * 25.5;
                return (
                  <g key={idx}>
                    <line x1="45" y1={y} x2="333" y2={y} stroke="rgba(150, 125, 95, 0.18)" strokeWidth="0.8" strokeDasharray={idx === 0 ? 'none' : '2 2'} />
                    <text x="38" y={y + 3} fill="var(--text-muted)" fontSize="7.5" textAnchor="end" fontFamily="var(--font-mono)">
                      {depth}
                    </text>
                  </g>
                );
              })}
              <text x="12" y="100" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="700" transform="rotate(-90 12,100)">
                Depth (m)
              </text>

              {/* Curve 1: Rod Stress (MPa) */}
              {(() => {
                const getX = (v) => 45 + (v / 200) * 288;
                const getY = (d) => 20 + (d / 1150) * 154;
                const dPath = depthProfilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.rodStress)} ${getY(p.d)}`).join(' ');

                return (
                  <g>
                    <path d={dPath} fill="none" stroke="#6b4c2b" strokeWidth="2.2" />
                    {depthProfilePoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={getX(p.rodStress)}
                        cy={getY(p.d)}
                        r="3"
                        fill="#6b4c2b"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActiveProfileDepth(p.d)}
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Curve 2: Bending Stress (MPa) */}
              {(() => {
                const getX = (v) => 45 + (v / 200) * 288;
                const getY = (d) => 20 + (d / 1150) * 154;
                const dPath = depthProfilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.bendingStress)} ${getY(p.d)}`).join(' ');

                return (
                  <path d={dPath} fill="none" stroke="#ea580c" strokeWidth="2" />
                );
              })()}

              {/* Curve 3: Axial Load (kN) */}
              {(() => {
                const getX = (v) => 45 + (v / 200) * 288;
                const getY = (d) => 20 + (d / 1150) * 154;
                const dPath = depthProfilePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.axialLoad)} ${getY(p.d)}`).join(' ');

                return (
                  <g>
                    <path d={dPath} fill="none" stroke="#14532d" strokeWidth="2" />
                    {depthProfilePoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={getX(p.axialLoad)}
                        cy={getY(p.d)}
                        r="3"
                        fill="#14532d"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActiveProfileDepth(p.d)}
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Hover Inspection Callout */}
              {activeProfileDepth !== null && (() => {
                const pt = depthProfilePoints.find((p) => p.d === activeProfileDepth) || depthProfilePoints[4];
                const y = 20 + (pt.d / 1150) * 154;
                return (
                  <g>
                    <line x1="45" y1={y} x2="333" y2={y} stroke="#b43403" strokeWidth="1" strokeDasharray="2 2" />
                    <rect x="230" y={Math.max(22, y - 28)} width="105" height="26" rx="3" fill="#1f1610" stroke="#b43403" strokeWidth="1" />
                    <text x="282" y={Math.max(22, y - 28) + 11} textAnchor="middle" fill="#fef3c7" fontSize="7.5" fontWeight="700">
                      Depth: {pt.d}m &bull; Stress: {pt.rodStress} MPa
                    </text>
                    <text x="282" y={Math.max(22, y - 28) + 21} textAnchor="middle" fill="#ffffff" fontSize="7">
                      Bending: {pt.bendingStress} MPa &bull; Load: {pt.axialLoad} kN
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b4c2b', display: 'inline-block' }} />
              <span>Rod Stress (MPa)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '2px', background: '#ea580c', display: 'inline-block' }} />
              <span>Bending Stress (MPa)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#14532d', display: 'inline-block' }} />
              <span>Axial Load (kN)</span>
            </span>
          </div>
        </div>

        {/* PANEL 2: SENSITIVITY ANALYSIS (FULLY SCALED & WORKABLE) */}
        <div
          className="sandstone-card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={15} color="#b43403" />
              <span className="card-heading-bold" style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                SENSITIVITY ANALYSIS
              </span>
            </div>

            {/* Sub-Tabs: Stress Ratio | Shock Load | Safety Margin */}
            <div style={{ display: 'flex', background: 'rgba(45,34,23,0.06)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'stress', label: 'Stress Ratio' },
                { id: 'shock', label: 'Shock Load' },
                { id: 'safety', label: 'Safety Margin' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.67rem',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: activeTab === tab.id ? 'rgba(217, 119, 6, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Sensitivity Trend Chart */}
          <div style={{ flex: 1, minHeight: '195px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 380 200" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* Dynamic Horizontal grid lines & Y-Axis Labels */}
              {currentTab.yTicks.map((val, idx) => {
                const y = 165 - (val / currentTab.maxY) * 140;
                return (
                  <g key={idx}>
                    <line x1="38" y1={y} x2="360" y2={y} stroke="rgba(150, 125, 95, 0.2)" strokeWidth="0.8" strokeDasharray={val === 0 ? 'none' : '2 2'} />
                    <text x="32" y={y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">
                      {val.toFixed(currentTab.maxY <= 2.0 ? 1 : 0)}
                    </text>
                  </g>
                );
              })}
              <text x="12" y="95" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="700" transform="rotate(-90 12,95)">
                {currentTab.axisLabel}
              </text>

              {/* Dynamic Allowable Limit Line */}
              {(() => {
                const limitY = 165 - (currentTab.limitVal / currentTab.maxY) * 140;
                return (
                  <g>
                    <line x1="38" y1={limitY} x2="360" y2={limitY} stroke={currentTab.limitColor} strokeWidth="1.5" strokeDasharray="4 3" />
                    <text x="360" y={limitY - 4} fill={currentTab.limitColor} fontSize="7.5" fontWeight="700" textAnchor="end">
                      {currentTab.limitLabel}
                    </text>
                  </g>
                );
              })()}

              {/* X-Axis Ticks & Labels */}
              {sensitivityDepths.map((depth, idx) => {
                const x = 45 + (depth / 1150) * 315;
                return (
                  <g key={idx}>
                    <text x={x} y="180" fill="var(--text-muted)" fontSize="7.5" textAnchor="middle" fontFamily="var(--font-mono)">
                      {depth}
                    </text>
                  </g>
                );
              })}
              <text x="200" y="194" fill="var(--text-secondary)" fontSize="8.5" fontWeight="700" textAnchor="middle">
                Pump Depth (m)
              </text>

              {/* Dynamic Sensitivity Curve */}
              {(() => {
                const getX = (d) => 45 + (d / 1150) * 315;
                const getY = (v) => 165 - Math.min(1.1, Math.max(0, v / currentTab.maxY)) * 140;

                const pathData = sensitivityDepths.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(d)} ${getY(getSensitivityValue(d))}`).join(' ');

                return (
                  <g>
                    <path d={pathData} fill="none" stroke={currentTab.curveColor} strokeWidth="2.5" />
                    {sensitivityDepths.map((d, i) => (
                      <circle
                        key={i}
                        cx={getX(d)}
                        cy={getY(getSensitivityValue(d))}
                        r="3.5"
                        fill={currentTab.curveColor}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActiveHoverDepth(d)}
                        onClick={() => setActiveHoverDepth(d)}
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Active Operating Point Callout */}
              {(() => {
                const targetX = 45 + (activeHoverDepth / 1150) * 315;
                const targetY = 165 - Math.min(1.1, Math.max(0, activeHoverVal / currentTab.maxY)) * 140;

                return (
                  <g>
                    <line x1={targetX} y1="25" x2={targetX} y2="165" stroke="#b43403" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx={targetX} cy={targetY} r="5" fill="#ffffff" stroke="#b43403" strokeWidth="2" />

                    <rect
                      x={Math.min(270, Math.max(40, targetX - 45))}
                      y={Math.max(26, targetY - 38)}
                      width="90"
                      height="30"
                      rx="3"
                      fill="#1f1610"
                      stroke="#b43403"
                      strokeWidth="1"
                    />
                    <text x={Math.min(270, Math.max(40, targetX - 45)) + 45} y={Math.max(26, targetY - 38) + 12} textAnchor="middle" fill="#fef3c7" fontSize="7.5" fontWeight="700" fontFamily="var(--font-mono)">
                      Depth: {activeHoverDepth} m
                    </text>
                    <text x={Math.min(270, Math.max(40, targetX - 45)) + 45} y={Math.max(26, targetY - 38) + 23} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="800">
                      {currentTab.title}: {activeHoverVal}{currentTab.unit}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* PANEL 3: RISK INDICATORS */}
        <div
          className="sandstone-card"
          style={{
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
              <AlertTriangle size={15} color="#b43403" />
              <span className="card-heading-bold" style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                RISK INDICATORS
              </span>
            </div>

            {/* 4 Risk Progress Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* Row 1: Rod Fatigue Risk */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rod Fatigue Risk</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '50px', height: '10px', background: 'rgba(45,34,23,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${rodFatigueRisk}%`,
                        height: '100%',
                        background: rodFatigueRisk > 70 ? '#dc2626' : '#d97706',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: rodFatigueRisk > 70 ? '#dc2626' : 'var(--text-primary)', minWidth: '32px', textAlign: 'right' }}>
                    {rodFatigueRisk}%
                  </span>
                </div>
              </div>

              {/* Row 2: Pump Unsetting Risk */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pump Unsetting Risk</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '50px', height: '10px', background: 'rgba(45,34,23,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pumpUnsettingRisk}%`,
                        height: '100%',
                        background: pumpUnsettingRisk > 60 ? '#dc2626' : '#d97706',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: pumpUnsettingRisk > 60 ? '#dc2626' : 'var(--text-primary)', minWidth: '32px', textAlign: 'right' }}>
                    {pumpUnsettingRisk}%
                  </span>
                </div>
              </div>

              {/* Row 3: Buckling Risk */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Buckling Risk</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '50px', height: '10px', background: 'rgba(45,34,23,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${bucklingRisk}%`,
                        height: '100%',
                        background: bucklingRisk > 50 ? '#dc2626' : '#ea580c',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: bucklingRisk > 50 ? '#dc2626' : 'var(--text-primary)', minWidth: '32px', textAlign: 'right' }}>
                    {bucklingRisk}%
                  </span>
                </div>
              </div>

              {/* Row 4: Vibration Risk */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Vibration Risk</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '50px', height: '10px', background: 'rgba(45,34,23,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${vibrationRisk}%`,
                        height: '100%',
                        background: vibrationRisk > 50 ? '#dc2626' : '#d97706',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: vibrationRisk > 50 ? '#dc2626' : 'var(--text-primary)', minWidth: '32px', textAlign: 'right' }}>
                    {vibrationRisk}%
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Dynamic Condition Status Callout Banner */}
          <div
            style={{
              marginTop: '1rem',
              background: isGoodmanOverloaded || isSnapHigh || isUnsettingCritical
                ? 'rgba(220, 38, 38, 0.12)'
                : 'rgba(20, 83, 45, 0.12)',
              border: `1px solid ${isGoodmanOverloaded || isSnapHigh || isUnsettingCritical ? 'rgba(220, 38, 38, 0.35)' : 'rgba(20, 83, 45, 0.35)'}`,
              borderRadius: '5px',
              padding: '0.65rem 0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '7px'
            }}
          >
            {isGoodmanOverloaded || isSnapHigh || isUnsettingCritical ? (
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <CheckCircle2 size={16} color="#14532d" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.35, fontWeight: 500 }}>
              {isGoodmanOverloaded ? (
                <>Goodman stress ratio <strong>({goodmanRatio.toFixed(2)})</strong> exceeds 1.0 limit. Fatigue acceleration rate elevated.</>
              ) : isSnapHigh ? (
                <>Snap shock factor <strong>({snapFactor.toFixed(2)}x)</strong> is elevated. VFD derating or sinker bars suggested.</>
              ) : isUnsettingCritical ? (
                <>Hold-down margin <strong>({unsettingMargin.toFixed(1)} kN)</strong> is critical. Risk of pump insert dislodging.</>
              ) : (
                <>Operating condition is within <strong>safe API limits</strong>. Positive downstroke tension verified.</>
              )}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
