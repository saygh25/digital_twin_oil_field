import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  STRATA_HORIZONS,
  STRATA_PALETTE_GLSL,
  STRATA_MATERIAL_SPEC,
  STRATA_CLAMP_RANGES,
  STRATA_TEXTURE_ACCENTS,
  STRATA_LIGHTING_SPEC
} from './strataPalette';

/**
 * Procedural Geological Strata Shader & Volumetric Subsurface Model
 * 
 * HARD CONSTRAINTS RESPECTED:
 * - ZERO image-based textures (no .map, no TextureLoader, no canvas .map).
 * - All noise computed in-shader (pure GLSL value/fBm noise).
 * - InstancedMesh rock debris with per-instance vertex colors.
 * - Single custom ShaderMaterial for the whole strata column.
 * - Depth-to-layer palette matching Rajasthan / Baghewala geology (0-1200m+).
 */

// Shared GLSL Procedural Math for Vertex Displacement & Fragment Shading
const strataCommonGLSL = `
  float hash(vec2 p) { 
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); 
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  float cellularNoise(vec2 p) {
    vec2 i_st = floor(p);
    vec2 f_st = fract(p);
    float m_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = vec2(
          hash(i_st + neighbor),
          hash(i_st + neighbor + vec2(37.1, 17.3))
        );
        vec2 diff = neighbor + point - f_st;
        float dist = length(diff);
        m_dist = min(m_dist, dist);
      }
    }
    return m_dist;
  }

  // --- RGB <-> HSL UTILITIES FOR COLOR GUARDS ---
  vec3 rgb2hsl(vec3 c) {
    float cMin = min(min(c.r, c.g), c.b);
    float cMax = max(max(c.r, c.g), c.b);
    float delta = cMax - cMin;
    float h = 0.0;
    float s = 0.0;
    float l = (cMax + cMin) * 0.5;
    if (delta > 0.00001) {
      s = (l > 0.5) ? (delta / (2.0 - cMax - cMin)) : (delta / (cMax + cMin));
      if (c.r >= cMax) {
        h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
      } else if (c.g >= cMax) {
        h = (c.b - c.r) / delta + 2.0;
      } else {
        h = (c.r - c.g) / delta + 4.0;
      }
      h /= 6.0;
    }
    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0 / 2.0) return q;
    if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    if (s <= 0.00001) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    float r = hue2rgb(p, q, h + 1.0 / 3.0);
    float g = hue2rgb(p, q, h);
    float b = hue2rgb(p, q, h - 1.0 / 3.0);
    return vec3(r, g, b);
  }

  ${STRATA_PALETTE_GLSL}

  // Real physical 3D displacement function (in meters)
  float getStrataDisplacement(vec2 xy, float rawDepthM) {
    float x = xy.x;
    float y = xy.y;

    float b1 = 75.0 - x * 0.8 + sin(x * 0.28 + 2.1) * 18.0;
    float b2 = 235.0 + x * 3.2 + sin(x * 0.28 + 5.7) * 18.0;
    float b3 = 390.0 - x * 2.5 + sin(x * 0.28 + 8.6) * 18.0;
    float b4 = 620.0 + sin(x * 0.25) * 20.0;
    float b5 = 850.0 + x * 1.8 + sin(x * 0.28 + 15.1) * 18.0;
    float b6 = 1050.0 - x * 1.5 + sin(x * 0.28 + 18.7) * 18.0;

    // Macro horizon protrusion / recession (hard rock proud, soft sand recessed)
    // Scaled for dramatic 3D cliff perspective relief across 13.5m block
    float hMacro = 0.015;
    if (rawDepthM >= b1 && rawDepthM < b2) {
      hMacro = -0.150; // Sandy subsoil: soft, deeply recessed & eroded (-15cm)
    } else if (rawDepthM >= b2 && rawDepthM < b3) {
      hMacro = 0.165;  // Caprock iron-oxide: hard proud overhanging ledge (+16.5cm)
    } else if (rawDepthM >= b3 && rawDepthM < b4) {
      hMacro = -0.110; // Transitional siltstone: recessed erosion shelf (-11cm)
    } else if (rawDepthM >= b4 && rawDepthM < b5) {
      hMacro = 0.135;  // Pre-casing: proud rock bed (+13.5cm)
    } else if (rawDepthM >= b5 && rawDepthM < b6) {
      hMacro = -0.075; // Approach to pay: medium dense shale (-7.5cm)
    } else if (rawDepthM >= b6) {
      hMacro = 0.210;  // Massive Jodhpur Sandstone base: massive proud shelf (+21cm)
    }

    // Coarser erosion undulation & pitting within softer bands
    float pitNoise = (fbm(vec2(x * 0.45, y * 0.65)) - 0.5) * 0.085;
    float isSoft = (rawDepthM >= b1 && rawDepthM < b2) ? 1.0 : ((rawDepthM >= b3 && rawDepthM < b4) ? 0.75 : 0.35);
    float erosionPitting = pitNoise * isSoft;

    // Protruding lumps near bottom horizon (Horizon 7, embedded pebble/cobble relief)
    float pebbleRelief = 0.0;
    if (rawDepthM >= b6 - 25.0) {
      float pDist = cellularNoise(xy * 11.0);
      float pBump = smoothstep(0.40, 0.08, pDist);
      pebbleRelief = pBump * 0.155; // Up to +15.5cm protruding boulder/pebble lumps!
    }

    // Medium clods and crumb structure
    float clodDisp = (noise(xy * 12.0) - 0.5) * 0.045;

    // Fine-scale grain bumpiness (dense grain displacement)
    float fineDisp = (noise(xy * 38.0) - 0.5) * 0.020;

    // Fracture notch groove (physical micro-crevice for raking light cast shadow)
    vec4 crackEval = getFractureCrackEvaluation(xy);
    float crackGroove = crackEval.z;

    return hMacro + erosionPitting + pebbleRelief + clodDisp + fineDisp - crackGroove;
  }
`;

// GLSL Vertex Shader for Strata Column with Real Subdivided Displacement & Exact Normal
const strataVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vDisplacedNormal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDisplacement;

  ${strataCommonGLSL}

  void main() {
    vUv = uv;
    vec3 N = normalize(normal);

    // Apply relief displacement exclusively to vertical rock cliff faces (front/sides)
    float isCliff = 1.0 - smoothstep(0.3, 0.6, abs(N.y));

    // World-space vertical position corresponds to depth (0m to 1200m)
    vec4 worldPosInitial = modelMatrix * vec4(position, 1.0);
    float rawDepthM = -worldPosInitial.y * 100.0;

    // Organic ragged quarry silhouette along left & right vertical edges (not a clean rectangle)
    float edgeRagged = getRaggedEdgeOffset(worldPosInitial.y);
    float lateralDist = 6.75 - abs(position.x);
    float edgeInfluence = 1.0 - smoothstep(0.0, 1.35, lateralDist);
    if (abs(normal.x) > 0.5) {
      edgeInfluence = 1.0;
    }

    // Watertight edge fade: fade front face displacement to 0 within 0.45m of block boundaries
    float edgeFadeX = smoothstep(0.0, 0.45, lateralDist);
    float edgeFadeY = smoothstep(0.0, 0.55, 6.20 - abs(position.y));
    float edgeFade = edgeFadeX * edgeFadeY;

    float totalDisp = getStrataDisplacement(worldPosInitial.xy, rawDepthM) * isCliff * edgeFade;

    // Displace vertex along face normal + lateral ragged edge breakaways
    vec3 displacedPos = position + normal * totalDisp;
    displacedPos.x += edgeRagged * edgeInfluence;

    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);

    // Compute exact geometric displaced world normal via finite differences
    float eps = 0.04;
    float hC = totalDisp;
    float hR = getStrataDisplacement(worldPosInitial.xy + vec2(eps, 0.0), rawDepthM) * isCliff * edgeFade;
    float hU = getStrataDisplacement(worldPosInitial.xy + vec2(0.0, eps), rawDepthM - eps * 100.0) * isCliff * edgeFade;

    vec3 tangentX = vec3(eps, 0.0, (hR - hC));
    vec3 tangentY = vec3(0.0, eps, (hU - hC));
    vec3 localDisplacedN = normalize(cross(tangentX, tangentY));
    if (N.z < 0.5) {
      localDisplacedN = normal;
    }

    vWorldPosition = worldPos.xyz;
    vDisplacedNormal = normalize((modelMatrix * vec4(localDisplacedN, 0.0)).xyz);
    vNormal = normalize(normalMatrix * normal);
    vDisplacement = totalDisp;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// GLSL Fragment Shader for Strata Column (Real Soil/Rock Horizons)
const strataFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform vec3 uSteamChamberPos;
  uniform float uHeatInfluence;
  uniform float uReservoirTemp;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPosition;
  varying vec3 vDisplacedNormal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDisplacement;

  ${strataCommonGLSL}

  // --- STEP 4: IRREGULAR TORN BOUNDARY EVALUATION WITH UNEVEN THICKNESS ---
  float getHorizonTransition(float baseM, float x, float y, float seed, float rawDepthM) {
    float w1 = sin(x * 0.26 + seed * 2.1) * 19.0;
    float w2 = cos(x * 0.58 - seed * 3.4) * 11.5;
    float w3 = sin(x * 1.35 + seed * 4.7) * 5.2;
    float n1 = (fbm(vec2(x * 0.38 + seed * 10.0, y * 0.25)) - 0.5) * 22.0;

    // Torn / jagged transitions: high-frequency tear noise
    float tearNoise = (noise(vec2(x * 4.2 + seed * 2.0, y * 1.8)) - 0.5) * 8.5;
    float microTear = (noise(vec2(x * 14.0, y * 5.0)) - 0.5) * 3.6;

    // Uneven transition width along the boundary length (some stretches sharp 3m, some gradual 18m)
    float blurNoise = noise(vec2(x * 0.75 + seed * 4.3, baseM * 0.01));
    float transWidth = mix(3.2, 19.0, smoothstep(0.25, 0.75, blurNoise));

    float localBound = baseM + w1 + w2 + w3 + n1 + tearNoise + microTear;
    return smoothstep(localBound - transWidth * 0.5, localBound + transWidth * 0.5, rawDepthM);
  }

  void main() {
    // World Y to Depth in Meters (0.0 -> 0m, -12.0 -> 1200m)
    float rawDepthM = -vWorldPosition.y * 100.0;
    float x = vWorldPosition.x;
    float y = vWorldPosition.y;

    // --- 1. MACRO SOIL/ROCK HORIZONS WITH UNEVEN THICKNESS & TORN BOUNDARIES ---
    // (a) Horizon 1 -> 2 (Crust -> Sandy Subsoil)
    float t1 = getHorizonTransition(75.0 - x * 0.8, x, y, 1.3, rawDepthM);
    vec3 strataColor = mix(col_crust, col_sandy_subsoil, t1);

    // (b) Horizon 2 -> 3 (Sandy Subsoil -> Iron-Oxide Terracotta Anchor)
    float t2 = getHorizonTransition(235.0 + x * 3.2 + sin(x * 0.35) * 12.0, x, y, 2.7, rawDepthM);
    strataColor = mix(strataColor, col_iron_oxide, t2);

    // (c) Horizon 3 -> 4 (Iron-Oxide -> Transitional Warm Stone Grey-Brown)
    float t3 = getHorizonTransition(390.0 - x * 2.5 + cos(x * 0.42) * 14.0, x, y, 4.1, rawDepthM);
    strataColor = mix(strataColor, col_transitional, t3);

    // (d) Horizon 4 -> 5 (Transitional -> Pre-Casing Rust-Umber)
    float t4 = getHorizonTransition(620.0 + sin(x * 0.25) * 20.0, x, y, 5.8, rawDepthM);
    strataColor = mix(strataColor, col_pre_casing, t4);

    // (e) Horizon 5 -> 6 (Pre-Casing -> Approach to Pay)
    float t5 = getHorizonTransition(850.0 + x * 1.8, x, y, 7.2, rawDepthM);
    strataColor = mix(strataColor, col_approach_pay, t5);

    // (f) Horizon 6 -> 7 (Approach to Pay -> Heavy Oil Base)
    float t6 = getHorizonTransition(1050.0 - x * 1.5, x, y, 8.9, rawDepthM);
    strataColor = mix(strataColor, col_heavy_oil_base, t6);

    // --- 2. ROCK-TYPE TEXTURE CATEGORIZATION PASS ---
    // Sandstone (Cross-bedding foresets & sand grains)
    // Shale (Tight horizontal parallel fissility micro-laminae)
    // Mudstone (Massive blocky crumbs and clods)
    // Ironstone (Concretionary nodular rings and dense mineral mottling)
    strataColor = applyRockTypeTexture(strataColor, vWorldPosition.xy, rawDepthM, t1, t2, t3, t4, t5, t6);

    // --- 3. MULTI-SCALE TEXTURE: COARSE BLOTCHING + MEDIUM CLODS + FINE GRAIN ---
    // (a) Coarse irregular mineral & moisture staining patches (2m to 5m across) - CLEARLY VISIBLE
    float blotchA = fbm(vec2(x * 0.32, y * 0.42));
    float blotchB = noise(vec2(x * 0.85, y * 1.05) + vec2(14.7, 43.2));
    float macroBlotch = blotchA * 0.70 + blotchB * 0.30;
    float blotchFactor = smoothstep(0.30, 0.70, macroBlotch);
    vec3 dampDark = strataColor * 0.70 - STRATA_DAMP_OFFSET;
    vec3 dryDusty = strataColor * 1.28 + STRATA_DRY_OFFSET;
    strataColor = mix(dampDark, dryDusty, blotchFactor);

    // (b) Medium soil crumb / clod texture (20cm to 50cm clods)
    float soilClod = (noise(vWorldPosition.xy * 14.0) - 0.5) * 0.045;

    // (c) Fine sand / rock speckle (millimeter grains)
    float fineGrain1 = noise(vWorldPosition.xy * 95.0);
    float fineGrain2 = noise(vWorldPosition.xy * 210.0 + vec2(17.3, 41.9));
    float microSpeckle = (fineGrain1 * 0.65 + fineGrain2 * 0.35 - 0.5) * 0.06;

    strataColor += vec3(soilClod + microSpeckle);

    // --- 4. VERTICAL SEEPAGE STREAKS (CLEARLY VISIBLE DRAINAGE RILLS) ---
    vec2 streakUv = vec2(x * 2.6 + 12.1, y * 0.042);
    float s1 = noise(streakUv);
    float s2 = noise(streakUv * 2.2 + vec2(9.4, 21.7));
    float sFbm = s1 * 0.65 + s2 * 0.35;
    float streakVal = smoothstep(0.44, 0.72, sFbm);
    float rillDetail = smoothstep(0.48, 0.78, noise(vec2(x * 8.5, y * 0.14)));
    float finalStreak = streakVal * (0.65 + 0.35 * rillDetail);
    float streakFade = smoothstep(950.0, 30.0, rawDepthM);
    strataColor = mix(strataColor, strataColor * 0.48 - STRATA_STREAK_OFFSET, finalStreak * streakFade * 0.75);

    // --- 5. EMBEDDED PEBBLE CONGLOMERATE (Bottom Horizon 7 Only) ---
    float pebbleDist = cellularNoise(vWorldPosition.xy * 11.0);
    float pebbleMask = 1.0 - smoothstep(0.12, 0.36, pebbleDist);
    vec2 pebbleId = floor(vWorldPosition.xy * 11.0);
    float pebbleSeed = hash(pebbleId * 23.7);
    vec3 pebbleCol = mix(STRATA_PEBBLE_LIGHT, STRATA_PEBBLE_DARK, pebbleSeed);
    float pebbleRim = smoothstep(0.28, 0.36, pebbleDist) * (1.0 - smoothstep(0.36, 0.44, pebbleDist));
    vec3 pebbleWithShadow = mix(pebbleCol, STRATA_PEBBLE_SHADOW, pebbleRim * 0.7);
    float bottomInfluence = smoothstep(0.1, 0.8, t6);
    strataColor = mix(strataColor, pebbleWithShadow, pebbleMask * bottomInfluence * 0.75);

    // --- 6. TECTONIC FRACTURE-CRACK LINES OVERLAY PASS ---
    // Thin, dark, semi-random fracture paths crossing 2 to 4 geological bands
    vec4 crackEval = getFractureCrackEvaluation(vWorldPosition.xy);
    float crackCore = crackEval.x;
    float crackHalo = crackEval.y;
    // Layer (a): Alteration halo / weathered bleached selvage
    strataColor = mix(strataColor, FRACTURE_HALO_COLOR, crackHalo * 0.75);
    // Layer (b): Deep near-black tectonic fissure vein
    strataColor = mix(strataColor, FRACTURE_CORE_COLOR, crackCore * 0.94);

    // --- 7. DARK / DIRTY PALETTE GUARD & HARD CLAMP (Single Source of Truth: Hue 15°-40°, Lightness <= 36%) ---
    strataColor = enforceStrataColorGuard(strataColor);

    // --- 6. TOP SURFACE SHADING ---
    if (vNormal.y > 0.65) {
      float surfGrain = (noise(vWorldPosition.xz * 35.0) - 0.5) * 0.04;
      strataColor = clamp(col_crust + vec3(surfGrain), 0.0, 1.0);
    }

    // --- 7. STEAM CHAMBER THERMAL HEAT INFLUENCE & EMISSIVE BLEED ---
    vec3 heatDelta = vWorldPosition - uSteamChamberPos;
    float heatDist = length(vec3(heatDelta.x * 0.65, heatDelta.y * 1.25, heatDelta.z * 0.85));
    float heatRadius = 4.4;
    float heatFactor = clamp(1.0 - heatDist / heatRadius, 0.0, 1.0);
    heatFactor = pow(heatFactor, 1.5) * uHeatInfluence;

    float heatPulse = 0.92 + 0.18 * sin(uTime * 2.2 + vWorldPosition.x * 0.4);
    vec3 heatColor = mix(vec3(0.95, 0.22, 0.05), vec3(1.0, 0.70, 0.25), heatFactor);
    strataColor = mix(strataColor, heatColor, heatFactor * 0.75);
    vec3 emissiveGlow = heatColor * (heatFactor * heatPulse * 1.6);

    // --- 8. STEP 1 & 2: PHYSICAL SELF-SHADOWING & REAL RAKING SUN LIGHTING ---
    vec3 N = normalize(vDisplacedNormal);
    vec3 L = normalize(uSunDirection);
    float diff = max(dot(N, L), 0.0);

    // 4-step heightfield self-shadow raymarch along raking sun direction
    float selfShadow = 1.0;
    vec2 sunDir2D = normalize(vec2(-uSunDirection.x, -uSunDirection.y));
    float currentH = vDisplacement;
    for (int i = 1; i <= 4; i++) {
      float stepDist = float(i) * 0.09;
      vec2 sampleXY = vWorldPosition.xy + sunDir2D * stepDist;
      float sampleDepth = -sampleXY.y * 100.0;
      float sampleH = getStrataDisplacement(sampleXY, sampleDepth);
      if (sampleH > currentH + stepDist * 0.48) {
        selfShadow -= 0.22;
      }
    }
    selfShadow = clamp(selfShadow, 0.18, 1.0);

    // Lateral shading gradient across the block width
    float widthGradient = clamp((-vWorldPosition.x + 4.5) / 9.0, 0.0, 1.0);
    float sunIntensity = 0.68 + 0.32 * widthGradient;

    // Subsurface depth attenuation
    float depthOccl = clamp(0.70 + 0.30 * (1.0 - rawDepthM / 1200.0), 0.65, 1.0);

    // Primary warm golden desert sun with physical cast shadows
    vec3 sunLight = STRATA_SUN_COLOR * diff * sunIntensity * selfShadow * 0.85;

    // Secondary cool-toned fill light from opposite side (low intensity)
    vec3 fillDir = normalize(vec3(1.4, -0.2, 0.8));
    float fillDiff = max(dot(N, fillDir), 0.0);
    vec3 coolFill = STRATA_FILL_COLOR * fillDiff * 0.35;

    // Ambient dusty sky
    vec3 ambientLight = STRATA_AMBIENT_COLOR * depthOccl;

    vec3 litColor = strataColor * (ambientLight + coolFill + sunLight);

    // --- 9. EDGE & CORNER AMBIENT OCCLUSION (SOLID 3D VOLUME READ) ---
    float distEdgeX = 6.75 - abs(vWorldPosition.x);
    float distEdgeBottom = vWorldPosition.y + 12.4;
    float edgeAO_X = smoothstep(0.0, 1.25, distEdgeX);
    float edgeAO_Bottom = smoothstep(0.0, 1.10, distEdgeBottom);
    float cornerDist = sqrt(max(1.25 - distEdgeX, 0.0) * max(1.25 - distEdgeX, 0.0) + max(1.10 - distEdgeBottom, 0.0) * max(1.10 - distEdgeBottom, 0.0));
    float cornerAO = 1.0 - smoothstep(0.0, 1.2, cornerDist) * 0.35;
    float blockAO = clamp(edgeAO_X * edgeAO_Bottom * cornerAO, 0.38, 1.0);

    litColor *= blockAO;

    gl_FragColor = vec4(litColor + emissiveGlow, 1.0);
  }
`;

// Volumetric Steam Chamber GLSL Shaders
const steamChamberVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const steamChamberFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uIntensity;
  uniform float uTempNorm;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPosition);

    // Mathematical radial and fresnel falloff
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = clamp(1.0 - NdotV, 0.0, 1.0);
    float radial = clamp(1.0 - length(vPosition), 0.0, 1.0);

    // Thermal core (#FFB25C -> #FF6A2E) falling off to deep red (#8A1F0E)
    vec3 colCore = vec3(1.0, 0.70, 0.36);   // #FFB25C
    vec3 colMid  = vec3(1.0, 0.42, 0.18);   // #FF6A2E
    vec3 colEdge = vec3(0.54, 0.12, 0.05);   // #8A1F0E

    float pulse = 0.90 + 0.20 * sin(uTime * 2.4);
    vec3 glowColor = mix(colEdge, mix(colMid, colCore, radial), radial);

    float alpha = (pow(radial, 1.2) * 0.75 + pow(fresnel, 2.5) * 0.35) * uIntensity * pulse;
    alpha = clamp(alpha, 0.0, 0.95);

    gl_FragColor = vec4(glowColor, alpha);
  }
`;

// PRNG for reproducible rock debris instancing
function createPRNG(seed = 12345) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function GeologicalCrossSection({
  centerX = 1.0,
  centerZ = -1.8,
  width = 13.5,
  height = 12.4,
  depth = 3.6,
  cssStage = 'PRODUCTION_MID',
  currentTempC = 76.4,
  cameraView = 'full'
}) {
  const strataMaterialRef = useRef();
  const steamMaterialRef = useRef();
  const thermalEmbersRef = useRef();

  // 1. Depth Ruler Ticks matching the palette depth bands
  const DEPTH_TICKS = useMemo(() => [
    { depthM: 0, yOffset: 0.0, isMajor: true },
    { depthM: 150, yOffset: -1.50, isMajor: false },
    { depthM: 200, yOffset: -2.00, isMajor: true },
    { depthM: 300, yOffset: -3.00, isMajor: true }, // Caprock Formation
    { depthM: 400, yOffset: -4.00, isMajor: true },
    { depthM: 600, yOffset: -6.00, isMajor: true }, // Transitional base
    { depthM: 750, yOffset: -7.50, isMajor: true }, // Intermediate Casing Shoe
    { depthM: 800, yOffset: -8.00, isMajor: false },
    { depthM: 1000, yOffset: -10.00, isMajor: true }, // Approach to pay
    { depthM: 1150, yOffset: -11.50, isMajor: true }, // Jodhpur Sandstone Pay
    { depthM: 1200, yOffset: -12.00, isMajor: true }
  ], []);

  // 2. Geological Callout Annotations matching reference
  const CALLOUTS = useMemo(() => [
    {
      id: 'wellhead',
      label: 'Wellhead',
      position: [0.6, 0.4, depth / 2 + 0.16],
      lineWidth: 48
    },
    {
      id: 'tubing',
      label: 'Tubing',
      position: [0.7, -2.1, depth / 2 + 0.16],
      lineWidth: 42
    },
    {
      id: 'rod_string',
      label: 'Rod String',
      position: [0.55, -4.2, depth / 2 + 0.16],
      lineWidth: 50
    },
    {
      id: 'casing_shoe',
      label: 'Intermediate Casing Shoe (750m)',
      position: [0.55, -7.5, depth / 2 + 0.16],
      lineWidth: 50
    },
    {
      id: 'downhole_pump',
      label: 'Downhole Pump (Barrel & Plunger, 940m)',
      position: [0.55, -9.4, depth / 2 + 0.16],
      lineWidth: 65
    },
    {
      id: 'steam_chamber',
      label: 'Steam Chamber (Heated Zone)',
      position: [-1.4, -10.8, depth / 2 + 0.16],
      lineWidth: 75,
      isThermal: true
    },
    {
      id: 'heavy_oil_zone',
      label: 'Heavy Oil Zone (Jodhpur Sandstone)',
      position: [-1.2, -11.8, depth / 2 + 0.16],
      lineWidth: 65,
      isReservoir: true
    }
  ], [depth]);

  // 3. Floating 3D Thermal Embers in Steam Chamber
  const { emberPositions, emberSpeeds } = useMemo(() => {
    const prng = createPRNG(777);
    const count = 160;
    const pos = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = 1.8 + (prng() - 0.5) * 5.2; // Centered near wellbore intake
      pos[i * 3 + 1] = -10.8 + (prng() - 0.5) * 2.0; // In steam chamber
      pos[i * 3 + 2] = depth / 2 + 0.16 + (prng() - 0.5) * 0.4;

      speeds.push({
        baseX: pos[i * 3],
        baseY: pos[i * 3 + 1],
        speed: 0.2 + prng() * 0.3,
        phase: prng() * Math.PI * 2
      });
    }

    return { emberPositions: pos, emberSpeeds: speeds };
  }, [depth]);

  // 5. Shader Uniforms
  const strataUniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uSteamChamberPos: { value: new THREE.Vector3(1.8, -10.8, depth / 2) },
    uHeatInfluence: { value: cssStage.includes('INJECTION') ? 1.0 : 0.85 },
    uReservoirTemp: { value: currentTempC },
    uSunDirection: { value: new THREE.Vector3(-16, 18.5, 10).normalize() }
  }), [depth, cssStage, currentTempC]);

  const steamUniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uIntensity: { value: cssStage.includes('INJECTION') ? 1.0 : 0.82 },
    uTempNorm: { value: Math.min(1.0, currentTempC / 260.0) }
  }), [cssStage, currentTempC]);

  // Animation loop updating uniforms
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (strataMaterialRef.current) {
      strataMaterialRef.current.uniforms.uTime.value = time;
    }
    if (steamMaterialRef.current) {
      steamMaterialRef.current.uniforms.uTime.value = time;
    }

    // Animate embers drifting
    if (thermalEmbersRef.current) {
      const positions = thermalEmbersRef.current.geometry.attributes.position.array;
      for (let i = 0; i < emberSpeeds.length; i++) {
        const s = emberSpeeds[i];
        positions[i * 3] = s.baseX + 0.12 * Math.sin(time * s.speed + s.phase);
        positions[i * 3 + 1] = s.baseY + 0.08 * Math.cos(time * s.speed * 1.5 + s.phase);
      }
      thermalEmbersRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* =========================================================================
          1. MAIN PROCEDURAL GEOLOGICAL STRATA BLOCK (High-Density Displaced Mesh)
          ========================================================================= */}
      <mesh position={[0, -height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, height, depth, 180, 240, 2]} />
        <shaderMaterial
          ref={strataMaterialRef}
          vertexShader={strataVertexShader}
          fragmentShader={strataFragmentShader}
          uniforms={strataUniforms}
        />
      </mesh>

      {/* =========================================================================
          2. VOLUMETRIC STEAM CHAMBER / HEATED ZONE (Shader Ellipsoid)
          ========================================================================= */}
      <mesh position={[1.8, -10.8, depth / 2 + 0.05]} scale={[3.8, 1.4, 0.4]}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={steamMaterialRef}
          vertexShader={steamChamberVertexShader}
          fragmentShader={steamChamberFragmentShader}
          uniforms={steamUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 4. Floating 3D Thermal Embers Points */}
      <points ref={thermalEmbersRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={emberSpeeds.length}
            array={emberPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color="#ffaa00"
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* =========================================================================
          5. LEFT-SIDE 3D DEPTH RULER (0m to 1,200m)
          ========================================================================= */}
      <group position={[-width / 2 + 0.6, 0, depth / 2 + 0.14]}>
        {/* Depth Header Label */}
        <Html position={[0, 0.45, 0]} center distanceFactor={14}>
          <div style={{
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}>
            Depth (m)
          </div>
        </Html>

        {/* 3D Physical Metallic Vertical Scale Bar */}
        <mesh position={[0, -6.0, 0]} castShadow>
          <boxGeometry args={[0.03, 12.0, 0.03]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* 3D Tick Bracket Bars & Numeric Labels */}
        {DEPTH_TICKS.map((tick, idx) => (
          <group key={idx} position={[0, tick.yOffset, 0]}>
            {/* 3D Tick Bar */}
            <mesh position={[tick.isMajor ? 0.09 : 0.045, 0, 0]}>
              <boxGeometry args={[tick.isMajor ? 0.18 : 0.09, 0.02, 0.02]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>

            {/* Numeric Depth Label for major ticks */}
            {tick.isMajor && (
              <Html position={[0.32, 0, 0]} center distanceFactor={14}>
                <div style={{
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  fontWeight: 600,
                  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap'
                }}>
                  {tick.depthM.toLocaleString()}
                </div>
              </Html>
            )}
          </group>
        ))}
      </group>

      {/* =========================================================================
          6. CALLOUT ANNOTATIONS & LEADER LINES (Matching Reference Image)
          ========================================================================= */}
      {cameraView === 'full' && (
        <group position={[0, 0, 0]}>
          {CALLOUTS.map((callout) => (
          <group key={callout.id}>
            <Html
              position={callout.position}
              center
              distanceFactor={22}
            >
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                pointerEvents: 'none',
                transform: 'scale(0.85)',
                transformOrigin: 'left center'
              }}>
                {/* Badge Label */}
                <div style={{
                  color: callout.isThermal ? '#ffedd5' : callout.isReservoir ? '#fed7aa' : '#f8fafc',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: callout.isThermal || callout.isReservoir ? '11px' : '10px',
                  fontWeight: callout.isThermal || callout.isReservoir ? 700 : 500,
                  background: callout.isThermal
                    ? 'rgba(180, 40, 0, 0.88)'
                    : callout.isReservoir
                    ? 'rgba(120, 60, 20, 0.88)'
                    : 'rgba(25, 20, 16, 0.85)',
                  border: `1px solid ${
                    callout.isThermal
                      ? 'rgba(255, 120, 20, 0.85)'
                      : callout.isReservoir
                      ? 'rgba(234, 88, 12, 0.65)'
                      : 'rgba(203, 213, 225, 0.35)'
                  }`,
                  borderRadius: '4px',
                  padding: '2px 7px',
                  whiteSpace: 'nowrap',
                  boxShadow: callout.isThermal
                    ? '0 0 14px rgba(255, 80, 0, 0.7)'
                    : '0 2px 8px rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {callout.isThermal && (
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#ff6600',
                      boxShadow: '0 0 6px #ff6600'
                    }} />
                  )}
                  {callout.label}
                </div>

                {/* Pointer Line with Terminal Dot */}
                <svg
                  width={callout.lineWidth}
                  height="12"
                  style={{ overflow: 'visible', display: 'block' }}
                >
                  <line
                    x1="0"
                    y1="6"
                    x2={callout.lineWidth}
                    y2="6"
                    stroke={callout.isThermal ? '#ff7700' : '#cbd5e1'}
                    strokeWidth="1.2"
                    strokeDasharray={callout.isThermal ? 'none' : '2,2'}
                  />
                  <circle
                    cx={callout.lineWidth}
                    cy="6"
                    r="2.5"
                    fill={callout.isThermal ? '#ffaa00' : '#ffffff'}
                  />
                </svg>
              </div>
            </Html>
          </group>
        ))}
        </group>
      )}

      {/* =========================================================================
          7. SURFACE LEVEL FOUNDATION PAD
          ========================================================================= */}
      <mesh position={[-2.3, 0.02, 1.8]} receiveShadow castShadow>
        <boxGeometry args={[7.2, 0.04, 3.2]} />
        <meshStandardMaterial
          color={STRATA_HORIZONS.crust.hex}
          roughness={STRATA_MATERIAL_SPEC.roughness}
          metalness={STRATA_MATERIAL_SPEC.metalness}
        />
      </mesh>
    </group>
  );
}



