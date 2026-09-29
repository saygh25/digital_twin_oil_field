import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Droplets,
  Thermometer,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Gauge,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Info,
  Layers,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import strataBgImg from '../../assets/yyy.jpeg';
import xrayBgImg from '../../assets/xraybg.jpeg';

const STRATA_HORIZONS = [
  { id: 'alluvium', name: 'Surface Alluvium & Weathered Sand', depth: '0 - 45 m', desc: 'Top desert soil, gravel & loose dry sands' },
  { id: 'upper_shale', name: 'Upper Overburden Shale Cap', depth: '45 - 110 m', desc: 'Impermeable caprock preventing thermal loss' },
  { id: 'siltstone', name: 'Mid Siltstone & Clay Barrier', depth: '110 - 175 m', desc: 'Hydraulic barrier confining thermal pressure' },
  { id: 'upper_sand', name: 'Upper Heavy Oil Sandstone', depth: '175 - 235 m', desc: 'Viscous bitumen saturated interbed (28% Porosity)' },
  { id: 'payzone', name: 'Main Payzone - Heavy Crude Reservoir', depth: '235 - 330 m', desc: 'Primary thermal EOR injection target (34% Porosity, 1800 mD)' },
  { id: 'lower_shale', name: 'Lower Basal Siltstone Aquitard', depth: '330 - 390 m', desc: 'Bottom confining strata' },
  { id: 'basement', name: 'Dense Crystalline Bedrock Basement', depth: '390+ m', desc: 'Impermeable geological floor' }
];

export default function SolidStrataStreamFlowView({
  dynamicRadius = 10.2,
  dynamicTemp = 127.3,
  dynamicViscosity = 142,
  sandboxSteamTemp = 260,
  sandboxSteamQuality = 0.8,
  sandboxSlugTonnes = 1600,
  oilFlowRate = 316,
  oilFlowVelocity = 0.74,
  isFullscreen = false,
  onToggleFullscreen = () => {},
  selectedSectionFilter = 'all',
  onSelectSection = () => {},
  renderMode = 'solid',
  onToggleRenderMode = () => {}
}) {
  const canvasRef = useRef(null);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showTelemetryCards, setShowTelemetryCards] = useState(true);
  const [flowSpeedMultiplier, setFlowSpeedMultiplier] = useState(1);

  // High-fidelity Canvas rendering engine for realistic tanks, wellbores, steam plumes, and stream flows
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth || 1000);
    let height = (canvas.height = canvas.parentElement.clientHeight || 540);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Dynamic Hydrodynamic particle pool for viscous fluid, oil globules & steam transport
    const particles = [];
    const NUM_PARTICLES = 160;

    for (let i = 0; i < NUM_PARTICLES; i++) {
      const isSweep = i >= 28 && i < 136;
      const isInjector = i < 28;
      particles.push({
        section: isInjector ? 'injector_down' : isSweep ? 'reservoir_sweep' : 'producer_up',
        progress: Math.random(),
        speed: (0.0022 + Math.random() * 0.0036) * (isSweep ? 1.0 : 1.25),
        offsetY: (Math.random() - 0.5) * 34,
        size: 1.8 + Math.random() * 2.8,
        wobbleFreq: 1.8 + Math.random() * 2.4,
        wobbleAmp: 2.2 + Math.random() * 5.0,
        phase: Math.random() * Math.PI * 2,
        isBubble: Math.random() > 0.62,
        tailLength: 7 + Math.random() * 14
      });
    }

    let time = 0;

    // Helper: Draw Flow Arrow on Canvas
    const drawFlowArrow = (startX, startY, length, isYellow = true, size = 1) => {
      const endX = startX + length;
      const headLen = 6 * size;
      const headH = 4 * size;

      ctx.save();
      ctx.shadowColor = isYellow ? '#fbbf24' : '#ef4444';
      ctx.shadowBlur = 8;

      const arrowGrad = ctx.createLinearGradient(startX, 0, endX, 0);
      if (isYellow) {
        arrowGrad.addColorStop(0, '#f97316');
        arrowGrad.addColorStop(0.5, '#fde047');
        arrowGrad.addColorStop(1, '#ffffff');
      } else {
        arrowGrad.addColorStop(0, '#991b1b');
        arrowGrad.addColorStop(0.5, '#ef4444');
        arrowGrad.addColorStop(1, '#fef08a');
      }

      ctx.strokeStyle = arrowGrad;
      ctx.lineWidth = 2.2 * size;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX - headLen, startY);
      ctx.stroke();

      ctx.fillStyle = arrowGrad;
      ctx.beginPath();
      ctx.moveTo(endX, startY);
      ctx.lineTo(endX - headLen, startY - headH);
      ctx.lineTo(endX - headLen + 1, startY);
      ctx.lineTo(endX - headLen, startY + headH);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // 1. Draw Realistic Surface Oil & Steam Processing Plant with Enlarged Tanks, Vessels & Piping
    const drawRealisticSurfaceFacility = (injX, prodX, groundY) => {
      ctx.save();
      const pipeY = groundY - 7;

      const steelDark = '#0b0f19';
      const steelMidDark = '#1e293b';
      const steelMid = '#334155';
      const steelLight = '#64748b';
      const steelBright = '#cbd5e1';
      const chrome = '#f8fafc';
      const sunsetWarm = '#fde68a';
      const sunsetHighlight = '#fbbf24';
      const concreteGray = '#475569';

      // =========================================================================
      // A. ENLARGED ONCE-THROUGH STEAM GENERATOR (OTSG / BOILER) - LEFT OF CENTER
      // =========================================================================
      const boilerX = width * 0.355;
      const boilerW = Math.max(60, Math.min(92, width * 0.068));
      const boilerH = Math.max(30, Math.min(46, height * 0.082));
      const saddleH = 6;
      const boilerBaseY = groundY - saddleH;
      const boilerTopY = boilerBaseY - boilerH;

      // Concrete Plinth Foundations
      ctx.fillStyle = concreteGray;
      ctx.fillRect(boilerX - boilerW / 2 + 6, groundY - 4, 14, 4);
      ctx.fillRect(boilerX + boilerW / 2 - 20, groundY - 4, 14, 4);

      // Steel Saddle Supports
      ctx.fillStyle = steelDark;
      ctx.fillRect(boilerX - boilerW / 2 + 8, boilerBaseY, 10, saddleH);
      ctx.fillRect(boilerX + boilerW / 2 - 18, boilerBaseY, 10, saddleH);

      // Cylindrical Boiler Shell Gradient
      const boilerGrad = ctx.createLinearGradient(0, boilerTopY, 0, boilerBaseY);
      boilerGrad.addColorStop(0, chrome);
      boilerGrad.addColorStop(0.18, steelBright);
      boilerGrad.addColorStop(0.45, steelLight);
      boilerGrad.addColorStop(0.8, steelMid);
      boilerGrad.addColorStop(1, steelDark);

      ctx.fillStyle = boilerGrad;
      ctx.fillRect(boilerX - boilerW / 2 + 10, boilerTopY, boilerW - 20, boilerH);

      // Dished Left & Right Ellipsoidal Heads
      const headRadius = 10;
      ctx.beginPath();
      ctx.ellipse(boilerX - boilerW / 2 + 10, boilerTopY + boilerH / 2, headRadius, boilerH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(boilerX + boilerW / 2 - 10, boilerTopY + boilerH / 2, headRadius, boilerH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flange Bolt Ring on Left Dish
      ctx.fillStyle = steelDark;
      for (let b = 0; b < 6; b++) {
        const angle = (b / 6) * Math.PI * 2;
        const bx = boilerX - boilerW / 2 + 10 + Math.cos(angle) * (headRadius - 2);
        const by = boilerTopY + boilerH / 2 + Math.sin(angle) * (boilerH / 2 - 3);
        ctx.fillRect(bx - 1, by - 1, 2, 2);
      }

      // Insulation Cladding Bands
      ctx.fillStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.fillRect(boilerX - boilerW / 2 + 24, boilerTopY, 2, boilerH);
      ctx.fillRect(boilerX, boilerTopY, 2, boilerH);
      ctx.fillRect(boilerX + boilerW / 2 - 26, boilerTopY, 2, boilerH);

      // Optical Burner Flame Sight Window (Pulsing Glow)
      const flamePulse = 0.7 + Math.sin(time * 6) * 0.3;
      ctx.save();
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10 * flamePulse;
      ctx.fillStyle = `rgba(249, 115, 22, ${flamePulse})`;
      ctx.beginPath();
      ctx.arc(boilerX - boilerW / 2 + 10, boilerTopY + boilerH / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(boilerX - boilerW / 2 + 10, boilerTopY + boilerH / 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top Exhaust Flue Stack & Rain Cap
      const stackX = boilerX - boilerW * 0.2;
      const stackH = 20;
      ctx.fillStyle = steelMidDark;
      ctx.fillRect(stackX - 3.5, boilerTopY - stackH, 7, stackH);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(stackX - 4.5, boilerTopY - stackH + 3, 9, 3);
      ctx.fillRect(stackX - 4.5, boilerTopY - stackH + 9, 9, 3);
      // Stack Rain Bonnet
      ctx.fillStyle = steelLight;
      ctx.beginPath();
      ctx.moveTo(stackX - 7, boilerTopY - stackH);
      ctx.lineTo(stackX, boilerTopY - stackH - 5);
      ctx.lineTo(stackX + 7, boilerTopY - stackH);
      ctx.closePath();
      ctx.fill();

      // Steam Discharge Dome & Safety Relief Valve (PSV)
      const domeX = boilerX + boilerW * 0.2;
      ctx.fillStyle = steelBright;
      ctx.fillRect(domeX - 4, boilerTopY - 7, 8, 7);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(domeX - 2, boilerTopY - 14, 4, 7);
      ctx.fillStyle = steelBright;
      ctx.fillRect(domeX - 5, boilerTopY - 16, 10, 2);

      // Boiler High-Pressure Steam Piping Connection to Injector Line
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(domeX + 4, boilerTopY - 4);
      ctx.lineTo(domeX + 16, boilerTopY - 4);
      ctx.lineTo(domeX + 16, pipeY);
      ctx.stroke();

      // =========================================================================
      // B. ENLARGED API-650 CRUDE OIL STORAGE SILO TANK (MAIN VERTICAL VESSEL)
      // =========================================================================
      const tankX = width * 0.470;
      const tankW = Math.max(52, Math.min(78, width * 0.055));
      const tankH = Math.max(56, Math.min(88, height * 0.165));
      const tankPlinthH = 4;
      const tankBaseY = groundY - tankPlinthH;
      const tankTopY = tankBaseY - tankH;

      // Concrete Ringwall Foundation
      ctx.fillStyle = concreteGray;
      ctx.fillRect(tankX - tankW / 2 - 3, groundY - tankPlinthH, tankW + 6, tankPlinthH);

      // Tank Body Cylindrical Gradient
      const tankGrad = ctx.createLinearGradient(tankX - tankW / 2, 0, tankX + tankW / 2, 0);
      tankGrad.addColorStop(0, '#090d16');
      tankGrad.addColorStop(0.12, steelMid);
      tankGrad.addColorStop(0.35, steelLight);
      tankGrad.addColorStop(0.7, steelBright);
      tankGrad.addColorStop(0.85, sunsetHighlight);
      tankGrad.addColorStop(0.95, steelLight);
      tankGrad.addColorStop(1, '#090d16');

      ctx.fillStyle = tankGrad;
      ctx.fillRect(tankX - tankW / 2, tankTopY, tankW, tankH);

      // 4-Tier Welded Horizontal Shell Strakes (API-650 Plate Rings)
      const numStrakes = 4;
      for (let s = 1; s < numStrakes; s++) {
        const sy = tankTopY + (tankH * s) / numStrakes;
        ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
        ctx.fillRect(tankX - tankW / 2, sy, tankW, 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(tankX - tankW / 2, sy + 2, tankW, 1);
      }

      // External Spiral/Caged Access Ladder on Left Side
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tankX - tankW / 2 - 4, tankBaseY);
      ctx.lineTo(tankX - tankW / 2 - 4, tankTopY - 4);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1.2;
      for (let rungY = tankBaseY - 6; rungY >= tankTopY; rungY -= 8) {
        ctx.beginPath();
        ctx.moveTo(tankX - tankW / 2 - 4, rungY);
        ctx.lineTo(tankX - tankW / 2, rungY);
        ctx.stroke();
      }

      // Conical Domed Roof Head
      ctx.fillStyle = tankGrad;
      ctx.beginPath();
      ctx.ellipse(tankX, tankTopY, tankW / 2, 6, 0, Math.PI, 0);
      ctx.fill();

      // Roof Safety Walkway Railing
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(tankX - tankW / 2 + 2, tankTopY - 7);
      ctx.lineTo(tankX + tankW / 2 - 2, tankTopY - 7);
      ctx.stroke();
      for (let post = -tankW / 2 + 6; post <= tankW / 2 - 6; post += 12) {
        ctx.beginPath();
        ctx.moveTo(tankX + post, tankTopY);
        ctx.lineTo(tankX + post, tankTopY - 7);
        ctx.stroke();
      }

      // Roof Center Vent, Flame Arrestor & Relief Valve
      ctx.fillStyle = steelDark;
      ctx.fillRect(tankX - 2.5, tankTopY - 14, 5, 8);
      ctx.fillStyle = steelBright;
      ctx.fillRect(tankX - 5, tankTopY - 16, 10, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tankX - 2, tankTopY - 19, 4, 3);

      // Tank Side Sight Glass Level Gauge (Filled to 74% with heavy oil)
      const gaugeX = tankX + tankW / 2 - 5;
      const gaugeH = tankH * 0.7;
      const gaugeTopY = tankTopY + tankH * 0.15;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(gaugeX - 2, gaugeTopY, 4, gaugeH);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(gaugeX - 1.5, gaugeTopY + gaugeH * 0.26, 3, gaugeH * 0.74);

      // Bottom Shell Product Nozzle & Piping connection to separator
      ctx.fillStyle = steelDark;
      ctx.fillRect(tankX + tankW / 2, tankBaseY - 10, 6, 6);
      ctx.strokeStyle = steelLight;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(tankX + tankW / 2 + 6, tankBaseY - 7);
      ctx.lineTo(tankX + tankW / 2 + 14, tankBaseY - 7);
      ctx.lineTo(tankX + tankW / 2 + 14, pipeY);
      ctx.stroke();

      // =========================================================================
      // C. ENLARGED 3-PHASE TEST SEPARATOR / FWKO VESSEL (CENTER-RIGHT)
      // =========================================================================
      const sepX = width * 0.585;
      const sepW = Math.max(56, Math.min(84, width * 0.060));
      const sepH = Math.max(28, Math.min(42, height * 0.076));
      const sepBaseY = groundY - saddleH;
      const sepTopY = sepBaseY - sepH;

      // Concrete Foundations & Steel Saddles
      ctx.fillStyle = concreteGray;
      ctx.fillRect(sepX - sepW / 2 + 5, groundY - 4, 12, 4);
      ctx.fillRect(sepX + sepW / 2 - 17, groundY - 4, 12, 4);

      ctx.fillStyle = steelDark;
      ctx.fillRect(sepX - sepW / 2 + 7, sepBaseY, 8, saddleH);
      ctx.fillRect(sepX + sepW / 2 - 15, sepBaseY, 8, saddleH);

      // Separator Cylindrical Shell
      const sepGrad = ctx.createLinearGradient(0, sepTopY, 0, sepBaseY);
      sepGrad.addColorStop(0, chrome);
      sepGrad.addColorStop(0.2, steelBright);
      sepGrad.addColorStop(0.5, steelLight);
      sepGrad.addColorStop(0.85, steelMid);
      sepGrad.addColorStop(1, steelDark);

      ctx.fillStyle = sepGrad;
      ctx.fillRect(sepX - sepW / 2 + 8, sepTopY, sepW - 16, sepH);

      // Elliptical Vessel Heads
      const sepHeadR = 8;
      ctx.beginPath();
      ctx.ellipse(sepX - sepW / 2 + 8, sepTopY + sepH / 2, sepHeadR, sepH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sepX + sepW / 2 - 8, sepTopY + sepH / 2, sepHeadR, sepH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stainless Cladding Rings
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(sepX - sepW / 4, sepTopY, 2, sepH);
      ctx.fillRect(sepX + sepW / 4, sepTopY, 2, sepH);

      // Top Gas Dome & Back-Pressure Control Valve (Green/Yellow)
      ctx.fillStyle = steelDark;
      ctx.fillRect(sepX - 4, sepTopY - 8, 8, 8);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sepX, sepTopY - 11, 4, 0, Math.PI * 2);
      ctx.fill();

      // Front Multi-Phase Liquid Interface Sight Column
      const sepSightX = sepX - 4;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sepSightX, sepTopY + 6, 8, sepH - 12);
      // Heavy oil layer (top amber)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sepSightX + 1.5, sepTopY + 8, 5, (sepH - 16) * 0.5);
      // Produced water layer (bottom blue-gray)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sepSightX + 1.5, sepTopY + 8 + (sepH - 16) * 0.5, 5, (sepH - 16) * 0.5);

      // =========================================================================
      // D. ENLARGED HIGH-PRESSURE CRUDE BOOSTER & INJECTION PUMP SKID (RIGHT)
      // =========================================================================
      const pumpX = width * 0.686;
      const pumpW = Math.max(92, Math.min(145, width * 0.098));
      const pumpH = Math.max(30, Math.min(48, height * 0.086));
      const pumpPlinthH = 5;
      const pumpBaseY = groundY - pumpPlinthH;
      const pumpTopY = pumpBaseY - pumpH;

      // Concrete Plinth Foundation
      ctx.fillStyle = concreteGray;
      ctx.fillRect(pumpX - pumpW / 2 - 4, groundY - pumpPlinthH, pumpW + 8, pumpPlinthH);

      // Heavy Structural I-Beam Skid Base (Industrial Safety Blue)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pumpX - pumpW / 2, pumpBaseY - 6, pumpW, 6);
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(pumpX - pumpW / 2 + 2, pumpBaseY - 5, pumpW - 4, 4);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(pumpX - pumpW / 2 + 3, pumpBaseY - 5, pumpW - 6, 1.5);

      // 1. Heavy Electric Motor Section (Left side of skid)
      const motorW = pumpW * 0.45;
      const motorH = pumpH * 0.80;
      const motorX = pumpX - pumpW / 2 + 4;
      const motorTopY = pumpBaseY - 6 - motorH;

      const motorGrad = ctx.createLinearGradient(0, motorTopY, 0, pumpBaseY - 6);
      motorGrad.addColorStop(0, '#93c5fd');
      motorGrad.addColorStop(0.2, '#3b82f6');
      motorGrad.addColorStop(0.65, '#1d4ed8');
      motorGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = motorGrad;
      ctx.fillRect(motorX, motorTopY, motorW, motorH);

      // Motor Cooling Ribs / Fins
      ctx.fillStyle = '#172554';
      for (let rib = motorX + 5; rib < motorX + motorW - 4; rib += 3.8) {
        ctx.fillRect(rib, motorTopY, 1.5, motorH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(rib + 1.5, motorTopY, 0.8, motorH);
        ctx.fillStyle = '#172554';
      }

      // Motor Terminal Junction Box (Top)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(motorX + motorW * 0.3, motorTopY - 5, 12, 5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(motorX + motorW * 0.3 + 2, motorTopY - 4, 8, 2);

      // 2. High-Torque Flexible Coupling Guard (Safety Yellow / Black Hazard)
      const couplingX = motorX + motorW;
      const couplingW = pumpW * 0.11;
      const couplingH = motorH * 0.75;
      const couplingTopY = pumpBaseY - 6 - couplingH;

      ctx.fillStyle = '#eab308';
      ctx.fillRect(couplingX, couplingTopY, couplingW, couplingH);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(couplingX + 2, couplingTopY + 2, couplingW - 4, couplingH - 4);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(couplingX + 3, couplingTopY + 4, couplingW - 6, 2);
      ctx.fillRect(couplingX + 3, couplingTopY + 8, couplingW - 6, 2);

      // 3. Fluid End / Multi-Plunger Power Head (Right side)
      const headX = couplingX + couplingW + 2;
      const headW = pumpW - (headX - (pumpX - pumpW / 2)) - 4;
      const headH = pumpH * 0.92;
      const headTopY = pumpBaseY - 6 - headH;

      const headGrad = ctx.createLinearGradient(0, headTopY, 0, pumpBaseY - 6);
      headGrad.addColorStop(0, chrome);
      headGrad.addColorStop(0.2, steelBright);
      headGrad.addColorStop(0.5, steelLight);
      headGrad.addColorStop(0.85, steelMid);
      headGrad.addColorStop(1, steelDark);

      ctx.fillStyle = headGrad;
      ctx.fillRect(headX, headTopY, headW, headH);

      // Fluid End Plunger Chamber Caps (4 Cylinders)
      ctx.fillStyle = '#0f172a';
      const numCaps = 4;
      const capSpacing = headW / numCaps;
      for (let c = 0; c < numCaps; c++) {
        const cx = headX + c * capSpacing + 2;
        ctx.fillRect(cx, headTopY + 5, capSpacing - 4, headH - 10);
        ctx.fillStyle = steelBright;
        ctx.fillRect(cx + 1, headTopY + 6, capSpacing - 6, 2);
        ctx.fillStyle = '#0f172a';
      }

      // 4. Dual Discharge Pulsation Dampener Bottles (Spherical Domes)
      const dampenerR = 6;
      const dampenerX1 = headX + headW * 0.35;
      const dampenerX2 = headX + headW * 0.72;

      [dampenerX1, dampenerX2].forEach((dx) => {
        ctx.fillStyle = steelDark;
        ctx.fillRect(dx - 2, headTopY - 5, 4, 5);

        const dampenerGrad = ctx.createRadialGradient(
          dx - 1.5,
          headTopY - 5 - dampenerR - 1.5,
          1,
          dx,
          headTopY - 5 - dampenerR,
          dampenerR
        );
        dampenerGrad.addColorStop(0, chrome);
        dampenerGrad.addColorStop(0.35, steelBright);
        dampenerGrad.addColorStop(0.8, steelMid);
        dampenerGrad.addColorStop(1, steelDark);

        ctx.fillStyle = dampenerGrad;
        ctx.beginPath();
        ctx.arc(dx, headTopY - 5 - dampenerR, dampenerR, 0, Math.PI * 2);
        ctx.fill();

        // Top Vent / PSV on Dampener
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(dx - 1.5, headTopY - 5 - dampenerR * 2 - 3, 3, 3);
      });

      // 5. Dual Suction & Discharge Pressure Gauges
      const gaugeX1 = headX + headW - 2;
      const gaugeY1 = headTopY + 3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gaugeX1, gaugeY1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = steelDark;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(gaugeX1, gaugeY1);
      ctx.lineTo(gaugeX1 + 2, gaugeY1 - 2);
      ctx.stroke();

      // Discharge High-Pressure Piping Nozzle connecting to Gathering Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(headX + headW, headTopY + headH * 0.45);
      ctx.lineTo(headX + headW + 8, headTopY + headH * 0.45);
      ctx.lineTo(headX + headW + 8, pipeY);
      ctx.stroke();

      // =========================================================================
      // E. CONTINUOUS HEAVY INSULATED GROUND PIPELINE NETWORK & SLEEPERS
      // =========================================================================
      ctx.fillStyle = concreteGray;
      for (let px = injX + 24; px < prodX - 24; px += 34) {
        ctx.fillRect(px - 3, pipeY, 6, groundY - pipeY);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px - 5, pipeY - 2, 10, 2);
        ctx.fillStyle = concreteGray;
      }

      // Main Multi-Line Piping Bundle
      ctx.lineWidth = 6.0;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(injX, pipeY);
      ctx.lineTo(prodX, pipeY);
      ctx.stroke();

      ctx.lineWidth = 3.8;
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(injX, pipeY);
      ctx.lineTo(prodX, pipeY);
      ctx.stroke();

      // Clean realistic 90° Injection Elbow at Injector (Thermal Red Line)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(injX + 10, pipeY);
      ctx.lineTo(injX, pipeY);
      ctx.lineTo(injX, groundY - 14);
      ctx.stroke();

      // Clean realistic 90° Gathering Elbow at Producer (Crude Amber Line)
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(prodX - 10, pipeY);
      ctx.lineTo(prodX, pipeY);
      ctx.lineTo(prodX, groundY - 14);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
    };

    // 2. Draw Highly Detailed Industrial Christmas Tree Wellhead (Enlarged Scale & High-Detail Valves)
    const drawRealisticChristmasTree = (x, groundY, theme = 'red') => {
      ctx.save();
      const isRed = theme === 'red';
      const baseRed = '#b91c1c';
      const brightRed = '#ef4444';
      const deepRed = '#7f1d1d';
      const darkSteel = '#090d16';
      const midSteel = '#334155';
      const lightSteel = '#94a3b8';
      const chrome = '#f8fafc';

      // 1. Heavy Base Casing Spool & Studded Flange (Enlarged)
      const spoolW = 54;
      const spoolGrad = ctx.createLinearGradient(x - spoolW / 2, 0, x + spoolW / 2, 0);
      spoolGrad.addColorStop(0, darkSteel);
      spoolGrad.addColorStop(0.15, midSteel);
      spoolGrad.addColorStop(0.35, chrome);
      spoolGrad.addColorStop(0.55, lightSteel);
      spoolGrad.addColorStop(0.85, midSteel);
      spoolGrad.addColorStop(1, darkSteel);

      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x - spoolW / 2, groundY - 9, spoolW, 9);

      // Flange Stud Bolts & Nuts (Heavy Duty)
      ctx.fillStyle = chrome;
      for (let b = -spoolW / 2 + 5; b <= spoolW / 2 - 5; b += 6.5) {
        ctx.fillRect(x + b - 1.2, groundY - 8.5, 2.4, 8);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + b - 0.8, groundY - 7, 1.6, 2);
        ctx.fillStyle = chrome;
      }

      // Master Valve Casing Gradient
      const masterW = 20;
      const masterGrad = ctx.createLinearGradient(x - masterW / 2, 0, x + masterW / 2, 0);
      if (isRed) {
        masterGrad.addColorStop(0, deepRed);
        masterGrad.addColorStop(0.2, baseRed);
        masterGrad.addColorStop(0.4, brightRed);
        masterGrad.addColorStop(0.55, '#fca5a5');
        masterGrad.addColorStop(0.75, baseRed);
        masterGrad.addColorStop(1, deepRed);
      } else {
        masterGrad.addColorStop(0, '#090d16');
        masterGrad.addColorStop(0.2, '#1e293b');
        masterGrad.addColorStop(0.4, '#64748b');
        masterGrad.addColorStop(0.55, '#cbd5e1');
        masterGrad.addColorStop(0.75, '#334155');
        masterGrad.addColorStop(1, '#090d16');
      }

      // 2. Lower Master Valve Body
      ctx.fillStyle = masterGrad;
      ctx.fillRect(x - masterW / 2, groundY - 26, masterW, 17);

      // Inter-Flange Spool Rings
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x - masterW * 0.65, groundY - 13, masterW * 1.3, 4);
      ctx.fillRect(x - masterW * 0.65, groundY - 28, masterW * 1.3, 4);

      // 3. Left Wing Valve & Handwheel
      ctx.fillStyle = isRed ? brightRed : midSteel;
      ctx.fillRect(x - 24, groundY - 23, 14, 5);
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x - 17, groundY - 25, 4, 9);

      // Left Handwheel (3D Ring with Spokes)
      ctx.fillStyle = darkSteel;
      ctx.beginPath();
      ctx.ellipse(x - 26, groundY - 20.5, 3.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isRed ? '#f87171' : chrome;
      ctx.beginPath();
      ctx.ellipse(x - 26, groundY - 20.5, 2.0, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = darkSteel;
      ctx.beginPath();
      ctx.ellipse(x - 26, groundY - 20.5, 1.0, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Right Wing Valve & Handwheel
      ctx.fillStyle = isRed ? brightRed : midSteel;
      ctx.fillRect(x + 10, groundY - 23, 14, 5);
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x + 13, groundY - 25, 4, 9);

      // Right Handwheel
      ctx.fillStyle = darkSteel;
      ctx.beginPath();
      ctx.ellipse(x + 24, groundY - 20.5, 3.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isRed ? '#f87171' : chrome;
      ctx.beginPath();
      ctx.ellipse(x + 24, groundY - 20.5, 2.0, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = darkSteel;
      ctx.beginPath();
      ctx.ellipse(x + 24, groundY - 20.5, 1.0, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. Upper Master Valve / Flow Cross Block
      ctx.fillStyle = masterGrad;
      ctx.fillRect(x - masterW / 2, groundY - 44, masterW, 16);

      // Upper Left Production / Injection Arm
      ctx.fillStyle = isRed ? baseRed : darkSteel;
      ctx.fillRect(x - 25, groundY - 40, 15, 6);
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x - 16, groundY - 42, 4, 10);
      ctx.fillStyle = isRed ? '#ef4444' : lightSteel;
      ctx.beginPath();
      ctx.ellipse(x - 27, groundY - 37, 3.2, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper Right Flow Wing Arm & Choke Valve
      ctx.fillStyle = isRed ? baseRed : darkSteel;
      ctx.fillRect(x + 10, groundY - 40, 15, 6);
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x + 12, groundY - 42, 4, 10);
      ctx.fillStyle = isRed ? '#ef4444' : lightSteel;
      ctx.beginPath();
      ctx.ellipse(x + 25, groundY - 37, 3.2, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6. Top Swab Valve Spool & Tree Cap
      ctx.fillStyle = masterGrad;
      ctx.fillRect(x - 7, groundY - 54, 14, 10);
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(x - 10, groundY - 56, 20, 3.5);

      // Top Tree Crown Bonnet Cap
      ctx.fillStyle = chrome;
      ctx.fillRect(x - 2.5, groundY - 62, 5, 6);
      ctx.fillStyle = darkSteel;
      ctx.fillRect(x - 12, groundY - 65, 24, 4);
      ctx.fillStyle = isRed ? brightRed : lightSteel;
      ctx.fillRect(x - 10, groundY - 64, 20, 2);

      // 7. High-Precision Digital/Analog Pressure Gauge (Mounted on Top Right)
      const gaugeCenterX = x + 12;
      const gaugeCenterY = groundY - 52;
      const gaugeRadius = 4.5;

      // Gauge Stem
      ctx.fillStyle = spoolGrad;
      ctx.fillRect(gaugeCenterX - 1.2, gaugeCenterY + 2, 2.4, 5);

      // Gauge Dial Face
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(gaugeCenterX, gaugeCenterY, gaugeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darkSteel;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Gauge Calibrated Needle (Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(gaugeCenterX, gaugeCenterY);
      ctx.lineTo(gaugeCenterX + 2.5, gaugeCenterY - 2.5);
      ctx.stroke();

      ctx.restore();
    };

    // 3. Draw Ultra-Realistic 3D Subterranean Completion String & Casing Assembly (Exact User Reference Match)
    const drawRealisticWellbore = (x, groundY, wellBottomY, type = 'injector', customShaftW) => {
      ctx.save();
      const isInjector = type === 'injector';
      const shaftW = customShaftW || Math.max(42, Math.min(62, width * 0.046));
      const pipeW = shaftW * 0.76;
      const collarW = shaftW;
      const wellH = wellBottomY - groundY;

      // 3D Cylindrical Shader Helper with photorealistic lighting stops
      const create3DCylinderGrad = (leftX, rightX, theme = 'steel') => {
        const grad = ctx.createLinearGradient(leftX, 0, rightX, 0);
        if (theme === 'red_thermal') {
          grad.addColorStop(0, '#3b0707');
          grad.addColorStop(0.10, '#7f1d1d');
          grad.addColorStop(0.28, '#fca5a5');
          grad.addColorStop(0.38, '#ffffff');
          grad.addColorStop(0.50, '#dc2626');
          grad.addColorStop(0.78, '#991b1b');
          grad.addColorStop(0.92, '#5c0d0d');
          grad.addColorStop(1, '#250303');
        } else if (theme === 'dark_collar') {
          grad.addColorStop(0, '#05070e');
          grad.addColorStop(0.10, '#1e293b');
          grad.addColorStop(0.30, '#94a3b8');
          grad.addColorStop(0.42, '#cbd5e1');
          grad.addColorStop(0.70, '#475569');
          grad.addColorStop(0.90, '#1e293b');
          grad.addColorStop(1, '#05070e');
        } else if (theme === 'bronze_disc') {
          grad.addColorStop(0, '#1c1917');
          grad.addColorStop(0.12, '#44403c');
          grad.addColorStop(0.32, '#d6d3d1');
          grad.addColorStop(0.46, '#fafaf9');
          grad.addColorStop(0.75, '#78716c');
          grad.addColorStop(0.92, '#292524');
          grad.addColorStop(1, '#0c0a09');
        } else {
          // Photorealistic brushed stainless steel casing
          grad.addColorStop(0, '#050811');
          grad.addColorStop(0.08, '#1e293b');
          grad.addColorStop(0.28, '#cbd5e1');
          grad.addColorStop(0.36, '#ffffff');
          grad.addColorStop(0.50, '#e2e8f0');
          grad.addColorStop(0.75, '#64748b');
          grad.addColorStop(0.92, '#334155');
          grad.addColorStop(1, '#050811');
        }
        return grad;
      };

      // Helper to draw a 3D Stepped Collar with Chamfers & Keyway Slots
      const draw3DCollar = (topY, collarH, w, hasKeyways = true, hasGrooves = true, hasBlueMark = false) => {
        const bevelH = 3.5;
        const bodyH = Math.max(6, collarH - bevelH * 2);
        const leftX = x - w / 2;
        const rightX = x + w / 2;
        const pipeLeftX = x - pipeW / 2;
        const pipeRightX = x + pipeW / 2;

        // Top Chamfer Bevel
        ctx.fillStyle = create3DCylinderGrad(leftX, rightX, 'steel');
        ctx.beginPath();
        ctx.moveTo(pipeLeftX, topY);
        ctx.lineTo(pipeRightX, topY);
        ctx.lineTo(rightX, topY + bevelH);
        ctx.lineTo(leftX, topY + bevelH);
        ctx.closePath();
        ctx.fill();

        // Top Bevel Highlight Edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(leftX + 2, topY + bevelH - 0.8, w - 4, 1);

        // Cylindrical Collar Body
        ctx.fillStyle = create3DCylinderGrad(leftX, rightX, 'dark_collar');
        ctx.fillRect(leftX, topY + bevelH, w, bodyH);

        // Machined Horizontal Grooves / O-Ring Rings
        if (hasGrooves) {
          ctx.fillStyle = 'rgba(10, 15, 29, 0.95)';
          ctx.fillRect(leftX, topY + bevelH + bodyH * 0.28, w, 1.8);
          ctx.fillRect(leftX, topY + bevelH + bodyH * 0.68, w, 1.8);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillRect(leftX, topY + bevelH + bodyH * 0.28 + 1.8, w, 0.8);
          ctx.fillRect(leftX, topY + bevelH + bodyH * 0.68 + 1.8, w, 0.8);
        }

        // Vertical Machined Keyway Slots / Recessed Bolt Notches
        if (hasKeyways) {
          ctx.fillStyle = '#04070e';
          const kwW = 3.4;
          const kwH = bodyH * 0.48;
          const kwY = topY + bevelH + (bodyH - kwH) / 2;
          ctx.fillRect(x - w * 0.26 - kwW / 2, kwY, kwW, kwH);
          ctx.fillRect(x + w * 0.22 - kwW / 2, kwY, kwW, kwH);

          // Specular Right Highlight on Keyway Slot
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.fillRect(x - w * 0.26 + kwW / 2 - 0.8, kwY, 0.8, kwH);
          ctx.fillRect(x + w * 0.22 + kwW / 2 - 0.8, kwY, 0.8, kwH);
        }

        // Blue Indicator Mark (Landing Nipple Test Port)
        if (hasBlueMark) {
          const markY = topY + bevelH + bodyH * 0.5;
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x, markY, 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.arc(x, markY, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#93c5fd';
          ctx.beginPath();
          ctx.arc(x - 0.6, markY - 0.6, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bottom Chamfer Bevel
        ctx.fillStyle = create3DCylinderGrad(leftX, rightX, 'dark_collar');
        ctx.beginPath();
        ctx.moveTo(leftX, topY + bevelH + bodyH);
        ctx.lineTo(rightX, topY + bevelH + bodyH);
        ctx.lineTo(pipeRightX, topY + collarH);
        ctx.lineTo(pipeLeftX, topY + collarH);
        ctx.closePath();
        ctx.fill();

        // Drop Shadow Underneath Collar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(pipeLeftX, topY + collarH, pipeW, 2.8);
      };

      // Helper to draw Standard 3D Casing Pipe Joint with Machined Pockets & Seams
      const draw3DPipeJoint = (topY, jointH, hasLatchPocket = false, hasSensorBoss = false) => {
        const leftX = x - pipeW / 2;
        const rightX = x + pipeW / 2;
        ctx.fillStyle = create3DCylinderGrad(leftX, rightX, 'steel');
        ctx.fillRect(leftX, topY, pipeW, jointH);

        // Longitudinal Vertical Guide Seam
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.fillRect(x - pipeW * 0.12, topY, 1.2, jointH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x - pipeW * 0.12 + 1.2, topY, 0.8, jointH);

        // Subtle Machined Seam Bands
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        for (let py = topY + 16; py < topY + jointH - 10; py += 24) {
          ctx.fillRect(leftX, py, pipeW, 1.2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(leftX, py + 1.2, pipeW, 0.6);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        }

        // Recessed Rectangular Latching Window Pocket Cutout
        if (hasLatchPocket) {
          const pocketW = 4.2;
          const pocketH = 11;
          const pocketX = x - pipeW * 0.22;
          const pocketY = topY + jointH * 0.42;

          ctx.fillStyle = '#030712';
          ctx.fillRect(pocketX - pocketW / 2, pocketY, pocketW, pocketH);

          // Dark Inner Top Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.fillRect(pocketX - pocketW / 2, pocketY, pocketW, 2);

          // Specular Right Highlight Edge
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(pocketX + pocketW / 2 - 0.9, pocketY, 0.9, pocketH);
        }

        // Prominent Circular Sensor / Gauge Boss on Right Side
        if (hasSensorBoss) {
          const bossX = x + pipeW / 2 + 1.5;
          const bossY = topY + jointH * 0.55;
          const bossR = 3.6;

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(bossX, bossY, bossR + 1.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = create3DCylinderGrad(bossX - bossR, bossX + bossR, 'steel');
          ctx.beginPath();
          ctx.arc(bossX, bossY, bossR, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#030712';
          ctx.beginPath();
          ctx.arc(bossX, bossY, bossR * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bossX - 0.8, bossY - 0.8, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      // Background Drillhole Cavity Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.fillRect(x - shaftW / 2 - 3, groundY, shaftW + 6, wellH + 4);

      // =========================================================================
      // 1. TOP MULTI-TIER CASING BOWL & GROUND SEAT ASSEMBLY
      // =========================================================================
      const topBowlH = wellH * 0.085;
      const bowlTopY = groundY;

      // Tier 1: Top Wide Hanger Cap Flange
      const disc1W = collarW * 1.16;
      ctx.fillStyle = create3DCylinderGrad(x - disc1W / 2, x + disc1W / 2, 'steel');
      ctx.fillRect(x - disc1W / 2, bowlTopY, disc1W, 5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(x - disc1W / 2 + 2, bowlTopY, disc1W - 4, 1.2);

      // Tier 2: Recessed Dark Neck Collar
      const disc2W = collarW * 0.96;
      ctx.fillStyle = create3DCylinderGrad(x - disc2W / 2, x + disc2W / 2, 'dark_collar');
      ctx.fillRect(x - disc2W / 2, bowlTopY + 5, disc2W, 4);

      // Tier 3: Main Casing Bowl Body with Vertical Teeth Notches
      const disc3W = collarW * 1.10;
      const bowlBodyH = topBowlH - 12;
      ctx.fillStyle = create3DCylinderGrad(x - disc3W / 2, x + disc3W / 2, 'steel');
      ctx.fillRect(x - disc3W / 2, bowlTopY + 9, disc3W, bowlBodyH);

      // Vertical Serrations / Machined Bolt Splines on Bowl Body
      ctx.fillStyle = '#060911';
      for (let sx = x - disc3W * 0.38; sx <= x + disc3W * 0.38; sx += 6.5) {
        ctx.fillRect(sx - 1, bowlTopY + 11, 2, bowlBodyH - 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(sx + 1, bowlTopY + 11, 0.8, bowlBodyH - 4);
        ctx.fillStyle = '#060911';
      }

      // Tier 4: Bottom Beveled Transition Ring into Casing
      ctx.fillStyle = create3DCylinderGrad(x - collarW / 2, x + collarW / 2, 'dark_collar');
      ctx.beginPath();
      ctx.moveTo(x - disc3W / 2, bowlTopY + 9 + bowlBodyH);
      ctx.lineTo(x + disc3W / 2, bowlTopY + 9 + bowlBodyH);
      ctx.lineTo(x + pipeW / 2, bowlTopY + topBowlH);
      ctx.lineTo(x - pipeW / 2, bowlTopY + topBowlH);
      ctx.closePath();
      ctx.fill();

      // Drop Shadow Below Ground Flange
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(x - pipeW / 2, bowlTopY + topBowlH, pipeW, 2.5);

      // =========================================================================
      // 2. CASING JOINT 1 (UPPER CASING WITH LATCH WINDOW POCKET)
      // =========================================================================
      const joint1TopY = bowlTopY + topBowlH;
      const joint1H = wellH * 0.115;
      draw3DPipeJoint(joint1TopY, joint1H, true, false);

      // =========================================================================
      // 3. COLLAR 1 (INTERMEDIATE STEPPED JOINT COLLAR)
      // =========================================================================
      const collar1TopY = joint1TopY + joint1H;
      const collar1H = wellH * 0.080;
      draw3DCollar(collar1TopY, collar1H, collarW, true, true, false);

      // =========================================================================
      // 4. CASING JOINT 2 (MID STRING WITH SENSOR BOSS)
      // =========================================================================
      const joint2TopY = collar1TopY + collar1H;
      const joint2H = wellH * 0.120;
      draw3DPipeJoint(joint2TopY, joint2H, true, true);

      // =========================================================================
      // 5. COLLAR 2 (HEAVY REINFORCED PACKER / EXPANSION SUB)
      // =========================================================================
      const collar2TopY = joint2TopY + joint2H;
      const collar2H = wellH * 0.095;
      draw3DCollar(collar2TopY, collar2H, collarW * 1.05, true, true, false);

      // =========================================================================
      // 6. CASING JOINT 3 (LOWER INTERBED STRING WITH DUAL GUIDE RIBS)
      // =========================================================================
      const joint3TopY = collar2TopY + collar2H;
      const joint3H = wellH * 0.135;
      draw3DPipeJoint(joint3TopY, joint3H, false, false);

      // Left-Side Longitudinal Guide Rib / Channel
      ctx.fillStyle = create3DCylinderGrad(x - pipeW / 2 - 3.5, x - pipeW / 2, 'dark_collar');
      ctx.fillRect(x - pipeW / 2 - 2.5, joint3TopY + 8, 2.5, joint3H * 0.55);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(x - pipeW / 2 - 1, joint3TopY + 8, 0.8, joint3H * 0.55);

      // =========================================================================
      // 7. COLLAR 3 (CROSS-OVER EXPANSION SUB)
      // =========================================================================
      const collar3TopY = joint3TopY + joint3H;
      const collar3H = wellH * 0.080;
      draw3DCollar(collar3TopY, collar3H, collarW, true, true, false);

      // =========================================================================
      // 8. COLLAR 4 / LANDING NIPPLE (WITH BLUE TEST INDICATOR BADGE)
      // =========================================================================
      const collar4TopY = collar3TopY + collar3H;
      const collar4H = wellH * 0.050;
      draw3DCollar(collar4TopY, collar4H, collarW * 0.98, false, true, true);

      // =========================================================================
      // 9. FLOW CONTROL VALVE CAGE / ESP MANDREL & STRUCTURAL GUIDE RODS
      // =========================================================================
      const cageTopY = collar4TopY + collar4H;
      const cageH = wellH * 0.085;
      const mandrelW = pipeW * 0.46;

      // Top Cage Flange Disc
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - pipeW / 2, cageTopY, pipeW, 3.5);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - pipeW / 2 + 1, cageTopY + 0.8, pipeW - 2, 1);

      // Inner Central Mandrel Body
      const mLeftX = x - mandrelW / 2;
      const mRightX = x + mandrelW / 2;
      ctx.fillStyle = create3DCylinderGrad(mLeftX, mRightX, 'steel');
      ctx.fillRect(mLeftX, cageTopY + 3.5, mandrelW, cageH - 7);

      // Middle Spacer Disc Plate
      const spacerY = cageTopY + cageH * 0.48;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - pipeW * 0.42, spacerY - 2, pipeW * 0.84, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - pipeW * 0.42, spacerY - 1, pipeW * 0.84, 1);

      // Center Flow Orifice / Circular Valve Port
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.arc(x, spacerY, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isInjector ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, spacerY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - 0.6, spacerY - 0.6, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Vertical Guide Rods / Stainless Steel Structural Struts (Left & Right)
      const rodW = 3.8;
      const leftRodX = x - pipeW / 2 + 1.5;
      const rightRodX = x + pipeW / 2 - 1.5 - rodW;
      ctx.fillStyle = create3DCylinderGrad(leftRodX, leftRodX + rodW, 'steel');
      ctx.fillRect(leftRodX, cageTopY, rodW, cageH);
      ctx.fillStyle = create3DCylinderGrad(rightRodX, rightRodX + rodW, 'steel');
      ctx.fillRect(rightRodX, cageTopY, rodW, cageH);

      // Bottom Cage Flange Plate
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - pipeW / 2, cageTopY + cageH - 3.5, pipeW, 3.5);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - pipeW / 2 + 1, cageTopY + cageH - 3, pipeW - 2, 1);

      // =========================================================================
      // 10. CONTINUOUS SLIM EXTERNAL CONTROL LINE (CAPILLARY LINE & CLAMPS)
      // =========================================================================
      const lineX = x + collarW / 2 + 2.5;
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(lineX, groundY);
      ctx.lineTo(lineX, cageTopY + cageH);
      ctx.stroke();

      // Stainless Steel Clamping Bands at Each Collar & Flange
      const clampYs = [
        groundY + topBowlH * 0.45,
        collar1TopY + collar1H * 0.5,
        collar2TopY + collar2H * 0.5,
        collar3TopY + collar3H * 0.5,
        collar4TopY + collar4H * 0.5
      ];
      clampYs.forEach((cy) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + collarW / 2 - 2, cy - 2.5, 6.5, 5);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + collarW / 2 + 1.2, cy - 1.2, 1.8, 2.4);
      });

      // =========================================================================
      // 11. BOTTOM RUBY-RED / BRONZE THERMAL COMPLETION BARREL (4 SEGMENTED LAYERS)
      // =========================================================================
      const barrelTopY = cageTopY + cageH;
      const barrelH = wellBottomY - barrelTopY;
      const barrelW = collarW * 1.06;
      const bLeftX = x - barrelW / 2;
      const bRightX = x + barrelW / 2;
      const extremeTipY = wellBottomY + 3; // Extreme bottom end / guide shoe tip

      // (A) DYNAMIC CONCENTRIC THERMAL RADIATION WAVEFRONTS AT EXTREME END OF PIPES
      ctx.save();
      const numWaves = 4;
      for (let w = 0; w < numWaves; w++) {
        const waveProgress = (time * 0.5 + w / numWaves) % 1;
        const radX = barrelW * (0.8 + waveProgress * 2.4);
        const radY = Math.max(10, barrelH * 0.35) * (0.6 + waveProgress * 0.8);
        const waveAlpha = Math.sin(waveProgress * Math.PI) * (1 - waveProgress) * (isInjector ? 0.75 : 0.62);

        ctx.strokeStyle = isInjector
          ? `rgba(254, 215, 170, ${waveAlpha})`
          : `rgba(253, 224, 71, ${waveAlpha})`;
        ctx.lineWidth = 2.0 * (1 - waveProgress * 0.45);
        ctx.shadowColor = isInjector ? '#ef4444' : '#f59e0b';
        ctx.shadowBlur = 12 * (1 - waveProgress * 0.3);

        // Centered directly at extreme end / bottom tip
        ctx.beginPath();
        ctx.ellipse(x, extremeTipY, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Shimmering Radiation Dashes on Outer Crest
        if (waveProgress > 0.25) {
          ctx.strokeStyle = isInjector
            ? `rgba(255, 255, 255, ${waveAlpha * 0.8})`
            : `rgba(254, 240, 138, ${waveAlpha * 0.8})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(x, extremeTipY, radX * 1.04, radY * 1.04, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      // (B) RADIAL GLOWING THERMAL HEAT BLOOM AT EXTREME END OF PIPES
      ctx.save();
      const bloomGrad = ctx.createRadialGradient(
        x,
        extremeTipY,
        2,
        x,
        extremeTipY,
        barrelW * 1.45
      );
      bloomGrad.addColorStop(0, isInjector ? 'rgba(239, 68, 68, 0.65)' : 'rgba(245, 158, 11, 0.60)');
      bloomGrad.addColorStop(0.40, isInjector ? 'rgba(249, 115, 22, 0.35)' : 'rgba(217, 119, 6, 0.28)');
      bloomGrad.addColorStop(0.75, isInjector ? 'rgba(220, 38, 38, 0.12)' : 'rgba(180, 83, 9, 0.08)');
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(x, extremeTipY, barrelW * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top Bevel Collar into Red Barrel
      ctx.fillStyle = create3DCylinderGrad(bLeftX, bRightX, 'dark_collar');
      ctx.fillRect(bLeftX, barrelTopY, barrelW, 4.5);

      // Red Metallic Thermal Alloy Barrel Body
      ctx.fillStyle = create3DCylinderGrad(bLeftX, bRightX, 'red_thermal');
      ctx.fillRect(bLeftX, barrelTopY + 4.5, barrelW, barrelH - 4.5);

      // Horizontal Segmented Plate Tier Grooves on Barrel (3 dividing lines = 4 distinct layers)
      const TOTAL_LAYERS = 4;
      for (let t = 1; t < TOTAL_LAYERS; t++) {
        const ty = barrelTopY + (barrelH * t) / TOTAL_LAYERS;
        ctx.fillStyle = 'rgba(40, 5, 5, 0.85)';
        ctx.fillRect(bLeftX, ty, barrelW, 2);
        ctx.fillStyle = 'rgba(254, 202, 202, 0.45)';
        ctx.fillRect(bLeftX, ty + 2, barrelW, 0.8);
      }

      // (C) RADIANT PERFORATION MICRO-BEAMS (4 ROWS OF PERFORATIONS - 1 PER LAYER)
      const pRows = 4; // Exactly 4 layers / rows
      const pCols = 4;
      const pColSpacing = (barrelW - 14) / (pCols - 1);
      const layerH = barrelH / TOTAL_LAYERS;

      for (let r = 0; r < pRows; r++) {
        const pyPos = barrelTopY + (r + 0.5) * layerH;
        const rayLen = 14 + Math.sin(time * 5 + r * 1.3) * 6 + (isInjector ? 5 : 2);
        const rayAlpha = 0.60 + Math.sin(time * 4.2 + r) * 0.25;

        // Left Radiant Jet
        ctx.save();
        ctx.shadowColor = isInjector ? '#ef4444' : '#fbbf24';
        ctx.shadowBlur = 8;
        const leftRayGrad = ctx.createLinearGradient(bLeftX, pyPos, bLeftX - rayLen, pyPos);
        leftRayGrad.addColorStop(0, isInjector ? `rgba(254, 240, 138, ${rayAlpha})` : `rgba(253, 224, 71, ${rayAlpha})`);
        leftRayGrad.addColorStop(0.6, isInjector ? `rgba(249, 115, 22, ${rayAlpha * 0.6})` : `rgba(245, 158, 11, ${rayAlpha * 0.6})`);
        leftRayGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.strokeStyle = leftRayGrad;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(bLeftX, pyPos);
        ctx.lineTo(bLeftX - rayLen, pyPos + Math.sin(r * 2 + time * 2) * 1.5);
        ctx.stroke();

        // Right Radiant Jet
        const rightRayGrad = ctx.createLinearGradient(bRightX, pyPos, bRightX + rayLen, pyPos);
        rightRayGrad.addColorStop(0, isInjector ? `rgba(254, 240, 138, ${rayAlpha})` : `rgba(253, 224, 71, ${rayAlpha})`);
        rightRayGrad.addColorStop(0.6, isInjector ? `rgba(249, 115, 22, ${rayAlpha * 0.6})` : `rgba(245, 158, 11, ${rayAlpha * 0.6})`);
        rightRayGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.strokeStyle = rightRayGrad;
        ctx.beginPath();
        ctx.moveTo(bRightX, pyPos);
        ctx.lineTo(bRightX + rayLen, pyPos + Math.cos(r * 2 + time * 2) * 1.5);
        ctx.stroke();
        ctx.restore();

        // Glowing Matrix Perforation Holes (Centered in each of the 4 layers)
        for (let c = 0; c < pCols; c++) {
          const pxPos = x - (barrelW - 14) / 2 + c * pColSpacing;

          // Glowing Ember Halo
          ctx.fillStyle = isInjector ? 'rgba(254, 240, 138, 0.95)' : 'rgba(251, 191, 36, 0.95)';
          ctx.beginPath();
          ctx.arc(pxPos, pyPos, 2.6, 0, Math.PI * 2);
          ctx.fill();

          // Dark Inner Core Slot
          ctx.fillStyle = '#060911';
          ctx.beginPath();
          ctx.arc(pxPos, pyPos, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // (D) DYNAMIC HEATED RADIATION EMBERS & PLASMA SPARKS
      ctx.save();
      for (let s = 0; s < 9; s++) {
        const emberPulse = (time * 2.6 + s * 0.35) % 1;
        const emberX = x + (Math.sin(s * 2.2 + time) * barrelW * 0.85) + Math.cos(time * 3.5 + s) * 5;
        const emberY = barrelTopY + 6 + (s * barrelH) / 9 + emberPulse * 10;
        const emberAlpha = Math.sin(emberPulse * Math.PI);

        ctx.fillStyle = isInjector
          ? `rgba(254, 240, 138, ${emberAlpha})`
          : `rgba(251, 191, 36, ${emberAlpha})`;
        ctx.shadowColor = isInjector ? '#fef08a' : '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(emberX, emberY, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Bottom Smooth Rounded 3D Bull-Plug / Domed Guide Shoe End
      const domeR = (barrelW - 4) / 2;
      const domeH = 8.5;
      
      // Dome Base 3D Shading
      ctx.fillStyle = create3DCylinderGrad(bLeftX + 1, bRightX - 1, 'dark_collar');
      ctx.beginPath();
      ctx.moveTo(bLeftX + 1, wellBottomY);
      ctx.bezierCurveTo(bLeftX + 1, wellBottomY + domeH * 0.75, x - domeR * 0.45, wellBottomY + domeH, x, wellBottomY + domeH);
      ctx.bezierCurveTo(x + domeR * 0.45, wellBottomY + domeH, bRightX - 1, wellBottomY + domeH * 0.75, bRightX - 1, wellBottomY);
      ctx.closePath();
      ctx.fill();

      // Rounded Bevel Edge Highlight on Dome
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(x, wellBottomY, domeR * 0.9, 0.15 * Math.PI, 0.85 * Math.PI, false);
      ctx.stroke();

      // Bottom Tip Ambient Shadow Drop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(x, wellBottomY + domeH + 1, domeR * 0.75, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic Vertical Fluid Flow Indicator (Glowing Core Arrow)
      const arrowCount = 3;
      const arrowSpan = collar3TopY - groundY - 20;
      for (let a = 0; a < arrowCount; a++) {
        const offset = ((time * (isInjector ? 1.4 : -1.4) + a / arrowCount) % 1 + 1) % 1;
        const ay = isInjector ? groundY + 16 + offset * arrowSpan : collar3TopY - 14 - offset * arrowSpan;

        ctx.save();
        ctx.shadowColor = isInjector ? '#ef4444' : '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.fillStyle = isInjector ? '#fde047' : '#ffffff';
        ctx.beginPath();
        if (isInjector) {
          ctx.moveTo(x, ay + 6);
          ctx.lineTo(x - 3.5, ay - 2);
          ctx.lineTo(x + 3.5, ay - 2);
        } else {
          ctx.moveTo(x, ay - 6);
          ctx.lineTo(x - 3.5, ay + 2);
          ctx.lineTo(x + 3.5, ay + 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    };

    // 4. ULTRA-REALISTIC VISCOUS LIQUID OIL & STEAM SWEEP FLOW RENDERER (THICK & WAVY FLUID DYNAMICS)
    const drawRealisticSteamChamberStreamFlow = (injX, prodX, resMidY, groundY, wellBottomY, injShaftW, prodShaftW) => {
      ctx.save();
      const leftW = injShaftW || 20;
      const rightW = prodShaftW || 24;
      const startX = injX + leftW / 2;
      const funnelEnd = prodX - rightW / 2;
      const totalSpan = funnelEnd - startX;
      const frontRatio = 0.68 * (Math.min(Math.max(dynamicRadius, 10), 35) / 22);
      const frontX = startX + totalSpan * Math.min(frontRatio, 0.85);

      // Thicker Vertical Envelope for Deep Heavy Oil Reservoir Sweeps
      const topHalfHeight = Math.min(height * 0.076, 54);
      const botHalfHeight = Math.min(height * 0.056, 40);

      // -------------------------------------------------------------------------
      // (A) MULTI-LAYERED VISCOUS HEAVY OIL SATURATION RIVER (WAVY FLUID BED)
      // -------------------------------------------------------------------------
      ctx.save();
      const oilBedGrad = ctx.createLinearGradient(startX, 0, funnelEnd, 0);
      oilBedGrad.addColorStop(0, 'rgba(180, 83, 9, 0.45)');
      oilBedGrad.addColorStop(0.28, 'rgba(217, 119, 6, 0.58)');
      oilBedGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.68)');
      oilBedGrad.addColorStop(0.9, 'rgba(217, 119, 6, 0.75)');
      oilBedGrad.addColorStop(1, 'rgba(180, 83, 9, 0.60)');

      ctx.fillStyle = oilBedGrad;
      ctx.beginPath();
      ctx.moveTo(startX, resMidY - topHalfHeight * 0.65);

      // Sinuous, wavy upper viscous boundary
      for (let step = 0; step <= 25; step++) {
        const sx = startX + (totalSpan * step) / 25;
        const wave =
          Math.sin(time * 2.2 + step * 0.55) * 6.5 +
          Math.cos(time * 3.0 + step * 0.35) * 4.0 +
          Math.sin(time * 1.5 + step * 0.8) * 2.5;
        const sy = resMidY - topHalfHeight * (0.65 + 0.35 * Math.sin((step / 25) * Math.PI)) + wave;
        if (step === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }

      // Funneling right boundary into PRD-01 bottom intake
      ctx.lineTo(funnelEnd, resMidY + 10);

      // Sinuous, wavy lower viscous boundary
      for (let step = 25; step >= 0; step--) {
        const sx = startX + (totalSpan * step) / 25;
        const wave =
          Math.cos(time * 2.0 + step * 0.6) * 6.8 +
          Math.sin(time * 2.6 + step * 0.32) * 4.2 +
          Math.cos(time * 1.6 + step * 0.75) * 2.2;
        const sy = resMidY + botHalfHeight * (0.65 + 0.35 * Math.sin((step / 25) * Math.PI)) + wave;
        ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // -------------------------------------------------------------------------
      // (B) ACTIVE THERMAL STEAM CHAMBER PLUME (HOT EXPANDING WAVY CORE)
      // -------------------------------------------------------------------------
      ctx.save();
      const steamGrad = ctx.createLinearGradient(startX, 0, frontX, 0);
      steamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
      steamGrad.addColorStop(0.2, 'rgba(254, 215, 170, 0.82)');
      steamGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.72)');
      steamGrad.addColorStop(0.85, 'rgba(234, 88, 12, 0.62)');
      steamGrad.addColorStop(1, 'rgba(251, 191, 36, 0.85)');

      ctx.fillStyle = steamGrad;
      ctx.beginPath();
      ctx.moveTo(startX, resMidY - topHalfHeight * 0.55);

      const p1X = startX + (frontX - startX) * 0.28;
      const p1Y = resMidY - topHalfHeight - Math.sin(time * 2.8) * 5;
      const p2X = startX + (frontX - startX) * 0.68;
      const p2Y = resMidY - topHalfHeight * 1.08 + Math.cos(time * 2.2) * 6;
      const p3X = frontX;
      const p3Y = resMidY - topHalfHeight * 0.7;
      ctx.bezierCurveTo(p1X, p1Y, p2X, p2Y, p3X, p3Y);

      const frontPeakX = frontX + 28 + Math.sin(time * 3.2) * 5;
      ctx.quadraticCurveTo(frontPeakX, resMidY + Math.sin(time * 2.5) * 4, p3X, resMidY + botHalfHeight * 0.75);

      const b2X = startX + (frontX - startX) * 0.65;
      const b2Y = resMidY + botHalfHeight * 1.02 - Math.sin(time * 2.2) * 5;
      const b1X = startX + (frontX - startX) * 0.26;
      const b1Y = resMidY + botHalfHeight * 0.78 + Math.cos(time * 2.8) * 5;
      ctx.bezierCurveTo(b2X, b2Y, b1X, b1Y, startX, resMidY + botHalfHeight * 0.55);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 146, 60, 0.95)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();

      // -------------------------------------------------------------------------
      // (C) 22 THICK DYNAMIC VISCOUS STREAM VEINS (WAVY SINUOUS LIQUID CURVES)
      // -------------------------------------------------------------------------
      ctx.save();
      const numStreamLines = 22;
      for (let s = 0; s < numStreamLines; s++) {
        const streamRatio = (s / (numStreamLines - 1) - 0.5) * 2; // -1 to +1
        const waveSpeed = 2.2 + (s % 3) * 0.5;
        const alpha = 0.45 + Math.sin(time * 2 + s) * 0.20;

        const isCoreStream = Math.abs(streamRatio) < 0.45;
        ctx.strokeStyle = isCoreStream
          ? `rgba(254, 240, 138, ${alpha})`
          : `rgba(245, 158, 11, ${alpha * 0.9})`;
        // Thicker Stream Veins
        ctx.lineWidth = 1.8 + (1 - Math.abs(streamRatio)) * 3.2;

        ctx.beginPath();
        for (let lx = startX + 4; lx <= funnelEnd; lx += 10) {
          const progressT = (lx - startX) / totalSpan;
          const compression = progressT > 0.65 ? 1 - (progressT - 0.65) * 1.7 * Math.abs(streamRatio) : 1;

          // Organic Multi-Harmonic Sinuous Wavy Motion
          const wave1 = Math.sin(lx * 0.024 - time * waveSpeed + s * 0.75) * 10.5;
          const wave2 = Math.cos(lx * 0.052 + time * 1.7 + s * 1.3) * 4.8;
          const wave3 = Math.sin(lx * 0.09 - time * 3.0 + s * 2.0) * 2.2;
          const undulation = (wave1 + wave2 + wave3) * (1 - progressT * 0.3);

          const ly = resMidY + streamRatio * (topHalfHeight * 0.85) * compression + undulation;

          if (lx === startX + 4) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------------------
      // (D) CONCENTRIC ISOTHERMAL SHOCK WAVEFRONTS (PULSING LIQUID HEAT WAVES)
      // -------------------------------------------------------------------------
      ctx.save();
      const numArcs = 5;
      for (let a = 0; a < numArcs; a++) {
        const arcPulse = (time * 1.6 + a * 0.22) % 1;
        const arcX = frontX - 16 + a * 14 + arcPulse * 12;
        const arcGlow = 0.95 - a * 0.16;

        ctx.strokeStyle = `rgba(253, 224, 71, ${arcGlow})`;
        ctx.lineWidth = 2.4 - a * 0.3;
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(arcX - 18, resMidY - topHalfHeight * 0.95);
        ctx.quadraticCurveTo(arcX + 26, resMidY + Math.sin(time * 3 + a) * 3, arcX - 18, resMidY + botHalfHeight * 0.95);
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------------------
      // (E) MOBILIZED CRUDE OIL CONVERGENCE FUNNEL (POROUS SUCTION STREAM)
      // -------------------------------------------------------------------------
      ctx.save();
      const funnelGrad = ctx.createLinearGradient(frontX + 8, 0, funnelEnd, 0);
      funnelGrad.addColorStop(0, 'rgba(251, 191, 36, 0.72)');
      funnelGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.62)');
      funnelGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.52)');
      funnelGrad.addColorStop(1, 'rgba(251, 191, 36, 0.82)');

      ctx.fillStyle = funnelGrad;
      ctx.beginPath();
      ctx.moveTo(frontX + 16, resMidY - topHalfHeight * 0.75);
      ctx.quadraticCurveTo(
        (frontX + funnelEnd) * 0.5,
        resMidY - 10 + Math.sin(time * 2.2) * 4,
        funnelEnd,
        resMidY - 10
      );
      ctx.lineTo(funnelEnd, resMidY + 10);
      ctx.quadraticCurveTo(
        (frontX + funnelEnd) * 0.5,
        resMidY + 10 + Math.cos(time * 2.2) * 4,
        frontX + 16,
        resMidY + botHalfHeight * 0.75
      );
      ctx.closePath();
      ctx.fill();

      // Convergence Shimmer Streaks
      for (let s = -4; s <= 4; s++) {
        const sy = resMidY + s * 4.2;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.40 + Math.abs(s) * 0.08})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(frontX + 18, sy + s * 3.5);
        ctx.quadraticCurveTo(
          (frontX + funnelEnd) * 0.52,
          sy + Math.sin(time * 3 + s) * 3.5,
          funnelEnd,
          resMidY + s * 2.2
        );
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------------------
      // (F) DYNAMIC HIGH-LUMINANCE FLOW ARROWS (FOLLOWING WAVY STREAM PATH)
      // -------------------------------------------------------------------------
      const numInjArrows = 3;
      for (let ia = 0; ia < numInjArrows; ia++) {
        const iay = resMidY - 9 + ia * 9;
        const iLen = 17 + Math.sin(time * 5 + ia) * 3;
        drawFlowArrow(startX + 4, iay, iLen, ia % 2 === 0, 1.0);
      }

      const centerArrowsCount = 6;
      const arrowStep = (frontX - startX - 30) / centerArrowsCount;

      for (let c = 0; c < centerArrowsCount; c++) {
        const progressOffset = (time * 0.8 + c / centerArrowsCount) % 1;
        const cX = startX + 35 + (c + progressOffset * 0.6) * arrowStep;
        if (cX < frontX + 15) {
          // Wavy Sinusoidal Path for Flow Arrows
          const arrowWave = Math.sin(cX * 0.024 - time * 2.2) * 8.5 + Math.cos(cX * 0.052 + time * 1.6) * 4.0;
          const cY = resMidY + arrowWave;
          const arrowLen = 22 + (c === 2 || c === 3 ? 6 : 0);
          drawFlowArrow(cX, cY, arrowLen, true, 1.3);
        }
      }

      const frontWave = Math.sin(frontX * 0.024 - time * 2.2) * 8.5;
      drawFlowArrow(frontX - 4, resMidY + frontWave, 26, true, 1.35);
      drawFlowArrow((frontX + prodX) * 0.5, resMidY + Math.cos(time * 2) * 4, 24, true, 1.2);
      drawFlowArrow(funnelEnd - 26, resMidY, 22, true, 1.3);

      // -------------------------------------------------------------------------
      // (G) DIAGRAM BADGES & LABELS
      // -------------------------------------------------------------------------
      const chamberLabelX = startX + (frontX - startX) * 0.42;
      const chamberLabelY = resMidY - topHalfHeight - 20;

      ctx.save();
      ctx.fillStyle = 'rgba(12, 9, 7, 0.94)';
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(chamberLabelX - 60, chamberLabelY - 14, 120, 28, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillStyle = '#fed7aa';
      ctx.textAlign = 'center';
      ctx.fillText('Steam Chamber', chamberLabelX, chamberLabelY - 1);
      ctx.fillStyle = '#fdba74';
      ctx.font = '8px sans-serif';
      ctx.fillText('(Liquid Heavy Oil Mobilization)', chamberLabelX, chamberLabelY + 9);
      ctx.restore();

      const heatFrontLabelX = frontX + 48;
      const heatFrontLabelY = resMidY - topHalfHeight - 20;

      ctx.save();
      ctx.fillStyle = 'rgba(12, 9, 7, 0.94)';
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.90)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(heatFrontLabelX - 38, heatFrontLabelY - 10, 76, 20, 5);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.fillText('Heat Front', heatFrontLabelX, heatFrontLabelY + 4);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(frontX + 6, resMidY - 10, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.moveTo(frontX + 6, resMidY - 10);
      ctx.lineTo(heatFrontLabelX - 42, heatFrontLabelY);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    };

    // 5. Draw Depth Scale Markers on Left Margin (0m - 1200m)
    const drawDepthScale = (groundY, wellBottomY) => {
      ctx.save();
      const leftX = width * 0.038;
      const depths = [
        { label: '0', d: 0 },
        { label: '200', d: 200 },
        { label: '400', d: 400 },
        { label: '600', d: 600 },
        { label: '800', d: 800 },
        { label: '1,000', d: 1000 },
        { label: '1,200', d: 1200 }
      ];

      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText('Depth (m)', leftX - 4, groundY + 12);

      depths.forEach((item, idx) => {
        const frac = item.d / 1200;
        const dy = groundY + 28 + frac * (wellBottomY - groundY - 26);

        // Tick mark
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX - 4, dy);
        ctx.lineTo(leftX + 4, dy);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '500 8.5px sans-serif';
        ctx.fillText(item.label, leftX + 8, dy + 3);
      });
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      // Coordinate Anchors matched precisely to pre-drilled holes in cropped panoramic background
      const injX = width * 0.233;
      const prodX = width * 0.7885;
      const groundY = height * 0.149;
      const pipeY = groundY - 6;
      const wellBottomY = height * 0.855;
      const resMidY = height * 0.810;
      const injShaftW = Math.max(42, Math.min(62, width * 0.046));
      const prodShaftW = Math.max(44, Math.min(66, width * 0.049));

      if (showStreamlines) {
        // 0. RENDER DEPTH SCALE
        drawDepthScale(groundY, wellBottomY);

        // 1. RENDER SURFACE PROCESS FACILITY & STORAGE TANKS
        drawRealisticSurfaceFacility(injX, prodX, groundY);

        // 2. RENDER STEAM CHAMBER, HEAT FRONT & CONVERGENCE STREAM FLOW (AT PIPE END / COMPLETIONS)
        drawRealisticSteamChamberStreamFlow(injX, prodX, resMidY, groundY, wellBottomY, injShaftW, prodShaftW);

        // 3. RENDER WELLBORE CASINGS & PERFORATED SCREEN BARRELS
        drawRealisticWellbore(injX, groundY, wellBottomY, 'injector', injShaftW);
        drawRealisticWellbore(prodX, groundY, wellBottomY, 'producer', prodShaftW);

        // 4. RENDER SURFACE CHRISTMAS TREES
        drawRealisticChristmasTree(injX, groundY, 'red');
        drawRealisticChristmasTree(prodX, groundY, 'dark');

        // 5. DYNAMIC FLOATING LIQUID DROPLETS, OIL GLOBULES & STEAM BUBBLES
        particles.forEach((p) => {
          p.progress += p.speed * flowSpeedMultiplier;
          if (p.progress > 1) {
            p.progress = 0;
            p.offsetY = (Math.random() - 0.5) * 18;
          }

          let px = 0;
          let py = 0;
          let color = '#ea580c';
          let glowColor = 'rgba(234, 88, 12, 0.8)';

          if (p.section === 'injector_down') {
            px = injX + (Math.random() - 0.5) * 4;
            py = groundY + (wellBottomY - groundY) * p.progress;
            color = '#ef4444';
            glowColor = 'rgba(239, 68, 68, 0.95)';
          } else if (p.section === 'reservoir_sweep') {
            const t = p.progress;
            const startX = injX + injShaftW / 2;
            const endX = prodX - prodShaftW / 2;
            px = startX + (endX - startX) * t;

            // Wavy serpentine multi-harmonic stream path
            const wave1 = Math.sin(px * 0.024 - time * 2.2 + p.phase) * 9.5;
            const wave2 = Math.cos(px * 0.052 + time * 1.6 + p.phase) * 4.2;
            const floatingWobble = Math.sin(time * p.wobbleFreq + p.phase) * p.wobbleAmp * 0.8;
            py = resMidY + p.offsetY + (wave1 + wave2) * (1 - t * 0.25) + floatingWobble;

            if (t < 0.28) {
              // Superheated steam mist
              color = '#ffffff';
              glowColor = 'rgba(255, 255, 255, 0.95)';
            } else if (t < 0.62) {
              // Mobilized hot crude
              color = '#f97316';
              glowColor = 'rgba(249, 115, 22, 0.92)';
            } else {
              // Golden viscous heavy oil stream
              color = '#fbbf24';
              glowColor = 'rgba(251, 191, 36, 0.96)';
            }
          } else if (p.section === 'producer_up') {
            px = prodX + (Math.random() - 0.5) * 4;
            py = wellBottomY - (wellBottomY - groundY) * p.progress;
            color = '#f59e0b';
            glowColor = 'rgba(245, 158, 11, 0.95)';
          }

          ctx.save();
          ctx.shadowBlur = 10;
          ctx.shadowColor = glowColor;

          // (A) VISCOUS TRAILING DROPLET STREAK (LIQUID COMET TAIL)
          if (p.section === 'reservoir_sweep') {
            const tailLen = p.tailLength * (0.8 + p.speed * 120);
            const tailGrad = ctx.createLinearGradient(px - tailLen, py, px, py);
            tailGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            tailGrad.addColorStop(1, glowColor);

            ctx.strokeStyle = tailGrad;
            ctx.lineWidth = p.size * 0.9;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px - tailLen, py - Math.sin(time * 2 + p.phase) * 1.5);
            ctx.lineTo(px, py);
            ctx.stroke();
          }

          // (B) MAIN FLOATING LIQUID DROPLET BODY
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();

          // (C) SPECULAR DROPLET HIGHLIGHT (LIQUID SHINE)
          if (p.isBubble && p.size > 2.0) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - p.size * 0.35, py - p.size * 0.35, p.size * 0.38, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [showStreamlines, flowSpeedMultiplier, dynamicRadius, dynamicTemp]);

  return (
    <div
      style={
        isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              background: '#0a0806',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }
          : {
              position: 'relative',
              width: '100%',
              aspectRatio: '1024 / 504',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1.5px solid rgba(217, 119, 6, 0.5)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',
              background: '#0a0806'
            }
      }
    >
      {/* 1. PANORAMIC DESERT STRATA & RESERVOIR BACKGROUND IMAGE */}
      <img
        src={strataBgImg}
        alt="7-Layer Solid Strata Cutaway"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          userSelect: 'none',
          pointerEvents: 'none',
          filter: 'contrast(1.04) brightness(0.96) saturate(1.02)'
        }}
      />

      {/* 2. DYNAMIC 2D CANVAS WELLBORE, TANK FACILITY & STREAMFLOW OVERLAY */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      />

      {/* 3. TOP TELEMETRY HEADERS & REAL-TIME INJECTION DATA */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 20
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(234, 88, 12, 0.65)',
            padding: '0.55rem 0.9rem',
            borderRadius: '10px',
            color: '#1c1917',
            fontSize: '0.72rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            maxWidth: '390px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1.5px solid rgba(234, 88, 12, 0.4)',
              paddingBottom: '5px'
            }}
          >
            <span style={{ fontWeight: 900, color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', letterSpacing: '0.02em' }}>
              <Flame size={15} color="#ea580c" /> 7-LAYER SOLID STRATA STREAM FLOW
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#7c2d12',
                fontWeight: 900,
                background: 'rgba(234, 88, 12, 0.22)',
                border: '1.5px solid #ea580c',
                backdropFilter: 'blur(6px)',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              {oilFlowRate} BOPD
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5px',
              marginTop: '2px',
              fontSize: '0.68rem'
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(234, 88, 12, 0.35)',
                padding: '4px 7px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1c1917'
              }}
            >
              <Flame size={12} color="#ea580c" />
              <span>
                Steam: <strong style={{ color: '#7c2d12' }}>{sandboxSteamTemp}°C</strong> ({typeof sandboxSteamQuality === 'number' && sandboxSteamQuality <= 1 ? (sandboxSteamQuality * 100).toFixed(0) + '%' : sandboxSteamQuality + '%'})
              </span>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(234, 88, 12, 0.35)',
                padding: '4px 7px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1c1917'
              }}
            >
              <Droplets size={12} color="#ea580c" />
              <span>
                Darcy Vel: <strong style={{ color: '#7c2d12' }}>{oilFlowVelocity} m/d</strong>
              </span>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(234, 88, 12, 0.35)',
                padding: '4px 7px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1c1917'
              }}
            >
              <Thermometer size={12} color="#ea580c" />
              <span>
                Core T: <strong style={{ color: '#7c2d12' }}>{dynamicTemp}°C</strong>
              </span>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(234, 88, 12, 0.35)',
                padding: '4px 7px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1c1917'
              }}
            >
              <Activity size={12} color="#ea580c" />
              <span>
                Plume Front: <strong style={{ color: '#7c2d12' }}>{dynamicRadius}m</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TOP-RIGHT CONTROLS: FULLSCREEN & CALLOUT TOGGLES */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          zIndex: 25
        }}
      >
        <button
          onClick={() => setShowTelemetryCards(!showTelemetryCards)}
          style={{
            background: showTelemetryCards ? 'rgba(217, 119, 6, 0.35)' : 'rgba(15, 12, 9, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(217, 119, 6, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.75)'
          }}
          title="Toggle Wellbore Callout Telemetry Cards"
        >
          <Info size={13} />
          <span>{showTelemetryCards ? 'Callouts ON' : 'Callouts'}</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          style={{
            background: isFullscreen ? '#d97706' : 'rgba(15, 12, 9, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(217, 119, 6, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.75)'
          }}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* 5. INTERACTIVE WELLBORE & SURFACE MANIFOLD CALLOUTS (Positioned in margins) */}
      {showTelemetryCards && (
        <>
          {/* Left Well: Steam Injector Wellbore Callout (Left Margin) */}
          <div
            style={{
              position: 'absolute',
              top: '38%',
              left: '12px',
              maxWidth: '190px',
              background: 'rgba(15, 8, 8, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(239, 68, 68, 0.7)',
              borderRadius: '6px',
              padding: '0.4rem 0.65rem',
              color: '#fee2e2',
              fontSize: '0.65rem',
              zIndex: 15,
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#f87171' }}>
              <ArrowDown size={13} color="#ef4444" />
              <span>STEAM INJECTOR (INJ-01)</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#fca5a5', marginTop: '2px' }}>
              P_inj: <strong>92.4 bar</strong> &bull; T: <strong>{sandboxSteamTemp}&deg;C</strong>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>
              Perfs: 235m - 330m Payzone
            </div>
          </div>

          {/* Center: Dynamic Thermal Steam Sweep Front Callout */}
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(20, 10, 6, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(249, 115, 22, 0.75)',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              color: '#fed7aa',
              fontSize: '0.66rem',
              zIndex: 15,
              boxShadow: '0 6px 22px rgba(249, 115, 22, 0.4)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#fdba74' }}>
              <Flame size={13} color="#f97316" />
              <span>THERMAL COMBUSTION / STEAM SWEEP &rarr;</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#fed7aa', marginTop: '2px' }}>
              Sweep Radius: <strong style={{ color: '#fbbf24' }}>{dynamicRadius}m</strong> &bull; Viscosity: <strong style={{ color: '#ea580c' }}>{dynamicViscosity} cP</strong>
            </div>
          </div>

          {/* Right Well: Mobilized Oil Producer Wellbore Callout (Right Margin) */}
          <div
            style={{
              position: 'absolute',
              top: '38%',
              right: '12px',
              maxWidth: '190px',
              background: 'rgba(15, 12, 6, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(245, 158, 11, 0.75)',
              borderRadius: '6px',
              padding: '0.4rem 0.65rem',
              color: '#fef3c7',
              fontSize: '0.65rem',
              zIndex: 15,
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#fbbf24' }}>
              <ArrowUp size={13} color="#f59e0b" />
              <span>OIL PRODUCER (PRD-01)</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#fde68a', marginTop: '2px' }}>
              Flow: <strong style={{ color: '#ea580c' }}>{oilFlowRate} BOPD</strong> &bull; Darcy: <strong>{oilFlowVelocity} m/d</strong>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>
              Heavy Crude Mobilization: Active
            </div>
          </div>
        </>
      )}

      {/* 6. BOTTOM STRATIGRAPHIC HORIZON BADGE BAR */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(12, 9, 7, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(217, 119, 6, 0.4)',
          borderRadius: '8px',
          padding: '0.4rem 0.85rem',
          zIndex: 20,
          boxShadow: '0 6px 24px rgba(0,0,0,0.85)',
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Strata Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="#f59e0b" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b' }}>
            STRATA PROFILE:
          </span>
          <span style={{ fontSize: '0.68rem', color: '#e2e8f0' }}>
            7 Calibrated Horizons &bull; <strong style={{ color: '#fed7aa' }}>Main Heavy Oil Payzone (235 &ndash; 330m)</strong> Active Thermal
          </span>
        </div>

        {/* Center: Dual Render Mode Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.65)', padding: '2px', borderRadius: '24px', border: '1px solid rgba(217, 119, 6, 0.35)' }}>
          <button
            onClick={() => onToggleRenderMode && onToggleRenderMode('solid')}
            style={{
              background: renderMode === 'solid' ? 'linear-gradient(135deg, #b45309 0%, #ea580c 100%)' : 'transparent',
              color: renderMode === 'solid' ? '#ffffff' : '#fed7aa',
              border: 'none',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: renderMode === 'solid' ? '0 2px 10px rgba(234, 88, 12, 0.5)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🪨 7-Layer Solid Strata View</span>
          </button>
          <button
            onClick={() => onToggleRenderMode && onToggleRenderMode('xray')}
            style={{
              background: renderMode === 'xray' ? 'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)' : 'transparent',
              color: renderMode === 'xray' ? '#ffffff' : '#fed7aa',
              border: 'none',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: renderMode === 'xray' ? '0 2px 10px rgba(194, 65, 12, 0.5)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>💎 X-Ray Isotherm Shell View</span>
          </button>
        </div>

        {/* Right: Flow Speed Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.66rem', color: '#a8a29e' }}>
            Flow Speed:
          </span>
          <button
            onClick={() => setFlowSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1))}
            style={{
              background: 'rgba(217, 119, 6, 0.25)',
              border: '1px solid rgba(217, 119, 6, 0.5)',
              color: '#fed7aa',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.64rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{flowSpeedMultiplier}x Speed</span>
            <ChevronDown size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
