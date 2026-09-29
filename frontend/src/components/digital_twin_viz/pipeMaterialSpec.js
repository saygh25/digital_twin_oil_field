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
  // Real Authentic Brushed Metallic Steel Base (calibrated from reference steel texture)
  baseSteel: '#8c98a6',       // Core brushed metallic steel grey
  baseSteelDark: '#626e7c',   // Structural forged steel (I-beams, heavy frames, skid rails)
  baseSteelLight: '#b4c0cd',  // Brushed steel highlights, machined faces
  baseDark: '#5c6876',        // Recessed structural steel shadows
  baseBrown: '#7d7a75',       // Steel with subtle surface dust / light weathering
  baseMedium: '#7a8694',      // Standard pipe/tubing steel grey

  // Rust & Oxidation Accents (Real iron oxide rust patches & seam weathering)
  rustDark: '#8a3e1b',        // Dark pitted iron rust
  rustLight: '#b45a28',       // Active reddish-orange surface rust
  rustPatina: '#965a38',      // Warm weathered rust patina

  // Greebles & Exterior Hardware (galvanized / machined steel hardware)
  bolt: '#95a1ae',            // High-grade galvanized steel hex bolts & studs
  chamfer: '#c2cdd8',         // Bright machined highlight chamfer rings
  weld: '#687380',            // Welded steel bead (heat-tinted grey)
  shroud: '#737f8d',          // Heavy armor sleeve steel
  conduit: '#8e9aa8',         // Stainless/galvanized hydraulic control lines
  bracket: '#6c7886',         // Cast steel mounting bracket clamps
  junctionBox: '#5e6a78',     // Industrial cast steel terminal enclosures
  valve: '#5a6674',           // Cast steel valve bodies
  valveTrim: '#b0bcc8',       // Machined stainless steel valve spindle / stem
  sensorBezel: '#7e8a98',     // Machined telemetry bezel
  hazardLight: '#eab308',     // OSHA warning yellow band
  hazardDark: '#334155',      // Midnight charcoal chevron band

  // Downhole Pump Components (precision ground machined metallic steel)
  pumpBarrelOuter: '#8692a0', // Machined pump barrel steel
  pumpBarrelInner: '#505c6c', // Pump cylinder bore
  pumpBarrelCollar: '#94a0ae',// Machined collar
  pumpSeparatorOuter: '#7c8896',
  pumpVortexShaft: '#9aa6b4',
  pumpVortexVane: '#687482',
  pumpSeatBronze: '#a87840',  // Phosphor bronze valve seat ring
  pumpSeatChamfer: '#a2aebc',
  pumpValveCage: '#707c8a',   // Heavy ball cage
  pumpValveBall: '#c0cbd6',   // Precision ground tungsten carbide ball
  pumpStrainer: '#808c9a',    // Perforated steel intake screen
  pumpStrainerCollar: '#6e7a88',
  pumpPlungerPin: '#a2aebc',
  pumpCentralizerFins: '#768290',
  pumpPlungerBody: '#9aa6b4', // Precision mirror plunger body
  pumpSealGrooves: '#54606e',

  // Sucker Rod, Casing & Sockets
  suckerRod: '#aab6c4',       // Machined polished steel sucker rod
  suckerRodCoupling: '#7c8896',// Heavy threaded rod coupling sleeve
  casingOuter: '#75818f',     // 7" outer steel casing
  holeSocket: '#3a4450',      // Recessed interior perforation shadow

  // Surface Wellhead & Christmas Tree Base (PumpjackSurface3D)
  wellheadFlange: '#6a7684',  // Heavy forged companion flange
  wellheadFlowline: '#7e8a98',// Flowline outlet pipe
  stuffingBoxBody: '#626e7c', // Stuffing box body
  stuffingBoxNut: '#b45a28',  // Weathered bronze / rust packing gland nut
  carrierBar: '#788492',      // Forged steel carrier bar
  polishedRodClamp: '#586472',
  bridleCable: '#a6b2bf',     // High-strength stranded steel wireline
  polishedRod: '#cbd5e1',     // Mirror-polished stainless steel rod

  // Weathered Industrial Pumpjack Accents
  pumpjackRustRed: '#9e3a24', // Industrial faded oxide-red paint / rust
  pumpjackRustRedDark: '#782614',

  // X-Ray Mode Technical Blueprint / Smoky Indigo Tints (Image 1 Industrial Reference)
  xRayIndigoDark: '#0e1724',     // Deep midnight slate indigo cavity
  xRayIndigoBody: '#182436',     // Core translucent smoky navy slate
  xRaySlateRim: '#4f7296',       // Cool metallic slate-blue edge rim highlight
  xRayRimGlint: '#82a5c9',       // Sharp grazing-angle highlight glint
  xRayGlassBase: '#0b121c',      // Base dark absorption
  xRayCyanTint: '#2b3f57',       // Muted dark slate (replaces bright cyan)
  xRayCyanSoft: '#3a5473',       // Muted smoky steel slate
  xRayCyanMuted: '#1d2a3a'
};

// PBR Mechanical Property Standards (Real Metallic Steel & Rust)
export const PIPE_PBR = {
  pumpjackStructural: {
    metalness: 0.90,
    roughness: 0.38 // Clean brushed metallic sheen on I-beams and trusses
  },
  pumpjackAccent: {
    metalness: 0.74,
    roughness: 0.55 // Faded weathered oxide-red paint
  },

  tubing: {
    metalness: 0.92,
    roughness: 0.35 // Authentic brushed metallic steel pipe sheen
  },
  hardware: {
    metalness: 0.92,
    roughness: 0.32
  },
  bolt: {
    metalness: 0.95,
    roughness: 0.26
  },
  chamfer: {
    metalness: 0.95,
    roughness: 0.20
  },
  weld: {
    metalness: 0.88,
    roughness: 0.48
  },
  hazard: {
    metalness: 0.65,
    roughness: 0.42
  },
  nut: {
    metalness: 0.92,
    roughness: 0.30
  },
  pumpPrecision: {
    metalness: 0.94,
    roughness: 0.24
  },
  pumpMirror: {
    metalness: 0.96,
    roughness: 0.16
  },
  suckerRod: {
    metalness: 0.95,
    roughness: 0.20
  },
  casingOuter: {
    metalness: 0.90,
    roughness: 0.38
  }
};

// GLSL String for Aged Steel Shaders
export const PIPE_MATERIAL_GLSL = `
  // Locked Palette Base Colors (Normalized RGB)
  const vec3 PIPE_BASE_DARK   = vec3(0.384, 0.431, 0.486); // #626E7C
  const vec3 PIPE_BASE_BROWN  = vec3(0.490, 0.478, 0.459); // #7D7A75
  const vec3 PIPE_RUST_DARK   = vec3(0.541, 0.243, 0.106); // #8A3E1B
  const vec3 PIPE_RUST_LIGHT  = vec3(0.706, 0.353, 0.157); // #B45A28
`;
