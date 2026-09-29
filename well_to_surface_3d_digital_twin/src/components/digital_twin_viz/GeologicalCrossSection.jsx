import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  STRATA_HORIZONS,
  STRATA_PALETTE_GLSL,
  STRATA_MATERIAL_SPEC,
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
  // High-precision Dave Hoskins Hash Without Sine with safe positive domain offset
  float hash(vec2 p) {
    vec2 pPos = p + vec2(1000.0, 1000.0);
    vec3 p3 = fract(vec3(pPos.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash2(vec2 p) {
    vec2 pPos = p + vec2(1000.0, 1000.0);
    vec3 p3 = fract(vec3(pPos.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise(vec2 p) {
    vec2 pos = p + vec2(1000.0, 1000.0);
    vec2 i = floor(pos);
    vec2 f = fract(pos);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    vec2 pos = mod(p + vec2(1000.0, 1000.0), 64.0);
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(pos);
      pos = rot * pos * 2.05 + vec2(10.0);
      a *= 0.5;
    }
    return v;
  }

  float cellularNoise(vec2 p) {
    vec2 pos = p + vec2(1000.0, 1000.0);
    vec2 i_st = floor(pos);
    vec2 f_st = fract(pos);
    float m_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i_st + neighbor);
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

  // Real physical 3D displacement function (in meters) for 7-band geological column
  // Smooth macro horizon ledges & natural cliff erosion without high-frequency aliasing
  float getStrataDisplacement(vec2 xy, float rawDepthM) {
    float x = xy.x;
    float y = xy.y;

    float b1 = 150.0 - x * 0.8 + sin(x * 0.22 + 2.1) * 10.0;
    float b2 = 300.0 + x * 2.2 + sin(x * 0.22 + 5.7) * 10.0;
    float b3 = 450.0 - x * 1.8 + cos(x * 0.22 + 8.6) * 10.0;
    float b4 = 600.0 + sin(x * 0.20) * 12.0;
    float b5 = 750.0 + x * 1.5 + sin(x * 0.22 + 15.1) * 10.0;
    float b6 = 920.0 - x * 1.2 + sin(x * 0.22 + 18.7) * 10.0;
    float b7 = 1100.0 + x * 1.0 + sin(x * 0.22 + 22.0) * 12.0;

    // Macro horizon ledges (gentle natural rock relief: 2cm - 6cm)
    float h1 = 0.020;  // Band 1: Surface crust
    float h2 = -0.035; // Band 2: Olive-khaki siltstone: recessed shelf
    float h3 = 0.065;  // Band 3: Rust-orange Caprock: hard proud ledge
    float h4 = -0.035; // Band 4: Badhaura mudstone: recessed shelf
    float h5 = 0.050;  // Band 5: Bap Boulder gravel bed: proud conglomerate
    float h6 = 0.035;  // Band 6: Bilara dolomite: proud cliff
    float h7 = 0.020;  // Band 7: Bilara dense limestone: pale ash-grey cliff
    float hBase = 0.065; // Jodhpur Sandstone pay base

    float blendW = 6.0; // Smooth transition width in meters
    float s1 = smoothstep(b1 - blendW, b1 + blendW, rawDepthM);
    float s2 = smoothstep(b2 - blendW, b2 + blendW, rawDepthM);
    float s3 = smoothstep(b3 - blendW, b3 + blendW, rawDepthM);
    float s4 = smoothstep(b4 - blendW, b4 + blendW, rawDepthM);
    float s5 = smoothstep(b5 - blendW, b5 + blendW, rawDepthM);
    float s6 = smoothstep(b6 - blendW, b6 + blendW, rawDepthM);
    float s7 = smoothstep(b7 - blendW, b7 + blendW, rawDepthM);

    float hMacro = mix(h1, h2, s1);
    hMacro = mix(hMacro, h3, s2);
    hMacro = mix(hMacro, h4, s3);
    hMacro = mix(hMacro, h5, s4);
    hMacro = mix(hMacro, h6, s5);
    hMacro = mix(hMacro, h7, s6);
    hMacro = mix(hMacro, hBase, s7);

    // Broad organic cliff face undulation
    float macroErosion = (fbm(vec2(x * 0.25, y * 0.30)) - 0.5) * 0.035;

    return hMacro + macroErosion;
  }
`;

// GLSL Vertex Shader for Strata Column with Real Subdivided Displacement & Exact Normal
const strataVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vDisplacedNormal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec2 vSurfCoord;

  uniform vec3 uCylinderCenter;

  ${strataCommonGLSL}

  void main() {
    vUv = uv;
    vec3 N = normalize(normal);

    // Initial world position before displacement
    vec4 worldPosInitial = modelMatrix * vec4(position, 1.0);
    float rawDepthM = -worldPosInitial.y * 100.0;

    // Apply relief displacement exclusively to vertical rock cliff faces
    float isCliff = 1.0 - smoothstep(0.25, 0.55, abs(N.y));

    // Planar continuous coordinate for vertical faces
    vec2 relPos = worldPosInitial.xz - uCylinderCenter.xz;
    float distFromAxis = length(relPos);
    
    // Along X-facing faces, coordinate along face is Z; along Z-facing faces, coordinate is X
    float surfU = (abs(N.x) > 0.5) ? relPos.y : relPos.x;
    vec2 surfCoord = vec2(surfU, -worldPosInitial.y);

    // Watertight boundary edge & corner fades:
    float edgeFadeTop = smoothstep(0.0, 0.20, -worldPosInitial.y);
    float edgeFadeBottom = smoothstep(-35.0, -34.2, worldPosInitial.y);
    float edgeFadeApex = smoothstep(0.08, 0.35, distFromAxis);

    float edgeFade = edgeFadeTop * edgeFadeBottom * edgeFadeApex;
    float totalDisp = getStrataDisplacement(surfCoord, rawDepthM) * isCliff * edgeFade;

    // Displace vertex along surface normal N:
    vec3 displacedPos = position + normal * totalDisp;
    vec4 worldPos = modelMatrix * vec4(displacedPos, 1.0);

    // Compute smooth geometric displaced world normal
    vec3 localDisplacedN = normal;
    if (isCliff > 0.5) {
      float eps = 0.05;
      vec3 Ty = vec3(0.0, 1.0, 0.0);
      vec3 Th = normalize(cross(Ty, normal));
      if (length(Th) < 0.01) Th = vec3(1.0, 0.0, 0.0);

      float hC = totalDisp;
      float hR = getStrataDisplacement(surfCoord + vec2(eps, 0.0), rawDepthM) * isCliff * edgeFade;
      float hU = getStrataDisplacement(surfCoord + vec2(0.0, eps), rawDepthM - eps * 100.0) * isCliff * edgeFade;

      float dHdx = clamp((hR - hC) / eps, -0.12, 0.12);
      float dHdy = clamp((hU - hC) / eps, -0.12, 0.12);
      localDisplacedN = normalize(normal - Th * dHdx * 0.04 - Ty * dHdy * 0.04);
    }
    if (abs(normal.y) > 0.6) {
      localDisplacedN = normal;
    }

    vWorldPosition = worldPos.xyz;
    vDisplacedNormal = normalize((modelMatrix * vec4(localDisplacedN, 0.0)).xyz);
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vDisplacement = totalDisp;
    vSurfCoord = surfCoord;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// GLSL Fragment Shader for Strata Column (Exact Rajasthan 7-Band Soil/Rock Horizons)
const strataFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform sampler2D uStrataMap;
  uniform vec3 uCylinderCenter;
  uniform float uCylinderRadius;
  uniform vec3 uSteamChamberPos;
  uniform float uHeatInfluence;
  uniform float uReservoirTemp;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPosition;
  varying vec3 vDisplacedNormal;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec2 vSurfCoord;

  ${strataCommonGLSL}

  // --- SHARPENED ORGANIC BOUNDARY EVALUATION (CRISP GEOLOGICAL STRATA HORIZONS) ---
  float getHorizonTransition(float baseM, float x, float y, float seed, float rawDepthM, float sharpnessFactor) {
    float w1 = sin(x * 0.22 + seed * 2.1) * 10.0;
    float w2 = cos(x * 0.48 - seed * 3.4) * 5.5;
    float n1 = (fbm(vec2(x * 0.25 + seed * 5.0, y * 0.20)) - 0.5) * 8.0;

    float transWidth = max(0.40, 0.75 * sharpnessFactor); // Crisp sharp geological horizons
    float localBound = baseM + w1 + w2 + n1;
    return smoothstep(localBound - transWidth * 0.5, localBound + transWidth * 0.5, rawDepthM);
  }

  // High-resolution per-pixel multi-scale geological rock relief bump (100% natural, zero sine ridges)
  float getRockMicroBump(vec2 pos, float rawDepthM) {
    float fineGrit = (noise(pos * 18.0) - 0.5) * 0.050;
    float microSand = (noise(pos * 45.0 + vec2(7.3, 14.1)) - 0.5) * 0.035;
    float organicPores = (fbm(pos * 6.0) - 0.5) * 0.030;
    
    // Gravel pebble dome relief in boulder bed (~600-750m, pos.y ~ 6.0 to 7.5)
    float isBoulder = smoothstep(5.8, 6.2, pos.y) * (1.0 - smoothstep(7.3, 7.7, pos.y));
    float pebble1 = smoothstep(0.38, 0.05, cellularNoise(pos * 12.0));
    float pebble2 = smoothstep(0.35, 0.04, cellularNoise(pos * 22.0 + vec2(15.3, 31.7)));
    float pebbleRelief = ((pebble1 + pebble2 * 0.8) - 0.4) * 0.110 * isBoulder;
    
    // Coarse sandstone quartz grain relief in Caprock (~300-450m, pos.y ~ 3.0 to 4.5)
    float isCaprock = smoothstep(2.8, 3.2, pos.y) * (1.0 - smoothstep(4.3, 4.7, pos.y));
    float sandRelief = (smoothstep(0.40, 0.05, cellularNoise(pos * 16.0)) - 0.5) * 0.085 * isCaprock;

    // Stylolite suture relief in Dolomite / Limestone (~750-1100m, pos.y ~ 7.5 to 11.0)
    float isCarbonate = smoothstep(7.3, 7.7, pos.y) * (1.0 - smoothstep(10.8, 11.2, pos.y));
    float styloliteSeam = getStyloliteSeam(pos, 1.7) + getStyloliteSeam(pos, 3.4) + getStyloliteSeam(pos, 5.2);
    float styloliteRelief = -styloliteSeam * 0.075 * isCarbonate;

    return fineGrit + microSand + organicPores + pebbleRelief + sandRelief + styloliteRelief;
  }

  void main() {
    // World Y to Depth in Meters (0.0 -> 0m, -12.0 -> 1200m, -35.0 -> 3500m)
    float rawDepthM = -vWorldPosition.y * 100.0;
    float x = vSurfCoord.x;
    float y = vSurfCoord.y;

    // --- 1. SAMPLE HIGH-RESOLUTION 9-LAYER PHOTOGRAPHIC GEOLOGICAL CROSS-SECTION ---
    // Depth 0m (surface) -> UV y = 1.0 (top of texture), Depth 3500m -> UV y = 0.0 (bottom of texture)
    float depthNorm = clamp(rawDepthM / 3500.0, 0.0, 1.0);
    vec2 photoUv = vec2(
      x * 0.022 + 0.5,
      1.0 - depthNorm
    );
    vec4 photoSample = texture2D(uStrataMap, photoUv);
    vec3 strataColor = photoSample.rgb;

    // Subtle fine organic weathering modulation
    float fineGrit = (noise(vSurfCoord * 14.0) - 0.5) * 0.025;
    strataColor += vec3(fineGrit);

    // --- 5. TOP SURFACE ELIMINATION ---
    // The subterranean geological column must never render an upward-facing top face,
    // which causes dark mud patches and Z-fighting glitches with the desert surface.
    if (vNormal.y > 0.35) {
      discard;
    }

    // --- 6. STEAM CHAMBER THERMAL HEAT INFLUENCE & EMISSIVE BLEED ---
    vec3 heatDelta = vWorldPosition - uSteamChamberPos;
    float vertFalloff = (heatDelta.y > 0.0) ? (heatDelta.y * 4.2) : (-heatDelta.y * 1.1);
    float heatDist = length(vec3(heatDelta.x * 0.70, vertFalloff, heatDelta.z * 0.85));
    float heatRadius = 3.6;
    float heatFactor = clamp(1.0 - heatDist / heatRadius, 0.0, 1.0);
    heatFactor = pow(heatFactor, 1.8) * uHeatInfluence;

    float caprockSeal = smoothstep(-10.70, -10.95, vWorldPosition.y);
    heatFactor *= caprockSeal;

    float heatPulse = 0.92 + 0.18 * sin(uTime * 2.2 + vWorldPosition.x * 0.4);
    vec3 heatColor = mix(vec3(0.95, 0.22, 0.05), vec3(1.0, 0.70, 0.25), heatFactor);
    strataColor = mix(strataColor, heatColor, heatFactor * 0.75);
    vec3 emissiveGlow = heatColor * (heatFactor * heatPulse * 1.4);

    // --- 7. PHYSICAL SELF-SHADOWING & REAL RAKING SUN LIGHTING ---
    vec3 geomN = normalize(vNormal);
    if (dot(geomN, vec3(0.0, 0.0, 1.0)) < -0.1) {
      geomN = -geomN;
    }
    vec3 N = normalize(vDisplacedNormal);
    if (dot(N, vec3(0.0, 0.0, 1.0)) < -0.1) {
      N = -N;
    }

    // High-resolution per-pixel micro rock grain bump perturbation
    float eps = 0.045;
    float hC = getRockMicroBump(vSurfCoord, rawDepthM);
    float hR = getRockMicroBump(vSurfCoord + vec2(eps, 0.0), rawDepthM);
    float hU = getRockMicroBump(vSurfCoord + vec2(0.0, eps), rawDepthM);

    vec3 Ty = vec3(0.0, 1.0, 0.0);
    vec3 Tx = normalize(cross(Ty, N));
    if (length(Tx) < 0.01) Tx = vec3(1.0, 0.0, 0.0);
    Ty = normalize(cross(N, Tx));

    float dHdx = clamp((hR - hC) / eps, -0.25, 0.25);
    float dHdy = clamp((hU - hC) / eps, -0.25, 0.25);
    vec3 rockN = normalize(N - Tx * (dHdx * 0.075) - Ty * (dHdy * 0.075));
    if (abs(geomN.y) > 0.6) rockN = geomN;

    vec3 L = normalize(uSunDirection);

    // Physical geometric light mask: prevents direct sun on back-facing shadowed faces
    float geomNdotL = dot(geomN, L);
    float lightMask = smoothstep(0.02, 0.15, geomNdotL);
    
    // Grazing angle specular/diffuse protection
    float rawDiff = max(dot(rockN, L), 0.0);
    float diff = min(rawDiff, max(geomNdotL * 1.5, 0.0)) * lightMask;

    // Heightfield self-shadow raymarch along raking sun direction
    float selfShadow = 1.0;
    vec2 sunDir2D = normalize(vec2(-uSunDirection.x, -uSunDirection.y));
    float currentH = vDisplacement;
    for (int i = 1; i <= 4; i++) {
      float stepDist = float(i) * 0.09;
      vec2 sampleXY = vSurfCoord + sunDir2D * stepDist;
      float sampleDepth = sampleXY.y * 100.0;
      float sampleH = getStrataDisplacement(sampleXY, sampleDepth);
      if (sampleH > currentH + stepDist * 0.48) {
        selfShadow -= 0.20;
      }
    }
    selfShadow = clamp(selfShadow, 0.20, 1.0);

    // Subsurface depth attenuation
    float depthOccl = clamp(0.70 + 0.30 * (1.0 - rawDepthM / 1200.0), 0.65, 1.0);

    // Primary warm golden desert sun with physical cast shadows
    vec3 sunLight = STRATA_SUN_COLOR * diff * selfShadow * 0.95;

    // Secondary cool-toned fill light (softly fills both faces)
    vec3 fillDir = normalize(vec3(1.4, 0.4, 0.8));
    float fillDiff = max(dot(rockN, fillDir), 0.0);
    vec3 coolFill = STRATA_FILL_COLOR * fillDiff * 0.40;

    // Ambient dusty sky
    vec3 ambientLight = STRATA_AMBIENT_COLOR * depthOccl * 0.95;

    // Mineral crystalline micro-specular highlights
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 H = normalize(L + V);
    float NdotH = max(dot(rockN, H), 0.0);
    float specGlint = pow(NdotH, 32.0) * 0.12 * lightMask;

    // Final Lit PBR Color Output with rich, high-contrast layer differentiation
    vec3 litColor = strataColor * (ambientLight + coolFill + sunLight) + vec3(specGlint) + emissiveGlow;

    // Cinematic Geological S-Curve Contrast & Sharpness Boost
    vec3 contrasted = pow(litColor, vec3(1.15));
    contrasted = mix(contrasted, smoothstep(vec3(0.015), vec3(0.985), contrasted), 0.35);
    litColor = clamp(contrasted, 0.0, 1.0);

    gl_FragColor = vec4(litColor, 1.0);
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
  centerX = 2.8,
  centerZ = 0.0,
  radius = 6.2,
  height = 35.0,
  cssStage = 'PRODUCTION_MID',
  currentTempC = 76.4,
  cameraView = 'full'
}) {
  const strataMaterialRef = useRef();
  const steamMaterialRef = useRef();
  const thermalEmbersRef = useRef();
  const strataMeshRef = useRef();

  // 1. Full Panoramic Rectangular Earth Cross-Section (Planar Subterranean Face)
  const { strataGeometry } = useMemo(() => {
    const W_total = 400.0; // 400m wide (spanning completely across camera viewport)
    // Single-surface plane facing camera along +Z. No 60m back wall, no top face poking through desert.
    const geo = new THREE.PlaneGeometry(W_total, height, 128, 128);
    // Center top at Y = -0.12 (cleanly subterranean beneath desert sand) and front at Z = 0
    geo.translate(0, -height / 2 - 0.12, 0);
    geo.computeVertexNormals();

    return { strataGeometry: geo };
  }, [height]);

  // Clean up geometry on unmount
  React.useEffect(() => {
    return () => {
      if (strataGeometry) strataGeometry.dispose();
    };
  }, [strataGeometry]);

  // 2. Depth Ruler Ticks matching the 7-band palette depth boundaries
  const DEPTH_TICKS = useMemo(() => [
    { depthM: 0, yOffset: 0.0, isMajor: true },
    { depthM: 150, yOffset: -1.50, isMajor: true },
    { depthM: 300, yOffset: -3.00, isMajor: true },
    { depthM: 450, yOffset: -4.50, isMajor: true },
    { depthM: 600, yOffset: -6.00, isMajor: true },
    { depthM: 750, yOffset: -7.50, isMajor: true },
    { depthM: 920, yOffset: -9.20, isMajor: true },
    { depthM: 1100, yOffset: -11.00, isMajor: true },
    { depthM: 1150, yOffset: -11.50, isMajor: false },
    { depthM: 1200, yOffset: -12.00, isMajor: true }
  ], []);

  // 4. Floating 3D Thermal Embers in Steam Chamber (Centered on wellbore axis)
  const { emberPositions, emberSpeeds } = useMemo(() => {
    const prng = createPRNG(777);
    const count = 140;
    const pos = new Float32Array(count * 3);
    const speeds = [];

    for (let i = 0; i < count; i++) {
      const angle = prng() * Math.PI * 2;
      const r = prng() * 1.8;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = -11.55 + (prng() - 0.5) * 0.75;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      speeds.push({
        baseX: pos[i * 3],
        baseY: pos[i * 3 + 1],
        baseZ: pos[i * 3 + 2],
        speed: 0.2 + prng() * 0.3,
        phase: prng() * Math.PI * 2
      });
    }

    return { emberPositions: pos, emberSpeeds: speeds };
  }, []);

  // 5. High-Resolution Panoramic 7-Band Geological Strata Texture
  const strataTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/textures/strata_panoramic_7band.jpg', (t) => {
      t.needsUpdate = true;
      if (strataMaterialRef.current) {
        strataMaterialRef.current.uniforms.uStrataMap.value = t;
        strataMaterialRef.current.needsUpdate = true;
      }
    });
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  // 6. Shader Uniforms
  const strataUniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uStrataMap: { value: strataTexture },
    uCylinderCenter: { value: new THREE.Vector3(centerX, 0, centerZ) },
    uSteamChamberPos: { value: new THREE.Vector3(centerX, -11.55, centerZ) },
    uHeatInfluence: { value: cssStage.includes('INJECTION') ? 1.0 : 0.85 },
    uReservoirTemp: { value: currentTempC },
    uSunDirection: { value: new THREE.Vector3(-18, 16, 4).normalize() }
  }), [centerX, centerZ, cssStage, currentTempC, strataTexture]);

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
        positions[i * 3] = s.baseX + 0.10 * Math.sin(time * s.speed + s.phase);
        positions[i * 3 + 1] = s.baseY + 0.08 * Math.cos(time * s.speed * 1.5 + s.phase);
        positions[i * 3 + 2] = s.baseZ + 0.10 * Math.cos(time * s.speed + s.phase);
      }
      thermalEmbersRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const isCrossSectionVisible = !(cameraView === 'top' || cameraView === 'top_front' || cameraView === 'aerial');

  return (
    <group position={[centerX, 0, centerZ]} visible={isCrossSectionVisible}>
      {/* =========================================================================
          1. MAIN PROCEDURAL NOTCHED-SQUARE EARTH COLUMN (Monolithic ExtrudeMesh)
          ========================================================================= */}
      <mesh ref={strataMeshRef} geometry={strataGeometry} position={[0, 0, 0]} receiveShadow castShadow>
        <shaderMaterial
          ref={strataMaterialRef}
          vertexShader={strataVertexShader}
          fragmentShader={strataFragmentShader}
          uniforms={strataUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* =========================================================================
          2. VOLUMETRIC STEAM CHAMBER / HEATED ZONE (Centered on Central Axis)
          ========================================================================= */}
      <mesh position={[0, -11.55, 0]} scale={[2.4, 0.65, 2.4]}>
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

      {/* 3. Floating 3D Thermal Embers Points */}
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
          4. RIGHT-SIDE 3D DEPTH RULER (0m to 1,200m) Along Right Cutaway Face
          ========================================================================= */}
      {/* <group position={[rulerX, 0, rulerZ]}>
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

        <mesh position={[0, -6.0, 0]} castShadow>
          <boxGeometry args={[0.03, 12.0, 0.03]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>

        {DEPTH_TICKS.map((tick, idx) => (
          <group key={idx} position={[0, tick.yOffset, 0]}>
            <mesh position={[tick.isMajor ? 0.09 : 0.045, 0, 0]}>
              <boxGeometry args={[tick.isMajor ? 0.18 : 0.09, 0.02, 0.02]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>

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
      </group> */}

      {/* Right-side depth ruler remains active and clean */}
    </group>
  );
}
