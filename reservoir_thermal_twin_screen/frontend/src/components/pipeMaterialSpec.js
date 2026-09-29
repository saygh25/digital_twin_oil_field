/**
 * ============================================================================
 * PIPE MATERIAL SPECIFICATION & CONSTANTS MODULE (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * Objective: Stop visual and material drift across all pipe-related components.
 * Every pipe, tubing, collar, threaded coupling, greeble (bolts, valve wheels,
 * conduits, junction boxes), pump internal, sucker rod, and surface wellhead mesh
 * MUST import and use the locked constants from this file.
 * 
 * Rules:
 *  1. Base palette is strictly DARK aged steel (#1E1712 to #2E2418).
 *  2. Rust accent is muted dark rust-brown (#3E2416 to #4A2E1C) at joints only.
 *  3. ZERO chrome, light grey, silver, white, brass, or gold tones anywhere.
 *  4. PBR parameters: Metalness 0.75 - 0.94, Roughness 0.22 - 0.55.
 * ============================================================================
 */

export const PIPE_COLORS = {
  // Dominant Base Steel (near-black to dark brown aged oilfield steel)
  baseDark: '#1E1712',
  baseBrown: '#2E2418',
  baseMedium: '#241C16',

  // Rust Accent (muted dark rust-brown, zero bright terracotta/brass/gold)
  rustDark: '#3E2416',
  rustLight: '#4A2E1C',

  // Greebles & Exterior Hardware
  bolt: '#1A1410',
  chamfer: '#2E2418',
  weld: '#261E18',
  shroud: '#221A14',
  conduit: '#28201A',
  bracket: '#2A2018',
  junctionBox: '#1E1712',
  valve: '#1E1712',
  valveTrim: '#2C221A',
  sensorBezel: '#241C16',
  hazardLight: '#2E2418',
  hazardDark: '#100D0A',

  // Downhole Pump Internal Components (machined dark alloy steel, zero light grey/chrome/white)
  pumpBarrelOuter: '#28201A',
  pumpBarrelInner: '#201813',
  pumpBarrelCollar: '#2E2418',
  pumpSeparatorOuter: '#241C16',
  pumpVortexShaft: '#2A2018',
  pumpVortexVane: '#221A14',
  pumpSeatBronze: '#2E2418',
  pumpSeatChamfer: '#241C16',
  pumpValveCage: '#221A14',
  pumpValveBall: '#0F0B08',
  pumpStrainer: '#261E18',
  pumpStrainerCollar: '#221A14',
  pumpPlungerPin: '#2A2018',
  pumpCentralizerFins: '#241C16',
  pumpPlungerBody: '#28201A',
  pumpSealGrooves: '#1E1712',

  // Sucker Rod, Casing & Sockets
  suckerRod: '#2A221B',
  suckerRodCoupling: '#201914',
  casingOuter: '#261E18',
  holeSocket: '#110D0A',

  // Surface Wellhead & Christmas Tree Base (PumpjackSurface3D)
  wellheadFlange: '#28201A',
  wellheadFlowline: '#241C16',
  stuffingBoxBody: '#1E1712',
  stuffingBoxNut: '#2E2418', // Replaced former #d97706 gold brass nut!
  carrierBar: '#3E2416',     // Dark weathered steel, zero bright yellow #f59e0b
  polishedRodClamp: '#0F0B08',
  bridleCable: '#28201A',    // Dark steel wireline, zero light grey #94a3b8
  polishedRod: '#2C241D',    // Dark polished steel shaft, zero white #f8fafc

  // X-Ray Mode Blueprint Hologram Tints (applied dynamically during X-ray blend)
  xRayCyanTint: '#38bdf8',
  xRayCyanSoft: '#7dd3fc',
  xRayCyanMuted: '#0284c7',
  xRayGlassBase: '#0c1e28'
};

// PBR Mechanical Property Standards
export const PIPE_PBR = {
  tubing: {
    metalness: 0.78,
    roughness: 0.48
  },
  hardware: {
    metalness: 0.86,
    roughness: 0.42
  },
  bolt: {
    metalness: 0.94,
    roughness: 0.30
  },
  chamfer: {
    metalness: 0.92,
    roughness: 0.24
  },
  weld: {
    metalness: 0.82,
    roughness: 0.54
  },
  hazard: {
    metalness: 0.50,
    roughness: 0.46
  },
  nut: {
    metalness: 0.88,
    roughness: 0.40
  },
  pumpPrecision: {
    metalness: 0.88,
    roughness: 0.26
  },
  pumpMirror: {
    metalness: 0.92,
    roughness: 0.18
  },
  suckerRod: {
    metalness: 0.88,
    roughness: 0.24
  },
  casingOuter: {
    metalness: 0.85,
    roughness: 0.22
  }
};

// GLSL String for Aged Steel Shaders
export const PIPE_MATERIAL_GLSL = `
  // Locked Palette Base Colors (Normalized RGB)
  const vec3 PIPE_BASE_DARK   = vec3(0.118, 0.090, 0.071); // #1E1712
  const vec3 PIPE_BASE_BROWN  = vec3(0.180, 0.141, 0.094); // #2E2418
  const vec3 PIPE_RUST_DARK   = vec3(0.243, 0.141, 0.086); // #3E2416
  const vec3 PIPE_RUST_LIGHT  = vec3(0.290, 0.180, 0.110); // #4A2E1C
`;
