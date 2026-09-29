import React, { useState } from "react";
import {
  Activity,
  Droplet,
  Droplets,
  Gauge,
  Flame,
  X,
  ShieldCheck,
  Waves,
  ChevronRight
} from "lucide-react";

export default function WellTelemetryHUDCard({
  wellName = "WELL DT-07",
  padName = "Baghewala Field, Rajasthan",
  formation = "Jodhpur Sandstone (Proterozoic)",
  depthM = 1048,
  pattern = "5-Spot Inverted Thermal Pattern",
  gps = "27.5445N, 71.9145E",
  liveData = {},
  isOpen = true,
  onClose,
  onTargetClick
}) {
  const [minimized, setMinimized] = React.useState(!isOpen);

  React.useEffect(() => {
    setMinimized(!isOpen);
  }, [isOpen]);

  if (!isOpen) return null;

  const cssCycle = liveData.cssCycle || "CYCLE #4";
  const cssStageName = liveData.cssStageName || "Mid-Cycle Production";
  const timelineDay = liveData.timelineDay !== undefined ? liveData.timelineDay : 37;
  const timelineTotalDays = liveData.timelineTotalDays || 72;
  const daysRemaining = liveData.daysRemaining !== undefined ? liveData.daysRemaining : 20;

  const soRatio = liveData.sor !== undefined ? Number(liveData.sor).toFixed(2) : "0.32";
  const oilRateBopd = liveData.oilRateBopd !== undefined ? liveData.oilRateBopd : 207;
  const grossBfpd = liveData.grossBfpd !== undefined ? liveData.grossBfpd : Math.round(oilRateBopd * 1.62);

  const rawRodRisk = liveData.rodRiskPct !== undefined
    ? liveData.rodRiskPct
    : (liveData.rodFloatingRiskPct !== undefined ? liveData.rodFloatingRiskPct : 29.9);
  const rodRiskScore = Number(rawRodRisk).toFixed(1);
  const isHighRisk = Number(rodRiskScore) > 50;
  const rodRiskStatus = isHighRisk ? "CRITICAL RISK" : "NORMAL RANGE";

  const rawPumpFillage = liveData.pumpFillagePct !== undefined ? liveData.pumpFillagePct : 87.0;
  const pumpFillagePct = Number(rawPumpFillage).toFixed(0);

  const bhpBar = liveData.bhpBar !== undefined ? liveData.bhpBar : 48.3;
  const drawdownBar = liveData.drawdownBar !== undefined ? liveData.drawdownBar : 35.9;

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

      {/* 1. Header */}
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
            onClick={() => { setMinimized(true); onClose?.(); }}
            title="Minimize Telemetry HUD"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. CSS Lifecycle Monitor */}
      <div className="hud-lifecycle-card">
        <div className="hud-lifecycle-header">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Flame size={13} style={{ color: "#dc2626" }} />
            <span className="hud-lifecycle-title">CSS LIFECYCLE MONITOR</span>
          </div>
          <span className="hud-lifecycle-pill">
            <Flame size={10} />{cssCycle}
          </span>
        </div>
        <div className="hud-lifecycle-stage-name">{cssStageName}</div>
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

      {/* 3. KPIs: SOR + Oil Rate */}
      <div className="hud-section-group">
        <div className="hud-section-heading">
          <Activity size={13} className="hud-section-icon" style={{ color: "#dc2626" }} />
          <span>KEY PERFORMANCE INDICATORS</span>
        </div>
        <div className="hud-tiles-grid">
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Droplets size={12} className="hud-tile-icon" style={{ color: "#ea580c" }} />
              <span className="hud-tile-lbl">STEAM-OIL RATIO</span>
            </div>
            <div className="hud-tile-val text-terracotta">{soRatio}</div>
            <div className="hud-tile-sub">t/m³ steam</div>
            <div className="hud-mini-bar-track">
              <div className="hud-mini-bar-fill fill-terracotta"
                style={{ width: `${Math.min(100, (Number(soRatio) / 2.5) * 100)}%` }} />
            </div>
          </div>

          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Droplet size={12} className="hud-tile-icon" style={{ color: "#e11d48" }} />
              <span className="hud-tile-lbl">OIL RATE</span>
            </div>
            <div className="hud-tile-val text-rose">
              {oilRateBopd} <span className="hud-unit">BOPD</span>
            </div>
            <div className="hud-tile-sub">Gross: {grossBfpd} BFPD</div>
            <div className="hud-mini-bar-track">
              <div className="hud-mini-bar-fill fill-rose"
                style={{ width: `${Math.min(100, (oilRateBopd / 300) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Downhole Integrity: Rod Risk + Pump Fillage */}
      <div className="hud-section-group">
        <div className="hud-section-heading">
          <ShieldCheck size={13} className="hud-section-icon" style={{ color: "#475569" }} />
          <span>DOWNHOLE INTEGRITY</span>
        </div>
        <div className="hud-tiles-grid">
          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <ShieldCheck size={12} className="hud-tile-icon" style={{ color: "#dc2626" }} />
              <span className="hud-tile-lbl">ROD RISK SCORE</span>
            </div>
            <div className="hud-tile-val text-crimson">{rodRiskScore}%</div>
            <div className="hud-tile-sub">{rodRiskStatus}</div>
            <div className="hud-mini-bar-track">
              <div className="hud-mini-bar-fill fill-crimson"
                style={{ width: `${Math.min(100, Number(rodRiskScore))}%` }} />
            </div>
          </div>

          <div className="hud-metric-tile">
            <div className="hud-tile-top">
              <Waves size={12} className="hud-tile-icon" style={{ color: "#9f1239" }} />
              <span className="hud-tile-lbl">PUMP FILLAGE</span>
            </div>
            <div className="hud-tile-val text-wine">{pumpFillagePct}%</div>
            <div className="hud-tile-sub">Vol. Efficiency</div>
            <div className="hud-mini-bar-track">
              <div className="hud-mini-bar-fill fill-wine"
                style={{ width: `${pumpFillagePct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Reservoir Pressure: BHP */}
      <div className="hud-section-group" style={{ marginBottom: 0 }}>
        <div className="hud-section-heading">
          <Gauge size={13} className="hud-section-icon" style={{ color: "#e11d48" }} />
          <span>RESERVOIR PRESSURE</span>
        </div>
        <div className="hud-metric-tile" style={{ width: "100%" }}>
          <div className="hud-tile-top">
            <Gauge size={12} className="hud-tile-icon" style={{ color: "#e11d48" }} />
            <span className="hud-tile-lbl">BOTTOMHOLE PRESSURE</span>
          </div>
          <div className="hud-tile-val text-rose">
            {bhpBar} <span className="hud-unit">bar</span>
          </div>
          <div className="hud-tile-sub">Drawdown: {drawdownBar} bar</div>
          <div className="hud-mini-bar-track">
            <div className="hud-mini-bar-fill fill-rose"
              style={{ width: `${Math.min(100, (bhpBar / 100) * 100)}%` }} />
          </div>
        </div>
      </div>

    </div>
  );
}
