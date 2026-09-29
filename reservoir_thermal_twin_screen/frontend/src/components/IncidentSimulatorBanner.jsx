import React from 'react';
import { AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, RotateCcw, ArrowRight, Zap, Play } from 'lucide-react';

/**
 * Animated Rod Float Incident Simulation & Auto-Remediation Banner
 * 
 * Demonstrates the full failure chain and AI closed-loop recommendation:
 * Reservoir Cooling -> Viscosity Spike -> Rod Floating & Snap Shock -> AI Alert -> Autonomous Remediation
 */
export default function IncidentSimulatorBanner({
  simulationStep = 0, // 0: Idle, 1: Cooling, 2: Viscosity Spike, 3: Rod Floating Alert, 4: Auto-Remediating, 5: Stabilized
  onStartSimulation,
  onResetSimulation,
  onApplyRemediation
}) {
  const steps = [
    { label: 'Normal Operation', desc: 'Positive rod tension maintained' },
    { label: 'Thermal Cooling Event', desc: 'Reservoir temp drops 76°C -> 50°C' },
    { label: 'Viscosity Spike', desc: 'Crude viscosity surges -> 9,500 cP' },
    { label: 'Rod Float & Snap Shock', desc: 'Viscous drag exceeds downward rod weight' },
    { label: 'AI Optimization Derate', desc: 'VFD derating from 42 Hz -> 24 Hz' },
    { label: 'Remediation Stabilized', desc: 'Rod tension restored, fatigue mitigated' }
  ];

  if (simulationStep === 0) {
    return (
      <div className="incident-trigger-bar">
        <div className="incident-trigger-info">
          <Sparkles size={16} color="#38bdf8" />
          <span>Interactive AI Incident Demonstration:</span>
        </div>
        <button
          className="btn-incident-trigger"
          onClick={onStartSimulation}
        >
          <Play size={14} />
          Simulate Rod Float Incident
        </button>
      </div>
    );
  }

  return (
    <div className={`incident-banner-box step-${simulationStep}`}>
      {/* Banner Header */}
      <div className="banner-top-row">
        <div className="banner-title-block">
          {simulationStep === 3 ? (
            <AlertTriangle className="banner-icon-pulse danger" size={20} />
          ) : simulationStep === 4 ? (
            <Zap className="banner-icon-pulse warning" size={20} />
          ) : simulationStep === 5 ? (
            <CheckCircle2 size={20} color="#10b981" />
          ) : (
            <ShieldAlert size={20} color="#f59e0b" />
          )}
          <div>
            <h4 className="banner-headline">
              {simulationStep === 1 && 'STAGE 1: Rapid Reservoir Cooling Transient'}
              {simulationStep === 2 && 'STAGE 2: Heavy Crude Viscosity Surge (> 9,000 cP)'}
              {simulationStep === 3 && 'STAGE 3: CRITICAL — Rod Floating & Downstroke Compression Detected!'}
              {simulationStep === 4 && 'STAGE 4: Executing AI Joint Optimization Remediation...'}
              {simulationStep === 5 && 'STAGE 5: Remediation Verified — Rod String Stabilized'}
            </h4>
            <p className="banner-subtext">
              {simulationStep === 1 && 'Downhole temperature decaying towards ambient baseline 48°C.'}
              {simulationStep === 2 && 'Viscous shear drag forces surging along 1,100m rod string.'}
              {simulationStep === 3 && 'Downstroke drag > buoyant rod weight (MPRL < 6 kN). High risk of rod buckling and parting shock.'}
              {simulationStep === 4 && 'Derating VFD frequency to 24 Hz and pump speed to 2.4 SPM.'}
              {simulationStep === 5 && 'Rod tension positive (> 18 kN). Goodman fatigue safety factor restored.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="banner-actions">
          {simulationStep === 3 && (
            <button className="btn-remediate-now" onClick={onApplyRemediation}>
              <Sparkles size={14} />
              Apply AI Remediation
            </button>
          )}
          <button className="btn-banner-reset" onClick={onResetSimulation} title="Reset Simulation">
            <RotateCcw size={14} />
            Reset Twin
          </button>
        </div>
      </div>

      {/* 5-Stage Stepper Progress */}
      <div className="banner-stepper-track">
        {steps.slice(1).map((s, idx) => {
          const sNum = idx + 1;
          const isActive = simulationStep === sNum;
          const isPassed = simulationStep > sNum;
          return (
            <div
              key={idx}
              className={`stepper-step-node ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
            >
              <div className="stepper-dot">
                {isPassed ? '✓' : sNum}
              </div>
              <span className="stepper-label">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
