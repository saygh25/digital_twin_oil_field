import React, { useState } from 'react';
import {
  Activity,
  Droplet,
  Droplets,
  Thermometer,
  FlaskConical,
  Settings,
  Gauge,
  Target,
  ArrowUp,
  Weight,
  Flame,
  Check,
  X,
  MapPin,
  Layers,
  Ruler,
  Waves,
  Zap,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

/**
 * WellTelemetryHUDCard
 * High-transparency frosted glass telemetry and diagnostics HUD card.
 * Uses a refined desert industrial bronze & terracotta palette:
 * STRICT RULE: No green, blue, or yellow in fonts, lines, icons, or badges.
 */
export default function WellTelemetryHUDCard({
  wellName = 'WELL DT-07',
  padName = 'Baghewala Field, Rajasthan',
  formation = 'Jodhpur Sandstone (Proterozoic)',
  depthM = 1048,
  pattern = '5-Spot Inverted Thermal Pattern',
  gps = '27.5445°N, 71.9145°E',
  liveData = {},
  isOpen = true,
  onClose,
  onTargetClick
}) {
  const [minimized, setMinimized] = useState(!isOpen);

  // Extract live metrics matching user's system cards
  const cssCycle = liveData.cssCycle || 'CYCLE #4';
  const cssStageName = liveData.cssStageName || 'Mid-Cycle Production';
  const timelineDay = liveData.timelineDay !== undefined ? liveData.timelineDay : 37;
  const timelineTotalDays = liveData.timelineTotalDays || 72;
  const daysRemaining = liveData.daysRemaining !== undefined ? liveData.daysRemaining : 20;

  // KPI Card Details (matching screenshot without green, blue, yellow)
  const soRatio = liveData.sor !== undefined ? Number(liveData.sor).toFixed(2) : '0.32';
  const oilRateBopd = liveData.oilRateBopd !== undefined ? liveData.oilRateBopd : 207;
  const grossBfpd = liveData.grossBfpd !== undefined ? liveData.grossBfpd : Math.round(oilRateBopd * 1.62);
  const energyKwhBbl = liveData.energyKwhBbl !== undefined ? Number(liveData.energyKwhBbl).toFixed(1) : '0.8';

  const rawRodRisk = liveData.rodRiskPct !== undefined ? liveData.rodRiskPct : (liveData.rodFloatingRiskPct !== undefined ? liveData.rodFloatingRiskPct : 29.9);
  const rodRiskScore = Number(rawRodRisk).toFixed(1);
  const isHighRisk = Number(rodRiskScore) > 50;
  const rodRiskStatus = isHighRisk ? 'CRITICAL RISK' : 'NORMAL RANGE';

  const rawPumpFillage = liveData.pumpFillagePct !== undefined ? liveData.pumpFillagePct : 87.0;
  const pumpFillagePct = Number(rawPumpFillage).toFixed(0);

  const rawViscosity = liveData.viscosityCp !== undefined ? liveData.viscosityCp : 500.59;
  const viscosityCp = Number(rawViscosity).toFixed(2);
  const bottomholeTempC = liveData.currentTempC !== undefined ? Number(liveData.currentTempC).toFixed(1) : '96.0';
  const baselineTempC = 42;
  const tempDiff = (Number(bottomholeTempC) - baselineTempC).toFixed(0);

  // Mechanics & Hydraulics
  const spm = liveData.spm !== undefined ? Number(liveData.spm).toFixed(1) : '4.8';
  const vfdHz = liveData.vfdHz !== undefined ? Number(liveData.vfdHz).toFixed(1) : '47.9';
  const strokeLengthIn = liveData.strokeLengthIn || 120;
  const pprlKn = liveData.pprlKn !== undefined ? Number(liveData.pprlKn).toFixed(1) : '66.2';
  const mprlKn = liveData.mprlKn !== undefined ? Number(liveData.mprlKn).toFixed(1) : '34.6';
  const polishedRodLoadLbs = liveData.polishedRodLoadLbs !== undefined 
    ? liveData.polishedRodLoadLbs 
    : Math.round(Number(pprlKn) * 224.8);
  const ratingFactorPct = liveData.ratingFactorPct || 72;

  const bhpBar = liveData.bhpBar !== undefined ? liveData.bhpBar : 48.3;
  const drawdownBar = liveData.drawdownBar !== undefined ? liveData.drawdownBar : 35.9;
  const casingHeadBar = liveData.casingHeadBar !== undefined ? liveData.casingHeadBar : 12.4;
  const tubingBar = liveData.tubingBar !== undefined ? liveData.tubingBar : 8.6;
  const steamHaloM = liveData.steamHaloM !== undefined ? liveData.steamHaloM : 85;

  const cumOilBbls = liveData.cumOilBbls !== undefined ? liveData.cumOilBbls.toLocaleString() : '14,150';
  const cumSteamBbls = liveData.cumSteamBbls !== undefined ? liveData.cumSteamBbls.toLocaleString() : '24,300';

  if (minimized) {
    return (
      <button
        className="hud-tab-reopen-pill"
        onClick={() => setMinimized(false)}
        title="Open Well Telemetry & Diagnostics"
      >
        <span className="hud-pill-dot" />
        <span className="hud-pill-title">{wellName}</span>
        <span className="hud-pill-badge">{cssCycle}</span>
        <ChevronRight size={14} />
      </button>
    );
  }

  return (
    <div className="well-telemetry-hud-container">
      {/* 1. Header Bar */}
      <div className="hud-header-bar">
        <div className="hud-header-left">
          <div className="hud-title-row">
            <span className="hud-live-dot" />
            <span className="hud-well-name">{wellName}</span>
            <span className="hud-stage-badge">{cssCycle}</span>
          </div>
          <div className="hud-subtext-row">
            <span>{padName}</span>
            <span className="hud-subtext-sep">•</span>
            <span>{formation}</span>
          </div>
        </div>

        <div className="hud-header-actions">
          <button
            className="hud-action-btn"
            onClick={onTargetClick}
            title="Focus Camera on Wellbore"
          >
            <Target size={14} />
          </button>
          <button
            className="hud-action-btn"
            onClick={() => {
              setMinimized(true);
              onClose?.();
            }}
            title="Minimize Telemetry HUD"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Top Spec Bar: Depth & Pattern */}
      <div className="hud-spec-dual-row">
        <div className="hud-spec-pill">
          <Ruler size={13} className="hud-spec-icon" style={{ color: '#c2410c' }} />
          <span>Depth: <strong style={{ color: '#c2410c' }}>{depthM.toLocaleString()} m MSL</strong></span>
        </div>
        <div className="hud-spec-pill">
          <Layers size={13} className="hud-spec-icon" style={{ color: '#9f1239' }} />
          <span>Pattern: <strong style={{ color: '#9f1239' }}>{pattern}</strong></span>
        </div>
      </div>

      {/* GPS Coordinates Bar */}
      <div className="hud-gps-bar">
        <MapPin size={13} className="hud-gps-icon" style={{ color: '#475569' }} />
        <span>GPS: <strong style={{ color: '#334155' }}>{gps}</strong></span>
      </div>

      {/* 3. CSS LIFECYCLE MONITOR CARD */}
      <div className="hud-lifecycle-card">
        <div className="hud-lifecycle-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={13} style={{ color: '#dc2626' }} />
            <span className="hud-lifecycle-title">CSS LIFECYCLE MONITOR</span>
          </div>
          <span className="hud-lifecycle-pill">
            <Flame size={10} />
            {cssCycle}
          </span>
        </div>

        <div className="hud-lifecycle-stage-name">
          {cssStageName}
        </div>

        <div className="hud-lifecycle-progress-track">
          <div
            className="hud-lifecycle-progress-fill"
            style={{ width: `${Math.min(100, (timelineDay / timelineTotalDays) * 100)}%` }}
          />
        </div>

        <div className="hud-lifecycle-timer-row">
          <span>Day {timelineDay} / {timelineTotalDays}</span>
          <span>~{daysRemaining}d to phase switch</span>
        </div>
      </div>

      {/* 4. PRIMARY KPI TILES GRID — Distinct Color Identities */}
      <div className="hud-section-group">
        <div className="hud-section-heading">
          <Activity size={13} className="hud-section-icon" style={{ color: '#dc2626' }} />
          <span>KEY PERFORMANCE INDICATORS (KPIS)</span>
        </div>

        <div className="hud-tiles-grid">
          {/* Tile 1: STEAM-OIL RATIO — Warm Terracotta */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Droplets size={12} className="hud-tile-icon" style={{ color: '#ea580c' }} />
              <span className="hud-tile-lbl">STEAM-OIL RATIO</span>
            </div>
            <div className="hud-tile-val text-terracotta">
              {soRatio}
            </div>
            <div className="hud-tile-sub">t/m³ steam</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-terracotta"
                style={{ width: `${Math.min(100, (Number(soRatio) / 2.5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 2: OIL RATE — Vivid Rose */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Droplet size={12} className="hud-tile-icon" style={{ color: '#e11d48' }} />
              <span className="hud-tile-lbl">OIL RATE</span>
            </div>
            <div className="hud-tile-val text-rose">
              {oilRateBopd} <span className="hud-unit">BOPD</span>
            </div>
            <div className="hud-tile-sub">Gross: {grossBfpd} BFPD</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-rose"
                style={{ width: `${Math.min(100, (oilRateBopd / 300) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 3: ENERGY INTENSITY — Steel Slate */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Zap size={12} className="hud-tile-icon" style={{ color: '#475569' }} />
              <span className="hud-tile-lbl">ENERGY INTENSITY</span>
            </div>
            <div className="hud-tile-val text-slate">
              {energyKwhBbl} <span className="hud-unit">kWh/bbl</span>
            </div>
            <div className="hud-tile-sub">VFD Efficiency: 94.2%</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-slate"
                style={{ width: `${Math.min(100, (Number(energyKwhBbl) / 2.0) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 4: VISCOSITY (T) — Deep Ruby Wine */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <FlaskConical size={12} className="hud-tile-icon" style={{ color: '#be123c' }} />
              <span className="hud-tile-lbl">VISCOSITY (T)</span>
            </div>
            <div className="hud-tile-val text-ruby">
              {viscosityCp} <span className="hud-unit">cP</span>
            </div>
            <div className="hud-tile-sub">@ {bottomholeTempC}°C (12.8x Boost)</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-ruby"
                style={{ width: `${Math.min(100, (Number(viscosityCp) / 2000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. DOWNHOLE MECHANICS & INTEGRITY — Distinct Color Identities */}
      <div className="hud-section-group">
        <div className="hud-section-heading">
          <Settings size={13} className="hud-section-icon" style={{ color: '#475569' }} />
          <span>DOWNHOLE MECHANICS &amp; WELL INTEGRITY</span>
        </div>

        <div className="hud-tiles-grid">
          {/* Tile 5: ROD RISK SCORE — Crimson Red */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <ShieldCheck size={12} className="hud-tile-icon" style={{ color: '#dc2626' }} />
              <span className="hud-tile-lbl">ROD RISK SCORE</span>
            </div>
            <div className="hud-tile-val text-crimson">
              {rodRiskScore}%
            </div>
            <div className="hud-tile-sub">
              {rodRiskStatus} • Factor: 1.84
            </div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-crimson"
                style={{
                  width: `${Math.min(100, Number(rodRiskScore))}%`
                }}
              />
            </div>
          </div>

          {/* Tile 6: PUMP FILLAGE — Deep Wine */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Waves size={12} className="hud-tile-icon" style={{ color: '#9f1239' }} />
              <span className="hud-tile-lbl">PUMP FILLAGE</span>
            </div>
            <div className="hud-tile-val text-wine">
              {pumpFillagePct}%
            </div>
            <div className="hud-tile-sub">Vol. Efficiency (Normal)</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-wine"
                style={{ width: `${pumpFillagePct}%` }}
              />
            </div>
          </div>

          {/* Tile 7: PUMP SPEED — Polished Slate */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Gauge size={12} className="hud-tile-icon" style={{ color: '#475569' }} />
              <span className="hud-tile-lbl">PUMP SPEED</span>
            </div>
            <div className="hud-tile-val text-slate">
              {spm} <span className="hud-unit">SPM</span>
            </div>
            <div className="hud-tile-sub">Stroke: {strokeLengthIn}" • {vfdHz} Hz</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-slate"
                style={{ width: `${Math.min(100, (Number(spm) / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 8: POLISHED ROD LOAD — Warm Bronze */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Weight size={12} className="hud-tile-icon" style={{ color: '#78350f' }} />
              <span className="hud-tile-lbl">POLISHED ROD LOAD</span>
            </div>
            <div className="hud-tile-val text-bronze">
              {pprlKn} <span className="hud-unit">kN</span>
            </div>
            <div className="hud-tile-sub">{polishedRodLoadLbs.toLocaleString()} lbs ({ratingFactorPct}%)</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-bronze"
                style={{ width: `${ratingFactorPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. HYDRAULICS & PRESSURE DYNAMICS — Distinct Color Identities */}
      <div className="hud-section-group">
        <div className="hud-section-heading">
          <Gauge size={13} className="hud-section-icon" style={{ color: '#e11d48' }} />
          <span>HYDRAULICS &amp; PRESSURE DYNAMICS</span>
        </div>

        <div className="hud-tiles-grid">
          {/* Tile 9: BHP — Vivid Rose */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Gauge size={12} className="hud-tile-icon" style={{ color: '#e11d48' }} />
              <span className="hud-tile-lbl">BOTTOMHOLE PRESS</span>
            </div>
            <div className="hud-tile-val text-rose">
              {bhpBar} <span className="hud-unit">bar</span>
            </div>
            <div className="hud-tile-sub">Drawdown: {drawdownBar} bar</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-rose"
                style={{ width: `${Math.min(100, (bhpBar / 100) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 10: Casing Head Press — Charcoal Slate */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Gauge size={12} className="hud-tile-icon" style={{ color: '#334155' }} />
              <span className="hud-tile-lbl">CASING HEAD PRESS</span>
            </div>
            <div className="hud-tile-val text-slate">
              {casingHeadBar} <span className="hud-unit">bar</span>
            </div>
            <div className="hud-tile-sub">Tubing: {tubingBar} bar</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-slate"
                style={{ width: `${Math.min(100, (casingHeadBar / 30) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 11: Steam Halo Radius — Terracotta */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Target size={12} className="hud-tile-icon" style={{ color: '#ea580c' }} />
              <span className="hud-tile-lbl">STEAM HALO RADIUS</span>
            </div>
            <div className="hud-tile-val text-terracotta">
              {steamHaloM} <span className="hud-unit">m</span>
            </div>
            <div className="hud-tile-sub">Thermal Sweep Zone</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-terracotta"
                style={{ width: `${Math.min(100, (steamHaloM / 120) * 100)}%` }}
              />
            </div>
          </div>

          {/* Tile 12: Lift Mechanism — Terracotta */}
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <ArrowUp size={12} className="hud-tile-icon" style={{ color: '#c2410c' }} />
              <span className="hud-tile-lbl">LIFT MECHANISM</span>
            </div>
            <div className="hud-tile-val" style={{ color: '#c2410c', fontSize: '0.88rem' }}>
              Downhole SRP
            </div>
            <div className="hud-tile-sub">Continuous Rod Lift</div>
            <div className="hud-mini-bar-track">
              <div
                className="hud-mini-bar-fill fill-terracotta"
                style={{ width: '85%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7. CSS THERMAL CYCLE STEPPER & CUMULATIVE STATS */}
      <div className="hud-section-group" style={{ marginBottom: 0 }}>
        <div className="hud-section-heading" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={13} className="hud-section-icon" style={{ color: '#dc2626' }} />
            <span>CSS THERMAL CYCLE PROGRESS</span>
          </div>
          <span className="hud-cycle-day-badge">Day {timelineDay} of {timelineTotalDays}</span>
        </div>

        {/* Stepper Timeline Bar */}
        <div className="hud-stepper-track-wrap">
          <div className="hud-stepper-track-line" />
          <div className="hud-stepper-active-line" style={{ width: '75%' }} />

          <div className="hud-stepper-nodes">
            {/* Step 1: Pre-Heat */}
            <div className="hud-step-node completed">
              <div className="hud-step-icon-bubble">
                <Check size={11} strokeWidth={3} />
              </div>
              <div className="hud-step-title">Cycle 1–2</div>
              <div className="hud-step-subtitle">Pre-Heat</div>
            </div>

            {/* Step 2: Steam Injection */}
            <div className="hud-step-node completed">
              <div className="hud-step-icon-bubble">
                <Check size={11} strokeWidth={3} />
              </div>
              <div className="hud-step-title">Day 3–5</div>
              <div className="hud-step-subtitle">Steam Inj</div>
            </div>

            {/* Step 3: Thermal Soaking */}
            <div className="hud-step-node completed">
              <div className="hud-step-icon-bubble">
                <Check size={11} strokeWidth={3} />
              </div>
              <div className="hud-step-title">Day 6–8</div>
              <div className="hud-step-subtitle">Soaking</div>
            </div>

            {/* Step 4: Mid-Cycle Production (Active) */}
            <div className="hud-step-node active">
              <div className="hud-step-icon-bubble active-pulse">
                <div className="hud-step-active-dot" />
              </div>
              <div className="hud-step-title" style={{ color: '#e11d48', fontWeight: 800 }}>Day 9–72</div>
              <div className="hud-step-subtitle">Production</div>
            </div>
          </div>
        </div>

        {/* Bottom Stat Boxes — Multi-colored */}
        <div className="hud-cycle-stats-row">
          <div className="hud-cycle-stat-box">
            <div className="hud-cycle-stat-top">
              <span className="hud-cycle-barrel-icon">🛢</span>
              <span className="hud-cycle-stat-lbl">CUM OIL (Cycle)</span>
            </div>
            <div className="hud-cycle-stat-val text-rose">{cumOilBbls} <span className="hud-cycle-unit">bbls</span></div>
          </div>

          <div className="hud-cycle-stat-box">
            <div className="hud-cycle-stat-top">
              <span className="hud-cycle-steam-icon">♨</span>
              <span className="hud-cycle-stat-lbl">CUM STEAM</span>
            </div>
            <div className="hud-cycle-stat-val text-rose">{cumSteamBbls} <span className="hud-cycle-unit">bbls</span></div>
          </div>

          <div className="hud-cycle-stat-box">
            <div className="hud-cycle-stat-top">
              <Droplets size={12} className="hud-cycle-icon" style={{ color: '#c2410c' }} />
              <span className="hud-cycle-stat-lbl">S/O RATIO</span>
            </div>
            <div className="hud-cycle-stat-val text-terracotta">{soRatio}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
