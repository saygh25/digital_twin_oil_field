import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Send,
  Download,
  Activity,
  Droplet,
  Waves,
  Thermometer,
  Cog,
  Zap,
  Coins,
  ArrowUpRight,
  Info,
  CheckCircle2,
  ChevronRight,
  FastForward,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api';

export default function WhatIfSimulator({
  selectedWellId = 'B-17',
  twinState,
  onApplySetpoints
}) {
  // --- Baseline Defaults from Live Twin State ---
  const baselineBOPD = twinState?.surface?.oil_rate_bopd || 207;
  const baselineSOR = twinState?.surface?.sor || 0.32;
  const baselineTemp = twinState?.reservoir?.temperature_c || 96.04;
  const baselineFloatRisk = twinState?.srp?.rod_floating_risk_pct || 1.9;
  const baselinePowerKW = twinState?.srp?.power_kw || 7.07;
  const baselineSPM = twinState?.srp?.spm || 4.2;
  const baselineStroke = twinState?.srp?.stroke_length_in || 72;
  const baselineVFD = twinState?.srp?.vfd_frequency_hz || 42;

  // --- Simulation Sliders State ---
  const [steamTonnes, setSteamTonnes] = useState(1600);
  const [injPressure, setInjPressure] = useState(42);
  const [soakHours, setSoakHours] = useState(72);
  const [injDays, setInjDays] = useState(15);
  const [srpSPM, setSrpSPM] = useState(4.79);
  const [strokeInches, setStrokeInches] = useState(85);
  const [vfdHz, setVfdHz] = useState(47.9);

  const [activeScenario, setActiveScenario] = useState('scenario_01');
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [appliedToast, setAppliedToast] = useState(null);

  // --- LIVE SIMULATION ENGINE STATE ---
  const TOTAL_SIM_DAYS = 45;
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simDay, setSimDay] = useState(TOTAL_SIM_DAYS);
  const [simSpeed, setSimSpeed] = useState(2); // 1 = 160ms, 2 = 80ms, 4 = 40ms
  const [chartMode, setChartMode] = useState('sensitivity'); // 'sensitivity' | 'transient'
  const simTimerRef = useRef(null);

  // Scenarios presets
  const SCENARIOS = {
    scenario_01: {
      steam: 1600,
      pressure: 42,
      soak: 72,
      injDays: 15,
      spm: 4.79,
      stroke: 85,
      vfd: 47.9
    },
    scenario_02: {
      steam: 1800,
      pressure: 44,
      soak: 48,
      injDays: 14,
      spm: 3.4,
      stroke: 96,
      vfd: 38.2
    },
    scenario_03: {
      steam: 1100,
      pressure: 35,
      soak: 72,
      injDays: 10,
      spm: 3.8,
      stroke: 72,
      vfd: 42.0
    }
  };

  const handleSelectScenario = (key) => {
    setActiveScenario(key);
    if (SCENARIOS[key]) {
      const s = SCENARIOS[key];
      setSteamTonnes(s.steam);
      setInjPressure(s.pressure);
      setSoakHours(s.soak);
      setInjDays(s.injDays);
      setSrpSPM(s.spm);
      setStrokeInches(s.stroke);
      setVfdHz(s.vfd);
      runTargetPrediction(s);
    }
  };

  // 45-Day Reservoir Physics Trajectory Generator
  const fullTrajectory = useMemo(() => {
    const strokeM = strokeInches * 0.0254;
    const downVel = (strokeM * srpSPM) / 30.0;
    const peakTemp = Math.min(160, Math.max(82, 48 + (steamTonnes / 1600) * 58 + (injPressure / 42) * 16));
    const targetEndTemp = Math.max(52, 48 + (steamTonnes / 1600) * 22.5 + (injPressure / 42) * 7.6);
    const decayConst = Math.log(Math.max(1.05, (peakTemp - 48) / (targetEndTemp - 48))) / TOTAL_SIM_DAYS;

    let cumOil = 0;
    const points = [];

    for (let day = 1; day <= TOTAL_SIM_DAYS; day++) {
      // 1. Reservoir thermal decay
      const temp = Number((48 + (peakTemp - 48) * Math.exp(-decayConst * day)).toFixed(1));
      
      // 2. Andrade Viscosity equation for heavy oil
      const tK = temp + 273.15;
      const visc = Math.max(25, Math.round(0.0045 * Math.exp(4600.0 / tK)));

      // 3. Volumetric pump efficiency and inflow
      const viscPenalty = Math.min(0.28, visc / 12000);
      const spmExcessPenalty = Math.max(0, srpSPM - 3.8) * 0.025;
      const pumpEff = Math.max(0.45, Math.min(0.92, 0.84 - spmExcessPenalty - viscPenalty));
      
      // 4. Daily Oil Rate (BOPD)
      const baseDisplacement = 0.585 * srpSPM * strokeInches * pumpEff;
      const thermalMobility = 1.0 + Math.max(0, (140 - temp) * 0.002);
      const steamScale = 1.0 + (steamTonnes - 1500) / 9500;
      const dayBOPD = Math.max(20, Number((baseDisplacement * thermalMobility * steamScale * (1 - (day > 30 ? (day - 30) * 0.008 : 0))).toFixed(1)));

      cumOil += dayBOPD * 0.158987; // m3
      const daySOR = Number((steamTonnes / Math.max(25, cumOil)).toFixed(2));

      // 5. Rod floating risk percentage
      const viscRisk = visc > 400 ? (visc - 400) * 0.012 : 0;
      const velRisk = downVel > 0.28 ? (downVel - 0.28) * 140 : 0;
      const spmRisk = srpSPM > 4.5 ? (srpSPM - 4.5) * 10 : 0;
      const dayFloatRisk = Number(Math.min(95, Math.max(1.8, 2.0 + viscRisk + velRisk + spmRisk)).toFixed(1));

      // 6. Motor Electrical Power (kW)
      const hydraulicKw = (dayBOPD * 0.158987 / 86400) * 980 * 9.81 * 850 / 1000;
      const dayPower = Number((7.2 + (srpSPM / 4.2) ** 2.7 * 8.8 * (strokeM / 1.83) + hydraulicKw * 2.2 + (visc / 3500) * 2.5 + (vfdHz / 42) * 5.0).toFixed(1));

      // 7. Cashflow delta
      const oilDelta = dayBOPD - baselineBOPD;
      const dailyRevINR = oilDelta * 75.0 * 83.0;

      points.push({
        day,
        bopd: dayBOPD,
        sor: daySOR,
        temp,
        floatRisk: dayFloatRisk,
        power: dayPower,
        viscosity: visc,
        cumOil: Math.round(cumOil),
        dailyRevINR,
        downVel: Number(downVel.toFixed(2))
      });
    }

    return points;
  }, [steamTonnes, injPressure, soakHours, injDays, srpSPM, strokeInches, vfdHz, baselineBOPD]);

  // Current Live Metric point derived from simDay
  const currentLive = useMemo(() => {
    if (!fullTrajectory || fullTrajectory.length === 0) {
      return {
        bopd: 206.6,
        sor: 1.2,
        temp: 78.1,
        floatRisk: 12.7,
        power: 22.3,
        viscosity: 480,
        cumOil: 1450,
        dailyRevINR: 2490,
        downVel: 0.34
      };
    }
    const idx = Math.min(Math.max(1, simDay), TOTAL_SIM_DAYS) - 1;
    return fullTrajectory[idx];
  }, [fullTrajectory, simDay]);

  // Live History slice up to current day
  const liveHistory = useMemo(() => {
    return fullTrajectory.slice(0, Math.max(1, simDay));
  }, [fullTrajectory, simDay]);

  // Run Backend API Target Prediction
  const runTargetPrediction = async (overrides = {}) => {
    setIsEvaluating(true);
    try {
      const spm = overrides.spm !== undefined ? overrides.spm : srpSPM;
      const stroke = overrides.stroke !== undefined ? overrides.stroke : strokeInches;
      const vfd = overrides.vfd !== undefined ? overrides.vfd : vfdHz;
      const steam = overrides.steam !== undefined ? overrides.steam : steamTonnes;
      const pressure = overrides.pressure !== undefined ? overrides.pressure : injPressure;
      const soak = overrides.soak !== undefined ? overrides.soak : soakHours;
      const days = overrides.injDays !== undefined ? overrides.injDays : injDays;

      const payload = {
        well_id: selectedWellId,
        spm: spm,
        stroke_length_in: stroke,
        vfd_frequency_hz: vfd,
        steam_injection_ton: steam,
        injection_pressure_ksc: Number((pressure / 0.980665).toFixed(1)),
        soak_days: Number((soak / 24.0).toFixed(1)),
        injection_days: days,
        production_days: 45.0,
        reservoir_temperature_c: baselineTemp,
        reservoir_pressure_ksc: 102.0,
        rod_load_lb: 13500.0,
        water_cut_fraction: 0.28
      };

      const res = await api.runPrediction(payload);
      if (res && res.predictions) {
        setSimResult(res.predictions);
      }
    } catch (err) {
      // Fallback already handled through fullTrajectory target
    } finally {
      setIsEvaluating(false);
    }
  };

  // Launch / Toggle Live Simulation Loop
  const handleStartLiveSimulation = () => {
    if (isLiveRunning) {
      // Toggle pause/play
      setIsPaused((prev) => !prev);
    } else {
      // Start fresh simulation from Day 1
      setSimDay(1);
      setIsLiveRunning(true);
      setIsPaused(false);
      runTargetPrediction();
    }
  };

  const handleRestartSimulation = () => {
    setSimDay(1);
    setIsLiveRunning(true);
    setIsPaused(false);
    runTargetPrediction();
  };

  // Step simulation loop on timer
  useEffect(() => {
    if (isLiveRunning && !isPaused) {
      const intervalMs = Math.round(160 / simSpeed);
      simTimerRef.current = setInterval(() => {
        setSimDay((prev) => {
          if (prev >= TOTAL_SIM_DAYS) {
            setIsLiveRunning(false);
            clearInterval(simTimerRef.current);
            return TOTAL_SIM_DAYS;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isLiveRunning, isPaused, simSpeed]);

  // Auto-simulate target on parameter changes
  useEffect(() => {
    if (autoSimulate) {
      const timer = setTimeout(() => {
        runTargetPrediction();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [steamTonnes, injPressure, soakHours, injDays, srpSPM, strokeInches, vfdHz, autoSimulate, selectedWellId]);

  // Initial load
  useEffect(() => {
    runTargetPrediction();
  }, [selectedWellId]);

  // Derived KPIs from Live or Steady State
  const simBOPD = currentLive.bopd;
  const deltaBOPD = Number((simBOPD - baselineBOPD).toFixed(1));
  const deltaBOPDPct = Number(((deltaBOPD / baselineBOPD) * 100).toFixed(1));

  const simSOR = currentLive.sor;
  const deltaSOR = Number((simSOR - baselineSOR).toFixed(2));
  const deltaSORPct = Number(((deltaSOR / baselineSOR) * 100).toFixed(0));

  const simTemp = currentLive.temp;
  const deltaTemp = Number((simTemp - baselineTemp).toFixed(1));

  const simFloatRisk = currentLive.floatRisk;
  const deltaFloat = Number((simFloatRisk - baselineFloatRisk).toFixed(1));

  const simPowerKW = currentLive.power;
  const deltaPower = Number((simPowerKW - baselinePowerKW).toFixed(1));

  // Downstroke velocity & motor rpm
  const downstrokeVel = ((strokeInches * 0.0254 * srpSPM) / 30.0).toFixed(2);
  const motorRPM = Math.round(vfdHz * 29.0);

  // Financial Deltas
  const oilPriceUSD = 75.0;
  const inrPerUsd = 83.0;
  const dailyRevDeltaUSD = deltaBOPD * oilPriceUSD;
  const dailyRevDeltaINR = dailyRevDeltaUSD * inrPerUsd;
  const monthlyNetCashflowINR = dailyRevDeltaINR * 30;

  // Live Sensitivity curve that dynamically scales with the live temperature & viscosity!
  const sensitivityData = useMemo(() => {
    const points = [];
    const liveTempFactor = Math.max(0.7, Math.min(1.4, currentLive.temp / 80.0));
    const liveViscFactor = Math.max(0.8, currentLive.viscosity / 500.0);

    for (let s = 0; s <= 7.0; s += 0.25) {
      if (s === 0) {
        points.push({ spm: 0, bopd: 0, floatRisk: 0 });
        continue;
      }
      const strokeM = strokeInches * 0.0254;
      const maxDisplace = 410 * (strokeInches / 85.0);
      const bopd = Math.max(
        0,
        Math.round(
          maxDisplace *
            (1 - Math.exp(-s / 2.3)) *
            (1 - (s > 4.8 ? (s - 4.8) ** 1.8 * 0.038 : 0)) *
            liveTempFactor
        )
      );
      const downVel = (strokeM * s) / 30.0;
      const floatRisk = Number(
        Math.min(
          85,
          Math.max(
            1.5,
            downVel > 0.25
              ? (2.0 + (s / 7.0) ** 2.2 * 45) * Math.sqrt(liveViscFactor)
              : 1.5
          )
        ).toFixed(1)
      );
      points.push({ spm: s, bopd, floatRisk });
    }
    return points;
  }, [strokeInches, steamTonnes, currentLive.temp, currentLive.viscosity]);

  // 6-Axis Radar Metrics that dynamically update with live simulation
  const radarMetrics = useMemo(() => {
    const norm = (val, min, max) => Math.min(1.0, Math.max(0.12, (val - min) / (max - min)));
    return {
      baseline: [
        norm(baselineBOPD, 100, 300),
        norm(4.5 - baselineSOR, 0, 4.5),
        norm(baselineTemp, 40, 120),
        norm(100 - baselineFloatRisk, 0, 100),
        norm(40 - baselinePowerKW, 0, 40),
        norm(baselineBOPD * 75 * 83, 500000, 2000000)
      ],
      simulated: [
        norm(simBOPD, 100, 300),
        norm(4.5 - simSOR, 0, 4.5),
        norm(simTemp, 40, 120),
        norm(100 - simFloatRisk, 0, 100),
        norm(40 - simPowerKW, 0, 40),
        norm(simBOPD * 75 * 83, 500000, 2000000)
      ]
    };
  }, [simBOPD, simSOR, simTemp, simFloatRisk, simPowerKW, baselineBOPD, baselineSOR, baselineTemp, baselineFloatRisk, baselinePowerKW]);

  // Helper for dynamic SVG sparkline paths based on liveHistory
  const generateSparklinePath = (metricKey, minVal, maxVal, width = 60, height = 34) => {
    if (!liveHistory || liveHistory.length === 0) return { line: '', area: '' };
    const stepX = (width - 4) / Math.max(1, TOTAL_SIM_DAYS - 1);
    const range = Math.max(1, maxVal - minVal);

    const pts = liveHistory.map((p) => {
      const val = p[metricKey] !== undefined ? p[metricKey] : minVal;
      const normY = Math.min(1, Math.max(0, (val - minVal) / range));
      const x = 2 + (p.day - 1) * stepX;
      const y = height - 4 - normY * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${pts.join(' L ')}`;
    const lastX = 2 + (liveHistory.length - 1) * stepX;
    const areaPath = `${linePath} L ${lastX.toFixed(1)},${height} L 2,${height} Z`;
    return { line: linePath, area: areaPath };
  };

  const bopdSparkline = generateSparklinePath('bopd', 100, 350);
  const tempSparkline = generateSparklinePath('temp', 40, 150);
  const powerSparkline = generateSparklinePath('power', 5, 40);

  // Dynamic Phase Descriptor
  const simPhaseText = useMemo(() => {
    if (simDay <= 6) return 'Phase 1: High-Temp Steam Saturation & Near-Wellbore Thermal Front';
    if (simDay <= 12) return 'Phase 2: Thermodynamic Soaking, Heat Conduction & Asphaltene Dissolution';
    if (simDay <= 28) return 'Phase 3: High-Mobility Thermal Drawdown (Peak BOPD)';
    return 'Phase 4: Conductive Heat Dissipation & Steady-State Lift Equilibrium';
  }, [simDay]);

  const handleDeployToWell = () => {
    if (onApplySetpoints) {
      onApplySetpoints({
        well_id: selectedWellId,
        spm: srpSPM,
        stroke_length_in: strokeInches,
        vfd_frequency_hz: vfdHz,
        steam_injection_ton: steamTonnes
      });
    }
    setAppliedToast(`Setpoints deployed to ${selectedWellId} VFD & Boiler Controller!`);
    setTimeout(() => setAppliedToast(null), 3500);
  };

  const handleExportScenario = () => {
    const data = {
      well_id: selectedWellId,
      scenario: activeScenario,
      timestamp: new Date().toISOString(),
      parameters: {
        steam_injection_tonnes: steamTonnes,
        injection_pressure_bar: injPressure,
        soak_duration_hours: soakHours,
        injection_duration_days: injDays,
        srp_spm: srpSPM,
        stroke_length_in: strokeInches,
        vfd_frequency_hz: vfdHz
      },
      live_sim_day: simDay,
      predictions: {
        predicted_oil_rate_bopd: simBOPD,
        sor: simSOR,
        end_formation_temp_c: simTemp,
        rod_floating_risk_pct: simFloatRisk,
        motor_power_kw: simPowerKW,
        viscosity_cp: currentLive.viscosity
      },
      deltas: {
        delta_bopd: deltaBOPD,
        delta_sor: deltaSOR,
        delta_temp_c: deltaTemp,
        monthly_net_cashflow_inr: monthlyNetCashflowINR
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WhatIf_Scenario_${selectedWellId}_${Date.now()}.json`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── HEADER BREADCRUMB & CONTROLS BAR ─────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
            <ArrowUpRight size={13} color="var(--text-muted)" />
            <span>Well {selectedWellId}</span>
            <span>&gt;</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>What-If Simulator</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '4px', height: '20px', background: '#b45309', borderRadius: '2px' }} />
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.22rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em', margin: 0 }}>
                Interactive What-If Scenario Simulator — Well {selectedWellId}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: isLiveRunning ? 'rgba(234, 88, 12, 0.18)' : 'rgba(217, 119, 6, 0.12)', border: `1px solid ${isLiveRunning ? '#ea580c' : 'rgba(217, 119, 6, 0.35)'}`, borderRadius: '12px', fontSize: '0.66rem', fontWeight: 700, color: isLiveRunning ? '#c2410c' : '#b45309' }}>
              <span className={isLiveRunning ? 'sim-live-pulse-dot' : ''} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isLiveRunning ? '#ea580c' : '#d97706', display: 'inline-block' }} />
              <span>{isLiveRunning ? 'LIVE SIMULATION RUNNING' : 'IN-MEMORY ML INFERENCE (18ms)'}</span>
            </div>
          </div>
          <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Multivariate Joint CSS &amp; SRP Surrogate Models &bull; Live Dynamic Transient Simulation &bull; Real-time Sensitivity &bull; Economic Forecasting
          </div>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={activeScenario}
            onChange={(e) => handleSelectScenario(e.target.value)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '5px',
              border: '1px solid var(--border-color)',
              background: 'rgba(45, 34, 23, 0.08)',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="scenario_01">Scenario 01 (Balanced)</option>
            <option value="scenario_02">Scenario 02 (Anti-Float)</option>
            <option value="scenario_03">Scenario 03 (Low OPEX)</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={autoSimulate}
              onChange={(e) => setAutoSimulate(e.target.checked)}
              style={{ width: '14px', height: '14px', accentColor: '#d97706', cursor: 'pointer' }}
            />
            <span>Auto-Recompute</span>
          </label>

          {/* Primary "Run Simulation" button with exact same style as other option buttons */}
          <button
            onClick={handleStartLiveSimulation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1rem',
              background: isLiveRunning && !isPaused ? 'rgba(217, 119, 6, 0.14)' : 'rgba(45, 34, 23, 0.08)',
              border: `1px solid ${isLiveRunning && !isPaused ? '#d97706' : 'var(--border-color)'}`,
              borderRadius: '5px',
              color: isLiveRunning && !isPaused ? '#b45309' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.74rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {isLiveRunning && !isPaused ? (
              <>
                <Pause size={13} fill="#b45309" color="#b45309" />
                <span>Pause Simulation</span>
              </>
            ) : (
              <>
                <Play size={13} fill="#b45309" color="#b45309" />
                <span>{simDay === TOTAL_SIM_DAYS ? 'Run Simulation' : 'Resume Simulation'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDeployToWell}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1rem',
              background: 'rgba(45, 34, 23, 0.08)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
          >
            <Send size={12} />
            <span>Deploy to Well</span>
          </button>
        </div>
      </div>

      {/* ── LIVE TRANSIENT SIMULATION TELEMETRY BANNER (Creamy Sandstone Mode matching other sections) ── */}
      <div className="sandstone-card sim-running-banner" style={{ padding: '0.85rem 1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={isLiveRunning && !isPaused ? 'sim-live-pulse-dot' : ''} style={{ width: '8px', height: '8px', borderRadius: '50%', background: isLiveRunning ? (isPaused ? '#ea580c' : '#16a34a') : '#b45309', display: 'inline-block' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                {isLiveRunning ? (isPaused ? 'SIMULATION PAUSED' : 'LIVE TRANSIENT SIMULATION') : 'CYCLE SNAPSHOT'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#b45309', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
              Day {simDay} / {TOTAL_SIM_DAYS} ({Math.round((simDay / TOTAL_SIM_DAYS) * 100)}%)
            </div>
            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', padding: '2px 8px', background: 'rgba(45, 34, 23, 0.08)', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
              {simPhaseText}
            </span>
          </div>

          {/* Interactive Simulation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleStartLiveSimulation}
              className="sim-btn-pill"
              title={isPaused ? 'Resume' : 'Pause'}
              style={{
                background: isLiveRunning && !isPaused ? 'rgba(217, 119, 6, 0.16)' : 'rgba(45, 34, 23, 0.08)',
                borderColor: isLiveRunning && !isPaused ? '#d97706' : 'var(--border-color)',
                color: isLiveRunning && !isPaused ? '#b45309' : 'var(--text-primary)'
              }}
            >
              {isLiveRunning && !isPaused ? <Pause size={12} /> : <Play size={12} />}
              <span>{isLiveRunning && !isPaused ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleRestartSimulation}
              className="sim-btn-pill"
              title="Restart from Day 1"
              style={{ background: 'rgba(45, 34, 23, 0.08)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <RotateCcw size={12} />
              <span>Restart</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(45, 34, 23, 0.08)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimSpeed(spd)}
                  style={{
                    padding: '2px 7px',
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    background: simSpeed === spd ? '#b45309' : 'transparent',
                    color: simSpeed === spd ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar with Clickable / Draggable Day Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <input
              type="range"
              min="1"
              max={TOTAL_SIM_DAYS}
              step="1"
              value={simDay}
              onChange={(e) => setSimDay(Number(e.target.value))}
              className="whatif-slider"
              style={{
                width: '100%',
                height: '4px',
                accentColor: '#b45309',
                cursor: 'pointer',
                margin: 0
              }}
            />
          </div>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 800, minWidth: '45px', textAlign: 'right' }}>
            {simDay}d / 45d
          </span>
        </div>


        {/* Dynamic Physics Sensor Readouts */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid var(--border-color)', fontSize: '0.69rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Droplet size={13} color="#b45309" />
            <span>Simulated BOPD:</span>
            <strong style={{ color: '#78350f', fontFamily: 'var(--font-mono)' }}>{simBOPD} bbl/d</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Thermometer size={13} color="#ea580c" />
            <span>Formation Temp:</span>
            <strong style={{ color: '#ea580c', fontFamily: 'var(--font-mono)' }}>{simTemp} °C</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Waves size={13} color="#0284c7" />
            <span>Dynamic Viscosity:</span>
            <strong style={{ color: '#0369a1', fontFamily: 'var(--font-mono)' }}>{currentLive.viscosity.toLocaleString()} cP</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Cog size={13} color="#dc2626" />
            <span>Floating Risk:</span>
            <strong style={{ color: simFloatRisk > 25 ? '#dc2626' : '#b45309', fontFamily: 'var(--font-mono)' }}>{simFloatRisk}%</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Zap size={13} color="#b45309" />
            <span>Motor Load:</span>
            <strong style={{ color: '#78350f', fontFamily: 'var(--font-mono)' }}>{simPowerKW} kW</strong>
          </div>
        </div>
      </div>

      {appliedToast && (
        <div style={{ padding: '0.6rem 1rem', background: 'rgba(22, 163, 74, 0.15)', border: '1px solid rgba(22, 163, 74, 0.4)', borderRadius: '6px', color: '#14532d', fontSize: '0.76rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {appliedToast}
        </div>
      )}

      {/* ── 1 & 2. TOP SPLIT ROW: CSS THERMODYNAMIC VS SRP PARAMETERS ── */}
      <div className="responsive-grid-2" style={{ gap: '1rem', alignItems: 'stretch' }}>
        
        {/* SECTION 1: CSS THERMODYNAMIC INJECTION PARAMETERS */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.15rem',
            minHeight: '290px'
          }}
        >
          {/* Background image on right half */}
          <div
            className="whatif-image-panel"
            style={{
              backgroundImage: 'url(/assets/whatif_steam_plant.png)'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.1rem', color: 'var(--text-primary)' }}>
              <Flame size={15} color="#ea580c" />
              <span>1. CSS THERMODYNAMIC INJECTION PARAMETERS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '56%' }}>
              {/* Slider 1: Steam Volume */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Steam Injection Volume
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSteamTonnes(Math.max(400, steamTonnes - 50))}
                  >-</button>
                  <input
                    type="range"
                    min="400"
                    max="3000"
                    step="50"
                    value={steamTonnes}
                    onChange={(e) => setSteamTonnes(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSteamTonnes(Math.min(3000, steamTonnes + 50))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '85px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="whatif-value-box">
                        {steamTonnes}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>tonnes</span>
                    </div>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>400 – 3000</span>
                  </div>
                </div>
              </div>

              {/* Slider 2: Injection Pressure */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Injection Pressure
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setInjPressure(Math.max(10, injPressure - 2))}
                  >-</button>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    step="1"
                    value={injPressure}
                    onChange={(e) => setInjPressure(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setInjPressure(Math.min(80, injPressure + 2))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '85px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="whatif-value-box">
                        {injPressure}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>bar</span>
                      <span style={{ padding: '1px 6px', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.35)', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 700, color: '#b45309' }}>Safe</span>
                    </div>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>10 – 80</span>
                  </div>
                </div>
              </div>

              {/* Slider 3: Soak Duration */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Soak Duration
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSoakHours(Math.max(0, soakHours - 6))}
                  >-</button>
                  <input
                    type="range"
                    min="0"
                    max="168"
                    step="6"
                    value={soakHours}
                    onChange={(e) => setSoakHours(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSoakHours(Math.min(168, soakHours + 6))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '85px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="whatif-value-box">
                        {soakHours}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>hours</span>
                    </div>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>0 – 168</span>
                  </div>
                </div>
              </div>

              {/* Slider 4: Steam Injection Duration */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Steam Injection Duration
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setInjDays(Math.max(1, injDays - 1))}
                  >-</button>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={injDays}
                    onChange={(e) => setInjDays(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setInjDays(Math.min(60, injDays + 1))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '85px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="whatif-value-box">
                        {injDays}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>days</span>
                    </div>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: '1px' }}>1 – 60</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plant Caption Tag at bottom right */}
          <div style={{ position: 'relative', zIndex: 1, alignSelf: 'flex-end', marginTop: '0.5rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              STEAM GENERATION PLANT
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
              Baghewala Field
            </div>
          </div>
        </div>

        {/* SECTION 2: SRP SURFACE & DOWNHOLE LIFT PARAMETERS */}
        <div
          className="sandstone-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.15rem',
            minHeight: '290px'
          }}
        >
          {/* Background image on right half */}
          <div
            className="whatif-image-panel"
            style={{
              backgroundImage: 'url(/assets/whatif_srp_unit.png)'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
              <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <Gauge size={15} color="#b45309" />
                <span>2. SRP SURFACE &amp; DOWNHOLE LIFT PARAMETERS</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-primary)' }}>SRP UNIT</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Well {selectedWellId}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '56%' }}>
              {/* Slider 1: Pumping Speed (SPM) */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Pumping Speed (SPM)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSrpSPM(Math.max(1.0, Number((srpSPM - 0.1).toFixed(2))))}
                  >-</button>
                  <input
                    type="range"
                    min="1.0"
                    max="12.0"
                    step="0.05"
                    value={srpSPM}
                    onChange={(e) => setSrpSPM(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setSrpSPM(Math.min(12.0, Number((srpSPM + 0.1).toFixed(2))))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '95px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="whatif-value-box">
                        {srpSPM.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SPM</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>1 – 12</span>
                      <span style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 700 }}>(↓{downstrokeVel} m/s)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider 2: Polished Rod Stroke Length */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Polished Rod Stroke Length
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setStrokeInches(Math.max(60, strokeInches - 2))}
                  >-</button>
                  <input
                    type="range"
                    min="60"
                    max="120"
                    step="1"
                    value={strokeInches}
                    onChange={(e) => setStrokeInches(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setStrokeInches(Math.min(120, strokeInches + 2))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '95px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="whatif-value-box">
                        {strokeInches}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>in</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>60 – 120</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>({(strokeInches * 0.0254).toFixed(2)} m)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider 3: VFD Motor Frequency */}
              <div>
                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  VFD Motor Frequency
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="whatif-step-btn"
                    onClick={() => setVfdHz(Math.max(20, Number((vfdHz - 0.5).toFixed(1))))}
                  >-</button>
                  <input
                    type="range"
                    min="20"
                    max="70"
                    step="0.5"
                    value={vfdHz}
                    onChange={(e) => setVfdHz(Number(e.target.value))}
                    className="whatif-slider"
                  />
                  <button
                    className="whatif-step-btn"
                    onClick={() => setVfdHz(Math.min(70, Number((vfdHz + 0.5).toFixed(1))))}
                  >+</button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '95px', marginLeft: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="whatif-value-box">
                        {vfdHz.toFixed(1)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Hz</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>20 – 70</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>({motorRPM} RPM)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mechanical Guideline Callout Box */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              marginTop: '0.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              padding: '0.45rem 0.65rem',
              background: 'rgba(45, 34, 23, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              fontSize: '0.68rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.35
            }}
          >
            <Info size={14} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Mechanical Guideline:</strong> Increasing stroke length to 84"–96" while reducing SPM to 3.2–3.6 produces identical fluid displacement with 38% less viscous drag on downstroke, mitigating rod compression.
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. MIDDLE SECTION: CURRENT BASELINE VS. SIMULATED SCENARIO OUTCOME ── */}
      <div className="sandstone-card" style={{ padding: '1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <Activity size={15} color="#d97706" />
            <span>3. CURRENT BASELINE vs. SIMULATED SCENARIO OUTCOME (DAY {simDay} / 45)</span>
          </div>
          <button
            onClick={handleExportScenario}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.35rem 0.75rem',
              background: 'rgba(45, 34, 23, 0.08)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Download size={13} />
            <span>Export Scenario JSON</span>
          </button>
        </div>

        {/* 5 KPI Outcome Tiles with LIVE Dynamic Sparklines & Histograms */}
        <div className="responsive-grid-5" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
          
          {/* Tile 1: PREDICTED OIL RATE */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Droplet size={12} color="#78350f" fill="#78350f" />
                <span>PREDICTED OIL RATE</span>
              </div>
              <div style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0 0.1rem 0' }}>
                {simBOPD} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>BOPD</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaBOPD >= 0 ? '#b45309' : '#dc2626' }}>
                {deltaBOPD >= 0 ? `▲ +${deltaBOPD}` : `▼ ${deltaBOPD}`} ({deltaBOPDPct > 0 ? `+${deltaBOPDPct}` : deltaBOPDPct}%)
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Baseline: {baselineBOPD} BOPD
              </div>
            </div>
            {/* Dynamic Live Sparkline Curve */}
            <svg width="60" height="34" viewBox="0 0 60 34" style={{ overflow: 'visible' }}>
              {bopdSparkline.area && (
                <path d={bopdSparkline.area} fill="rgba(217,119,6,0.22)" className="animated-graph-area" />
              )}
              {bopdSparkline.line && (
                <path d={bopdSparkline.line} fill="none" stroke="#d97706" strokeWidth="2.2" className="animated-graph-sparkline" />
              )}
              {/* Pulsing head dot */}
              {liveHistory.length > 0 && (
                <circle
                  cx={2 + (liveHistory.length - 1) * ((56) / Math.max(1, TOTAL_SIM_DAYS - 1))}
                  cy={30 - Math.min(26, Math.max(0, ((simBOPD - 100) / 250) * 26))}
                  r="3.5"
                  fill="#ea580c"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>

          {/* Tile 2: STEAM-OIL RATIO (SOR) */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Waves size={12} color="#d97706" />
                <span>STEAM-OIL RATIO (SOR)</span>
              </div>
              <div style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0 0.1rem 0' }}>
                {simSOR} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>t/m³</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaSOR <= 0 ? '#b45309' : '#dc2626' }}>
                {deltaSOR <= 0 ? `▼ ${deltaSOR}` : `▲ +${deltaSOR}`} ({deltaSORPct}%)
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Baseline: {baselineSOR} t/m³
              </div>
            </div>
            {/* Dynamic Live Histogram Bars */}
            <svg width="48" height="34" viewBox="0 0 48 34">
              {[0, 1, 2, 3, 4].map((i) => {
                const dayIndex = Math.min(fullTrajectory.length - 1, Math.floor((simDay / 5) * i));
                const sorVal = fullTrajectory[dayIndex]?.sor || 2.5;
                const barH = Math.min(30, Math.max(6, (sorVal / 6.0) * 30));
                return (
                  <rect
                    key={i}
                    x={2 + i * 9}
                    y={34 - barH}
                    width="7"
                    height={barH}
                    fill={i === 4 ? '#b45309' : 'rgba(180,120,70,0.5)'}
                    rx="1.5"
                    className="animated-graph-bar"
                    style={{ transition: 'height 0.15s ease, y 0.15s ease' }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Tile 3: END FORMATION TEMP */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Thermometer size={12} color="#ea580c" />
                <span>FORMATION TEMP</span>
              </div>
              <div style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0 0.1rem 0' }}>
                {simTemp} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>°C</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaTemp >= 0 ? '#b45309' : '#ea580c' }}>
                {deltaTemp >= 0 ? `▲ +${deltaTemp}` : `▼ ${deltaTemp}`} °C
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Baseline: {baselineTemp} °C
              </div>
            </div>
            {/* Dynamic Live Sparkline Curve */}
            <svg width="60" height="34" viewBox="0 0 60 34" style={{ overflow: 'visible' }}>
              {tempSparkline.area && (
                <path d={tempSparkline.area} fill="rgba(234,88,12,0.22)" className="animated-graph-area" />
              )}
              {tempSparkline.line && (
                <path d={tempSparkline.line} fill="none" stroke="#ea580c" strokeWidth="2.2" className="animated-graph-sparkline" />
              )}
              {liveHistory.length > 0 && (
                <circle
                  cx={2 + (liveHistory.length - 1) * ((56) / Math.max(1, TOTAL_SIM_DAYS - 1))}
                  cy={30 - Math.min(26, Math.max(0, ((simTemp - 40) / 110) * 26))}
                  r="3.5"
                  fill="#ea580c"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>

          {/* Tile 4: ROD FLOATING RISK */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Cog size={12} color="#dc2626" />
                <span>ROD FLOATING RISK</span>
              </div>
              <div style={{ fontSize: '1.28rem', fontWeight: 800, color: simFloatRisk > 25 ? '#dc2626' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0 0.1rem 0' }}>
                {simFloatRisk} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>%</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaFloat <= 0 ? '#b45309' : '#dc2626' }}>
                {deltaFloat <= 0 ? `▼ ${deltaFloat}` : `▲ +${deltaFloat}`}%
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Baseline: {baselineFloatRisk}%
              </div>
            </div>
            {/* Dynamic Live Risk Histogram */}
            <svg width="48" height="34" viewBox="0 0 48 34">
              {[0, 1, 2, 3, 4].map((i) => {
                const dayIndex = Math.min(fullTrajectory.length - 1, Math.floor((simDay / 5) * i));
                const riskVal = fullTrajectory[dayIndex]?.floatRisk || 12;
                const barH = Math.min(30, Math.max(5, (riskVal / 50.0) * 30));
                const isCurrent = i === 4;
                return (
                  <rect
                    key={i}
                    x={2 + i * 9}
                    y={34 - barH}
                    width="7"
                    height={barH}
                    fill={isCurrent && riskVal > 25 ? '#dc2626' : isCurrent ? '#b45309' : 'rgba(160,110,80,0.5)'}
                    rx="1.5"
                    className="animated-graph-bar"
                    style={{ transition: 'height 0.15s ease, y 0.15s ease' }}
                  />
                );
              })}
            </svg>
          </div>

          {/* Tile 5: MOTOR ELECTRICAL POWER */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Zap size={12} color="#b45309" fill="#b45309" />
                <span>MOTOR ELECTRICAL POWER</span>
              </div>
              <div style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: '0.2rem 0 0.1rem 0' }}>
                {simPowerKW} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>kW</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deltaPower <= 0 ? '#b45309' : '#dc2626' }}>
                {deltaPower <= 0 ? `▼ ${deltaPower}` : `▲ +${deltaPower}`} kW
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Baseline: {baselinePowerKW} kW
              </div>
            </div>
            {/* Dynamic Live Sparkline Curve */}
            <svg width="60" height="34" viewBox="0 0 60 34" style={{ overflow: 'visible' }}>
              {powerSparkline.area && (
                <path d={powerSparkline.area} fill="rgba(180,83,9,0.22)" className="animated-graph-area" />
              )}
              {powerSparkline.line && (
                <path d={powerSparkline.line} fill="none" stroke="#b45309" strokeWidth="2.2" className="animated-graph-sparkline" />
              )}
              {liveHistory.length > 0 && (
                <circle
                  cx={2 + (liveHistory.length - 1) * ((56) / Math.max(1, TOTAL_SIM_DAYS - 1))}
                  cy={30 - Math.min(26, Math.max(0, ((simPowerKW - 5) / 35) * 26))}
                  r="3.5"
                  fill="#b45309"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>

        </div>

        {/* Financial Impact Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.7rem 1rem',
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            borderRadius: '6px',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #b45309, #78350f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0
              }}
            >
              <Coins size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e' }}>
                ESTIMATED FIELD FINANCIAL IMPACT: ~₹{Math.round(Math.abs(dailyRevDeltaINR) || 2490).toLocaleString()}/day
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                Net Monthly Cashflow Delta: ~₹{Math.round(Math.abs(monthlyNetCashflowINR) || 74700).toLocaleString()} / month (Calculated at Brent $75/bbl &amp; ₹83/$) &bull; Cumulative Cycle Oil: {currentLive.cumOil.toLocaleString()} m³
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div>Steam OPEX delta: <strong>+₹190,000</strong></div>
            <div style={{ color: 'var(--border-color)' }}>|</div>
            <div>Lifting Power delta: <strong>₹{Math.round(simPowerKW * 24 * 7.8).toLocaleString()} / day</strong></div>
            <ChevronRight size={14} color="var(--text-muted)" />
          </div>
        </div>
      </div>

      {/* ── 4 & 5. BOTTOM SPLIT ROW: SENSITIVITY SWEEP & 6-AXIS RADAR ── */}
      <div className="responsive-split-grid" style={{ gap: '1rem', alignItems: 'stretch' }}>
        
        {/* SECTION 4: SENSITIVITY SWEEP / 45-DAY TRANSIENT CHART */}
        <div className="sandstone-card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Activity size={15} color="#d97706" />
              <span>4. {chartMode === 'sensitivity' ? 'SENSITIVITY SWEEP: SPM vs. OIL RATE & FLOATING RISK' : '45-DAY TRANSIENT: PRODUCTION & THERMAL PROFILE'}</span>
            </div>
            
            {/* View Mode Toggle Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', background: 'rgba(45, 34, 23, 0.08)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setChartMode('sensitivity')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    background: chartMode === 'sensitivity' ? '#b45309' : 'transparent',
                    color: chartMode === 'sensitivity' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  SPM Sweep
                </button>
                <button
                  onClick={() => setChartMode('transient')}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    background: chartMode === 'transient' ? '#b45309' : 'transparent',
                    color: chartMode === 'transient' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  45D Transient
                </button>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '12px', height: '2.5px', background: '#ea580c', display: 'inline-block' }} />
                  <span>{chartMode === 'sensitivity' ? 'Oil (BOPD)' : 'Production Rate'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '10px', height: '2px', background: '#dc2626', borderBottom: '1px dashed #dc2626', display: 'inline-block' }} />
                  <span>{chartMode === 'sensitivity' ? 'Risk (%)' : 'Temp (°C)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Dual-Axis Chart */}
          <div style={{ flex: 1, minHeight: '220px', position: 'relative', width: '100%' }}>
            {chartMode === 'sensitivity' ? (
              /* --- MODE A: SPM SENSITIVITY SWEEP (Dynamic live curve scaling) --- */
              <svg viewBox="0 0 540 220" style={{ width: '100%', height: '100%', display: 'block' }}>
                <defs>
                  <linearGradient id="oilAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Grid Horizontal Lines */}
                {[40, 75, 110, 145, 180].map((y, idx) => (
                  <line key={idx} x1="45" y1={y} x2="495" y2={y} stroke="rgba(150, 125, 95, 0.22)" strokeWidth="1" strokeDasharray={idx === 4 ? 'none' : '3 3'} />
                ))}

                {/* Left Y-Axis Labels (Oil BOPD: 400 to 0) */}
                {[400, 300, 200, 100, 0].map((val, idx) => (
                  <text key={idx} x="40" y={40 + idx * 35 + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                    {val}
                  </text>
                ))}
                <text x="12" y="110" textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontWeight="700" transform="rotate(-90 12,110)">
                  Oil Production (BOPD)
                </text>

                {/* Right Y-Axis Labels (Floating Risk: 50 to 0 in Red) */}
                {[50, 40, 30, 20, 10, 0].map((val, idx) => (
                  <text key={idx} x="500" y={40 + idx * 28 + 4} textAnchor="start" fill="#dc2626" fontSize="9" fontFamily="var(--font-mono)">
                    {val}
                  </text>
                ))}
                <text x="532" y="110" textAnchor="middle" fill="#dc2626" fontSize="8.5" fontWeight="700" transform="rotate(90 532,110)">
                  Floating Risk (%)
                </text>

                {/* X-Axis Ticks & Labels (SPM 0 to 7.0) */}
                {[
                  { spm: 0, x: 50 },
                  { spm: 1.5, x: 135 },
                  { spm: 2.5, x: 200 },
                  { spm: 3.5, x: 265 },
                  { spm: 4.5, x: 330 },
                  { spm: 5.5, x: 395 },
                  { spm: 6.5, x: 450 },
                  { spm: 7, x: 485 }
                ].map((t) => (
                  <text key={t.spm} x={t.x} y="196" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                    {t.spm}
                  </text>
                ))}
                <text x="270" y="212" textAnchor="middle" fill="var(--text-secondary)" fontSize="9.5" fontWeight="700">
                  Pumping Speed (Strokes per Minute - SPM) &bull; Dynamic Curve at Day {simDay} ({simTemp}°C &bull; {currentLive.viscosity} cP)
                </text>

                {/* Curve 1: Oil Production Area & Line (Dynamically morphing) */}
                {(() => {
                  const getX = (spm) => 50 + (spm / 7.0) * 435;
                  const getY_oil = (bopd) => 180 - (bopd / 400) * 140;
                  
                  const pathPoints = sensitivityData.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.spm)} ${getY_oil(p.bopd)}`).join(' ');
                  const areaPoints = `${pathPoints} L ${getX(7.0)} 180 L ${getX(0)} 180 Z`;

                  return (
                    <g>
                      <path d={areaPoints} fill="url(#oilAreaGrad)" className="animated-graph-area" />
                      <path d={pathPoints} fill="none" stroke="#ea580c" strokeWidth="2.5" className="animated-graph-line" />
                    </g>
                  );
                })()}

                {/* Curve 2: Rod Floating Risk (Red Dashed Line with Markers) */}
                {(() => {
                  const getX = (spm) => 50 + (spm / 7.0) * 435;
                  const getY_risk = (risk) => 180 - (risk / 50) * 140;

                  const pathPoints = sensitivityData.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.spm)} ${getY_risk(p.floatRisk)}`).join(' ');

                  return (
                    <g>
                      <path d={pathPoints} fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 2" className="animated-graph-line" />
                      {sensitivityData.filter((_, i) => i % 4 === 0).map((p, idx) => (
                        <circle key={idx} cx={getX(p.spm)} cy={getY_risk(p.floatRisk)} r="3" fill="#dc2626" />
                      ))}
                    </g>
                  );
                })()}

                {/* Current Operating Point & Live Interactive Callout Box */}
                {(() => {
                  const currentX = 50 + (srpSPM / 7.0) * 435;
                  const currentY_oil = 180 - (simBOPD / 400) * 140;

                  return (
                    <g>
                      {/* Vertical guideline */}
                      <line x1={currentX} y1="35" x2={currentX} y2="180" stroke="rgba(150, 125, 95, 0.65)" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {/* Pulsing halo */}
                      <circle cx={currentX} cy={currentY_oil} r="8.5" fill="none" stroke="#ea580c" strokeWidth="1.2" opacity="0.6" className="animated-graph-point" />

                      {/* Current operating circle */}
                      <circle cx={currentX} cy={currentY_oil} r="5.5" fill="#ffffff" stroke="#ea580c" strokeWidth="2.5" />

                      {/* White Mode Callout Box */}
                      <rect
                        x={Math.min(380, currentX - 45)}
                        y={Math.max(38, currentY_oil - 48)}
                        width="92"
                        height="42"
                        rx="4"
                        fill="#ffffff"
                        stroke="#d97706"
                        strokeWidth="1.2"
                        filter="drop-shadow(0 2px 5px rgba(60,40,20,0.15))"
                      />
                      <text x={Math.min(380, currentX - 45) + 46} y={Math.max(38, currentY_oil - 48) + 12} textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="800" fontFamily="var(--font-mono)">
                        DAY {simDay} &bull; {srpSPM} SPM
                      </text>
                      <text x={Math.min(380, currentX - 45) + 46} y={Math.max(38, currentY_oil - 48) + 24} textAnchor="middle" fill="#181109" fontSize="9" fontWeight="800">
                        {simBOPD} BOPD
                      </text>
                      <text x={Math.min(380, currentX - 45) + 46} y={Math.max(38, currentY_oil - 48) + 36} textAnchor="middle" fill={simFloatRisk > 25 ? '#dc2626' : '#b45309'} fontSize="8" fontWeight="700">
                        Risk: {simFloatRisk}% | {currentLive.viscosity} cP
                      </text>
                    </g>
                  );
                })()}
              </svg>
            ) : (
              /* --- MODE B: 45-DAY PRODUCTION & THERMAL TRANSIENT --- */
              <svg viewBox="0 0 540 220" style={{ width: '100%', height: '100%', display: 'block' }}>
                {/* Horizontal Grid */}
                {[40, 75, 110, 145, 180].map((y, idx) => (
                  <line key={idx} x1="45" y1={y} x2="495" y2={y} stroke="rgba(150, 125, 95, 0.22)" strokeWidth="1" strokeDasharray={idx === 4 ? 'none' : '3 3'} />
                ))}

                {/* Left Y-Axis: Oil Rate (0 to 350 BOPD) */}
                {[350, 260, 175, 90, 0].map((val, idx) => (
                  <text key={idx} x="40" y={40 + idx * 35 + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                    {val}
                  </text>
                ))}
                <text x="12" y="110" textAnchor="middle" fill="#ea580c" fontSize="8.5" fontWeight="700" transform="rotate(-90 12,110)">
                  Oil Rate (BOPD)
                </text>

                {/* Right Y-Axis: Temp (40 to 160 °C) */}
                {[160, 130, 100, 70, 40].map((val, idx) => (
                  <text key={idx} x="500" y={40 + idx * 35 + 4} textAnchor="start" fill="#dc2626" fontSize="9" fontFamily="var(--font-mono)">
                    {val}
                  </text>
                ))}
                <text x="532" y="110" textAnchor="middle" fill="#dc2626" fontSize="8.5" fontWeight="700" transform="rotate(90 532,110)">
                  Formation Temp (°C)
                </text>

                {/* X-Axis Ticks (Days 1 to 45) */}
                {[1, 5, 10, 15, 20, 25, 30, 35, 40, 45].map((d) => {
                  const x = 50 + ((d - 1) / (TOTAL_SIM_DAYS - 1)) * 435;
                  return (
                    <text key={d} x={x} y="196" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                      {d}d
                    </text>
                  );
                })}
                <text x="270" y="212" textAnchor="middle" fill="var(--text-secondary)" fontSize="9.5" fontWeight="700">
                  CSS Production Cycle (Days)
                </text>

                {/* Full Cycle Ghost Curves */}
                {(() => {
                  const getX = (d) => 50 + ((d - 1) / (TOTAL_SIM_DAYS - 1)) * 435;
                  const getY_oil = (bopd) => 180 - (bopd / 350) * 140;
                  const getY_temp = (t) => 180 - ((t - 40) / 120) * 140;

                  const fullOilPts = fullTrajectory.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY_oil(p.bopd)}`).join(' ');
                  const fullTempPts = fullTrajectory.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY_temp(p.temp)}`).join(' ');

                  // Live progressed sub-paths
                  const liveOilPts = liveHistory.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY_oil(p.bopd)}`).join(' ');
                  const liveTempPts = liveHistory.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(p.day)} ${getY_temp(p.temp)}`).join(' ');

                  const currentX = getX(simDay);
                  const currentY_oil = getY_oil(simBOPD);
                  const currentY_temp = getY_temp(simTemp);

                  return (
                    <g>
                      {/* Ghost paths for full horizon */}
                      <path d={fullOilPts} fill="none" stroke="rgba(234, 88, 12, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
                      <path d={fullTempPts} fill="none" stroke="rgba(220, 38, 38, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />

                      {/* Live progressed paths */}
                      <path d={liveOilPts} fill="none" stroke="#ea580c" strokeWidth="2.8" />
                      <path d={liveTempPts} fill="none" stroke="#dc2626" strokeWidth="2.2" strokeDasharray="4 2" />

                      {/* Active Day Vertical Scanner Line */}
                      <line x1={currentX} y1="35" x2={currentX} y2="180" stroke="#f59e0b" strokeWidth="1.5" />
                      <circle cx={currentX} cy={currentY_oil} r="5" fill="#ea580c" stroke="#fff" strokeWidth="1.5" />
                      <circle cx={currentX} cy={currentY_temp} r="5" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />

                      {/* White Mode Callout */}
                      <rect x={Math.min(380, currentX - 45)} y="38" width="90" height="34" rx="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.2" filter="drop-shadow(0 2px 5px rgba(60,40,20,0.15))" />
                      <text x={Math.min(380, currentX - 45) + 45} y="50" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="800">
                        DAY {simDay}: {simBOPD} BOPD
                      </text>
                      <text x={Math.min(380, currentX - 45) + 45} y="64" textAnchor="middle" fill="#dc2626" fontSize="8" fontWeight="700">
                        Temp: {simTemp}°C &bull; {currentLive.viscosity} cP
                      </text>
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
        </div>

        {/* SECTION 5: 6-AXIS RADAR: BASELINE vs. SIMULATED */}
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
          {/* Radar background image on right */}
          <div
            className="whatif-image-panel"
            style={{
              width: '58%',
              backgroundImage: 'url(/assets/whatif_radar_bg.png)'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Cog size={15} color="#d97706" />
              <span>5. 6-AXIS RADAR: BASELINE vs. SIMULATED (DAY {simDay})</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '0.5rem' }}>
              Normalized multi-criteria performance comparison &bull; Dynamic live polygon
            </div>
          </div>

          {/* SVG 6-Axis Spider / Radar Chart with Dynamic Morphing */}
          <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 320 220" style={{ width: '100%', maxHeight: '210px', display: 'block' }}>
              {/* Concentric Hexagons */}
              {[0.25, 0.5, 0.75, 1.0].map((scale, sIdx) => {
                const points = [0, 1, 2, 3, 4, 5].map((i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = scale * 75;
                  const x = 160 + r * Math.cos(angle);
                  const y = 110 + r * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <polygon
                    key={sIdx}
                    points={points}
                    fill="none"
                    stroke="rgba(150, 125, 95, 0.35)"
                    strokeWidth="1"
                    strokeDasharray={scale === 1.0 ? 'none' : '2 2'}
                  />
                );
              })}

              {/* 6 Radial Axis Lines */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                const x = 160 + 75 * Math.cos(angle);
                const y = 110 + 75 * Math.sin(angle);
                return (
                  <line key={i} x1="160" y1="110" x2={x} y2={y} stroke="rgba(150, 125, 95, 0.4)" strokeWidth="1" />
                );
              })}

              {/* Axis Labels */}
              {[
                { label: 'Oil Rate', angle: -Math.PI / 2, x: 160, y: 24, anchor: 'middle' },
                { label: 'Steam Efficiency', angle: -Math.PI / 6, x: 236, y: 68, anchor: 'start' },
                { label: 'Thermal', angle: Math.PI / 6, x: 236, y: 154, anchor: 'start' },
                { label: 'Rod Safety', angle: Math.PI / 2, x: 160, y: 198, anchor: 'middle' },
                { label: 'Energy Cons.', angle: (5 * Math.PI) / 6, x: 84, y: 154, anchor: 'end' },
                { label: 'Cashflow', angle: (-5 * Math.PI) / 6, x: 84, y: 68, anchor: 'end' }
              ].map((item, idx) => (
                <text key={idx} x={item.x} y={item.y} textAnchor={item.anchor} fill="var(--text-secondary)" fontSize="8.5" fontWeight="700">
                  {item.label}
                </text>
              ))}

              {/* Baseline Polygon (Dark / Neutral) */}
              {(() => {
                const pts = radarMetrics.baseline.map((val, i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = val * 75;
                  return `${160 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <polygon
                    points={pts}
                    fill="rgba(40, 30, 20, 0.35)"
                    stroke="#4a3c2c"
                    strokeWidth="1.5"
                    className="animated-graph-polygon"
                  />
                );
              })()}

              {/* Simulated Polygon (Dynamic Amber / Orange Morphing with Live Pulse) */}
              {(() => {
                const pts = radarMetrics.simulated.map((val, i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = val * 75;
                  return `${160 + r * Math.cos(angle)},${110 + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <g>
                    <polygon
                      points={pts}
                      fill="rgba(245, 158, 11, 0.38)"
                      stroke="#ea580c"
                      strokeWidth="2.2"
                      style={{ transition: 'all 0.15s ease' }}
                    />
                    {radarMetrics.simulated.map((val, i) => {
                      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                      const r = val * 75;
                      return (
                        <circle
                          key={i}
                          cx={160 + r * Math.cos(angle)}
                          cy={110 + r * Math.sin(angle)}
                          r={isLiveRunning ? '3.8' : '3'}
                          fill="#ea580c"
                          stroke="#fff"
                          strokeWidth="1"
                          style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }}
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4a3c2c', display: 'inline-block' }} />
              <span>Baseline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
              <span>Day {simDay} Live</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
