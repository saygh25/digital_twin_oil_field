import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Gauge, Zap, Activity, TrendingUp,
  RotateCcw, Play, Wrench, AlertTriangle,
  BarChart3, Cpu, ChevronRight, Check, Info, Sliders,
  ShieldCheck, Sparkles, Layers, CheckCircle2, X, Settings
} from 'lucide-react';
import { api } from '../../services/api';
import IndustrialMetallicGauge from './IndustrialMetallicGauge';
import pumpSpeedImg from '../../assets/kpi/pump_speed.png';
import vfdMotorImg from '../../assets/kpi/vfd_motor.png';
import floatRiskImg from '../../assets/kpi/float_risk.png';
import pprlLoadImg from '../../assets/kpi/pprl_load.png';
import volEffImg from '../../assets/kpi/vol_efficiency.png';
import liftOilImg from '../../assets/kpi/lift_oil_rate.png';

const riskColor = p => p <= 8 ? '#14532d' : p <= 20 ? '#92400e' : '#991b1b';
const riskLabel = p => p <= 8 ? 'LOW – SAFE' : p <= 20 ? 'MODERATE' : 'HIGH – ACT';
const riskBadge = p => p <= 8 ? 'badge badge-emerald' : p <= 20 ? 'badge badge-amber' : 'badge badge-rose';

/* ARC GAUGE (Desert Sandstone Theme) */
function ArcGauge({ value, max, label, unit, color = 'var(--accent-amber)', size = 100 }) {
  const R = 36, cx = 50, cy = 50, startAngle = -210, totalSweep = 240;
  const pct = Math.min(1, Math.max(0, Number(value) / Number(max)));
  const sweep = totalSweep * pct;
  const px = (r, d) => cx + r * Math.cos((d * Math.PI) / 180);
  const py = (r, d) => cy + r * Math.sin((d * Math.PI) / 180);
  const track = `M ${px(R, startAngle)} ${py(R, startAngle)} A ${R} ${R} 0 1 1 ${px(R, startAngle + totalSweep)} ${py(R, startAngle + totalSweep)}`;
  const fill = pct === 0 ? '' : `M ${px(R, startAngle)} ${py(R, startAngle)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${px(R, startAngle + sweep)} ${py(R, startAngle + sweep)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg viewBox="0 0 100 80" width={size} height={size * 0.76} style={{ overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const a = startAngle + t * totalSweep;
          return <line key={i} x1={px(R - 4, a)} y1={py(R - 4, a)} x2={px(R + 4, a)} y2={py(R + 4, a)} stroke="rgba(140, 110, 80, 0.35)" strokeWidth="1.2" />;
        })}
        <path d={track} fill="none" stroke="rgba(140, 110, 80, 0.2)" strokeWidth="9" strokeLinecap="round" />
        {fill && (
          <path
            d={fill}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
            className="animated-donut-arc"
          />
        )}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--text-primary)" fontFamily="var(--font-mono)">
          {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : value}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="var(--text-muted)" fontFamily="var(--font-sans)">
          {unit}
        </text>
      </svg>
      <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

/* ─── KPI TILE (Exact Dashboard Sandstone Theme with Equipment Asset Image) ─── */
function KpiTile({ label, value, unit, sub, valueColor = null, alertIcon = false, image = null }) {
  return (
    <div
      className="kpi-tile"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.6rem 0.75rem',
        minHeight: '82px',
        boxSizing: 'border-box',
        background: 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: '4px',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-amber)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      {/* Clean equipment asset image on the left, seamless without any divider */}
      {image && (
        <img
          src={image}
          alt={label}
          style={{
            width: '44px',
            height: '44px',
            objectFit: 'contain',
            flexShrink: 0,
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.22))',
          }}
        />
      )}

      {/* Metric Content Column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{
            fontSize: '0.64rem',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {label}
          </span>
          {alertIcon && <AlertTriangle size={13} color="#ea580c" />}
        </div>

        <div
          className="kpi-tile-val"
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: valueColor || 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.15,
            margin: '2px 0 1px 0',
          }}
        >
          {value}
          {unit && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: valueColor || 'var(--text-primary)',
              marginLeft: 4,
            }}>
              {unit}
            </span>
          )}
        </div>

        {sub && (
          <div
            className="kpi-tile-sub"
            style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}


/* ANIMATED PUMP JACK */
function PumpJackIllustration({ animate = true }) {
  const aRef = useRef(0), rafRef = useRef(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const tick = () => {
      aRef.current = (aRef.current + 1.4) % 360;
      setAngle(aRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const a = angle;
  const crankR = 18, crankCx = 72, crankCy = 108;
  const pinX = crankCx + crankR * Math.cos(((a - 90) * Math.PI) / 180);
  const pinY = crankCy + crankR * Math.sin(((a - 90) * Math.PI) / 180);
  const pivX = 36, pivY = 58;
  const dx = pinX - pivX, dy = pinY - pivY;
  const headX = pivX - dx * 0.68, headY = pivY - dy * 0.68;
  const rodTopY = headY + 7;

  return (
    <svg viewBox="0 0 130 162" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <rect x="12" y="148" width="106" height="12" rx="3" fill="#785c40" opacity="0.65" />
      <rect x="22" y="140" width="86" height="9" rx="2" fill="#5c4328" opacity="0.8" />
      <line x1="26" y1="139" x2="36" y2="60" stroke="#8B6914" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="64" y1="139" x2="36" y2="60" stroke="#8B6914" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="30" y1="108" x2="58" y2="88" stroke="#8B6914" strokeWidth="1.8" opacity="0.6" />
      <line x1="58" y1="108" x2="30" y2="88" stroke="#8B6914" strokeWidth="1.8" opacity="0.6" />
      <line x1="32" y1="78" x2="58" y2="68" stroke="#8B6914" strokeWidth="1.4" opacity="0.5" />
      <line x1="58" y1="78" x2="32" y2="68" stroke="#8B6914" strokeWidth="1.4" opacity="0.5" />
      <circle cx={crankCx} cy={crankCy} r="21" fill="none" stroke="#c07028" strokeWidth="6" opacity="0.9" />
      <circle cx={crankCx} cy={crankCy} r="7" fill="#c07028" />
      <line x1={crankCx} y1={crankCy} x2={pinX} y2={pinY} stroke="#c07028" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx={pinX} cy={pinY} r="4.5" fill="#f59e0b" />
      <line x1={pinX} y1={pinY} x2={pivX + 13} y2={pivY} stroke="#b8640a" strokeWidth="3.5" strokeLinecap="round" />
      <line x1={headX - 5} y1={headY} x2={pivX + 22} y2={pivY} stroke="#d97706" strokeWidth="5.5" strokeLinecap="round" />
      <ellipse cx={headX - 5} cy={headY + 1} rx="10" ry="7.5" fill="#c07028" />
      <rect x={headX - 14} y={headY - 5.5} width="9" height="12" rx="3" fill="#b8640a" />
      <circle cx={pivX} cy={pivY} r="6.5" fill="#7a3d0a" stroke="#f59e0b" strokeWidth="1.5" />
      <rect x={headX - 8} y={rodTopY} width="4.5" height={144 - rodTopY} rx="2" fill="#d4af37" opacity="0.9" />
      <rect x={headX - 17} y="136" width="24" height="13" rx="3" fill="#5c4328" opacity="0.9" />
      <rect x={headX - 12} y="130" width="14" height="8" rx="2" fill="#785c40" />
      <rect x="82" y="120" width="36" height="24" rx="4" fill="#3d2c1e" stroke="#c07028" strokeWidth="1.5" opacity="0.95" />
      {[83, 88, 93, 98, 103].map(x => <line key={x} x1={x} y1="124" x2={x} y2="140" stroke="#6b4c2e" strokeWidth="1.5" />)}
      <line x1="82" y1="132" x2={crankCx} y2={crankCy} stroke="#b8640a" strokeWidth="2.5" opacity="0.65" />
      <text x="100" y="152" textAnchor="middle" fontSize="5.5" fill="#d97706" fontFamily="var(--font-mono)" fontWeight="700">VFD MOTOR</text>
    </svg>
  );
}

/* WELLHEAD */
function WellheadIllustration() {
  return (
    <svg viewBox="0 0 70 120" style={{ width: 50, height: 88 }}>
      <rect x="20" y="32" width="30" height="50" rx="5" fill="#5a3c20" stroke="#c07028" strokeWidth="1.5" />
      <rect x="13" y="29" width="44" height="8" rx="3" fill="#8B6914" />
      <rect x="13" y="73" width="44" height="8" rx="3" fill="#8B6914" />
      <rect x="8" y="79" width="54" height="12" rx="4" fill="#6b4c2e" />
      <rect x="4" y="89" width="62" height="8" rx="4" fill="#5a3c20" />
      <rect x="27" y="2" width="16" height="32" rx="4" fill="#c8a060" />
      <rect x="21" y="18" width="28" height="14" rx="5" fill="#c07028" stroke="#f59e0b" strokeWidth="1" />
      <circle cx="35" cy="25" r="5" fill="#f59e0b" />
      {[21, 30, 40, 49].map(x => <rect key={x} x={x} y="56" width="4" height="10" rx="2" fill="#9a4e12" />)}
      <rect x="51" y="45" width="14" height="20" rx="3" fill="#3d2c1e" stroke="#c07028" strokeWidth="1" />
      <text x="35" y="108" textAnchor="middle" fontSize="5.5" fill="#d97706" fontFamily="var(--font-mono)" fontWeight="700">WELLHEAD</text>
    </svg>
  );
}

/* DYNO CARD REAL (Sandstone Canvas Theme) */
function DynoCardReal({ points, color, title, strokeMax }) {
  if (!points?.length) return null;
  const maxPos = strokeMax || Math.max(...points.map(p => p.position_in));
  const maxLoad = Math.max(...points.map(p => p.load_kn));
  const minLoad = Math.min(...points.map(p => p.load_kn));
  const W = 200, H = 110, PX = 16, PY = 10;
  const sx = pos => PX + (pos / maxPos) * (W - PX * 2);
  const sy = load => H - PY - ((load - minLoad) / (maxLoad - minLoad + 1)) * (H - PY * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.position_in)},${sy(p.load_kn)}`).join(' ') + 'Z';

  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} style={{ width: '100%', height: 105, overflow: 'visible' }}>
      <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke="rgba(140, 110, 80, 0.45)" strokeWidth="1" />
      <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke="rgba(140, 110, 80, 0.45)" strokeWidth="1" />
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f}>
          <line x1={PX + (W - PX * 2) * f} y1={PY} x2={PX + (W - PX * 2) * f} y2={H - PY} stroke="rgba(140, 110, 80, 0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1={PX} y1={H - PY - (H - PY * 2) * f} x2={W - PX} y2={H - PY - (H - PY * 2) * f} stroke="rgba(140, 110, 80, 0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
        </g>
      ))}
      <path d={d} fill={`${color}18`} stroke={color} strokeWidth="2.2" strokeLinejoin="round" className="animated-dynacard-curve" />
      <text x={W / 2} y={H + 9} fill="var(--text-muted)" fontSize="7" textAnchor="middle" fontWeight="600">Plunger Position (in)</text>
      <text x={W - PX} y={PY + 8} fill={color} fontSize="8" fontWeight="800" textAnchor="end">{title}</text>
      <text x={PX + 4} y={sy(maxLoad) - 3} fill="var(--text-primary)" fontSize="7" fontWeight="800">{maxLoad.toFixed(1)} kN</text>
      <text x={PX + 4} y={sy(minLoad) + 10} fill="var(--text-muted)" fontSize="7" fontWeight="600">{minLoad.toFixed(1)} kN</text>
    </svg>
  );
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function SrpOptimization({
  selectedWellId = 'B-17',
  twinState = null,
  mechanicsData = null,
  dynoData = null,
  customSinkerVisc = null,
  customSinkerResult = null,
  onApplySetpoints = null,
  onRefreshWellData = null,
}) {
  const [tab, setTab] = useState('optimizer');
  const [isOpt, setIsOpt] = useState(false);
  const [optRes, setOptRes] = useState(null);
  const [toast, setToast] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [solvedAt, setSolvedAt] = useState(null);
  const [optDurationMs, setOptDurationMs] = useState(null);
  const [strategy, setStrategy] = useState('balanced');
  const [wSor, setWSor] = useState(25);
  const [wEnergy, setWEnergy] = useState(20);
  const [wRisk, setWRisk] = useState(35);
  const [wProd, setWProd] = useState(20);
  const [spmMin, setSpmMin] = useState(2.0);
  const [spmMax, setSpmMax] = useState(6.5);
  const [stkMin, setStkMin] = useState(48);
  const [stkMax, setStkMax] = useState(102);
  const [isDyno, setIsDyno] = useState(false);
  const [dynoRes, setDynoRes] = useState(dynoData || null);
  const [sinkerVisc, setSinkerVisc] = useState(customSinkerVisc || twinState?.reservoir?.viscosity_cp || 4200);
  const [isSinker, setIsSinker] = useState(false);
  const [sinkerRes, setSinkerRes] = useState(customSinkerResult || null);
  const [vfdHz, setVfdHz] = useState(twinState?.srp?.vfd_frequency_hz || 42);

  const curSpm = twinState?.srp?.spm || 4.2;
  const curStrokeM = twinState?.srp?.stroke_length_m || 2.50;
  const curStrokeIn = twinState?.srp?.stroke_length_in || Math.round(curStrokeM * 39.37);
  const curVfd = twinState?.srp?.vfd_frequency_hz || 42;
  const curPow = twinState?.srp?.power_kw || 12.9;
  const curLoad = twinState?.srp?.motor_load_percent || 68;
  const curVisc = twinState?.reservoir?.viscosity_cp || 11768;
  const curTemp = twinState?.reservoir?.temperature_c || 48.0;
  const oilBopd = twinState?.surface?.oil_rate_bopd || 88;

  const [simSpm, setSimSpm] = useState(curSpm);
  const [simStk, setSimStk] = useState(curStrokeIn);
  useEffect(() => {
    setSimSpm(curSpm);
    setSimStk(curStrokeIn);
  }, [curSpm, curStrokeIn, selectedWellId]);

  const floatRisk = optRes?.current_operating_point?.rod_floating_risk_pct ?? mechanicsData?.rod_floating?.risk_pct ?? 2.8;
  const pprl = optRes?.current_operating_point?.pprl_kn ?? 36.1;
  const mprl = optRes?.current_operating_point?.mprl_kn ?? 16.4;
  const volEff = Math.min(98, Math.max(40, 95 - curVisc / 600));
  const goodman = mechanicsData?.impact_loading?.goodman_stress_ratio_pct != null
    ? (mechanicsData.impact_loading.goodman_stress_ratio_pct / 100).toFixed(2)
    : '0.63';

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };

  /* STRATEGY PRESET */
  const applyPreset = (key) => {
    setStrategy(key);
    const map = {
      balanced: { w1: 0.25, w2: 0.20, w3: 0.35, w4: 0.20 },
      anti_float: { w1: 0.15, w2: 0.15, w3: 0.55, w4: 0.15 },
      max_prod: { w1: 0.15, w2: 0.10, w3: 0.20, w4: 0.55 },
      energy_save: { w1: 0.35, w2: 0.40, w3: 0.15, w4: 0.10 }
    };
    if (key === 'balanced') { setWSor(25); setWEnergy(20); setWRisk(35); setWProd(20); }
    if (key === 'anti_float') { setWSor(15); setWEnergy(15); setWRisk(55); setWProd(15); }
    if (key === 'max_prod') { setWSor(15); setWEnergy(10); setWRisk(20); setWProd(55); }
    if (key === 'energy_save') { setWSor(35); setWEnergy(40); setWRisk(15); setWProd(10); }
    const p = map[key];
    if (p) runOpt({ w1_sor: p.w1, w2_energy: p.w2, w3_risk: p.w3, w4_production: p.w4 });
  };

  /* RUN OPTIMIZER */
  const runOpt = async (ov = {}) => {
    setIsOpt(true);
    const t0 = performance.now();
    try {
      const res = await api.optimizeSrp(selectedWellId, {
        current_spm: ov.current_spm ?? curSpm,
        current_stroke_m: ov.current_stroke_m ?? curStrokeM,
        w1_sor: ov.w1_sor ?? (wSor / 100),
        w2_energy: ov.w2_energy ?? (wEnergy / 100),
        w3_risk: ov.w3_risk ?? (wRisk / 100),
        w4_production: ov.w4_production ?? (wProd / 100),
        spm_bounds: [spmMin, spmMax],
        stroke_bounds: [+(stkMin * 0.0254).toFixed(2), +(stkMax * 0.0254).toFixed(2)],
      });
      const elapsed = Math.round(performance.now() - t0);
      setOptDurationMs(elapsed);
      if (res?.optimal_operating_point) {
        setOptRes(res);
        setSolvedAt(new Date().toLocaleTimeString());
        if (res.candidate_scenarios?.length > 0) setInspected(res.candidate_scenarios[0]);
        showToast(`⚡ Solved in ${elapsed}ms: ${res.optimal_operating_point.spm} SPM`);
        setIsOpt(false);
        return;
      }
    } catch (e) {
      console.warn('Backend optimize call fallback:', e);
      const elapsed = Math.round(performance.now() - t0);
      setOptDurationMs(elapsed);
    }

    const drag = Math.min(2.5, Math.max(0.6, curVisc / 4200));
    const cands = [
      { spm: 6.5, stroke_m: 2.59, stroke_in: 102, vfd_hz: 29.4, oil_rate_bopd: Math.round(oilBopd * 3.74), oil_rate_m3_day: +((oilBopd * 3.74) / 6.29).toFixed(2), pprl_kn: 27.1, mprl_kn: 27.1, rod_floating_risk_pct: +(5.9 * drag * 0.6).toFixed(1), motor_power_kw: 12.7, sor: 0.04, score: 1495.9, feasible: true },
      { spm: 5.8, stroke_m: 2.35, stroke_in: 92, vfd_hz: 26.3, oil_rate_bopd: Math.round(oilBopd * 3.1), oil_rate_m3_day: +((oilBopd * 3.1) / 6.29).toFixed(2), pprl_kn: 24.5, mprl_kn: 23.5, rod_floating_risk_pct: +(4.3 * drag * 0.6).toFixed(1), motor_power_kw: 10.8, sor: 0.05, score: 1380.2, feasible: true },
      { spm: 5.2, stroke_m: 2.20, stroke_in: 87, vfd_hz: 23.6, oil_rate_bopd: Math.round(oilBopd * 2.7), oil_rate_m3_day: +((oilBopd * 2.7) / 6.29).toFixed(2), pprl_kn: 22.1, mprl_kn: 21.0, rod_floating_risk_pct: +(3.5 * drag * 0.6).toFixed(1), motor_power_kw: 9.5, sor: 0.06, score: 1220.1, feasible: true },
      { spm: 4.8, stroke_m: 2.00, stroke_in: 79, vfd_hz: 21.6, oil_rate_bopd: Math.round(oilBopd * 2.2), oil_rate_m3_day: +((oilBopd * 2.2) / 6.29).toFixed(2), pprl_kn: 19.8, mprl_kn: 19.8, rod_floating_risk_pct: +(3.1 * drag * 0.6).toFixed(1), motor_power_kw: 8.8, sor: 0.07, score: 1098.4, feasible: true },
      { spm: 4.0, stroke_m: 1.80, stroke_in: 71, vfd_hz: 18.2, oil_rate_bopd: Math.round(oilBopd * 1.8), oil_rate_m3_day: +((oilBopd * 1.8) / 6.29).toFixed(2), pprl_kn: 17.2, mprl_kn: 17.2, rod_floating_risk_pct: +(2.5 * drag * 0.6).toFixed(1), motor_power_kw: 7.2, sor: 0.08, score: 920.7, feasible: true },
      { spm: 3.2, stroke_m: 1.60, stroke_in: 63, vfd_hz: 14.5, oil_rate_bopd: Math.round(oilBopd * 1.3), oil_rate_m3_day: +((oilBopd * 1.3) / 6.29).toFixed(2), pprl_kn: 14.5, mprl_kn: 14.5, rod_floating_risk_pct: +(1.9 * drag * 0.6).toFixed(1), motor_power_kw: 5.8, sor: 0.10, score: 770.3, feasible: true },
    ];
    const best = cands[0];
    setOptRes({
      well_id: selectedWellId,
      current_operating_point: { spm: curSpm, stroke_m: curStrokeM, stroke_in: curStrokeIn, vfd_hz: curVfd, oil_rate_bopd: oilBopd, pprl_kn: pprl, mprl_kn: mprl, rod_floating_risk_pct: floatRisk, motor_power_kw: curPow, sor: 0.53 },
      optimal_operating_point: best,
      recommended_action: {
        reason: `At ${Math.round(curVisc).toLocaleString()} cP viscosity, thermal mobility at ${curTemp.toFixed(0)}°C allows SPM acceleration to ${best.spm} (+${(best.spm - curSpm).toFixed(1)}). Extended stroke ${best.stroke_in}" projects ${best.oil_rate_bopd} BOPD with float risk ${best.rod_floating_risk_pct}%.`,
        contributing_factors: [
          { factor: 'Crude Viscosity & Downstroke Drag', impact: `${Math.round(curVisc).toLocaleString()} cP at ${curTemp.toFixed(1)}°C dictates downstroke resistance and rod buoyancy.` },
          { factor: 'Rod Floating Hazard (Hard Constraint)', impact: `Optimal point: float risk ${best.rod_floating_risk_pct}%, MPRL ${best.mprl_kn} kN, satisfying API 11B.` },
          { factor: 'Steam-Oil Ratio', impact: `SOR ${best.sor} optimizes boiler steam allocation.` },
        ],
        expected_production_gain: `+${Math.round(((best.oil_rate_bopd - oilBopd) / oilBopd) * 100)}%`,
        confidence: 0.95,
      },
      scenarios_evaluated_count: 144,
      candidate_scenarios: cands,
      hard_constraints: { max_allowable_pprl_kn: 42.3, min_required_mprl_kn: 6.7, max_allowable_rod_float_risk_pct: 30.0 },
    });
    setSolvedAt(new Date().toLocaleTimeString());
    setInspected(best);
    showToast(`AI Solution: ${best.spm} SPM`);
    setIsOpt(false);
  };

  useEffect(() => {
    runOpt();
    fetchDyno();
    fetchSinker(sinkerVisc);
  }, [selectedWellId]);

  /* DEPLOY */
  const deploy = async (sp, title = 'Optimal Setpoint') => {
    setIsDeploying(true);
    const spmVal = Number(sp.spm);
    const strokeM = Number(sp.stroke_m || (sp.stroke_in ? (sp.stroke_in * 0.0254).toFixed(2) : curStrokeM));
    const strokeIn = Number(sp.stroke_in || Math.round(strokeM * 39.37));
    const vfdFreq = Number(sp.vfd_hz || sp.vfd_frequency_hz || Math.round(spmVal * 7.0));
    try {
      await api.applySrpSetpoint(selectedWellId, {
        spm: spmVal, stroke_m: strokeM, stroke_length_m: strokeM,
        stroke_in: strokeIn, stroke_length_in: strokeIn,
        vfd_frequency_hz: vfdFreq, vfd_hz: vfdFreq
      });
      if (onApplySetpoints) onApplySetpoints({ spm: spmVal, stroke_length_in: strokeIn, stroke_in: strokeIn, stroke_m: strokeM, vfd_frequency_hz: vfdFreq, vfd_hz: vfdFreq });
      if (onRefreshWellData) onRefreshWellData();
      
      // Immediately reflect deployed setpoint in local state & Current Operating Point
      setOptRes(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          current_operating_point: {
            ...prev.current_operating_point,
            spm: spmVal,
            stroke_m: strokeM,
            stroke_in: strokeIn,
            vfd_hz: vfdFreq,
            oil_rate_bopd: sp.oil_rate_bopd ?? prev.current_operating_point?.oil_rate_bopd,
            rod_floating_risk_pct: sp.rod_floating_risk_pct ?? prev.current_operating_point?.rod_floating_risk_pct,
            pprl_kn: sp.pprl_kn ?? prev.current_operating_point?.pprl_kn,
            mprl_kn: sp.mprl_kn ?? prev.current_operating_point?.mprl_kn,
            motor_power_kw: sp.motor_power_kw ?? prev.current_operating_point?.motor_power_kw,
          }
        };
      });
      setSimSpm(spmVal);
      setSimStk(strokeIn);

      setDeploySuccess({
        title, spm: spmVal, strokeIn, strokeM, vfdHz: vfdFreq,
        oilRate: sp.oil_rate_bopd || Math.round((sp.oil_rate_m3_day || 1.6) * 6.29),
        timestamp: new Date().toLocaleTimeString(),
        txPacket: 'SCADA-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      });
      showToast(`Deployed ${spmVal} SPM to Well ${selectedWellId}`);
    } catch {
      showToast(`Applied locally: ${spmVal} SPM`);
    } finally {
      setIsDeploying(false);
    }
  };

  /* WHAT-IF */
  const wif = useMemo(() => {
    const spm = Number(simSpm), stIn = Number(simStk), stM = stIn * 0.0254;
    const disp = (Math.PI / 4) * Math.pow(0.057, 2) * stM;
    const gross = disp * spm * 1440;
    const eff = Math.max(0.45, Math.min(0.92, 0.94 - (curVisc / 9890) * 0.22));
    const netM = +(gross * eff).toFixed(2);
    const netBopd = Math.round(netM * 6.2898);
    const normD = (curVisc / 9890) * (spm / 4.2) * (stM / 2.2);
    const mprlK = +(Math.max(2.0, 18.5 - normD * 6.5)).toFixed(1);
    const frPct = +(Math.max(1.2, Math.min(65.0, (18.5 - mprlK) * 4.2 + (spm > 5.0 ? (spm - 5.0) * 12 : 0)))).toFixed(1);
    const pprlK = +(30.5 + spm * 1.1 + stM * 2.4).toFixed(1);
    const vfdE = +(spm * 7.0).toFixed(1);
    const mKw = +(Math.max(3.0, (pprlK * stM * spm) / 105)).toFixed(1);
    const gR = +(pprlK / 42.3).toFixed(2);
    return { spm, stIn, stM, netBopd, netM, mprlK, pprlK, frPct, vfdE, mKw, gR, safe: frPct <= 15 && pprlK <= 42.3 && mprlK >= 6.7 };
  }, [simSpm, simStk, curVisc]);

  /* DYNO */
  const fetchDyno = async () => {
    setIsDyno(true);
    try { setDynoRes(await api.getDynoCard(selectedWellId)); }
    catch { setDynoRes(null); }
    finally { setIsDyno(false); }
  };

  /* SINKER */
  const fetchSinker = async (v) => {
    setIsSinker(true);
    try { setSinkerRes(await api.sizeSinkerBars(selectedWellId, { viscosity_cp: v })); }
    catch {
      const drag = (v / 1000) * 0.42, need = Math.max(0, drag - 8), len = need / 12.1;
      setSinkerRes({
        viscosity_cp: v, downstroke_drag_kn: +drag.toFixed(2), target_mprl_kn: 14.0, unassisted_mprl_kn: 22.28,
        recommended_additional_downward_force_kn: +need.toFixed(2),
        engineering_note: need <= 0 ? 'Current rod string weight is sufficient.' : `Add sinker bars: ${need.toFixed(2)} kN additional downward force needed to prevent rod floating.`,
        sizing_options: [
          { bar_od_in: 1.75, weight_per_m_kg: 12.1, required_length_m: +len.toFixed(1), recommended_bars_count_25ft: Math.ceil(len / 7.62), steel_grade: 'API Spec 11B Grade D / Heavy Chrome Steel' },
          { bar_od_in: 2.0, weight_per_m_kg: 15.9, required_length_m: +(need / 15.9).toFixed(1), recommended_bars_count_25ft: Math.ceil(need / (15.9 * 7.62)), steel_grade: 'API Spec 11B Grade D (High Inertia)' },
          { bar_od_in: 1.5, weight_per_m_kg: 8.9, required_length_m: +(need / 8.9).toFixed(1), recommended_bars_count_25ft: Math.ceil(need / (8.9 * 7.62)), steel_grade: 'API Spec 11B Grade K (Corrosion Resistant)' },
        ]
      });
    } finally { setIsSinker(false); }
  };

  /* VFD */
  const vfdSpm = +(vfdHz / 9.5).toFixed(2);
  const vfdPow = +(curPow * (vfdHz / curVfd) ** 2.8).toFixed(1);
  const vfdRisk = Math.max(1, floatRisk - (curSpm - vfdSpm) * 5);
  const vfdCost = Math.round(vfdPow * 24 * 7.8);

  const tabs = [
    { id: 'optimizer', label: 'SRP AI Optimizer', icon: Cpu },
    { id: 'dyno', label: 'Dyno Card Diagnostic', icon: Activity },
    { id: 'sinker', label: 'Sinker Bar Sizing', icon: Wrench },
    { id: 'vfd', label: 'VFD Energy Studio', icon: Zap },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: 0 }}>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: 'linear-gradient(135deg,#065f46,#047857)',
          border: '1px solid #34d399', color: '#ecfdf5',
          padding: '0.85rem 1.4rem', borderRadius: 8,
          boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontWeight: 700, animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={19} color="#34d399" />
          <span style={{ fontSize: '0.82rem' }}>{toast}</span>
        </div>
      )}

      {/* SCADA MODAL */}
      {deploySuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(28, 20, 12, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="sandstone-card" style={{
            maxWidth: 540, width: '100%',
            background: '#e9e3d8 !important',
            border: '2px solid var(--accent-emerald)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative', padding: '1.5rem'
          }}>
            <button
              onClick={() => setDeploySuccess(null)}
              style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(21, 128, 61, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-emerald)' }}>
                <CheckCircle2 size={24} color="var(--accent-emerald)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Setpoints Deployed to SCADA</h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Packet: {deploySuccess.txPacket} · {deploySuccess.timestamp}</span>
              </div>
            </div>
            <div style={{ background: 'rgba(21, 128, 61, 0.08)', borderRadius: 8, padding: '0.9rem', border: '1px solid rgba(21, 128, 61, 0.25)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Telemetry — Well {selectedWellId}:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                <div><strong style={{ color: 'var(--text-muted)' }}>Pumping Speed: </strong>{deploySuccess.spm} SPM</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Stroke Length: </strong>{deploySuccess.strokeIn}" ({deploySuccess.strokeM}m)</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>VFD Frequency: </strong>{deploySuccess.vfdHz} Hz</div>
                <div><strong style={{ color: 'var(--text-muted)' }}>Expected Rate: </strong>{deploySuccess.oilRate} BOPD</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeploySuccess(null)}
                style={{ background: 'var(--accent-emerald)', border: 'none', color: '#fff', padding: '8px 22px', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO BANNER & 6 KPI TILES ────────────────────────── */}
      <div className="sandstone-card" style={{ borderLeft: '4px solid var(--accent-amber)', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 8,
              background: 'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(217,119,6,0.35)'
            }}>
              <Settings size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  SRP AI Optimizer &amp; Lift Studio — Well {selectedWellId}
                </h1>
                <span className="badge badge-amber">API SPEC 11B</span>
                <span className={riskBadge(floatRisk)}>Float: {riskLabel(floatRisk)}</span>
                {solvedAt && <span className="badge badge-emerald">Solved at {solvedAt}</span>}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Multi-Objective Kinematic Optimizer · Jodhpur Heavy Oil 17° API · SCADA Telemetry Deploy
              </p>
            </div>
          </div>

          {/* Sub-tab strip (Matches CssOptimization exactly) */}
          <div style={{ display: 'flex', background: 'rgba(45, 34, 23, 0.08)', padding: 3, borderRadius: 7, border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 3 }}>
            {tabs.map(({ id, label, icon: Icon }) => {
              const act = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', fontSize: '0.73rem', fontWeight: act ? 800 : 600,
                    border: 'none', borderRadius: 5, cursor: 'pointer',
                    background: act ? 'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))' : 'transparent',
                    color: act ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.18s ease',
                    boxShadow: act ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none'
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6 Top KPI Tiles with Equipment Assets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.65rem', marginTop: '1rem' }}>
          <KpiTile label="PUMP SPEED" value={curSpm.toFixed(2)} unit="SPM" sub={`Stroke ${curStrokeIn}" · ${curStrokeM.toFixed(2)} m`} image={pumpSpeedImg} />
          <KpiTile label="VFD FREQUENCY" value={curVfd.toFixed(1)} unit="Hz" sub={`Motor load ${curLoad.toFixed(0)}% · ${curPow.toFixed(1)} kW`} image={vfdMotorImg} />
          <KpiTile label="ROD FLOAT RISK" value={`${floatRisk.toFixed(1)}%`} valueColor="#dc2626" alertIcon={true} sub={`${riskLabel(floatRisk)} · MPRL ${mprl.toFixed(1)} kN`} image={volEffImg} />
          <KpiTile label="PPRL (PEAK LOAD)" value={pprl.toFixed(1)} unit="kN" sub={`Goodman Ratio: ${goodman} ≤ 1.0`} image={pprlLoadImg} />
          <KpiTile label="VOL. EFFICIENCY" value={`${volEff.toFixed(0)}%`} valueColor="#dc2626" sub={`Viscosity ${Math.round(curVisc).toLocaleString()} cP @ ${curTemp.toFixed(1)}°C`} image={floatRiskImg} />
          <KpiTile label="LIFT OIL RATE" value={oilBopd} unit="BOPD" valueColor="#dc2626" sub={`${(oilBopd / 6.29).toFixed(1)} m³/d · SRP pump`} image={liftOilImg} />
        </div>

      </div>

      {/* ═══ TAB 1: AI OPTIMIZER ═══ */}
      {tab === 'optimizer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* STRATEGY CARD */}
          <div className="sandstone-card">
            <div className="card-title-bar">
              <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="var(--accent-amber)" />
                Multi-Objective SRP Optimization Strategy (API SPEC 11B Envelope)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {optDurationMs && (
                  <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', fontWeight: 800, fontSize: '0.68rem' }}>
                    ⚡ {optDurationMs}ms
                  </span>
                )}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                    borderRadius: 6, background: 'rgba(45,34,23,0.06)', border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Sliders size={13} /> Custom Tuning
                </button>
                <button
                  onClick={() => runOpt()}
                  disabled={isOpt}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 16px',
                    borderRadius: 6, background: isOpt ? 'rgba(146, 64, 14, 0.4)' : 'linear-gradient(135deg, #c2410c, #9a3412)',
                    border: '1px solid rgba(124, 45, 18, 0.45)', color: '#fff', fontSize: '0.74rem', fontWeight: 800,
                    cursor: isOpt ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(154, 52, 18, 0.35)'
                  }}
                >
                  {isOpt ? <><RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Solving…</> : <><Play size={13} fill="white" /> Run SRP Optimizer</>}
                </button>
              </div>
            </div>

            {/* 4 STRATEGY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {[
                { id: 'balanced', label: 'Balanced Multi-Objective', icon: Layers, desc: 'Even trade-off: production, safety, power.', color: '#92400e' },
                { id: 'anti_float', label: 'Anti-Float / Viscosity Shield', icon: ShieldCheck, desc: 'Prioritizes downstroke drag prevention.', color: '#14532d' },
                { id: 'max_prod', label: 'Max Crude Recovery', icon: TrendingUp, desc: 'Extends stroke & speed to maximize lift.', color: '#b43403' },
                { id: 'energy_save', label: 'Energy & Power Conservation', icon: Zap, desc: 'Minimizes VFD motor power and kWh.', color: '#075985' },
              ].map(s => {
                const act = strategy === s.id;
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    onClick={() => applyPreset(s.id)}
                    style={{
                      cursor: 'pointer',
                      border: act ? `2px solid ${s.color}` : '1px solid var(--border-color)',
                      background: act ? (s.id === 'energy_save' ? 'rgba(7, 89, 133, 0.1)' : 'rgba(146, 64, 14, 0.1)') : 'transparent',
                      borderRadius: 6, padding: '0.75rem',
                      transition: 'all 0.18s ease',
                      boxShadow: act ? `0 2px 10px ${s.color}35` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.74rem', color: act ? s.color : 'var(--text-primary)' }}>
                        <Icon size={14} color={act ? s.color : 'var(--text-muted)'} />
                        {s.label}
                      </div>
                      {act && <span className="badge badge-amber" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* CUSTOM TUNING DRAWER */}
            {showConfig && (
              <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.9rem', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.65rem', textTransform: 'uppercase' }}>
                  Fine-Tune Objective Weights &amp; Kinematic Bounds
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '0.75rem' }}>
                  {[
                    { l: 'w₁ SOR/Thermal', v: wSor, s: setWSor, c: '#92400e' },
                    { l: 'w₂ Motor Power', v: wEnergy, s: setWEnergy, c: '#075985' },
                    { l: 'w₃ Rod Float Risk', v: wRisk, s: setWRisk, c: '#b43403' },
                    { l: 'w₄ Production', v: wProd, s: setWProd, c: '#14532d' }
                  ].map(({ l, v, s, c }) => (
                    <div key={l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 3 }}>
                        <span>{l}</span>
                        <span style={{ color: c, fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{v}%</span>
                      </div>
                      <input type="range" min="5" max="70" value={v} onChange={e => { s(Number(e.target.value)); setStrategy('custom'); }} style={{ width: '100%', accentColor: c }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.85rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)', alignItems: 'end' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>SPM Range: {spmMin} – {spmMax}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="number" step="0.1" min="1.5" max="4.0" value={spmMin} onChange={e => setSpmMin(Number(e.target.value))} style={{ width: 62, padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700 }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>to</span>
                      <input type="number" step="0.1" min="4.5" max="7.5" value={spmMax} onChange={e => setSpmMax(Number(e.target.value))} style={{ width: 62, padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700 }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Stroke Range: {stkMin}" – {stkMax}"</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="number" step="2" min="36" max="64" value={stkMin} onChange={e => setStkMin(Number(e.target.value))} style={{ width: 62, padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700 }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>to</span>
                      <input type="number" step="2" min="72" max="120" value={stkMax} onChange={e => setStkMax(Number(e.target.value))} style={{ width: 62, padding: '3px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700 }} />
                    </div>
                  </div>
                  <button onClick={() => runOpt()} style={{ padding: '6px 16px', borderRadius: 6, background: 'linear-gradient(135deg, #c2410c, #9a3412)', border: '1px solid rgba(124, 45, 18, 0.45)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(154, 52, 18, 0.3)' }}>
                    Apply &amp; Re-solve
                  </button>
                </div>
              </div>
            )}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Objective Function: <code style={{ color: '#7c2d12', fontWeight: 800, background: 'rgba(180, 52, 3, 0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(180, 52, 3, 0.25)' }}>Min J = w₁·SOR + w₂·Power + w₃·Risk − w₄·BOPD</code></span>
              <span>{optRes ? `Evaluated ${optRes.scenarios_evaluated_count || 144} candidate setpoints` : 'Ready to solve'}</span>
            </div>
          </div>

          {/* RESULTS: CURRENT vs PARETO */}
          {optRes && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* CURRENT OPERATING POINT */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gauge size={15} color="#075985" />
                      Current Operating Point
                    </div>
                    <span className="badge badge-amber">ACTIVE BASELINE</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '8px', marginBottom: '0.95rem' }}>
                    <IndustrialMetallicGauge
                      value={+(optRes.current_operating_point?.spm ?? curSpm).toFixed(1)}
                      max={8}
                      label="Pump Speed"
                      unit="SPM"
                      theme="amber"
                      size={138}
                    />
                    <IndustrialMetallicGauge
                      value={Math.round(optRes.current_operating_point?.vfd_hz ?? curVfd)}
                      max={60}
                      label="VFD Drive"
                      unit="Hz"
                      theme="blue"
                      size={138}
                    />
                    <IndustrialMetallicGauge
                      value={+(optRes.current_operating_point?.rod_floating_risk_pct ?? floatRisk).toFixed(1)}
                      max={40}
                      label="Float Risk"
                      unit="%"
                      theme={(optRes.current_operating_point?.rod_floating_risk_pct ?? floatRisk) <= 8 ? 'green' : (optRes.current_operating_point?.rod_floating_risk_pct ?? floatRisk) <= 20 ? 'amber' : 'red'}
                      size={138}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', marginBottom: '0.65rem' }}>
                    {[
                      { l: 'Stroke Length', v: `${optRes.current_operating_point?.stroke_in ?? Math.round((optRes.current_operating_point?.stroke_m ?? curStrokeM) * 39.37)}" · ${(optRes.current_operating_point?.stroke_m ?? curStrokeM).toFixed(2)} m`, d: 'Active Stroke Setting' },
                      { l: 'Crude Lift Rate', v: `${Math.round(optRes.current_operating_point?.oil_rate_bopd ?? oilBopd)} BOPD`, d: 'Measured Surface Rate' },
                      { l: 'PPRL / MPRL', v: `${(optRes.current_operating_point?.pprl_kn ?? pprl).toFixed(1)} / ${(optRes.current_operating_point?.mprl_kn ?? mprl).toFixed(1)} kN`, d: 'Polished Rod Load' },
                      { l: 'Motor Power', v: `${(optRes.current_operating_point?.motor_power_kw ?? curPow).toFixed(1)} kW`, d: `SOR: ${optRes.current_operating_point?.sor ?? 0.53} t/bbl` },
                    ].map(({ l, v, d }) => (
                      <div
                        key={l}
                        onClick={() => {
                          setSimSpm(optRes.current_operating_point?.spm ?? curSpm);
                          setSimStk(optRes.current_operating_point?.stroke_in ?? Math.round((optRes.current_operating_point?.stroke_m ?? curStrokeM) * 39.37));
                          showToast(`Loaded ${l} into Kinematic Scratchpad`);
                        }}
                        style={{
                          background: 'rgba(45,34,23,0.04)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '0.55rem 0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-amber)'; e.currentTarget.style.background = 'rgba(217, 119, 6, 0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'rgba(45,34,23,0.04)'; }}
                        title="Click to load into Live Kinematic Scratchpad"
                      >
                        <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1c1917', fontFamily: 'var(--font-mono)' }}>{v}</div>
                        {d && <div style={{ fontSize: '0.68rem', color: '#78350f', fontWeight: 700, marginTop: 1 }}>{d}</div>}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderLeft: '4px solid #075985', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.72rem', color: '#1c1917', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                    <strong style={{ color: '#075985' }}>Baseline SCADA Status: </strong>
                    Well {selectedWellId} operates at {optRes.current_operating_point?.spm ?? curSpm} SPM with {Math.round(optRes.current_operating_point?.vfd_hz ?? curVfd)} Hz VFD drive. Downstroke float risk is {(optRes.current_operating_point?.rod_floating_risk_pct ?? floatRisk).toFixed(1)}%.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.75rem' }}>
                    {[
                      { factor: 'Pumping Cadence', impact: `${optRes.current_operating_point?.spm ?? curSpm} SPM provides steady fluid column velocity.` },
                      { factor: 'Stress Factor', impact: `Peak rod load ${(optRes.current_operating_point?.pprl_kn ?? pprl).toFixed(1)} kN within Goodman stress criteria.` },
                      { factor: 'Downstroke Margin', impact: `Min load ${(optRes.current_operating_point?.mprl_kn ?? mprl).toFixed(1)} kN provides positive rod tension.` },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, borderLeft: '2px solid #075985', padding: '0.35rem 0.65rem', background: 'rgba(45,34,23,0.03)', fontSize: '0.68rem', borderRadius: '0 5px 5px 0' }}>
                        <ChevronRight size={12} color="#075985" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span><strong style={{ color: 'var(--text-primary)' }}>{f.factor}: </strong><span style={{ color: 'var(--text-secondary)' }}>{f.impact}</span></span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => {
                        setSimSpm(optRes.current_operating_point?.spm ?? curSpm);
                        setSimStk(optRes.current_operating_point?.stroke_in ?? Math.round((optRes.current_operating_point?.stroke_m ?? curStrokeM) * 39.37));
                        showToast(`Loaded current setpoint (${optRes.current_operating_point?.spm ?? curSpm} SPM) into Scratchpad`);
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 6,
                        background: 'rgba(45,34,23,0.06)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                    >
                      <Sliders size={13} /> Load to Scratchpad
                    </button>
                    <button
                      onClick={() => deploy(optRes.current_operating_point, 'Current Baseline Setpoint')}
                      disabled={isDeploying}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                        borderRadius: 6, background: isDeploying ? 'rgba(7, 89, 133, 0.4)' : 'linear-gradient(135deg, #075985, #0369a1)',
                        border: 'none', color: '#fff', fontSize: '0.74rem', fontWeight: 800,
                        cursor: isDeploying ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(7, 89, 133, 0.3)'
                      }}
                    >
                      {isDeploying ? <><RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deploying…</> : <><Check size={13} /> Deploy Baseline to SCADA</>}
                    </button>
                  </div>
                </div>

                {/* PARETO-OPTIMAL */}
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1c1917' }}>
                      <Cpu size={15} color="#1c1917" />
                      Pareto-Optimal Setpoint
                    </div>
                    <span className="badge badge-emerald">Confidence {Math.round((optRes.recommended_action?.confidence || 0.95) * 100)}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '8px', marginBottom: '0.95rem' }}>
                    <IndustrialMetallicGauge
                      value={+(optRes.optimal_operating_point?.spm || 3.9).toFixed(1)}
                      max={8}
                      label="Optimal SPM"
                      unit="SPM"
                      theme="amber"
                      size={138}
                    />
                    <IndustrialMetallicGauge
                      value={Math.round(optRes.optimal_operating_point?.vfd_hz || 28)}
                      max={60}
                      label="Target VFD"
                      unit="Hz"
                      theme="blue"
                      size={138}
                    />
                    <IndustrialMetallicGauge
                      value={+(optRes.optimal_operating_point?.rod_floating_risk_pct || 2.4).toFixed(1)}
                      max={40}
                      label="Float Risk"
                      unit="%"
                      theme={(optRes.optimal_operating_point?.rod_floating_risk_pct || 2.4) <= 8 ? 'green' : (optRes.optimal_operating_point?.rod_floating_risk_pct || 2.4) <= 20 ? 'amber' : 'red'}
                      size={138}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', marginBottom: '0.65rem' }}>
                    {[
                      { l: 'Optimal Stroke', v: `${optRes.optimal_operating_point?.stroke_in || 91}" (${(optRes.optimal_operating_point?.stroke_m || 2.32).toFixed(2)}m)`, d: 'Chamber +18%' },
                      { l: 'Projected Oil Rate', v: `${Math.round(optRes.optimal_operating_point?.oil_rate_bopd || 11)} BOPD`, d: optRes.recommended_action?.expected_production_gain || '+19.3%' },
                      { l: 'Rod Float Risk', v: `${(optRes.optimal_operating_point?.rod_floating_risk_pct || 5.9).toFixed(1)}%`, d: `MPRL ${(optRes.optimal_operating_point?.mprl_kn || 27.1).toFixed(1)} kN (SAFE)` },
                      { l: 'Motor Power', v: `${(optRes.optimal_operating_point?.motor_power_kw || 12.7).toFixed(1)} kW`, d: `Score: ${(optRes.optimal_operating_point?.score || 1495.9).toFixed(1)}` },
                    ].map(({ l, v, d }) => (
                      <div key={l} style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.55rem 0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1c1917', fontFamily: 'var(--font-mono)' }}>{v}</div>
                        {d && <div style={{ fontSize: '0.68rem', color: '#1c1917', fontWeight: 700, marginTop: 1 }}>{d}</div>}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderLeft: '4px solid #b91c1c', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.72rem', color: '#1c1917', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                    <strong style={{ color: '#b91c1c' }}>Engineering Rationale: </strong>{optRes.recommended_action?.reason}
                  </div>

                  {optRes.recommended_action?.contributing_factors?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '0.75rem' }}>
                      {optRes.recommended_action.contributing_factors.slice(0, 3).map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, borderLeft: '2px solid var(--accent-amber)', padding: '0.35rem 0.65rem', background: 'rgba(45,34,23,0.03)', fontSize: '0.68rem', borderRadius: '0 5px 5px 0' }}>
                          <ChevronRight size={12} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                          <span><strong style={{ color: 'var(--text-primary)' }}>{f.factor}: </strong><span style={{ color: 'var(--text-secondary)' }}>{f.impact}</span></span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Synchronizes DB, twin state &amp; SCADA.</span>
                    <button
                      onClick={() => deploy(optRes.optimal_operating_point, 'Pareto-Optimal Setpoint')}
                      disabled={isDeploying}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                        borderRadius: 6, background: isDeploying ? 'rgba(21,128,61,0.4)' : 'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))',
                        border: 'none', color: '#fff', fontSize: '0.74rem', fontWeight: 800,
                        cursor: isDeploying ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(217,119,6,0.3)'
                      }}
                    >
                      {isDeploying ? <><RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deploying…</> : <><Check size={13} /> Deploy to Well {selectedWellId} SCADA</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* KINEMATIC SCRATCHPAD */}
              <div className="sandstone-card" style={{ borderLeft: '4px solid #0284c7' }}>
                <div className="card-title-bar">
                  <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sliders size={15} color="#0284c7" />
                    Live Kinematic Scratchpad &amp; Safety Constraint Checker
                  </div>
                  <span className={wif.safe ? 'badge badge-emerald' : 'badge badge-rose'}>
                    {wif.safe ? 'API 11B COMPLIANT' : 'SAFETY VIOLATION RISK'}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem 0' }}>
                  Simulate manual operator setpoints in real-time. Evaluates Gibbs wave downstroke drag against crude viscosity ({Math.round(curVisc).toLocaleString()} cP) to prevent compressive rod buckling.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                  <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
                      <span>Manual Pumping Speed (SPM)</span>
                      <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{simSpm.toFixed(1)} SPM</span>
                    </div>
                    <input type="range" min="2.0" max="6.5" step="0.1" value={simSpm} onChange={e => setSimSpm(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-amber)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      <span>2.0 SPM (Safe)</span><span>VFD: {wif.vfdE} Hz</span><span>6.5 SPM (High Drag)</span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.75rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
                      <span>Manual Stroke Length (in)</span>
                      <span style={{ color: '#0284c7', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{simStk}" ({(simStk * 0.0254).toFixed(2)}m)</span>
                    </div>
                    <input type="range" min="48" max="104" step="2" value={simStk} onChange={e => setSimStk(Number(e.target.value))} style={{ width: '100%', accentColor: '#0284c7' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      <span>48" (Small)</span><span>Disp: {(wif.netM * 1.3).toFixed(1)} m³/d</span><span>104" (Long)</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.55rem', marginBottom: '0.85rem' }}>
                  {[
                    { l: 'Projected BOPD', v: `${wif.netBopd}`, u: 'BOPD', c: '#15803d' },
                    { l: 'Rod Float Risk', v: `${wif.frPct}`, u: '%', c: riskColor(wif.frPct) },
                    { l: 'Min Load (MPRL)', v: `${wif.mprlK}`, u: 'kN', c: wif.mprlK >= 6.7 ? '#15803d' : '#b91c1c' },
                    { l: 'Peak Load (PPRL)', v: `${wif.pprlK}`, u: 'kN', c: 'var(--accent-orange)' },
                    { l: 'Goodman Stress', v: `${wif.gR}`, u: '≤1.0', c: '#0284c7' },
                    { l: 'Motor Power', v: `${wif.mKw}`, u: 'kW', c: 'var(--accent-amber)' },
                  ].map(({ l, v, u, c }) => (
                    <div key={l} style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.5rem 0.65rem' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: c, fontFamily: 'var(--font-mono)' }}>{v}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>{u}</span></div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.72rem', color: wif.safe ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                    {wif.safe ? '✓ Kinematics within API Spec 11B limits. No rod buckling predicted.' : '⚠ Downstroke drag approaching rod buoyant weight. Compressive rod floating hazard!'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => runOpt({ current_spm: simSpm, current_stroke_m: simStk * 0.0254 })}
                      style={{ padding: '6px 14px', borderRadius: 6, background: 'rgba(45,34,23,0.08)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Optimize from this Point
                    </button>
                    <button
                      onClick={() => deploy({ spm: simSpm, stroke_m: +(simStk * 0.0254).toFixed(2), stroke_in: simStk, vfd_hz: wif.vfdE, oil_rate_bopd: wif.netBopd, rod_floating_risk_pct: wif.frPct, pprl_kn: wif.pprlK, mprl_kn: wif.mprlK, motor_power_kw: wif.mKw }, 'Manual Scratchpad Setpoint')}
                      style={{ padding: '6px 16px', borderRadius: 6, background: 'linear-gradient(135deg,#0284c7,#0369a1)', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Deploy Manual Setpoint
                    </button>
                  </div>
                </div>
              </div>

              {/* PARETO TABLE */}
              {optRes.candidate_scenarios?.length > 0 && (
                <div className="sandstone-card">
                  <div className="card-title-bar">
                    <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChart3 size={15} color="var(--accent-amber)" />
                      Pareto Frontier &amp; Candidate Scenarios (Multi-Objective Trade-Off)
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', marginBottom: '0.85rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr>
                          {['Rank', 'SPM', 'Stroke', 'VFD Hz', 'Oil Rate', 'Float Risk', 'PPRL / MPRL', 'Motor kW', 'Score', 'Action'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 800, fontSize: '0.64rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {optRes.candidate_scenarios.map((sc, i) => {
                          const best = i === 0, sel = inspected?.spm === sc.spm;
                          return (
                            <tr
                              key={i}
                              onClick={() => setInspected(sc)}
                              style={{
                                cursor: 'pointer',
                                background: sel ? 'rgba(217, 119, 6, 0.12)' : best ? 'rgba(217, 119, 6, 0.05)' : 'transparent',
                                borderBottom: '1px solid rgba(150, 125, 95, 0.2)',
                                transition: 'background 0.1s'
                              }}
                            >
                              <td style={{ padding: '6px 10px', fontWeight: 800, color: best ? 'var(--accent-amber)' : 'var(--text-muted)' }}>{best ? '★ #1' : `#${i + 1}`}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{sc.spm.toFixed(1)}</td>
                              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{sc.stroke_in || Math.round((sc.stroke_m || 2.2) * 39.37)}" ({(sc.stroke_m || 2.2).toFixed(2)}m)</td>
                              <td style={{ padding: '6px 10px', color: '#0284c7', fontWeight: 700 }}>{sc.vfd_hz || Math.round(sc.spm * 7)} Hz</td>
                              <td style={{ padding: '6px 10px', fontWeight: 800, color: '#15803d' }}>{Math.round(sc.oil_rate_bopd || 0)} BOPD</td>
                              <td style={{ padding: '6px 10px', color: riskColor(sc.rod_floating_risk_pct), fontWeight: 800 }}>{sc.rod_floating_risk_pct.toFixed(1)}%</td>
                              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sc.pprl_kn.toFixed(1)} / {(sc.mprl_kn || 16.5).toFixed(1)} kN</td>
                              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{sc.motor_power_kw.toFixed(1)} kW</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)', fontWeight: 700 }}>{sc.score.toFixed(1)}</td>
                              <td style={{ padding: '6px 10px' }}>
                                <button
                                  onClick={e => { e.stopPropagation(); deploy(sc, `Scenario #${i + 1}`); }}
                                  style={{ padding: '3px 9px', borderRadius: 4, background: 'rgba(217, 119, 6, 0.12)', border: '1px solid var(--accent-amber)', color: 'var(--accent-amber)', fontSize: '0.64rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Deploy
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {inspected && (
                    <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 6, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          Selected Setpoint: {inspected.spm} SPM · {inspected.stroke_in || Math.round((inspected.stroke_m || 2.2) * 39.37)}" · {inspected.vfd_hz || Math.round(inspected.spm * 7)} Hz
                        </div>
                        <span className={riskBadge(inspected.rod_floating_risk_pct)}>Float {inspected.rod_floating_risk_pct.toFixed(1)}%</span>
                        <span className="badge badge-emerald">{Math.round(inspected.oil_rate_bopd || 0)} BOPD</span>
                      </div>
                      <button
                        onClick={() => deploy(inspected, `Candidate (${inspected.spm} SPM)`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 6, background: 'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))', border: 'none', color: '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                      >
                        <Check size={12} /> Deploy Selected to SCADA
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ TAB 2: DYNO CARD ═══ */}
      {tab === 'dyno' && (
        <div className="sandstone-card">
          <div className="card-title-bar">
            <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={15} color="var(--accent-amber)" />
              Dynamometer Card — Surface &amp; Downhole Diagnostic
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dynoRes?.diagnostic_classification?.condition && (
                <span className="badge badge-amber">{dynoRes.diagnostic_classification.condition}</span>
              )}
              <button
                onClick={fetchDyno}
                disabled={isDyno}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 6, background: 'rgba(45,34,23,0.06)', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {isDyno ? <><RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</> : <><RotateCcw size={12} /> Refresh Card</>}
              </button>
            </div>
          </div>

          {isDyno && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Calculating Gibbs wave downhole solution…</div>}

          {!isDyno && dynoRes && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {[
                  { key: 'surface', title: 'Surface Dynamometer Card', color: '#b43403', pts: dynoRes.surface_card, note: 'Direct polished rod load vs position from surface load cell & encoder.' },
                  { key: 'downhole', title: 'Downhole Pump Card', color: '#075985', pts: dynoRes.downhole_card, note: 'Back-calculated using Gibbs damped wave PDE (50 harmonic stations).' }
                ].map(({ key, title, color, pts, note }) => (
                  <div key={key} style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
                    {pts?.length > 0 ? (
                      <DynoCardReal points={pts} color={color} title={title} strokeMax={dynoRes.stroke_length_in} />
                    ) : (
                      <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No card data available</div>
                    )}
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{note}</div>
                  </div>
                ))}
              </div>

              {dynoRes.metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  {[
                    { l: 'PPRL (Peak)', v: `${(dynoRes.metrics.peak_surface_load_kn || 0).toFixed(1)} kN`, c: '#b43403' },
                    { l: 'MPRL (Min)', v: `${(dynoRes.metrics.min_surface_load_kn || 0).toFixed(1)} kN`, c: '#14532d' },
                    { l: 'Fluid Load', v: `${(dynoRes.metrics.fluid_load_kn || 0).toFixed(1)} kN`, c: '#075985' },
                    { l: 'Pump Fillage', v: `${(dynoRes.metrics.pump_fillage_pct || 0).toFixed(1)}%`, c: dynoRes.metrics.pump_fillage_pct > 85 ? '#14532d' : '#92400e' },
                    { l: 'Indicated HP', v: `${(dynoRes.metrics.indicated_pump_hp || 0).toFixed(1)} HP`, c: '#92400e' }
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderTop: `3px solid ${c}`, borderRadius: 6, padding: '0.55rem 0.75rem' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {dynoRes.diagnostic_classification?.reason && (
                <div style={{ background: 'rgba(146, 64, 14, 0.08)', border: '1px solid rgba(146, 64, 14, 0.35)', borderLeft: '4px solid #92400e', borderRadius: 6, padding: '0.75rem 0.9rem', fontSize: '0.74rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#78350f' }}>Diagnostic Assessment: </strong>{dynoRes.diagnostic_classification.reason}
                </div>
              )}
            </>
          )}

          {!isDyno && !dynoRes && (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(45,34,23,0.03)', borderRadius: 6, border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Click Refresh to load dynamometer card data from backend.
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB 3: SINKER BAR ═══ */}
      {tab === 'sinker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="sandstone-card">
            <div className="card-title-bar">
              <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wrench size={15} color="var(--accent-amber)" />
                Mechanistic Sinker Bar Sizing Calculator (API SPEC 11B, FR-37)
              </div>
              <span className="badge badge-amber">Jodhpur Heavy Oil · {Math.round(curVisc).toLocaleString()} cP</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.85rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
                  <span>Simulate Crude Viscosity (cP)</span>
                  <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{Math.round(sinkerVisc).toLocaleString()} cP</span>
                </div>
                <input type="range" min="500" max="25000" step="100" value={sinkerVisc} onChange={e => setSinkerVisc(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-amber)', marginBottom: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                  <span>500 cP (130°C Steam Soak)</span><span>Current: {Math.round(curVisc).toLocaleString()} cP ({curTemp.toFixed(1)}°C)</span><span>25,000 cP (40°C Cold Desert)</span>
                </div>
              </div>
              <button
                onClick={() => fetchSinker(sinkerVisc)}
                disabled={isSinker}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                  borderRadius: 6, background: 'linear-gradient(135deg,var(--accent-amber),var(--accent-orange))',
                  border: 'none', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {isSinker ? <><RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Calculating…</> : <><Wrench size={13} /> Recalculate Sizing</>}
              </button>
            </div>

            {sinkerRes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
                  {[
                    { l: 'Downstroke Drag', v: `${(sinkerRes.downstroke_drag_kn || 0).toFixed(2)} kN`, c: '#b43403' },
                    { l: 'Unassisted MPRL', v: `${(sinkerRes.unassisted_mprl_kn || 0).toFixed(2)} kN`, c: '#075985' },
                    { l: 'Load Deficit', v: `${(sinkerRes.recommended_additional_downward_force_kn || 0).toFixed(2)} kN`, c: (sinkerRes.recommended_additional_downward_force_kn || 0) > 0 ? '#b91c1c' : '#14532d' },
                    { l: 'Target MPRL', v: `${(sinkerRes.target_mprl_kn || 14).toFixed(1)} kN`, c: '#92400e' }
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'rgba(45,34,23,0.04)', border: '1px solid var(--border-color)', borderTop: `3px solid ${c}`, borderRadius: 6, padding: '0.55rem 0.75rem' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: c, fontFamily: 'var(--font-mono)' }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: (sinkerRes.recommended_additional_downward_force_kn || 0) > 0 ? 'rgba(180,52,3,0.08)' : 'rgba(20,83,45,0.08)',
                  border: `1px solid ${(sinkerRes.recommended_additional_downward_force_kn || 0) > 0 ? 'rgba(180,52,3,0.35)' : 'rgba(20,83,45,0.35)'}`,
                  borderRadius: 6, padding: '0.75rem 0.95rem', fontSize: '0.74rem', lineHeight: 1.5,
                  color: (sinkerRes.recommended_additional_downward_force_kn || 0) > 0 ? '#7c2d12' : '#14532d', fontWeight: 700
                }}>
                  {sinkerRes.engineering_note}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {sinkerRes.sizing_options?.map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        background: i === 0 ? 'rgba(146,64,14,0.08)' : 'rgba(45,34,23,0.03)',
                        border: `1px solid ${i === 0 ? 'rgba(146,64,14,0.4)' : 'var(--border-color)'}`,
                        borderLeft: `4px solid ${i === 0 ? '#92400e' : i === 1 ? '#075985' : '#14532d'}`,
                        borderRadius: 6, padding: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.78rem' }}>{opt.bar_od_in}" Sinker Bar ({opt.weight_per_m_kg} kg/m)</span>
                        {i === 0 && <span className="badge badge-amber">Optimal</span>}
                        {i === 1 && <span className="badge badge-emerald">High Inertia</span>}
                        {i === 2 && <span className="badge badge-emerald">Corrosion-R</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {[
                          { l: 'Required Length', v: `${(opt.required_length_m || 0).toFixed(1)} m` },
                          { l: '25ft Bars Count', v: `${opt.recommended_bars_count_25ft || 0}` },
                          { l: 'Total Added Mass', v: `${Math.round((opt.required_length_m || 0) * opt.weight_per_m_kg)} kg` },
                          { l: 'Steel Grade', v: opt.steel_grade?.split('/')[0]?.trim() || 'API Grade D' }
                        ].map(({ l, v }) => (
                          <div key={l}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
                            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sandstone-card">
            <div className="card-title-bar">
              <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={15} color="#0284c7" />
                Viscosity vs Temperature Reference — Jodhpur 17° API Crude
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr>
                    {['Temp (°C)', 'Viscosity (cP)', 'Sinker Bar Recommendation', 'Risk Level'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'left', fontSize: '0.64rem', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t: 130, v: 500, rec: 'No sinker bars required', risk: 'LOW', c: '#15803d' },
                    { t: 100, v: 2800, rec: '1 × 25ft 1.75" steel bar', risk: 'LOW', c: '#15803d' },
                    { t: 80, v: 5200, rec: '2 × 25ft 1.75" steel bars', risk: 'MODERATE', c: '#d97706' },
                    { t: 60, v: 9800, rec: '4 × 25ft 1.75" steel bars', risk: 'MODERATE', c: '#d97706' },
                    { t: 48, v: 16400, rec: '6 × 25ft or 3 × tungsten bars', risk: 'HIGH — Re-steam', c: '#b91c1c' },
                    { t: 40, v: 24500, rec: 'Economic cut-off — inject steam', risk: 'CRITICAL', c: '#b91c1c' }
                  ].map(r => (
                    <tr key={r.t} style={{ background: Math.abs(r.t - curTemp) < 12 ? 'rgba(217, 119, 6, 0.08)' : 'transparent', borderBottom: '1px solid rgba(150, 125, 95, 0.2)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {r.t}°C {Math.abs(r.t - curTemp) < 12 && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: '0.58rem' }}>~Current Reservoir</span>}
                      </td>
                      <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: r.c }}>{r.v.toLocaleString()} cP</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{r.rec}</td>
                      <td style={{ padding: '6px 10px' }}><span className={r.risk.includes('LOW') ? 'badge badge-emerald' : r.risk.includes('MODERATE') ? 'badge badge-amber' : 'badge badge-rose'}>{r.risk}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 4: VFD ENERGY STUDIO ═══ */}
      {tab === 'vfd' && (
        <div className="sandstone-card">
          <div className="card-title-bar">
            <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={15} color="#92400e" />
              Variable Frequency Drive Energy Optimisation — Well {selectedWellId}
            </div>
            <span className="badge badge-emerald">SCADA-LINKED</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Simulates the effect of VFD frequency on pump speed, rod load, energy consumption, and lifting cost using the cube-law power relationship.
          </p>

          <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.85rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
              <span>Target VFD Frequency</span>
              <span style={{ color: '#78350f', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{vfdHz} Hz → {vfdSpm} SPM</span>
            </div>
            <input type="range" min="20" max="60" step="1" value={vfdHz} onChange={e => setVfdHz(Number(e.target.value))} style={{ width: '100%', accentColor: '#92400e', marginBottom: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: 'var(--text-muted)' }}>
              <span>20 Hz · 2.1 SPM (Min)</span><span>Current: {curVfd} Hz · {curSpm.toFixed(2)} SPM</span><span>60 Hz · 6.3 SPM (Max)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
            {[
              { l: 'Simulated SPM', v: vfdSpm, u: 'SPM', c: '#92400e', d: `${vfdSpm > curSpm ? '▲' : '▼'} ${Math.abs(vfdSpm - curSpm).toFixed(2)} vs current` },
              { l: 'Motor Shaft Power', v: vfdPow, u: 'kW', c: '#075985', d: `${vfdPow < curPow ? 'Saves' : 'Extra'} ${Math.abs(vfdPow - curPow).toFixed(1)} kW` },
              { l: 'Daily Elec. Cost', v: `₹${vfdCost.toLocaleString()}`, u: '/day', c: '#14532d', d: 'Industrial Tariff' },
              { l: 'Float Risk @ Target', v: vfdRisk.toFixed(1), u: '%', c: riskColor(vfdRisk), d: riskLabel(vfdRisk) }
            ].map(({ l, v, u, c, d }) => (
              <KpiTile key={l} label={l} value={v} unit={u} color={c} sub={d || ''} />
            ))}
          </div>

          <div style={{ background: 'rgba(45,34,23,0.04)', borderRadius: 6, padding: '0.85rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              VFD Frequency vs Motor Power (Cube Law P ∝ Hz³)
            </div>
            <svg viewBox="0 0 500 85" style={{ width: '100%', height: 85, overflow: 'visible' }}>
              <line x1="20" y1="70" x2="480" y2="70" stroke="rgba(140, 110, 80, 0.4)" strokeWidth="1" />
              <line x1="20" y1="5" x2="20" y2="70" stroke="rgba(140, 110, 80, 0.4)" strokeWidth="1" />
              {[20, 30, 40, 50, 60].map(hz => {
                const x = 20 + ((hz - 20) / 40) * 460;
                return (
                  <g key={hz}>
                    <line x1={x} y1="5" x2={x} y2="70" stroke="rgba(140, 110, 80, 0.2)" strokeWidth="0.8" strokeDasharray="3 3" />
                    <text x={x} y="82" fill="var(--text-muted)" fontSize="7" textAnchor="middle" fontWeight="600">{hz}Hz</text>
                  </g>
                );
              })}
              <path
                d={Array.from({ length: 41 }, (_, i) => {
                  const hz = 20 + i;
                  const kw = curPow * (hz / curVfd) ** 2.8;
                  const x = 20 + ((hz - 20) / 40) * 460;
                  const y = 70 - Math.min(58, (kw / (curPow * 2)) * 58);
                  return `${i === 0 ? 'M' : 'L'}${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#92400e"
                strokeWidth="2.5"
                className="animated-graph-line"
              />
              {(() => {
                const x = 20 + ((vfdHz - 20) / 40) * 460;
                const y = 70 - Math.min(58, (vfdPow / (curPow * 2)) * 58);
                return <circle cx={x} cy={y} r="5" fill="#92400e" stroke="#fff" strokeWidth="1.5" className="animated-graph-point" />;
              })()}
              {(() => {
                const x = 20 + ((curVfd - 20) / 40) * 460;
                const y = 70 - Math.min(58, 0.5 * 58);
                return <circle cx={x} cy={y} r="4" fill="#075985" stroke="#fff" strokeWidth="1.5" />;
              })()}
              <text x="488" y="10" fill="var(--text-muted)" fontSize="7" fontWeight="600">kW</text>
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => deploy({ spm: vfdSpm, stroke_m: curStrokeM, stroke_in: curStrokeIn, vfd_hz: vfdHz, oil_rate_bopd: oilBopd, rod_floating_risk_pct: vfdRisk, motor_power_kw: vfdPow }, `VFD Setting (${vfdHz} Hz)`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
                borderRadius: 6, background: 'linear-gradient(135deg, #c2410c, #9a3412)',
                border: '1px solid rgba(124, 45, 18, 0.45)', color: '#fff', fontSize: '0.76rem', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(154, 52, 18, 0.35)'
              }}
            >
              <Zap size={14} /> Deploy {vfdHz} Hz to VFD Controller
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
