import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Zap, TrendingUp, Flame, Droplets, BarChart2 } from 'lucide-react';
import { api } from '../../services/api';

/**
 * STEAM & ENERGY TECHNO-ECONOMICS — WELL B-17
 * Exact replica of the reference design.
 * Palette: desert amber / burnt-orange / sandstone — no pink/green/blue/purple.
 */

/* ── Inline Horizontal Bar SVG ──────────────────────────────────────────────── */
function HBarChart({ items }) {
  const maxVal = Math.max(...items.map(d => d.value));
  const W = 320, ROW = 26, PAD_L = 130, PAD_R = 60, BAR_H = 14;
  const H = items.length * ROW + 20;
  const colors = ['#92400e', '#b45309', '#78350f', '#a16207', '#78614d'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '160px' }}>
      {items.map((d, i) => {
        const barW = ((d.value / maxVal) * (W - PAD_L - PAD_R));
        const y = i * ROW + 10;
        return (
          <g key={d.label}>
            <text x={PAD_L - 6} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="9" fill="#57422f" fontFamily="monospace">{d.label}</text>
            <rect x={PAD_L} y={y} width={barW} height={BAR_H} rx="3" fill={colors[i % colors.length]} opacity="0.85" />
            <text x={PAD_L + barW + 5} y={y + BAR_H / 2 + 4} fontSize="9" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">₹{d.value} ({d.pct}%)</text>
          </g>
        );
      })}
      {[0, 100, 200, 300, maxVal].map(v => (
        <text key={v} x={PAD_L + (v / maxVal) * (W - PAD_L - PAD_R)} y={H} textAnchor="middle" fontSize="8" fill="#a18465" fontFamily="monospace">{v}</text>
      ))}
    </svg>
  );
}

/* ── Daily Net Margin Line Chart ─────────────────────────────────────────────── */
function MarginTrendChart({ margin = 15779 }) {
  const days = 26;
  const pts = useMemo(() => {
    return Array.from({ length: days }, (_, i) => ({
      d: i + 1,
      margin: margin * (0.82 + Math.sin(i * 0.45) * 0.14 + Math.cos(i * 0.22) * 0.06),
      isCss: [5, 11, 18, 24].includes(i + 1),
    }));
  }, [margin]);

  const W = 340, H = 160, PAD = { t: 10, r: 10, b: 28, l: 48 };
  const maxM = margin * 1.25;
  const threshold = margin * 0.55;
  const sx = (d) => PAD.l + ((d - 1) / (days - 1)) * (W - PAD.l - PAD.r);
  const sy = (m) => (H - PAD.b) - ((m / maxM) * (H - PAD.t - PAD.b));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.d).toFixed(1)},${sy(p.margin).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${sx(days)},${sy(0)} L${sx(1)},${sy(0)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '155px' }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={PAD.l} y1={sy(t * maxM)} x2={W - PAD.r} y2={sy(t * maxM)} stroke="rgba(160,130,100,0.18)" strokeWidth="1" />
      ))}
      {/* Threshold line */}
      <line x1={PAD.l} y1={sy(threshold)} x2={W - PAD.r} y2={sy(threshold)} stroke="#d97706" strokeWidth="1.2" strokeDasharray="5,4" opacity="0.7" />
      {/* Area fill */}
      <path d={areaPath} fill="rgba(146,64,14,0.12)" />
      {/* Main line */}
      <path d={linePath} fill="none" stroke="#92400e" strokeWidth="2" />
      {/* CSS cycle markers */}
      {pts.filter(p => p.isCss).map(p => (
        <rect key={p.d} x={sx(p.d) - 1} y={PAD.t} width="2" height={H - PAD.t - PAD.b} fill="#d97706" opacity="0.4" />
      ))}
      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5" />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(100,70,40,0.5)" strokeWidth="1.5" />
      {/* Y ticks */}
      {[0, 10000, 20000, 30000, 40000].map(v => (
        <text key={v} x={PAD.l - 4} y={sy(v) + 3} textAnchor="end" fontSize="8" fill="#a18465" fontFamily="monospace">{v === 0 ? '0' : `${v / 1000}k`}</text>
      ))}
      {/* X ticks */}
      {[1, 6, 11, 16, 21, 26].map(d => (
        <text key={d} x={sx(d)} y={H - 4} textAnchor="middle" fontSize="8" fill="#a18465" fontFamily="monospace">{d} Sep</text>
      ))}
      {/* Y label */}
      <text x={10} y={H / 2} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace" transform={`rotate(-90, 10, ${H / 2})`}>Margin ($)</text>
    </svg>
  );
}

/* ── Cost Sensitivity Butterfly Chart ───────────────────────────────────────── */
function SensitivityChart() {
  const items = [
    { label: 'Crude Price (±20%)', val: 42 },
    { label: 'Natural Gas Price (±20%)', val: 28 },
    { label: 'Steam Requirement (±20%)', val: 18 },
    { label: 'Electricity Tariff (±20%)', val: 15 },
    { label: 'Production Rate (±20%)', val: 12 },
  ];
  const W = 340, ROW = 28, PAD_L = 150, CENTER = 170, BAR_H = 13, H = items.length * ROW + 30;
  const maxVal = 50;
  const colors = ['#92400e', '#b45309', '#78350f', '#a16207', '#78614d'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '170px' }}>
      <line x1={CENTER} y1={8} x2={CENTER} y2={H - 18} stroke="rgba(100,70,40,0.35)" strokeWidth="1" />
      {[-40, -20, 0, 20, 40].map(v => {
        const x = CENTER + (v / maxVal) * (W - PAD_L - 20);
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={H - 18} stroke="rgba(160,130,100,0.18)" strokeWidth="1" />
            <text x={x} y={H - 4} textAnchor="middle" fontSize="8" fill="#a18465" fontFamily="monospace">{v > 0 ? `+${v}` : v}</text>
          </g>
        );
      })}
      {items.map((item, i) => {
        const bw = (item.val / maxVal) * (W - PAD_L - 20);
        const y = i * ROW + 10;
        return (
          <g key={item.label}>
            <text x={PAD_L - 6} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="8.5" fill="#57422f" fontFamily="monospace">{item.label}</text>
            {/* Positive bar */}
            <rect x={CENTER} y={y} width={bw} height={BAR_H} rx="2" fill={colors[i]} opacity="0.85" />
            {/* Negative bar */}
            <rect x={CENTER - bw} y={y} width={bw} height={BAR_H} rx="2" fill={colors[i]} opacity="0.45" />
            <text x={CENTER + bw + 4} y={y + BAR_H / 2 + 4} fontSize="8" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">±{item.val}%</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace">Impact on Net Margin (%)</text>
    </svg>
  );
}

/* ── Energy Balance Sankey-style ─────────────────────────────────────────────── */
function EnergyBalanceChart() {
  const W = 260, H = 170;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '165px' }}>
      {/* Source block: Natural Gas */}
      <rect x={8} y={40} width={54} height={90} rx="5" fill="rgba(146,64,14,0.25)" stroke="rgba(146,64,14,0.6)" strokeWidth="1.5" />
      <text x={35} y={78} textAnchor="middle" fontSize="8.5" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">Natural</text>
      <text x={35} y={89} textAnchor="middle" fontSize="8.5" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">Gas</text>
      <text x={35} y={100} textAnchor="middle" fontSize="8" fill="#92400e" fontFamily="monospace">6,800 GJ</text>
      <text x={35} y={110} textAnchor="middle" fontSize="8" fill="#78614d" fontFamily="monospace">(100%)</text>

      {/* Flow paths */}
      {/* To Steam: 72% of 90 = 64.8px tall */}
      <path d="M62,50 C100,50 120,38 155,38 L155,102 C120,102 100,115 62,115 Z" fill="rgba(146,64,14,0.22)" />
      {/* To Boiler losses: 18% */}
      <path d="M62,115 C100,115 120,118 155,115 L155,131 C120,131 100,127 62,128 Z" fill="rgba(180,100,30,0.18)" />
      {/* To Other losses: 10% */}
      <path d="M62,128 C100,128 120,130 155,131 L155,140 C120,140 100,137 62,137 Z" fill="rgba(120,97,77,0.18)" />

      {/* Output blocks */}
      {/* Steam to Reservoir */}
      <rect x={157} y={28} width={95} height={46} rx="4" fill="rgba(146,64,14,0.20)" stroke="rgba(146,64,14,0.5)" strokeWidth="1.2" />
      <text x={205} y={46} textAnchor="middle" fontSize="8" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">Steam to Reservoir</text>
      <text x={205} y={57} textAnchor="middle" fontSize="8" fill="#92400e" fontFamily="monospace">4,900 GJ (72%)</text>
      <text x={205} y={67} textAnchor="middle" fontSize="7.5" fill="#78614d" fontFamily="monospace">CSS thermal cycle</text>

      {/* Boiler & System Losses */}
      <rect x={157} y={108} width={95} height={36} rx="4" fill="rgba(180,100,30,0.16)" stroke="rgba(180,100,30,0.45)" strokeWidth="1.2" />
      <text x={205} y={122} textAnchor="middle" fontSize="8" fill="#3d2b1a" fontFamily="monospace" fontWeight="700">Boiler &amp; System</text>
      <text x={205} y={132} textAnchor="middle" fontSize="8" fill="#b45309" fontFamily="monospace">1,200 GJ (18%)</text>

      {/* Other Losses */}
      <rect x={157} y={148} width={95} height={18} rx="4" fill="rgba(120,97,77,0.16)" stroke="rgba(120,97,77,0.4)" strokeWidth="1.2" />
      <text x={205} y={160} textAnchor="middle" fontSize="8" fill="#3d2b1a" fontFamily="monospace">Other Losses 700 GJ (10%)</text>
    </svg>
  );
}

/* ── Steam-to-Oil Flow Diagram ───────────────────────────────────────────────── */
function SteamOilFlow({ sor = 3.2, oilIncrement = 214.6, revenue = 16095 }) {
  const BOX = { w: 80, h: 36, rx: 5 };
  const ARROW = 18;
  const nodes = [
    { x: 0,   label: 'Natural Gas', sub: '0.04 MMSCFD', color: '#92400e' },
    { x: 98,  label: 'Boiler', sub: 'η 88%', color: '#b45309' },
    { x: 196, label: 'Steam', sub: '666.7 t/cycle', color: '#78350f' },
  ];
  const row2 = [
    { x: 0,   label: 'SOR', sub: `${sor} t/bbl`, color: '#a16207' },
    { x: 98,  label: 'Oil Increment', sub: `${oilIncrement.toFixed(1)} bbl/cycle`, color: '#92400e' },
    { x: 196, label: 'Revenue', sub: `$${revenue.toLocaleString()} (@$75/bbl)`, color: '#78350f' },
  ];
  const W = 296, H = 120;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: '120px' }}>
      {/* Row 1 */}
      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x} y={4} width={BOX.w} height={BOX.h} rx={BOX.rx} fill={`rgba(${n.color === '#92400e' ? '146,64,14' : n.color === '#b45309' ? '180,83,9' : '120,53,15'},0.18)`} stroke={n.color} strokeWidth="1.3" />
          <text x={n.x + BOX.w / 2} y={18} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1c1917" fontFamily="monospace">{n.label}</text>
          <text x={n.x + BOX.w / 2} y={30} textAnchor="middle" fontSize="8" fill={n.color} fontFamily="monospace">{n.sub}</text>
          {i < nodes.length - 1 && (
            <text x={n.x + BOX.w + ARROW / 2} y={24} textAnchor="middle" fontSize="14" fill="#92400e">→</text>
          )}
        </g>
      ))}
      {/* Row 2 */}
      {row2.map((n, i) => (
        <g key={n.label + '2'}>
          <rect x={n.x} y={70} width={BOX.w} height={BOX.h + 10} rx={BOX.rx} fill="rgba(146,64,14,0.12)" stroke={n.color} strokeWidth="1.2" />
          <text x={n.x + BOX.w / 2} y={83} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1c1917" fontFamily="monospace">{n.label}</text>
          <text x={n.x + BOX.w / 2} y={94} textAnchor="middle" fontSize="7.5" fill={n.color} fontFamily="monospace">{n.sub.split(' ')[0]}</text>
          {n.sub.split(' ').length > 1 && (
            <text x={n.x + BOX.w / 2} y={104} textAnchor="middle" fontSize="7" fill={n.color} fontFamily="monospace">{n.sub.split(' ').slice(1).join(' ')}</text>
          )}
          {i < row2.length - 1 && (
            <text x={n.x + BOX.w + ARROW / 2} y={90} textAnchor="middle" fontSize="14" fill="#92400e">→</text>
          )}
        </g>
      ))}
      {/* Connector from row1 to row2 */}
      <line x1={148} y1={40} x2={148} y2={70} stroke="#92400e" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.5" />
    </svg>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function SteamEnergyEconomics({ selectedWellId = 'B-17', onBackToDashboard, twinState: parentTwinState }) {
  const [loading, setLoading] = useState(true);
  const [econ, setEcon] = useState(null);
  const [twin, setTwin] = useState(parentTwinState || null);

  useEffect(() => { fetchData(); }, [selectedWellId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [econRes, twinRes] = await Promise.allSettled([
        api.getEconomics(selectedWellId),
        api.getDigitalTwinState(selectedWellId),
      ]);
      if (econRes.status === 'fulfilled' && econRes.value) setEcon(econRes.value);
      if (twinRes.status === 'fulfilled' && twinRes.value) setTwin(twinRes.value);
    } catch (e) {
      console.warn('Using fallback economics data', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const liftUSD  = econ?.cost_breakdown_per_bbl_usd?.total_lifting_cost ?? 7.28;
  const liftINR  = econ?.cost_breakdown_per_bbl_inr?.total_lifting_cost ?? 615;
  const dailyNet = econ?.daily_financials?.profit_usd ?? 15779;
  const cycleProfit = econ?.cycle_financials?.net_profit_inr ?? 105863290;
  const powerKw  = twin?.srp?.power_kw ?? 7.1;
  // SOR from energy_kpi (real field) or reservoir
  const sor      = econ?.energy_kpi?.sor ?? twin?.reservoir?.sor ?? 3.2;
  const oilInc   = econ?.cycle_financials?.produced_bbl ?? 18500;
  const revenue  = econ?.cycle_financials?.total_revenue_usd ?? 1387500;
  // Real INR cost breakdown from backend
  const inrBreak = econ?.cost_breakdown_per_bbl_inr ?? {};
  const barItems = [
    { label: 'Steam Thermal Injection', value: Math.round(inrBreak.steam_thermal_injection ?? 179), pct: Math.round((inrBreak.steam_thermal_injection ?? 179) / (inrBreak.total_lifting_cost ?? 615) * 100) },
    { label: 'Fixed Lifting OPEX',      value: Math.round(inrBreak.fixed_lifting_opex ?? 270),      pct: Math.round((inrBreak.fixed_lifting_opex ?? 270) / (inrBreak.total_lifting_cost ?? 615) * 100) },
    { label: 'Rod/Pump Maintenance',    value: Math.round(inrBreak.rod_pump_maintenance ?? 156),    pct: Math.round((inrBreak.rod_pump_maintenance ?? 156) / (inrBreak.total_lifting_cost ?? 615) * 100) },
    { label: 'Power / Electricity',     value: Math.round(inrBreak.power_electricity ?? 9),         pct: Math.round((inrBreak.power_electricity ?? 9) / (inrBreak.total_lifting_cost ?? 615) * 100) },
  ];

  // Map real CSS cycle data from backend (/api/wells/{id}/css)
  // Backend fields: cycle_number, injection_volume_tonnes, cumulative_oil_m3, sor, energy_consumed_gj
  // We compute INR costs: steam cost = injection_volume_tonnes * ₹1450/tonne = Lakhs
  //                        revenue   = cumulative_oil_m3 * 6.289 bbl/m3 * ₹6300/bbl
  const STEAM_COST_INR_PER_TON = 1450; // ₹/tonne
  const OIL_PRICE_INR_PER_BBL = 6300;  // ₹75/bbl * 84 ₹/$
  const cssRaw = econ?.css_cycles ?? [];
  const cycleRows = cssRaw.length > 0
    ? cssRaw.map((c) => {
        const steamCost = (c.injection_volume_tonnes * STEAM_COST_INR_PER_TON / 100000).toFixed(1);
        const oilBbl = c.cumulative_oil_m3 * 6.289;
        const rev = (oilBbl * OIL_PRICE_INR_PER_BBL / 100000).toFixed(1);
        const net = (parseFloat(rev) - parseFloat(steamCost)).toFixed(1);
        const margin = Math.round((parseFloat(net) / parseFloat(rev)) * 100);
        return { cycle: c.cycle_number, steam: steamCost, revenue: rev, net, margin };
      })
    : [
        { cycle: 1, steam: 18.2, revenue: 28.6, net: 10.4, margin: 36 },
        { cycle: 2, steam: 25.9, revenue: 34.3, net: 8.4,  margin: 32 },
        { cycle: 3, steam: 18.0, revenue: 27.1, net: 9.1,  margin: 34 },
        { cycle: 4, steam: 17.8, revenue: 26.3, net: 8.5,  margin: 32 },
        { cycle: 5, steam: 18.4, revenue: 29.0, net: 10.6, margin: 37 },
        { cycle: 6, steam: 17.9, revenue: 27.5, net: 9.6,  margin: 35 },
        { cycle: 7, steam: 18.1, revenue: 28.2, net: 10.1, margin: 36 },
      ];

  const CARD = {
    background: 'rgba(235,222,204,0.28)',
    border: '1px solid rgba(180,155,125,0.5)',
    borderRadius: '8px',
    padding: '0.9rem 1rem',
  };

  const SECTION_TITLE = {
    fontFamily: 'var(--font-serif)',
    fontSize: '0.8rem',
    fontWeight: 900,
    color: '#1c1917',
    letterSpacing: '0.05em',
    marginBottom: '0.6rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div onClick={onBackToDashboard} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#78350f', cursor: 'pointer', marginBottom: '4px' }}>
            <ArrowLeft size={14} />
            Well {selectedWellId} &gt; Steam &amp; Energy Techno-Economics
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 900, color: '#1c1917', letterSpacing: '0.03em', margin: '2px 0' }}>
            STEAM &amp; ENERGY TECHNO-ECONOMICS — WELL {selectedWellId}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: '5px 14px', background: 'rgba(120,53,15,0.10)', border: '1px solid rgba(120,53,15,0.35)', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, color: '#78350f', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} color="#78350f" />
            Lifting Cost &amp; Net Margin Model
          </div>
          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span style={{ fontSize: '0.72rem' }}>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.7rem' }}>
        {[
          { icon: <Flame size={22} color="#78350f" />, title: 'LIFTING COST ($/BBL)', value: `$${Number(liftUSD).toFixed(2)}`, sub: 'Benchmark ≤ $24.00' },
          { icon: <Flame size={22} color="#78350f" />, title: 'LIFTING COST (₹/BBL)', value: `₹${Math.round(liftINR).toLocaleString()}`, sub: 'INR Currency parity' },
          { icon: <Droplets size={22} color="#78350f" />, title: 'DAILY NET MARGIN ($)', value: `$${Math.round(dailyNet).toLocaleString()}`, sub: 'Based on $75/bbl crude' },
          { icon: <BarChart2 size={22} color="#78350f" />, title: 'CYCLE NET PROFIT (₹)', value: `₹${(cycleProfit / 100000).toFixed(1)} Lakhs`, sub: 'Per CSS Cycle' },
        ].map((kpi) => (
          <div key={kpi.title} style={{ ...CARD, display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem 1rem' }}>
            <div style={{ marginTop: '2px', flexShrink: 0 }}>{kpi.icon}</div>
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#78614d', letterSpacing: '0.06em', marginBottom: '2px' }}>{kpi.title}</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#c2410c', fontFamily: 'var(--font-serif)', lineHeight: 1.1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#57422f', marginTop: '2px' }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── ENERGY CONSUMPTION TABLE ── */}
      <div style={CARD}>
        <div style={SECTION_TITLE}>
          <Zap size={15} color="#78350f" />
          ENERGY CONSUMPTION &amp; BOILER FUEL BALANCE — WELL {selectedWellId}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="sandstone-table" style={{ width: '100%', fontSize: '0.78rem' }}>
            <thead>
              <tr>
                <th>Component</th>
                <th>Consumption Rate</th>
                <th>Specific Cost</th>
                <th>Efficiency vs Baseline</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>⛽ Steam Generation (Natural Gas)</td>
                <td>0.04 MMSCFD</td>
                <td>₹14.2 / kg steam</td>
                <td style={{ color: '#b45309', fontWeight: 700 }}>+14.8% fuel savings</td>
                <td style={{ color: '#78614d' }}>CSS thermal cycle</td>
              </tr>
              <tr>
                <td>⚡ SRP Surface Motor Electrical Duty</td>
                <td>{powerKw.toFixed(1)} kW continuous</td>
                <td>₹7.80 / kWh</td>
                <td style={{ color: '#d97706', fontWeight: 700 }}>Daily: ₹{Math.round(powerKw * 24 * 7.8).toLocaleString()}</td>
                <td style={{ color: '#78614d' }}>Continuous operation</td>
              </tr>
              <tr>
                <td>💧 Boiler Feedwater Treatment</td>
                <td>50 m³/day</td>
                <td>₹45 / m³</td>
                <td style={{ color: '#b45309', fontWeight: 700 }}>98% condensate recycle</td>
                <td style={{ color: '#78614d' }}>Treated &amp; recycled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3-COLUMN MID SECTION ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: '0.8rem' }}>

        {/* Lifting Cost Breakdown */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><BarChart2 size={14} color="#78350f" />LIFTING COST BREAKDOWN (₹/BBL)</div>
          <HBarChart items={barItems} />
          <div style={{ fontSize: '0.64rem', color: '#78614d', marginTop: '6px', textAlign: 'center' }}>Cost (₹/BBL)</div>
        </div>

        {/* Daily Net Margin Trend */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><TrendingUp size={14} color="#78350f" />DAILY NET MARGIN TREND</div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {[['#92400e', 'Daily Net Margin ($)', false], ['#d97706', 'Operating Cost Threshold', true], ['rgba(217,119,6,0.4)', 'CSS Cycle', false]].map(([c, lbl, dash]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.64rem', color: '#57422f', fontWeight: 600 }}>
                <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={c} strokeWidth="2" strokeDasharray={dash ? '4,3' : 'none'} /></svg>
                {lbl}
              </div>
            ))}
          </div>
          <MarginTrendChart margin={dailyNet} />
        </div>

        {/* Steam-to-Oil Economics */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><Droplets size={14} color="#78350f" />STEAM-TO-OIL ECONOMICS</div>
          <SteamOilFlow sor={sor} oilIncrement={oilInc} revenue={revenue} />
        </div>
      </div>

      {/* ── 3-COLUMN BOTTOM SECTION ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>

        {/* Cycle Economics Table */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><BarChart2 size={14} color="#78350f" />CYCLE ECONOMICS (WELL {selectedWellId})</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sandstone-table" style={{ width: '100%', fontSize: '0.7rem' }}>
              <thead>
                <tr>
                  <th>Cycle #</th>
                  <th>Steam Cost (₹)</th>
                  <th>Prod. Revenue (₹)</th>
                  <th style={{ color: '#92400e' }}>Net (₹)</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {cycleRows.map((row, i) => {
                  const c = row.cycle ?? i + 1;
                  const steam = row.steam_cost_lakhs ?? row.steam;
                  const rev   = row.revenue_lakhs ?? row.revenue;
                  const net   = row.net_contribution_lakhs ?? row.net;
                  const marg  = row.margin_pct ?? row.margin;
                  return (
                    <tr key={c}>
                      <td style={{ fontWeight: 700 }}>Cycle {c}</td>
                      <td>{steam} Lakhs</td>
                      <td>{rev} Lakhs</td>
                      <td style={{ color: '#c2410c', fontWeight: 800 }}>{net} Lakhs</td>
                      <td><span className="badge badge-amber">{marg}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Sensitivity Analysis */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><Zap size={14} color="#78350f" />COST SENSITIVITY ANALYSIS</div>
          <SensitivityChart />
        </div>

        {/* Energy Balance */}
        <div style={CARD}>
          <div style={SECTION_TITLE}><Flame size={14} color="#78350f" />ENERGY BALANCE (PER CYCLE)</div>
          <EnergyBalanceChart />
        </div>
      </div>

    </div>
  );
}
