import React, { useRef, useEffect, useState } from 'react';
import boltedGaugeImg from '../../assets/kpi/bolted_industrial_gauge.png';

/**
 * IndustrialMetallicGauge
 * Skeuomorphic bolted circular industrial gauge based on authentic reference image.
 * Features:
 * - Real 8-bolt weathered heavy cast iron flange & parchment dial face
 * - Animated metallic crimson & gold instrument needle with brass pivot cap & drop shadow
 * - Parchment-integrated bold digital readout & unit
 * - Industrial metric label pill
 */
export default function IndustrialMetallicGauge({
  value = 0,
  min = 0,
  max = 100,
  label = '',
  unit = '',
  theme = 'amber',
  size = 142,
  displayValue = null
}) {
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const clampedVal = Math.max(min, Math.min(max, numVal));
  const ratio = max > min ? (clampedVal - min) / (max - min) : 0;

  // The dial arc runs from -125deg (min) to +125deg (max), total sweep 250deg
  const targetAngle = -125 + ratio * 250;

  // Animated needle angle: smooth spring sweep on mount & value change
  const [needleAngle, setNeedleAngle] = useState(-125); // start at zero
  const animRef = useRef(null);
  const currentAngle = useRef(-125);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const target = targetAngle;
    const step = () => {
      const diff = target - currentAngle.current;
      if (Math.abs(diff) < 0.3) {
        currentAngle.current = target;
        setNeedleAngle(target);
        return;
      }
      currentAngle.current += diff * 0.08;
      setNeedleAngle(currentAngle.current);
      animRef.current = requestAnimationFrame(step);
    };
    // Small initial delay so component has mounted before sweeping
    const timer = setTimeout(() => { animRef.current = requestAnimationFrame(step); }, 80);
    return () => { clearTimeout(timer); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [targetAngle]);

  const formattedVal = displayValue !== null 
    ? displayValue 
    : (Number.isInteger(numVal) ? numVal : numVal.toFixed(1));

  // Accent subtle glow for needle tip based on theme or value
  const needleAccent = theme === 'blue' 
    ? '#0284c7' 
    : theme === 'green' 
      ? '#15803d' 
      : theme === 'red' 
        ? '#dc2626' 
        : '#b91c1c';

  // Unique filter id to avoid conflicts between multiple gauges on the same page
  const filterId = `needle-shadow-${label.replace(/\s+/g, '-')}-${unit}`;

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        position: 'relative',
        width: size,
        minWidth: size
      }}
    >
      {/* GAUGE BODY CONTAINER */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          filter: 'drop-shadow(0 6px 12px rgba(28, 20, 14, 0.35)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
          borderRadius: '50%',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Flanged Dial Image with 8 hex bolts and parchment scale */}
        <img
          src={boltedGaugeImg}
          alt={label || 'Industrial Gauge'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
        />

        {/* ROTATING NEEDLE & CENTER PIVOT (SVG OVERLAY) */}
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          <defs>
            {/* Needle metallic drop shadow - unique id per gauge */}
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" floodColor="#1a0f05" floodOpacity="0.55" />
            </filter>

            {/* Needle gradient: crimson industrial steel - unique id per gauge */}
            <linearGradient id={`needle-grad-${filterId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="35%" stopColor="#ef4444" />
              <stop offset="65%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Brass center hub gradient - unique id per gauge */}
            <radialGradient id={`brass-outer-${filterId}`} cx="38%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="25%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#92400e" />
              <stop offset="90%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#271103" />
            </radialGradient>

            <radialGradient id={`brass-inner-${filterId}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </radialGradient>
          </defs>

          {/* NEEDLE GROUP — uses SVG transform rotate(angle,cx,cy) for cross-browser reliability */}
          <g
            transform={`rotate(${needleAngle.toFixed(2)},100,100)`}
            filter={`url(#${filterId})`}
          >
            {/* Counterweight tail (bottom side) */}
            <path
              d="M 97.5 100 L 96 122 Q 100 126 104 122 L 102.5 100 Z"
              fill="#261b14"
            />
            <circle cx="100" cy="116" r="3.5" fill="#523927" stroke="#150d07" strokeWidth="0.8" />

            {/* Main needle shaft pointing to top arc (tip at y=28) */}
            <polygon
              points="98,100 99.2,32 100,26 100.8,32 102,100"
              fill={`url(#needle-grad-${filterId})`}
            />

            {/* Fine needle tip point */}
            <polygon
              points="99.4,32 100,25 100.6,32"
              fill={needleAccent}
            />

            {/* Needle center ridge reflection */}
            <line
              x1="100"
              y1="34"
              x2="100"
              y2="98"
              stroke="#fca5a5"
              strokeWidth="0.6"
              strokeOpacity="0.8"
            />
          </g>

          {/* CENTER BRASS PIVOT HUB (Fixed on top of needle) */}
          {/* Shadow ring */}
          <circle cx="100" cy="100" r="14" fill="rgba(0,0,0,0.35)" />
          {/* Outer beveled bronze ring */}
          <circle cx="100" cy="100" r="12.5" fill={`url(#brass-outer-${filterId})`} stroke="#1c1208" strokeWidth="0.8" />
          {/* Middle dark ring */}
          <circle cx="100" cy="100" r="8.5" fill="#2d1c0f" stroke="#523927" strokeWidth="0.5" />
          {/* Center domed brass rivet */}
          <circle cx="100" cy="100" r="6" fill={`url(#brass-inner-${filterId})`} />
          {/* Highlight pin reflection */}
          <circle cx="98.5" cy="98.5" r="1.8" fill="#ffffff" fillOpacity="0.85" />
        </svg>

        {/* PARCHMENT LOWER FIELD DIGITAL READOUT */}
        <div
          style={{
            position: 'absolute',
            top: '64%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '2px',
            pointerEvents: 'none',
            zIndex: 5,
            textShadow: '0 1px 1px rgba(255, 255, 255, 0.45), 0 0 2px rgba(254, 240, 138, 0.2)'
          }}
        >
          <span
            style={{
              fontFamily: '"SF Pro Display", -apple-system, "JetBrains Mono", Consolas, monospace',
              fontSize: size >= 140 ? '1.25rem' : '1.15rem',
              fontWeight: 900,
              color: '#1a1109',
              lineHeight: 1,
              letterSpacing: '-0.02em'
            }}
          >
            {formattedVal}
          </span>
          {unit && (
            <span
              style={{
                fontFamily: '"SF Pro Display", -apple-system, sans-serif',
                fontSize: size >= 140 ? '0.62rem' : '0.58rem',
                fontWeight: 800,
                color: '#5c3917',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* METRIC LABEL CAPSULE BELOW GAUGE */}
      {label && (
        <div
          style={{
            marginTop: '0.45rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(56, 38, 24, 0.07)',
            border: '1px solid rgba(82, 57, 39, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)'
          }}
        >
          <span
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              color: '#341f10',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
