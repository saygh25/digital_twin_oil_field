/**
 * ============================================================================
 * STRATA PALETTE & SHADER SPECIFICATION MODULE (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * 🔒 LOCKED ARCHITECTURAL RULE:
 * ----------------------------------------------------------------------------
 * Any new strata geometry (box, cylinder, square-notch, wide slab, or future shape)
 * MUST import its shader and material generator from this module. Geometry
 * components must NEVER redefine coloring, rock textures, fracture cracks,
 * or lighting logic locally.
 * 
 * Objective: Stop visual, textural, and palette drift across geological shaders.
 * All geological shaders, Three.js materials, and UI annotations must import
 * directly from this file. DO NOT define inline magic-number colors elsewhere.
 * 
 * DESIGN TARGET: 100% Procedural GLSL matching the 7-band geological reference image.
 * Zero runtime image/texture loading.
 * 
 * 7 SUB-ZONES (Top to Bottom):
 *  1. 0–150m:      Overburden Crust — Dark speckled crust (#261C14, highlights #544434)
 *  2. 150–300m:    Olive-Khaki Siltstone — Earthy compact siltstone (#5E5428 / #786C38)
 *  3. 300–450m:    Caprock — Saturated rust-orange coarse sandstone (#8E4518 / #AE5822)
 *  4. 450–600m:    Badhaura Shale — Slate blue-grey clay mudstone (#4A525A / #626B74)
 *  5. 600–750m:    Bap Boulder Bed — Dense mottled gravel/grit conglomerate (#463A2C / #D6C8B0)
 *  6. 750–920m:    Bilara Dolomite — Deep espresso dark umber-brown (#2A1E14 / #3E2E20)
 *  7. 920–1100m:   Bilara Dense Limestone — Pale ash-grey dense limestone (#50565C / #687078)
 *  —  1100–1200m+: Jodhpur Pay Sandstone — Heavy oil reservoir pay zone (#120804)
 * ============================================================================
 */

// --- 1. ROCK-TYPE CATEGORIZATION PRESETS ---
export const ROCK_TYPES = {
  CRUST: {
    id: 'CRUST',
    name: 'Overburden Crust (Desert Pavement)',
    grainScale: 45.0,
    grainAmp: 0.038,
    fleckDensity: 0.75,
    roughnessTarget: 0.98,
    description: 'Dark weathered desert crust / pavement with manganese-iron varnish and fine mineral flecks'
  },
  OLIVE_KHAKI: {
    id: 'OLIVE_KHAKI',
    name: 'Olive-Khaki Siltstone',
    grainScale: 36.0,
    grainAmp: 0.048,
    fleckDensity: 0.25,
    roughnessTarget: 0.95,
    description: 'Muted olive-khaki compact siltstone with subtle earthy grain and micro-laminae'
  },
  COARSE_SANDSTONE: {
    id: 'COARSE_SANDSTONE',
    name: 'Coarse Sandstone / Caprock',
    grainScale: 28.0,
    grainAmp: 0.095,
    cellularScale: 16.0,
    cellularAmp: 0.075,
    roughnessTarget: 0.96,
    description: 'Coarse rust-orange ferruginous sandstone with nodular relief and quartz crystal facets'
  },
  BLUE_MUDSTONE: {
    id: 'BLUE_MUDSTONE',
    name: 'Blue-Grey Mudstone (Shale)',
    grainScale: 16.0,
    grainAmp: 0.022,
    fissilityFreq: 65.0,
    fissilityAmp: 0.015,
    roughnessTarget: 0.93,
    description: 'Smooth cool slate-blue clay mudstone with horizontal bedding micro-laminae'
  },
  GRAVEL_CONGLOMERATE: {
    id: 'GRAVEL_CONGLOMERATE',
    name: 'Bap Boulder Gravel Bed',
    pebbleScale: 32.0,
    gritScale: 95.0,
    contrast: 0.92,
    roughnessTarget: 0.99,
    description: 'Dense, high-contrast mottled tillite gravel and grit conglomerate with prominent clasts'
  },
  DOLOMITE: {
    id: 'DOLOMITE',
    name: 'Bilara Dolomite',
    grainScale: 30.0,
    grainAmp: 0.058,
    fbmScale: 7.5,
    roughnessTarget: 0.96,
    description: 'Dense dark umber-brown crystalline dolomite with medium crystalline grain'
  },
  LIMESTONE: {
    id: 'LIMESTONE',
    name: 'Bilara Dense Limestone',
    grainScale: 18.0,
    grainAmp: 0.024,
    veinFreq: 14.0,
    roughnessTarget: 0.92,
    description: 'Pale ash-grey micritic limestone with subtle white calcite hairline micro-veining'
  },
  JODHPUR_PAY: {
    id: 'JODHPUR_PAY',
    name: 'Jodhpur Pay Sandstone',
    crossBeddingAngleDeg: 21.0,
    crossBeddingFreq: 22.0,
    roughnessTarget: 0.97,
    description: 'Bitumen-saturated heavy oil porous sandstone with thermal heat glow'
  }
};

// --- 2. 7 SOIL & ROCK HORIZONS (+ RESERVOIR BASE) ---
export const STRATA_HORIZONS = {
  // Band 1: Overburden upper (0m - 150m) — Dark speckled desert crust
  band1_crust: {
    id: 'band1_crust',
    formation: 'Overburden Crust',
    name: 'Dark Speckled Crust',
    depthRangeM: [0, 150],
    hex: '#261C14',
    highlightHex: '#544434',
    shadowHex: '#120D08',
    rgb: [0.150, 0.110, 0.078],
    glslVec3: 'vec3(0.150, 0.110, 0.078)',
    rockType: ROCK_TYPES.CRUST.id,
    description: 'Dark speckled desert crust with manganese-iron varnish'
  },

  // Band 2: Overburden lower (150m - 300m) — Deep saturated olive-khaki siltstone
  band2_olive: {
    id: 'band2_olive',
    formation: 'Olive-Khaki Siltstone',
    name: 'Olive-Khaki Siltstone',
    depthRangeM: [150, 300],
    hex: '#5E5428',
    highlightHex: '#786C38',
    shadowHex: '#383214',
    rgb: [0.369, 0.329, 0.157],
    glslVec3: 'vec3(0.369, 0.329, 0.157)',
    rockType: ROCK_TYPES.OLIVE_KHAKI.id,
    description: 'Deep saturated olive-khaki compact siltstone with earthy bedding grain'
  },

  // Band 3: Caprock (~300m - 450m) — Saturated rich rust-orange / burnt terracotta
  band3_caprock: {
    id: 'band3_caprock',
    formation: 'Caprock (Rust-Orange Sandstone)',
    name: 'Rust-Orange Sandstone',
    depthRangeM: [300, 450],
    hex: '#8E4518',
    highlightHex: '#AE5822',
    shadowHex: '#522208',
    rgb: [0.557, 0.271, 0.094],
    glslVec3: 'vec3(0.557, 0.271, 0.094)',
    rockType: ROCK_TYPES.COARSE_SANDSTONE.id,
    description: 'Coarse rich rust-orange sandstone with prominent 3D relief'
  },

  // Band 4: Badhaura Shale (450m - 600m) — Cool slate blue-grey mudstone
  band4_shale: {
    id: 'band4_shale',
    formation: 'Badhaura Shale',
    name: 'Blue-Grey Mudstone',
    depthRangeM: [450, 600],
    hex: '#4A525A',
    highlightHex: '#626B74',
    shadowHex: '#2E353C',
    rgb: [0.290, 0.322, 0.353],
    glslVec3: 'vec3(0.290, 0.322, 0.353)',
    rockType: ROCK_TYPES.BLUE_MUDSTONE.id,
    description: 'Smooth cool slate blue-grey mudstone with horizontal micro-laminae'
  },

  // Band 5: Bap Boulder Bed (600m - 750m) — High-contrast dense gravel matrix
  band5_boulder: {
    id: 'band5_boulder',
    formation: 'Bap Boulder Bed',
    name: 'Gravel / Grit Mottled',
    depthRangeM: [600, 750],
    hex: '#463A2C',
    darkFleckHex: '#140E08',
    lightFleckHex: '#D6C8B0',
    rgb: [0.275, 0.227, 0.173],
    glslVec3: 'vec3(0.275, 0.227, 0.173)',
    rockType: ROCK_TYPES.GRAVEL_CONGLOMERATE.id,
    description: 'Dense high-contrast mottled tillite gravel and grit conglomerate'
  },

  // Band 6: Bilara Dolomite (750m - 920m) — Deep espresso dark umber-brown
  band6_dolomite: {
    id: 'band6_dolomite',
    formation: 'Bilara Dolomite',
    name: 'Dark Umber-Brown Dolomite',
    depthRangeM: [750, 920],
    hex: '#2A1E14',
    highlightHex: '#3E2E20',
    shadowHex: '#160E08',
    rgb: [0.165, 0.118, 0.078],
    glslVec3: 'vec3(0.165, 0.118, 0.078)',
    rockType: ROCK_TYPES.DOLOMITE.id,
    description: 'Dense deep espresso dark umber-brown crystalline dolomite'
  },

  // Band 7: Bilara Dense Limestone (920m - 1100m) — Cool slate ash-grey
  band7_limestone: {
    id: 'band7_limestone',
    formation: 'Bilara Dense Limestone',
    name: 'Pale Ash-Grey Limestone',
    depthRangeM: [920, 1100],
    hex: '#50565C',
    highlightHex: '#687078',
    shadowHex: '#343A40',
    rgb: [0.314, 0.337, 0.361],
    glslVec3: 'vec3(0.314, 0.337, 0.361)',
    rockType: ROCK_TYPES.LIMESTONE.id,
    description: 'Smooth cool slate ash-grey dense micritic limestone'
  },

  // Reservoir Pay Zone (1100m - 1200m+) — Bitumen heavy oil sand
  jodhpur_reservoir: {
    id: 'jodhpur_reservoir',
    formation: 'Jodhpur Pay Sandstone',
    name: 'Bitumen Heavy Oil Sandstone',
    depthRangeM: [1100, 1200],
    hex: '#120804',
    highlightHex: '#221208',
    shadowHex: '#080402',
    rgb: [0.071, 0.031, 0.016],
    glslVec3: 'vec3(0.071, 0.031, 0.016)',
    rockType: ROCK_TYPES.JODHPUR_PAY.id,
    description: 'Near-black bitumen-saturated porous sandstone with thermal heat bleed'
  }
};

// --- 3. UNINTERRUPTED CONTINUOUS FRACTURE-CRACK SPECIFICATION ---
export const STRATA_FRACTURES = {
  // Core fissure: deep near-black tectonic mineral vein fill
  coreHex: '#0d0704',
  coreRgb: [0.051, 0.027, 0.016],
  glslCore: 'vec3(0.051, 0.027, 0.016)',

  // Alteration halo: oxidized / bleached hydrothermal selvage
  haloHex: '#2e1c12',
  haloRgb: [0.180, 0.110, 0.071],
  glslHalo: 'vec3(0.180, 0.110, 0.071)',

  // Crack dimensions
  coreWidthM: 0.055,
  haloWidthM: 0.240,
  notchDepthM: 0.120
};

// --- 4. RAGGED CLIFF SILHOUETTE GEOMETRY SPECIFICATION ---
export const STRATA_EDGE_GEOMETRY = {
  maxRaggedOffsetM: 0.45,
  macroStepFreq: 1.45,
  microChipFreq: 5.80
};

// --- 5. TEXTURE & WEATHERING ACCENTS ---
export const STRATA_TEXTURE_ACCENTS = {
  dampDark: {
    offsetRgb: [0.035, 0.030, 0.022],
    glslOffset: 'vec3(0.035, 0.030, 0.022)'
  },
  dryDusty: {
    offsetRgb: [0.040, 0.035, 0.022],
    glslOffset: 'vec3(0.040, 0.035, 0.022)'
  },
  gravelDarkFleck: 'vec3(0.055, 0.038, 0.022)',
  gravelLightFleck: 'vec3(0.880, 0.820, 0.720)',
  gravelMidClast: 'vec3(0.440, 0.380, 0.300)',
  crustFleckLight: 'vec3(0.329, 0.267, 0.204)',
  calciteVeinLight: 'vec3(0.720, 0.760, 0.800)'
};

// --- 6. MATERIAL & ROUGHNESS SPECIFICATION (MATTE GEOLOGY) ---
export const STRATA_MATERIAL_SPEC = {
  roughness: 0.96,
  metalness: 0.0,
  clearcoat: 0.0,
  clearcoatRoughness: 1.0,
  transmission: 0.0,
  side: 'FrontSide'
};

// --- 7. SUBSURFACE LIGHTING PALETTE SPECIFICATION ---
export const STRATA_LIGHTING_SPEC = {
  sunLight: {
    colorHex: '#FFEAC9',
    rgb: [1.12, 0.98, 0.80],
    glslColor: 'vec3(1.12, 0.98, 0.80)',
    intensity: 0.95
  },
  coolFill: {
    colorHex: '#8094AE',
    rgb: [0.50, 0.58, 0.68],
    glslColor: 'vec3(0.50, 0.58, 0.68)',
    intensity: 0.40
  },
  ambientLight: {
    colorHex: '#615952',
    rgb: [0.38, 0.35, 0.32],
    glslColor: 'vec3(0.38, 0.35, 0.32)'
  }
};

// --- 8. GLSL CODE INJECTION BLOCK (SINGLE SOURCE OF TRUTH) ---
export const STRATA_PALETTE_GLSL = `
  // =========================================================================
  // LOCKED 7-BAND STRATA PALETTE SPECIFICATION (Procedural Only, No Textures)
  // =========================================================================

  // Band 1: Overburden Crust - Dark speckled desert crust (#22150C)
  const vec3 col_band1_crust       = vec3(0.120, 0.080, 0.050);
  // Band 2: Overburden lower - Olive-khaki siltstone (#787236)
  const vec3 col_band2_olive       = vec3(0.490, 0.460, 0.170);
  // Band 3: Caprock - Rust-orange sandstone (#D65410)
  const vec3 col_band3_caprock     = vec3(0.920, 0.390, 0.080);
  // Band 4: Badhaura Shale - Slate blue-grey mudstone (#3E4A56)
  const vec3 col_band4_shale       = vec3(0.240, 0.300, 0.370);
  // Band 5: Bap Boulder Bed - High-contrast tillite conglomerate (#322820)
  const vec3 col_band5_boulder     = vec3(0.200, 0.160, 0.120);
  // Band 6: Bilara Dolomite - Deep espresso umber-brown (#201208)
  const vec3 col_band6_dolomite    = vec3(0.110, 0.065, 0.035);
  // Band 7: Bilara Dense Limestone - Ash-silver limestone (#8C96A0)
  const vec3 col_band7_limestone   = vec3(0.580, 0.620, 0.660);
  // Base Zone: Jodhpur Pay Sandstone (#0E0502)
  const vec3 col_jodhpur_base      = vec3(0.045, 0.018, 0.008);

  // Fracture & Crack Palette (Deep high-contrast fissures & vivid alteration halos)
  const vec3 FRACTURE_CORE_COLOR   = vec3(0.005, 0.002, 0.001);
  const vec3 FRACTURE_HALO_COLOR   = vec3(0.360, 0.180, 0.080);
  const vec3 FRACTURE_CALCITE_SEAM = vec3(1.000, 1.000, 1.000);
  const vec3 MOISTURE_WEEP_COLOR   = vec3(0.035, 0.020, 0.010);

  // Mineral Flecks & Weathering Accents
  const vec3 GRAVEL_DARK_FLECK     = vec3(0.015, 0.010, 0.005);
  const vec3 GRAVEL_LIGHT_FLECK    = vec3(0.990, 0.980, 0.940);
  const vec3 GRAVEL_PINK_QUARTZ    = vec3(0.960, 0.580, 0.520);
  const vec3 GRAVEL_MID_CLAST      = vec3(0.460, 0.400, 0.330);
  const vec3 CRUST_LIGHT_FLECK     = vec3(0.420, 0.320, 0.220);
  const vec3 CALCITE_VEIN_LIGHT    = vec3(1.000, 1.000, 1.000);
  const vec3 STYLOLITE_DARK_SEAM   = vec3(0.015, 0.010, 0.005);

  // Lighting Colors
  const vec3 STRATA_SUN_COLOR      = vec3(1.20, 1.08, 0.96);
  const vec3 STRATA_FILL_COLOR     = vec3(0.50, 0.58, 0.70);
  const vec3 STRATA_AMBIENT_COLOR  = vec3(0.48, 0.46, 0.44);

  // --- MULTI-TIER TECTONIC FRACTURE & CRACK NETWORK ---
  // Returns: vec4(totalCore, totalHalo, totalGrooveGrad, microCrack)
  vec4 getFractureCrackEvaluation(vec2 pos) {
    float x = pos.x;
    float y = pos.y; // Positive depth (0.0 to 12.4m)

    // 1. PRIMARY TECTONIC FAULT 1 (Central-left, y = 0m to 12.4m)
    float pathX1 = -0.55 + 0.045 * y + (fbm(vec2(y * 0.85, 4.3)) - 0.5) * 0.52 + (noise(vec2(y * 4.5, 11.2)) - 0.5) * 0.14;
    float d1 = abs(x - pathX1);
    float active1 = smoothstep(-0.2, 0.15, y) * (1.0 - smoothstep(12.1, 12.5, y));

    // 2. SECONDARY TECTONIC FAULT 2 (Right flank, y = 0.5m to 12.2m)
    float pathX2 = 2.45 + 0.055 * y + (fbm(vec2(y * 0.95, 33.7)) - 0.5) * 0.58 + (noise(vec2(y * 4.0, 21.4)) - 0.5) * 0.13;
    float d2 = abs(x - pathX2);
    float active2 = smoothstep(0.4, 1.2, y) * (1.0 - smoothstep(11.8, 12.4, y));

    // 3. TERTIARY LEFT FAULT 3 (Left flank, x ~ -2.9m, y = 0.2m to 9.5m)
    float pathX3 = -2.90 - 0.065 * y + (fbm(vec2(y * 1.05, 14.8)) - 0.5) * 0.54 + (noise(vec2(y * 3.8, 7.8)) - 0.5) * 0.12;
    float d3 = abs(x - pathX3);
    float active3 = smoothstep(0.2, 0.8, y) * (1.0 - smoothstep(9.0, 9.6, y));

    // 4. FAR-LEFT FAULT 4 (x ~ -5.8m, y = 0.3m to 12.0m)
    float pathX4 = -5.80 + 0.035 * y + (fbm(vec2(y * 0.80, 52.1)) - 0.5) * 0.60 + (noise(vec2(y * 3.5, 39.1)) - 0.5) * 0.15;
    float d4 = abs(x - pathX4);
    float active4 = smoothstep(0.2, 0.9, y) * (1.0 - smoothstep(11.7, 12.3, y));

    // 5. FAR-RIGHT FAULT 5 (x ~ +5.6m, y = 0.2m to 12.0m)
    float pathX5 = 5.60 - 0.040 * y + (fbm(vec2(y * 0.90, 77.4)) - 0.5) * 0.55 + (noise(vec2(y * 4.2, 82.5)) - 0.5) * 0.14;
    float d5 = abs(x - pathX5);
    float active5 = smoothstep(0.2, 0.8, y) * (1.0 - smoothstep(11.8, 12.4, y));

    // 6. MID-RIGHT FAULT 6 (x ~ +4.1m, y = 3.5m to 12.2m)
    float pathX6 = 4.10 + 0.045 * y + (fbm(vec2(y * 1.10, 63.2)) - 0.5) * 0.45 + (noise(vec2(y * 4.8, 18.9)) - 0.5) * 0.12;
    float d6 = abs(x - pathX6);
    float active6 = smoothstep(3.3, 3.8, y) * (1.0 - smoothstep(11.9, 12.4, y));

    // 7. DIAGONAL SPLAY / BRANCH FRACTURES
    // Branch 1A (Splaying left from Fault 1 in Caprock: y = 2.3m to 4.8m)
    float branch1A_X = pathX1 - (y - 2.3) * 0.72 + (noise(vec2(y * 5.2, 9.1)) - 0.5) * 0.16;
    float dBranch1A = abs(x - branch1A_X);
    float activeBranch1A = smoothstep(2.2, 2.6, y) * (1.0 - smoothstep(4.5, 4.9, y));

    // Branch 1B (Splaying right from Fault 1 in Boulder/Dolomite: y = 6.0m to 8.8m)
    float branch1B_X = pathX1 + (y - 6.0) * 0.78 + (noise(vec2(y * 5.0, 44.2)) - 0.5) * 0.18;
    float dBranch1B = abs(x - branch1B_X);
    float activeBranch1B = smoothstep(5.9, 6.3, y) * (1.0 - smoothstep(8.5, 8.9, y));

    // Branch 2A (Splaying left from Fault 2 in Limestone: y = 8.5m to 11.2m)
    float branch2A_X = pathX2 - (y - 8.5) * 0.65 + (noise(vec2(y * 5.4, 53.1)) - 0.5) * 0.15;
    float dBranch2A = abs(x - branch2A_X);
    float activeBranch2A = smoothstep(8.4, 8.8, y) * (1.0 - smoothstep(10.9, 11.3, y));

    // Branch 3A (Splaying left from Fault 3 in Siltstone/Caprock: y = 1.6m to 3.8m)
    float branch3A_X = pathX3 - (y - 1.6) * 0.60 + (noise(vec2(y * 4.6, 71.3)) - 0.5) * 0.14;
    float dBranch3A = abs(x - branch3A_X);
    float activeBranch3A = smoothstep(1.5, 1.9, y) * (1.0 - smoothstep(3.6, 4.0, y));

    // Branch 4A (Splaying right from Fault 4 in Shale: y = 4.2m to 6.6m)
    float branch4A_X = pathX4 + (y - 4.2) * 0.70 + (noise(vec2(y * 4.8, 92.1)) - 0.5) * 0.15;
    float dBranch4A = abs(x - branch4A_X);
    float activeBranch4A = smoothstep(4.1, 4.5, y) * (1.0 - smoothstep(6.3, 6.7, y));

    // 8. BEDDING-PLANE CLEAVAGE CRACKS (Horizontal delamination joints at formation contacts)
    float hCrack1 = abs(y - 1.50 - sin(x * 0.30) * 0.06); // Crust / Siltstone contact
    float hCrack2 = abs(y - 3.00 - sin(x * 0.35 + 1.2) * 0.08); // Siltstone / Caprock contact
    float hCrack3 = abs(y - 4.50 - cos(x * 0.40 + 2.5) * 0.07); // Caprock / Shale contact
    float hCrack4 = abs(y - 6.00 - sin(x * 0.32 + 3.8) * 0.07); // Shale / Boulder contact
    float hCrack5 = abs(y - 7.50 - cos(x * 0.36 + 4.9) * 0.08); // Boulder / Dolomite contact
    float hCrack6 = abs(y - 9.20 - sin(x * 0.38 + 6.1) * 0.08); // Dolomite / Limestone contact
    float hCrack7 = abs(y - 11.00 - cos(x * 0.42 + 7.4) * 0.09); // Limestone / Reservoir contact

    float hCore = (1.0 - smoothstep(0.003, 0.024, hCrack1)) * smoothstep(0.30, 0.80, fbm(vec2(x * 0.7, 1.2)))
                + (1.0 - smoothstep(0.003, 0.026, hCrack2)) * smoothstep(0.25, 0.75, fbm(vec2(x * 0.8, 3.4)))
                + (1.0 - smoothstep(0.003, 0.028, hCrack3)) * smoothstep(0.22, 0.72, fbm(vec2(x * 0.9, 5.6)))
                + (1.0 - smoothstep(0.003, 0.024, hCrack4)) * smoothstep(0.28, 0.78, fbm(vec2(x * 0.8, 7.8)))
                + (1.0 - smoothstep(0.003, 0.026, hCrack5)) * smoothstep(0.25, 0.75, fbm(vec2(x * 0.7, 9.1)))
                + (1.0 - smoothstep(0.003, 0.030, hCrack6)) * smoothstep(0.22, 0.72, fbm(vec2(x * 0.8, 11.3)))
                + (1.0 - smoothstep(0.003, 0.028, hCrack7)) * smoothstep(0.25, 0.75, fbm(vec2(x * 0.9, 13.5)));

    // Core fissures (deep pitch-black chasm)
    float core1 = (1.0 - smoothstep(0.006, 0.055, d1)) * active1;
    float core2 = (1.0 - smoothstep(0.006, 0.050, d2)) * active2;
    float core3 = (1.0 - smoothstep(0.005, 0.046, d3)) * active3;
    float core4 = (1.0 - smoothstep(0.005, 0.048, d4)) * active4;
    float core5 = (1.0 - smoothstep(0.005, 0.048, d5)) * active5;
    float core6 = (1.0 - smoothstep(0.005, 0.044, d6)) * active6;
    float core1A = (1.0 - smoothstep(0.005, 0.042, dBranch1A)) * activeBranch1A;
    float core1B = (1.0 - smoothstep(0.005, 0.042, dBranch1B)) * activeBranch1B;
    float core2A = (1.0 - smoothstep(0.005, 0.042, dBranch2A)) * activeBranch2A;
    float core3A = (1.0 - smoothstep(0.005, 0.040, dBranch3A)) * activeBranch3A;
    float core4A = (1.0 - smoothstep(0.005, 0.040, dBranch4A)) * activeBranch4A;

    float totalCore = clamp(core1 + core2 + core3 + core4 + core5 + core6 + core1A + core1B + core2A + core3A + core4A + hCore * 0.95, 0.0, 1.0);

    // Alteration halos (rich oxidized rust selvage / bleached rock)
    float halo1 = (1.0 - smoothstep(0.025, 0.250, d1)) * active1;
    float halo2 = (1.0 - smoothstep(0.020, 0.220, d2)) * active2;
    float halo3 = (1.0 - smoothstep(0.018, 0.190, d3)) * active3;
    float halo4 = (1.0 - smoothstep(0.018, 0.190, d4)) * active4;
    float halo5 = (1.0 - smoothstep(0.018, 0.190, d5)) * active5;
    float halo6 = (1.0 - smoothstep(0.016, 0.180, d6)) * active6;
    float halo1A = (1.0 - smoothstep(0.015, 0.160, dBranch1A)) * activeBranch1A;
    float halo1B = (1.0 - smoothstep(0.015, 0.160, dBranch1B)) * activeBranch1B;
    float halo2A = (1.0 - smoothstep(0.015, 0.160, dBranch2A)) * activeBranch2A;
    float halo3A = (1.0 - smoothstep(0.012, 0.140, dBranch3A)) * activeBranch3A;
    float halo4A = (1.0 - smoothstep(0.012, 0.140, dBranch4A)) * activeBranch4A;

    float totalHalo = clamp(halo1 + halo2 + halo3 + halo4 + halo5 + halo6 + halo1A + halo1B + halo2A + halo3A + halo4A + hCore * 0.50, 0.0, 1.0);

    // Crack groove normal derivative gradient for physical shadowing
    float grooveGrad1 = clamp((pathX1 - x) / 0.06, -1.0, 1.0) * core1;
    float grooveGrad2 = clamp((pathX2 - x) / 0.05, -1.0, 1.0) * core2;
    float grooveGrad3 = clamp((pathX3 - x) / 0.05, -1.0, 1.0) * core3;
    float grooveGrad4 = clamp((pathX4 - x) / 0.05, -1.0, 1.0) * core4;
    float grooveGrad5 = clamp((pathX5 - x) / 0.05, -1.0, 1.0) * core5;
    float grooveGrad6 = clamp((pathX6 - x) / 0.05, -1.0, 1.0) * core6;
    float totalGrooveGrad = grooveGrad1 + grooveGrad2 + grooveGrad3 + grooveGrad4 + grooveGrad5 + grooveGrad6;

    // Brittle tension micro-cracks (crisp hairline web across entire rock formation)
    float microCrackCell1 = cellularNoise(pos * 9.5);
    float microCrackCell2 = cellularNoise(pos * 18.0 + vec2(12.7, 4.3));
    float microCrack1 = smoothstep(0.045, 0.0, abs(microCrackCell1 - 0.18)) * 0.85;
    float microCrack2 = smoothstep(0.040, 0.0, abs(microCrackCell2 - 0.16)) * 0.65;
    float microCrack = clamp(microCrack1 + microCrack2, 0.0, 1.0);

    return vec4(totalCore, totalHalo, totalGrooveGrad, microCrack);
  }

  // --- STYLOLITE PRESSURE DISSOLUTION SUTURE LINES (CARBONATE ROCK SIGNATURE) ---
  float getStyloliteSeam(vec2 pos, float seed) {
    float yRef = floor(pos.y * 1.8 + seed) / 1.8 + 0.28;
    float sutureWave = (noise(vec2(pos.x * 18.0, seed * 7.1)) - 0.5) * 0.045
                     + (noise(vec2(pos.x * 45.0, seed * 19.3)) - 0.5) * 0.025
                     + (noise(vec2(pos.x * 110.0, seed * 43.7)) - 0.5) * 0.012;
    float dist = abs(pos.y - (yRef + sutureWave));
    return smoothstep(0.016, 0.001, dist) * smoothstep(0.25, 0.80, fbm(vec2(pos.x * 0.8, seed * 4.2)));
  }

  // --- DOWNWARD MOISTURE & IRON SEEPAGE STREAKS ---
  float getSeepageStreaks(vec2 pos) {
    float streak = fbm(vec2(pos.x * 3.8, pos.y * 0.65));
    float drip = smoothstep(0.58, 0.86, streak);
    return drip;
  }

  // --- HIGH-FIDELITY GEOLOGICAL ROCK CHARACTER GENERATOR ---
  vec3 apply7BandRockTexture(
    vec3 baseColor,
    vec2 pos,
    float rawDepthM,
    float t1, float t2, float t3, float t4, float t5, float t6, float t7
  ) {
    float x = pos.x;
    float y = pos.y; // Positive depth (0.0 to 12.4)

    float w1 = (1.0 - t1);             // Band 1: Upper Crust (0-150m)
    float w2 = t1 * (1.0 - t2);        // Band 2: Olive-Khaki Siltstone (150-300m)
    float w3 = t2 * (1.0 - t3);        // Band 3: Caprock Rust-Orange Sandstone (300-450m)
    float w4 = t3 * (1.0 - t4);        // Band 4: Badhaura Shale Blue-Grey (450-600m)
    float w5 = t4 * (1.0 - t5);        // Band 5: Bap Boulder Gravel Bed (600-750m)
    float w6 = t5 * (1.0 - t6);        // Band 6: Bilara Dolomite Umber (750-920m)
    float w7 = t6 * (1.0 - t7);        // Band 7: Bilara Limestone Pale Grey (920-1100m)
    float wBase = t7;                  // Jodhpur Pay Sandstone (1100-1200m)

    vec3 result = baseColor;

    // BAND 1 (0-150m: Overburden Crust - Desert Pavement & Topsoil)
    // Organic humus mottling, fine soil grit, iron-manganese desert varnish patina
    if (w1 > 0.005) {
      float crustHumus = (fbm(pos * 6.5) - 0.5) * 0.120;
      float fineGrit = (noise(pos * 32.0) - 0.5) * 0.080;
      float microGrit = (noise(pos * 85.0) - 0.5) * 0.060;
      float varnishPatina = smoothstep(0.48, 0.82, fbm(pos * 3.2 + vec2(12.3, 4.5))) * 0.18;
      float desiccationFissure = smoothstep(0.040, 0.0, abs(cellularNoise(pos * 12.0) - 0.22)) * 0.14;
      
      vec3 crustTex = result + vec3(crustHumus + fineGrit + microGrit) 
                    - vec3(varnishPatina * 0.7, varnishPatina * 0.8, varnishPatina * 0.9)
                    - vec3(desiccationFissure);
      result = mix(result, crustTex, w1 * 0.96);
    }

    // BAND 2 (150-300m: Olive-Khaki Siltstone - Organic Silt & Clay Matrix)
    // Domain-warped sediment flow, fine siltstone mineral grain, micro-pores (zero horizontal sine scanlines)
    if (w2 > 0.005) {
      vec2 warp2 = vec2(fbm(pos * 1.8 + vec2(2.1, 7.3)), fbm(pos * 1.8 + vec2(8.4, 3.9)));
      float siltMottle = fbm(pos * 3.5 + warp2 * 1.4);
      float claySwirl = fbm(pos * vec2(1.2, 4.0) + warp2 * 0.8);
      
      float siltGrain = (noise(pos * 26.0) - 0.5) * 0.080;
      float microPores = (noise(pos * 65.0) - 0.5) * 0.050;
      float mineralFlecks = smoothstep(0.78, 0.95, noise(pos * 48.0 + vec2(15.2, 8.4))) * 0.12;
      
      vec3 siltColor = result;
      // Natural earthy mineral variegation (golden ochre pockets vs deep olive/khaki clay)
      siltColor += vec3(0.14, 0.10, -0.04) * (siltMottle - 0.5) * 0.55;
      siltColor += vec3(-0.06, 0.08, -0.03) * (claySwirl - 0.5) * 0.45;
      siltColor += vec3(siltGrain + microPores + mineralFlecks);
      
      result = mix(result, siltColor, w2 * 0.96);
    }

    // BAND 3 (300-450m: Caprock Rust-Orange Sandstone - Granular Quartz Matrix & Ferruginous Mottling)
    // Coarse sandstone relief, quartz crystal grit facets, organic iron-oxide diffusion mottling (zero diagonal/horizontal stripes)
    if (w3 > 0.005) {
      float sandGrit = (noise(pos * 18.0) - 0.5) * 0.13;
      float microQuartz = (noise(pos * 55.0) - 0.5) * 0.08;
      float coarseGrain = (noise(pos * 8.5) - 0.5) * 0.10;
      
      // Domain-warped iron-oxide diffusion mottling (natural warm rust & deep amber variations)
      vec2 ironWarp = vec2(fbm(pos * 1.6 + vec2(5.4, 9.2)), fbm(pos * 1.6 + vec2(12.7, 4.1)));
      float ironMottle = fbm(pos * 2.8 + ironWarp * 1.2);
      float deepRustPocket = smoothstep(0.60, 0.90, fbm(pos * 3.8 + ironWarp * 0.7)) * 0.22;
      
      // Quartz crystal grains (cellular facets catching light with zero stripes)
      float quartzCell = cellularNoise(pos * 16.0);
      float quartzGrains = smoothstep(0.42, 0.04, quartzCell) * 0.24;
      float fineGlint = smoothstep(0.82, 0.97, noise(pos * 75.0)) * 0.20;
      
      vec3 sandTex = result;
      // Deepen rich fiery terracotta and amber contrast
      sandTex += vec3(ironMottle * 0.16, -ironMottle * 0.05, -ironMottle * 0.09);
      sandTex -= vec3(deepRustPocket * 0.3, deepRustPocket * 0.6, deepRustPocket * 0.8);
      sandTex += vec3(sandGrit + microQuartz + coarseGrain + quartzGrains + fineGlint);
      
      result = mix(result, sandTex, w3 * 0.98);
    }

    // BAND 4 (450-600m: Badhaura Shale Mudstone - Fissile Slate & Clay Mudstone)
    // Slate blue-grey clay sheets, carbonaceous shale streaks, mica micro-glints (zero high-frequency sine scanlines)
    if (w4 > 0.005) {
      vec2 shaleWarp = vec2(fbm(pos * 1.4 + vec2(3.3, 11.7)), fbm(pos * 1.4 + vec2(7.8, 2.5)));
      float clayFlow = (fbm(pos * vec2(1.5, 5.0) + shaleWarp * 0.6) - 0.5) * 0.12;
      float clayGrain = (noise(pos * 24.0) - 0.5) * 0.060;
      float microGrit = (noise(pos * 60.0) - 0.5) * 0.040;
      
      // Mica mineral sheen & dark carbonaceous shale lenses
      float micaSpeck = smoothstep(0.84, 0.98, noise(pos * 65.0)) * 0.26;
      float darkCarbonStreak = smoothstep(0.52, 0.85, fbm(vec2(pos.x * 1.6, pos.y * 4.2) + shaleWarp * 0.8)) * 0.18;
      
      vec3 shaleTex = result + vec3(clayFlow + clayGrain + microGrit);
      shaleTex += vec3(micaSpeck * 0.9, micaSpeck * 0.95, micaSpeck * 1.1); // Silvery mica sheen
      shaleTex -= vec3(darkCarbonStreak * 1.2, darkCarbonStreak * 1.2, darkCarbonStreak * 1.4); // Dark carbonaceous shale
      
      result = mix(result, shaleTex, w4 * 0.96);
    }

    // BAND 5 (600-750m: Bap Boulder Bed - Tillite Conglomerate & Gravel Matrix)
    // Multi-scale embedded tillite clasts: white/cream granites, pink quartz, dark basalts, brown quartzite
    if (w5 > 0.005) {
      vec2 gPos1 = pos * 12.0;
      vec2 gPos2 = pos * 22.0 + vec2(15.3, 31.7);
      vec2 gPos3 = pos * 38.0 + vec2(47.1, 12.8);
      vec2 gPos4 = pos * 75.0 + vec2(83.4, 61.2);
      
      float pebble1 = cellularNoise(gPos1);
      float pebble2 = cellularNoise(gPos2);
      float pebble3 = cellularNoise(gPos3);
      float pebble4 = cellularNoise(gPos4);
      float fineGrit = noise(pos * 70.0);
      
      float clastDark  = smoothstep(0.38, 0.05, pebble1);
      float clastLight = smoothstep(0.36, 0.04, pebble2);
      float clastPink  = smoothstep(0.34, 0.04, pebble3);
      float clastMicro = smoothstep(0.32, 0.03, pebble4);
      float clastMid   = smoothstep(0.48, 0.88, fbm(pos * 4.0));
      
      // Shadow rim around clasts for real 3D depth
      float rimDark  = smoothstep(0.42, 0.36, pebble1) * 0.8;
      float rimLight = smoothstep(0.40, 0.34, pebble2) * 0.8;
      float rimPink  = smoothstep(0.38, 0.32, pebble3) * 0.8;
      float totalRims = clamp(rimDark + rimLight + rimPink, 0.0, 1.0);
      
      vec3 gravel = baseColor;
      gravel = mix(gravel, vec3(0.01, 0.008, 0.005), totalRims * 0.85); // Crisp dark contact rims
      gravel = mix(gravel, GRAVEL_DARK_FLECK, clastDark * 0.96);
      gravel = mix(gravel, GRAVEL_LIGHT_FLECK, clastLight * 0.95);
      gravel = mix(gravel, GRAVEL_PINK_QUARTZ, clastPink * 0.90);
      gravel = mix(gravel, vec3(1.00, 0.98, 0.94), clastMicro * 0.88);
      gravel = mix(gravel, GRAVEL_MID_CLAST, clastMid * 0.70);
      gravel += vec3((fineGrit - 0.5) * 0.11);
      
      result = mix(result, gravel, w5 * 0.99);
    }

    // BAND 6 (750-920m: Bilara Dolomite - Crystalline Dolomite & Stylolite Seams)
    // Deep espresso dark umber crystalline texture, dark stylolite suture lines, vuggy porous pockets
    if (w6 > 0.005) {
      float doloCrystalline = (noise(pos * 10.5) - 0.5) * 0.095;
      float doloMicroGrit = (noise(pos * 42.0) - 0.5) * 0.065;
      float doloFbm = (fbm(pos * 3.5) - 0.5) * 0.080;
      float vugs = smoothstep(0.68, 0.88, noise(pos * 24.0 + vec2(8.1, 19.3))) * 0.18;
      
      // Stylolite suture seams (dark zig-zag pressure dissolution lines)
      float stylolite1 = getStyloliteSeam(pos, 1.7);
      float stylolite2 = getStyloliteSeam(pos, 3.4);
      float stylolite3 = getStyloliteSeam(pos, 6.8);
      float totalStylolite = clamp(stylolite1 + stylolite2 + stylolite3 * 0.8, 0.0, 1.0);
      
      vec3 doloTex = result + vec3(doloCrystalline + doloMicroGrit + doloFbm) - vec3(vugs);
      doloTex = mix(doloTex, STYLOLITE_DARK_SEAM, totalStylolite * 0.96);
      
      result = mix(result, doloTex, w6 * 0.96);
    }

    // BAND 7 (920-1100m: Bilara Dense Limestone - Ash-Silver Micritic Stone & Calcite Veins)
    // Pale ash-silver micritic stone, branching white crystalline calcite veins, stylolite seams (zero linear sine waves)
    if (w7 > 0.005) {
      float limeMicritic = (noise(pos * 12.0) - 0.5) * 0.070;
      float limePores = (noise(pos * 42.0) - 0.5) * 0.045;
      float limeFbm = (fbm(pos * 3.5) - 0.5) * 0.065;
      
      // Natural branching calcite mineral veins (organic Voronoi cell boundaries, zero linear sine waves)
      vec2 limeWarp = vec2(noise(pos * 2.2 + vec2(4.1, 9.7)), noise(pos * 2.2 + vec2(11.3, 3.8))) * 0.25;
      float cell1 = cellularNoise(pos * 5.0 + limeWarp);
      float vein1 = smoothstep(0.045, 0.0, cell1) * smoothstep(0.30, 0.80, fbm(pos * 2.0));
      
      float cell2 = cellularNoise(pos * 10.5 + vec2(14.2, 6.7) + limeWarp * 0.6);
      float vein2 = smoothstep(0.035, 0.0, cell2) * smoothstep(0.35, 0.85, fbm(pos * 2.8));
      
      float totalVeins = clamp(vein1 * 0.95 + vein2 * 0.80, 0.0, 1.0);
      
      // Limestone stylolite seams
      float limeStylolite = getStyloliteSeam(pos, 5.2);
      
      vec3 limeTex = result + vec3(limeMicritic + limePores + limeFbm);
      limeTex = mix(limeTex, CALCITE_VEIN_LIGHT, totalVeins * 0.85); // Brilliant white branching calcite veins
      limeTex = mix(limeTex, STYLOLITE_DARK_SEAM, limeStylolite * 0.92);
      
      result = mix(result, limeTex, w7 * 0.96);
    }

    // BASE JODHPUR PAY SANDSTONE (1100-1200m+: Heavy Oil Bitumen Sand)
    // Porous sand, tar saturation gradients, thermal seepage mottling
    if (wBase > 0.005) {
      float bitumenGrain = (noise(pos * 12.0) - 0.5) * 0.080;
      float bitumenFbm = (fbm(pos * 4.0) - 0.5) * 0.070;
      float tarSeep = smoothstep(0.35, 0.85, fbm(pos * 2.2)) * 0.14;
      
      vec3 baseTex = result + vec3(bitumenGrain + bitumenFbm) - vec3(tarSeep);
      result = mix(result, baseTex, wBase * 0.95);
    }

    // Downward moisture and mineral weeping plumes bleeding across rock face
    float weep = getSeepageStreaks(pos);
    result = mix(result, result * MOISTURE_WEEP_COLOR * 2.2, weep * 0.28);

    return result;
  }

  // --- RAGGED VERTICAL CLIFF SILHOUETTE ---
  // Produces organic, broken-rock quarry steps along vertical edges
  float getRaggedEdgeOffset(float y) {
    float stepNoise = (fbm(vec2(y * 1.45, 27.3)) - 0.5) * 0.44;
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
  STRATA_MATERIAL_SPEC,
  STRATA_LIGHTING_SPEC,
  STRATA_PALETTE_GLSL
};
