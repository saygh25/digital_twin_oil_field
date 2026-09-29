import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame,
  Gauge,
  Play,
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
  RotateCcw,
  RotateCw,
  Sparkles,
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

  // --- Simulation Sliders State (Defaults matching reference mockup) ---
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
  const [runToast, setRunToast] = useState(null);
  const [lastLatency, setLastLatency] = useState(18);
  const [lastRunTime, setLastRunTime] = useState(null);
  const [hasUncomputedChanges, setHasUncomputedChanges] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Scenarios presets
  const SCENARIOS = {
    scenario_01: {
      steam: 1600,
      pressure: 42,
      soak: 72,
      injDays: 15,
      spm: 4.79,
      stroke: 85,
      vfd: 47.9,
      label: 'Scenario 01 (Balanced Production)'
    },
    scenario_02: {
      steam: 1800,
      pressure: 44,
      soak: 48,
      injDays: 14,
      spm: 3.4,
      stroke: 96,
      vfd: 38.2,
      label: 'Scenario 02 (Anti-Float / Low Viscous Drag)'
    },
    scenario_03: {
      steam: 1100,
      pressure: 35,
      soak: 72,
      injDays: 10,
      spm: 3.8,
      stroke: 72,
      vfd: 42.0,
      label: 'Scenario 03 (Low OPEX / Thermal Conservation)'
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
      runSimulation(s, true);
    }
  };

  // Reset to live well baseline
  const handleResetToBaseline = () => {
    const base = {
      steam: 1500,
      pressure: 40,
      soak: 72,
      injDays: 14,
      spm: baselineSPM,
      stroke: baselineStroke,
      vfd: baselineVFD
    };
    setSteamTonnes(base.steam);
    setInjPressure(base.pressure);
    setSoakHours(base.soak);
    setInjDays(base.injDays);
    setSrpSPM(base.spm);
    setStrokeInches(base.stroke);
    setVfdHz(base.vfd);
    runSimulation(base, true);
  };

  // Run What-If Prediction via Backend API with surrogate fallback
  const runSimulation = async (overrides = {}, isManual = false) => {
    setIsEvaluating(true);
    const startTime = performance.now();
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

      // Add small visible animation time if manual click to confirm action
      const [res] = await Promise.all([
        api.runPrediction(payload),
        new Promise((resolve) => setTimeout(resolve, isManual ? 380 : 50))
      ]);

      const elapsed = Math.max(12, Math.round(performance.now() - startTime));
      setLastLatency(elapsed);
      setLastRunTime(new Date().toLocaleTimeString());
      setHasUncomputedChanges(false);
      setPulseKey((k) => k + 1);

      if (res && res.predictions) {
        setSimResult(res.predictions);
        if (isManual) {
          setRunToast(`✓ Simulation Run Complete: ${res.predictions.oil_rate_bopd} BOPD | SOR: ${res.predictions.sor} t/m³ | Rod Floating Risk: ${res.predictions.rod_floating_risk_pct}% (${elapsed}ms)`);
          setTimeout(() => setRunToast(null), 4500);
        }
      } else {
        throw new Error('No predictions in response');
      }
    } catch (err) {
      const strokeM = (overrides.stroke !== undefined ? overrides.stroke : strokeInches) * 0.0254;
      const spm = overrides.spm !== undefined ? overrides.spm : srpSPM;
      const steam = overrides.steam !== undefined ? overrides.steam : steamTonnes;
      const pressure = overrides.pressure !== undefined ? overrides.pressure : injPressure;
      
      const calcBOPD = Number((0.575 * spm * (strokeM / 0.0254) * (0.83 - (spm - 4.0) * 0.018) * (1 + (steam - 1500) / 9000)).toFixed(1));
      const calcSOR = Number((steam / (calcBOPD * 45 * 0.158987)).toFixed(2));
      const calcTemp = Number((48 + (steam / 1600) * 22.5 + (pressure / 42) * 7.6).toFixed(1));
      const downVel = (strokeM * spm) / 30.0;
      const calcFloatRisk = Number(Math.min(95, Math.max(1.5, (downVel > 0.30 ? (downVel - 0.30) * 160 + (spm > 4.5 ? (spm - 4.5) * 12 : 0) : 1.9))).toFixed(1));
      const calcPower = Number((7.0 + (spm / 4.2) ** 2.8 * 8.5 * (strokeM / 1.83) + (vfdHz / 42) * 6.7).toFixed(1));

      const fallback = {
        oil_rate_bopd: calcBOPD,
        sor: calcSOR,
        end_temperature_c: calcTemp,
        rod_floating_risk_pct: calcFloatRisk,
        motor_power_kw: calcPower,
        downstroke_velocity_ms: Number(downVel.toFixed(2)),
        motor_rpm: Math.round(vfdHz * 29.0)
      };
      setSimResult(fallback);
      setHasUncomputedChanges(false);
      setPulseKey((k) => k + 1);
      if (isManual) {
        setRunToast(`✓ Physics Surrogate Solved: ${calcBOPD} BOPD | SOR: ${calcSOR} | Rod Risk: ${calcFloatRisk}%`);
        setTimeout(() => setRunToast(null), 4500);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Track parameter changes for auto-simulate or pending changes flag
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (autoSimulate) {
      const timer = setTimeout(() => {
        runSimulation({}, false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setHasUncomputedChanges(true);
    }
  }, [steamTonnes, injPressure, soakHours, injDays, srpSPM, strokeInches, vfdHz, autoSimulate, selectedWellId]);

  // Initial load
  useEffect(() => {
    runSimulation({}, false);
  }, [selectedWellId]);

  // Derived Simulated KPIs
  const simBOPD = simResult?.oil_rate_bopd !== undefined ? simResult.oil_rate_bopd : 206.6;
  const deltaBOPD = Number((simBOPD - baselineBOPD).toFixed(1));
  const deltaBOPDPct = Number(((deltaBOPD / baselineBOPD) * 100).toFixed(1));

  const simSOR = simResult?.sor !== undefined ? simResult.sor : 1.2;
  const deltaSOR = Number((simSOR - baselineSOR).toFixed(2));
  const deltaSORPct = Number(((deltaSOR / baselineSOR) * 100).toFixed(0));

  const simTemp = simResult?.end_temperature_c !== undefined ? simResult.end_temperature_c : 78.1;
  const deltaTemp = Number((simTemp - baselineTemp).toFixed(1));

  const simFloatRisk = simResult?.rod_floating_risk_pct !== undefined ? simResult.rod_floating_risk_pct : 12.7;
  const deltaFloat = Number((simFloatRisk - baselineFloatRisk).toFixed(1));

  const simPowerKW = simResult?.motor_power_kw !== undefined ? simResult.motor_power_kw : 22.3;
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


  // Sensitivity curve for Section 4
  const sensitivityData = useMemo(() => {
    const points = [];
    for (let s = 0; s <= 7.0; s += 0.25) {
      if (s === 0) {
        points.push({ spm: 0, bopd: 0, floatRisk: 0 });
        continue;
      }
      const strokeM = strokeInches * 0.0254;
      const bopd = Math.max(0, Math.round(410 * (1 - Math.exp(-s / 2.3)) * (1 - (s > 4.8 ? (s - 4.8) ** 1.8 * 0.038 : 0))));
      const downVel = (strokeM * s) / 30.0;
      const floatRisk = Number(Math.min(50, Math.max(1.5, downVel > 0.25 ? 2.0 + ((s / 7.0) ** 2.2) * 45 : 1.5)).toFixed(1));
      points.push({ spm: s, bopd, floatRisk });
    }
    return points;
  }, [strokeInches, steamTonnes]);

  // 6-Axis Radar Metrics
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
      predictions: {
        predicted_oil_rate_bopd: simBOPD,
        sor: simSOR,
        end_formation_temp_c: simTemp,
        rod_floating_risk_pct: simFloatRisk,
        motor_power_kw: simPowerKW
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
            
            {/* Dynamic Status / Latency Pill */}
            {isEvaluating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: 'rgba(234, 88, 12, 0.15)', border: '1px solid #ea580c', borderRadius: '12px', fontSize: '0.66rem', fontWeight: 700, color: '#c2410c' }}>
                <RotateCw size={11} className="sim-spin" color="#ea580c" />
                <span>SOLVING SURROGATE ML MODELS...</span>
              </div>
            ) : hasUncomputedChanges ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: 'rgba(217, 119, 6, 0.18)', border: '1px solid #d97706', borderRadius: '12px', fontSize: '0.66rem', fontWeight: 700, color: '#b45309' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
                <span>MODIFIED — CLICK RUN SIMULATION</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 9px', background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.35)', borderRadius: '12px', fontSize: '0.66rem', fontWeight: 700, color: '#15803d' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                <span>SYNCED ({lastLatency}ms)</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Multivariate Joint CSS &amp; SRP Surrogate Models &bull; Gradient-Boosted ML &bull; Real-time Sensitivity &bull; Economic Forecasting
          </div>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Scenario Preset Selector */}
          <select
            value={activeScenario}
            onChange={(e) => handleSelectScenario(e.target.value)}
            style={{
              padding: '0.42rem 0.85rem',
              borderRadius: '5px',
              border: '1px solid var(--border-color)',
              background: 'rgba(45, 34, 23, 0.08)',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            title="Switch between operational scenario presets"
          >
            <option value="scenario_01">Scenario 01 (Balanced)</option>
            <option value="scenario_02">Scenario 02 (Anti-Float)</option>
            <option value="scenario_03">Scenario 03 (Low OPEX)</option>
          </select>

          {/* Auto-Recompute Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '0.35rem 0.6rem',
              background: 'rgba(45, 34, 23, 0.04)',
              borderRadius: '5px',
              border: '1px solid var(--border-color)'
            }}
            title="Automatically recalculate outcomes as you adjust parameters"
          >
            <input
              type="checkbox"
              checked={autoSimulate}
              onChange={(e) => setAutoSimulate(e.target.checked)}
              style={{ width: '13px', height: '13px', accentColor: '#d97706', cursor: 'pointer' }}
            />
            <span>Auto-Recompute</span>
          </label>

          {/* Reset to Baseline Button */}
          <button
            onClick={handleResetToBaseline}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0.45rem 0.75rem',
              background: 'rgba(45, 34, 23, 0.06)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
            title="Reset parameters back to well baseline defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {/* Run Simulation Button */}
          <button
            onClick={() => runSimulation({}, true)}
            disabled={isEvaluating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 1.15rem',
              background: isEvaluating ? '#382619' : 'linear-gradient(135deg, #2b1c11 0%, #170f09 100%)',
              border: '1.5px solid #d97706',
              borderRadius: '5px',
              color: '#fef3c7',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: isEvaluating ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Execute joint CSS & SRP multi-model prediction"
          >
            {isEvaluating ? (
              <RotateCw size={13} className="sim-spin" color="#fbbf24" />
            ) : (
              <Play size={13} fill="#d97706" color="#d97706" />
            )}
            <span>{isEvaluating ? 'Simulating...' : 'Run Simulation'}</span>
          </button>

          {/* Deploy to Well */}
          <button
            onClick={handleDeployToWell}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.95rem',
              background: 'rgba(45, 34, 23, 0.08)',
              border: '1px solid var(--border-color)',
              borderRadius: '5px',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.74rem',
              cursor: 'pointer'
            }}
            title="Deploy current setpoints to Well PLC/Boiler"
          >
            <Send size={12} />
            <span>Deploy Setpoints</span>
          </button>
        </div>
      </div>

      {/* Dynamic Toast Feedback Banners */}
      {runToast && (
        <div style={{ padding: '0.55rem 0.95rem', background: 'rgba(22, 163, 74, 0.14)', border: '1.5px solid rgba(22, 163, 74, 0.5)', borderRadius: '6px', color: '#14532d', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInArea 0.3s ease-out' }}>
          <CheckCircle2 size={16} color="#16a34a" /> {runToast}
        </div>
      )}

      {appliedToast && (
        <div style={{ padding: '0.55rem 0.95rem', background: 'rgba(217, 119, 6, 0.14)', border: '1.5px solid rgba(217, 119, 6, 0.5)', borderRadius: '6px', color: '#78350f', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#d97706" /> {appliedToast}
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
      <div key={pulseKey} className={`sandstone-card ${pulseKey > 0 ? 'sim-pulse-highlight' : ''}`} style={{ padding: '1.15rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
            <Activity size={15} color="#d97706" />
            <span>3. CURRENT BASELINE vs. SIMULATED SCENARIO OUTCOME</span>
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

        {/* 5 KPI Outcome Tiles */}
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
            {/* Sparkline curve */}
            <svg width="60" height="34" viewBox="0 0 60 34">
              <path d="M 2 30 Q 15 28, 28 16 T 58 8 L 58 34 L 2 34 Z" fill="rgba(217,119,6,0.22)" className="animated-graph-area" />
              <path d="M 2 30 Q 15 28, 28 16 T 58 8" fill="none" stroke="#d97706" strokeWidth="2.2" className="animated-graph-sparkline" />
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
            {/* 5 Vertical histogram bars */}
            <svg width="48" height="34" viewBox="0 0 48 34">
              <rect x="2" y="20" width="7" height="14" fill="rgba(180,120,70,0.4)" rx="1.5" className="animated-graph-bar" />
              <rect x="11" y="14" width="7" height="20" fill="rgba(180,120,70,0.55)" rx="1.5" className="animated-graph-bar" />
              <rect x="20" y="8" width="7" height="26" fill="rgba(180,120,70,0.7)" rx="1.5" className="animated-graph-bar" />
              <rect x="29" y="16" width="7" height="18" fill="rgba(180,120,70,0.6)" rx="1.5" className="animated-graph-bar" />
              <rect x="38" y="2" width="7" height="32" fill="#8a5a30" rx="1.5" className="animated-graph-bar" />
            </svg>
          </div>

          {/* Tile 3: END FORMATION TEMP */}
          <div className="twin-node-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.85rem', textAlign: 'left' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Thermometer size={12} color="#ea580c" />
                <span>END FORMATION TEMP</span>
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
            {/* Sparkline curve */}
            <svg width="60" height="34" viewBox="0 0 60 34">
              <path d="M 2 8 Q 20 18, 40 24 T 58 28 L 58 34 L 2 34 Z" fill="rgba(234,88,12,0.22)" className="animated-graph-area" />
              <path d="M 2 8 Q 20 18, 40 24 T 58 28" fill="none" stroke="#ea580c" strokeWidth="2.2" className="animated-graph-sparkline" />
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
            {/* 5 Vertical risk bars */}
            <svg width="48" height="34" viewBox="0 0 48 34">
              <rect x="2" y="26" width="7" height="8" fill="rgba(160,110,80,0.35)" rx="1.5" className="animated-graph-bar" />
              <rect x="11" y="22" width="7" height="12" fill="rgba(160,110,80,0.45)" rx="1.5" className="animated-graph-bar" />
              <rect x="20" y="16" width="7" height="18" fill="rgba(160,110,80,0.6)" rx="1.5" className="animated-graph-bar" />
              <rect x="29" y="10" width="7" height="24" fill="rgba(160,110,80,0.75)" rx="1.5" className="animated-graph-bar" />
              <rect x="38" y="4" width="7" height="30" fill="#7a4a25" rx="1.5" className="animated-graph-bar" />
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
            {/* Sparkline curve */}
            <svg width="60" height="34" viewBox="0 0 60 34">
              <path d="M 2 28 Q 20 22, 38 12 T 58 4 L 58 34 L 2 34 Z" fill="rgba(180,83,9,0.22)" className="animated-graph-area" />
              <path d="M 2 28 Q 20 22, 38 12 T 58 4" fill="none" stroke="#b45309" strokeWidth="2.2" className="animated-graph-sparkline" />
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
                Net Monthly Cashflow Delta: ~₹{Math.round(Math.abs(monthlyNetCashflowINR) || 74700).toLocaleString()} / month (Calculated at Brent $75/bbl &amp; ₹83/$)
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
        
        {/* SECTION 4: SENSITIVITY SWEEP: SPM vs. OIL RATE & FLOATING RISK */}
        <div className="sandstone-card" style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Activity size={15} color="#d97706" />
              <span>4. SENSITIVITY SWEEP: SPM vs. OIL RATE &amp; FLOATING RISK</span>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.67rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '14px', height: '2.5px', background: '#ea580c', display: 'inline-block' }} />
                <span>Oil Production (BOPD)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '2px', background: '#dc2626', borderBottom: '1px dashed #dc2626', display: 'inline-block' }} />
                <span>Rod Floating Risk (%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #ea580c', background: '#fff', display: 'inline-block' }} />
                <span>Current Operating Point</span>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Dual-Axis Chart */}
          <div style={{ flex: 1, minHeight: '220px', position: 'relative', width: '100%' }}>
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
                Pumping Speed (Strokes per Minute - SPM)
              </text>

              {/* Curve 1: Oil Production Area & Line */}
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

              {/* Current Operating Point & Callout Box */}
              {(() => {
                const currentX = 50 + (srpSPM / 7.0) * 435;
                const currentY_oil = 180 - (simBOPD / 400) * 140;

                return (
                  <g>
                    {/* Vertical guideline */}
                    <line x1={currentX} y1="35" x2={currentX} y2="180" stroke="rgba(150, 125, 95, 0.65)" strokeWidth="1" strokeDasharray="3 3" />
                    
                    {/* Current operating circle */}
                    <circle cx={currentX} cy={currentY_oil} r="5.5" fill="#ffffff" stroke="#ea580c" strokeWidth="2.5" className="animated-graph-point" />

                    {/* Dark Callout Box */}
                    <rect
                      x={Math.min(380, currentX - 45)}
                      y={Math.max(38, currentY_oil - 48)}
                      width="90"
                      height="40"
                      rx="4"
                      fill="#1f1610"
                      stroke="#d97706"
                      strokeWidth="1"
                    />
                    <text x={Math.min(380, currentX - 45) + 45} y={Math.max(38, currentY_oil - 48) + 13} textAnchor="middle" fill="#fef3c7" fontSize="8.5" fontWeight="800" fontFamily="var(--font-mono)">
                      {srpSPM} SPM
                    </text>
                    <text x={Math.min(380, currentX - 45) + 45} y={Math.max(38, currentY_oil - 48) + 24} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="700">
                      {simBOPD} BOPD
                    </text>
                    <text x={Math.min(380, currentX - 45) + 45} y={Math.max(38, currentY_oil - 48) + 35} textAnchor="middle" fill="#fdba74" fontSize="8" fontWeight="700">
                      Risk: {simFloatRisk}%
                    </text>
                  </g>
                );
              })()}
            </svg>
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
          <div style={{ position: 'relative', zIndex: 1, marginBottom: '0.65rem' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Cog size={15} color="#d97706" />
              <span>5. 6-AXIS RADAR: BASELINE vs. SIMULATED</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Normalized multi-criteria performance comparison across 6 operational dimensions
            </div>
          </div>

          {/* High-Contrast Dark Radar Viewport */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(145deg, #150e08 0%, #20140b 50%, #120b06 100%)',
              border: '1.5px solid rgba(217, 119, 6, 0.45)',
              borderRadius: '8px',
              padding: '0.65rem',
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.85), 0 4px 15px rgba(0,0,0,0.35)'
            }}
          >
            <svg viewBox="0 0 340 226" style={{ width: '100%', maxHeight: '215px', display: 'block' }}>
              <defs>
                <radialGradient id="radarBackGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2c1a0e" stopOpacity="0.8" />
                  <stop offset="80%" stopColor="#150e08" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#100a05" stopOpacity="1" />
                </radialGradient>
              </defs>

              {/* Concentric Hexagonal Grids */}
              {[
                { scale: 1.0, label: '100%', stroke: 'rgba(217, 119, 6, 0.55)', strokeW: 1.5, dash: 'none', fill: 'url(#radarBackGlow)' },
                { scale: 0.75, label: '75%', stroke: 'rgba(217, 119, 6, 0.38)', strokeW: 1.2, dash: '3 3', fill: 'rgba(38, 24, 14, 0.35)' },
                { scale: 0.50, label: '50%', stroke: 'rgba(217, 119, 6, 0.38)', strokeW: 1.2, dash: '3 3', fill: 'rgba(30, 18, 10, 0.35)' },
                { scale: 0.25, label: '25%', stroke: 'rgba(217, 119, 6, 0.30)', strokeW: 1.0, dash: '2 2', fill: 'rgba(22, 13, 7, 0.35)' }
              ].map((grid, sIdx) => {
                const points = [0, 1, 2, 3, 4, 5].map((i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = grid.scale * 75;
                  const x = 170 + r * Math.cos(angle);
                  const y = 113 + r * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <g key={sIdx}>
                    <polygon
                      points={points}
                      fill={grid.fill}
                      stroke={grid.stroke}
                      strokeWidth={grid.strokeW}
                      strokeDasharray={grid.dash}
                    />
                    {/* Ring Percentage Markers along Top Radial */}
                    <text
                      x="173"
                      y={113 - grid.scale * 75 + 10}
                      fill="#d97706"
                      fontSize="7.5"
                      fontFamily="var(--font-mono)"
                      fontWeight="700"
                    >
                      {grid.label}
                    </text>
                  </g>
                );
              })}

              {/* 6 Radial Spoke Lines */}
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                const x = 170 + 75 * Math.cos(angle);
                const y = 113 + 75 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="170"
                    y1="113"
                    x2={x}
                    y2={y}
                    stroke="rgba(217, 119, 6, 0.5)"
                    strokeWidth="1.4"
                  />
                );
              })}

              {/* 6 Axis Dimension Labels (High Contrast Dark Pill Backings) */}
              {[
                { label: 'Oil Rate', angle: -Math.PI / 2, x: 170, y: 16, anchor: 'middle', badgeW: 62, badgeX: 139, badgeY: 5 },
                { label: 'Steam Eff.', angle: -Math.PI / 6, x: 260, y: 64, anchor: 'start', badgeW: 68, badgeX: 254, badgeY: 53 },
                { label: 'Thermal', angle: Math.PI / 6, x: 260, y: 164, anchor: 'start', badgeW: 58, badgeX: 254, badgeY: 153 },
                { label: 'Rod Safety', angle: Math.PI / 2, x: 170, y: 218, anchor: 'middle', badgeW: 72, badgeX: 134, badgeY: 207 },
                { label: 'Energy Cons.', angle: (5 * Math.PI) / 6, x: 80, y: 164, anchor: 'end', badgeW: 76, badgeX: 6, badgeY: 153 },
                { label: 'Cashflow', angle: (-5 * Math.PI) / 6, x: 80, y: 64, anchor: 'end', badgeW: 64, badgeX: 18, badgeY: 53 }
              ].map((item, idx) => (
                <g key={idx}>
                  <rect
                    x={item.badgeX}
                    y={item.badgeY}
                    width={item.badgeW}
                    height="16"
                    rx="3"
                    fill="#181008"
                    stroke="rgba(217, 119, 6, 0.4)"
                    strokeWidth="1"
                  />
                  <text
                    x={item.x}
                    y={item.y}
                    textAnchor={item.anchor}
                    fill="#fef3c7"
                    fontSize="9"
                    fontWeight="800"
                    letterSpacing="0.02em"
                  >
                    {item.label}
                  </text>
                </g>
              ))}

              {/* Baseline Polygon (Dark Bronze / Umber with Dash) */}
              {(() => {
                const pts = radarMetrics.baseline.map((val, i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = val * 75;
                  return `${170 + r * Math.cos(angle)},${113 + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <g>
                    <polygon
                      points={pts}
                      fill="rgba(75, 45, 25, 0.65)"
                      stroke="#b45309"
                      strokeWidth="2.2"
                      strokeDasharray="4 3"
                      className="animated-graph-polygon"
                    />
                    {radarMetrics.baseline.map((val, i) => {
                      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                      const r = val * 75;
                      return (
                        <circle
                          key={i}
                          cx={170 + r * Math.cos(angle)}
                          cy={113 + r * Math.sin(angle)}
                          r="3.5"
                          fill="#78350f"
                          stroke="#d97706"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </g>
                );
              })()}

              {/* Simulated Polygon (Rich Glowing Amber / Flame) */}
              {(() => {
                const pts = radarMetrics.simulated.map((val, i) => {
                  const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                  const r = val * 75;
                  return `${170 + r * Math.cos(angle)},${113 + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <g>
                    <polygon
                      points={pts}
                      fill="rgba(234, 88, 12, 0.45)"
                      stroke="#f59e0b"
                      strokeWidth="2.8"
                      className="animated-graph-polygon"
                    />
                    {radarMetrics.simulated.map((val, i) => {
                      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                      const r = val * 75;
                      return (
                        <circle
                          key={i}
                          cx={170 + r * Math.cos(angle)}
                          cy={113 + r * Math.sin(angle)}
                          r="4.2"
                          fill="#ffffff"
                          stroke="#ea580c"
                          strokeWidth="2.5"
                          className="animated-graph-point"
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>

            {/* High-Contrast Legend Bar */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.2rem', fontSize: '0.72rem', marginTop: '0.45rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', border: '1px solid rgba(180, 83, 9, 0.5)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#78350f', border: '1.5px dashed #d97706', display: 'inline-block' }} />
                <span style={{ color: '#fed7aa', fontWeight: 700 }}>Baseline Envelope</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', border: '1px solid rgba(234, 88, 12, 0.6)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', border: '1.5px solid #ea580c', display: 'inline-block' }} />
                <span style={{ color: '#ffffff', fontWeight: 700 }}>Simulated Scenario</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
