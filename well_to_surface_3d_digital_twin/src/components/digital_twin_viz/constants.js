/**
 * Baghewala Field Heavy-Oil CSS Digital Twin - Constants & Fallback Data
 * 
 * SWAP INSTRUCTIONS FOR PRODUCTION:
 * - Change API_BASE_URL to point to your FastAPI server (e.g. 'http://localhost:8000/api' or '/api')
 * - Adjust ENDPOINTS if your route prefixes differ
 */

export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  // Digital Twin Core State
  DIGITAL_TWIN_STATE: (wellId) => `${API_BASE_URL}/wells/${wellId}/digital-twin/state`,
  // SRP Mechanical & Kinematic Config
  SRP_CONFIG: (wellId) => `${API_BASE_URL}/wells/${wellId}/srp`,
  // AI/ML Failure Risk & Rod Floating Risk
  FAILURE_RISK: (wellId) => `${API_BASE_URL}/wells/${wellId}/failure-risk`,
  // Dynamometer Card (Surface & Downhole)
  DYNO_CARD: (wellId) => `${API_BASE_URL}/wells/${wellId}/dyno-card`,
  // Mechanics & Impact Loading
  MECHANICS: (wellId) => `${API_BASE_URL}/wells/${wellId}/mechanics/impact-and-unsetting`,
  // Continuous Wellbore Depth Profile
  DEPTH_PROFILE: (wellId) => `${API_BASE_URL}/wells/${wellId}/wellbore/depth-profile`,
  // Asphaltene Precipitation Risk
  ASPHALTENE_RISK: (wellId) => `${API_BASE_URL}/wells/${wellId}/asphaltene-risk`,
  // CSS Economic Cut-off Evaluation
  CSS_CUTOFF: (wellId) => `${API_BASE_URL}/wells/${wellId}/css/cutoff-evaluation`,
  // Real-time Telemetry WebSocket
  TELEMETRY_WS: (wellId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${API_BASE_URL}/ws/telemetry/${wellId}`;
  }
};

// Baghewala Field Jodhpur Sandstone CSS Baseline Physics Parameters
export const FIELD_SPECS = {
  fieldName: 'Baghewala Field, Rajasthan',
  operator: 'Oil India Limited (OIL)',
  reservoirFormation: 'Jodhpur Sandstone',
  depthMeters: 1150.0,
  crudeGravityAPI: 18.2,
  baseReservoirTempC: 48.0,
  baseReservoirPressureBar: 102.0,
  steamInjectionTempC: 260.0,
  steamQuality: 0.80,
  casingDiameterIn: 7.0,
  tubingDiameterIn: 2.875,
  pumpPlungerDiameterMm: 57.0,
  strokeLengthIn: 72.0,
  standardSpm: 4.2,
  vfdBaseHz: 42.0
};

// CSS Lifecycle Stages
export const CSS_STAGES = {
  INJECTION: {
    id: 'INJECTION',
    name: 'Steam Injection',
    durationDays: 15,
    description: 'High-enthalpy saturated steam (260°C @ 45 bar) injected to heat heavy crude and reduce viscosity.',
    color: '#f97316',
    particleMode: 'injection'
  },
  SOAK: {
    id: 'SOAK',
    name: 'Thermal Soak',
    durationDays: 7,
    description: 'Well shut-in to allow heat diffusion deep into the Jodhpur sandstone matrix (~10-12m heated radius).',
    color: '#eab308',
    particleMode: 'soak'
  },
  PRODUCTION_EARLY: {
    id: 'PRODUCTION_EARLY',
    name: 'Hot Production (Peak)',
    durationDays: 15,
    description: 'SRP artificial lift active at peak temperature (~85°C). Crude viscosity < 200 cP. Peak oil flow.',
    color: '#10b981',
    particleMode: 'production'
  },
  PRODUCTION_MID: {
    id: 'PRODUCTION_MID',
    name: 'Mid-Cycle Production',
    durationDays: 20,
    description: 'Reservoir gradually cools (65-75°C). Viscosity rises to 1,500 cP. SRP load monitored for drag.',
    color: '#06b6d4',
    particleMode: 'production'
  },
  PRODUCTION_LATE: {
    id: 'PRODUCTION_LATE',
    name: 'Late-Cycle / Cut-Off',
    durationDays: 15,
    description: 'Reservoir cools towards baseline (50-55°C). High viscosity (>6,000 cP). Rod floating risk elevated. Approaching re-steam cut-off.',
    color: '#ef4444',
    particleMode: 'production'
  }
};

// Scripted Full 72-Day CSS Cycle Timeline Data (for Standalone Judging / Offline Fallback)
export const FALLBACK_CSS_TIMELINE = [
  {
    day: 0,
    stage: 'INJECTION',
    stageName: 'Steam Injection (Start)',
    progressPct: 0,
    daysRemaining: 15,
    tempC: 52.0,
    viscosityCp: 6800,
    heatedRadiusM: 1.5,
    spm: 0.0,
    vfdHz: 0.0,
    strokeIn: 0.0,
    oilRateBopd: 0,
    steamRateBpd: 450,
    sor: 0.0,
    energyKwhBbl: 0.0,
    rodRiskPct: 5.0,
    pumpFillagePct: 0.0,
    pprlKn: 0.0,
    mprlKn: 0.0,
    rodStressState: 'NORMAL',
    valveState: 'CLOSED'
  },
  {
    day: 8,
    stage: 'INJECTION',
    stageName: 'Steam Injection (Mid)',
    progressPct: 53,
    daysRemaining: 7,
    tempC: 185.0,
    viscosityCp: 45,
    heatedRadiusM: 6.8,
    spm: 0.0,
    vfdHz: 0.0,
    strokeIn: 0.0,
    oilRateBopd: 0,
    steamRateBpd: 480,
    sor: 0.0,
    energyKwhBbl: 0.0,
    rodRiskPct: 5.0,
    pumpFillagePct: 0.0,
    pprlKn: 0.0,
    mprlKn: 0.0,
    rodStressState: 'NORMAL',
    valveState: 'CLOSED'
  },
  {
    day: 15,
    stage: 'SOAK',
    stageName: 'Thermal Soak (Start)',
    progressPct: 0,
    daysRemaining: 7,
    tempC: 220.0,
    viscosityCp: 18,
    heatedRadiusM: 9.4,
    spm: 0.0,
    vfdHz: 0.0,
    strokeIn: 0.0,
    oilRateBopd: 0,
    steamRateBpd: 0,
    sor: 0.0,
    energyKwhBbl: 0.0,
    rodRiskPct: 6.0,
    pumpFillagePct: 0.0,
    pprlKn: 0.0,
    mprlKn: 0.0,
    rodStressState: 'NORMAL',
    valveState: 'CLOSED'
  },
  {
    day: 22,
    stage: 'PRODUCTION_EARLY',
    stageName: 'Early Hot Production (Peak)',
    progressPct: 0,
    daysRemaining: 15,
    tempC: 88.5,
    viscosityCp: 185,
    heatedRadiusM: 10.8,
    spm: 4.8,
    vfdHz: 48.0,
    strokeIn: 72.0,
    oilRateBopd: 245,
    steamRateBpd: 0,
    sor: 2.45,
    energyKwhBbl: 24.2,
    rodRiskPct: 12.0,
    pumpFillagePct: 92.0,
    pprlKn: 58.2,
    mprlKn: 24.5,
    rodStressState: 'NORMAL',
    valveState: 'ACTIVE'
  },
  {
    day: 37,
    stage: 'PRODUCTION_MID',
    stageName: 'Mid-Cycle Production (Optimal)',
    progressPct: 0,
    daysRemaining: 20,
    tempC: 76.4,
    viscosityCp: 1250,
    heatedRadiusM: 10.2,
    spm: 4.2,
    vfdHz: 42.0,
    strokeIn: 72.0,
    oilRateBopd: 192,
    steamRateBpd: 0,
    sor: 3.12,
    energyKwhBbl: 38.4,
    rodRiskPct: 18.5,
    pumpFillagePct: 84.0,
    pprlKn: 64.8,
    mprlKn: 19.8,
    rodStressState: 'NORMAL',
    valveState: 'ACTIVE'
  },
  {
    day: 57,
    stage: 'PRODUCTION_LATE',
    stageName: 'Late Production (Cooling)',
    progressPct: 65,
    daysRemaining: 15,
    tempC: 58.2,
    viscosityCp: 4800,
    heatedRadiusM: 8.5,
    spm: 3.6,
    vfdHz: 36.0,
    strokeIn: 72.0,
    oilRateBopd: 118,
    steamRateBpd: 0,
    sor: 4.28,
    energyKwhBbl: 48.6,
    rodRiskPct: 42.0,
    pumpFillagePct: 71.0,
    pprlKn: 74.2,
    mprlKn: 14.2,
    rodStressState: 'ELEVATED',
    valveState: 'ACTIVE'
  },
  {
    day: 72,
    stage: 'PRODUCTION_LATE',
    stageName: 'Cycle Cut-off (Re-steam Ready)',
    progressPct: 100,
    daysRemaining: 0,
    tempC: 49.5,
    viscosityCp: 8400,
    heatedRadiusM: 6.2,
    spm: 2.8,
    vfdHz: 28.0,
    strokeIn: 72.0,
    oilRateBopd: 58,
    steamRateBpd: 0,
    sor: 5.92,
    energyKwhBbl: 64.0,
    rodRiskPct: 78.0,
    pumpFillagePct: 58.0,
    pprlKn: 82.5,
    mprlKn: 8.5,
    rodStressState: 'CRITICAL',
    valveState: 'LAGGING'
  }
];

// Physics explanation dossiers for interactive 3D inspection
export const COMPONENT_PHYSICS = {
  pumpjack: {
    title: 'Surface Walking-Beam Sucker Rod Pumpjack',
    category: 'Surface Artificial Lift Kinematics',
    governingEquation: 'SPM = (VFD_Hz / 50.0) * 4.2 | Torque = (PPRL - Counterweight) * r_crank',
    description: 'Class I beam pumping unit converting rotary motor torque into reciprocating vertical polished rod stroke. The horsehead arc maintains strictly vertical wireline bridle travel to eliminate lateral bending stress on the stuffing box and rod string.',
    operationalLimits: {
      maxPPRL: '120.0 kN (API Structure Rating)',
      nominalSPM: '3.5 - 5.5 SPM (Heavy crude tuned)',
      gearboxRating: '320,000 in-lb peak torque',
      motorPower: '30 kW inverter-duty TEFC'
    }
  },
  rodString: {
    title: 'High-Strength Sucker Rod String (API Spec 11B)',
    category: 'Wellbore Axial Stress & Wave Mechanics',
    governingEquation: '∂²u/∂t² = a² (∂²u/∂x²) - (c/ρ) (∂u/∂t) | Gibbs Damped Wave Equation',
    description: 'Tapered rod string (Grade D / KD) transmitting surface mechanical stroke down ~1100m to the plunger. In Baghewala high-viscosity crude (>5,000 cP), viscous shear drag during downstroke opposes gravity, leading to rod float and severe snap shock if SPM is excessive.',
    operationalLimits: {
      maxStress: '32,500 psi (Modified Goodman Curve)',
      minDownstrokeLoad: '> 12.0 kN (Float Threshold)',
      dampingCoeff: 'c = 0.015 - 0.045 N-s/m'
    }
  },
  wellbore: {
    title: 'Concentric Wellbore (7" Casing & 2-7/8" Tubing)',
    category: 'Subsurface Hydraulics & Fluid Column',
    governingEquation: 'P(z) = P_wh + ∫ [ρ_fluid(z) · g + (f · ρ · v²)/(2·D)] dz',
    description: 'Cutaway profile of 1,150m vertical wellbore through Thar Desert strata into the Jodhpur sandstone. Fluid level responds dynamically to bottomhole drawdown, gas separation, and fluid mobility.',
    operationalLimits: {
      totalDepth: '1,150 m TVD',
      casingBurst: '4,360 psi (7" 23# K-55)',
      tubingYield: '7,260 psi (2-7/8" 6.5# J-55)'
    }
  },
  downholePump: {
    title: 'API Downhole Sucker Rod Pump (RWBC 225)',
    category: 'Plunger & Valve Dynamics',
    governingEquation: 'Q_theor = 0.1166 · D² · S · SPM · η_vol | F_fluid = A_p · (P_disch - P_intake)',
    description: 'Positive displacement pump featuring a precision-lapped chrome plunger, carbide traveling valve (TV), and standing valve (SV). On upstroke, TV closes to lift fluid column while SV opens for reservoir inflow. On downstroke, SV closes and TV opens.',
    operationalLimits: {
      plungerDiam: '57.0 mm (2-1/4")',
      strokeLength: '72.0 in (1.83 m)',
      clearanceFit: '-0.002 to -0.003 in (Minus 2)'
    }
  },
  reservoir: {
    title: 'Jodhpur Sandstone Heavy Crude Formation',
    category: 'Reservoir Thermodynamics & Thermal EOR',
    governingEquation: 'μ(T) = A · exp(B / (T + 273.15)) | Marx-Langenheim Heated Radius: R = √(V_steam · η / (π · h · M_c · ΔT))',
    description: 'High-viscosity ~17-19° API bitumen reservoir at initial temperature of 48°C. Cyclic Steam Stimulation injects 260°C saturated steam, creating a thermal halo that slashes crude viscosity from >8,000 cP down to <50 cP, unlocking commercial mobility.',
    operationalLimits: {
      initialTemp: '46.0 - 48.0 °C',
      initialViscosity: '8,000 - 15,000 cP',
      peakSteamTemp: '240.0 - 260.0 °C',
      netPayThickness: '14.5 m'
    }
  }
};
