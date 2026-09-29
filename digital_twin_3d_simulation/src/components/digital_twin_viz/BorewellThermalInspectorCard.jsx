import React, { useState, useMemo } from 'react';
import {
  Flame,
  Thermometer,
  Activity,
  AlertTriangle,
  Layers,
  Crosshair,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

/**
 * Borewell Thermal Simulation & Diagnostics Inspector Panel
 * Faithfully mirrors the mathematical models of backend/app/physics/thermal_advanced.py:
 * 1. T(z) = T_surf + (T_bottom - T_surf) * (z / 1150)^0.85
 * 2. P(z) = P_wh + z * 0.0981 + (Q_oil / 20) * (z / 1150) * 3.5
 * 3. mu(z) = max(15, 0.0045 * exp(4600 / (T_z + 273.15)))
 * 4. AOP(T) = 32.0 - 0.15 * (T - 50.0) bar
 * 5. Casing Thermal Expansion: Delta L = alpha * L * Delta T (alpha = 1.2e-5 / deg C)
 */
export default function BorewellThermalInspectorCard({
  wellId = 'B-17',
  thermalSimStage = 'LIVE',
  onSelectThermalStage,
  liveState = null,
  depthProfileData = null,
  asphalteneData = null,
  bottomholeTempC = 125.5,
  wellheadTempC = 85.9,
  viscosityCp = 85,
  heatedRadiusM = 10.95,
  coolingRateCDay = 1.26,
  onFocusCamera
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoverStation, setHoverStation] = useState(null);

  // Compute Continuous Depth Profile stations (15 depth stations from 0m to 1,150m)
  const computedStations = useMemo(() => {
    // If backend profile is provided and matching stage, use backend
    if (depthProfileData?.depth_profile && thermalSimStage === 'LIVE') {
      return depthProfileData.depth_profile;
    }

    // Dynamic procedural generation using exact backend formulas
    const stations = [];
    const totalDepth = 1150.0;
    const count = 15;
    const whP = 14.5;
    const bhP = 84.6;

    for (let i = 0; i < count; i++) {
      const d = Math.round((i / (count - 1)) * totalDepth);
      const frac = d / totalDepth;
      // Exponential convective heat profile: T(z) = T_surf + (T_bh - T_surf) * (z / 1150)^0.85
      const tz = Number((wellheadTempC + (bottomholeTempC - wellheadTempC) * Math.pow(frac, 0.85)).toFixed(1));
      // Hydrostatic + friction pressure: P(z) = P_wh + d * 0.0981 + (Q_oil / 20) * (frac * 3.5)
      const pz = Number((whP + d * 0.0981 + (14.0 / 20.0) * (frac * 3.5)).toFixed(1));
      // Arrhenius crude viscosity: mu(z) = max(15, 0.0045 * exp(4600 / (tz + 273.15)))
      const visc = Math.round(Math.max(15.0, 0.0045 * Math.exp(4600.0 / (tz + 273.15))));
      // Asphaltene Onset Pressure
      const aop = 32.0 - 0.15 * (tz - 50.0);
      const asphRisk = Math.max(0.0, Math.min(100.0, (1.0 - (pz / Math.max(1.0, aop))) * 65.0 + (1.0 - tz / 120.0) * 35.0));

      stations.push({
        depth_m: d,
        temperature_c: tz,
        pressure_bar: pz,
        viscosity_cp: visc,
        asphaltene_risk_pct: Number(asphRisk.toFixed(1))
      });
    }
    return stations;
  }, [depthProfileData, thermalSimStage, wellheadTempC, bottomholeTempC]);

  // SVG Chart Dimensions & Scale
  const chartW = 310;
  const chartH = 200;
  const padL = 42;
  const padR = 20;
  const padT = 18;
  const padB = 28;

  const minT = 20.0;
  const maxT = 280.0;
  const minD = 0.0;
  const maxD = 1150.0;

  const mapX = (t) => padL + ((t - minT) / (maxT - minT)) * (chartW - padL - padR);
  const mapY = (d) => padT + ((d - minD) / (maxD - minD)) * (chartH - padT - padB);

  // SVG Path for Wellbore T(z)
  const curvePath = useMemo(() => {
    if (!computedStations.length) return '';
    return computedStations.reduce((acc, pt, idx) => {
      const x = mapX(pt.temperature_c);
      const y = mapY(pt.depth_m);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [computedStations]);

  // SVG Path for Rajasthan Geothermal Gradient Baseline (32°C at 0m -> 61.9°C at 1150m)
  const geoPath = useMemo(() => {
    const x0 = mapX(32.0);
    const y0 = mapY(0.0);
    const x1 = mapX(32.0 + 1150.0 * 0.026);
    const y1 = mapY(1150.0);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }, []);

  // Casing Thermal Expansion: Delta L = alpha * L * Delta T
  const alphaSteel = 1.2e-5; // 1/C
  const deltaT = Math.max(0, bottomholeTempC - 48.0);
  const casingThermalGrowthMm = (alphaSteel * 1150.0 * deltaT * 1000.0).toFixed(1);

  // Viscosity at Wellhead vs Sandface
  const wellheadVisc = computedStations[0]?.viscosity_cp || 12450;
  const sandfaceVisc = computedStations[computedStations.length - 1]?.viscosity_cp || viscosityCp;

  // Active Critical Asphaltene Station
  const maxRiskStation = useMemo(() => {
    if (!computedStations.length) return null;
    return computedStations.reduce((max, s) => (s.asphaltene_risk_pct > (max?.asphaltene_risk_pct || 0) ? s : max), computedStations[0]);
  }, [computedStations]);

  const isAsphHighRisk = maxRiskStation && maxRiskStation.asphaltene_risk_pct > 40.0;

  return (
    <div className={`wellbore-thermal-inspector-card ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header Bar */}
      <div className="thermal-card-header">
        <div className="header-title-group">
          <div className="thermal-fire-icon-wrap">
            <Flame size={16} className="thermal-fire-icon" />
          </div>
          <div>
            <div className="thermal-header-title">Borewell Thermal Physics</div>
            <div className="thermal-header-subtitle">
              Continuous 1,150m TVD Profile • Well {wellId}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="thermal-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Inspector' : 'Collapse Inspector'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="thermal-card-body">
          {/* CSS Thermal Simulation Stage Selector */}
          <div className="thermal-section-block">
            <div className="section-label-row">
              <span className="section-label">
                <Activity size={12} />
                CSS Stage Simulation
              </span>
              <span className="simulation-active-badge">
                <span className="pulse-dot" />
                {thermalSimStage}
              </span>
            </div>

            <div className="thermal-stage-buttons-grid">
              {[
                { id: 'LIVE', label: 'Live Stream', temp: `${bottomholeTempC.toFixed(0)}°C`, desc: 'Active Backend' },
                { id: 'STEAM', label: 'Steam Inject', temp: '260°C', desc: 'Enthalpy Surge' },
                { id: 'SOAK', label: 'Thermal Soak', temp: '185°C', desc: 'Conductive Diffusion' },
                { id: 'PROD', label: 'Hot Production', temp: '138°C', desc: 'High Mobility' },
                { id: 'COOLING', label: 'Late Cooling', temp: '54°C', desc: 'Asphaltene Risk' }
              ].map((stage) => {
                const isActive = thermalSimStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    className={`thermal-stage-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectThermalStage?.(stage.id)}
                  >
                    <div className="stage-btn-top">
                      <span className="stage-name">{stage.label}</span>
                      <span className="stage-temp">{stage.temp}</span>
                    </div>
                    <span className="stage-desc">{stage.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Continuous Depth vs Temperature SVG Chart */}
          <div className="thermal-section-block">
            <div className="section-label-row">
              <span className="section-label">
                <TrendingUp size={12} />
                T(z) Depth Profile (FLIR Ironbow Gradient)
              </span>
              <span className="chart-legend-text">
                <span className="legend-line wellbore-line" /> Fluid T(z)
                <span className="legend-line geo-line" style={{ marginLeft: 8 }} /> Geothermal
              </span>
            </div>

            <div className="thermal-depth-chart-wrapper">
              <svg className="thermal-depth-svg" viewBox={`0 0 ${chartW} ${chartH}`}>
                <defs>
                  {/* Ironbow False-Color Gradient along Depth */}
                  <linearGradient id="ironbowDepthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="35%" stopColor="#ea580c" />
                    <stop offset="70%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fde047" />
                  </linearGradient>

                  {/* Asphaltene Hazard Shading */}
                  <linearGradient id="aopHazardGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(239, 68, 68, 0.22)" />
                    <stop offset="100%" stopColor="rgba(239, 68, 68, 0.05)" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 300, 600, 900, 1150].map((d) => {
                  const y = mapY(d);
                  return (
                    <g key={`dgrid_${d}`}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3,3" />
                      <text x={padL - 4} y={y + 3} textAnchor="end" className="svg-axis-lbl">{d}m</text>
                    </g>
                  );
                })}

                {[50, 100, 150, 200, 250].map((t) => {
                  const x = mapX(t);
                  return (
                    <g key={`tgrid_${t}`}>
                      <line x1={x} y1={padT} x2={x} y2={chartH - padB} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                      <text x={x} y={chartH - padB + 13} textAnchor="middle" className="svg-axis-lbl">{t}°C</text>
                    </g>
                  );
                })}

                {/* Asphaltene Hazard Depth Band (150m - 350m) */}
                <rect
                  x={padL}
                  y={mapY(150.0)}
                  width={chartW - padL - padR}
                  height={mapY(350.0) - mapY(150.0)}
                  fill="url(#aopHazardGrad)"
                  stroke="rgba(239, 68, 68, 0.35)"
                  strokeDasharray="2,2"
                />
                <text x={chartW - padR - 4} y={mapY(240.0)} textAnchor="end" className="svg-hazard-lbl">
                  AOP Deposition Zone (150-350m)
                </text>

                {/* Baseline Geothermal Gradient Line */}
                <path d={geoPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,4" />

                {/* Fluid Column T(z) Curve */}
                <path d={curvePath} fill="none" stroke="url(#ironbowDepthGrad)" strokeWidth="3" strokeLinecap="round" />

                {/* Station Hover Points */}
                {computedStations.map((st, i) => {
                  const cx = mapX(st.temperature_c);
                  const cy = mapY(st.depth_m);
                  const isHovered = hoverStation?.depth_m === st.depth_m;
                  return (
                    <circle
                      key={`st_${i}`}
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3.0}
                      fill={isHovered ? '#ffffff' : '#f59e0b'}
                      stroke="#1e1b4b"
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      onMouseEnter={() => setHoverStation(st)}
                      onMouseLeave={() => setHoverStation(null)}
                    />
                  );
                })}

                {/* Hover Probe Guideline & Box */}
                {hoverStation && (
                  <g pointerEvents="none">
                    <line
                      x1={padL}
                      y1={mapY(hoverStation.depth_m)}
                      x2={chartW - padR}
                      y2={mapY(hoverStation.depth_m)}
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <circle
                      cx={mapX(hoverStation.temperature_c)}
                      cy={mapY(hoverStation.depth_m)}
                      r={6}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>

              {/* Hover Station Floating Details Card */}
              {hoverStation && (
                <div className="thermal-chart-hover-card">
                  <div className="hover-header">
                    <span>Depth: <strong>{hoverStation.depth_m}m TVD</strong></span>
                    <span className="hover-temp">{hoverStation.temperature_c}°C</span>
                  </div>
                  <div className="hover-grid">
                    <div>Pressure: <strong>{hoverStation.pressure_bar} bar</strong></div>
                    <div>Viscosity: <strong>{hoverStation.viscosity_cp.toLocaleString()} cP</strong></div>
                    <div style={{ color: hoverStation.asphaltene_risk_pct > 35 ? '#ef4444' : '#10b981' }}>
                      AOP Risk: <strong>{hoverStation.asphaltene_risk_pct}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="thermal-section-block">
            <div className="section-label-row">
              <span className="section-label">
                <Thermometer size={12} />
                Borewell Telemetry &amp; Physics Bounds
              </span>
            </div>

            <div className="thermal-metrics-grid">
              <div className="thermal-metric-tile">
                <span className="tile-lbl">Wellhead Temp T_wh</span>
                <span className="tile-val text-ruby">{wellheadTempC.toFixed(1)} °C</span>
                <span className="tile-sub">Surface Conductor</span>
              </div>

              <div className="thermal-metric-tile">
                <span className="tile-lbl">Bottomhole Temp T_bh</span>
                <span className="tile-val text-amber">{bottomholeTempC.toFixed(1)} °C</span>
                <span className="tile-sub">1,150m Sandface Pay</span>
              </div>

              <div className="thermal-metric-tile">
                <span className="tile-lbl">Sandface Viscosity</span>
                <span className="tile-val text-gold">{sandfaceVisc.toLocaleString()} cP</span>
                <span className="tile-sub">{sandfaceVisc < 100 ? 'High Mobility Surge' : 'Viscous In-Situ'}</span>
              </div>

              <div className="thermal-metric-tile">
                <span className="tile-lbl">Wellhead Viscosity</span>
                <span className="tile-val text-terracotta">{wellheadVisc.toLocaleString()} cP</span>
                <span className="tile-sub">Ascending Cool Drag</span>
              </div>

              <div className="thermal-metric-tile">
                <span className="tile-lbl">Casing Elongation (ΔL)</span>
                <span className="tile-val text-light">+{casingThermalGrowthMm} mm</span>
                <span className="tile-sub">Thermal Expansion</span>
              </div>

              <div className="thermal-metric-tile">
                <span className="tile-lbl">Heated Halo Radius</span>
                <span className="tile-val text-amber">{heatedRadiusM.toFixed(1)} m</span>
                <span className="tile-sub">Steam Chamber Boundary</span>
              </div>
            </div>
          </div>

          {/* Asphaltene Precipitation Alert Banner (if risk is high) */}
          {isAsphHighRisk && (
            <div className="thermal-alert-box warning">
              <AlertTriangle size={15} className="alert-icon" />
              <div>
                <strong>Asphaltene Precipitation Risk at {maxRiskStation.depth_m}m TVD</strong>
                <p>
                  Local pressure ({maxRiskStation.pressure_bar} bar) approaches Asphaltene Onset Pressure.
                  Recommend continuous xylene/solvent injection or hot-fluid circulation.
                </p>
              </div>
            </div>
          )}

          {/* Quick Subterranean Camera Framing Shortcuts */}
          <div className="thermal-section-block">
            <div className="section-label-row">
              <span className="section-label">
                <Crosshair size={12} />
                Subterranean Viewport Focus
              </span>
            </div>

            <div className="thermal-camera-shortcuts">
              <button
                className="cam-shortcut-btn"
                onClick={() => onFocusCamera?.('surface')}
              >
                Wellhead (0m)
              </button>
              <button
                className="cam-shortcut-btn active"
                onClick={() => onFocusCamera?.('thermal')}
              >
                Full Wellbore Column
              </button>
              <button
                className="cam-shortcut-btn"
                onClick={() => onFocusCamera?.('pump')}
              >
                SRP Pump (1,100m)
              </button>
              <button
                className="cam-shortcut-btn"
                onClick={() => onFocusCamera?.('reservoir')}
              >
                Sandface (1,150m)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
