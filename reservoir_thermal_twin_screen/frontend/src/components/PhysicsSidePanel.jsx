import React from 'react';
import { X, Activity, Gauge, Flame, Cpu, ShieldCheck, Thermometer, Info } from 'lucide-react';
import { COMPONENT_PHYSICS } from './constants';

/**
 * Interactive Physics Inspector Side Panel
 * Displays physical principles, governing formulas, and live telemetry for selected 3D component.
 */
export default function PhysicsSidePanel({
  selectedComponent,
  onClose,
  liveData = {}
}) {
  if (!selectedComponent) return null;

  const physics = COMPONENT_PHYSICS[selectedComponent] || COMPONENT_PHYSICS.pumpjack;

  // Subsystem specific live telemetry mappings
  const renderLiveMetrics = () => {
    switch (selectedComponent) {
      case 'pumpjack':
      case 'vfd':
        return (
          <div className="physics-metrics-grid">
            <div className="physics-metric-tile">
              <span className="lbl">Pumping Speed (SPM)</span>
              <span className="val highlight">{liveData.spm?.toFixed(1) || '4.2'} SPM</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">VFD Frequency</span>
              <span className="val">{liveData.vfdHz?.toFixed(1) || '42.0'} Hz</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Stroke Length</span>
              <span className="val">{liveData.strokeLengthIn?.toFixed(1) || '72.0'}" (1.83 m)</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Surface Motor Power</span>
              <span className="val">{liveData.powerKw?.toFixed(1) || '18.5'} kW</span>
            </div>
          </div>
        );

      case 'rodString':
        return (
          <div className="physics-metrics-grid">
            <div className="physics-metric-tile">
              <span className="lbl">Peak Polished Rod Load (PPRL)</span>
              <span className="val">{liveData.pprlKn?.toFixed(1) || '64.2'} kN</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Min Polished Rod Load (MPRL)</span>
              <span className="val" style={{ color: (liveData.mprlKn || 18.5) < 12 ? '#ef4444' : '#10b981' }}>
                {liveData.mprlKn?.toFixed(1) || '18.5'} kN
              </span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Rod Floating Risk</span>
              <span className="val" style={{ color: (liveData.rodFloatingRiskPct || 18) > 35 ? '#ef4444' : '#f59e0b' }}>
                {liveData.rodFloatingRiskPct?.toFixed(1) || '18.0'}%
              </span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Downstroke Drag Force</span>
              <span className="val">{liveData.viscousDragKn?.toFixed(1) || '9.8'} kN</span>
            </div>
          </div>
        );

      case 'downholePump':
        return (
          <div className="physics-metrics-grid">
            <div className="physics-metric-tile">
              <span className="lbl">Pump Landing Depth</span>
              <span className="val">1,100 m TVD</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Volumetric Efficiency</span>
              <span className="val highlight">{liveData.pumpFillagePct?.toFixed(1) || '84.0'}%</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Plunger Diameter</span>
              <span className="val">57.0 mm (2-1/4")</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Valve Operation Cycle</span>
              <span className="val">TV Closes Up / SV Opens Up</span>
            </div>
          </div>
        );

      case 'reservoir':
        return (
          <div className="physics-metrics-grid">
            <div className="physics-metric-tile">
              <span className="lbl">Reservoir Temperature</span>
              <span className="val" style={{ color: '#f87171' }}>
                {liveData.currentTempC?.toFixed(1) || '76.4'} °C
              </span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Crude Viscosity</span>
              <span className="val" style={{ color: '#fbbf24' }}>
                {liveData.viscosityCp?.toLocaleString() || '1,850'} cP
              </span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Heated Zone Radius</span>
              <span className="val highlight">{liveData.heatedRadiusM?.toFixed(1) || '9.8'} m</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Cooling Rate</span>
              <span className="val">{liveData.coolingRateCDay?.toFixed(3) || '0.320'} °C/day</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="physics-metrics-grid">
            <div className="physics-metric-tile">
              <span className="lbl">Well Depth</span>
              <span className="val">1,150 m TVD</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Casing / Tubing</span>
              <span className="val">7" Casing / 2-7/8" Tubing</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Bottomhole Pressure</span>
              <span className="val">82.0 bar</span>
            </div>
            <div className="physics-metric-tile">
              <span className="lbl">Wellhead Pressure</span>
              <span className="val">12.5 bar</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="physics-side-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div>
          <span className="panel-category-tag">{physics.category}</span>
          <h3 className="panel-title">{physics.title}</h3>
        </div>
        <button className="panel-close-btn" onClick={onClose} title="Close Panel">
          <X size={18} />
        </button>
      </div>

      {/* Governing Equation Box */}
      <div className="panel-equation-box">
        <div className="equation-title">
          <Cpu size={14} color="#38bdf8" />
          <span>GOVERNING MATHEMATICAL MODEL</span>
        </div>
        <div className="equation-math">{physics.governingEquation}</div>
      </div>

      {/* Live Operational Telemetry */}
      <div className="panel-section">
        <div className="section-heading">
          <Activity size={14} color="#10b981" />
          <span>LIVE DIGITAL TWIN TELEMETRY</span>
        </div>
        {renderLiveMetrics()}
      </div>

      {/* Physics Description */}
      <div className="panel-section">
        <div className="section-heading">
          <Info size={14} color="#f59e0b" />
          <span>PHYSICAL BEHAVIOR &amp; COUPLING</span>
        </div>
        <p className="panel-description-text">{physics.description}</p>
      </div>

      {/* Operational Limits */}
      <div className="panel-section">
        <div className="section-heading">
          <ShieldCheck size={14} color="#60a5fa" />
          <span>API SPEC &amp; DESIGN LIMITS</span>
        </div>
        <div className="limits-list">
          {Object.entries(physics.operationalLimits || {}).map(([k, v]) => (
            <div key={k} className="limit-row">
              <span className="limit-key">{k.replace(/([A-Z])/g, ' $1').toUpperCase()}:</span>
              <span className="limit-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
