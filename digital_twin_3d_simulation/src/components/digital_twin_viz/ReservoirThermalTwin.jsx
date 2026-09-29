import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Thermometer,
  Flame,
  Droplets,
  Layers,
  Activity,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Zap,
  ChevronRight,
  Info,
  Maximize2,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Compass,
  Gauge,
  Eye
} from 'lucide-react';
import Reservoir3DViewport from './Reservoir3DViewport';
import Pump3DViewport from './Pump3DViewport';
import './digital_twin_3d.css';

export default function ReservoirThermalTwin({
  selectedWellId = 'B-17',
  twinState,
  depthProfileData,
  asphalteneData,
  cutoffData,
  onTriggerOptimization
}) {
  // --- View & Simulation States ---
  const [activeLayer, setActiveLayer] = useState('temperature'); // 'temperature' | 'viscosity' | 'saturation' | 'pressure'
  const [viewProjection, setViewProjection] = useState('3d'); // '3d' (7-Layer Strata View by default) | '2d'
  const [isPlaying, setIsPlaying] = useState(false);
  const [simDay, setSimDay] = useState(45); // 0 to 90 days into CSS cycle
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hoverCoord, setHoverCoord] = useState(null); // { r, x, y, temp, visc, mobility }
  const [selectedDepth, setSelectedDepth] = useState(650); // meters for depth probe
  const [activeTab, setActiveTab] = useState('plume'); // 'plume' | 'wellbore' | 'energy' | 'asphaltene'
  const [pulseActive, setPulseActive] = useState(false);

  // --- 3D Interactive Model Navigation & Section Isolation States ---
  const [rotAngle, setRotAngle] = useState(0); // Azimuth angle (-PI to PI)
  const [tiltAngle, setTiltAngle] = useState(Math.PI / 6); // Elevation pitch angle
  const [zoom3d, setZoom3d] = useState(1.0); // 3D Zoom scale
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // 3D Pan translation
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all'); // 'all' | 'z1' | 'z2' | 'z3' | 'z4' | 'exploded'
  const [expansionFactor, setExpansionFactor] = useState(1.35); // Radial/vertical section expansion factor
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, rot: 0, tilt: 0, panX: 0, panY: 0, isRightClick: false });

  // --- Sensitivity Sliders for Sandbox ---
  const [sandboxSteamTemp, setSandboxSteamTemp] = useState(260); // °C
  const [sandboxSteamQuality, setSandboxSteamQuality] = useState(0.80); // fraction
  const [sandboxSlugTonnes, setSandboxSlugTonnes] = useState(1600); // tonnes
  const [sandboxNetPay, setSandboxNetPay] = useState(18); // meters

  // --- Downhole ESP Pump Completion States ---
  const [selectedPumpPart, setSelectedPumpPart] = useState('pump'); // 'wellhead' | 'tubing' | 'separator' | 'pump' | 'intake' | 'seal' | 'motor' | 'perforations'
  const [pumpViewMode, setPumpViewMode] = useState('interactive'); // 'interactive' | 'blueprint' | 'split'
  const [wellboreSubTab, setWellboreSubTab] = useState('wireline_log'); // 'wireline_log'

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Extract baseline metrics
  const resTemp = twinState?.reservoir?.temperature_c !== undefined ? Number(twinState.reservoir.temperature_c) : 76.4;
  const resVisc = twinState?.reservoir?.viscosity_cp !== undefined ? Number(twinState.reservoir.viscosity_cp) : 1850;
  const resPressure = twinState?.reservoir?.pressure_bar !== undefined ? Number(twinState.reservoir.pressure_bar) : 108.5;
  const baseHeatedRadius = twinState?.reservoir?.heated_radius_m !== undefined ? Number(twinState.reservoir.heated_radius_m) : 7.8;
  const coolingRate = twinState?.reservoir?.cooling_rate_c_day !== undefined ? Number(twinState.reservoir.cooling_rate_c_day) : 0.32;
  const steamInjected = twinState?.reservoir?.cumulative_steam_injected_ton || 1500;

  // Calculate dynamic radius and temperature based on current simDay and sandbox injection parameters
  // Enthalpy-driven Marx-Langenheim thermal kinetics
  const dynamicTemp = useMemo(() => {
    const decay = Math.exp(-0.015 * simDay);
    const qualityBoost = 0.7 + 0.35 * sandboxSteamQuality;
    const slugFactor = Math.pow(sandboxSlugTonnes / 1600, 0.22);
    const tempRise = (sandboxSteamTemp - 48) * 0.75 * qualityBoost * slugFactor;
    return Math.max(48, Math.min(320, Number((48 + tempRise * decay).toFixed(1))));
  }, [simDay, sandboxSteamTemp, sandboxSteamQuality, sandboxSlugTonnes]);

  const dynamicRadius = useMemo(() => {
    // Total thermal energy injected in GJ: Q = m * [h_sensible + x * h_latent]
    const h_sensible = 0.00418 * (sandboxSteamTemp - 48); // GJ/tonne
    const h_latent = (0.0022 - 0.0000025 * sandboxSteamTemp) * sandboxSteamQuality; // GJ/tonne
    const totalEnthalpyPerTonne = h_sensible + h_latent;
    const steamEnergyGJ = sandboxSlugTonnes * totalEnthalpyPerTonne;
    
    // Volumetric rock-fluid heat capacity: ~2.35 MJ/m3/C
    const avgDeltaT = 42.0; // °C
    const volumetricHeatCapacityGJ = 0.00235 * avgDeltaT;
    const cylinderVolume = steamEnergyGJ / volumetricHeatCapacityGJ;
    const netPayHeight = Math.max(4, sandboxNetPay);
    const maxRadius = Math.sqrt(cylinderVolume / (Math.PI * netPayHeight));
    
    // Dissipation with CSS cycle day
    const decayFactor = Math.max(0.35, Math.exp(-0.01 * simDay));
    const currentR = maxRadius * decayFactor;
    return Math.max(3.0, Math.min(25.0, Number(currentR.toFixed(1))));
  }, [simDay, sandboxSteamTemp, sandboxSteamQuality, sandboxSlugTonnes, sandboxNetPay]);

  const dynamicViscosity = useMemo(() => {
    // Andrade heavy oil viscosity law for Baghewala heavy crude (17-19 API)
    const tK = dynamicTemp + 273.15;
    return Math.round(Math.max(15, 0.0042 * Math.exp(4650.0 / tK)));
  }, [dynamicTemp]);

  // Mobility ratio lambda = (k_o / mu_o) / (k_w / mu_w)
  const dynamicMobility = useMemo(() => {
    return Number((1200 / Math.max(15, dynamicViscosity)).toFixed(2));
  }, [dynamicViscosity]);

  // Dynamic heavy crude production inflow rate (BOPD) coupled to thermal mobility, net pay, and radius
  const oilFlowRate = useMemo(() => {
    const baseRate = 180;
    const mobilityTerm = Math.pow(Math.max(0.05, dynamicMobility), 0.45);
    const payzoneTerm = sandboxNetPay / 18;
    const radiusTerm = Math.sqrt(dynamicRadius / 7.8);
    const rate = baseRate * mobilityTerm * payzoneTerm * radiusTerm;
    return Math.round(Math.max(25, Math.min(850, rate)));
  }, [dynamicMobility, sandboxNetPay, dynamicRadius]);

  // Live Darcy inflow velocity in m/day
  const oilFlowVelocity = useMemo(() => {
    return Number((0.45 * Math.sqrt(Math.max(0.05, dynamicMobility)) * (dynamicRadius / 10)).toFixed(2));
  }, [dynamicMobility, dynamicRadius]);

  // Isotherm Advance Radii & Drag Reduction Table (Directly matching Marx-Langenheim thermal kinetics)
  const isothermTableData = useMemo(() => {
    const coreVisc = Math.max(15, Math.round(dynamicViscosity * 0.16));
    const transVisc = Math.max(45, Math.round(dynamicViscosity * 0.65));
    const warmVisc = Math.max(180, Math.round(dynamicViscosity * 2.2));
    const matrixVisc = Math.min(12500, Math.max(800, Math.round(dynamicViscosity * 8.5)));

    return [
      {
        name: '> 180°C (Core)',
        color: '#fbbf24',
        radius: (dynamicRadius * 0.38).toFixed(1) + ' m',
        viscosity: `${coreVisc} cP`,
        mobility: (1200 / coreVisc).toFixed(1)
      },
      {
        name: '120°C – 160°C',
        color: '#f59e0b',
        radius: (dynamicRadius * 0.68).toFixed(1) + ' m',
        viscosity: `${transVisc} cP`,
        mobility: (1200 / transVisc).toFixed(1)
      },
      {
        name: '80°C – 110°C',
        color: '#ea580c',
        radius: (dynamicRadius * 0.95).toFixed(1) + ' m',
        viscosity: `${warmVisc} cP`,
        mobility: (1200 / warmVisc).toFixed(2)
      },
      {
        name: '52°C – 75°C',
        color: '#b91c1c',
        radius: (dynamicRadius * 1.35).toFixed(1) + ' m',
        viscosity: `${matrixVisc.toLocaleString()} cP`,
        mobility: (1200 / matrixVisc).toFixed(2)
      }
    ];
  }, [dynamicRadius, dynamicViscosity]);

  // Layer configurations with physical parameters, units, formulas and custom color schemes
  const LAYER_CONFIGS = useMemo(() => ({
    temperature: {
      id: 'temperature',
      label: 'Temperature (T)',
      shortName: 'Temperature Field T(r, z)',
      unit: '°C',
      icon: Flame,
      color: '#ea580c',
      badgeBg: 'rgba(234, 88, 12, 0.2)',
      badgeBorder: '#ea580c',
      glow: 'rgba(234, 88, 12, 0.45)',
      equation: 'Marx-Langenheim Energy Partition & Radial Conduction',
      coreValue: `${dynamicTemp.toFixed(1)} °C`,
      boundaryValue: '48.0 °C',
      gradient: 'linear-gradient(to right, #431407, #7c2d12, #9a3412, #c2410c, #ea580c, #fdba74)',
      stops: ['48°C (Native Sand)', '75°C (Wave)', '120°C (Mobilized)', '180°C (Condensate)', `${sandboxSteamTemp}°C (Steam Chest)`],
      legendSubLeft: 'In-situ Sandstone Baseline: 48°C',
      legendSubCenter: 'Iso-Contours: ΔT = 25°C',
      legendSubRight: 'Superheated Steam Core'
    },
    viscosity: {
      id: 'viscosity',
      label: 'Viscosity (μ)',
      shortName: 'Viscosity Profile μ(T)',
      unit: 'cP',
      icon: Droplets,
      color: '#c2410c',
      badgeBg: 'rgba(194, 65, 12, 0.2)',
      badgeBorder: '#c2410c',
      glow: 'rgba(194, 65, 12, 0.45)',
      equation: 'Andrade Exponential Heavy Oil Viscosity Law: μ = A·exp(B/T)',
      coreValue: `${dynamicViscosity.toLocaleString()} cP`,
      boundaryValue: '12,500 cP',
      gradient: 'linear-gradient(to right, #431407, #7c2d12, #c2410c, #ea580c, #f97316)',
      stops: ['>10,000 cP (Bitumen)', '4,500 cP (Sluggish)', '800 cP (Transition)', '150 cP (Mobilized)', '22 cP (Fluid Oil)'],
      legendSubLeft: 'Native Bitumen Cold Boundary',
      legendSubCenter: 'Mobilization Threshold: μ < 150 cP',
      legendSubRight: 'Pumpable Inflow Zone'
    },
    saturation: {
      id: 'saturation',
      label: 'Steam Vapor (Sg)',
      shortName: 'Steam Chamber Saturation Sg',
      unit: 'fraction',
      icon: Layers,
      color: '#ea580c',
      badgeBg: 'rgba(234, 88, 12, 0.2)',
      badgeBorder: '#ea580c',
      glow: 'rgba(234, 88, 12, 0.45)',
      equation: 'Two-Phase Steam Enthalpy Partition & Gravity Override Cresting',
      coreValue: `${(sandboxSteamQuality * 0.95).toFixed(2)} Sg`,
      boundaryValue: '0.00 Sg (Liquid)',
      gradient: 'linear-gradient(to right, #292524, #44403c, #78350f, #c2410c, #ea580c, #fdba74)',
      stops: ['0.00 (Native Liquid)', '0.25 (Condensate Zone)', '0.50 (Two-Phase Mists)', '0.80 (Vapor Rich)', '1.00 (Dry Steam Core)'],
      legendSubLeft: 'Liquid Hydrocarbon Matrix: 0.00 Sg',
      legendSubCenter: `Vapor Envelope: r = ${(dynamicRadius * 0.88).toFixed(1)}m`,
      legendSubRight: `Steam Core: ${(sandboxSteamQuality * 0.95).toFixed(2)} Sg`
    },
    pressure: {
      id: 'pressure',
      label: 'Pressure (P)',
      shortName: 'Reservoir Pressure Drawdown P(r)',
      unit: 'bar',
      icon: Activity,
      color: '#9a3412',
      badgeBg: 'rgba(154, 52, 18, 0.2)',
      badgeBorder: '#9a3412',
      glow: 'rgba(154, 52, 18, 0.45)',
      equation: 'Radial Darcy Semi-Steady State Drawdown Funnel: ΔP = (q·μ / 2πkh)·ln(r/rw)',
      coreValue: `${(resPressure * 0.22).toFixed(1)} bar`,
      boundaryValue: `${resPressure.toFixed(1)} bar`,
      gradient: 'linear-gradient(to right, #1c1917, #431407, #7c2d12, #c2410c, #ea580c, #fdba74)',
      stops: ['18 bar (BHP Sink)', '40 bar (Drawdown Front)', '65 bar (Mid-Drainage)', '90 bar (Outer Zone)', '110 bar (Far Field)'],
      legendSubLeft: 'Wellbore BHP Drawdown: 18.4 bar',
      legendSubCenter: 'Darcy Inflow Funnel: Δr = 2.5m',
      legendSubRight: 'Far-Field Reservoir: 110.0 bar'
    }
  }), [dynamicTemp, sandboxSteamTemp, dynamicViscosity, sandboxSteamQuality, resPressure, dynamicRadius]);

  const STRATA_LAYER_OPTIONS = [
    { id: 'all', label: 'All 7 Strata (Combined)' },
    { id: 'exploded', label: '💥 Exploded Strata View' },
    { id: 'l1', label: 'L1: Caprock (618-628m)' },
    { id: 'l2', label: 'L2: Upper Sand (628-640m)' },
    { id: 'l3', label: 'L3: Barrier Shale (640-650m)' },
    { id: 'l4', label: 'L4: Payzone #1 Plume (650-662m)' },
    { id: 'l5', label: 'L5: Payzone #2 Wave (662-674m)' },
    { id: 'l6', label: 'L6: Lower Shale (674-684m)' },
    { id: 'l7', label: 'L7: Basement Floor (684-700m+)' }
  ];

  const activeLayerCfg = LAYER_CONFIGS[activeLayer] || LAYER_CONFIGS.temperature;

  // --- Pump Components Telemetry & Specification Dictionary ---
  const PUMP_COMPONENTS = useMemo(() => ({
    wellhead: {
      id: 'wellhead',
      name: 'Surface Wellhead & Christmas Tree',
      depth: '0 m (Ground Level)',
      color: '#d97706',
      status: 'OPTIMAL (18.4 bar)',
      tags: ['Dual Wing Valves', 'Crown Pressure Gauge', 'Production Elbow'],
      desc: 'Heavy forged bronze-alloy Christmas tree manifold equipped with crown pressure gauge, right-angle heavy crude production discharge line, and left annular casing gas vent line.',
      telemetry: [
        { label: 'Wellhead Tubing Pressure', val: '18.4 bar', status: 'normal' },
        { label: 'Casing Annular Pressure', val: '6.2 bar', status: 'normal' },
        { label: 'Discharge Fluid Temperature', val: '74.2 °C', status: 'optimal' },
        { label: 'Flowline Emulsion Viscosity', val: '142 cP', status: 'optimal' }
      ]
    },
    tubing: {
      id: 'tubing',
      name: 'Production Tubing String (2-7/8" EUE)',
      depth: '0 – 1,020 m MD',
      color: '#94a3b8',
      status: 'ACTIVE FLOW (342 bopd)',
      tags: ['2-7/8" EUE N-80', 'Internal Phenolic Coating', 'Velocity 1.4 m/s'],
      desc: 'High-strength seamless steel production string conveying mobilized heavy crude emulsion under hydraulic boost from the pump discharge head to the surface wellhead manifold.',
      telemetry: [
        { label: 'Lifted Heavy Crude Rate', val: '342 bopd', status: 'optimal' },
        { label: 'Upward Fluid Velocity', val: '1.42 m/s', status: 'normal' },
        { label: 'Hydrostatic Tubing Head', val: '98.5 bar', status: 'normal' },
        { label: 'Friction Drag Loss', val: '0.16 bar/100m', status: 'low' }
      ]
    },
    separator: {
      id: 'separator',
      name: 'Rotary Gas Separator & Discharge Head',
      depth: '1,020 – 1,038 m MD',
      color: '#dc2626',
      status: '94.2% SEPARATION EFFICIENCY',
      tags: ['Vortex Centrifuge', 'Annular Gas Bypass', 'Anti-Gas Locking'],
      desc: 'Downhole rotary vortex gas separator that strips free solution gas from heavy emulsion and vents it into the casing annulus (red flow arrows), protecting downstream pump impellers from vapor lock.',
      telemetry: [
        { label: 'Gas Separation Efficiency', val: '94.2%', status: 'optimal' },
        { label: 'Annular Venting Rate', val: '1,450 m³/d', status: 'normal' },
        { label: 'Suction Gas Void Fraction', val: '11.8%', status: 'safe' },
        { label: 'Vortex Rotor RPM', val: '3,500 RPM', status: 'synced' }
      ]
    },
    pump: {
      id: 'pump',
      name: 'Multi-Stage Centrifugal Pump Assembly',
      depth: '1,038 – 1,085 m MD',
      color: '#ef4444',
      status: 'HIGH EFFICIENCY (78.4%)',
      tags: ['84 Compression Stages', 'Ni-Resist Impellers', '1,240m Dynamic Head'],
      desc: 'Multi-stage segmented centrifugal pump housing with high-hardness abrasion-resistant stages engineered for heavy, thermal-mobilized viscous crude lifting with minimal shear degradation.',
      telemetry: [
        { label: 'Total Dynamic Head (TDH)', val: '1,240 m', status: 'optimal' },
        { label: 'Differential Boost Pressure', val: '112 bar', status: 'high' },
        { label: 'Volumetric Pump Efficiency', val: '78.4%', status: 'optimal' },
        { label: 'VFD Operating Frequency', val: '52.0 Hz', status: 'locked' }
      ]
    },
    intake: {
      id: 'intake',
      name: 'Golden Slotted Intake Screen Cage',
      depth: '1,085 – 1,098 m MD',
      color: '#fbbf24',
      status: 'PUMP INTAKE (PIP 38.6 bar)',
      tags: ['Golden Brass Alloy', '50-Mesh Slotted Filter', 'Submerged Inflow'],
      desc: 'Heavy brass/golden slotted suction intake screen filtering formation particulate while channeling hot mobilized crude (green flow arrows) into the first pump stage suction eye.',
      telemetry: [
        { label: 'Pump Intake Pressure (PIP)', val: '38.6 bar', status: 'optimal' },
        { label: 'Intake Fluid Temperature', val: '96.5 °C', status: 'optimal' },
        { label: 'Local Crude Viscosity', val: '138 cP', status: 'mobilized' },
        { label: 'Submergence Depth Margin', val: '42.0 m', status: 'safe' }
      ]
    },
    seal: {
      id: 'seal',
      name: 'Protector / Mechanical Seal Section',
      depth: '1,098 – 1,110 m MD',
      color: '#dc2626',
      status: 'SEAL INTEGRITY 100%',
      tags: ['Tandem Bag Protectors', 'High-Load Thrust Bearing', 'Pressure Equalization'],
      desc: 'Mechanical seal chamber section isolating clean dielectric motor oil from wellbore fluids, equalizing internal/external pressures, and supporting pump axial thrust load.',
      telemetry: [
        { label: 'Axial Thrust Load', val: '14.2 kN', status: 'safe' },
        { label: 'Dielectric Insulation', val: '>1,000 MΩ', status: 'optimal' },
        { label: 'Barrier Chamber Temp', val: '104.2 °C', status: 'normal' },
        { label: 'Oil Volume Expansion', val: '2.8 L / 4.0 L', status: 'nominal' }
      ]
    },
    motor: {
      id: 'motor',
      name: 'Tandem Electric Submersible Motor (ESP)',
      depth: '1,110 – 1,135 m MD',
      color: '#991b1b',
      status: '150 HP DUAL SECTION',
      tags: ['2-Pole Squirrel Cage', '3-Phase 460V / 48A', 'High Starting Torque'],
      desc: 'Dual-tandem oil-filled 2-pole submersible electric induction motor delivering 150 HP high starting torque to restart heavy crude columns after cyclic steam shut-ins.',
      telemetry: [
        { label: 'Motor Winding Temp', val: '118.5 °C', status: 'safe (<150°C)' },
        { label: 'Motor Current Draw', val: '48.2 A', status: 'nominal' },
        { label: 'Motor Power Factor', val: '0.87 cos φ', status: 'optimal' },
        { label: 'Tri-Axial Vibration', val: '0.22 in/s', status: 'smooth' }
      ]
    },
    perforations: {
      id: 'perforations',
      name: 'Sandface Casing Perforations ("Produced" Inflow)',
      depth: '1,120 – 1,150 m MD',
      color: '#22c55e',
      status: 'THERMAL PAYZONE INFLOW',
      tags: ['Jodhpur Sandstone Pay', '12 SPF High-Density', 'Steam Mobilized Bitumen'],
      desc: 'High-density gun perforations across the Jodhpur sandstone pay interval allowing hot, mobilized heavy oil and condensed steam to flow freely into the wellbore casing string.',
      telemetry: [
        { label: 'Formation Inflow Rate', val: '342 bopd', status: 'optimal' },
        { label: 'Reservoir Sandface Temp', val: '148.0 °C', status: 'hot' },
        { label: 'Drawdown Differential', val: '22.4 bar', status: 'optimal' },
        { label: 'Sand Cut / Solids', val: '< 0.3%', status: 'clean' }
      ]
    }
  }), []);

  // Handle Play/Pause playback timer
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimDay((prev) => {
          if (prev >= 90) return 0;
          return prev + 1;
        });
      }, 150 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Render 2D / 3D Canvas Thermal Plume & Isotherms with high visual fidelity
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const container = canvas.parentElement;
      const rect = container ? container.getBoundingClientRect() : { width: 800, height: 480 };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width || 800;
      const height = rect.height || 480;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      // Strict 1:1 circular metric scale without elliptical distortion
      const scale = (Math.min(width, height) * 0.43) / 25; // 25 meters radius max

      if (viewProjection === '2d') {
        // ==========================================
        // 2D HIGH-DEFINITION LAYER-WISE PETROPHYSICAL PLAN
        // ==========================================
        const normalizeStratumId = (id) => {
          if (!id || id === 'all' || id === 'exploded') return 'l4';
          if (id === 'z1' || id === 'payzone_1' || id === 'l4') return 'l4';
          if (id === 'z2' || id === 'payzone_2' || id === 'l5') return 'l5';
          if (id === 'z3' || id === 'barrier_shale' || id === 'l3') return 'l3';
          if (id === 'z4' || id === 'upper_sand' || id === 'l2') return 'l2';
          if (id === 'l1' || id === 'caprock') return 'l1';
          if (id === 'l6' || id === 'lower_shale') return 'l6';
          if (id === 'l7' || id === 'basement') return 'l7';
          return id;
        };
        const activeStrataId = normalizeStratumId(selectedSectionFilter);
        
        const STRATA_2D_META = {
          l1: {
            title: 'LAYER 1: OVERBURDEN CAPROCK SOIL CRUST',
            depth: '618m – 628m (10m Thick)',
            lithology: 'Organic Soil Crust / Dense Calcareous Shale',
            porosity: '4.2%',
            perm: '0.05 mD',
            temp: '48.0 °C (Conductive Confinement: 76.0°C at Casing)',
            visc: '18,500 cP',
            role: 'Impermeable Top Thermal Containment Seal (Zero Steam Leakage)',
            bgGrad: ['#180e07', '#100904', '#080402'],
            accent: '#f59e0b',
            baseTemp: 48.0,
            casingTemp: 76.0,
            conductiveRadiusM: 14.5,
            isPayzone: false,
            cbl: '99.2% Cement Bond',
            hasStreamlines: true,
            flowFactor: 0.45,
            streamlineColor: '#fed7aa'
          },
          l2: {
            title: 'LAYER 2: UPPER TAN JODHPUR SANDSTONE',
            depth: '628m – 640m (12m Thick)',
            lithology: 'Medium-Grained Quartzose Sandstone Matrix',
            porosity: '18.5%',
            perm: '340 mD',
            temp: '68.5 °C (Upper Thermal Transition)',
            visc: '3,200 cP',
            role: 'Upper Transition Zone with Conductive Thermal Dissipation',
            bgGrad: ['#1c1008', '#120b06', '#080402'],
            accent: '#fbbf24',
            baseTemp: 68.5,
            casingTemp: 110.0,
            conductiveRadiusM: 16.5,
            isPayzone: false,
            cbl: '96.5% Cement Bond',
            hasStreamlines: true,
            flowFactor: 0.72,
            streamlineColor: '#fef08a'
          },
          l3: {
            title: 'LAYER 3: SLATE-BLUE SHALE BARRIER',
            depth: '640m – 650m (10m Thick)',
            lithology: 'Laminated Calcareous Marine Barrier Shale',
            porosity: '6.1%',
            perm: '0.12 mD',
            temp: '88.0 °C (Dual-Boundary Conductive Halo: 96.0°C at Casing)',
            visc: '1,450 cP',
            role: 'Impermeable Thermal Baffle Isolating Payzone #1 & #2',
            bgGrad: ['#180e07', '#100904', '#080402'],
            accent: '#ea580c',
            baseTemp: 88.0,
            casingTemp: 96.0,
            conductiveRadiusM: 15.0,
            isPayzone: false,
            cbl: '98.8% Cement Bond',
            hasStreamlines: true,
            flowFactor: 0.50,
            streamlineColor: '#93c5fd'
          },
          l4: {
            title: 'LAYER 4: MAIN PAYZONE #1 & STEAM INJECTION PLUME',
            depth: `650m – 662m (${sandboxNetPay}m Net Pay)`,
            lithology: 'Highly Porous Heavy-Oil Sandstone (Primary Target)',
            porosity: '26.8%',
            perm: '1,450 mD',
            temp: `${dynamicTemp} °C (Superheated Core)`,
            visc: `${dynamicViscosity} cP (Mobilized)`,
            role: 'Primary Cyclic Steam Injection & Production Horizon',
            bgGrad: ['#1f1208', '#140b05', '#080402'],
            accent: '#fbbf24',
            baseTemp: dynamicTemp,
            casingTemp: sandboxSteamTemp,
            isPayzone: true,
            hasPlume: true,
            plumeScale: 1.0,
            hasStreamlines: true,
            flowFactor: 1.0,
            streamlineColor: '#ffffff'
          },
          l5: {
            title: 'LAYER 5: SECONDARY PAYZONE #2 & MOBILIZED WAVE',
            depth: `662m – 674m (${sandboxNetPay}m Net Pay)`,
            lithology: 'High-Porosity Bitumen Sandstone Drainage Interval',
            porosity: '24.5%',
            perm: '1,180 mD',
            temp: '142.0 °C (Thermal Wave)',
            visc: '240 cP (Mobilized)',
            role: 'Secondary Steam Drainage Interval & Gravity Sump',
            bgGrad: ['#1f140a', '#140c06', '#080402'],
            accent: '#f59e0b',
            baseTemp: 142.0,
            casingTemp: 180.0,
            isPayzone: true,
            hasPlume: true,
            plumeScale: 0.88,
            hasStreamlines: true,
            flowFactor: 0.90,
            streamlineColor: '#fef08a'
          },
          l6: {
            title: 'LAYER 6: LOWER SLATE-BLUE SHALE BARRIER',
            depth: '674m – 684m (10m Thick)',
            lithology: 'Dense Silty Shale Matrix',
            porosity: '5.8%',
            perm: '0.08 mD',
            temp: '74.0 °C (Basal Heat Dissipation: 82.0°C at Casing)',
            visc: '2,800 cP',
            role: 'Basal Impermeable Barrier Preventing Underburden Influx',
            bgGrad: ['#180e07', '#100904', '#080402'],
            accent: '#ea580c',
            baseTemp: 74.0,
            casingTemp: 82.0,
            conductiveRadiusM: 13.8,
            isPayzone: false,
            cbl: '98.4% Cement Bond',
            hasStreamlines: true,
            flowFactor: 0.42,
            streamlineColor: '#93c5fd'
          },
          l7: {
            title: 'LAYER 7: BASAL BASEMENT BEDROCK / UNDERBURDEN',
            depth: '684m – 700m+ (Basement Floor)',
            lithology: 'Precambrian Basaltic Bedrock Matrix',
            porosity: '1.2%',
            perm: '0.01 mD',
            temp: '52.0 °C (Native Geothermal Baseline)',
            visc: '16,200 cP',
            role: 'Non-Productive Underburden Structural Basement Floor',
            bgGrad: ['#140b06', '#0d0704', '#080402'],
            accent: '#d97706',
            baseTemp: 52.0,
            casingTemp: 60.0,
            conductiveRadiusM: 11.0,
            isPayzone: false,
            cbl: '99.5% Cement Bond',
            hasStreamlines: true,
            flowFactor: 0.35,
            streamlineColor: '#fed7aa'
          }
        };

        const currentMeta = STRATA_2D_META[activeStrataId] || STRATA_2D_META.l4;

        // Dynamic Streamline Palette based on activeLayer parameter view
        const getStreamlineStyles = () => {
          if (activeLayer === 'viscosity') {
            return {
              gradColor: 'rgba(56, 189, 248, 0.98)',
              headColor: '#38bdf8',
              shadowColor: '#06b6d4'
            };
          } else if (activeLayer === 'saturation') {
            return {
              gradColor: 'rgba(192, 132, 252, 0.98)',
              headColor: '#e0e7ff',
              shadowColor: '#a855f7'
            };
          } else if (activeLayer === 'pressure') {
            return {
              gradColor: 'rgba(251, 191, 36, 0.98)',
              headColor: '#a3e635',
              shadowColor: '#f59e0b'
            };
          } else {
            // Temperature default: superheated radiant amber-gold
            return {
              gradColor: 'rgba(254, 240, 138, 0.98)',
              headColor: '#ffffff',
              shadowColor: '#fbbf24'
            };
          }
        };

        // 1. Background & Stratum Geometry Rendering
        const isAllStrataView = selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded';

        if (isAllStrataView) {
          // =========================================================================
          // ALL 7 STRATA: COMPOSITE MULTI-LAYER STRATIGRAPHIC VIEW
          // =========================================================================
          if (activeLayer === 'saturation') {
            // --- STEAM VAPOR SATURATION COMPOSITE FIELD (IMAGE 1) ---
            ctx.fillStyle = '#06070a';
            ctx.fillRect(0, 0, width, height);

            // Coordinate Cartesian Crosshairs
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, height);
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            // Golden Distance Concentric Rings (5m, 10m, 15m, 20m)
            [5, 10, 15, 20].forEach((dist) => {
              const rPx = dist * scale;
              ctx.beginPath();
              ctx.arc(centerX, centerY, rPx, 0, 2 * Math.PI);
              ctx.strokeStyle = dist === 5 ? 'rgba(217, 119, 6, 0.22)' : 'rgba(217, 119, 6, 0.12)';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              const lx = centerX + rPx;
              const ly = centerY;
              ctx.fillStyle = 'rgba(217, 119, 6, 0.55)';
              ctx.font = '600 8.5px monospace';
              ctx.fillText(`${dist}m`, lx - 14, ly - 5);
            });

            // Luminous Spherical Steam Vapor Cloud Plume
            const rPlumePx = Math.max(16, dynamicRadius * scale * 0.92);
            const steamGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, rPlumePx * 1.18);
            steamGrad.addColorStop(0, '#ffffff'); // Pure white steam core
            steamGrad.addColorStop(0.18, '#f1f5f9'); // Luminous white-silver mist
            steamGrad.addColorStop(0.38, '#cbd5e1'); // Silver-slate vapor
            steamGrad.addColorStop(0.58, '#64748b'); // Luminous slate-blue haze
            steamGrad.addColorStop(0.78, '#334155'); // Deep navy-slate mist
            steamGrad.addColorStop(0.92, '#1e293b'); // Dark indigo-slate envelope
            steamGrad.addColorStop(1.0, 'rgba(6, 7, 10, 0)'); // Seamless fade to black

            ctx.beginPath();
            ctx.arc(centerX, centerY, rPlumePx * 1.18, 0, 2 * Math.PI);
            ctx.fillStyle = steamGrad;
            ctx.fill();

            // Distinct Dashed Steam Chamber Envelope Contour Ring (Image 1)
            const rChamber = rPlumePx * 0.90;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rChamber, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(147, 197, 253, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Strategic Yellow / Golden Observation Nodes & Sensors (Image 1)
            const vaporObsPoints = [
              { x: centerX - 0.58 * rChamber, y: centerY - 0.32 * rChamber },
              { x: centerX - 0.94 * rChamber, y: centerY + 0.02 * rChamber },
              { x: centerX - 0.74 * rChamber, y: centerY + 0.68 * rChamber },
              { x: centerX - 0.06 * rChamber, y: centerY + 0.96 * rChamber },
              { x: centerX + 0.88 * rChamber, y: centerY + 0.76 * rChamber },
              { x: centerX + 1.48 * rChamber, y: centerY - 0.72 * rChamber },
              { x: centerX + 1.56 * rChamber, y: centerY + 0.04 * rChamber }
            ];

            vaporObsPoints.forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
              ctx.fillStyle = '#fde047';
              ctx.shadowColor = '#fbbf24';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 0.8;
              ctx.stroke();
            });

            // Outward Radial Steam Perforation Injection Jets
            const steamSpeedFactor = Math.max(0.6, (sandboxSlugTonnes / 1600) * (sandboxSteamTemp / 260));
            const steamTimeOffset = (Date.now() * steamSpeedFactor) / 900;
            for (let sj = 0; sj < 8; sj++) {
              const sjAngle = (sj * Math.PI) / 4;
              const sjPhase = (steamTimeOffset + sj * 0.125) % 1;
              const jetMaxR = Math.max(16, rChamber * 0.9);
              const jetCurR = 10 + sjPhase * (jetMaxR - 10);
              const jx = centerX + Math.cos(sjAngle) * jetCurR;
              const jy = centerY + Math.sin(sjAngle) * jetCurR;

              ctx.beginPath();
              ctx.arc(jx, jy, Math.max(1.4, 3.2 * (1 - sjPhase)), 0, 2 * Math.PI);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.shadowColor = '#93c5fd';
              ctx.shadowBlur = 5;
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            // Inward Darcy Oil Flow Streamlines in Steam Vapor Mode
            const flowSpeedFactor = Math.max(0.7, Math.min(6.0, (oilFlowRate / 75) + oilFlowVelocity * 0.5));
            const numStreamlines = Math.min(26, Math.max(10, Math.round(8 + (oilFlowRate / 30))));
            const timeOffset = (Date.now() * flowSpeedFactor) / 800;

            for (let s = 0; s < numStreamlines; s++) {
              const baseAngle = (s * 2 * Math.PI) / numStreamlines;
              const phase = (timeOffset + s * (1 / numStreamlines)) % 1;
              const outerR = Math.min(width * 0.44, Math.max(35, rChamber * 1.35));
              const innerR = 12;
              const currentR = outerR - phase * (outerR - innerR);
              const curAngle = baseAngle + phase * 0.35;

              const hx = centerX + Math.cos(curAngle) * currentR;
              const hy = centerY + Math.sin(curAngle) * currentR;
              const tailLen = Math.min(22, 10 + (oilFlowRate / 28));
              const tailR = Math.min(outerR, currentR + tailLen);
              const tailAngle = curAngle - 0.08;
              const tx = centerX + Math.cos(tailAngle) * tailR;
              const ty = centerY + Math.sin(tailAngle) * tailR;

              const streamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
              streamGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
              streamGrad.addColorStop(1, 'rgba(224, 231, 255, 0.95)');

              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(hx, hy);
              ctx.strokeStyle = streamGrad;
              ctx.lineWidth = Math.min(3.2, 1.4 + (oilFlowRate / 170));
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(hx, hy, Math.min(3.2, 1.8 + (oilFlowRate / 180)), 0, 2 * Math.PI);
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = '#818cf8';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            // Strata Pins for All 7 Layers
            const strataPins = [
              { angle: -Math.PI * 0.25, r: 4.5 * scale, label: 'L4: Payzone #1 Core', color: '#fbbf24' },
              { angle: 0.05, r: 9.0 * scale, label: 'L5: Payzone #2 Wave', color: '#f59e0b' },
              { angle: Math.PI * 0.35, r: 12.8 * scale, label: 'L3: Barrier Shale', color: '#93c5fd' },
              { angle: Math.PI * 0.65, r: 16.0 * scale, label: 'L2: Upper Sand', color: '#fed7aa' },
              { angle: Math.PI * 0.95, r: 19.0 * scale, label: 'L6: Lower Shale', color: '#93c5fd' },
              { angle: -Math.PI * 0.75, r: 22.0 * scale, label: 'L1: Caprock Seal', color: '#a8a29e' },
              { angle: -Math.PI * 0.45, r: 24.2 * scale, label: 'L7: Basement Bedrock', color: '#78716c' }
            ];
            strataPins.forEach(({ angle, r, label, color }) => {
              const px = centerX + Math.cos(angle) * r;
              const py = centerY + Math.sin(angle) * r;
              if (px > 20 && px < width - 60 && py > 60 && py < height - 50) {
                ctx.fillStyle = 'rgba(15, 12, 9, 0.88)';
                const textW = ctx.measureText ? Math.max(65, ctx.measureText(label).width + 8) : 75;
                ctx.fillRect(px - textW / 2, py - 6, textW, 13);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(px - textW / 2, py - 6, textW, 13);

                ctx.fillStyle = color;
                ctx.font = 'bold 7.5px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, px, py + 3.5);
                ctx.textAlign = 'left';
              }
            });

          } else if (activeLayer === 'pressure') {
            // --- RESERVOIR PRESSURE DRAWDOWN COMPOSITE FIELD (IMAGE 2) ---
            const bgGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, Math.max(width, height) * 0.65);
            bgGrad.addColorStop(0, '#161b0d');
            bgGrad.addColorStop(0.5, '#0e1208');
            bgGrad.addColorStop(1, '#080a05');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Coordinate Cartesian Crosshairs
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, height);
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            // Golden Distance Concentric Rings (5m, 10m, 15m, 20m)
            [5, 10, 15, 20].forEach((dist) => {
              const rPx = dist * scale;
              ctx.beginPath();
              ctx.arc(centerX, centerY, rPx, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(217, 119, 6, 0.16)';
              ctx.lineWidth = 1;
              ctx.setLineDash([3, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              const lx = centerX + rPx;
              const ly = centerY;
              ctx.fillStyle = 'rgba(217, 119, 6, 0.55)';
              ctx.font = '600 8.5px monospace';
              ctx.fillText(`${dist}m`, lx - 14, ly - 5);
            });

            // Pressure Drawdown Radial Gradient Funnel (Image 2)
            const rDrawPx = Math.max(25, scale * (dynamicRadius * 1.35 + 6));
            const pGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rDrawPx * 1.2);
            pGrad.addColorStop(0, '#ffffff'); // Glowing wellbore suction
            pGrad.addColorStop(0.08, '#ef4444'); // Hot scarlet wellbore drawdown
            pGrad.addColorStop(0.24, '#dc2626'); // Crimson pressure sink
            pGrad.addColorStop(0.44, '#b91c1c'); // Deep red drawdown slope
            pGrad.addColorStop(0.64, '#c2410c'); // Warm burnt orange transition
            pGrad.addColorStop(0.82, '#78350f'); // Dark golden-brown zone
            pGrad.addColorStop(0.94, '#292524'); // Near far-field matrix
            pGrad.addColorStop(1.0, 'rgba(14, 18, 8, 0)'); // Ambient undisturbed reservoir

            ctx.beginPath();
            ctx.arc(centerX, centerY, rDrawPx * 1.2, 0, 2 * Math.PI);
            ctx.fillStyle = pGrad;
            ctx.fill();

            // Strategic Yellow / Golden Observation Nodes & Sensors (Image 2)
            const pressObsPoints = [
              { x: centerX - 0.02 * rDrawPx, y: centerY - 0.64 * rDrawPx },
              { x: centerX - 0.54 * rDrawPx, y: centerY - 0.06 * rDrawPx },
              { x: centerX - 0.58 * rDrawPx, y: centerY + 0.38 * rDrawPx },
              { x: centerX - 0.02 * rDrawPx, y: centerY + 0.72 * rDrawPx },
              { x: centerX + 0.44 * rDrawPx, y: centerY + 0.62 * rDrawPx },
              { x: centerX + 0.52 * rDrawPx, y: centerY - 0.54 * rDrawPx },
              { x: centerX + 0.76 * rDrawPx, y: centerY - 0.06 * rDrawPx }
            ];

            pressObsPoints.forEach((pt) => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
              ctx.fillStyle = '#fde047';
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 0.8;
              ctx.stroke();
            });

            // Inward Darcy Pressure Gradient Flow Streamlines
            const flowSpeedFactor = Math.max(0.7, Math.min(6.0, (oilFlowRate / 75) + oilFlowVelocity * 0.5));
            const numStreamlines = Math.min(26, Math.max(10, Math.round(8 + (oilFlowRate / 30))));
            const timeOffset = (Date.now() * flowSpeedFactor) / 800;

            for (let s = 0; s < numStreamlines; s++) {
              const baseAngle = (s * 2 * Math.PI) / numStreamlines;
              const phase = (timeOffset + s * (1 / numStreamlines)) % 1;
              const outerR = Math.min(width * 0.44, Math.max(35, rDrawPx * 1.15));
              const innerR = 12;
              const currentR = outerR - phase * (outerR - innerR);
              const curAngle = baseAngle + phase * 0.35;

              const hx = centerX + Math.cos(curAngle) * currentR;
              const hy = centerY + Math.sin(curAngle) * currentR;
              const tailLen = Math.min(22, 10 + (oilFlowRate / 28));
              const tailR = Math.min(outerR, currentR + tailLen);
              const tailAngle = curAngle - 0.08;
              const tx = centerX + Math.cos(tailAngle) * tailR;
              const ty = centerY + Math.sin(tailAngle) * tailR;

              const streamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
              streamGrad.addColorStop(0, 'rgba(251, 191, 36, 0)');
              streamGrad.addColorStop(1, 'rgba(251, 191, 36, 0.95)');

              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(hx, hy);
              ctx.strokeStyle = streamGrad;
              ctx.lineWidth = Math.min(3.2, 1.4 + (oilFlowRate / 170));
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(hx, hy, Math.min(3.2, 1.8 + (oilFlowRate / 180)), 0, 2 * Math.PI);
              ctx.fillStyle = '#a3e635';
              ctx.shadowColor = '#f59e0b';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            // Strata Pins for All 7 Layers
            const strataPins = [
              { angle: -Math.PI * 0.25, r: 4.5 * scale, label: 'L4: Payzone #1 Core', color: '#fbbf24' },
              { angle: 0.05, r: 9.0 * scale, label: 'L5: Payzone #2 Wave', color: '#f59e0b' },
              { angle: Math.PI * 0.35, r: 12.8 * scale, label: 'L3: Barrier Shale', color: '#93c5fd' },
              { angle: Math.PI * 0.65, r: 16.0 * scale, label: 'L2: Upper Sand', color: '#fed7aa' },
              { angle: Math.PI * 0.95, r: 19.0 * scale, label: 'L6: Lower Shale', color: '#93c5fd' },
              { angle: -Math.PI * 0.75, r: 22.0 * scale, label: 'L1: Caprock Seal', color: '#a8a29e' },
              { angle: -Math.PI * 0.45, r: 24.2 * scale, label: 'L7: Basement Bedrock', color: '#78716c' }
            ];
            strataPins.forEach(({ angle, r, label, color }) => {
              const px = centerX + Math.cos(angle) * r;
              const py = centerY + Math.sin(angle) * r;
              if (px > 20 && px < width - 60 && py > 60 && py < height - 50) {
                ctx.fillStyle = 'rgba(15, 12, 9, 0.88)';
                const textW = ctx.measureText ? Math.max(65, ctx.measureText(label).width + 8) : 75;
                ctx.fillRect(px - textW / 2, py - 6, textW, 13);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(px - textW / 2, py - 6, textW, 13);

                ctx.fillStyle = color;
                ctx.font = 'bold 7.5px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, px, py + 3.5);
                ctx.textAlign = 'left';
              }
            });

          } else {
            // --- TEMPERATURE & VISCOSITY: 7-STRATA CONCENTRIC STRATIGRAPHIC VIEW ---
            // Base: Layer 7 Basement Bedrock
            ctx.fillStyle = '#0f0905';
            ctx.fillRect(0, 0, width, height);

            // Layer 1: Overburden Caprock Seal Crust (r = 20.5m to 23.5m)
            const rL1 = 23.5 * scale;
            const gradL1 = ctx.createRadialGradient(centerX, centerY, 20.5 * scale, centerX, centerY, rL1);
            gradL1.addColorStop(0, '#241208');
            gradL1.addColorStop(1, '#160a04');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL1, 0, 2 * Math.PI);
            ctx.fillStyle = gradL1;
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Layer 6: Lower Shale Barrier (r = 17.5m to 20.5m)
            const rL6 = 20.5 * scale;
            const gradL6 = ctx.createRadialGradient(centerX, centerY, 17.5 * scale, centerX, centerY, rL6);
            gradL6.addColorStop(0, '#381a0b');
            gradL6.addColorStop(1, '#241208');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL6, 0, 2 * Math.PI);
            ctx.fillStyle = gradL6;
            ctx.fill();
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Layer 2: Upper Tan Jodhpur Sandstone (r = 14.5m to 17.5m)
            const rL2 = 17.5 * scale;
            const gradL2 = ctx.createRadialGradient(centerX, centerY, 14.5 * scale, centerX, centerY, rL2);
            gradL2.addColorStop(0, '#522b10');
            gradL2.addColorStop(1, '#351a08');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL2, 0, 2 * Math.PI);
            ctx.fillStyle = gradL2;
            ctx.fill();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.3;
            ctx.stroke();

            // Layer 3: Slate-Blue Shale Barrier (r = 11.0m to 14.5m)
            const rL3 = 14.5 * scale;
            const gradL3 = ctx.createRadialGradient(centerX, centerY, 11.0 * scale, centerX, centerY, rL3);
            gradL3.addColorStop(0, '#6c3514');
            gradL3.addColorStop(1, '#451e0a');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL3, 0, 2 * Math.PI);
            ctx.fillStyle = gradL3;
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.4;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Layer 5: Secondary Payzone #2 Wave (r scales with heated radius)
            const rL5 = Math.max(6.0, Math.min(22.0, dynamicRadius * 1.05)) * scale;
            const gradL5 = ctx.createRadialGradient(centerX, centerY, Math.max(3.0, dynamicRadius * 0.55) * scale, centerX, centerY, rL5);
            gradL5.addColorStop(0, '#ea580c');
            gradL5.addColorStop(0.5, '#f59e0b');
            gradL5.addColorStop(1, '#991b1b');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL5, 0, 2 * Math.PI);
            ctx.fillStyle = gradL5;
            ctx.fill();
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Layer 4: Main Payzone #1 Superheated Steam Core (r scales with core heated radius)
            const rL4 = Math.max(3.5, Math.min(18.0, dynamicRadius * 0.65)) * scale;
            const gradL4 = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rL4);
            gradL4.addColorStop(0, '#ffffff');
            gradL4.addColorStop(0.2, '#fef08a');
            gradL4.addColorStop(0.55, '#f59e0b');
            gradL4.addColorStop(0.85, '#ea580c');
            gradL4.addColorStop(1, '#7f1d1d');
            ctx.beginPath();
            ctx.arc(centerX, centerY, rL4, 0, 2 * Math.PI);
            ctx.fillStyle = gradL4;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Outward Radial Steam Injection Jet Spray at Perforations
            const steamSpeedFactor = Math.max(0.6, (sandboxSlugTonnes / 1600) * (sandboxSteamTemp / 260));
            const steamTimeOffset = (Date.now() * steamSpeedFactor) / 900;
            for (let sj = 0; sj < 8; sj++) {
              const sjAngle = (sj * Math.PI) / 4;
              const sjPhase = (steamTimeOffset + sj * 0.125) % 1;
              const jetMaxR = Math.max(18, dynamicRadius * scale * 0.65);
              const jetCurR = 12 + sjPhase * (jetMaxR - 12);

              const jx = centerX + Math.cos(sjAngle) * jetCurR;
              const jy = centerY + Math.sin(sjAngle) * jetCurR;

              ctx.beginPath();
              ctx.arc(jx, jy, Math.max(1.5, 3.5 * (1 - sjPhase)), 0, 2 * Math.PI);
              ctx.fillStyle = sandboxSteamTemp > 280 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(56, 189, 248, 0.85)';
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            // Animated Darcy Inflow Streamlines in All 7 Layers
            const style = getStreamlineStyles();
            const flowSpeedFactor = Math.max(0.7, Math.min(6.0, (oilFlowRate / 75) + oilFlowVelocity * 0.5));
            const numStreamlines = Math.min(28, Math.max(10, Math.round(8 + (oilFlowRate / 30))));
            const timeOffset = (Date.now() * flowSpeedFactor) / 800;

            for (let s = 0; s < numStreamlines; s++) {
              const baseAngle = (s * 2 * Math.PI) / numStreamlines;
              const phase = (timeOffset + s * (1 / numStreamlines)) % 1;
              const outerR = Math.min(width * 0.44, Math.max(35, dynamicRadius * scale * 1.25));
              const innerR = 12;
              const currentR = outerR - phase * (outerR - innerR);
              const curAngle = baseAngle + phase * 0.4;

              const hx = centerX + Math.cos(curAngle) * currentR;
              const hy = centerY + Math.sin(curAngle) * currentR;

              const tailLen = Math.min(24, 10 + (oilFlowRate / 25));
              const tailR = Math.min(outerR, currentR + tailLen);
              const tailAngle = curAngle - 0.08;
              const tx = centerX + Math.cos(tailAngle) * tailR;
              const ty = centerY + Math.sin(tailAngle) * tailR;

              const streamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
              streamGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
              streamGrad.addColorStop(1, style.gradColor);

              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(hx, hy);
              ctx.strokeStyle = streamGrad;
              ctx.lineWidth = Math.min(3.8, 1.4 + (oilFlowRate / 160));
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(hx, hy, Math.min(3.5, 1.8 + (oilFlowRate / 180)), 0, 2 * Math.PI);
              ctx.fillStyle = style.headColor;
              ctx.shadowColor = style.shadowColor;
              ctx.shadowBlur = Math.min(12, 4 + (oilFlowRate / 50));
              ctx.fill();
              ctx.shadowBlur = 0;
            }

            // Stratum Ring Labels & Callouts for All 7 Layers
            const strataPins = [
              { angle: -Math.PI * 0.25, r: 4.5 * scale, label: 'L4: Payzone #1 Core', color: '#fbbf24' },
              { angle: 0.05, r: 9.0 * scale, label: 'L5: Payzone #2 Wave', color: '#f59e0b' },
              { angle: Math.PI * 0.35, r: 12.8 * scale, label: 'L3: Barrier Shale', color: '#93c5fd' },
              { angle: Math.PI * 0.65, r: 16.0 * scale, label: 'L2: Upper Sand', color: '#fed7aa' },
              { angle: Math.PI * 0.95, r: 19.0 * scale, label: 'L6: Lower Shale', color: '#93c5fd' },
              { angle: -Math.PI * 0.75, r: 22.0 * scale, label: 'L1: Caprock Seal', color: '#a8a29e' },
              { angle: -Math.PI * 0.45, r: 24.2 * scale, label: 'L7: Basement Bedrock', color: '#78716c' }
            ];

            strataPins.forEach(({ angle, r, label, color }) => {
              const px = centerX + Math.cos(angle) * r;
              const py = centerY + Math.sin(angle) * r;
              if (px > 20 && px < width - 60 && py > 60 && py < height - 50) {
                ctx.fillStyle = 'rgba(15, 12, 9, 0.88)';
                const textW = ctx.measureText ? Math.max(65, ctx.measureText(label).width + 8) : 75;
                ctx.fillRect(px - textW / 2, py - 6, textW, 13);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(px - textW / 2, py - 6, textW, 13);

                ctx.fillStyle = color;
                ctx.font = 'bold 7.5px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, px, py + 3.5);
                ctx.textAlign = 'left';
              }
            });

            // High-Precision Concentric Distance Coordinates (5m, 10m, 15m, 20m)
            [5, 10, 15, 20].forEach((dist) => {
              const rPx = dist * scale;
              ctx.beginPath();
              ctx.arc(centerX, centerY, rPx, 0, 2 * Math.PI);
              ctx.strokeStyle = dist === 10 ? 'rgba(217, 119, 6, 0.35)' : 'rgba(217, 119, 6, 0.14)';
              ctx.lineWidth = dist === 10 ? 1.5 : 1;
              ctx.setLineDash([3, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              const labelAngle = Math.PI * 0.78;
              const lx = centerX + Math.cos(labelAngle) * rPx;
              const ly = centerY + Math.sin(labelAngle) * rPx;
              ctx.fillStyle = 'rgba(254, 215, 170, 0.65)';
              ctx.font = '600 8.5px monospace';
              ctx.fillText(`${dist}m`, lx - 10, ly + 10);
            });
          }
        } else {
          // =========================================================================
          // SINGLE STRATUM ISOLATION: STRICTLY SHOW ONLY THE SELECTED LAYER
          // =========================================================================
          // Background specifically tailored to stratum and active parameter
          if (activeLayer === 'saturation') {
            ctx.fillStyle = '#06070a';
          } else if (activeLayer === 'pressure') {
            ctx.fillStyle = '#161b0d';
          } else {
            const bgGrad = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, Math.max(width, height) * 0.7);
            bgGrad.addColorStop(0, currentMeta.bgGrad[0]);
            bgGrad.addColorStop(0.6, currentMeta.bgGrad[1]);
            bgGrad.addColorStop(1, currentMeta.bgGrad[2]);
            ctx.fillStyle = bgGrad;
          }
          ctx.fillRect(0, 0, width, height);

          // Subtle Coordinate Cartesian Crosshairs
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX, 0);
          ctx.lineTo(centerX, height);
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
          ctx.stroke();

          // Golden Distance Concentric Rings (5m, 10m, 15m, 20m)
          [5, 10, 15, 20].forEach((dist) => {
            const rPx = dist * scale;
            ctx.beginPath();
            ctx.arc(centerX, centerY, rPx, 0, 2 * Math.PI);
            ctx.strokeStyle = dist === 10 ? 'rgba(217, 119, 6, 0.32)' : 'rgba(217, 119, 6, 0.15)';
            ctx.lineWidth = dist === 10 ? 1.4 : 1;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            const lx = centerX + rPx;
            const ly = centerY;
            ctx.fillStyle = 'rgba(254, 215, 170, 0.65)';
            ctx.font = '600 8.5px monospace';
            ctx.fillText(`${dist}m`, lx - 14, ly - 5);
          });

          const rPlumePx = dynamicRadius * scale * (currentMeta.plumeScale || 1.0);
          const rCondPx = (currentMeta.conductiveRadiusM || 14) * scale;
          const layerFlowRate = oilFlowRate * (currentMeta.flowFactor || 0.5);

          if (activeLayer === 'saturation') {
            // --- SINGLE LAYER STEAM VAPOR SATURATION FIELD ---
            if (activeStrataId === 'l4') {
              // --- LAYER 4: MAIN PAYZONE #1 (PRIMARY INJECTION STEAM CORE - MATCHING IMAGE 1) ---
              const rChamberPx = Math.max(16, rPlumePx * 0.95);
              const steamGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, rChamberPx * 1.18);
              steamGrad.addColorStop(0, '#ffffff'); // Pure white steam core (>85% Sg)
              steamGrad.addColorStop(0.18, '#f1f5f9'); // Luminous white-silver mist
              steamGrad.addColorStop(0.38, '#cbd5e1'); // Silver-slate vapor
              steamGrad.addColorStop(0.58, '#64748b'); // Luminous slate-blue haze
              steamGrad.addColorStop(0.78, '#334155'); // Deep navy-slate mist
              steamGrad.addColorStop(0.92, '#1e293b'); // Dark indigo-slate envelope
              steamGrad.addColorStop(1.0, 'rgba(6, 7, 10, 0)'); // Seamless fade to black

              ctx.beginPath();
              ctx.arc(centerX, centerY, rChamberPx * 1.18, 0, 2 * Math.PI);
              ctx.fillStyle = steamGrad;
              ctx.fill();

              // Distinct Dashed Steam Chamber Envelope Contour Ring (Image 1)
              const rChamber = rChamberPx * 0.90;
              ctx.beginPath();
              ctx.arc(centerX, centerY, rChamber, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(147, 197, 253, 0.85)';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Strategic Yellow / Golden Observation Nodes & Sensors (Image 1)
              const vaporObsPoints = [
                { x: centerX - 0.58 * rChamber, y: centerY - 0.32 * rChamber },
                { x: centerX - 0.94 * rChamber, y: centerY + 0.02 * rChamber },
                { x: centerX - 0.74 * rChamber, y: centerY + 0.68 * rChamber },
                { x: centerX - 0.06 * rChamber, y: centerY + 0.96 * rChamber },
                { x: centerX + 0.88 * rChamber, y: centerY + 0.76 * rChamber },
                { x: centerX + 1.48 * rChamber, y: centerY - 0.72 * rChamber },
                { x: centerX + 1.56 * rChamber, y: centerY + 0.04 * rChamber }
              ];

              vaporObsPoints.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
                ctx.fillStyle = '#fde047';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              });

              // Outward Radial Steam Perforation Injection Jets (8 Perforations)
              const steamSpeedFactor = Math.max(0.6, (sandboxSlugTonnes / 1600) * (sandboxSteamTemp / 260));
              const steamTimeOffset = (Date.now() * steamSpeedFactor) / 900;
              for (let sj = 0; sj < 8; sj++) {
                const sjAngle = (sj * Math.PI) / 4;
                const sjPhase = (steamTimeOffset + sj * 0.125) % 1;
                const jetMaxR = Math.max(16, rChamber * 0.9);
                const jetCurR = 10 + sjPhase * (jetMaxR - 10);
                const jx = centerX + Math.cos(sjAngle) * jetCurR;
                const jy = centerY + Math.sin(sjAngle) * jetCurR;

                ctx.beginPath();
                ctx.arc(jx, jy, Math.max(1.4, 3.2 * (1 - sjPhase)), 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.shadowColor = '#93c5fd';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            } else if (activeStrataId === 'l5') {
              // --- LAYER 5: SECONDARY PAYZONE #2 (CONDENSATION FRONT & MOBILIZED VAPOR WAVE) ---
              const rChamberPx = Math.max(14, rPlumePx * 0.85);
              const steamGrad = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, rChamberPx * 1.25);
              steamGrad.addColorStop(0, '#ffffff'); // Steam vapor core
              steamGrad.addColorStop(0.20, '#fef08a'); // Warm condensing steam mist (54% Sg)
              steamGrad.addColorStop(0.45, '#93c5fd'); // Hot condensate transition bank
              steamGrad.addColorStop(0.70, '#475569'); // Mobilized oil/condensate boundary
              steamGrad.addColorStop(0.90, '#1e293b'); // Matrix boundary
              steamGrad.addColorStop(1.0, 'rgba(6, 7, 10, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rChamberPx * 1.25, 0, 2 * Math.PI);
              ctx.fillStyle = steamGrad;
              ctx.fill();

              // Dashed Condensation Front & Thermal Wave Ring
              const rCondChamber = rChamberPx * 0.88;
              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondChamber, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Strategic Secondary Observation Nodes
              const vaporObsPointsL5 = [
                { x: centerX - 0.52 * rCondChamber, y: centerY - 0.44 * rCondChamber },
                { x: centerX - 0.85 * rCondChamber, y: centerY + 0.15 * rCondChamber },
                { x: centerX - 0.65 * rCondChamber, y: centerY + 0.65 * rCondChamber },
                { x: centerX + 0.12 * rCondChamber, y: centerY + 0.88 * rCondChamber },
                { x: centerX + 0.78 * rCondChamber, y: centerY + 0.62 * rCondChamber },
                { x: centerX + 1.25 * rCondChamber, y: centerY - 0.55 * rCondChamber },
                { x: centerX + 1.35 * rCondChamber, y: centerY + 0.10 * rCondChamber }
              ];
              vaporObsPointsL5.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
                ctx.fillStyle = '#fde047';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              });

              // 6 Secondary Mobilized Condensate / Vapor Jets
              const steamSpeedFactor = Math.max(0.6, (sandboxSlugTonnes / 1600) * (sandboxSteamTemp / 260));
              const steamTimeOffset = (Date.now() * steamSpeedFactor) / 950;
              for (let sj = 0; sj < 6; sj++) {
                const sjAngle = (sj * Math.PI) / 3;
                const sjPhase = (steamTimeOffset + sj * 0.166) % 1;
                const jetMaxR = Math.max(14, rCondChamber * 0.85);
                const jetCurR = 10 + sjPhase * (jetMaxR - 10);
                const jx = centerX + Math.cos(sjAngle) * jetCurR;
                const jy = centerY + Math.sin(sjAngle) * jetCurR;

                ctx.beginPath();
                ctx.arc(jx, jy, Math.max(1.3, 3.0 * (1 - sjPhase)), 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 5;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            } else {
              // Impermeable Non-Payzone Vapor Barrier Seal
              const sealGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rCondPx * 1.15);
              sealGrad.addColorStop(0, 'rgba(148, 163, 184, 0.35)');
              sealGrad.addColorStop(0.3, 'rgba(71, 85, 105, 0.22)');
              sealGrad.addColorStop(0.7, 'rgba(30, 41, 59, 0.14)');
              sealGrad.addColorStop(1.0, 'rgba(6, 7, 10, 0)');
              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx * 1.15, 0, 2 * Math.PI);
              ctx.fillStyle = sealGrad;
              ctx.fill();

              // Impermeable Boundary Seal Ring
              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx, 0, 2 * Math.PI);
              ctx.strokeStyle = currentMeta.accent || '#ea580c';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

          } else if (activeLayer === 'pressure') {
            // --- SINGLE LAYER PRESSURE DRAWDOWN FIELD ---
            if (activeStrataId === 'l4') {
              // --- LAYER 4: MAIN PAYZONE #1 (PRIMARY DEEP PRESSURE DRAWDOWN SINK - MATCHING IMAGE 2) ---
              const rDrawPx = Math.max(25, scale * (dynamicRadius * 1.35 + 6));
              const pGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rDrawPx * 1.2);
              pGrad.addColorStop(0, '#ffffff'); // Glowing wellbore suction
              pGrad.addColorStop(0.08, '#ef4444'); // Hot scarlet wellbore drawdown
              pGrad.addColorStop(0.24, '#dc2626'); // Crimson pressure sink
              pGrad.addColorStop(0.44, '#b91c1c'); // Deep red drawdown slope
              pGrad.addColorStop(0.64, '#c2410c'); // Warm burnt orange transition
              pGrad.addColorStop(0.82, '#78350f'); // Dark golden-brown zone
              pGrad.addColorStop(0.94, '#292524'); // Near far-field matrix
              pGrad.addColorStop(1.0, 'rgba(14, 18, 8, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rDrawPx * 1.2, 0, 2 * Math.PI);
              ctx.fillStyle = pGrad;
              ctx.fill();

              // Observation Nodes (Image 2)
              const pressObsPoints = [
                { x: centerX - 0.02 * rDrawPx, y: centerY - 0.64 * rDrawPx },
                { x: centerX - 0.54 * rDrawPx, y: centerY - 0.06 * rDrawPx },
                { x: centerX - 0.58 * rDrawPx, y: centerY + 0.38 * rDrawPx },
                { x: centerX - 0.02 * rDrawPx, y: centerY + 0.72 * rDrawPx },
                { x: centerX + 0.44 * rDrawPx, y: centerY + 0.62 * rDrawPx },
                { x: centerX + 0.52 * rDrawPx, y: centerY - 0.54 * rDrawPx },
                { x: centerX + 0.76 * rDrawPx, y: centerY - 0.06 * rDrawPx }
              ];
              pressObsPoints.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
                ctx.fillStyle = '#fde047';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              });
            } else if (activeStrataId === 'l5') {
              // --- LAYER 5: SECONDARY PAYZONE #2 (GRAVITY DRAINAGE PRESSURE SLOPE) ---
              const rDrawPx = Math.max(22, scale * (dynamicRadius * 1.18 + 4));
              const pGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rDrawPx * 1.2);
              pGrad.addColorStop(0, '#ffffff'); // Wellbore suction
              pGrad.addColorStop(0.12, '#f59e0b'); // Warm amber wellbore cone
              pGrad.addColorStop(0.30, '#ea580c'); // Burnt orange drainage sink
              pGrad.addColorStop(0.55, '#dc2626'); // Crimson drainage slope
              pGrad.addColorStop(0.80, '#78350f'); // Dark brown matrix
              pGrad.addColorStop(0.95, '#292524'); // Undisturbed reservoir margin
              pGrad.addColorStop(1.0, 'rgba(14, 18, 8, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rDrawPx * 1.2, 0, 2 * Math.PI);
              ctx.fillStyle = pGrad;
              ctx.fill();

              // Secondary Observation Nodes
              const pressObsPointsL5 = [
                { x: centerX - 0.02 * rDrawPx, y: centerY - 0.55 * rDrawPx },
                { x: centerX - 0.48 * rDrawPx, y: centerY - 0.05 * rDrawPx },
                { x: centerX - 0.50 * rDrawPx, y: centerY + 0.35 * rDrawPx },
                { x: centerX - 0.02 * rDrawPx, y: centerY + 0.65 * rDrawPx },
                { x: centerX + 0.40 * rDrawPx, y: centerY + 0.55 * rDrawPx },
                { x: centerX + 0.48 * rDrawPx, y: centerY - 0.48 * rDrawPx },
                { x: centerX + 0.70 * rDrawPx, y: centerY - 0.05 * rDrawPx }
              ];
              pressObsPointsL5.forEach((pt) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 3.2, 0, 2 * Math.PI);
                ctx.fillStyle = '#fde047';
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              });
            } else {
              // Non-Payzone Hydrostatic Confinement Field
              const confGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rCondPx * 1.2);
              confGrad.addColorStop(0, '#78350f');
              confGrad.addColorStop(0.35, '#451a03');
              confGrad.addColorStop(0.7, '#1c1917');
              confGrad.addColorStop(1.0, 'rgba(22, 27, 13, 0)');
              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx * 1.2, 0, 2 * Math.PI);
              ctx.fillStyle = confGrad;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx, 0, 2 * Math.PI);
              ctx.strokeStyle = currentMeta.accent || '#f59e0b';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

          } else if (activeLayer === 'temperature') {
            // --- SINGLE LAYER TEMPERATURE FIELD ---
            if (currentMeta.isPayzone) {
              const plumeGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rPlumePx * 1.25);
              plumeGrad.addColorStop(0, '#ffffff'); // Steam Core (>200°C)
              plumeGrad.addColorStop(0.15, '#fef08a'); // 190°C
              plumeGrad.addColorStop(0.35, '#f59e0b'); // 160°C condensation front
              plumeGrad.addColorStop(0.6, '#ea580c'); // 120°C mobilized oil bank
              plumeGrad.addColorStop(0.82, '#b91c1c'); // 80°C thermal wave
              plumeGrad.addColorStop(0.95, '#7f1d1d'); // 55°C conductive boundary
              plumeGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rPlumePx * 1.25, 0, 2 * Math.PI);
              ctx.fillStyle = plumeGrad;
              ctx.fill();

              // Distinct Isotherm Contour Rings
              const isotherms = [
                { r: rPlumePx * 0.28, color: 'rgba(255, 255, 255, 0.85)', dash: [2, 3], label: '>200°C' },
                { r: rPlumePx * 0.52, color: 'rgba(254, 240, 138, 0.8)', dash: [3, 3], label: '160°C' },
                { r: rPlumePx * 0.78, color: 'rgba(249, 115, 22, 0.75)', dash: [4, 4], label: '120°C' },
                { r: rPlumePx * 1.1, color: 'rgba(220, 38, 38, 0.65)', dash: [4, 4], label: '75°C' }
              ];

              isotherms.forEach(({ r, color, dash, label }) => {
                ctx.beginPath();
                ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.3;
                ctx.setLineDash(dash);
                ctx.stroke();
                ctx.setLineDash([]);

                if (centerX + r + 38 < width - 15) {
                  ctx.fillStyle = 'rgba(15, 12, 9, 0.88)';
                  ctx.fillRect(centerX + r + 4, centerY - 7, 36, 14);
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 1;
                  ctx.strokeRect(centerX + r + 4, centerY - 7, 36, 14);

                  ctx.fillStyle = color;
                  ctx.font = 'bold 8px monospace';
                  ctx.textAlign = 'center';
                  ctx.fillText(label, centerX + r + 22, centerY + 3);
                  ctx.textAlign = 'left';
                }
              });

              // Animated Convective Heat Ripples
              for (let i = 0; i < 3; i++) {
                const phase = ((Date.now() / 1500) + i / 3) % 1;
                const ripR = rPlumePx * (0.15 + phase * 0.95);
                ctx.beginPath();
                ctx.arc(centerX, centerY, ripR, 0, 2 * Math.PI);
                ctx.strokeStyle = `rgba(251, 191, 36, ${0.45 * (1 - phase)})`;
                ctx.lineWidth = 1.5 * (1 - phase);
                ctx.stroke();
              }
            } else {
              // Conductive Fourier Field
              const condGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rCondPx * 1.3);
              condGrad.addColorStop(0, '#ffffff');
              condGrad.addColorStop(0.18, '#fef08a');
              condGrad.addColorStop(0.38, '#f59e0b');
              condGrad.addColorStop(0.62, '#ea580c');
              condGrad.addColorStop(0.82, '#dc2626');
              condGrad.addColorStop(0.95, '#7f1d1d');
              condGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx * 1.3, 0, 2 * Math.PI);
              ctx.fillStyle = condGrad;
              ctx.fill();

              const sealR = rCondPx * 1.15;
              ctx.beginPath();
              ctx.arc(centerX, centerY, sealR, 0, 2 * Math.PI);
              ctx.strokeStyle = currentMeta.accent || '#ea580c';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([6, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

          } else if (activeLayer === 'viscosity') {
            // --- SINGLE LAYER VISCOSITY FIELD ---
            if (currentMeta.isPayzone) {
              const viscGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rPlumePx * 1.35);
              viscGrad.addColorStop(0, '#38bdf8'); // 22 cP super-mobile
              viscGrad.addColorStop(0.28, '#34d399'); // 80 cP
              viscGrad.addColorStop(0.55, '#10b981'); // 150 cP (critical threshold)
              viscGrad.addColorStop(0.75, '#f59e0b'); // 800 cP
              viscGrad.addColorStop(0.92, '#dc2626'); // 4,500 cP
              viscGrad.addColorStop(1.0, 'rgba(220, 38, 38, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rPlumePx * 1.35, 0, 2 * Math.PI);
              ctx.fillStyle = viscGrad;
              ctx.fill();

              const mobR = rPlumePx * 0.68;
              ctx.beginPath();
              ctx.arc(centerX, centerY, mobR, 0, 2 * Math.PI);
              ctx.strokeStyle = '#34d399';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            } else {
              // High Viscosity Rock Matrix
              const viscGrad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, rCondPx * 1.35);
              viscGrad.addColorStop(0, '#38bdf8');
              viscGrad.addColorStop(0.2, '#f59e0b');
              viscGrad.addColorStop(0.5, '#dc2626');
              viscGrad.addColorStop(0.8, '#7f1d1d');
              viscGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0)');

              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx * 1.35, 0, 2 * Math.PI);
              ctx.fillStyle = viscGrad;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(centerX, centerY, rCondPx * 0.9, 0, 2 * Math.PI);
              ctx.strokeStyle = currentMeta.accent || '#ea580c';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // Animated Darcy Inflow Streamlines in Isolated Single Strata
          if (currentMeta.hasStreamlines) {
            const style = getStreamlineStyles();
            const flowSpeedFactor = Math.max(0.6, Math.min(5.5, (layerFlowRate / 80) + oilFlowVelocity * 0.4));
            const numStreamlines = Math.min(24, Math.max(8, Math.round(6 + (layerFlowRate / 35))));
            const timeOffset = (Date.now() * flowSpeedFactor) / 850;
            const maxReachR = currentMeta.isPayzone ? rPlumePx * 1.35 : rCondPx * 1.15;

            for (let s = 0; s < numStreamlines; s++) {
              const baseAngle = (s * 2 * Math.PI) / numStreamlines;
              const phase = (timeOffset + s * (1 / numStreamlines)) % 1;
              const outerR = Math.min(width * 0.42, Math.max(30, maxReachR));
              const innerR = 14;
              const currentR = outerR - phase * (outerR - innerR);
              const curAngle = baseAngle + phase * 0.35;

              const hx = centerX + Math.cos(curAngle) * currentR;
              const hy = centerY + Math.sin(curAngle) * currentR;

              const tailLen = Math.min(22, 10 + (layerFlowRate / 30));
              const tailR = Math.min(outerR, currentR + tailLen);
              const tailAngle = curAngle - 0.08;
              const tx = centerX + Math.cos(tailAngle) * tailR;
              const ty = centerY + Math.sin(tailAngle) * tailR;

              const streamGrad = ctx.createLinearGradient(tx, ty, hx, hy);
              streamGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
              streamGrad.addColorStop(1, style.gradColor);

              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(hx, hy);
              ctx.strokeStyle = streamGrad;
              ctx.lineWidth = Math.min(3.5, 1.6 + (layerFlowRate / 180));
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(hx, hy, Math.min(3.2, 1.8 + (layerFlowRate / 220)), 0, 2 * Math.PI);
              ctx.fillStyle = style.headColor;
              ctx.shadowColor = style.shadowColor;
              ctx.shadowBlur = Math.min(10, 4 + (layerFlowRate / 60));
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }

        // 3. Central Wellbore with Glowing Orange Ring & Pure White Core (Matching Reference Images 1 & 2)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 9.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        // Direct Bold Wellbore Identification Tag Directly Above Wellbore ("B-17")
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(selectedWellId || 'B-17', centerX, centerY - 15);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';

        // 4. Wellbore Callout Flag (Upward-Right)
        const calloutStartX = centerX + 8;
        const calloutStartY = centerY - 8;
        const elbowX = centerX + 35;
        const elbowY = centerY - 35;
        const flagEndX = elbowX + 106;

        ctx.beginPath();
        ctx.moveTo(calloutStartX, calloutStartY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(flagEndX, elbowY);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = 'rgba(18, 14, 11, 0.94)';
        ctx.fillRect(elbowX, elbowY - 24, 106, 24);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(elbowX, elbowY - 24, 106, 24);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9.5px monospace';
        ctx.fillText(`WELL ${selectedWellId}`, elbowX + 6, elbowY - 12);
        ctx.fillStyle = '#a8a29e';
        ctx.font = '7.5px sans-serif';
        ctx.fillText(isAllStrataView || currentMeta.isPayzone ? `CSS #4 • Inflow: ${oilFlowRate} BOPD` : `Intact Casing • ${currentMeta.cbl || 'CBL 98%'}`, elbowX + 6, elbowY - 3);

        // 5. Comprehensive Stratum Telemetry HUD Badge (Top-Left, below top strata bar)
        ctx.fillStyle = 'rgba(15, 12, 9, 0.94)';
        ctx.fillRect(12, 48, 335, 48);
        ctx.strokeStyle = isAllStrataView ? '#fbbf24' : currentMeta.accent;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(12, 48, 335, 48);

        ctx.fillStyle = isAllStrataView ? '#fbbf24' : currentMeta.accent;
        ctx.font = 'bold 9.5px monospace';
        ctx.fillText(isAllStrataView ? 'ALL 7 STRATA: COMPOSITE STRATIGRAPHIC VIEW' : currentMeta.title, 18, 62);

        ctx.fillStyle = '#fed7aa';
        ctx.font = '8px monospace';
        ctx.fillText(isAllStrataView ? 'Depth: 618m – 700m+ MD • 7 Strata Layers Synced' : `Depth: ${currentMeta.depth} • Lithology: ${currentMeta.lithology.split(' ')[0]}`, 18, 74);
        ctx.fillStyle = '#a8a29e';
        ctx.font = '7.5px sans-serif';
        ctx.fillText(isAllStrataView ? 'Lithology: Caprock • Upper Sand • Barrier Shale • Payzones #1 & #2 • Lower Shale • Basement' : `Porosity: ${currentMeta.porosity} • Perm: ${currentMeta.perm} • Formation Temp: ${currentMeta.temp}`, 18, 86);

        // 6. North Arrow Compass Rose (Top-Right)
        const naX = width - 26;
        const naY = 68;
        ctx.beginPath();
        ctx.moveTo(naX, naY - 14);
        ctx.lineTo(naX + 6, naY + 4);
        ctx.lineTo(naX, naY);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(naX, naY - 14);
        ctx.lineTo(naX - 6, naY + 4);
        ctx.lineTo(naX, naY);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('N', naX, naY + 14);
        ctx.textAlign = 'left';

        // 8. Metric Scale Bar (Bottom-Left)
        const sbX = 14;
        const sbY = height - 55;
        const barLength10m = 10 * scale;
        ctx.beginPath();
        ctx.moveTo(sbX, sbY);
        ctx.lineTo(sbX + barLength10m, sbY);
        ctx.moveTo(sbX, sbY - 4);
        ctx.lineTo(sbX + barLength10m, sbY + 4);
        ctx.moveTo(sbX + barLength10m / 2, sbY - 3);
        ctx.lineTo(sbX + barLength10m / 2, sbY + 3);
        ctx.moveTo(sbX + barLength10m, sbY - 4);
        ctx.lineTo(sbX + barLength10m, sbY + 4);
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fed7aa';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('0', sbX, sbY - 6);
        ctx.fillText('5m', sbX + barLength10m / 2, sbY - 6);
        ctx.fillText('10m', sbX + barLength10m, sbY - 6);
        ctx.textAlign = 'left';
      } else {
        // ==========================================
        // 3D STRATIGRAPHIC ISOMETRIC CUTAWAY VIEW
        // ==========================================
        const bgGrad3d = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad3d.addColorStop(0, '#100c08');
        bgGrad3d.addColorStop(0.5, '#080605');
        bgGrad3d.addColorStop(1, '#040302');
        ctx.fillStyle = bgGrad3d;
        ctx.fillRect(0, 0, width, height);

        const isoOriginX = centerX + panOffset.x;
        const isoOriginY = centerY + 28 + panOffset.y;

        const toIso = (x, y, z) => {
          // Azimuth rotation around Z-axis
          const xr = x * Math.cos(rotAngle) - y * Math.sin(rotAngle);
          const yr = x * Math.sin(rotAngle) + y * Math.cos(rotAngle);
          // Elevation pitch tilt & zoom scaling
          const cosT = Math.cos(tiltAngle);
          const sinT = Math.sin(tiltAngle);
          return {
            x: isoOriginX + (xr - yr) * cosT * zoom3d,
            y: isoOriginY + ((xr + yr) * sinT - z) * zoom3d
          };
        };

        const blockW = 165;
        const blockD = 135;
        const zBottom = -40; // basal sand
        const zPayBottom = 0; // bottom of payzone
        const zPayTop = 75; // top of payzone (net pay ~18m)
        const zCapTop = 115; // top of shale caprock

        // Stratigraphic grid lines
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
        ctx.lineWidth = 1;
        for (let gx = -blockW; gx <= blockW; gx += 40) {
          const p1 = toIso(gx, -blockD, zBottom);
          const p2 = toIso(gx, blockD, zBottom);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // 1. Basal Sand Face
        const pBL1 = toIso(-blockW, blockD, zBottom);
        const pBL2 = toIso(0, blockD, zBottom);
        const pBL3 = toIso(0, blockD, zPayBottom);
        const pBL4 = toIso(-blockW, blockD, zPayBottom);
        ctx.beginPath();
        ctx.moveTo(pBL1.x, pBL1.y);
        ctx.lineTo(pBL2.x, pBL2.y);
        ctx.lineTo(pBL3.x, pBL3.y);
        ctx.lineTo(pBL4.x, pBL4.y);
        ctx.closePath();
        ctx.fillStyle = '#1c1917';
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)';
        ctx.stroke();

        // 2. Main Payzone Sandstone Face
        const pPay1 = toIso(-blockW, blockD, zPayBottom);
        const pPay2 = toIso(0, blockD, zPayBottom);
        const pPay3 = toIso(0, blockD, zPayTop);
        const pPay4 = toIso(-blockW, blockD, zPayTop);
        ctx.beginPath();
        ctx.moveTo(pPay1.x, pPay1.y);
        ctx.lineTo(pPay2.x, pPay2.y);
        ctx.lineTo(pPay3.x, pPay3.y);
        ctx.lineTo(pPay4.x, pPay4.y);
        ctx.closePath();
        const payFaceGrad = ctx.createLinearGradient(pPay1.x, pPay1.y, pPay3.x, pPay3.y);
        payFaceGrad.addColorStop(0, '#2d1a0e');
        payFaceGrad.addColorStop(0.5, '#451a03');
        payFaceGrad.addColorStop(1, '#2d1a0e');
        ctx.fillStyle = payFaceGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
        ctx.stroke();

        // 3. Overburden Shale Caprock Face
        const pCap1 = toIso(-blockW, blockD, zPayTop);
        const pCap2 = toIso(0, blockD, zPayTop);
        const pCap3 = toIso(0, blockD, zCapTop);
        const pCap4 = toIso(-blockW, blockD, zCapTop);
        ctx.beginPath();
        ctx.moveTo(pCap1.x, pCap1.y);
        ctx.lineTo(pCap2.x, pCap2.y);
        ctx.lineTo(pCap3.x, pCap3.y);
        ctx.lineTo(pCap4.x, pCap4.y);
        ctx.closePath();
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.stroke();

        // Front Cutaway Face (X = 0, Y from -blockD to blockD)
        const pCut1 = toIso(0, -blockD, zPayBottom);
        const pCut2 = toIso(0, blockD, zPayBottom);
        const pCut3 = toIso(0, blockD, zPayTop);
        const pCut4 = toIso(0, -blockD, zPayTop);
        ctx.beginPath();
        ctx.moveTo(pCut1.x, pCut1.y);
        ctx.lineTo(pCut2.x, pCut2.y);
        ctx.lineTo(pCut3.x, pCut3.y);
        ctx.lineTo(pCut4.x, pCut4.y);
        ctx.closePath();
        ctx.fillStyle = '#1c130c';
        ctx.fill();
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.2)';
        ctx.stroke();

        // 3D Thermal Steam Chamber with 4 Expanded Thermal Sections & Gravity Override Profiles
        const wellCenterTop = toIso(0, 0, zPayTop);
        const wellCenterBot = toIso(0, 0, zPayBottom);

        // 4 Expanded Thermal Sections with Dynamic Multipliers and Exploded Offset Support
        const baseExpansion = expansionFactor;
        const thermalSections = [
          {
            id: 'z4',
            name: 'Conductive Wave Front',
            tempRange: '60°C – 100°C',
            deltaT: '+12°C to +52°C',
            scaleTop: 5.6 * baseExpansion,
            scaleMid: 4.4 * baseExpansion,
            scaleBot: 2.8 * baseExpansion,
            explodedOffset: selectedSectionFilter === 'exploded' ? 36 : 0,
            stops: activeLayer === 'viscosity' 
              ? [[0, '#0284c7'], [0.55, '#0369a1'], [1.0, 'rgba(28, 19, 12, 0.05)']]
              : [[0, '#b91c1c'], [0.55, '#881337'], [1.0, 'rgba(69, 26, 3, 0.05)']],
            strokeColor: activeLayer === 'viscosity' ? 'rgba(56, 189, 248, 0.65)' : 'rgba(185, 28, 28, 0.65)',
            dash: [4, 4],
            lineWidth: 1.5
          },
          {
            id: 'z3',
            name: 'Mobilized Heavy-Oil Bank',
            tempRange: '100°C – 150°C',
            deltaT: '+52°C to +102°C',
            scaleTop: 4.1 * baseExpansion,
            scaleMid: 3.2 * baseExpansion,
            scaleBot: 2.0 * baseExpansion,
            explodedOffset: selectedSectionFilter === 'exploded' ? 24 : 0,
            stops: activeLayer === 'viscosity'
              ? [[0, '#06b6d4'], [0.5, '#0284c7'], [1.0, '#0369a1']]
              : [[0, '#ea580c'], [0.5, '#dc2626'], [1.0, '#b91c1c']],
            strokeColor: activeLayer === 'viscosity' ? 'rgba(6, 182, 212, 0.85)' : 'rgba(234, 88, 12, 0.85)',
            dash: [5, 3],
            lineWidth: 1.8
          },
          {
            id: 'z2',
            name: 'Latent Condensation Bank',
            tempRange: '150°C – 200°C',
            deltaT: '+102°C to +152°C',
            scaleTop: 2.6 * baseExpansion,
            scaleMid: 1.95 * baseExpansion,
            scaleBot: 1.25 * baseExpansion,
            explodedOffset: selectedSectionFilter === 'exploded' ? 12 : 0,
            stops: activeLayer === 'viscosity'
              ? [[0, '#34d399'], [0.5, '#10b981'], [1.0, '#06b6d4']]
              : [[0, '#f59e0b'], [0.5, '#f97316'], [1.0, '#ea580c']],
            strokeColor: activeLayer === 'viscosity' ? 'rgba(52, 211, 153, 0.95)' : 'rgba(245, 158, 11, 0.95)',
            dash: [3, 2],
            lineWidth: 2.0
          },
          {
            id: 'z1',
            name: 'Superheated Steam Core',
            tempRange: '> 200°C',
            deltaT: '+152°C to +212°C',
            scaleTop: 1.35 * baseExpansion,
            scaleMid: 1.05 * baseExpansion,
            scaleBot: 0.62 * baseExpansion,
            explodedOffset: 0,
            stops: activeLayer === 'viscosity'
              ? [[0, '#ffffff'], [0.35, '#bae6fd'], [1.0, '#38bdf8']]
              : [[0, '#ffffff'], [0.3, '#fef08a'], [1.0, '#fbbf24']],
            strokeColor: '#ffffff',
            dash: [],
            lineWidth: 2.5
          }
        ];

        // Render each expanded thermal section (handles All Zones, Exploded Mode, or Isolated Single Section)
        const calloutPoints = [];
        thermalSections.forEach((sec) => {
          const isTarget = selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded' || selectedSectionFilter === sec.id;
          const isSingleIsolated = selectedSectionFilter === sec.id;

          const zrTop = Math.min(blockD + sec.explodedOffset, dynamicRadius * sec.scaleTop + sec.explodedOffset);
          const zrMid = Math.min(blockD + sec.explodedOffset, dynamicRadius * sec.scaleMid + sec.explodedOffset);
          const zrBot = Math.min(blockD + sec.explodedOffset, dynamicRadius * sec.scaleBot + sec.explodedOffset);

          const ptTL = toIso(0, -zrTop, zPayTop);
          const ptTR = toIso(0, zrTop, zPayTop);
          const ptMR = toIso(0, zrMid, (zPayTop + zPayBottom) / 2);
          const ptBR = toIso(0, zrBot, zPayBottom);
          const ptBL = toIso(0, -zrBot, zPayBottom);
          const ptML = toIso(0, -zrMid, (zPayTop + zPayBottom) / 2);

          // Save right-side point for section callout leader lines
          calloutPoints.push({ sec, pt: ptMR });

          // Draw zone geometry with upward buoyancy curvature
          ctx.beginPath();
          ctx.moveTo(ptTL.x, ptTL.y);
          ctx.quadraticCurveTo(wellCenterTop.x, wellCenterTop.y - 8 * zoom3d, ptTR.x, ptTR.y);
          ctx.quadraticCurveTo(ptMR.x + 6 * zoom3d, ptMR.y, ptBR.x, ptBR.y);
          ctx.quadraticCurveTo(wellCenterBot.x, wellCenterBot.y + 4 * zoom3d, ptBL.x, ptBL.y);
          ctx.quadraticCurveTo(ptML.x - 6 * zoom3d, ptML.y, ptTL.x, ptTL.y);
          ctx.closePath();

          if (isTarget) {
            // Apply multi-stop radial gradient for the section
            const sectionGrad = ctx.createRadialGradient(
              wellCenterTop.x, wellCenterTop.y + 6 * zoom3d, 2,
              wellCenterTop.x, wellCenterTop.y + 14 * zoom3d, zrTop * 1.35 * zoom3d
            );
            sec.stops.forEach(([offset, col]) => {
              sectionGrad.addColorStop(offset, col);
            });
            ctx.fillStyle = sectionGrad;
            ctx.fill();

            // Glow highlighting if isolated single section
            if (isSingleIsolated) {
              ctx.shadowColor = sec.strokeColor;
              ctx.shadowBlur = 16;
            }

            // Stroke section boundary contour
            ctx.strokeStyle = isSingleIsolated ? '#ffffff' : sec.strokeColor;
            ctx.lineWidth = (isSingleIsolated ? sec.lineWidth + 1.2 : sec.lineWidth) * zoom3d;
            ctx.setLineDash(sec.dash);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
          } else {
            // Faint ghosted wireframe blueprint for non-selected sections in single mode
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // Convective Steam Vapor Streamers inside Zone 1 (Steam Core)
        if (selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded' || selectedSectionFilter === 'z1') {
          const tAnim = Date.now() * 0.002;
          const coreTopR = dynamicRadius * 1.35 * baseExpansion;
          const coreMidR = dynamicRadius * 1.05 * baseExpansion;
          for (let b = 0; b < 7; b++) {
            const bubbleProgress = ((tAnim * 0.6 + b * 0.15) % 1);
            const bubbleZ = zPayBottom + bubbleProgress * (zPayTop - zPayBottom);
            const bubbleSpread = Math.sin(bubbleProgress * Math.PI) * (coreMidR * 0.45);
            const bubbleY = (b % 2 === 0 ? 1 : -1) * bubbleSpread * 0.7;
            const bPt = toIso(0, bubbleY, bubbleZ);
            ctx.beginPath();
            ctx.arc(bPt.x, bPt.y, (1.8 + bubbleProgress * 2.2) * zoom3d, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * (1 - bubbleProgress)})`;
            ctx.fill();
          }
        }

        // Top Horizon Surface (Caprock Top at Z = zCapTop)
        const pTop1 = toIso(-blockW, -blockD, zCapTop);
        const pTop2 = toIso(blockW, -blockD, zCapTop);
        const pTop3 = toIso(blockW, blockD, zCapTop);
        const pTop4 = toIso(-blockW, blockD, zCapTop);
        ctx.beginPath();
        ctx.moveTo(pTop1.x, pTop1.y);
        ctx.lineTo(pTop2.x, pTop2.y);
        ctx.lineTo(pTop3.x, pTop3.y);
        ctx.lineTo(pTop4.x, pTop4.y);
        ctx.closePath();
        const topGrad = ctx.createLinearGradient(pTop1.x, pTop1.y, pTop3.x, pTop3.y);
        topGrad.addColorStop(0, '#1e293b');
        topGrad.addColorStop(0.5, '#0f172a');
        topGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = topGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Subtle Geological Grid on Top Horizon Face
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.12)';
        ctx.lineWidth = 0.8;
        for (let gx = -blockW; gx <= blockW; gx += 40) {
          const g1 = toIso(gx, -blockD, zCapTop);
          const g2 = toIso(gx, blockD, zCapTop);
          ctx.beginPath();
          ctx.moveTo(g1.x, g1.y);
          ctx.lineTo(g2.x, g2.y);
          ctx.stroke();
        }

        // Soft Radiant Thermal Dissipation Bloom on Caprock Surface
        const topCenter = toIso(0, 0, zCapTop);
        const maxBloomR = dynamicRadius * 4.4 * baseExpansion;
        const topBloomGrad = ctx.createRadialGradient(
          topCenter.x, topCenter.y, 2,
          topCenter.x, topCenter.y, maxBloomR * 0.85 * zoom3d
        );
        topBloomGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
        topBloomGrad.addColorStop(0.25, 'rgba(245, 158, 11, 0.22)');
        topBloomGrad.addColorStop(0.55, 'rgba(234, 88, 12, 0.14)');
        topBloomGrad.addColorStop(0.85, 'rgba(185, 28, 28, 0.06)');
        topBloomGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0)');

        // Draw soft bloom disc in 3D
        ctx.beginPath();
        for (let s = 0; s <= 36; s++) {
          const a = (s / 36) * Math.PI * 2;
          const pt = toIso(maxBloomR * Math.cos(a), maxBloomR * Math.sin(a), zCapTop);
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = topBloomGrad;
        ctx.fill();

        // Thin, Elegant Glowing 3D Isotherm Rings on Top Horizon
        const topRings = [
          { id: 'z4', r: dynamicRadius * 4.4 * baseExpansion, stroke: 'rgba(185, 28, 28, 0.65)', dash: [5, 4], width: 1.2 },
          { id: 'z3', r: dynamicRadius * 3.2 * baseExpansion, stroke: 'rgba(234, 88, 12, 0.75)', dash: [4, 3], width: 1.4 },
          { id: 'z2', r: dynamicRadius * 2.0 * baseExpansion, stroke: 'rgba(245, 158, 11, 0.85)', dash: [3, 2], width: 1.6 },
          { id: 'z1', r: dynamicRadius * 1.0 * baseExpansion, stroke: '#ffffff', dash: [], width: 2.0 }
        ];

        topRings.forEach(({ id, r, stroke, dash, width: rw }) => {
          const isTarget = selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded' || selectedSectionFilter === id;
          const isSingle = selectedSectionFilter === id;

          ctx.beginPath();
          for (let s = 0; s <= 48; s++) {
            const a = (s / 48) * Math.PI * 2;
            const pt = toIso(r * Math.cos(a), r * Math.sin(a), zCapTop);
            if (s === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();

          if (isTarget) {
            if (isSingle) {
              ctx.shadowColor = stroke;
              ctx.shadowBlur = 12;
            }
            ctx.strokeStyle = isSingle ? '#ffffff' : stroke;
            ctx.lineWidth = (isSingle ? rw + 1 : rw) * Math.max(0.8, zoom3d);
            ctx.setLineDash(dash);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });

        // 3D Vertical Wellbore Casing String
        const wellHeadZ = zCapTop + 28;
        const wellHead = toIso(0, 0, wellHeadZ);
        const wellPerfsTop = toIso(0, 0, zPayTop);
        const wellPerfsBot = toIso(0, 0, zPayBottom);
        const wellBottom = toIso(0, 0, zBottom);

        ctx.beginPath();
        ctx.moveTo(wellHead.x, wellHead.y);
        ctx.lineTo(wellBottom.x, wellBottom.y);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(3, 5 * zoom3d);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wellHead.x, wellHead.y);
        ctx.lineTo(wellBottom.x, wellBottom.y);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = Math.max(1, 2 * zoom3d);
        ctx.stroke();

        // Perforated interval highlighting in payzone
        ctx.beginPath();
        ctx.moveTo(wellPerfsTop.x, wellPerfsTop.y);
        ctx.lineTo(wellPerfsBot.x, wellPerfsBot.y);
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = Math.max(4, 7 * zoom3d);
        ctx.stroke();

        // Glowing perforation discharge ports
        for (let s = 0; s < 6; s++) {
          const sz = zPayBottom + (s / 5) * (zPayTop - zPayBottom);
          const pPt = toIso(0, 0, sz);
          ctx.beginPath();
          ctx.arc(pPt.x + (s % 2 === 0 ? 5 : -5) * zoom3d, pPt.y, 2.5 * zoom3d, 0, 2 * Math.PI);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
        }

        // Wellhead surface marker & 3D Callout
        ctx.beginPath();
        ctx.arc(wellHead.x, wellHead.y, 5 * zoom3d, 0, 2 * Math.PI);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3D Wellhead Callout flag
        const c3dX = wellHead.x + 20 * zoom3d;
        const c3dY = wellHead.y - 16 * zoom3d;
        ctx.beginPath();
        ctx.moveTo(wellHead.x, wellHead.y);
        ctx.lineTo(c3dX, c3dY);
        ctx.lineTo(c3dX + 65, c3dY);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(15, 12, 9, 0.9)';
        ctx.fillRect(c3dX, c3dY - 13, 72, 13);
        ctx.strokeStyle = '#d97706';
        ctx.strokeRect(c3dX, c3dY - 13, 72, 13);

        ctx.fillStyle = '#fed7aa';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`WELL ${selectedWellId}`, c3dX + 4, c3dY - 3);

        // 3D Stratigraphic Depth Scale Annotations
        const depthMarkers = [
          { z: zCapTop, label: '625m MD — Shale Caprock Seal' },
          { z: zPayTop, label: '648m MD — Top Jodhpur Sand (Payzone)' },
          { z: (zPayTop + zPayBottom) / 2, label: `656m MD — Perforations (${sandboxNetPay}m Net Pay)` },
          { z: zPayBottom, label: '666m MD — Base Sandstone Pay' },
          { z: zBottom, label: '675m MD — Underburden Sand' }
        ];

        depthMarkers.forEach(({ z, label }) => {
          const pt = toIso(-blockW, blockD, z);
          ctx.beginPath();
          ctx.moveTo(pt.x - 8, pt.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = 'rgba(254, 215, 170, 0.85)';
          ctx.font = '600 8.5px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(label, pt.x - 12, pt.y + 3);
        });

        // 3D Thermal Section Gradient Legend on Upper Right
        const legendX = width - 200;
        const legendY = 12;
        const legendW = 188;
        const legendH = 112;

        ctx.fillStyle = 'rgba(15, 12, 9, 0.93)';
        ctx.fillRect(legendX, legendY, legendW, legendH);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(legendX, legendY, legendW, legendH);

        ctx.fillStyle = '#fed7aa';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('3D THERMAL SECTIONS & ΔT', legendX + 8, legendY + 14);

        const legendSections = [
          { id: 'z1', name: 'Steam Core', temp: '>200°C', dt: '+152°C', grad: ['#ffffff', '#fbbf24'] },
          { id: 'z2', name: 'Condensation', temp: '150–200°C', dt: '+102°C', grad: ['#f59e0b', '#ea580c'] },
          { id: 'z3', name: 'Mobilized Oil', temp: '100–150°C', dt: '+52°C', grad: ['#ea580c', '#dc2626'] },
          { id: 'z4', name: 'Thermal Front', temp: '60–100°C', dt: '+12°C', grad: ['#dc2626', '#881337'] }
        ];

        legendSections.forEach((sec, idx) => {
          const sy = legendY + 26 + idx * 20;
          const isSelected = selectedSectionFilter === sec.id;
          // Gradient swatch
          const swatchGrad = ctx.createLinearGradient(legendX + 8, sy, legendX + 22, sy + 11);
          swatchGrad.addColorStop(0, sec.grad[0]);
          swatchGrad.addColorStop(1, sec.grad[1]);
          ctx.fillStyle = swatchGrad;
          ctx.fillRect(legendX + 8, sy, 14, 11);
          ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = isSelected ? 1.5 : 0.8;
          ctx.strokeRect(legendX + 8, sy, 14, 11);

          ctx.fillStyle = isSelected ? '#fed7aa' : '#f8fafc';
          ctx.font = isSelected ? 'bold 8.5px monospace' : 'bold 8px monospace';
          ctx.fillText(sec.name + (isSelected ? ' ●' : ''), legendX + 27, sy + 9);

          ctx.fillStyle = isSelected ? '#fbbf24' : '#f59e0b';
          ctx.font = 'bold 7.5px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(sec.temp, legendX + legendW - 8, sy + 9);
          ctx.textAlign = 'left';
        });

        // 3D Axis Compass Gizmo in lower left (rotates with model)
        const compassX = 45;
        const compassY = height - 45;
        const cEast = { x: 22 * Math.cos(rotAngle), y: 22 * Math.sin(rotAngle) * Math.sin(tiltAngle) };
        const cNorth = { x: -22 * Math.sin(rotAngle), y: 22 * Math.cos(rotAngle) * Math.sin(tiltAngle) };

        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX + cEast.x, compassY + cEast.y);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('E', compassX + cEast.x * 1.3, compassY + cEast.y * 1.3 + 3);

        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX + cNorth.x, compassY + cNorth.y);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.fillText('N', compassX + cNorth.x * 1.3 - 4, compassY + cNorth.y * 1.3 + 3);

        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX, compassY - 24);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('TVD', compassX - 8, compassY - 26);

        // Mode HUD Tag in top-left
        ctx.fillStyle = 'rgba(15, 12, 9, 0.9)';
        ctx.fillRect(10, 10, 290, 24);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.strokeRect(10, 10, 290, 24);
        ctx.fillStyle = '#fed7aa';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'left';
        const sectionStatus = selectedSectionFilter === 'all' ? 'ALL ZONES' : selectedSectionFilter === 'exploded' ? 'EXPLODED VIEW' : `ISOLATED: ${selectedSectionFilter.toUpperCase()}`;
        ctx.fillText(`3D CUTAWAY • ORBIT 360° • ${sectionStatus}`, 15, 25);
      }

      // Steam Pulse Animation if Triggered
      if (pulseActive) {
        animationTime += 0.05;
        const pulseR = (animationTime * 140) % (width * 0.45);
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseR, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Request next frame for live wave dynamics
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dynamicRadius, activeLayer, pulseActive, selectedWellId, viewProjection, sandboxSteamTemp, sandboxSteamQuality, sandboxSlugTonnes, sandboxNetPay, dynamicTemp, dynamicViscosity, dynamicMobility, oilFlowRate, oilFlowVelocity, rotAngle, tiltAngle, zoom3d, panOffset, selectedSectionFilter, expansionFactor]);

  // Handle 3D Canvas Mouse Interactions (Orbit Drag, Pan, Zoom, Hover Probe)
  const handleCanvasMouseDown = (e) => {
    if (viewProjection !== '3d') return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rot: rotAngle,
      tilt: tiltAngle,
      panX: panOffset.x,
      panY: panOffset.y,
      isRightClick: e.button === 2 || e.shiftKey
    };
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasWheel = (e) => {
    if (viewProjection !== '3d') return;
    e.preventDefault();
    const delta = e.deltaY * -0.0012;
    setZoom3d((prev) => Math.max(0.65, Math.min(2.2, Number((prev + delta).toFixed(2)))));
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (viewProjection === '3d' && isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (dragStartRef.current.isRightClick) {
        setPanOffset({
          x: Math.round(dragStartRef.current.panX + dx),
          y: Math.round(dragStartRef.current.panY + dy)
        });
      } else {
        setRotAngle(Number((dragStartRef.current.rot + dx * 0.012).toFixed(3)));
        setTiltAngle(Number((Math.max(0.08, Math.min(1.48, dragStartRef.current.tilt + dy * 0.008))).toFixed(3)));
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    let radiusM = 0;
    let formationLayer = 'Main Heavy-Oil Payzone';
    let probedDepth = 656;
    let localT = 48.0;
    let localVisc = 1850;

    let stratumColor = '#fbbf24';

    if (viewProjection === '2d') {
      const dx = x - centerX;
      const dy = y - centerY;
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      const scale = (Math.min(rect.width, rect.height) * 0.43) / 25;
      radiusM = Math.min(25, Number((pixelDist / Math.max(1, scale)).toFixed(1)));

      const isAllStrata = selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded';
      let activeStrataId = selectedSectionFilter;
      if (isAllStrata) {
        if (radiusM < 7.0) activeStrataId = 'l4';
        else if (radiusM < 11.0) activeStrataId = 'l5';
        else if (radiusM < 14.5) activeStrataId = 'l3';
        else if (radiusM < 17.5) activeStrataId = 'l2';
        else if (radiusM < 20.5) activeStrataId = 'l6';
        else if (radiusM < 23.5) activeStrataId = 'l1';
        else activeStrataId = 'l7';
      }

      const STRATA_PROBES = {
        l1: { name: 'Layer 1: Caprock Soil Crust (618-628m)', depth: 622, baseTemp: 48.0, casingTemp: 76.0, baseVisc: 18500, hasPlume: false, condR: 14.5, color: '#a8a29e' },
        l2: { name: 'Layer 2: Upper Tan Jodhpur Sand (628-640m)', depth: 634, baseTemp: 68.5, casingTemp: 110.0, baseVisc: 3200, hasPlume: false, condR: 16.5, color: '#fed7aa' },
        l3: { name: 'Layer 3: Slate-Blue Shale Barrier (640-650m)', depth: 645, baseTemp: 88.0, casingTemp: 96.0, baseVisc: 1450, hasPlume: false, condR: 15.0, color: '#93c5fd' },
        l4: { name: 'Layer 4: Main Payzone #1 Plume (650-662m)', depth: 656, baseTemp: dynamicTemp, casingTemp: sandboxSteamTemp, baseVisc: dynamicViscosity, hasPlume: true, scale: 1.0, color: '#fbbf24' },
        l5: { name: 'Layer 5: Secondary Payzone #2 Wave (662-674m)', depth: 668, baseTemp: 142.0, casingTemp: 180.0, baseVisc: 240, hasPlume: true, scale: 0.85, color: '#f59e0b' },
        l6: { name: 'Layer 6: Lower Shale Barrier (674-684m)', depth: 679, baseTemp: 74.0, casingTemp: 82.0, baseVisc: 2800, hasPlume: false, condR: 13.8, color: '#93c5fd' },
        l7: { name: 'Layer 7: Basal Basement Bedrock (684-700m+)', depth: 692, baseTemp: 52.0, casingTemp: 60.0, baseVisc: 16200, hasPlume: false, condR: 11.0, color: '#78716c' }
      };

      const probe = STRATA_PROBES[activeStrataId] || STRATA_PROBES.l4;
      formationLayer = probe.name;
      probedDepth = probe.depth;
      stratumColor = probe.color;

      if (probe.hasPlume) {
        const effRadius = dynamicRadius * (probe.scale || 1.0);
        const frac = Math.min(1.0, radiusM / Math.max(1, effRadius));
        localT = Number((48 + (probe.baseTemp - 48) * Math.max(0, 1 - frac ** 1.3)).toFixed(1));
        const tK = localT + 273.15;
        localVisc = Math.round(Math.max(15, 0.0045 * Math.exp(4600.0 / tK)));
      } else {
        const condFrac = Math.min(1.0, radiusM / (probe.condR || 15.0));
        localT = Number((probe.baseTemp + (probe.casingTemp - probe.baseTemp) * Math.max(0, (1 - condFrac) ** 1.5)).toFixed(1));
        const tK = localT + 273.15;
        localVisc = Math.round(Math.max(15, 0.0045 * Math.exp(4600.0 / tK)));
      }
    } else {
      // 3D Isometric mapping with dynamic rotation & zoom
      const blockBaseY = centerY + 28 + panOffset.y;
      const verticalOffset = (blockBaseY - y) / zoom3d;
      const horizontalOffset = Math.abs(x - (centerX + panOffset.x)) / zoom3d;
      radiusM = Math.min(25, Number((horizontalOffset / (6.5 * expansionFactor)).toFixed(1)));

      if (verticalOffset > 75) {
        formationLayer = 'Overburden Shale Caprock';
        probedDepth = Math.round(630 - (verticalOffset - 75) * 0.3);
      } else if (verticalOffset > 50) {
        formationLayer = 'Upper Jodhpur Sand';
        probedDepth = Math.round(642 - (verticalOffset - 50) * 0.4);
      } else if (verticalOffset > -10) {
        formationLayer = 'Main Heavy-Oil Payzone (Net Pay 18m)';
        probedDepth = Math.round(656 - verticalOffset * 0.3);
      } else {
        formationLayer = 'Basal Sand / Underburden';
        probedDepth = Math.round(670 - (verticalOffset + 10) * 0.4);
      }

      const frac = Math.min(1.0, radiusM / Math.max(1, dynamicRadius));
      localT = Number((48 + (dynamicTemp - 48) * Math.max(0, 1 - frac ** 1.3)).toFixed(1));
      const tK = localT + 273.15;
      localVisc = Math.round(Math.max(15, 0.0045 * Math.exp(4600.0 / tK)));
    }

    const frac = Math.min(1.0, radiusM / Math.max(1, dynamicRadius));
    const localMobility = Number((1200 / Math.max(20, localVisc)).toFixed(2));
    const localSg = Number(Math.max(0, (1 - frac * 1.4) * sandboxSteamQuality * 0.95).toFixed(2));
    const localPressure = Number((resPressure * 0.22 + (resPressure * 0.78) * Math.min(1, Math.log(1 + frac * 8) / Math.log(9))).toFixed(1));

    // Determine discrete thermal section and temperature differential ΔT
    let thermalSection = 'Native Sandstone Matrix (48°C Baseline)';
    let sectionColor = '#94a3b8';
    let sectionBg = 'rgba(148, 163, 184, 0.15)';
    if (localT >= 200) {
      thermalSection = 'Zone 1: Superheated Steam Core (>200°C)';
      sectionColor = '#fef08a';
      sectionBg = 'rgba(254, 240, 138, 0.22)';
    } else if (localT >= 150) {
      thermalSection = 'Zone 2: Latent Condensation Bank (150–200°C)';
      sectionColor = '#f97316';
      sectionBg = 'rgba(249, 115, 22, 0.22)';
    } else if (localT >= 100) {
      thermalSection = 'Zone 3: Mobilized Oil Bank (100–150°C)';
      sectionColor = '#ef4444';
      sectionBg = 'rgba(239, 68, 68, 0.22)';
    } else if (localT >= 60) {
      thermalSection = 'Zone 4: Conductive Heat Front (60–100°C)';
      sectionColor = '#b91c1c';
      sectionBg = 'rgba(185, 28, 28, 0.22)';
    }
    const deltaT = Number((localT - 48.0).toFixed(1));

    setHoverCoord({
      x,
      y,
      r: radiusM,
      depth: probedDepth,
      formationLayer,
      temp: localT,
      deltaT,
      thermalSection,
      sectionColor: viewProjection === '2d' ? stratumColor : sectionColor,
      sectionBg,
      visc: localVisc,
      mobility: localMobility,
      sg: localSg,
      pressure: localPressure
    });
  };

  const handleCanvasMouseLeave = () => {
    isDraggingRef.current = false;
    setHoverCoord(null);
  };

  // Trigger simulated steam pulse
  const triggerSteamPulse = () => {
    setPulseActive(true);
    setSimDay(0);
    setTimeout(() => setPulseActive(false), 2800);
  };

  // Stations for Wellbore Depth Profile
  const stations = useMemo(() => {
    if (depthProfileData?.stations && depthProfileData.stations.length > 0) {
      return depthProfileData.stations;
    }
    // High-resolution synthetic 15-station profile for 1150m Jodhpur well
    const depths = [0, 80, 160, 240, 320, 420, 520, 620, 720, 820, 920, 1020, 1080, 1120, 1150];
    return depths.map((d) => {
      const frac = d / 1150;
      const t = Number((38 + (resTemp - 38) * (frac ** 0.85)).toFixed(1));
      const p = Number((12.5 + d * 0.062 + (frac * 4.2)).toFixed(1));
      const tK = t + 273.15;
      const v = Math.round(Math.max(20, 0.0045 * Math.exp(4600.0 / tK)));
      const aop = Number((32.0 - 0.15 * (t - 50.0)).toFixed(1));
      const asphRisk = Number(Math.max(0, Math.min(100, (1.0 - p / Math.max(1, aop)) * 65 + (1 - t / 120) * 35)).toFixed(1));

      return {
        depth_m: d,
        temperature_c: t,
        pressure_bar: p,
        viscosity_cp: v,
        asphaltene_risk_pct: asphRisk,
        aop_bar: aop
      };
    });
  }, [depthProfileData, resTemp]);

  // Current station probed
  const currentProbedStation = useMemo(() => {
    return stations.reduce((prev, curr) => {
      return Math.abs(curr.depth_m - selectedDepth) < Math.abs(prev.depth_m - selectedDepth) ? curr : prev;
    }, stations[0]);
  }, [stations, selectedDepth]);

  // Asphaltene Analysis data
  const asphAOP = asphalteneData?.asphaltene_onset_pressure_bar || 37.3;
  const asphBHP = asphalteneData?.current_pressure_bar || 18.5;
  const asphADI = asphalteneData?.asphaltene_deposition_index_pct || 72.4;
  const asphStatus = asphalteneData?.status || 'CRITICAL_PRECIPITATION_RISK';
  const asphFoulingRate = asphalteneData?.estimated_barrel_fouling_microns_mo || 54.3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* 1. TOP HERO PANEL: Ultra-Compact Executive Thermal Status & High-Contrast Metrics */}
      <div
        style={{
          background: 'transparent',
          color: '#1c1917',
          border: '1.5px solid rgba(234, 88, 12, 0.55)',
          borderRadius: '8px',
          padding: '0.55rem 0.85rem',
          boxShadow: 'none'
        }}
      >
        {/* Top Header Row: Well Title + Badges + Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid rgba(234, 88, 12, 0.3)', paddingBottom: '0.45rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.45)'
              }}
            >
              <Flame size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 900, letterSpacing: '0.03em', margin: 0, color: '#1c1917' }}>
                  RESERVOIR &amp; THERMAL ADVANCED TWIN — WELL {selectedWellId}
                </h2>
                <span
                  style={{
                    background: 'rgba(234, 88, 12, 0.15)',
                    border: '1.5px solid #ea580c',
                    color: '#7c2d12',
                    padding: '1px 7px',
                    borderRadius: '8px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Sparkles size={11} color="#ea580c" /> CSS Cycle #{twinState?.cycle_number || 4} Thermal Wave
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#573a21', marginTop: '1px', fontWeight: 600 }}>
                Jodhpur Sandstone (Heavy Bitumen ~17–19° API) &bull; Marx-Langenheim Energy Partition &bull; AOP Onset Model
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              onClick={triggerSteamPulse}
              style={{
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: '#ffffff',
                border: '1.5px solid #9a3412',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
              }}
              title="Simulate immediate high-pressure cyclic steam injection pulse"
            >
              <Zap size={13} /> Inject Steam Pulse
            </button>
            <button
              onClick={() => onTriggerOptimization && onTriggerOptimization(selectedWellId)}
              style={{
                background: 'rgba(234, 88, 12, 0.12)',
                color: '#7c2d12',
                border: '1.5px solid #ea580c',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sliders size={13} /> Optimize CSS
            </button>
          </div>
        </div>

        {/* 4 Ultra-Compact High-Contrast Real-Time Indicator Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
          {/* Tile 1: Reservoir Formation Temp */}
          <div
            style={{
              background: 'transparent',
              borderRadius: '6px',
              padding: '0.45rem 0.65rem',
              border: '1.5px solid rgba(234, 88, 12, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#7c2d12', fontWeight: 800 }}>
              <span style={{ letterSpacing: '0.02em' }}>FORMATION TEMP</span>
              <Thermometer size={13} color="#ea580c" />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1c1917', margin: '0.15rem 0' }}>
              {dynamicTemp.toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 800 }}>°C</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#431407', fontWeight: 700 }}>
              <span>Cooling: -{coolingRate} °C/d</span>
              <span style={{ color: '#9a3412', fontWeight: 800 }}>
                {dynamicTemp > 65 ? 'Optimal Mobilization' : 'Re-Stimulation'}
              </span>
            </div>
          </div>

          {/* Tile 2: Heated Drainage Radius */}
          <div
            style={{
              background: 'transparent',
              borderRadius: '6px',
              padding: '0.45rem 0.65rem',
              border: '1.5px solid rgba(234, 88, 12, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#7c2d12', fontWeight: 800 }}>
              <span style={{ letterSpacing: '0.02em' }}>HEATED DRAINAGE RADIUS</span>
              <Compass size={13} color="#ea580c" />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1c1917', margin: '0.15rem 0' }}>
              {dynamicRadius} <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 800 }}>m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#431407', fontWeight: 700 }}>
              <span>Area: {Math.round(Math.PI * dynamicRadius * dynamicRadius)} m²</span>
              <span style={{ color: '#9a3412', fontWeight: 800 }}>Payzone: {sandboxNetPay} m</span>
            </div>
          </div>

          {/* Tile 3: Live In-Situ Viscosity */}
          <div
            style={{
              background: 'transparent',
              borderRadius: '6px',
              padding: '0.45rem 0.65rem',
              border: '1.5px solid rgba(234, 88, 12, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#7c2d12', fontWeight: 800 }}>
              <span style={{ letterSpacing: '0.02em' }}>IN-SITU CRUDE VISCOSITY</span>
              <Droplets size={13} color="#ea580c" />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1c1917', margin: '0.15rem 0' }}>
              {dynamicViscosity.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 800 }}>cP</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#431407', fontWeight: 700 }}>
              <span>Cold Base: 12.5k cP</span>
              <span style={{ color: '#9a3412', fontWeight: 800 }}>
                -{((1 - dynamicViscosity / 12500) * 100).toFixed(0)}% reduced
              </span>
            </div>
          </div>

          {/* Tile 4: Fluid Mobility Ratio */}
          <div
            style={{
              background: 'transparent',
              borderRadius: '6px',
              padding: '0.45rem 0.65rem',
              border: '1.5px solid rgba(234, 88, 12, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: '#7c2d12', fontWeight: 800 }}>
              <span style={{ letterSpacing: '0.02em' }}>MOBILITY RATIO &amp; FLOW</span>
              <Activity size={13} color="#ea580c" />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1c1917', margin: '0.15rem 0' }}>
              {dynamicMobility} <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 800 }}>&lambda;</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#431407', fontWeight: 700 }}>
              <span>BHP: {resPressure} bar</span>
              <span style={{ color: '#9a3412', fontWeight: 800 }}>
                {dynamicMobility > 0.3 ? 'High Inflow Velocity' : 'Near-Wellbore Drag'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS: Plume vs Wellbore Track vs Energy Balance vs Asphaltene */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'transparent', padding: '3px', borderRadius: '7px', border: '1.5px solid rgba(234, 88, 12, 0.35)' }}>
        {[
          { id: 'plume', label: '2D/3D Radial Thermal Plume & Isotherms', icon: Flame },
          { id: 'wellbore', label: 'Wellbore Depth Profile T(z), P(z), \u03BC(z)', icon: Layers },
          { id: 'energy', label: 'Marx-Langenheim Heat Balance & Kinetics', icon: Zap },
          { id: 'asphaltene', label: 'Thermodynamic Asphaltene (AOP) Model', icon: ShieldAlert }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.45rem 0.65rem',
                border: isActive ? '1.5px solid #9a3412' : '1px solid transparent',
                borderRadius: '5px',
                background: isActive ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'transparent',
                color: isActive ? '#ffffff' : '#431407',
                fontWeight: 800,
                fontSize: '0.74rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} color={isActive ? '#ffffff' : '#ea580c'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT 1: RADIAL THERMAL PLUME & ISOTHERMS */}
      {activeTab === 'plume' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Full-Width Viewport: LAYER CONTROLS TOP -> DIGITAL TWIN -> PHYSICS & SUB-CONTROLS BELOW */}
          <div
            style={{
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: 'transparent',
              color: '#1c1917',
              borderRadius: '8px',
              border: '1.5px solid rgba(234, 88, 12, 0.45)',
              boxShadow: 'none'
            }}
          >
            {/* 1. PARAMETER PILLS + LAYER DROPDOWN + 2D/3D + TIME CONTROLS (SINGLE LINE NOWRAP) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                gap: '0.45rem',
                background: 'transparent',
                padding: '0.4rem 0.65rem',
                borderRadius: '8px',
                border: '1.5px solid rgba(234, 88, 12, 0.35)',
                boxShadow: 'none'
              }}
            >
              {/* Left Group: Parameter Pills & 7 Strata Layers Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', flexShrink: 0 }}>
                {/* Parameter Selection Pill Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'nowrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#7c2d12', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '3px', marginRight: '2px' }}>
                    <Sliders size={13} color="#ea580c" /> PARAMETER:
                  </span>
                  {Object.values(LAYER_CONFIGS).map((layer) => {
                    const IconComp = layer.icon;
                    const isActive = activeLayer === layer.id;
                    return (
                      <button
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id)}
                        style={{
                          background: isActive ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'rgba(234, 88, 12, 0.08)',
                          color: isActive ? '#ffffff' : '#431407',
                          border: isActive ? '1.5px solid #9a3412' : '1px solid rgba(234, 88, 12, 0.3)',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: isActive ? '0 2px 8px rgba(234, 88, 12, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComp size={12} color={isActive ? '#ffffff' : '#ea580c'} />
                        <span>{layer.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 7 Geological Strata Layers Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', padding: '2px 5px', borderRadius: '5px', border: '1.5px solid rgba(234, 88, 12, 0.45)', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#7c2d12', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Layers size={13} color="#ea580c" /> LAYER:
                  </span>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.75)',
                      color: '#1c1917',
                      border: '1.5px solid #ea580c',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '190px'
                    }}
                  >
                    {STRATA_LAYER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} style={{ background: '#ffffff', color: '#1c1917', fontWeight: 700 }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* View Projection (2D vs 3D) & Time Control Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'nowrap', flexShrink: 0 }}>
                {/* 2D / 3D Segmented Toggle */}
                <div
                  style={{
                    display: 'flex',
                    background: 'transparent',
                    padding: '2px',
                    borderRadius: '6px',
                    border: '1.5px solid rgba(234, 88, 12, 0.45)'
                  }}
                >
                  <button
                    onClick={() => setViewProjection('3d')}
                    style={{
                      background: viewProjection === '3d' ? '#ea580c' : 'transparent',
                      color: viewProjection === '3d' ? '#ffffff' : '#431407',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Layers size={12} /> 🪨 7-Layer Strata View
                  </button>
                  <button
                    onClick={() => setViewProjection('2d')}
                    style={{
                      background: viewProjection === '2d' ? '#ea580c' : 'transparent',
                      color: viewProjection === '2d' ? '#ffffff' : '#431407',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Compass size={12} /> 2D Contour
                  </button>
                </div>

                {/* Time Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      background: '#ea580c',
                      border: '1.5px solid #9a3412',
                      color: '#ffffff',
                      borderRadius: '5px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(234, 88, 12, 0.35)'
                    }}
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    {isPlaying ? 'Pause' : 'Time-Lapse'}
                  </button>
                  <button
                    onClick={() => setSimDay(0)}
                    style={{
                      background: 'rgba(234, 88, 12, 0.12)',
                      border: '1.5px solid #ea580c',
                      color: '#7c2d12',
                      borderRadius: '5px',
                      padding: '4px 7px',
                      cursor: 'pointer',
                      fontWeight: 800
                    }}
                    title="Reset to Day 0"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      color: '#7c2d12',
                      background: 'rgba(234, 88, 12, 0.18)',
                      padding: '3px 7px',
                      borderRadius: '5px',
                      border: '1.5px solid #ea580c'
                    }}
                  >
                    Day {simDay}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DIGITAL TWIN 3D WEBGL MODEL VIEW / 2D CANVAS PLAN VIEW */}
            {viewProjection === '3d' ? (
              <Reservoir3DViewport
                activeLayer={activeLayer}
                dynamicRadius={dynamicRadius}
                dynamicTemp={dynamicTemp}
                dynamicViscosity={dynamicViscosity}
                sandboxSteamTemp={sandboxSteamTemp}
                sandboxSteamQuality={sandboxSteamQuality}
                sandboxSlugTonnes={sandboxSlugTonnes}
                sandboxNetPay={sandboxNetPay}
                dynamicMobility={dynamicMobility}
                oilFlowRate={oilFlowRate}
                oilFlowVelocity={oilFlowVelocity}
                selectedSectionFilter={selectedSectionFilter}
                onSelectSection={setSelectedSectionFilter}
                expansionFactor={expansionFactor}
                onExpansionChange={setExpansionFactor}
                simDay={simDay}
                isPlaying={isPlaying}
              />
            ) : (
              <div style={{ position: 'relative', width: '100%', height: '480px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(217, 119, 6, 0.35)', boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.85)' }}>
                {/* 2D Stratum Filter Layer Selector Bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    overflowX: 'auto',
                    background: 'rgba(15, 12, 9, 0.94)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(217, 119, 6, 0.4)',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    zIndex: 10,
                    scrollbarWidth: 'none'
                  }}
                >
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#fed7aa', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, paddingRight: '5px', borderRight: '1px solid rgba(217, 119, 6, 0.3)' }}>
                    <Layers size={11} /> Stratum:
                  </span>
                  {[
                    { id: 'all', label: 'All 7 Strata', color: '#fbbf24' },
                    { id: 'l1', label: 'L1: Caprock (618-628m)', color: '#f59e0b' },
                    { id: 'l2', label: 'L2: Upper Sand (628-640m)', color: '#fbbf24' },
                    { id: 'l3', label: 'L3: Barrier Shale (640-650m)', color: '#ea580c' },
                    { id: 'l4', label: 'L4: Payzone #1 (650-662m)', color: '#fef08a' },
                    { id: 'l5', label: 'L5: Payzone #2 (662-674m)', color: '#f59e0b' },
                    { id: 'l6', label: 'L6: Lower Shale (674-684m)', color: '#ea580c' },
                    { id: 'l7', label: 'L7: Basement (684m+)', color: '#d97706' }
                  ].map((stratum) => {
                    const isSelected = selectedSectionFilter === stratum.id || (stratum.id === 'all' && (selectedSectionFilter === 'all' || selectedSectionFilter === 'exploded'));
                    return (
                      <button
                        key={stratum.id}
                        onClick={() => setSelectedSectionFilter(stratum.id)}
                        style={{
                          background: isSelected ? 'rgba(217, 119, 6, 0.4)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#ffffff' : '#d6d3d1',
                          border: isSelected ? `1px solid ${stratum.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.64rem',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: stratum.color }} />
                        {stratum.label}
                      </button>
                    );
                  })}
                </div>

                <canvas
                  ref={canvasRef}
                  width={680}
                  height={480}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseLeave}
                  onWheel={handleCanvasWheel}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    cursor: 'crosshair'
                  }}
                />

                {/* Hover Tooltip HUD for 2D View */}
                {hoverCoord && (
                  <div
                    style={{
                      position: 'absolute',
                      top: Math.min(310, hoverCoord.y + 12),
                      left: Math.min(420, hoverCoord.x + 12),
                      background: 'rgba(15, 12, 9, 0.95)',
                      backdropFilter: 'blur(8px)',
                      border: `1.5px solid ${hoverCoord.sectionColor || activeLayerCfg.color}`,
                      padding: '0.6rem 0.9rem',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      pointerEvents: 'none',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
                      zIndex: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px'
                    }}
                  >
                    <div style={{ fontWeight: 800, color: hoverCoord.sectionColor || activeLayerCfg.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Flame size={13} /> Radial Point: r = {Number(hoverCoord.r ?? 0).toFixed(1)}m
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: '#d6d3d1' }}>Local Temperature:</span>
                      <strong style={{ color: '#fef08a' }}>{Number(hoverCoord.temp ?? 0).toFixed(1)} °C</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ color: '#d6d3d1' }}>Bitumen Viscosity:</span>
                      <strong style={{ color: '#fb923c' }}>{Number(hoverCoord.visc ?? hoverCoord.viscosity ?? 0).toLocaleString()} cP</strong>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#fed7aa', marginTop: '2px' }}>
                      {hoverCoord.thermalSection || hoverCoord.sectionName || hoverCoord.formationLayer}
                    </div>
                  </div>
                )}

                {/* Dynamic Colormap Legend Overlay for 2D View */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '12px',
                    right: '12px',
                    background: 'rgba(15, 12, 9, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(217, 119, 6, 0.35)',
                    borderRadius: '6px',
                    padding: '0.45rem 0.85rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#fed7aa', fontWeight: 700 }}>
                    {activeLayerCfg.stops.map((stop, sIdx) => (
                      <span key={sIdx}>{stop}</span>
                    ))}
                  </div>
                  <div style={{ position: 'relative', margin: '4px 0' }}>
                    <div
                      style={{
                        height: '9px',
                        width: '100%',
                        background: activeLayerCfg.gradient,
                        borderRadius: '4px',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#a8a29e' }}>
                    <span>{activeLayerCfg.legendSubLeft}</span>
                    <span style={{ color: activeLayerCfg.color, fontWeight: 600 }}>{activeLayerCfg.legendSubCenter}</span>
                    <span>{activeLayerCfg.legendSubRight}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACTIVE LAYER DIAGNOSTICS & GOVERNING PHYSICS STRIP (BELOW DIGITAL TWIN) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                background: 'transparent',
                borderLeft: `3px solid ${activeLayerCfg.color}`,
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                fontSize: '0.7rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: activeLayerCfg.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} /> {activeLayerCfg.shortName}:
                </span>
                <span style={{ color: '#431407', fontWeight: 600 }}>
                  {activeLayerCfg.equation}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: '#431407', flexWrap: 'wrap' }}>
                <span>Perforation Core: <strong style={{ color: '#1c1917' }}>{activeLayerCfg.coreValue}</strong></span>
                <span>Formation Boundary: <strong style={{ color: '#573a21' }}>{activeLayerCfg.boundaryValue}</strong></span>
                <span
                  style={{
                    background: 'rgba(234, 88, 12, 0.18)',
                    color: '#7c2d12',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    border: '1px solid rgba(234, 88, 12, 0.45)'
                  }}
                >
                  rh = {dynamicRadius}m
                </span>
              </div>
            </div>

            {/* Time Scrub Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#573a21', fontWeight: 700 }}>Day 0 (Steam Soak)</span>
              <input
                type="range"
                min="0"
                max="90"
                value={simDay}
                onChange={(e) => setSimDay(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#ea580c' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#573a21', fontWeight: 700 }}>Day 90 (End Cycle)</span>
            </div>

            {/* 4. THERMAL SENSITIVITY SANDBOX & ISOTHERM ADVANCE RADII COUPLED TO OIL FLOW */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '1rem',
                marginTop: '0.65rem'
              }}
            >
              {/* Left Panel: Thermal Sensitivity Sandbox (4 Interactive Sliders) */}
              <div
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(217, 119, 6, 0.45)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(217, 119, 6, 0.3)', paddingBottom: '0.45rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#7c2d12', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={15} color="#ea580c" /> THERMAL SENSITIVITY SANDBOX
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#7c2d12', fontWeight: 700, background: 'rgba(234, 88, 12, 0.15)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(234, 88, 12, 0.4)' }}>
                      Inflow: {oilFlowRate} bopd
                    </span>
                  </div>
                </div>

                {/* Slider 1: Steam Injection Temperature */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#431407' }}>
                    <span style={{ fontWeight: 600 }}>Steam Injection Temperature:</span>
                    <strong style={{ color: '#9a3412', fontFamily: 'monospace' }}>{sandboxSteamTemp} °C</strong>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="320"
                    step="5"
                    value={sandboxSteamTemp}
                    onChange={(e) => setSandboxSteamTemp(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#78350f' }}>
                    <span>180 °C (Saturated)</span>
                    <span>320 °C (Superheated)</span>
                  </div>
                </div>

                {/* Slider 2: Injection Steam Quality (x) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#431407' }}>
                    <span style={{ fontWeight: 600 }}>Injection Steam Quality (x):</span>
                    <strong style={{ color: '#9a3412', fontFamily: 'monospace' }}>{Math.round(sandboxSteamQuality * 100)}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0.40"
                    max="1.00"
                    step="0.05"
                    value={sandboxSteamQuality}
                    onChange={(e) => setSandboxSteamQuality(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#78350f' }}>
                    <span>40% (Wet Steam)</span>
                    <span>100% (Dry Vapor)</span>
                  </div>
                </div>

                {/* Slider 3: Steam Slug Volume */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#431407' }}>
                    <span style={{ fontWeight: 600 }}>Steam Slug Volume:</span>
                    <strong style={{ color: '#9a3412', fontFamily: 'monospace' }}>{sandboxSlugTonnes} tonnes</strong>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="50"
                    value={sandboxSlugTonnes}
                    onChange={(e) => setSandboxSlugTonnes(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#78350f' }}>
                    <span>500 tonnes</span>
                    <span>3,000 tonnes</span>
                  </div>
                </div>

                {/* Slider 4: Net Pay Sandstone Thickness */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#431407' }}>
                    <span style={{ fontWeight: 600 }}>Net Pay Sandstone Thickness:</span>
                    <strong style={{ color: '#9a3412', fontFamily: 'monospace' }}>{sandboxNetPay} m</strong>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="32"
                    step="1"
                    value={sandboxNetPay}
                    onChange={(e) => setSandboxNetPay(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#78350f' }}>
                    <span>6 m (Thin Sand)</span>
                    <span>32 m (Massive Jodhpur)</span>
                  </div>
                </div>

                {/* Live Oil Flow Coupling Diagnostics Strip */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'transparent',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    fontSize: '0.68rem',
                    color: '#431407',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Droplets size={12} color="#ea580c" /> Darcy Velocity: <strong style={{ color: '#1c1917' }}>{oilFlowVelocity} m/d</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Flame size={12} color="#ea580c" /> Heat Chamber: <strong style={{ color: '#9a3412' }}>{dynamicRadius}m</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={12} color="#ea580c" /> Mobility &lambda;: <strong style={{ color: '#7c2d12' }}>{dynamicMobility}</strong>
                  </span>
                </div>
              </div>

              {/* Right Panel: Isotherm Advance Radii & Drag Reduction Table */}
              <div
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(217, 119, 6, 0.45)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(217, 119, 6, 0.3)', paddingBottom: '0.45rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#7c2d12', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flame size={15} color="#ea580c" /> ISOTHERM ADVANCE RADII &amp; DRAG REDUCTION
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#573a21', fontWeight: 600 }}>
                    Marx-Langenheim Radial Kinetic Model
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid rgba(217, 119, 6, 0.4)', color: '#431407' }}>
                        <th style={{ padding: '0.4rem 0.5rem', fontWeight: 800 }}>ISOTHERM</th>
                        <th style={{ padding: '0.4rem 0.5rem', fontWeight: 800 }}>RADIUS (M)</th>
                        <th style={{ padding: '0.4rem 0.5rem', fontWeight: 800 }}>VISCOSITY</th>
                        <th style={{ padding: '0.4rem 0.5rem', fontWeight: 800 }}>MOBILITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isothermTableData.map((row, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid rgba(180, 83, 9, 0.15)',
                            background: idx % 2 === 0 ? 'rgba(234, 88, 12, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '0.55rem 0.5rem', color: row.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: row.color }} />
                            {row.name}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: '#1c1917', fontFamily: 'monospace', fontWeight: 700 }}>
                            {row.radius}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: '#431407', fontFamily: 'monospace', fontWeight: 600 }}>
                            {row.viscosity}
                          </td>
                          <td style={{ padding: '0.55rem 0.5rem', color: '#9a3412', fontFamily: 'monospace', fontWeight: 700 }}>
                            {row.mobility}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Thermal Sweep Efficiency & Drag Cut Summary Footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    background: 'transparent',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.68rem',
                    color: '#431407',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}
                >
                  <span>
                    Viscosity Drag Cut: <strong style={{ color: '#9a3412' }}>-{((1 - dynamicViscosity / 12500) * 100).toFixed(1)}%</strong>
                  </span>
                  <span>
                    Steam Sweep Efficiency: <strong style={{ color: '#c2410c' }}>{Math.min(96, (45 + sandboxSteamQuality * 32 + (sandboxSlugTonnes / 3000) * 19)).toFixed(1)}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT 2: WELLBORE & DOWNHOLE PUMP COMPLETION */}
      {activeTab === 'wellbore' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sub-navigation bar inside Wellbore tab */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'transparent',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="#f59e0b" /> DOWNHOLE ARCHITECTURE:
              </span>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setWellboreSubTab('wireline_log')}
                  style={{
                    background: '#b45309',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Activity size={13} /> Continuous Wireline Depth Log
                </button>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#7c2d12', background: 'rgba(234, 88, 12, 0.15)', border: '1px solid #ea580c', borderRadius: '4px', padding: '2px 8px', fontWeight: 700 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
                ESP Dynamic Submergence: 42.0 m
              </span>
              <span style={{ fontSize: '0.72rem', color: '#431407', fontFamily: 'monospace', fontWeight: 600 }}>
                Pump Setting Depth: <strong style={{ color: '#1c1917' }}>1,100 m MD</strong>
              </span>
            </div>
          </div>

          {/* MAIN WELLBORE SUB-TAB CONTENT */}
          {(wellboreSubTab === 'pump_completion' || wellboreSubTab === 'split_view') && (
            <div className="responsive-split-grid" style={{ gap: '1.25rem' }}>
              {/* Left: Interactive Downhole ESP Pump Completion Schematic (Exact match to uploaded blueprint) */}
              <div
                className="sandstone-card"
                style={{
                  padding: '1.2rem',
                  background: 'transparent',
                  border: '1.5px solid #78350f',
                  color: '#1c1917',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                {/* Header with Title & View Mode Selector */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div className="card-heading-bold" style={{ fontSize: '0.86rem', color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Gauge size={15} color="#ea580c" /> DOWNHOLE ESP PUMP &amp; COMPLETION SCHEMATIC
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#573a21', fontWeight: 600 }}>
                      Casing 7.0" ID • Tubing 2-7/8" EUE • Submerged Heavy Oil Artificial Lift Assembly
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '5px' }}>
                    <button
                      onClick={() => setPumpViewMode('3d_model')}
                      style={{
                        background: pumpViewMode === '3d_model' ? '#d97706' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={11} color="#fef08a" /> 3D WebGL Model
                    </button>
                    <button
                      onClick={() => setPumpViewMode('interactive')}
                      style={{
                        background: pumpViewMode === 'interactive' ? '#d97706' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Interactive Vector
                    </button>
                    <button
                      onClick={() => setPumpViewMode('blueprint')}
                      style={{
                        background: pumpViewMode === 'blueprint' ? '#d97706' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Blueprint View
                    </button>
                  </div>
                </div>

                {/* 3D WebGL Model View vs SVG Schematic Canvas vs Blueprint View */}
                {pumpViewMode === '3d_model' ? (
                  <Pump3DViewport
                    selectedPart={selectedPumpPart}
                    onSelectPart={setSelectedPumpPart}
                    pumpComponents={PUMP_COMPONENTS}
                  />
                ) : pumpViewMode === 'interactive' ? (
                  <div
                    style={{
                      position: 'relative',
                      background: 'transparent',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '520px',
                      overflow: 'hidden'
                    }}
                  >
                    <svg
                      viewBox="0 0 340 760"
                      style={{
                        width: '100%',
                        maxHeight: '540px',
                        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.85))'
                      }}
                    >
                      <defs>
                        {/* Wellhead Bronze Gradient */}
                        <linearGradient id="wellheadBronzeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#78350f" />
                          <stop offset="30%" stopColor="#f59e0b" />
                          <stop offset="70%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#451a03" />
                        </linearGradient>

                        {/* Pipe Steel Metallic Gradient */}
                        <linearGradient id="pipeSteelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#64748b" />
                          <stop offset="35%" stopColor="#f1f5f9" />
                          <stop offset="70%" stopColor="#cbd5e1" />
                          <stop offset="100%" stopColor="#334155" />
                        </linearGradient>

                        {/* Outer Casing Metallic Walls */}
                        <linearGradient id="casingWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#475569" />
                          <stop offset="45%" stopColor="#cbd5e1" />
                          <stop offset="100%" stopColor="#1e293b" />
                        </linearGradient>

                        {/* Subterranean Annular Fluid Gradient (Olive Oil Column) */}
                        <linearGradient id="annularFluidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#4d6b38" stopOpacity="0.75" />
                          <stop offset="30%" stopColor="#3d592b" stopOpacity="0.85" />
                          <stop offset="85%" stopColor="#2e4220" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#1e2b15" stopOpacity="0.98" />
                        </linearGradient>

                        {/* Crimson Pump Metallic Housing */}
                        <linearGradient id="crimsonPumpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#450a0a" />
                          <stop offset="25%" stopColor="#b91c1c" />
                          <stop offset="55%" stopColor="#ef4444" />
                          <stop offset="85%" stopColor="#991b1b" />
                          <stop offset="100%" stopColor="#2e0505" />
                        </linearGradient>

                        {/* Crimson Coupling Ring */}
                        <linearGradient id="crimsonCollarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2e0505" />
                          <stop offset="40%" stopColor="#7f1d1d" />
                          <stop offset="70%" stopColor="#b91c1c" />
                          <stop offset="100%" stopColor="#1a0303" />
                        </linearGradient>

                        {/* Golden Intake Screen Cage */}
                        <linearGradient id="goldenIntakeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#78350f" />
                          <stop offset="25%" stopColor="#fbbf24" />
                          <stop offset="55%" stopColor="#fef08a" />
                          <stop offset="85%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#451a03" />
                        </linearGradient>

                        {/* Electric Motor Crimson Gradient */}
                        <linearGradient id="crimsonMotorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b0712" />
                          <stop offset="30%" stopColor="#991b1b" />
                          <stop offset="60%" stopColor="#dc2626" />
                          <stop offset="90%" stopColor="#7f1d1d" />
                          <stop offset="100%" stopColor="#20040a" />
                        </linearGradient>

                        {/* Arrow Marker Definitions */}
                        <marker id="arrowGreen" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ea580c" />
                        </marker>
                        <marker id="arrowRed" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ef4444" />
                        </marker>
                      </defs>

                      {/* 1. OUTER CASING STRING & SUBTERRANEAN FLUID COLUMN */}
                      {/* Casing Bore Background */}
                      <rect x="128" y="138" width="84" height="570" fill="rgba(30, 41, 59, 0.5)" />

                      {/* Olive Green Produced Fluid Level in Annulus */}
                      <rect x="128" y="225" width="84" height="483" fill="url(#annularFluidGrad)" />
                      {/* Fluid Level Meniscus Line */}
                      <line x1="128" y1="225" x2="212" y2="225" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2,2" />

                      {/* Left Casing Wall */}
                      <rect x="120" y="138" width="8" height="570" fill="url(#casingWallGrad)" stroke="#475569" strokeWidth="0.5" />
                      {/* Right Casing Wall */}
                      <rect x="212" y="138" width="8" height="570" fill="url(#casingWallGrad)" stroke="#475569" strokeWidth="0.5" />

                      {/* Casing Depth Collar Lines */}
                      {[210, 310, 410, 510, 610].map((cy) => (
                        <g key={cy}>
                          <line x1="117" y1={cy} x2="128" y2={cy} stroke="#cbd5e1" strokeWidth="1" />
                          <line x1="212" y1={cy} x2="223" y2={cy} stroke="#cbd5e1" strokeWidth="1" />
                        </g>
                      ))}

                      {/* 2. TOP SURFACE WELLHEAD / CHRISTMAS TREE */}
                      <g
                        onClick={() => setSelectedPumpPart('wellhead')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'wellhead' ? 1 : 0.9}
                      >
                        {/* Top Stem & Pressure Gauge */}
                        <line x1="170" y1="25" x2="170" y2="52" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
                        <circle cx="170" cy="25" r="3.5" fill="#f59e0b" />
                        
                        {/* Pressure Gauge Dial */}
                        <circle cx="170" cy="52" r="14" fill="#ffffff" stroke="#78350f" strokeWidth="2.5" />
                        <circle cx="170" cy="52" r="11" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                        <line x1="170" y1="52" x2="178" y2="46" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="170" cy="52" r="2.2" fill="#1e293b" />
                        <text x="170" y="61" fontSize="4.5" fill="#475569" textAnchor="middle" fontWeight="bold">BAR</text>

                        {/* Wellhead Main Cross Tee Block */}
                        <rect x="142" y="74" width="56" height="26" rx="3" fill="url(#wellheadBronzeGrad)" stroke="#451a03" strokeWidth="1" />

                        {/* Right Production Discharge Piping (Heavy 90° Elbow) */}
                        <path
                          d="M 198 84 L 255 84 Q 275 84 275 104 L 275 142"
                          fill="none"
                          stroke="url(#pipeSteelGrad)"
                          strokeWidth="14"
                          strokeLinecap="square"
                        />
                        <rect x="264" y="138" width="22" height="6" fill="#475569" rx="1" />

                        {/* Left Casing Vent Line (Annular Vent Elbow) */}
                        <path
                          d="M 142 88 L 88 88 Q 72 88 72 104 L 72 142"
                          fill="none"
                          stroke="url(#pipeSteelGrad)"
                          strokeWidth="8"
                          strokeLinecap="square"
                        />

                        {/* Wellhead Base Master Flange */}
                        <rect x="134" y="102" width="72" height="12" rx="2" fill="url(#wellheadBronzeGrad)" stroke="#451a03" strokeWidth="1" />
                        {/* Flange Stud Bolts */}
                        <circle cx="140" cy="108" r="2" fill="#1e293b" />
                        <circle cx="152" cy="108" r="2" fill="#1e293b" />
                        <circle cx="188" cy="108" r="2" fill="#1e293b" />
                        <circle cx="200" cy="108" r="2" fill="#1e293b" />

                        {/* Casing Spool Base Flange */}
                        <rect x="114" y="122" width="112" height="16" rx="3" fill="url(#wellheadBronzeGrad)" stroke="#451a03" strokeWidth="1.2" />
                        {[122, 138, 154, 186, 202, 218].map((bx) => (
                          <circle key={bx} cx={bx} cy="130" r="2.2" fill="#1e293b" />
                        ))}
                      </g>

                      {/* 3. PRODUCTION TUBING STRING */}
                      <g
                        onClick={() => setSelectedPumpPart('tubing')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'tubing' ? 1 : 0.9}
                      >
                        {/* Central Tubing Pipe */}
                        <rect x="162" y="138" width="16" height="92" fill="url(#pipeSteelGrad)" stroke="#334155" strokeWidth="0.8" />
                        {/* Animated Orange Upward Flow Arrow in Tubing */}
                        <path
                          d="M 170 215 L 170 152"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="3.5"
                          strokeDasharray="8,4"
                          markerEnd="url(#arrowGreen)"
                        />
                      </g>

                      {/* 4. GAS SEPARATOR & DISCHARGE SUB (Crimson) */}
                      <g
                        onClick={() => setSelectedPumpPart('separator')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'separator' ? 1 : 0.9}
                      >
                        {/* Top Neck Transition */}
                        <rect x="156" y="230" width="28" height="12" rx="2" fill="url(#crimsonCollarGrad)" stroke="#2e0505" strokeWidth="0.8" />
                        {/* Main Separator Housing */}
                        <rect x="150" y="242" width="40" height="34" rx="3" fill="url(#crimsonPumpGrad)" stroke="#450a0a" strokeWidth="1" />
                        
                        {/* Red Annular Gas Separation Arrows (Curved Vent Paths) */}
                        {/* Left Red Vent Arrow */}
                        <path
                          d="M 148 268 Q 134 246 138 226"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.2"
                          strokeDasharray="4,2"
                          markerEnd="url(#arrowRed)"
                        />
                        {/* Right Red Vent Arrow */}
                        <path
                          d="M 192 268 Q 206 246 202 226"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.2"
                          strokeDasharray="4,2"
                          markerEnd="url(#arrowRed)"
                        />
                      </g>

                      {/* 5. MULTI-STAGE CENTRIFUGAL PUMP HOUSING (Segmented Crimson) */}
                      <g
                        onClick={() => setSelectedPumpPart('pump')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'pump' ? 1 : 0.9}
                      >
                        {/* Upper Stage Barrel */}
                        <rect x="150" y="278" width="40" height="66" rx="3" fill="url(#crimsonPumpGrad)" stroke="#450a0a" strokeWidth="1" />
                        {/* Joint Collar 1 */}
                        <rect x="148" y="344" width="44" height="7" rx="1.5" fill="url(#crimsonCollarGrad)" stroke="#1a0303" strokeWidth="0.8" />
                        
                        {/* Lower Stage Barrel */}
                        <rect x="150" y="351" width="40" height="66" rx="3" fill="url(#crimsonPumpGrad)" stroke="#450a0a" strokeWidth="1" />
                        {/* Joint Collar 2 */}
                        <rect x="148" y="417" width="44" height="7" rx="1.5" fill="url(#crimsonCollarGrad)" stroke="#1a0303" strokeWidth="0.8" />
                      </g>

                      {/* 6. GOLDEN SLOTTED INTAKE SCREEN CAGE (Golden Mesh) */}
                      <g
                        onClick={() => setSelectedPumpPart('intake')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'intake' ? 1 : 0.9}
                      >
                        {/* Golden Intake Body */}
                        <rect x="150" y="424" width="40" height="46" rx="3" fill="url(#goldenIntakeGrad)" stroke="#78350f" strokeWidth="1.5" />
                        
                        {/* Intricate Intake Screen Slots */}
                        <rect x="154" y="430" width="14" height="34" rx="2" fill="rgba(69, 26, 3, 0.85)" stroke="#fbbf24" strokeWidth="1" />
                        <rect x="172" y="430" width="14" height="34" rx="2" fill="rgba(69, 26, 3, 0.85)" stroke="#fbbf24" strokeWidth="1" />
                        {/* Horizontal Grate Bars */}
                        {[438, 446, 454].map((gy) => (
                          <g key={gy}>
                            <line x1="154" y1={gy} x2="168" y2={gy} stroke="#fef08a" strokeWidth="1" />
                            <line x1="172" y1={gy} x2="186" y2={gy} stroke="#fef08a" strokeWidth="1" />
                          </g>
                        ))}

                        {/* Orange Fluid Intake Inflow Arrows (Sweeping Inward from Annulus) */}
                        {/* Left Inflow Arrow */}
                        <path
                          d="M 134 476 Q 132 448 148 445"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="3.0"
                          markerEnd="url(#arrowGreen)"
                        />
                        {/* Right Inflow Arrow */}
                        <path
                          d="M 206 476 Q 208 448 192 445"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="3.0"
                          markerEnd="url(#arrowGreen)"
                        />
                      </g>

                      {/* 7. PROTECTOR / SEAL CHAMBER (Crimson) */}
                      <g
                        onClick={() => setSelectedPumpPart('seal')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'seal' ? 1 : 0.9}
                      >
                        <rect x="150" y="470" width="40" height="74" rx="3" fill="url(#crimsonPumpGrad)" stroke="#450a0a" strokeWidth="1" />
                        {/* Thrust Bearing Joint Collar */}
                        <rect x="148" y="544" width="44" height="8" rx="1.5" fill="url(#crimsonCollarGrad)" stroke="#1a0303" strokeWidth="0.8" />
                      </g>

                      {/* 8. TANDEM ELECTRIC SUBMERSIBLE MOTOR (Crimson) */}
                      <g
                        onClick={() => setSelectedPumpPart('motor')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'motor' ? 1 : 0.9}
                      >
                        {/* Upper Motor Chamber */}
                        <rect x="150" y="552" width="40" height="70" rx="3" fill="url(#crimsonMotorGrad)" stroke="#3b0712" strokeWidth="1" />
                        {/* Motor Tandem Coupling Collar */}
                        <rect x="148" y="622" width="44" height="8" rx="1.5" fill="url(#crimsonCollarGrad)" stroke="#1a0303" strokeWidth="0.8" />
                        
                        {/* Lower Motor Chamber */}
                        <rect x="150" y="630" width="40" height="68" rx="3" fill="url(#crimsonMotorGrad)" stroke="#3b0712" strokeWidth="1" />
                        
                        {/* Bottom Guide Base Shoe / Pothead Pod */}
                        <rect x="152" y="698" width="36" height="12" rx="2" fill="#20040a" stroke="#7f1d1d" strokeWidth="1" />
                      </g>

                      {/* 9. MOTOR POWER & TELEMETRY CABLE (Flat Armoured Cable with Clamps) */}
                      <path
                        d="M 148 138 L 148 240 L 144 260 L 144 554"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      {/* Stainless Steel Cable Banding Clamps */}
                      {[210, 305, 380, 495, 580, 655].map((by) => (
                        <rect key={by} x="142" y={by} width="6" height="3" fill="#cbd5e1" rx="0.5" />
                      ))}

                      {/* 10. CASING PERFORATIONS & RESERVOIR INFLOW ("Produced") */}
                      <g
                        onClick={() => setSelectedPumpPart('perforations')}
                        style={{ cursor: 'pointer' }}
                        opacity={selectedPumpPart === 'perforations' ? 1 : 0.9}
                      >
                        {/* Perforation Slots on Casing Walls */}
                        {[712, 722, 732, 742, 752].map((py) => (
                          <g key={py}>
                            <rect x="118" y={py} width="12" height="3.5" rx="1" fill="#f59e0b" stroke="#000" strokeWidth="0.5" />
                            <rect x="210" y={py} width="12" height="3.5" rx="1" fill="#f59e0b" stroke="#000" strokeWidth="0.5" />
                          </g>
                        ))}

                        {/* Orange Inflow Stream Arrows Entering from Sandface */}
                        <path
                          d="M 136 745 Q 142 725 146 708"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="3.2"
                          markerEnd="url(#arrowGreen)"
                        />
                        <path
                          d="M 204 745 Q 198 725 194 708"
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="3.2"
                          markerEnd="url(#arrowGreen)"
                        />

                        {/* Distinctive Bold Label matching blueprint: "Produced" */}
                        <text
                          x="170"
                          y="742"
                          fontSize="13"
                          fill="#ffffff"
                          fontWeight="900"
                          textAnchor="middle"
                          letterSpacing="0.05em"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))' }}
                        >
                          Produced
                        </text>
                      </g>

                      {/* Interactive Selection Highlight Bounding Box */}
                      {selectedPumpPart === 'wellhead' && (
                        <rect x="65" y="15" width="220" height="130" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" rx="6" />
                      )}
                      {selectedPumpPart === 'tubing' && (
                        <rect x="156" y="136" width="28" height="96" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'separator' && (
                        <rect x="130" y="226" width="80" height="52" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'pump' && (
                        <rect x="144" y="276" width="52" height="144" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'intake' && (
                        <rect x="128" y="420" width="84" height="54" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'seal' && (
                        <rect x="144" y="468" width="52" height="82" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'motor' && (
                        <rect x="144" y="550" width="52" height="162" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                      {selectedPumpPart === 'perforations' && (
                        <rect x="112" y="704" width="116" height="56" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeDasharray="4,3" rx="4" />
                      )}
                    </svg>
                  </div>
                ) : (
                  /* High-Resolution Blueprint Image Reference matching user upload */
                  <div
                    style={{
                      position: 'relative',
                      background: '#0a0806',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '520px'
                    }}
                  >
                    <img
                      src="/assets/esp_downhole_pump.png"
                      alt="Downhole ESP Pump Completion Schematic"
                      style={{
                        maxHeight: '520px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.85))'
                      }}
                    />
                  </div>
                )}

                {/* Interactive Component Quick Selector Strip */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  {[
                    { id: 'wellhead', label: 'Wellhead Tree' },
                    { id: 'tubing', label: 'Tubing String' },
                    { id: 'separator', label: 'Gas Separator' },
                    { id: 'pump', label: 'Centrifugal Pump' },
                    { id: 'intake', label: 'Golden Intake' },
                    { id: 'seal', label: 'Protector Seal' },
                    { id: 'motor', label: 'ESP Motor' },
                    { id: 'perforations', label: 'Sandface Perfs' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setSelectedPumpPart(btn.id)}
                      style={{
                        background: selectedPumpPart === btn.id ? '#d97706' : 'rgba(255,255,255,0.06)',
                        color: selectedPumpPart === btn.id ? '#ffffff' : '#fed7aa',
                        border: selectedPumpPart === btn.id ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Selected Pump Component Telemetry & Wellbore Completion Specifications */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Component Telemetry & Health Probe Card */}
                {(() => {
                  const compData = PUMP_COMPONENTS[selectedPumpPart] || PUMP_COMPONENTS['pump'];
                  return (
                    <div
                      className="sandstone-card"
                      style={{
                        padding: '1.25rem',
                        background: 'transparent',
                        border: `1.5px solid ${compData.color || '#d97706'}`,
                        boxShadow: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#78350f' }}>
                            {compData.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#573a21', marginTop: '2px' }}>
                            Setting Interval: <strong style={{ color: '#78350f' }}>{compData.depth}</strong>
                          </div>
                        </div>
                        <span className="badge badge-amber" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                          {compData.status}
                        </span>
                      </div>

                      {/* Tag Pills */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                        {compData.tags.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(45, 34, 23, 0.08)',
                              color: '#451a03',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              border: '1px solid rgba(180, 83, 9, 0.25)'
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Telemetry Metrics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        {compData.telemetry.map((tel, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(180, 83, 9, 0.25)',
                              borderRadius: '6px',
                              padding: '0.55rem 0.7rem'
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#573a21' }}>{tel.label}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#78350f' }}>{tel.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Detailed Diagnostic Explanation */}
                      <div style={{ fontSize: '0.74rem', color: '#2b241c', lineHeight: 1.5, borderTop: '1px solid rgba(180, 83, 9, 0.25)', paddingTop: '0.65rem' }}>
                        <strong style={{ color: '#78350f', fontWeight: 800 }}>Mechanical Function:</strong> {compData.desc}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Wellbore & Completion Mechanical Specifications Card */}
                <div className="sandstone-card" style={{ padding: '1rem', background: 'transparent', flex: 1 }}>
                  <div className="card-heading-bold" style={{ fontSize: '0.82rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sliders size={14} color="#d97706" /> WELLBORE COMPLETION SPECIFICATION
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.74rem' }}>
                    <div>Total Depth (TD): <strong>1,150 m MD</strong></div>
                    <div>Pump Setting Depth: <strong>1,100 m MD (ESP)</strong></div>
                    <div>Perforation Interval: <strong>1,120 – 1,150 m</strong></div>
                    <div>Casing String ID: <strong>7.0" (177.8 mm)</strong></div>
                    <div>Production Tubing: <strong>2-7/8" EUE N-80</strong></div>
                    <div>Intake Screen: <strong>50-Mesh Golden Slot</strong></div>
                    <div>ESP Submersible Motor: <strong>150 HP Tandem (3-Phase)</strong></div>
                    <div>Gas Separator: <strong>Rotary Vortex Sub (94% Eff)</strong></div>
                  </div>

                  <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: 'transparent', border: '1px solid rgba(180, 83, 9, 0.25)', borderRadius: '5px', fontSize: '0.7rem', color: '#451a03' }}>
                    <strong>Thermal Fluid Synergy:</strong> Cyclic steam injection delivers sensible enthalpy to the Jodhpur sandface (1,120–1,150m), dropping bitumen viscosity from 12,500 cP to &lt;140 cP. The ESP unit lifts hot mobilized crude through the golden intake cage with 78.4% volumetric efficiency.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONTINUOUS WIRELINE DEPTH LOG TAB CONTENT */}
          {(wellboreSubTab === 'wireline_log' || wellboreSubTab === 'split_view') && (
            <div className="responsive-split-grid" style={{ gap: '1.25rem', marginTop: wellboreSubTab === 'split_view' ? '1rem' : '0' }}>
              {/* Synchronized Multi-Track Wireline Wellbore Chart */}
              <div className="sandstone-card" style={{ padding: '1rem', background: 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div className="card-heading-bold" style={{ fontSize: '0.85rem' }}>
                    CONTINUOUS WELLBORE DEPTH LOG T(z), P(z), \u03BC(z)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78350f' }}>
                    Click depth row to probe station
                  </div>
                </div>

                {/* Depth Log Diagram with SVG curves */}
                <div style={{ display: 'grid', gridTemplateColumns: '70px 95px 1fr 1fr', gap: '0.5rem', height: '420px', overflowY: 'auto', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem' }}>
                  {/* Column 1: Schematic Casing matching the pump string */}
                  <div style={{ borderRight: '1px dashed rgba(180, 83, 9, 0.25)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#431407', marginBottom: '4px' }}>SCHEMATIC</div>
                    <div style={{ position: 'relative', height: '360px', width: '32px', margin: '0 auto', background: 'rgba(30,41,59,0.15)', borderRadius: '3px', border: '1.5px solid #78350f' }}>
                      {/* Top Wellhead Tree */}
                      <div style={{ position: 'absolute', top: 0, height: '18px', left: '-4px', right: '-4px', background: 'linear-gradient(to right, #b45309, #d97706)', borderRadius: '2px', border: '1px solid #78350f' }} title="Surface Wellhead & Tree" />
                      {/* Tubing */}
                      <div style={{ position: 'absolute', top: '18px', bottom: '120px', left: '10px', right: '10px', background: '#78350f' }} title="Production Tubing (0-1020m)" />
                      {/* Gas Separator */}
                      <div style={{ position: 'absolute', bottom: '100px', height: '18px', left: '5px', right: '5px', background: '#dc2626', borderRadius: '2px' }} title="Rotary Gas Separator (1020-1038m)" />
                      {/* Centrifugal Pump */}
                      <div style={{ position: 'absolute', bottom: '65px', height: '32px', left: '5px', right: '5px', background: '#b91c1c', borderRadius: '2px' }} title="84-Stage Centrifugal Pump (1038-1085m)" />
                      {/* Golden Intake Cage */}
                      <div style={{ position: 'absolute', bottom: '48px', height: '15px', left: '4px', right: '4px', background: 'linear-gradient(to right, #f59e0b, #fbbf24)', borderRadius: '2px', border: '1px solid #b45309' }} title="Golden Slotted Intake Screen (1085-1098m)" />
                      {/* Protector Seal & Motor */}
                      <div style={{ position: 'absolute', bottom: '15px', height: '30px', left: '5px', right: '5px', background: '#991b1b', borderRadius: '2px' }} title="Seal Section & 150HP ESP Motor (1098-1135m)" />
                      {/* Perforations */}
                      <div style={{ position: 'absolute', bottom: '0px', height: '14px', left: '1px', right: '1px', background: '#f59e0b', opacity: 0.8 }} title="Payzone Perforations (1120-1150m)" />
                    </div>
                  </div>

                  {/* Column 2: Depth Stations */}
                  <div style={{ borderRight: '1px dashed rgba(180, 83, 9, 0.25)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#431407', marginBottom: '4px' }}>DEPTH (m)</div>
                    {stations.map((s) => (
                      <div
                        key={s.depth_m}
                        onClick={() => setSelectedDepth(s.depth_m)}
                        style={{
                          height: '24px',
                          fontSize: '0.7rem',
                          fontWeight: selectedDepth === s.depth_m ? 800 : 600,
                          color: selectedDepth === s.depth_m ? '#ea580c' : '#1c1917',
                          background: selectedDepth === s.depth_m ? 'rgba(234, 88, 12, 0.2)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '4px',
                          borderRadius: '3px'
                        }}
                      >
                        {s.depth_m} m
                      </div>
                    ))}
                  </div>

                  {/* Column 3: Temperature Track with Color-Coded Bar */}
                  <div style={{ borderRight: '1px dashed rgba(180, 83, 9, 0.25)' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c2d12', marginBottom: '4px' }}>TEMP T(z) (°C)</div>
                    {stations.map((s) => (
                      <div
                        key={s.depth_m}
                        style={{
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.68rem',
                          color: '#7c2d12',
                          fontWeight: 700
                        }}
                      >
                        <div
                          style={{
                            height: '10px',
                            width: `${Math.min(100, Math.max(10, ((s.temperature_c - 30) / 70) * 80))}px`,
                            background: 'linear-gradient(to right, #ea580c, #dc2626)',
                            borderRadius: '2px'
                          }}
                        />
                        <span>{s.temperature_c}°</span>
                      </div>
                    ))}
                  </div>

                  {/* Column 4: Viscosity Logarithmic Track & Asphaltene Warning */}
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#431407', marginBottom: '4px' }}>VISCOSITY &amp; ASPHALTENE</div>
                    {stations.map((s) => {
                      const isCriticalAsph = s.asphaltene_risk_pct > 60;
                      return (
                        <div
                          key={s.depth_m}
                          style={{
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            paddingRight: '6px'
                          }}
                        >
                          <span style={{ color: '#431407' }}>{(s.viscosity_cp ?? 1850).toLocaleString()} cP</span>
                          {isCriticalAsph && (
                            <span
                              style={{
                                background: 'rgba(234, 88, 12, 0.15)',
                                color: '#7c2d12',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                border: '1px solid #ea580c'
                              }}
                            >
                              AOP Risk!
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Inspector Box for Selected Probed Depth */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  className="sandstone-card"
                  style={{
                    padding: '1.25rem',
                    background: 'transparent',
                    border: '1.5px solid #d97706',
                    boxShadow: 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#431407', letterSpacing: '0.02em' }}>
                      DEPTH STATION PROBE: {currentProbedStation?.depth_m ?? selectedDepth} METERS
                    </span>
                    <span className="badge badge-amber" style={{ fontWeight: 800 }}>{(currentProbedStation?.depth_m ?? selectedDepth) < 500 ? 'Upper Tubing' : 'Deep Assembly'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'transparent', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(180, 83, 9, 0.25)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#431407' }}>Local Temperature T(z)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ea580c' }}>{currentProbedStation?.temperature_c ?? 48.0} °C</div>
                    </div>

                    <div style={{ background: 'transparent', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(180, 83, 9, 0.25)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#431407' }}>Local Pressure P(z)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412' }}>{currentProbedStation?.pressure_bar ?? 18.0} bar</div>
                    </div>

                    <div style={{ background: 'transparent', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(180, 83, 9, 0.25)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#431407' }}>Crude Viscosity μ(z)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#c2410c' }}>{(currentProbedStation?.viscosity_cp ?? 1850).toLocaleString()} cP</div>
                    </div>

                    <div style={{ background: 'transparent', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(180, 83, 9, 0.25)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#431407' }}>Asphaltene Onset Risk</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: (currentProbedStation?.asphaltene_risk_pct ?? 0) > 50 ? '#dc2626' : '#7c2d12' }}>
                        {currentProbedStation?.asphaltene_risk_pct ?? 0}%
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.85rem', fontSize: '0.74rem', color: '#1c1917', lineHeight: 1.5, borderTop: '1px solid rgba(180, 83, 9, 0.25)', paddingTop: '0.65rem' }}>
                    <strong style={{ color: '#7c2d12', fontWeight: 800 }}>Physical Diagnostic:</strong>{' '}
                    {(currentProbedStation?.depth_m ?? selectedDepth) <= 400
                      ? 'Severe viscous drag zone. Ascending heavy emulsion has cooled below 55°C, multiplying shear drag on the production string and reducing lift velocity.'
                      : 'Near-bottomhole high mobility zone. Steam enthalpy keeps crude fluid at <150 cP, ensuring high pump volumetric fillage into the golden intake screen.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 3: MARX-LANGENHEIM HEAT BALANCE & KINETICS */}
      {activeTab === 'energy' && (
        <div className="responsive-split-grid" style={{ gap: '1.25rem' }}>
          {/* Heat Partition Breakdown */}
          <div className="sandstone-card" style={{ padding: '1.25rem', background: 'transparent' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#431407' }}>
              THERMODYNAMIC HEAT PARTITION IN JODHPUR SANDSTONE
            </div>
            <div style={{ fontSize: '0.75rem', color: '#573a21', marginBottom: '1rem', fontWeight: 600 }}>
              Energy distribution of {steamInjected} tonnes steam injected in Cycle #{twinState?.cycle_number || 4}
            </div>

            {/* Visual Heat Partition Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700 }}>
                  <span style={{ color: '#431407' }}>Sensible Heat in Net Pay Sandstone (Mobilizing Heavy Crude):</span>
                  <span style={{ color: '#1c1917' }}>64.2% (2,215 GJ)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(45,34,23,0.12)', borderRadius: '5px', overflow: 'hidden', marginTop: '3px' }}>
                  <div style={{ width: '64.2%', height: '100%', background: 'linear-gradient(to right, #b45309, #ea580c)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700 }}>
                  <span style={{ color: '#431407' }}>Conductive Overburden &amp; Underburden Losses (Shale):</span>
                  <span style={{ color: '#1c1917' }}>21.4% (738 GJ)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(45,34,23,0.12)', borderRadius: '5px', overflow: 'hidden', marginTop: '3px' }}>
                  <div style={{ width: '21.4%', height: '100%', background: 'linear-gradient(to right, #c2410c, #ea580c)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700 }}>
                  <span style={{ color: '#431407' }}>Heat Recycled with Produced Fluids:</span>
                  <span style={{ color: '#1c1917' }}>14.4% (497 GJ)</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(45,34,23,0.12)', borderRadius: '5px', overflow: 'hidden', marginTop: '3px' }}>
                  <div style={{ width: '14.4%', height: '100%', background: 'linear-gradient(to right, #f59e0b, #fbbf24)' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'transparent', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1c1917', marginBottom: '4px' }}>
                Thermal Utilization Efficiency (\u03B7<sub>th</sub>): 64.2%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#431407', lineHeight: 1.4 }}>
                Conforms to Boberg-Lantz analytical thermal decay solution. Overburden conduction accelerates when cycle duration exceeds 75 days, triggering the economic CSS cut-off.
              </div>
            </div>
          </div>

          {/* Marx-Langenheim Analytical Kinetic Formulas */}
          <div className="sandstone-card" style={{ padding: '1.25rem', background: 'transparent' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: '#431407' }}>
              MARX-LANGENHEIM STEAM CHAMBER FORMULATION
            </div>

            <div style={{ background: '#2b241c', color: '#fed7aa', padding: '0.85rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 }}>
              R<sub>steam</sub>(t) = &radic;[ (Q<sub>inj</sub> &bull; M<sub>s</sub>) / (&pi; &bull; h &bull; M<sub>R</sub> &bull; &Delta;T) &bull; (1 - e<sup>-t / &tau;</sup>) ]
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginTop: '0.85rem', fontSize: '0.74rem' }}>
              <div className="twin-node-box">
                <div className="twin-node-title" style={{ color: '#431407' }}>Steam Quality x</div>
                <div className="twin-node-metric" style={{ color: '#ea580c' }}>{(sandboxSteamQuality * 100).toFixed(0)}%</div>
              </div>
              <div className="twin-node-box">
                <div className="twin-node-title" style={{ color: '#431407' }}>Latent Enthalpy h<sub>fg</sub></div>
                <div className="twin-node-metric" style={{ color: '#ea580c' }}>1,680 kJ/kg</div>
              </div>
              <div className="twin-node-box">
                <div className="twin-node-title" style={{ color: '#431407' }}>Time Constant &tau;</div>
                <div className="twin-node-metric" style={{ color: '#ea580c' }}>18.4 days</div>
              </div>
              <div className="twin-node-box">
                <div className="twin-node-title" style={{ color: '#431407' }}>Vol. Heat Cap. M<sub>R</sub></div>
                <div className="twin-node-metric" style={{ color: '#ea580c' }}>2.45 MJ/m³·°C</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 4: THERMODYNAMIC ASPHALTENE PRECIPITATION (AOP) MODEL */}
      {activeTab === 'asphaltene' && (
        <div className="responsive-split-grid" style={{ gap: '1.25rem' }}>
          {/* Asphaltene Dial & Diagnostic */}
          <div className="sandstone-card" style={{ padding: '1.25rem', background: 'transparent' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#431407' }}>
              THERMODYNAMIC DE BOER / FLORY-HUGGINS ASPHALTENE ONSET MODEL (AOP)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#431407', marginBottom: '1rem', fontWeight: 600 }}>
              Baghewala Heavy Crude (8–12 wt% asphaltenes, stabilized by maltene colloidal resins)
            </div>

            <div className="responsive-grid-3" style={{ gap: '0.75rem' }}>
              <div className="twin-node-box" style={{ background: 'transparent' }}>
                <div className="twin-node-title" style={{ color: '#431407' }}>Asphaltene Onset Pressure (AOP)</div>
                <div className="twin-node-metric" style={{ color: '#ea580c' }}>{asphAOP} bar</div>
                <div style={{ fontSize: '0.65rem', color: '#573a21', fontWeight: 600 }}>Threshold at {resTemp.toFixed(1)}°C</div>
              </div>

              <div className="twin-node-box" style={{ background: 'transparent' }}>
                <div className="twin-node-title" style={{ color: '#431407' }}>Current Bottomhole Pressure</div>
                <div className="twin-node-metric" style={{ color: '#1c1917' }}>{asphBHP} bar</div>
                <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700 }}>
                  Deficit: -{(asphAOP - asphBHP).toFixed(1)} bar
                </div>
              </div>

              <div className="twin-node-box" style={{ background: 'transparent' }}>
                <div className="twin-node-title" style={{ color: '#431407' }}>Deposition Index (ADI)</div>
                <div className="twin-node-metric" style={{ color: asphADI > 50 ? '#dc2626' : '#ea580c' }}>
                  {asphADI}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700 }}>{asphStatus}</div>
              </div>
            </div>

            {/* Fouling Rate Alert Banner */}
            <div
              style={{
                marginTop: '1rem',
                background: asphADI > 50 ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)',
                border: `1px solid ${asphADI > 50 ? 'rgba(220,38,38,0.35)' : 'rgba(217,119,6,0.35)'}`,
                borderRadius: '6px',
                padding: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.78rem', color: asphADI > 50 ? '#b91c1c' : '#ea580c' }}>
                <AlertTriangle size={16} />
                Estimated Pump Barrel Fouling Rate: {asphFoulingRate} &mu;m / month
              </div>
              <div style={{ fontSize: '0.72rem', color: '#1c1917', marginTop: '4px', lineHeight: 1.4 }}>
                {asphalteneData?.mitigation_action ||
                  'Onset threshold reached in near-wellbore sand face. Schedule aromatic solvent flush (Xylene/Toluene) or initiate CSS thermal re-stimulation to raise temp > 80°C.'}
              </div>
            </div>
          </div>

          {/* Recommended Operator Intervention Plan */}
          <div className="sandstone-card" style={{ padding: '1.25rem', background: 'transparent' }}>
            <div className="card-heading-bold" style={{ fontSize: '0.85rem', marginBottom: '0.6rem', color: '#431407' }}>
              RECOMMENDED ORGANIC SOLIDS MITIGATION ACTIONS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ padding: '0.6rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', borderLeft: '4px solid #ea580c' }}>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', color: '#9a3412' }}>1. Thermal Remediation (Primary)</div>
                <div style={{ fontSize: '0.7rem', color: '#292524' }}>Re-inject 1,400 tonnes high-enthalpy steam (x &gt; 0.8) to dissolve precipitated asphaltene flocculates.</div>
              </div>

              <div style={{ padding: '0.6rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', borderLeft: '4px solid #b45309' }}>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', color: '#7c2d12' }}>2. Aromatic Solvent Soak (Secondary)</div>
                <div style={{ fontSize: '0.7rem', color: '#292524' }}>Pump 12 m³ xylene-based dispersant batch down the annulus; allow 18 hours soaking before resuming SRP stroke.</div>
              </div>

              <div style={{ padding: '0.6rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontWeight: 800, fontSize: '0.74rem', color: '#7c2d12' }}>3. Pump Valve Seating Clearance Check</div>
                <div style={{ fontSize: '0.7rem', color: '#292524' }}>Current standing valve clearance: 0.005" (Adequate). Monitor dynamic peak load for valve stick warning.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
