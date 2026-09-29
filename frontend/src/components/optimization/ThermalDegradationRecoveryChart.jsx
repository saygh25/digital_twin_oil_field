import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * Multi-Cycle Thermal Degradation & Recovery Curve Chart
 * Styled in the authentic creamy desert sandstone theme of the Baghewala Digital Twin dashboard.
 * 
 * Features:
 * - Creamy sandstone card aesthetic matching the dashboard's design system
 * - Clean title bar with BarChart3 icon and dual-colored legend
 * - 3 continuous stage banners flush with chart grid:
 *     1. Steam Injection (Day 0 - 17.5) [Warm peach cream]
 *     2. Thermal Soak (Day 17.5 - 30) [Soft slate-blue cream]
 *     3. Production & Pumping (Day 30 - 48) [Amber peach cream]
 * - Dual Y-axes (Temperature 0-300 °C, Oil Rate 0-400 BOPD)
 * - Bottom X-axis (Time 0-48 Days)
 * - Smooth spline trajectories and circular data markers without any white artifacts
 */

// Precise digitized coordinates from reservoir lifecycle reference
const TEMP_DATA = [
  { day: 0, temp: 48 },
  { day: 1.8, temp: 78 },
  { day: 3.8, temp: 124 },
  { day: 6.2, temp: 156 },
  { day: 8.6, temp: 182 },
  { day: 11.2, temp: 218 },
  { day: 13.8, temp: 236 },
  { day: 15.8, temp: 244 },
  { day: 17.5, temp: 248 },
  { day: 20.0, temp: 246 },
  { day: 22.2, temp: 238 },
  { day: 24.5, temp: 218 },
  { day: 26.8, temp: 184 },
  { day: 28.8, temp: 152 },
  { day: 30.0, temp: 125 },
  { day: 33.0, temp: 112 },
  { day: 36.2, temp: 100 },
  { day: 39.5, temp: 90 },
  { day: 42.5, temp: 84 },
  { day: 45.2, temp: 80 },
  { day: 48.0, temp: 76 }
];

const OIL_DATA = [
  { day: 0, oil: 6 },
  { day: 2.2, oil: 10 },
  { day: 5.0, oil: 15 },
  { day: 8.0, oil: 18 },
  { day: 11.0, oil: 20 },
  { day: 14.0, oil: 22 },
  { day: 17.5, oil: 24 },
  { day: 21.0, oil: 27 },
  { day: 24.2, oil: 31 },
  { day: 27.2, oil: 36 },
  { day: 30.0, oil: 42 },
  { day: 33.2, oil: 52 },
  { day: 35.8, oil: 70 },
  { day: 38.0, oil: 94 },
  { day: 40.0, oil: 130 },
  { day: 41.8, oil: 176 },
  { day: 43.6, oil: 236 },
  { day: 45.4, oil: 288 },
  { day: 47.0, oil: 332 },
  { day: 48.0, oil: 324 }
];

export default function ThermalDegradationRecoveryChart() {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG coordinate dimensions
  const width = 960;
  const height = 245;

  const padLeft = 60;
  const padRight = 60;
  const bannerH = 26; // Height of the top stage banner
  const padTop = 38 + bannerH; // Top of the plot area (64px)
  const padBottom = 38;

  const plotW = width - padLeft - padRight; // 840px
  const plotH = height - padTop - padBottom; // 143px

  // Scale mappings:
  // X: 0 to 48 days
  const toX = day => padLeft + (day / 48) * plotW;
  // Left Y: 0 to 300 °C
  const toTempY = temp => padTop + (1 - temp / 300) * plotH;
  // Right Y: 0 to 400 BOPD
  const toOilY = oil => padTop + (1 - oil / 400) * plotH;

  // Phase transition days
  const dayPhase1 = 17.5; // End of Steam Injection
  const dayPhase2 = 30.0; // End of Thermal Soak

  const x0 = toX(0);
  const xPhase1 = toX(dayPhase1);
  const xPhase2 = toX(dayPhase2);
  const xEnd = toX(48);

  // Smooth Catmull-Rom spline builder
  const buildSplinePath = points => {
    if (!points || points.length === 0) return '';
    const d = [`M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d.push(`C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`);
    }
    return d.join(' ');
  };

  const tempCoords = TEMP_DATA.map(p => ({ x: toX(p.day), y: toTempY(p.temp), ...p }));
  const oilCoords = OIL_DATA.map(p => ({ x: toX(p.day), y: toOilY(p.oil), ...p }));

  const tempPath = buildSplinePath(tempCoords);
  const oilPath = buildSplinePath(oilCoords);

  return (
    <div
      className="sandstone-card"
      style={{
        background: 'linear-gradient(180deg, #f5efe6 0%, #ede5d8 100%) !important',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '0.85rem 1rem 0.65rem 1rem',
        userSelect: 'none',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(45, 34, 23, 0.08)'
      }}
    >
      {/* ── HEADER ROW (Dashboard Theme Title Bar) ── */}
      <div
        className="card-title-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.55rem'
        }}
      >
        {/* Left: Icon & Title */}
        <div
          className="card-heading-bold"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-primary)',
            fontSize: '0.86rem',
            fontWeight: 900,
            letterSpacing: '0.04em'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 5,
              background: 'rgba(180, 52, 3, 0.12)',
              border: '1px solid rgba(180, 52, 3, 0.35)'
            }}
          >
            <BarChart3 size={15} color="#b43403" />
          </div>
          <span>MULTI-CYCLE THERMAL DEGRADATION &amp; RECOVERY CURVE</span>
        </div>

        {/* Right: Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
          {/* Orange Dot: Sandface Temperature */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ea580c',
                border: '1.5px solid #9a3412',
                display: 'inline-block'
              }}
            />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: 'var(--text-primary)'
              }}
            >
              Sandface Temperature (°C)
            </span>
          </div>

          {/* Black Dot: Oil Rate */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#181109',
                border: '1.5px solid #000000',
                display: 'inline-block'
              }}
            />
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: 'var(--text-primary)'
              }}
            >
              Oil Rate (BOPD)
            </span>
          </div>
        </div>
      </div>

      {/* ── CHART SVG ── */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', minWidth: 720, height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Smooth creamy chart background fill */}
            <linearGradient id="creamy-chart-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8f4ec" />
              <stop offset="100%" stopColor="#ede5d8" />
            </linearGradient>

            {/* Stage Top Banner Creamy Fills */}
            <linearGradient id="banner-steam-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8cbb4" />
              <stop offset="100%" stopColor="#ebb197" />
            </linearGradient>

            <linearGradient id="banner-soak-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c5dbe9" />
              <stop offset="100%" stopColor="#acc8db" />
            </linearGradient>

            <linearGradient id="banner-pump-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8cbb4" />
              <stop offset="100%" stopColor="#eab095" />
            </linearGradient>

            {/* Creamy Plot Zone Shading */}
            <linearGradient id="zone-steam-shading" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.04" />
            </linearGradient>

            <linearGradient id="zone-soak-shading" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.03" />
            </linearGradient>

            <linearGradient id="zone-pump-shading" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#c2410c" stopOpacity="0.11" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* SVG Creamy Canvas Base */}
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            rx="6"
            fill="url(#creamy-chart-bg)"
            stroke="rgba(150, 125, 95, 0.35)"
            strokeWidth="0.8"
          />

          {/* ── PLOT ZONE BACKGROUND SHADINGS ── */}
          {/* Zone 1: Steam Injection */}
          <rect
            x={x0}
            y={padTop}
            width={xPhase1 - x0}
            height={plotH}
            fill="url(#zone-steam-shading)"
          />

          {/* Zone 2: Thermal Soak */}
          <rect
            x={xPhase1}
            y={padTop}
            width={xPhase2 - xPhase1}
            height={plotH}
            fill="url(#zone-soak-shading)"
          />

          {/* Zone 3: Production & Pumping */}
          <rect
            x={xPhase2}
            y={padTop}
            width={xEnd - xPhase2}
            height={plotH}
            fill="url(#zone-pump-shading)"
          />

          {/* ── CONTINUOUS TOP STAGE BANNERS ── */}
          {/* Banner 1: Steam Injection */}
          <rect
            x={x0}
            y={padTop - bannerH}
            width={xPhase1 - x0}
            height={bannerH}
            fill="url(#banner-steam-grad)"
            stroke="#b88f78"
            strokeWidth="0.8"
          />
          <text
            x={(x0 + xPhase1) / 2}
            y={padTop - 8}
            textAnchor="middle"
            fill="#2d170a"
            fontSize="12.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
            letterSpacing="0.015em"
          >
            Steam Injection
          </text>

          {/* Banner 2: Thermal Soak */}
          <rect
            x={xPhase1}
            y={padTop - bannerH}
            width={xPhase2 - xPhase1}
            height={bannerH}
            fill="url(#banner-soak-grad)"
            stroke="#81a5bb"
            strokeWidth="0.8"
          />
          <text
            x={(xPhase1 + xPhase2) / 2}
            y={padTop - 8}
            textAnchor="middle"
            fill="#0b2434"
            fontSize="12.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
            letterSpacing="0.015em"
          >
            Thermal Soak
          </text>

          {/* Banner 3: Production & Pumping */}
          <rect
            x={xPhase2}
            y={padTop - bannerH}
            width={xEnd - xPhase2}
            height={bannerH}
            fill="url(#banner-pump-grad)"
            stroke="#b88f78"
            strokeWidth="0.8"
          />
          <text
            x={(xPhase2 + xEnd) / 2}
            y={padTop - 8}
            textAnchor="middle"
            fill="#2d170a"
            fontSize="12.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
            letterSpacing="0.015em"
          >
            Production &amp; Pumping
          </text>

          {/* ── PHASE BOUNDARY VERTICAL DASHED LINES ── */}
          <line
            x1={xPhase1}
            y1={padTop}
            x2={xPhase1}
            y2={padTop + plotH}
            stroke="#5a4433"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <line
            x1={xPhase2}
            y1={padTop}
            x2={xPhase2}
            y2={padTop + plotH}
            stroke="#5a4433"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* ── HORIZONTAL SUBTLE GRIDLINES ── */}
          {[100, 200].map(t => {
            const y = toTempY(t);
            return (
              <line
                key={`hgrid-${t}`}
                x1={x0}
                y1={y}
                x2={xEnd}
                y2={y}
                stroke="#d3c7b6"
                strokeWidth="0.75"
                strokeDasharray="2 3"
                opacity="0.9"
              />
            );
          })}

          {/* ── VERTICAL SUBTLE GRIDLINES ── */}
          {[10, 20, 30, 40].map(d => {
            const x = toX(d);
            return (
              <line
                key={`vgrid-${d}`}
                x1={x}
                y1={padTop}
                x2={x}
                y2={padTop + plotH}
                stroke="#d3c7b6"
                strokeWidth="0.65"
                strokeDasharray="2 3"
                opacity="0.8"
              />
            );
          })}

          {/* ── AXIS LINES & TICKS ── */}
          {/* Left Y Axis (Temperature) */}
          <line
            x1={x0}
            y1={padTop}
            x2={x0}
            y2={padTop + plotH}
            stroke="#181109"
            strokeWidth="1.3"
          />
          {[0, 100, 200, 300].map(t => {
            const y = toTempY(t);
            return (
              <g key={`ytick-temp-${t}`}>
                <line x1={x0 - 5} y1={y} x2={x0} y2={y} stroke="#181109" strokeWidth="1.3" />
                <text
                  x={x0 - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#181109"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  {t}
                </text>
              </g>
            );
          })}
          {/* Left Y Axis Label */}
          <text
            x={-(padTop + plotH / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#181109"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
          >
            Temperature (°C)
          </text>

          {/* Right Y Axis (Oil Rate) */}
          <line
            x1={xEnd}
            y1={padTop}
            x2={xEnd}
            y2={padTop + plotH}
            stroke="#181109"
            strokeWidth="1.3"
          />
          {[0, 100, 200, 300, 400].map(o => {
            const y = toOilY(o);
            return (
              <g key={`ytick-oil-${o}`}>
                <line x1={xEnd} y1={y} x2={xEnd + 5} y2={y} stroke="#181109" strokeWidth="1.3" />
                <text
                  x={xEnd + 8}
                  y={y + 4}
                  textAnchor="start"
                  fill="#181109"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  {o}
                </text>
              </g>
            );
          })}
          {/* Right Y Axis Label */}
          <text
            x={padTop + plotH / 2}
            y={-(xEnd + 44)}
            transform="rotate(90)"
            textAnchor="middle"
            fill="#181109"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
          >
            Oil Rate (BOPD)
          </text>

          {/* Bottom X Axis Line */}
          <line
            x1={x0}
            y1={padTop + plotH}
            x2={xEnd}
            y2={padTop + plotH}
            stroke="#181109"
            strokeWidth="1.3"
          />
          {[0, 10, 20, 30, 40, 48].map(d => {
            const x = toX(d);
            return (
              <g key={`xtick-day-${d}`}>
                <line
                  x1={x}
                  y1={padTop + plotH}
                  x2={x}
                  y2={padTop + plotH + 5}
                  stroke="#181109"
                  strokeWidth="1.3"
                />
                <text
                  x={x}
                  y={padTop + plotH + 16}
                  textAnchor="middle"
                  fill="#181109"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  {d}
                </text>
              </g>
            );
          })}
          {/* Bottom X Axis Label */}
          <text
            x={x0 + plotW / 2}
            y={padTop + plotH + 32}
            textAnchor="middle"
            fill="#181109"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="var(--font-sans)"
          >
            Time (Days)
          </text>

          {/* ── PLOTTED CURVES ── */}
          {/* 1. Sandface Temperature Curve (Orange Line) */}
          <path
            d={tempPath}
            fill="none"
            stroke="#ea580c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 2. Oil Rate Curve (Obsidian Charcoal Line) */}
          <path
            d={oilPath}
            fill="none"
            stroke="#181109"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── DATA POINT MARKERS (Solid, No White Artifacts) ── */}
          {/* Temperature circular markers (solid orange) */}
          {tempCoords.map((pt, i) => (
            <circle
              key={`temp-dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="3.2"
              fill="#ea580c"
              stroke="#9a3412"
              strokeWidth="0.8"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPoint({ ...pt, type: 'temp' })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Oil Rate circular markers (solid dark) */}
          {oilCoords.map((pt, i) => (
            <circle
              key={`oil-dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="3.2"
              fill="#181109"
              stroke="#000000"
              strokeWidth="0.8"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPoint({ ...pt, type: 'oil' })}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* ── INTERACTIVE HOVER TOOLTIP ── */}
          {hoveredPoint && (
            <g>
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5.5"
                fill="none"
                stroke={hoveredPoint.type === 'temp' ? '#ea580c' : '#181109'}
                strokeWidth="2"
              />
              <rect
                x={hoveredPoint.x > width - 140 ? hoveredPoint.x - 120 : hoveredPoint.x + 8}
                y={hoveredPoint.y - 28}
                width="116"
                height="24"
                rx="4"
                fill="rgba(24, 17, 9, 0.94)"
                stroke="#d97706"
                strokeWidth="0.8"
              />
              <text
                x={hoveredPoint.x > width - 140 ? hoveredPoint.x - 62 : hoveredPoint.x + 66}
                y={hoveredPoint.y - 12}
                textAnchor="middle"
                fill="#fde68a"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="var(--font-sans)"
              >
                Day {hoveredPoint.day}: {hoveredPoint.type === 'temp' ? `${hoveredPoint.temp}°C` : `${hoveredPoint.oil} BOPD`}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
