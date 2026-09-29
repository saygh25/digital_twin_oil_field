/**
 * ============================================================================
 * STRATA PALETTE SPECIFICATION & CONSTANTS MODULE (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * Objective: Stop visual and palette drift across geological strata shaders.
 * All geological shaders, Three.js materials, and UI annotations must import
 * directly from this file. DO NOT define inline magic-number colors elsewhere.
 * 
 * Rules:
 *  1. Base palette is strictly DARK, weathered, and earthy (No gold/brass/yellow).
 *  2. Hue range strictly clamped between 15° and 40° (warm earthy umber/brown).
 *  3. Lightness strictly clamped between 0.05 (5%) and 0.36 (36%) to stay dark.
 *  4. Saturation clamped between 0.05 and 0.44 (muted, zero neon/highlighter).
 *  5. Roughness target: 0.95 - 1.0 (completely matte, zero plastic/metallic sheen).
 *  6. Rock-type presets: SANDSTONE, SHALE, MUDSTONE, IRONSTONE.
 * ============================================================================
 */

// --- 1. ROCK-TYPE CATEGORIZATION PRESETS ---
export const ROCK_TYPES = {
  SANDSTONE: {
    id: 'SANDSTONE',
    name: 'Porous Sandstone',
    crossBeddingAngleDeg: 21.0,
    crossBeddingFreq: 18.0,
    crossBeddingIntensity: 0.24,
    fleckDensity: 0.65,
    fissility: 0.04,
    roughnessTarget: 0.94,
    description: 'Granular sedimentary sandstone with inclined cross-bedding foresets and quartz/feldspar mineral flecks'
  },
  SHALE: {
    id: 'SHALE',
    name: 'Fissile Shale',
    crossBeddingAngleDeg: 0.0,
    crossBeddingFreq: 0.0,
    crossBeddingIntensity: 0.0,
    fleckDensity: 0.12,
    fissility: 0.88,
    fissilityFreq: 68.0,
    roughnessTarget: 0.92,
    description: 'Finely laminated, fissile clay shale with tight horizontal cleavage micro-laminae'
  },
  MUDSTONE: {
    id: 'MUDSTONE',
    name: 'Blocky Mudstone / Siltstone',
    crossBeddingAngleDeg: 0.0,
    crossBeddingFreq: 0.0,
    crossBeddingIntensity: 0.0,
    fleckDensity: 0.35,
    fissility: 0.14,
    clodScale: 16.0,
    roughnessTarget: 0.97,
    description: 'Massive, unbedded blocky mudstone with crumb clod texture and conchoidal micro-fracturing'
  },
  IRONSTONE: {
    id: 'IRONSTONE',
    name: 'Ferruginous Ironstone',
    crossBeddingAngleDeg: 0.0,
    crossBeddingFreq: 0.0,
    crossBeddingIntensity: 0.0,
    fleckDensity: 0.85,
    nodularScale: 14.0,
    roughnessTarget: 0.98,
    description: 'Dense iron-oxide concretionary rock with nodular crusts and heavy metallic mineral flecks'
  }
};

// --- 2. SOIL & ROCK HORIZONS (LOCKED HEX & NORMALIZED RGB SPEC) ---
export const STRATA_HORIZONS = {
  // Horizon 1: Surface Desert Crust (0m - 75m) -> MUDSTONE
  crust: {
    id: 'crust',
    name: 'Surface Desert Crust',
    rockType: ROCK_TYPES.MUDSTONE.id,
    hex: '#2C2520',
    rgb: [0.172, 0.145, 0.125],
    glslVec3: 'vec3(0.172, 0.145, 0.125)',
    depthRangeM: [0, 75],
    hueDeg: 25.0,
    description: 'Dark weathered desert crust / desert pavement with dark varnish'
  },
  // Horizon 2: Sandy Subsoil (75m - 235m) -> SANDSTONE
  sandy_subsoil: {
    id: 'sandy_subsoil',
    name: 'Sandy Subsoil',
    rockType: ROCK_TYPES.SANDSTONE.id,
    hex: '#665643',
    rgb: [0.400, 0.337, 0.263],
    glslVec3: 'vec3(0.400, 0.337, 0.263)',
    depthRangeM: [75, 235],
    hueDeg: 32.6,
    description: 'Dusty buff sand / desert ochre with prominent sedimentary cross-bedding'
  },
  // Horizon 3: Iron-Oxide Anchor Band (235m - 390m) -> IRONSTONE
  iron_oxide: {
    id: 'iron_oxide',
    name: 'Iron-Oxide Band',
    rockType: ROCK_TYPES.IRONSTONE.id,
    hex: '#7C4029',
    rgb: [0.486, 0.251, 0.161],
    glslVec3: 'vec3(0.486, 0.251, 0.161)',
    depthRangeM: [235, 390],
    hueDeg: 16.6,
    description: 'Dusty terracotta concretionary ironstone with nodular texture'
  },
  // Horizon 4: Transitional Horizon (390m - 620m) -> SHALE
  transitional: {
    id: 'transitional',
    name: 'Transitional Horizon',
    rockType: ROCK_TYPES.SHALE.id,
    hex: '#48403D',
    rgb: [0.280, 0.250, 0.235],
    glslVec3: 'vec3(0.280, 0.250, 0.235)',
    depthRangeM: [390, 620],
    hueDeg: 16.4,
    description: 'Neutral warm stone grey-brown fissile shale with horizontal micro-laminations'
  },
  // Horizon 5: Pre-Casing Intermediate (620m - 850m) -> MUDSTONE
  pre_casing: {
    id: 'pre_casing',
    name: 'Pre-Casing Intermediate',
    rockType: ROCK_TYPES.MUDSTONE.id,
    hex: '#4A281A',
    rgb: [0.290, 0.157, 0.102],
    glslVec3: 'vec3(0.290, 0.157, 0.102)',
    depthRangeM: [620, 850],
    hueDeg: 17.5,
    description: 'Muted dark rust-umber dense compaction siltstone and blocky mudstone'
  },
  // Horizon 6: Approach to Pay Zone (850m - 1050m) -> SHALE
  approach_pay: {
    id: 'approach_pay',
    name: 'Approach to Pay Zone',
    rockType: ROCK_TYPES.SHALE.id,
    hex: '#321810',
    rgb: [0.196, 0.094, 0.063],
    glslVec3: 'vec3(0.196, 0.094, 0.063)',
    depthRangeM: [850, 1050],
    hueDeg: 14.1,
    description: 'Deep dark chocolate umber carbonaceous fissile caprock shale'
  },
  // Horizon 7: Heavy Oil Sandstone Base (1050m - 1200m+) -> SANDSTONE
  heavy_oil_base: {
    id: 'heavy_oil_base',
    name: 'Jodhpur Sandstone Pay Base',
    rockType: ROCK_TYPES.SANDSTONE.id,
    hex: '#1C0E08',
    rgb: [0.110, 0.055, 0.031],
    glslVec3: 'vec3(0.110, 0.055, 0.031)',
    depthRangeM: [1050, 1200],
    hueDeg: 18.0,
    description: 'Near-black bitumen-saturated porous sandstone with cross-strata and pebble conglomerate'
  }
};

// --- 3. FRACTURE-CRACK SYSTEM SPECIFICATION ---
export const STRATA_FRACTURES = {
  // Fracture core: near-black tectonic mineral vein fill
  coreHex: '#100906',
  coreRgb: [0.063, 0.035, 0.024],
  glslCore: 'vec3(0.063, 0.035, 0.024)',

  // Alteration halo: oxidized / bleached hydrothermal or meteoric leaching selvage
  haloHex: '#2A1A12',
  haloRgb: [0.165, 0.102, 0.071],
  glslHalo: 'vec3(0.165, 0.102, 0.071)',

  // Crack geometry & influence
  coreWidthM: 0.022,    // 2.2 cm core crack
  haloWidthM: 0.095,    // 9.5 cm alteration halo
  notchDepthM: 0.085    // Physical geometric groove displacement
};

// --- 4. RAGGED CLIFF EDGE GEOMETRY SPECIFICATION ---
export const STRATA_EDGE_GEOMETRY = {
  maxRaggedOffsetM: 0.42,  // Up to 42cm lateral ragged breakaways
  macroStepFreq: 1.45,
  microChipFreq: 5.80
};

// --- 5. MULTI-SCALE TEXTURE & WEATHERING ACCENTS ---
export const STRATA_TEXTURE_ACCENTS = {
  // Moisture & mineral blotching
  dampDark: {
    multiplier: 0.70,
    offsetRgb: [0.045, 0.038, 0.028],
    glslOffset: 'vec3(0.045, 0.038, 0.028)'
  },
  dryDusty: {
    multiplier: 1.28,
    offsetRgb: [0.048, 0.040, 0.024],
    glslOffset: 'vec3(0.048, 0.040, 0.024)'
  },
  // Soil crumb & clod texture
  soilClodScale: 14.0,
  soilClodAmplitude: 0.065,
  // Fine millimeter grain speckle
  microSpeckleScale1: 95.0,
  microSpeckleScale2: 210.0,
  microSpeckleAmplitude: 0.10,
  // Vertical seepage drainage rills
  seepageStreak: {
    multiplier: 0.48,
    offsetRgb: [0.045, 0.035, 0.025],
    glslOffset: 'vec3(0.045, 0.035, 0.025)',
    depthFadeMinM: 30.0,
    depthFadeMaxM: 950.0
  },
  // Embedded pebble conglomerate (Horizon 7)
  pebbles: {
    lightHex: '#5C4733',
    lightRgb: [0.360, 0.280, 0.200],
    glslLight: 'vec3(0.36, 0.28, 0.20)',
    darkHex: '#1F140F',
    darkRgb: [0.120, 0.080, 0.060],
    glslDark: 'vec3(0.12, 0.08, 0.06)',
    shadowRgb: [0.030, 0.030, 0.030],
    glslShadow: 'vec3(0.03)'
  }
};

// --- 6. COLOR DRIFT CLAMP GUARDS (LOCKED RANGES) ---
export const STRATA_CLAMP_RANGES = {
  // Hue Clamp: 15° to 40° (warm earthy umber/brown, prevents olive/green and gold)
  hueMinDeg: 15.0,
  hueMaxDeg: 40.0,
  hueMinNorm: 15.0 / 360.0, // ~0.04167
  hueMaxNorm: 40.0 / 360.0, // ~0.11111

  // Saturation Clamp: strictly desaturated, muted rock & soil
  saturationMin: 0.05,
  saturationMax: 0.44,

  // Lightness Clamp: strictly dark, caps peak brightness to preserve dark substrate
  lightnessMin: 0.05,
  lightnessMax: 0.36
};

// --- 7. MATERIAL & ROUGHNESS SPECIFICATION (MATTE GEOLOGY) ---
export const STRATA_MATERIAL_SPEC = {
  roughness: 0.96,        // Target: 0.90 - 1.0 (Completely matte, non-reflective)
  metalness: 0.0,         // Non-metallic dielectric earth
  clearcoat: 0.0,         // Zero clearcoat / varnish
  clearcoatRoughness: 1.0,
  transmission: 0.0,      // Fully opaque
  side: 'FrontSide'
};

// --- 8. SUBSURFACE LIGHTING PALETTE SPECIFICATION ---
export const STRATA_LIGHTING_SPEC = {
  // Primary warm raking sun (shallow angle creating self-shadows)
  sunLight: {
    colorHex: '#FFEAC9',
    rgb: [1.12, 0.98, 0.80],
    glslColor: 'vec3(1.12, 0.98, 0.80)',
    intensity: 0.85
  },
  // Cool-toned secondary sky fill
  coolFill: {
    colorHex: '#8094AE',
    rgb: [0.50, 0.58, 0.68],
    glslColor: 'vec3(0.50, 0.58, 0.68)',
    intensity: 0.35
  },
  // Ambient dusty desert atmosphere
  ambientLight: {
    colorHex: '#615952',
    rgb: [0.38, 0.35, 0.32],
    glslColor: 'vec3(0.38, 0.35, 0.32)'
  }
};

// --- 9. GLSL SHADER CODE INJECTION BLOCK ---
// Import and interpolate this block into strataFragmentShader to guarantee zero inline drift.
export const STRATA_PALETTE_GLSL = `
  // =========================================================================
  // LOCKED STRATA PALETTE SPECIFICATION (Imported from strataPalette.js)
  // Guaranteed single source of truth — zero inline magic numbers allowed
  // =========================================================================

  // Horizon 1: Surface crust (#2C2520) - MUDSTONE
  const vec3 col_crust            = ${STRATA_HORIZONS.crust.glslVec3};
  // Horizon 2: Sandy subsoil (#665643) - SANDSTONE (Cross-Bedding)
  const vec3 col_sandy_subsoil    = ${STRATA_HORIZONS.sandy_subsoil.glslVec3};
  // Horizon 3: Iron-oxide band (#7C4029) - IRONSTONE (Nodular Concretions)
  const vec3 col_iron_oxide       = ${STRATA_HORIZONS.iron_oxide.glslVec3};
  // Horizon 4: Transitional horizon (#48403D) - SHALE (Horizontal Micro-Laminae)
  const vec3 col_transitional     = ${STRATA_HORIZONS.transitional.glslVec3};
  // Horizon 5: Pre-casing intermediate (#4A281A) - MUDSTONE (Blocky Siltstone)
  const vec3 col_pre_casing       = ${STRATA_HORIZONS.pre_casing.glslVec3};
  // Horizon 6: Approach to pay zone (#321810) - SHALE (Carbonaceous Fissile Caprock)
  const vec3 col_approach_pay     = ${STRATA_HORIZONS.approach_pay.glslVec3};
  // Horizon 7: Heavy Oil Sandstone base (#1C0E08) - SANDSTONE (Cross-Strata & Conglomerate)
  const vec3 col_heavy_oil_base   = ${STRATA_HORIZONS.heavy_oil_base.glslVec3};

  // Fracture Crack Palette
  const vec3 FRACTURE_CORE_COLOR  = ${STRATA_FRACTURES.glslCore}; // #100906
  const vec3 FRACTURE_HALO_COLOR  = ${STRATA_FRACTURES.glslHalo}; // #2A1A12

  // Weathering, moisture staining & blotch offsets
  const vec3 STRATA_DAMP_OFFSET   = ${STRATA_TEXTURE_ACCENTS.dampDark.glslOffset};
  const vec3 STRATA_DRY_OFFSET    = ${STRATA_TEXTURE_ACCENTS.dryDusty.glslOffset};
  const vec3 STRATA_STREAK_OFFSET = ${STRATA_TEXTURE_ACCENTS.seepageStreak.glslOffset};

  // Embedded pebble conglomerate colors
  const vec3 STRATA_PEBBLE_LIGHT  = ${STRATA_TEXTURE_ACCENTS.pebbles.glslLight};
  const vec3 STRATA_PEBBLE_DARK   = ${STRATA_TEXTURE_ACCENTS.pebbles.glslDark};
  const vec3 STRATA_PEBBLE_SHADOW = ${STRATA_TEXTURE_ACCENTS.pebbles.glslShadow};

  // Lighting spec vectors
  const vec3 STRATA_SUN_COLOR     = ${STRATA_LIGHTING_SPEC.sunLight.glslColor};
  const vec3 STRATA_FILL_COLOR    = ${STRATA_LIGHTING_SPEC.coolFill.glslColor};
  const vec3 STRATA_AMBIENT_COLOR = ${STRATA_LIGHTING_SPEC.ambientLight.glslColor};

  // Color Guard Clamp Bounds
  const float STRATA_HUE_MIN_NORM = ${STRATA_CLAMP_RANGES.hueMinNorm.toFixed(6)}; // 15°
  const float STRATA_HUE_MAX_NORM = ${STRATA_CLAMP_RANGES.hueMaxNorm.toFixed(6)}; // 40°
  const float STRATA_SAT_MIN      = ${STRATA_CLAMP_RANGES.saturationMin.toFixed(4)};
  const float STRATA_SAT_MAX      = ${STRATA_CLAMP_RANGES.saturationMax.toFixed(4)};
  const float STRATA_LIGHT_MIN    = ${STRATA_CLAMP_RANGES.lightnessMin.toFixed(4)};
  const float STRATA_LIGHT_MAX    = ${STRATA_CLAMP_RANGES.lightnessMax.toFixed(4)}; // 36% max

  // Utility function: Enforce locked color guards (Hue 15°-40°, Sat <= 0.44, Lightness <= 0.36)
  vec3 enforceStrataColorGuard(vec3 color) {
    vec3 hsl = rgb2hsl(color);
    hsl.x = clamp(hsl.x, STRATA_HUE_MIN_NORM, STRATA_HUE_MAX_NORM);
    hsl.y = clamp(hsl.y, STRATA_SAT_MIN, STRATA_SAT_MAX);
    hsl.z = clamp(hsl.z, STRATA_LIGHT_MIN, STRATA_LIGHT_MAX);
    return hsl2rgb(hsl);
  }

  // --- ROCK-TYPE TEXTURE CHARACTER GENERATOR ---
  // Modulates each horizon with its distinct rock type physics (Cross-bedding, Fissility, Clods, Nodules)
  vec3 applyRockTypeTexture(
    vec3 baseColor,
    vec2 pos,
    float rawDepthM,
    float t1, float t2, float t3, float t4, float t5, float t6
  ) {
    float x = pos.x;
    float y = pos.y;

    // Weights for each horizon [0..1]
    float wCrust      = (1.0 - t1);
    float wSandy      = t1 * (1.0 - t2);
    float wIron       = t2 * (1.0 - t3);
    float wTrans      = t3 * (1.0 - t4);
    float wPreCasing  = t4 * (1.0 - t5);
    float wApproach   = t5 * (1.0 - t6);
    float wHeavyOil   = t6;

    // Categorized Rock Type Influence Weights
    // 1. Sandstone: Horizon 2 (Sandy Subsoil) & Horizon 7 (Heavy Oil Sandstone)
    float wSandstone = clamp(wSandy + wHeavyOil, 0.0, 1.0);
    // 2. Shale: Horizon 4 (Transitional) & Horizon 6 (Approach to Pay)
    float wShale = clamp(wTrans + wApproach, 0.0, 1.0);
    // 3. Mudstone: Horizon 1 (Crust) & Horizon 5 (Pre-Casing Intermediate)
    float wMudstone = clamp(wCrust + wPreCasing, 0.0, 1.0);
    // 4. Ironstone: Horizon 3 (Iron-Oxide Band)
    float wIronstone = clamp(wIron, 0.0, 1.0);

    vec3 result = baseColor;

    // A. SANDSTONE: Distinct Sedimentary Cross-Bedding (inclined dipping foresets ~20°)
    if (wSandstone > 0.01) {
      // Inclined coordinate dipping at ~21° (sin ~ 0.358, cos ~ 0.934)
      float cosA = 0.934;
      float sinA = 0.358;
      // Package alternation (dune set shifts direction periodically)
      float duneSet = sign(sin(y * 1.8 + 0.4));
      float uCross = (x * cosA + y * sinA * duneSet) * 22.0;
      float setWarp = fbm(vec2(x * 1.1, y * 2.2)) * 1.6;
      float crossLamina = sin(uCross + setWarp);
      // Tangential curving toward lower boundary (toeset curvature)
      float foresetMod = smoothstep(-0.85, 0.85, crossLamina);

      // Sand quartz/feldspar mineral grain speckle
      float sandGrain = (noise(vec2(x * 78.0, y * 85.0)) - 0.5) * 0.075;
      
      vec3 sandMod = vec3(foresetMod * 0.048 - 0.024) + vec3(sandGrain);
      result += sandMod * wSandstone;
    }

    // B. SHALE: High-Frequency Horizontal Parallel Fissility Micro-Laminae
    if (wShale > 0.01) {
      // Horizontally compressed, vertically stretched micro-laminae (aspect ratio ~50:1)
      float shaleLam1 = sin(y * 115.0 + noise(vec2(x * 1.8, y * 38.0)) * 2.4);
      float shaleLam2 = sin(y * 230.0 + noise(vec2(x * 3.2, y * 70.0)) * 1.8);
      float fissility = (shaleLam1 * 0.65 + shaleLam2 * 0.35) * 0.5 + 0.5;
      fissility = pow(fissility, 2.2); // sharp, thin parting planes

      vec3 shaleMod = vec3(fissility * 0.038 - 0.019);
      result += shaleMod * wShale;
    }

    // C. MUDSTONE: Massive Blocky Clods & Conchoidal Crumb Texture (Omnidirectional)
    if (wMudstone > 0.01) {
      float clod1 = (noise(vec2(x * 15.0, y * 16.0)) - 0.5) * 0.055;
      float clod2 = (fbm(vec2(x * 4.5, y * 4.8)) - 0.5) * 0.042;
      vec3 mudMod = vec3(clod1 + clod2);
      result += mudMod * wMudstone;
    }

    // D. IRONSTONE: Nodular Concretion Rings & Dense Ferruginous Mineral Mottling
    if (wIronstone > 0.01) {
      float nodDist = cellularNoise(vec2(x * 7.5, y * 8.2));
      float noduleRing = sin(nodDist * 16.0) * 0.5 + 0.5;
      noduleRing = pow(noduleRing, 1.8);
      float ironMottling = (noise(vec2(x * 45.0, y * 45.0)) - 0.5) * 0.082;
      vec3 ironMod = vec3(noduleRing * 0.062 - 0.031) + vec3(ironMottling);
      result += ironMod * wIronstone;
    }

    return result;
  }

  // --- TECTONIC FRACTURE-CRACK SYSTEM EVALUATION ---
  // Evaluates thin, dark, semi-random fracture paths crossing 2 to 4 geological bands
  // Returns vec4(crackMask, haloMask, crackGroove, 0.0)
  vec4 getFractureCrackEvaluation(vec2 pos) {
    float x = pos.x;
    float y = pos.y;

    // FRACTURE 1 (Left flank): Spans from Horizon 2 down through Horizon 5 (-1.1m to -7.5m, ~110m to 750m depth)
    // Crosses: Horizon 2 (Sandstone), Horizon 3 (Ironstone), Horizon 4 (Shale), Horizon 5 (Mudstone) -> 4 BANDS!
    float pathX1 = -2.35 + 0.082 * y + (fbm(vec2(y * 0.95, 4.3)) - 0.5) * 0.32 + (noise(vec2(y * 4.8, 11.2)) - 0.5) * 0.07;
    float d1 = abs(x - pathX1);
    float active1 = smoothstep(-0.85, -1.25, y) * smoothstep(-7.70, -7.25, y);

    // FRACTURE 2 (Right flank): Spans from Horizon 4 down through Horizon 7 (-4.2m to -11.6m, ~420m to 1160m depth)
    // Crosses: Horizon 4 (Shale), Horizon 5 (Mudstone), Horizon 6 (Shale), Horizon 7 (Sandstone) -> 4 BANDS!
    float pathX2 = 2.65 - 0.075 * y + (fbm(vec2(y * 1.15, 17.8)) - 0.5) * 0.35 + (noise(vec2(y * 5.2, 33.7)) - 0.5) * 0.08;
    float d2 = abs(x - pathX2);
    float active2 = smoothstep(-3.90, -4.35, y) * smoothstep(-11.90, -11.45, y);

    // FRACTURE 3 (Stepped Joint Branch): Crosses Horizons 1 to 3 near center (-0.2m to -3.8m)
    float pathX3 = 0.45 - 0.040 * y + (noise(vec2(y * 3.2, 55.4)) - 0.5) * 0.16;
    float d3 = abs(x - pathX3);
    float active3 = smoothstep(0.1, -0.35, y) * smoothstep(-3.90, -3.45, y);

    // Core fissure: thin, sharp crack (~1.8cm to 2.4cm width)
    float core1 = (1.0 - smoothstep(0.003, 0.018, d1)) * active1;
    float core2 = (1.0 - smoothstep(0.003, 0.022, d2)) * active2;
    float core3 = (1.0 - smoothstep(0.003, 0.016, d3)) * active3;
    float totalCore = clamp(core1 + core2 + core3, 0.0, 1.0);

    // Alteration halo: oxidized / leached mineral selvage (~8cm to 10cm halo)
    float halo1 = (1.0 - smoothstep(0.015, 0.085, d1)) * active1;
    float halo2 = (1.0 - smoothstep(0.015, 0.095, d2)) * active2;
    float halo3 = (1.0 - smoothstep(0.012, 0.075, d3)) * active3;
    float totalHalo = clamp(halo1 + halo2 + halo3, 0.0, 1.0);

    return vec4(totalCore, totalHalo, totalCore * 0.075 + totalHalo * 0.025, 0.0);
  }

  // --- RAGGED VERTICAL CLIFF SILHOUETTE FUNCTION ---
  // Produces organic, broken-rock quarry steps along vertical edges
  float getRaggedEdgeOffset(float y) {
    float stepNoise = (fbm(vec2(y * 1.45, 27.3)) - 0.5) * 0.42;
    float chipNoise = (noise(vec2(y * 5.80, 61.8)) - 0.5) * 0.16;
    return stepNoise + chipNoise;
  }
`;

export default {
  ROCK_TYPES,
  STRATA_HORIZONS,
  STRATA_FRACTURES,
  STRATA_EDGE_GEOMETRY,
  STRATA_TEXTURE_ACCENTS,
  STRATA_CLAMP_RANGES,
  STRATA_MATERIAL_SPEC,
  STRATA_LIGHTING_SPEC,
  STRATA_PALETTE_GLSL
};
