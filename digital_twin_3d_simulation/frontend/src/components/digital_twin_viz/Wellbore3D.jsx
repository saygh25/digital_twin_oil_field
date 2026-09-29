import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { computeFourBarKinematics, PUMPJACK_GEOMETRY } from './pumpjackKinematics';
import { PIPE_COLORS, PIPE_PBR } from './pipeMaterialSpec';

/**
 * Procedural Modular Completion String — Heavy Industrial Machine Architecture
 * 
 * CORE GREEBLE & SILHOUETTE ENHANCEMENTS:
 * 1. BULKED UP SILHOUETTE (HEAVY VERTEBRAE):
 *    - 6 outer armor shroud sleeves overlapping joints by 25-30% of length with heavy longitudinal ribs.
 *    - Aggressive diameter variations: bulged sensor sub (R=0.480), bulged pump barrel (R=0.465),
 *      bulged flanges (R=0.550-0.560), and heavy pay shoe (R=0.495).
 * 
 * 2. GREEBLE SECONDARY COMPONENTS:
 *    - 4 Industrial Valve Handwheels: spoked wheels on mounting stems at landmark manifolds.
 *    - 3 Continuous Parallel Conduit Runs: hydraulic control, electrical TEC, and chemical tracer lines.
 *    - 16 Instanced Bracket Clamps: heavy C-clamps anchoring conduits to the pipe body.
 *    - 2 Cast Industrial Junction Boxes: telemetry termination enclosures with beveled lids & gland entries.
 *    - 134 Stacked Dual-Row Flange Bolts: instanced dual concentric bolt rings on major flanges.
 * 
 * 3. WARNING / ID HAZARD BANDS:
 *    - Procedural 45° alternating OSHA Safety Yellow & Midnight Charcoal diagonal chevron hazard bands
 *      on the pump housing and pay zone guide shoe.
 * 
 * 4. SEAMLESS DUAL-MODE SHARING & PERFORMANCE:
 *    - All greebles share the aged steel / X-Ray shader via InstancedMesh for zero frame-rate drop (60 FPS).
 *    - Continuous glowing amber liquid oil column remains 100% visible inside the string in X-Ray view.
 */

// =========================================================================
// GLSL CHUNKS FOR AGED-STEEL PBR MATERIAL VIA ONBEFORECOMPILE
// =========================================================================
function configureAgedSteelShader(shader) {
  shader.uniforms.uXRayBlend = { value: 0.0 };
  shader.uniforms.uDepthWear = { value: 0.0 };
  shader.uniforms.uCutout = { value: 0.0 };
  shader.uniforms.uHolesX = { value: 4.0 };
  shader.uniforms.uRadius = { value: 0.403 };
  shader.uniforms.uHeight = { value: 0.44 };
  shader.uniforms.uHoleRadiusWorld = { value: 0.040 };
  shader.uniforms.uIsThread = { value: 0.0 };
  shader.uniforms.uIsKnurled = { value: 0.0 };
  shader.uniforms.uIsBolt = { value: 0.0 };
  shader.uniforms.uIsWeld = { value: 0.0 };
  shader.uniforms.uIsChamfer = { value: 0.0 };
  shader.uniforms.uIsHazard = { value: 0.0 };
  shader.uniforms.uIsHardware = { value: 0.0 };
  shader.uniforms.uFresnelColor = { value: new THREE.Color('#4f7296') };

  // 1. Vertex Shader: capture world position, custom UV, world normal, and view direction
  shader.vertexShader = `
    varying vec3 vCustomWorldPos;
    varying vec2 vCustomUv;
    varying vec3 vCustomNormal;
    varying vec3 vCustomViewDir;
    ${shader.vertexShader}
  `.replace(
    '#include <worldpos_vertex>',
    `
    #include <worldpos_vertex>
    vCustomWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vCustomUv = uv;
    vCustomNormal = normalize(mat3(modelMatrix) * normal);
    vCustomViewDir = normalize(cameraPosition - vCustomWorldPos);
    `
  );

  // 2. Fragment Shader: Procedural noise, rust streaks, mineral scale, Fresnel glow, and hazard chevrons
  shader.fragmentShader = `
    uniform float uXRayBlend;
    uniform float uCutout;
    uniform float uHolesX;
    uniform float uRadius;
    uniform float uHeight;
    uniform float uHoleRadiusWorld;
    uniform float uIsThread;
    uniform float uIsKnurled;
    uniform float uIsBolt;
    uniform float uIsWeld;
    uniform float uIsChamfer;
    uniform float uIsHazard;
    uniform float uIsHardware;
    uniform vec3 uFresnelColor;
    varying vec3 vCustomWorldPos;
    varying vec2 vCustomUv;
    varying vec3 vCustomNormal;
    varying vec3 vCustomViewDir;

    float hash2D(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise2D(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash2D(i + vec2(0.0, 0.0)), hash2D(i + vec2(1.0, 0.0)), u.x),
        mix(hash2D(i + vec2(0.0, 1.0)), hash2D(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm2D(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 3; ++i) {
        v += a * noise2D(p);
        p = p * 2.1 + vec2(12.0);
        a *= 0.5;
      }
      return v;
    }
    ${shader.fragmentShader}
  `;

  // Inject single-ring hole cutout mask at the start of fragment main
  shader.fragmentShader = shader.fragmentShader.replace(
    'void main() {',
    `
    void main() {
      vec2 holeLocal = vec2(0.0);
      if (uCutout > 0.5) {
        float C = 6.2831853 * uRadius;
        float cellW = C / uHolesX;
        float dx = (fract(vCustomUv.x * uHolesX) - 0.5) * cellW;
        float dy = (vCustomUv.y - 0.5) * uHeight;
        float distWorld = length(vec2(dx, dy));
        holeLocal = vec2(dx / cellW, dy / uHeight);
        if (distWorld < uHoleRadiusWorld) {
          discard; // Clean single ring of circular holes
        }
      }
    `
  );

  // Inject procedural roughness variation into PBR pipeline
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `
    #include <roughnessmap_fragment>
    // Procedural roughness variation (brushed metallic steel in solid mode, high-gloss shiny glass in X-Ray)
    float roughNoise = fbm2D(vCustomWorldPos.xy * 8.0);
    roughnessFactor = mix(0.34 + roughNoise * 0.14, 0.012, uXRayBlend);
    if (uIsKnurled > 0.5) {
      float knurl = sin((vCustomUv.x * 64.0 + vCustomUv.y * 36.0) * 6.2831) * 
                    sin((vCustomUv.x * 64.0 - vCustomUv.y * 36.0) * 6.2831);
      roughnessFactor = mix(clamp(roughnessFactor + knurl * 0.28, 0.25, 0.85), 0.03, uXRayBlend);
    }
    if (uIsBolt > 0.5) {
      roughnessFactor = mix(0.26, 0.12, uXRayBlend);
    }
    if (uIsChamfer > 0.5) {
      roughnessFactor = mix(0.20, 0.01, uXRayBlend);
    }
    if (uIsWeld > 0.5) {
      roughnessFactor = mix(0.48, 0.02, uXRayBlend);
    }
    if (uIsHazard > 0.5) {
      roughnessFactor = mix(0.42, 0.03, uXRayBlend);
    }
    `
  );

  // Inject specular metalness variation (dielectric high-gloss glass 0.22 in X-Ray for crisp shine)
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <metalnessmap_fragment>',
    `
    #include <metalnessmap_fragment>
    metalnessFactor = mix(0.92, 0.22, uXRayBlend);
    if (uIsBolt > 0.5) {
      metalnessFactor = mix(0.95, 0.85, uXRayBlend);
    }
    if (uIsChamfer > 0.5) {
      metalnessFactor = mix(0.96, 0.25, uXRayBlend);
    }
    if (uIsHazard > 0.5) {
      metalnessFactor = mix(0.65, 0.12, uXRayBlend);
    }
    `
  );

  // Inject rust streaks, mineral scale, hazard chevrons, and wear into diffuseColor
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>

    // Depth-based thermal wear gradient (0m to 1200m -> y = 0 to -12)
    float depthWear = clamp((-vCustomWorldPos.y) / 12.0, 0.0, 1.0);

    // A. Directional rust streaks running DOWNWARD from hole bottom rim
    float rustStreaks = 0.0;
    if (uCutout > 0.5) {
      float C = 6.2831853 * uRadius;
      float cellW = C / uHolesX;
      float dx = (fract(vCustomUv.x * uHolesX) - 0.5) * cellW;
      float dy = (vCustomUv.y - 0.5) * uHeight;
      float dripY = -dy;
      float dripX = abs(dx);
      if (dripY > 0.0 && dripX < uHoleRadiusWorld * 1.35) {
        float falloff = smoothstep(uHoleRadiusWorld * 1.35, 0.0, dripX) * 
                        (1.0 - smoothstep(0.0, uHeight * 0.45, dripY));
        float streakNoise = noise2D(vec2(vCustomUv.x * 24.0, vCustomUv.y * 10.0));
        rustStreaks = clamp(falloff * (0.6 + streakNoise * 0.4), 0.0, 1.0);
      }
    }

    // B. Rust accumulation at joints & seams (top/bottom edges of modules)
    float seamDist = min(vCustomUv.y, 1.0 - vCustomUv.y);
    float jointRust = smoothstep(0.12, 0.0, seamDist);
    float rustNoise = fbm2D(vCustomWorldPos.xy * 6.5);

    // Fine brushed steel horizontal grain (matching reference steel image)
    float brushNoise1 = noise2D(vec2(vCustomWorldPos.x * 80.0, vCustomWorldPos.y * 3.5));
    float brushNoise2 = noise2D(vec2(vCustomUv.x * 120.0, vCustomUv.y * 5.0));
    float brushedGrain = (brushNoise1 * 0.6 + brushNoise2 * 0.4 - 0.5) * 0.048;

    float rustMask = clamp(rustStreaks * 1.35 + jointRust * 0.75 + (rustNoise - 0.48) * 0.75, 0.0, 1.0);
    rustMask = clamp(rustMask * (0.65 + depthWear * 0.75), 0.0, 1.0);

    // Rust accent: authentic iron oxide rust (#8A3E1B to #B45A28)
    vec3 rustDark = vec3(0.541, 0.243, 0.106);  // #8A3E1B
    vec3 rustLight = vec3(0.706, 0.353, 0.157); // #B45A28
    vec3 rustColor = mix(rustLight, rustDark, clamp(depthWear * 0.45 + rustNoise * 0.55, 0.0, 1.0));

    // Brushed Metallic Steel Base (authentic metallic steel silver-grey palette)
    vec3 baseDark  = vec3(0.44, 0.48, 0.54);  // #707A8A (structural/shadow forged steel)
    vec3 baseMid   = vec3(0.66, 0.70, 0.76);  // #A8B3C2 (core brushed silver metallic steel)
    vec3 baseLight = vec3(0.85, 0.89, 0.94);  // #D9E3F0 (machined steel highlight)
    float surfaceVar = fbm2D(vCustomWorldPos.xy * 3.5);
    vec3 steelBase = mix(baseDark, baseMid, clamp(surfaceVar * 0.8 + 0.15, 0.0, 1.0));
    steelBase += vec3(brushedGrain); // Horizontal anisotropic brushed grain
    diffuseColor.rgb = mix(steelBase, baseDark, depthWear * 0.20);

    // Apply realistic rust patches at seams, hole rims, and joints
    diffuseColor.rgb = mix(diffuseColor.rgb, rustColor, rustMask * 0.82 * (1.0 - uXRayBlend));

    // =========================================================================
    // SCIENTIFIC & TECHNICAL CRYSTALLINE GLASS OPTICS FOR X-RAY MODE (SHINY GLASS)
    // High-gloss specular reflections + brilliant Fresnel cyan/white glass rim
    // =========================================================================
    float NdotV = clamp(dot(vCustomViewDir, normalize(vCustomNormal)), 0.0, 1.0);
    float fresnel = pow(clamp(1.0 - NdotV, 0.0, 1.0), 2.0);
    float fresnelSharp = pow(clamp(1.0 - NdotV, 0.0, 1.0), 4.2);

    // Pristine crystal-clear technical glass palette
    vec3 glassClearCore = vec3(0.08, 0.18, 0.28); // Subtle clear-tinted glass body
    vec3 glassCyanRim   = vec3(0.42, 0.84, 1.00); // Luminous electric cyan glass edge
    vec3 glassGlintPeak = vec3(0.98, 1.00, 1.00); // Brilliant specular white-cyan glint

    // Directional specular glints for ultra-shiny high-gloss glass sheen:
    vec3 glassKeyLight1 = normalize(vec3(0.5, 0.8, 0.6));
    vec3 halfVec1 = normalize(glassKeyLight1 + vCustomViewDir);
    float NdotH1 = clamp(dot(normalize(vCustomNormal), halfVec1), 0.0, 1.0);
    float shinyGlint1 = pow(NdotH1, 36.0) * 1.35;
    float shinySheen1 = pow(NdotH1, 10.0) * 0.50;

    vec3 glassKeyLight2 = normalize(vec3(-0.4, 0.6, 0.7));
    vec3 halfVec2 = normalize(glassKeyLight2 + vCustomViewDir);
    float NdotH2 = clamp(dot(normalize(vCustomNormal), halfVec2), 0.0, 1.0);
    float shinyGlint2 = pow(NdotH2, 28.0) * 0.85;

    vec3 shinySpec = glassGlintPeak * (shinyGlint1 + shinyGlint2) + glassCyanRim * shinySheen1;

    // Glass color: clear facing center, ramping to luminous cyan rim and brilliant specular reflections
    vec3 xRayGlassColor = mix(glassClearCore, glassCyanRim, pow(fresnel, 1.3)) + glassGlintPeak * (fresnelSharp * 0.85);
    xRayGlassColor += shinySpec;

    // Glass transparency: clear center (0.12), smoothly ramping to luminous rim and opaque shiny glint
    float glassAlpha = clamp(0.12 + pow(fresnel, 1.6) * 0.70 + (shinyGlint1 + shinyGlint2) * 0.45, 0.0, 0.92);

    // Fine thread highlight pattern (translucent micro-ribs in glass)
    if (uIsThread > 0.5) {
      float threadPattern = sin(vCustomUv.y * 110.0);
      vec3 solidThread = diffuseColor.rgb + vec3(threadPattern * 0.05);
      vec3 xRayThread  = mix(glassCyanRim * 0.65, glassGlintPeak, threadPattern * 0.5 + 0.5) + glassGlintPeak * (fresnel * 0.55);
      diffuseColor.rgb = mix(solidThread, xRayThread, uXRayBlend);
      diffuseColor.a   = mix(1.0, clamp(0.12 + threadPattern * 0.08 + fresnel * 0.58, 0.0, 0.82), uXRayBlend);
    }

    // Knurled grip pattern (translucent cut-glass diamond mesh in X-ray)
    if (uIsKnurled > 0.5) {
      float knurlPattern = sin((vCustomUv.x * 64.0 + vCustomUv.y * 36.0) * 6.2831) * 
                           sin((vCustomUv.x * 64.0 - vCustomUv.y * 36.0) * 6.2831);
      vec3 solidKnurl = diffuseColor.rgb + vec3(knurlPattern * 0.05);
      vec3 xRayKnurl  = mix(glassClearCore, glassCyanRim * 1.15, knurlPattern * 0.4 + 0.5);
      diffuseColor.rgb = mix(solidKnurl, xRayKnurl, uXRayBlend);
      diffuseColor.a   = mix(1.0, clamp(0.14 + knurlPattern * 0.08 + fresnel * 0.55, 0.0, 0.82), uXRayBlend);
    }

    // Hex bolt hardware: galvanized steel studs with golden brass nut sheen visible through glass
    if (uIsBolt > 0.5) {
      vec3 solidBolt = mix(diffuseColor.rgb, vec3(0.584, 0.631, 0.682), 0.75);
      vec3 xRayBolt  = mix(vec3(0.24, 0.30, 0.38), vec3(0.92, 0.76, 0.28), 0.55) + vec3(0.40, 0.55, 0.70) * fresnel;
      diffuseColor.rgb = mix(solidBolt, xRayBolt, uXRayBlend);
      diffuseColor.a   = mix(1.0, clamp(0.75 + fresnel * 0.20, 0.0, 0.95), uXRayBlend);
    }

    // Raised weld-seam bead: fused glass seam with subtle refraction
    if (uIsWeld > 0.5) {
      vec3 heatTint   = vec3(0.408, 0.451, 0.502) + vec3(0.06, 0.03, 0.01) * sin(vCustomWorldPos.y * 55.0);
      vec3 solidWeld  = mix(diffuseColor.rgb, heatTint, 0.70);
      vec3 xRayWeld   = mix(glassClearCore, glassCyanRim * 1.1, 0.5) + glassGlintPeak * (fresnel * 0.4);
      diffuseColor.rgb = mix(solidWeld, xRayWeld, uXRayBlend);
      diffuseColor.a   = mix(1.0, clamp(0.16 + fresnel * 0.52, 0.0, 0.80), uXRayBlend);
    }

    // Machined chamfer edge: bright glass bevel prism glint
    if (uIsChamfer > 0.5) {
      vec3 solidChamfer = mix(diffuseColor.rgb, vec3(0.761, 0.804, 0.847), 0.75);
      vec3 xRayChamfer  = mix(glassCyanRim, glassGlintPeak, 0.65) * (0.85 + fresnel * 0.9);
      diffuseColor.rgb  = mix(solidChamfer, xRayChamfer, uXRayBlend);
      diffuseColor.a    = mix(1.0, clamp(0.20 + fresnel * 0.65, 0.0, 0.88), uXRayBlend);
    }

    // Industrial Warning / ID Hazard Bands: OSHA yellow & midnight charcoal chevrons visible through glass
    if (uIsHazard > 0.5) {
      float chevronCoord = vCustomUv.x * 14.0 + vCustomUv.y * 24.0;
      float chevronPattern = step(0.5, fract(chevronCoord));

      vec3 hazardLight = vec3(0.918, 0.702, 0.031); // OSHA Yellow (#EAB308)
      vec3 hazardDark  = vec3(0.200, 0.255, 0.333); // Slate Charcoal (#334155)
      vec3 stripeColor = mix(hazardDark, hazardLight, chevronPattern);

      float grime = fbm2D(vCustomWorldPos.xy * 12.0);
      stripeColor = mix(stripeColor, vec3(0.35, 0.28, 0.20), grime * 0.35);

      vec3 xRayHazard   = mix(vec3(0.12, 0.22, 0.32), vec3(0.55, 0.70, 0.85), chevronPattern) + glassCyanRim * (fresnel * 0.5);
      diffuseColor.rgb  = mix(stripeColor, xRayHazard, uXRayBlend);
      diffuseColor.a    = mix(1.0, clamp(0.22 + fresnel * 0.45, 0.0, 0.85), uXRayBlend);
    }

    // Exterior Heavy Hardware: Conduits, Brackets, Junction Boxes, Shroud Sleeves, Valve Handwheels
    if (uIsHardware > 0.5) {
      vec3 xRayHdw = mix(glassClearCore, vec3(0.35, 0.65, 0.88), 0.45) + glassCyanRim * (fresnel * 0.8);
      diffuseColor.rgb = mix(diffuseColor.rgb, xRayHdw, uXRayBlend);
      diffuseColor.a   = mix(1.0, clamp(0.18 + fresnel * 0.55, 0.0, 0.85), uXRayBlend);
    }

    // Standard Outer Tubing / Completion Pipe Housing (translucent crystalline glass to reveal interior)
    if (uIsHazard < 0.5 && uIsBolt < 0.5 && uIsHardware < 0.5 && uIsChamfer < 0.5 && uIsWeld < 0.5 && uIsThread < 0.5 && uIsKnurled < 0.5) {
      diffuseColor.rgb = mix(diffuseColor.rgb, xRayGlassColor, uXRayBlend);
      diffuseColor.a   = mix(1.0, glassAlpha, uXRayBlend);
    }
    `
  );
}

// =========================================================================
// GLSL SHADER: Continuous Upward Translucent Amber-Brown Oil Flow Column
// Features dynamic plunger base tracking, subtle ripples, and 0.16-0.24 opacity
// =========================================================================
const oilFlowVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vWorldY;

  uniform float uScrollOffset;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Subtle rising meniscus ripple displacement along Y
    float wave = sin(uv.y * 28.0 - uScrollOffset * 1.1) * 0.005;
    wave += sin(uv.x * 12.0 + uv.y * 14.0 - uScrollOffset * 0.7) * 0.003;
    pos.x += normal.x * wave;
    pos.z += normal.z * wave;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldY = worldPos.y;

    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;

    // Normal perturbation: vertical sine wave meniscus creates reflective liquid ripples
    vec3 n = normal;
    n.y += cos(uv.y * 28.0 - uScrollOffset * 1.1) * 0.25;
    n.x += cos(uv.x * 8.0) * 0.10;
    n.z += sin(uv.x * 8.0) * 0.10;
    vNormal = normalize(normalMatrix * n);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const oilFlowFragmentShader = `
  precision highp float;

  uniform float uScrollOffset;
  uniform float uXRayBlend;
  uniform float uViscNorm;
  uniform float uPlungerY;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vWorldY;

  void main() {
    // Only render when X-Ray blend is active
    if (uXRayBlend < 0.02) {
      discard;
    }

    // Dynamic fluid column origin: fluid originates at the top of the reciprocating plunger!
    if (vWorldY < uPlungerY) {
      discard;
    }

    // Wrapped scrolling coordinate: 100% immune to float precision loss!
    float scrollY = vUv.y * 30.0 - uScrollOffset;
    
    // Repeating amber/brown bands with organic sin harmonics
    float wave1 = sin(scrollY * 3.14159);
    float wave2 = sin(scrollY * 6.28318 + vUv.x * 12.0) * 0.30;
    float wave3 = cos(scrollY * 1.57079 - vUv.x * 6.0) * 0.20;
    float bands = (wave1 + wave2 + wave3) * 0.5 + 0.5;
    bands = clamp(bands, 0.0, 1.0);

    // Muted, realistic crude oil color spectrum (desaturated amber-brown, NOT neon yellow!)
    vec3 crudeDark   = vec3(0.18, 0.11, 0.05); // Deep asphaltic heavy crude base
    vec3 crudeAmber  = vec3(0.48, 0.28, 0.11); // Warm viscous muted amber
    vec3 sheenGlint  = vec3(0.64, 0.46, 0.24); // Soft metallic glint on fluid waves
    vec3 emissivePeak= vec3(0.78, 0.62, 0.35); // Subtle wet ripple glint

    vec3 baseOil = mix(crudeDark, crudeAmber, bands * 0.75);

    // Wet surface specular reflection in view space
    vec3 viewDir = normalize(vViewPosition);
    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.6, 0.8, 0.5));
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = clamp(dot(norm, halfVec), 0.0, 1.0);
    float specSharp = pow(NdotH, 24.0);

    // Fresnel rim reflection on wet liquid surface
    float NdotV = clamp(dot(viewDir, norm), 0.0, 1.0);
    float fresnel = pow(clamp(1.0 - NdotV, 0.0, 1.0), 2.2);

    // Combine wet surface sheen and muted liquid crude color
    vec3 fluidColor = baseOil;
    fluidColor += sheenGlint * (specSharp * 0.35 + fresnel * 0.25);
    fluidColor += emissivePeak * (pow(clamp(bands, 0.0, 1.0), 2.2) * 0.15);

    // High transparency (0.16 - 0.24 opacity): thin colored haze so pump internals remain razor-sharp!
    float alpha = mix(0.16, 0.24, bands * 0.5 + fresnel * 0.5) * uXRayBlend;

    // Smooth emergence right at the plunger head
    float emergence = smoothstep(uPlungerY, uPlungerY + 0.14, vWorldY);
    alpha *= emergence;

    gl_FragColor = vec4(fluidColor, clamp(alpha, 0.0, 0.28));
  }
`;

// =========================================================================
// GLSL SHADER: Continuous Downward Steam Injection Flow
// =========================================================================
const steamFlowVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const steamFlowFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uSteamSpeed;
  uniform float uActive;
  uniform float uXRayBlend;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    float effectiveActive = uActive * uXRayBlend;
    if (effectiveActive < 0.01) {
      discard;
    }

    float scrollY = vUv.y * 22.0 + uTime * uSteamSpeed;
    float scrollX = vUv.x * 10.0 + sin(uTime * 2.5 + vUv.y * 8.0) * 0.5;

    float vaporNoise = sin(scrollY * 2.5 + scrollX * 1.5) * 0.5 + 0.5;
    float vaporWaves = pow(vaporNoise, 1.4);

    vec3 colWhiteSteam = vec3(0.95, 0.98, 1.0);
    vec3 colCyanSteam  = vec3(0.25, 0.78, 1.0);

    vec3 viewDir = normalize(vViewPosition);
    vec3 norm = normalize(vNormal);
    float NdotV = clamp(dot(viewDir, norm), 0.0, 1.0);
    float fresnel = pow(clamp(1.0 - NdotV, 0.0, 1.0), 2.0);

    vec3 steamCol = mix(colCyanSteam, colWhiteSteam, vaporWaves * 0.8);
    steamCol += vec3(0.4, 0.85, 1.0) * (fresnel * 1.5);

    float alpha = (0.28 + vaporWaves * 0.42 + fresnel * 0.3) * effectiveActive;
    alpha = clamp(alpha, 0.0, 0.85);

    gl_FragColor = vec4(steamCol, alpha);
  }
`;

function createPRNG(seed = 112233) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Procedural High-Definition Brushed Stainless Steel Canvas Texture
 * Calibrated specifically to match the user's reference image:
 * Radiant silver tones (#cbd5e1 to #ffffff) with horizontal micro-grain hairline scratches.
 */
function createBrushedSteelCanvasTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Base Stainless Steel Silver Gradient matching user's reference image
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.00, '#a6b1bd'); // Lateral shadow
  grad.addColorStop(0.18, '#d4dce5'); // Smooth brushed body
  grad.addColorStop(0.46, '#ffffff'); // Mirror-sheen highlight core
  grad.addColorStop(0.54, '#f8fafc'); // Radiant specular band
  grad.addColorStop(0.82, '#cad4de'); // Satin body
  grad.addColorStop(1.00, '#a6b1bd'); // Lateral shadow
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // 2. 1600 Horizontal Micro-Brushed Hairline Streaks (Lathe & Belt-Sanded Grain)
  for (let i = 0; i < 1600; i++) {
    const y = Math.random() * 512;
    const isBright = Math.random() > 0.42;
    const alpha = isBright ? 0.08 + Math.random() * 0.26 : 0.04 + Math.random() * 0.12;
    ctx.strokeStyle = isBright
      ? `rgba(255, 255, 255, ${alpha.toFixed(3)})`
      : `rgba(90, 100, 115, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 0.5 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Blueprint-Accurate Completion String Component
 */
export default function Wellbore3D({
  spm = 4.2,
  strokeLengthM = 1.83,
  viscosityCp = 1850,
  rodFloatingRiskPct = 18.0,
  pprlKn = 64.2,
  mprlKn = 18.5,
  oilRateBopd = 207,
  steamRateBpd = 0,
  pumpFillagePct = 84.0,
  cssStage = 'PRODUCTION_MID',
  currentTempC = 76.4,
  pipeViewMode = 'solid', // 'solid' | 'xray'
  isOperating = true,
  isRodFloating = false,
  rodLagFactor = 0.0,
  onSelectComponent,
  selectedComponent,
  cameraView = 'full'
}) {
  const rodStringGroupRef = useRef();
  const plungerRef = useRef();
  const travelingValveBallRef = useRef();
  const standingValveBallRef = useRef();
  const ingressParticlesRef = useRef();
  const risingCapsulesRef = useRef();
  const oilFlowMatRef = useRef();
  const steamFlowMatRef = useRef();
  const sensorLensMatRef = useRef();
  const boltInstancedRef = useRef();
  const bracketInstancedRef = useRef();

  // Smooth mode cross-fade tracker (0.0 = Solid, 1.0 = X-Ray)
  const currentBlend = useRef(pipeViewMode === 'xray' ? 1.0 : 0.0);

  // =========================================================================
  // HEAVY INDUSTRIAL BLUEPRINT CONSTANTS (Bulked up diameters for massive presence)
  // =========================================================================
  const RAD = useMemo(() => ({
    R180: 0.560,   // Heavy API wellhead companion flange
    R168: 0.510,   // Detail B Pin outer thread
    R160: 0.495,   // Detail E Heavy bottom shoe
    R148: 0.480,   // Bulged Downhole Telemetry Sensor Sub
    R142: 0.465,   // Bulged Downhole Pump Barrel Body
    R138: 0.415,   // Detail C Perforated sub
    R120: 0.350,   // Standard tubular body
    R110: 0.330,   // Sub recessed neck
    innerPipe: 0.120,   // Prominent, heavy-duty steel production pipe (0.24m / ~9.5" OD)
    innerCollar: 0.148, // Heavy threaded box-and-pin coupling collar sleeve
    rod:  0.048,   // Sucker rod radius
    casing: 0.650  // Outer casing radius
  }), []);

  // Construct a 100% Contiguous, Zero-Gap Stack of Heavy Interlocking Sections
  const assemblyStack = useMemo(() => {
    const stack = [];

    const addSeg = (id, type, yTop, yBottom, rTop, rBottom, extra = {}) => {
      stack.push({
        id,
        type,
        yTop,
        yBottom,
        height: Math.abs(yTop - yBottom),
        yCenter: (yTop + yBottom) / 2,
        rTop,
        rBottom,
        radialSegments: extra.radialSegments || 64,
        ...extra
      });
    };

    // --- 1. WELLHEAD SECTION (0.0 to -1.60m) ---
    // Massive 570mm API Companion Flange with Stacked Dual Bolt Rows + Detail C Sub
    addSeg('wh_chamfer', 'shoulder', 0.0, -0.06, RAD.R142, RAD.R168);
    addSeg('wh_thread', 'thread', -0.06, -0.34, RAD.R168, RAD.R168);
    addSeg('wh_neck_trans', 'shoulder', -0.34, -0.38, RAD.R168, 0.440);
    addSeg('wh_flange', 'flange', -0.38, -0.52, 0.570, 0.570);
    addSeg('wh_flange_trans_dn', 'shoulder', -0.52, -0.56, 0.570, RAD.R138);
    addSeg('wh_perf_sub', 'perf', -0.56, -0.92, RAD.R138, RAD.R138, { holesX: 4.0, holeR: 0.040 });
    addSeg('wh_shoulder_2', 'shoulder', -0.92, -0.98, RAD.R138, RAD.R120);
    addSeg('pipe_sec_1', 'pipe', -0.98, -1.60, RAD.R120, RAD.R120);

    // --- 2. CAPROCK SECTION (-1.60 to -4.40m, Caprock ~300m label at y = -3.05) ---
    // Threaded Pin + Bolted Flange Collar + Heavy Hex Nut + Detail C Sub + Detail D Coupling
    addSeg('cap_shoulder_up', 'shoulder', -1.60, -1.66, RAD.R120, 0.430);
    addSeg('cap_chamfer', 'shoulder', -1.66, -1.72, 0.430, RAD.R168);
    addSeg('cap_thread', 'thread', -1.72, -1.98, RAD.R168, RAD.R168);
    addSeg('cap_neck', 'shoulder', -1.98, -2.02, RAD.R168, 0.420);
    addSeg('cap_flange_collar', 'flange', -2.02, -2.12, 0.505, 0.505);
    addSeg('cap_hex_nut', 'nut', -2.12, -2.28, 0.460, 0.460, { radialSegments: 6 });
    addSeg('cap_nut_sh_dn', 'shoulder', -2.28, -2.34, 0.460, RAD.R120);
    addSeg('pipe_sec_2', 'pipe', -2.34, -2.85, RAD.R120, RAD.R120);
    addSeg('cap_sub_sh_up', 'shoulder', -2.85, -2.93, RAD.R120, RAD.R138);
    addSeg('caprock_perf_sub', 'perf', -2.93, -3.35, RAD.R138, RAD.R138, { holesX: 5.0, holeR: 0.042 });
    addSeg('cap_sub_sh_dn', 'shoulder', -3.35, -3.42, RAD.R138, RAD.R120);
    addSeg('cap_mid_coupling', 'perf', -3.42, -3.72, RAD.R120, RAD.R120, { holesX: 4.0, holeR: 0.034 });
    addSeg('pipe_sec_3', 'pipe', -3.72, -4.34, RAD.R120, RAD.R120);

    // --- 3. MID-STRING & INTERMEDIATE SHOE (-4.34 to -7.80m, shoe at y = -7.50) ---
    // Solid Bolted Flange (R=0.525) + Prominent Coarse Thread + Landing Flange (R=0.565) + Shoe Collar
    addSeg('mid_neck_trans', 'shoulder', -4.34, -4.40, RAD.R120, 0.410);
    addSeg('mid_flange_collar', 'flange', -4.40, -4.52, 0.525, 0.525);
    addSeg('mid_prominent_thread', 'thread', -4.52, -4.98, RAD.R168, RAD.R168);
    addSeg('mid_step_dn', 'shoulder', -4.98, -5.04, RAD.R168, RAD.R120);
    addSeg('mid_coupling_d', 'perf', -5.04, -5.44, RAD.R120, RAD.R120, { holesX: 4.0, holeR: 0.034 });
    addSeg('mid_sh_dn', 'shoulder', -5.44, -5.50, RAD.R120, RAD.R120);
    addSeg('pipe_sec_4', 'pipe', -5.50, -7.16, RAD.R120, RAD.R120);
    addSeg('inter_neck', 'shoulder', -7.16, -7.20, RAD.R120, 0.420);
    addSeg('inter_crossover_flange', 'flange', -7.20, -7.36, 0.565, 0.565);
    addSeg('shoe_sh_up', 'shoulder', -7.36, -7.42, 0.565, RAD.R138);
    addSeg('inter_shoe_collar', 'pipe', -7.42, -7.74, RAD.R138, RAD.R138);
    addSeg('shoe_sh_dn', 'shoulder', -7.74, -7.80, RAD.R138, RAD.R120);

    // --- 4. DOWNHOLE BULGED SENSOR SUB & PUMP SECTION (-7.80 to -10.32m) ---
    // Bolted Sensor Flange (R=0.490) + Sensor Body (R=0.480) + Pump Flange (R=0.480) + Pump Barrel (R=0.465)
    addSeg('pipe_sec_5', 'pipe', -7.80, -8.36, RAD.R120, RAD.R120);
    addSeg('sensor_neck', 'shoulder', -8.36, -8.40, RAD.R120, 0.410);
    addSeg('sensor_flange_collar', 'flange', -8.40, -8.50, 0.490, 0.490);
    addSeg('sensor_sub_body', 'sensor', -8.50, -9.08, RAD.R148, RAD.R148);
    addSeg('pump_flange_collar', 'flange', -9.08, -9.16, 0.480, 0.480);
    // Upper Pump Safety Warning Band
    addSeg('pump_hazard_collar', 'hazard', -9.16, -9.36, RAD.R142, RAD.R142);
    // Bulged Pump Barrel Body & Intake Sub
    addSeg('pump_barrel_body', 'pipe', -9.36, -9.68, RAD.R142, RAD.R142);
    addSeg('pump_intake_sub', 'perf', -9.68, -10.08, RAD.R142, RAD.R142, { holesX: 6.0, holeR: 0.044 });
    addSeg('pump_knurl_sh_up', 'shoulder', -10.08, -10.12, RAD.R142, 0.440);
    addSeg('pump_knurled_collar', 'knurled', -10.12, -10.26, 0.440, 0.440);
    addSeg('pump_intake_dn', 'shoulder', -10.26, -10.32, 0.440, RAD.R120);
    addSeg('pipe_sec_6', 'pipe', -10.32, -11.16, RAD.R120, RAD.R120);

    // --- 5. PAY ZONE & HEAVY BOTTOM SHOE (-11.16 to -12.00m) ---
    // Bolted Landing Flange (R=0.520) + Safety Warning Band + Bulged Detail E Shoe (R=0.495) + Bull Plug Nose
    addSeg('pay_neck', 'shoulder', -11.16, -11.20, RAD.R120, 0.420);
    addSeg('pay_shoe_flange', 'flange', -11.20, -11.28, 0.520, 0.520);
    addSeg('pay_hazard_collar', 'hazard', -11.28, -11.48, RAD.R160, RAD.R160);
    addSeg('pay_bottom_shoe', 'pay', -11.48, -11.82, RAD.R160, RAD.R160, { holesX: 6.0, holeR: 0.062 });
    addSeg('pay_taper_dn', 'shoulder', -11.82, -11.92, RAD.R160, RAD.R120);
    addSeg('bottom_bull_plug', 'shoulder', -11.92, -12.00, RAD.R120, RAD.R60);

    return stack;
  }, [RAD]);

  // =========================================================================
  // GREEBLE 1: 6 HEAVY ARMOR SHROUD SLEEVES OVERLAPPING JOINTS (Massive Vertebrae)
  // =========================================================================
  const armorShrouds = useMemo(() => {
    return [
      { key: 'shroud_wh', y: -0.98, r: 0.450, height: 0.38, ribs: 6 },
      { key: 'shroud_caprock', y: -2.85, r: 0.475, height: 0.42, ribs: 6 },
      { key: 'shroud_mid', y: -5.15, r: 0.470, height: 0.44, ribs: 6 },
      { key: 'shroud_inter', y: -7.30, r: 0.560, height: 0.46, ribs: 8 },
      { key: 'shroud_pump', y: -9.55, r: 0.495, height: 0.54, ribs: 6, isCutaway: true },
      { key: 'shroud_pay', y: -11.35, r: 0.525, height: 0.46, ribs: 8 }
    ];
  }, []);

  // =========================================================================
  // PROMINENT METALLIC SURFACE CONDUCTOR CASING CONE GUSSET STIFFENERS
  // 8 Heavy triangular reinforced fins connecting foundation flange to cone body
  // =========================================================================
  const conductorGussetGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Inner edge follows cone slope from (1.02, 0) to (0.59, -0.34)
    shape.moveTo(1.02, 0);
    shape.lineTo(1.18, 0);       // Prominent flared top tab under foundation collar
    shape.lineTo(1.18, -0.04);   // Top flange notch
    shape.lineTo(0.72, -0.30);   // Slanted outer stiffener bevel
    shape.lineTo(0.72, -0.34);   // Bottom collar tab
    shape.lineTo(0.59, -0.34);   // Inner edge against cone base
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2
    });
    geo.translate(0, 0, -0.013);
    return geo;
  }, []);

  // Clean up conductor gusset geometry on unmount
  useEffect(() => {
    return () => {
      if (conductorGussetGeometry) conductorGussetGeometry.dispose();
    };
  }, [conductorGussetGeometry]);

  // =========================================================================
  // GREEBLE 5: 4 INDUSTRIAL VALVE HANDWHEELS WITH SPOKES & MOUNTING STEMS
  // Landmark wing and vent valves at wellhead, mid-string, and downhole
  // =========================================================================
  const valveHardware = useMemo(() => [
    // 1. Surface / Wellhead Wing Valve (y = -0.48, extends along +X)
    {
      key: 'valve_wh_wing',
      bodyPos: [0.42, -0.48, 0],
      bodyRot: [0, 0, -Math.PI / 2],
      stemLen: 0.24,
      wheelPos: [0.66, -0.48, 0],
      wheelRot: [0, Math.PI / 2, 0],
      wheelR: 0.14
    },
    // 2. Wellhead Casing Annulus Vent Valve (y = -1.15, extends along -X)
    {
      key: 'valve_casing_vent',
      bodyPos: [-0.40, -1.15, 0],
      bodyRot: [0, 0, Math.PI / 2],
      stemLen: 0.22,
      wheelPos: [-0.62, -1.15, 0],
      wheelRot: [0, -Math.PI / 2, 0],
      wheelR: 0.12
    },
    // 3. Mid-String Sampling / Injection Valve (y = -4.46, extends at angle)
    {
      key: 'valve_mid_sample',
      bodyPos: [0.38 * Math.cos(0.7), -4.46, 0.38 * Math.sin(0.7)],
      bodyRot: [0, -0.7, -Math.PI / 2],
      stemLen: 0.20,
      wheelPos: [0.58 * Math.cos(0.7), -4.46, 0.58 * Math.sin(0.7)],
      wheelRot: [0, -0.7 + Math.PI / 2, 0],
      wheelR: 0.11
    },
    // 4. Downhole Telemetry Isolation Valve (y = -8.56, extends at angle)
    {
      key: 'valve_downhole_gauge',
      bodyPos: [0.38 * Math.cos(-1.2), -8.56, 0.38 * Math.sin(-1.2)],
      bodyRot: [0, 1.2, -Math.PI / 2],
      stemLen: 0.18,
      wheelPos: [0.56 * Math.cos(-1.2), -8.56, 0.56 * Math.sin(-1.2)],
      wheelRot: [0, 1.2 + Math.PI / 2, 0],
      wheelR: 0.10
    }
  ], []);

  // =========================================================================
  // HELICAL VORTEX SWIRL VANE GEOMETRY (Gas Separator Internal)
  // 2.0-turn double-sided spiral vane ribbon per blueprint schematic
  // =========================================================================
  const vortexVaneGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const steps = 36;
    const height = 0.22;
    const turns = 2.0;
    const rInner = 0.045;
    const rOuter = 0.21;
    const positions = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * height;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      positions.push(cosA * rInner, y, sinA * rInner);
      positions.push(cosA * rOuter, y, sinA * rOuter);
    }
    const indices = [];
    for (let i = 0; i < steps; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
      indices.push(i2, i1, i0);
      indices.push(i2, i3, i1);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // =========================================================================
  // DETAILED INDUSTRIAL FASTENER COMPOUND GEOMETRY (InstancedMesh)
  // Hardened Washer Base + Heavy Hex Nut + Chamfered Crown + Protruding Stud + Root
  // =========================================================================
  const detailedBoltGeometry = useMemo(() => {
    // 1. Hardened Circular Washer Base (sits flush on the flange face at y = 0)
    const washer = new THREE.CylinderGeometry(1.32, 1.32, 0.12, 16);
    washer.translate(0, 0.06, 0);

    // 2. Heavy Hexagonal Nut (6 sharp, distinct hexagonal flats)
    const hexNut = new THREE.CylinderGeometry(1.0, 1.0, 0.65, 6);
    hexNut.translate(0, 0.12 + 0.325, 0);

    // 3. Chamfered Nut Crown / Bevel
    const crown = new THREE.CylinderGeometry(0.88, 1.0, 0.10, 6);
    crown.translate(0, 0.12 + 0.65 + 0.05, 0);

    // 4. Protruding Threaded Stud Tip (extends proud above the nut)
    const stud = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    stud.translate(0, 0.12 + 0.65 + 0.175, 0);

    // 5. Anchoring Root (penetrates into flange face below y = 0 so no daylight/gap is possible)
    const root = new THREE.CylinderGeometry(0.55, 0.55, 0.20, 8);
    root.translate(0, -0.10, 0);

    const merged = mergeGeometries([washer, hexNut, crown, stud, root]);
    merged.computeVertexNormals();
    return merged;
  }, []);

  // =========================================================================
  // GREEBLE 2: PROMINENT FLANGE STUDS & BOLT HARDWARE (Seated on Machined Flange Shelves)
  // All bolts sit flat on dedicated horizontal flange faces with ZERO floating!
  // =========================================================================
  const boltHardware = useMemo(() => {
    const bolts = [];
    const addBoltRing = (id, y, radius, count = 8, scale = [0.027, 0.050, 0.027], offsetAngle = 0) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + offsetAngle;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;
        bolts.push({
          key: `${id}_${i}`,
          pos: [x, y, z],
          scale
        });
      }
    };

    // 1. Wellhead Companion Flange (Dual Rows on Machined Top Shelf y = -0.38, Flange extends r=0.440 to 0.570)
    addBoltRing('wh_top_in', -0.38, 0.475, 8, [0.027, 0.052, 0.027]);
    addBoltRing('wh_top_out', -0.38, 0.535, 8, [0.027, 0.052, 0.027], Math.PI / 8);

    // 2. Caprock Bolted Casing Seal Flange Collar (Top Shelf y = -2.02, Flange extends r=0.420 to 0.505)
    addBoltRing('cap_seal_flange', -2.02, 0.462, 8, [0.026, 0.048, 0.026]);

    // 3. Mid-String Tool Joint Heavy Flange Collar (Top Shelf y = -4.40, Flange extends r=0.410 to 0.525)
    addBoltRing('mid_flange_joint', -4.40, 0.468, 8, [0.028, 0.050, 0.028]);

    // 4. Intermediate Casing Landing Flange (Dual Rows on Top Shelf y = -7.20, Flange extends r=0.420 to 0.565)
    addBoltRing('inter_top_in', -7.20, 0.465, 8, [0.028, 0.052, 0.028]);
    addBoltRing('inter_top_out', -7.20, 0.525, 8, [0.028, 0.052, 0.028], Math.PI / 8);

    // 5. Downhole Sensor Sub Mounting Collar (Top Shelf y = -8.40, Flange extends r=0.410 to 0.490)
    addBoltRing('sensor_top_flange', -8.40, 0.450, 8, [0.026, 0.048, 0.026]);

    // 6. Downhole Pump Hydraulic Barrel Adapter Flange (Top Shelf y = -9.08, Flange extends r=0.410 to 0.480)
    addBoltRing('pump_adapter_flange', -9.08, 0.445, 8, [0.026, 0.048, 0.026]);

    // 7. Pay Zone Heavy Bottom Shoe Landing Flange (Top Shelf y = -11.20, Flange extends r=0.420 to 0.520)
    addBoltRing('pay_shoe_flange', -11.20, 0.470, 8, [0.028, 0.050, 0.028]);

    return bolts;
  }, []);

  // =========================================================================
  // GREEBLE 3: 16 CONDUIT BRACKET CLAMPS (InstancedMesh)
  // =========================================================================
  const bracketHardware = useMemo(() => {
    const list = [];
    const yLevels = [-0.3, -1.0, -1.8, -2.5, -3.2, -3.9, -4.7, -5.4, -6.1, -6.8, -7.5, -8.2, -8.9, -9.6, -10.3, -11.0];
    const angle = 2.0; // 115° azimuth
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const bracketR = 0.385;

    yLevels.forEach((y, i) => {
      list.push({
        key: `bracket_${i}`,
        pos: [cosA * bracketR, y, sinA * bracketR],
        rot: [0, -angle + Math.PI / 2, 0],
        scale: [0.08, 0.035, 0.05]
      });
    });
    return list;
  }, []);

  // Machined Highlight Chamfer Bevel Rings at Open Collar & Sub Rims
  const chamferRims = useMemo(() => {
    const list = [];
    const addChamfer = (id, y, rTop, rBottom, height = 0.012, radialSegments = 64) => {
      list.push({
        key: id,
        pos: [0, y, 0],
        rTop,
        rBottom,
        height,
        radialSegments
      });
    };

    addChamfer('wh_flange_top', -0.38, 0.558, 0.570);
    addChamfer('wh_flange_bot', -0.52, 0.570, 0.558);
    addChamfer('wh_perf_top', -0.56, 0.404, 0.415);
    addChamfer('wh_perf_bot', -0.92, 0.415, 0.404);

    addChamfer('cap_flange_top', -2.02, 0.493, 0.505);
    addChamfer('cap_nut_top', -2.12, 0.448, 0.460, 0.014, 6);
    addChamfer('cap_nut_bot', -2.28, 0.460, 0.448, 0.014, 6);
    addChamfer('cap_perf_top', -2.93, 0.404, 0.415);
    addChamfer('cap_perf_bot', -3.35, 0.415, 0.404);

    addChamfer('mid_cpl_top', -3.42, 0.338, 0.350);
    addChamfer('mid_cpl_bot', -3.72, 0.350, 0.338);
    addChamfer('mid_flange_top', -4.40, 0.513, 0.525);
    addChamfer('mid_thread_top', -4.52, 0.498, 0.510);
    addChamfer('mid_thread_bot', -4.98, 0.510, 0.498);

    addChamfer('inter_flange_top', -7.20, 0.553, 0.565);
    addChamfer('inter_flange_bot', -7.36, 0.565, 0.553);
    addChamfer('sensor_flange_top', -8.40, 0.478, 0.490);
    addChamfer('sensor_body_bot', -9.08, 0.480, 0.468);
    addChamfer('pump_flange_top', -9.08, 0.468, 0.480);
    addChamfer('pump_barrel_top', -9.36, 0.453, 0.465);
    addChamfer('pay_flange_top', -11.20, 0.508, 0.520);
    addChamfer('pay_shoe_top', -11.48, 0.483, 0.495);
    addChamfer('pay_shoe_bot', -11.82, 0.495, 0.483);

    return list;
  }, []);

  // Raised Weld-Seam Beads with Blue-Grey Heat-Tint at Girth Joins
  const weldBeads = useMemo(() => {
    return [
      { key: 'weld_wh_pipe', y: -0.98, r: 0.352 },
      { key: 'weld_cap_joint', y: -2.32, r: 0.352 },
      { key: 'weld_pipe2_girth', y: -3.72, r: 0.352 },
      { key: 'weld_mid_joint', y: -5.50, r: 0.352 },
      { key: 'weld_inter_shoe', y: -7.40, r: 0.418 },
      { key: 'weld_shoe_lower', y: -7.80, r: 0.352 },
      { key: 'weld_sensor_trans', y: -8.42, r: 0.352 },
      { key: 'weld_pump_intake', y: -9.68, r: 0.467 },
      { key: 'weld_pump_lower', y: -10.32, r: 0.352 },
      { key: 'weld_pay_landing', y: -11.20, r: 0.352 }
    ];
  }, []);

  // Single-ring perforated sub sockets
  const holeSockets = useMemo(() => {
    const sockets = [];
    assemblyStack.forEach((seg) => {
      if (seg.type === 'perf' || seg.type === 'pay') {
        const numHoles = Math.round(seg.holesX || 4);
        const r = seg.rTop;
        const holeDepth = 0.048;
        const holeRadius = seg.holeR || 0.040;
        const rowY = seg.yCenter;

        for (let i = 0; i < numHoles; i++) {
          const uvX = (i + 0.5) / numHoles;
          const angle = uvX * Math.PI * 2;
          const dirX = Math.sin(angle);
          const dirZ = Math.cos(angle);

          const posX = dirX * (r - holeDepth * 0.4);
          const posZ = dirZ * (r - holeDepth * 0.4);

          const q = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(dirX, 0, dirZ)
          );
          const rot = new THREE.Euler().setFromQuaternion(q).toArray().slice(0, 3);

          sockets.push({
            key: `${seg.id}_h${i}`,
            pos: [posX, rowY, posZ],
            rot,
            radius: holeRadius * 0.94,
            depth: holeDepth
          });
        }
      }
    });
    return sockets;
  }, [assemblyStack]);

  // Phase-aware flags
  const isProduction = true;
  const isInjection = String(cssStage).includes('INJECTION');
  const isSoak = String(cssStage) === 'SOAK';

  // Viscosity normalized
  const viscNorm = useMemo(() => {
    return Math.min(1.0, Math.max(0.0, (viscosityCp - 80) / 7200));
  }, [viscosityCp]);


  // PBR Materials mapped to all mechanical modules & greebles
  const { materialsMap, allMaterials } = useMemo(() => {
    const map = {};
    const list = [];

    const createMat = (opts = {}) => {
      const {
        isCutout = false,
        isThread = false,
        isKnurled = false,
        isBolt = false,
        isWeld = false,
        isChamfer = false,
        isHazard = false,
        isHardware = false,
        holesX = 4,
        radius = 0.403,
        height = 0.44,
        holeR = 0.040,
        color = PIPE_COLORS.baseBrown,
        metalness = PIPE_PBR.tubing.metalness,
        roughness = PIPE_PBR.tubing.roughness
      } = opts;

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness,
        roughness,
        transparent: true,
        depthWrite: true,
        side: THREE.FrontSide
      });

      mat.onBeforeCompile = (shader) => {
        configureAgedSteelShader(shader);
        shader.uniforms.uCutout.value = isCutout ? 1.0 : 0.0;
        shader.uniforms.uIsThread.value = isThread ? 1.0 : 0.0;
        shader.uniforms.uIsKnurled.value = isKnurled ? 1.0 : 0.0;
        shader.uniforms.uIsBolt.value = isBolt ? 1.0 : 0.0;
        shader.uniforms.uIsWeld.value = isWeld ? 1.0 : 0.0;
        shader.uniforms.uIsChamfer.value = isChamfer ? 1.0 : 0.0;
        shader.uniforms.uIsHazard.value = isHazard ? 1.0 : 0.0;
        shader.uniforms.uIsHardware.value = isHardware ? 1.0 : 0.0;
        shader.uniforms.uHolesX.value = holesX;
        shader.uniforms.uRadius.value = radius;
        shader.uniforms.uHeight.value = height;
        shader.uniforms.uHoleRadiusWorld.value = holeR;
        mat.userData.shader = shader;
      };

      list.push(mat);
      return mat;
    };

    assemblyStack.forEach((seg) => {
      const isCutout = seg.type === 'perf' || seg.type === 'pay';
      const isThread = seg.type === 'thread';
      const isKnurled = seg.type === 'knurled';
      const isHazard = seg.type === 'hazard';
      const holesX = seg.holesX || 4;
      const holeR = seg.holeR || 0.040;
      const radius = seg.rTop;
      const height = seg.height;
      const key = `${seg.type}_${isThread}_${isKnurled}_${isHazard}_${holesX}_${holeR}_${radius.toFixed(3)}_${height.toFixed(3)}`;

      if (!map[key]) {
        map[key] = createMat({
          isCutout,
          isThread,
          isKnurled,
          isHazard,
          holesX,
          radius,
          height,
          holeR,
          color: isHazard ? PIPE_COLORS.hazardLight : (seg.type === 'nut' ? PIPE_COLORS.baseSteelDark : (seg.type === 'sensor' ? PIPE_COLORS.baseMedium : (seg.type === 'flange' ? PIPE_COLORS.baseMedium : PIPE_COLORS.baseSteel))),
          metalness: seg.type === 'nut' ? PIPE_PBR.nut.metalness : PIPE_PBR.tubing.metalness,
          roughness: seg.type === 'nut' ? PIPE_PBR.nut.roughness : PIPE_PBR.tubing.roughness
        });
      }
    });

    // 1. High-contrast alloy steel bolt hardware (distinct studs in X-ray)
    map.bolt = createMat({ color: PIPE_COLORS.bolt, metalness: PIPE_PBR.bolt.metalness, roughness: PIPE_PBR.bolt.roughness, isBolt: true });
    // 2. Machined chamfers (bright highlight)
    map.chamfer = createMat({ color: PIPE_COLORS.chamfer, metalness: PIPE_PBR.chamfer.metalness, roughness: PIPE_PBR.chamfer.roughness, isChamfer: true });
    // 3. Raised weld beads (heat-tint seam)
    map.weld = createMat({ color: PIPE_COLORS.weld, metalness: PIPE_PBR.weld.metalness, roughness: PIPE_PBR.weld.roughness, isWeld: true });
    // 4. Procedural Hazard chevrons (OSHA safety yellow & midnight charcoal)
    map.hazard = createMat({ color: PIPE_COLORS.hazardLight, metalness: PIPE_PBR.hazard.metalness, roughness: PIPE_PBR.hazard.roughness, isHazard: true });
    // 5. Heavy armor shroud sleeves (longitudinal ribbing)
    map.shroud = createMat({ color: PIPE_COLORS.shroud, metalness: PIPE_PBR.hardware.metalness, roughness: PIPE_PBR.hardware.roughness, isHardware: true });
    // 6. Stainless instrument conduits (3 parallel lines)
    map.conduit = createMat({ color: PIPE_COLORS.conduit, metalness: PIPE_PBR.bolt.metalness, roughness: PIPE_PBR.chamfer.roughness, isHardware: true });
    // 7. Galvanized conduit bracket clamps (16 mounting C-clamps)
    map.bracket = createMat({ color: PIPE_COLORS.bracket, metalness: PIPE_PBR.hardware.metalness, roughness: PIPE_PBR.tubing.roughness, isHardware: true });
    // 8. Weathered cast-steel terminal junction boxes
    map.junction_box = createMat({ color: PIPE_COLORS.junctionBox, metalness: PIPE_PBR.hardware.metalness, roughness: PIPE_PBR.tubing.roughness, isHardware: true });
    // 9. Sensor sub instrument bezel
    map.sensor_bezel = createMat({ color: PIPE_COLORS.sensorBezel, metalness: PIPE_PBR.hardware.metalness, roughness: PIPE_PBR.pumpPrecision.roughness, isHardware: true });
    // 10. Heavy Industrial Valve Handwheels
    map.valve = createMat({ color: PIPE_COLORS.valve, metalness: PIPE_PBR.hardware.metalness, roughness: PIPE_PBR.hardware.roughness, isHardware: true });
    // 11. Valve Machined Stem / Spindle Trim
    map.valve_trim = createMat({ color: PIPE_COLORS.valveTrim, metalness: PIPE_PBR.bolt.metalness, roughness: PIPE_PBR.pumpMirror.roughness, isHardware: true });
    // 12. Default pipe fallback (brushed steel)
    map.pipe = createMat({ color: PIPE_COLORS.baseSteel });

    return { materialsMap: map, allMaterials: list };
  }, [assemblyStack]);

  // Dedicated precision materials for Downhole Pump Assembly (swaps to translucent X-Ray)
  const pumpMaterials = useMemo(() => {
    return {
      barrelOuter: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpBarrelOuter),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness,
        side: THREE.DoubleSide
      }),
      barrelInner: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpBarrelInner),
        metalness: PIPE_PBR.pumpMirror.metalness,
        roughness: PIPE_PBR.pumpMirror.roughness,
        side: THREE.DoubleSide
      }),
      barrelCollar: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpBarrelCollar),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness,
        side: THREE.DoubleSide
      }),
      separatorOuter: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpSeparatorOuter),
        metalness: PIPE_PBR.tubing.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness,
        side: THREE.DoubleSide
      }),
      vortexShaft: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpVortexShaft),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      vortexVane: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpVortexVane),
        metalness: PIPE_PBR.pumpMirror.metalness,
        roughness: PIPE_PBR.pumpMirror.roughness,
        side: THREE.DoubleSide
      }),
      seatBronze: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpSeatBronze),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      seatChamfer: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpSeatChamfer),
        metalness: PIPE_PBR.pumpMirror.metalness,
        roughness: PIPE_PBR.pumpMirror.roughness
      }),
      valveCage: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpValveCage),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      valveBall: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpValveBall),
        metalness: PIPE_PBR.pumpMirror.metalness,
        roughness: 0.12
      }),
      strainer: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpStrainer),
        metalness: PIPE_PBR.tubing.metalness,
        roughness: PIPE_PBR.tubing.roughness
      }),
      strainerCollar: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpStrainerCollar),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      plungerPin: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpPlungerPin),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      centralizerFins: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpCentralizerFins),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness
      }),
      plungerBody: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpPlungerBody),
        metalness: PIPE_PBR.pumpMirror.metalness,
        roughness: PIPE_PBR.pumpMirror.roughness,
        side: THREE.DoubleSide
      }),
      sealGrooves: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PIPE_COLORS.pumpSealGrooves),
        metalness: PIPE_PBR.pumpPrecision.metalness,
        roughness: PIPE_PBR.pumpPrecision.roughness,
        side: THREE.DoubleSide
      })
    };
  }, []);

  // Synchronize InstancedMesh transformations for all prominent flange bolts
  useEffect(() => {
    if (!boltInstancedRef.current) return;
    const dummy = new THREE.Object3D();
    boltHardware.forEach((b, i) => {
      dummy.position.set(...b.pos);
      dummy.scale.set(...b.scale);
      dummy.updateMatrix();
      boltInstancedRef.current.setMatrixAt(i, dummy.matrix);
    });
    boltInstancedRef.current.instanceMatrix.needsUpdate = true;
  }, [boltHardware]);

  // Synchronize InstancedMesh transformations for 16 bracket clamps
  useEffect(() => {
    if (!bracketInstancedRef.current) return;
    const dummy = new THREE.Object3D();
    bracketHardware.forEach((b, i) => {
      dummy.position.set(...b.pos);
      dummy.rotation.set(...b.rot);
      dummy.scale.set(...b.scale);
      dummy.updateMatrix();
      bracketInstancedRef.current.setMatrixAt(i, dummy.matrix);
    });
    bracketInstancedRef.current.instanceMatrix.needsUpdate = true;
  }, [bracketHardware]);

  // Brushed Stainless Steel Texture matching user reference image
  const brushedSteelTexture = useMemo(() => {
    const canvasTex = createBrushedSteelCanvasTexture();
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/brushed_steel.png',
      (imgTex) => {
        imgTex.wrapS = THREE.RepeatWrapping;
        imgTex.wrapT = THREE.RepeatWrapping;
        imgTex.colorSpace = THREE.SRGBColorSpace;
        imgTex.needsUpdate = true;
        if (canvasTex && imgTex.image) {
          canvasTex.image = imgTex.image;
          canvasTex.needsUpdate = true;
        }
      },
      undefined,
      () => {
        // Procedural canvas texture serves as immediate high-def fallback
      }
    );
    return canvasTex;
  }, []);

  // Dedicated PBR Materials for Prominent Inside Steel Pipe (Production Tubing Column)
  // Radiant, bright brushed stainless steel exactly matching the user's reference image
  const { innerSteelMaterial, innerCollarMaterial, innerChamferMaterial, innerRibMaterial, innerCentralizerMaterial } = useMemo(() => {
    // 1. Core Brushed Stainless Steel Pipe Material matching user reference image
    const steelMat = new THREE.MeshStandardMaterial({
      map: brushedSteelTexture,
      color: new THREE.Color('#f8fafc'), // Radiant bright silver-white base
      metalness: 0.38,                  // 38% metallic: preserves 62% bright silver diffuse texture while adding crisp specular shine
      roughness: 0.20,                  // Satin-brushed sheen matching reference photo
      emissive: new THREE.Color('#333842'), // Subtle ambient floor so pipe never goes black in shadow
      emissiveIntensity: 0.6,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      side: THREE.FrontSide
    });

    // 2. Heavy Tool Joint Coupling Collar — Light Lustrous Metallic Bronze
    const collarMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b47846'), // Light warm lustrous metallic bronze
      metalness: 0.74,                  // High metallic sheen
      roughness: 0.20,                  // Smooth machined metallic bronze polish
      emissive: new THREE.Color('#523218'), // Warm bronze undertone
      emissiveIntensity: 0.50,
      depthWrite: true
    });

    // 3. Machined Chamfer Material — Polished Light Metallic Bronze Bevels
    const chamferMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cfa068'), // Bright polished light bronze bevels
      metalness: 0.78,
      roughness: 0.15,                  // Sharp specular highlight
      emissive: new THREE.Color('#5a361c'),
      emissiveIntensity: 0.55,
      depthWrite: true
    });

    // 4. Concentric Ribbed Ring Material — Light Antique Metallic Bronze
    const ribMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a46c3b'), // Light antique bronze
      metalness: 0.72,
      roughness: 0.24,
      emissive: new THREE.Color('#482a14'),
      emissiveIntensity: 0.45,
      depthWrite: true
    });

    // 5. Centralizer Stabilizer Blade Material — Light Industrial Bronze Wear Guides
    const centralizerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a46c3b'), // Light bronze blades
      metalness: 0.72,
      roughness: 0.22,
      emissive: new THREE.Color('#482a14'),
      emissiveIntensity: 0.45,
      depthWrite: true
    });

    return {
      innerSteelMaterial: steelMat,
      innerCollarMaterial: collarMat,
      innerChamferMaterial: chamferMat,
      innerRibMaterial: ribMat,
      innerCentralizerMaterial: centralizerMat
    };
  }, [brushedSteelTexture]);

  const oilFlowUniforms = useMemo(() => ({
    uScrollOffset: { value: 0.0 },
    uXRayBlend: { value: pipeViewMode === 'xray' ? 1.0 : 0.0 },
    uViscNorm: { value: viscNorm },
    uPlungerY: { value: -9.10 }
  }), [viscNorm, pipeViewMode]);

  const steamFlowUniforms = useMemo(() => ({
    uTime: { value: 0.0 },
    uSteamSpeed: { value: 2.6 },
    uActive: { value: isInjection ? 1.0 : 0.0 },
    uXRayBlend: { value: pipeViewMode === 'xray' ? 1.0 : 0.0 }
  }), [isInjection, pipeViewMode]);

  // Sparse Rising Bubble / Glint Capsules Data (36 elongated capsules for motion streak)
  const bubbleCapsulesData = useMemo(() => {
    const prng = createPRNG(998877);
    const count = 36;
    const items = [];
    for (let i = 0; i < count; i++) {
      const angle = prng() * Math.PI * 2;
      const r = 0.07 + prng() * 0.21;
      const initialY = -11.8 + prng() * 11.8;
      const speedMult = 0.88 + prng() * 0.24;
      const scaleX = 0.7 + prng() * 0.5;
      const scaleY = 1.0 + prng() * 0.8;
      items.push({
        angle,
        r,
        currentY: initialY,
        speedMult,
        scaleX,
        scaleY
      });
    }
    return items;
  }, []);

  // Fluid Ingress Streak Particles at Perforations
  const { streakPositions, streakData } = useMemo(() => {
    const prng = createPRNG(334455);
    const count = 36;
    const pos = new Float32Array(count * 3);
    const data = [];

    for (let i = 0; i < count; i++) {
      const isPay = i < count * 0.65;
      const centerY = isPay ? -11.55 : -9.88;
      const angle = prng() * Math.PI * 2;
      const r = 0.36 + prng() * 0.20;

      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = centerY + (prng() - 0.5) * 0.5;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      data.push({
        angle,
        baseY: centerY + (prng() - 0.5) * 0.5,
        rStart: r,
        speed: 0.35 + prng() * 0.55,
        phase: prng() * Math.PI * 2
      });
    }

    return { streakPositions: pos, streakData: data };
  }, []);

  // Frame animation loop with smooth Solid <-> X-Ray cross-fade
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Cross-fade between Solid (0.0) and X-Ray (1.0) over ~0.4s
    const targetBlend = pipeViewMode === 'xray' ? 1.0 : 0.0;
    currentBlend.current = THREE.MathUtils.lerp(
      currentBlend.current,
      targetBlend,
      Math.min(1.0, delta * 5.5)
    );
    const blend = currentBlend.current;

    // Update uXRayBlend and depthWrite across all completion string materials
    allMaterials.forEach((mat) => {
      if (mat.userData?.shader) {
        mat.userData.shader.uniforms.uXRayBlend.value = blend;
      }
      mat.depthWrite = blend < 0.15;
    });

    // Update pump materials for smooth Solid <-> X-Ray cross-fade
    const isXRayActive = blend > 0.02;
    Object.values(pumpMaterials).forEach((mat) => {
      mat.transparent = isXRayActive;
      mat.depthWrite = blend < 0.15;
    });

    if (isXRayActive) {
      // Clear glass outer barrel wear sleeve & liner
      pumpMaterials.barrelOuter.opacity = THREE.MathUtils.lerp(1.0, 0.16, blend);
      pumpMaterials.barrelOuter.color.set('#38bdf8');

      pumpMaterials.barrelInner.opacity = THREE.MathUtils.lerp(1.0, 0.12, blend);
      pumpMaterials.barrelInner.color.set('#7dd3fc');

      // Light metallic bronze machined collar
      pumpMaterials.barrelCollar.opacity = THREE.MathUtils.lerp(1.0, 0.90, blend);
      pumpMaterials.barrelCollar.color.set('#b47846');

      pumpMaterials.separatorOuter.opacity = THREE.MathUtils.lerp(1.0, 0.20, blend);
      pumpMaterials.separatorOuter.color.set('#38bdf8');

      pumpMaterials.vortexVane.opacity = THREE.MathUtils.lerp(1.0, 0.85, blend);
      pumpMaterials.vortexVane.color.set('#b47846'); // Light bronze helical vane

      // Light metallic bronze valve seats & cages
      pumpMaterials.seatBronze.opacity = THREE.MathUtils.lerp(1.0, 0.92, blend);
      pumpMaterials.seatBronze.color.set('#a46c3b'); // Light metallic bronze

      pumpMaterials.seatChamfer.opacity = THREE.MathUtils.lerp(1.0, 0.95, blend);
      pumpMaterials.seatChamfer.color.set('#cfa068'); // Polished light bronze chamfer

      pumpMaterials.valveCage.opacity = THREE.MathUtils.lerp(1.0, 0.90, blend);
      pumpMaterials.valveCage.color.set('#a46c3b'); // Light bronze cage

      // Mirror-finish hard tungsten carbide ball
      pumpMaterials.valveBall.opacity = THREE.MathUtils.lerp(1.0, 0.98, blend);
      pumpMaterials.valveBall.color.set('#f1f5f9');

      // Mirror-polished hard chrome metallic steel plunger body
      pumpMaterials.plungerBody.opacity = THREE.MathUtils.lerp(1.0, 0.94, blend);
      pumpMaterials.plungerBody.color.set('#cbd5e1');

      // Light metallic bronze fluid-seal rings
      pumpMaterials.sealGrooves.opacity = THREE.MathUtils.lerp(1.0, 0.96, blend);
      pumpMaterials.sealGrooves.color.set('#b47846');

      // Light bronze centralizer fins & plunger pin
      pumpMaterials.centralizerFins.opacity = THREE.MathUtils.lerp(1.0, 0.92, blend);
      pumpMaterials.centralizerFins.color.set('#a46c3b');

      pumpMaterials.plungerPin.opacity = THREE.MathUtils.lerp(1.0, 0.92, blend);
      pumpMaterials.plungerPin.color.set('#e2e8f0');

      pumpMaterials.strainer.opacity = THREE.MathUtils.lerp(1.0, 0.65, blend);
      pumpMaterials.strainer.color.set('#64748b');

      pumpMaterials.strainerCollar.opacity = THREE.MathUtils.lerp(1.0, 0.92, blend);
      pumpMaterials.strainerCollar.color.set('#b47846'); // Light bronze intake collar
    } else {
      pumpMaterials.barrelOuter.color.set(PIPE_COLORS.pumpBarrelOuter);
      pumpMaterials.barrelInner.color.set(PIPE_COLORS.pumpBarrelInner);
      pumpMaterials.vortexVane.color.set(PIPE_COLORS.pumpVortexVane);
      pumpMaterials.valveBall.color.set(PIPE_COLORS.pumpValveBall);
      pumpMaterials.plungerBody.color.set(PIPE_COLORS.pumpPlungerBody);
      pumpMaterials.sealGrooves.color.set(PIPE_COLORS.pumpSealGrooves);
      pumpMaterials.seatBronze.color.set(PIPE_COLORS.pumpSeatBronze);
      pumpMaterials.seatChamfer.color.set(PIPE_COLORS.pumpSeatChamfer);
    }

    // Update Oil Flow Shader with dynamic oilRateBopd flow speed
    const flowSpeed = Math.max(0.4, (oilRateBopd / 200.0) * 1.8);
    const scrollOffset = (time * flowSpeed * 2.2) % 628.318;
    if (oilFlowMatRef.current) {
      oilFlowMatRef.current.uniforms.uScrollOffset.value = scrollOffset;
      oilFlowMatRef.current.uniforms.uXRayBlend.value = blend;
      oilFlowMatRef.current.uniforms.uViscNorm.value = viscNorm;
    }

    // Update Steam Flow Shader
    if (steamFlowMatRef.current) {
      steamFlowMatRef.current.uniforms.uTime.value = time;
      steamFlowMatRef.current.uniforms.uXRayBlend.value = blend;
      steamFlowMatRef.current.uniforms.uActive.value = isInjection ? 1.0 : 0.0;
    }

    // Update Landmark Sensor Sub Optical Lens Telemetry Heartbeat
    if (sensorLensMatRef.current) {
      const pulse = 0.72 + 0.28 * Math.sin(time * 3.6);
      sensorLensMatRef.current.emissiveIntensity = pulse;
    }

    // Rising capsule glints disabled per user request
    if (risingCapsulesRef.current) {
      risingCapsulesRef.current.visible = false;
    }

    // Update Fluid Ingress Particles at Perforations
    if (ingressParticlesRef.current) {
      ingressParticlesRef.current.material.opacity = isProduction
        ? Math.min(0.9, (pumpFillagePct / 100.0) * blend)
        : 0.0;

      if (blend > 0.02 && isProduction) {
        const positions = ingressParticlesRef.current.geometry.attributes.position.array;
        const fillFactor = Math.max(0.2, pumpFillagePct / 100.0);

        for (let i = 0; i < streakData.length; i++) {
          const item = streakData[i];
          const cycleProgress = ((time * item.speed * fillFactor + item.phase) % (Math.PI * 2)) / (Math.PI * 2);
          const currentR = THREE.MathUtils.lerp(item.rStart, 0.08, cycleProgress);
          const currentY = item.baseY + cycleProgress * 0.45;

          positions[i * 3] = Math.cos(item.angle) * currentR;
          positions[i * 3 + 1] = currentY;
          positions[i * 3 + 2] = Math.sin(item.angle) * currentR;
        }
        ingressParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 2. Kinematic Sucker Rod String & Precision Downhole Pump Reciprocation
    if (!isOperating || spm <= 0 || isSoak || isInjection) {
      if (rodStringGroupRef.current) rodStringGroupRef.current.position.y = 0;
      if (plungerRef.current) plungerRef.current.position.y = -9.38;
      if (oilFlowMatRef.current) oilFlowMatRef.current.uniforms.uPlungerY.value = -9.10;
      return;
    }

    // Compute exact four-bar linkage kinematics matching the surface pumpjack
    const kinematics = computeFourBarKinematics(
      time,
      spm,
      strokeLengthM,
      isRodFloating,
      rodLagFactor
    );

    // Subsurface vertical displacement reads DIRECTLY from FrontEnd(t).y:
    // FrontEnd(t) is the exact horsehead cable attachment point.
    // Scaled to subsurface depth units (bounded within the 1.08m barrel liner):
    const verticalDisp = kinematics.subsurfaceVerticalDisp;

    if (rodStringGroupRef.current) {
      rodStringGroupRef.current.position.y = verticalDisp;
    }

    const currentPlungerY = kinematics.downholePlungerY;
    if (plungerRef.current) {
      plungerRef.current.position.y = currentPlungerY;
    }

    // Dynamic fluid column origin: oil emerges from the top of the rising plunger!
    if (oilFlowMatRef.current) {
      oilFlowMatRef.current.uniforms.uPlungerY.value = currentPlungerY + 0.35;
    }

    // Exact stroke velocity phase from kinematic derivative:
    // isUpstroke: true when FrontEnd(t).y is rising (lifting fluid column)
    // isUpstroke: false when FrontEnd(t).y is descending (plunger passing through fluid)
    const isUpstroke = kinematics.isUpstroke;

    // SNAPPY VALVE-ACTION KINEMATICS (Blueprint Sheet 1 & 2):
    // Upstroke:
    //   - Traveling Valve (TV) Ball snaps down onto seat (0.035) -> seals fluid above plunger so it gets lifted
    //   - Standing Valve (SV) Ball snaps up into cage (0.105) -> opens to draw fresh oil from reservoir into barrel
    // Downstroke:
    //   - Traveling Valve (TV) Ball snaps up into cage (0.100) -> opens to let fluid pass through descending plunger
    //   - Standing Valve (SV) Ball snaps down onto seat (0.038) -> closes to seal against reservoir backflow
    const targetTvBallY = isUpstroke ? 0.035 : 0.100;
    const targetSvBallY = isUpstroke ? 0.105 : 0.038;

    // High-speed mechanical snap response (0.55 lerp factor per frame)
    if (travelingValveBallRef.current) {
      travelingValveBallRef.current.position.y = THREE.MathUtils.lerp(
        travelingValveBallRef.current.position.y,
        targetTvBallY,
        0.55
      );
    }

    if (standingValveBallRef.current) {
      standingValveBallRef.current.position.y = THREE.MathUtils.lerp(
        standingValveBallRef.current.position.y,
        targetSvBallY,
        0.55
      );
    }
  });

  const isSelectedWellbore = selectedComponent === 'wellbore';
  const isSelectedRods = selectedComponent === 'rodString';
  const isSelectedPump = selectedComponent === 'downholePump';

  // Conduit layout coordinates at 115° azimuth
  const conduitAngle = 2.0;
  const cosC = Math.cos(conduitAngle);
  const sinC = Math.sin(conduitAngle);
  const tanX = -sinC;
  const tanZ = cosC;
  const cDist = 0.385;
  const cBaseX = cosC * cDist;
  const cBaseZ = sinC * cDist;

  return (
    <group position={[2.8, 0, 0]}>
      {/* =========================================================================
          DEPTH CALLOUT BADGES (Anchored at exact Rajasthan depths)
          ========================================================================= */}
      {cameraView === 'wellbore' && (
        <group position={[1.35, 0, 0]}>
          {/* Caprock ~300m */}
          <group position={[0, -3.05, 0]}>
            <mesh position={[-0.4, 0, 0]}>
              <boxGeometry args={[0.7, 0.02, 0.02]} />
              <meshStandardMaterial color={PIPE_COLORS.conduit} />
            </mesh>
            <Html position={[0, 0, 0]} center distanceFactor={14}>
              <div style={{
                background: 'rgba(20, 26, 36, 0.92)',
                border: '1px solid rgba(130, 165, 201, 0.4)',
                borderRadius: '4px',
                padding: '3px 7px',
                color: '#fbf9f5',
                fontSize: '10px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }}>
                <strong style={{ color: '#fbbf24' }}>300m</strong> — Caprock Formation
              </div>
            </Html>
          </group>

          {/* Intermediate Casing Shoe ~750m */}
          <group position={[0, -7.50, 0]}>
            <mesh position={[-0.4, 0, 0]}>
              <boxGeometry args={[0.7, 0.02, 0.02]} />
              <meshStandardMaterial color={PIPE_COLORS.conduit} />
            </mesh>
            <Html position={[0, 0, 0]} center distanceFactor={14}>
              <div style={{
                background: 'rgba(20, 26, 36, 0.92)',
                border: '1px solid rgba(130, 165, 201, 0.4)',
                borderRadius: '4px',
                padding: '3px 7px',
                color: '#fbf9f5',
                fontSize: '10px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }}>
                <strong style={{ color: '#38bdf8' }}>750m</strong> — Intermediate Casing Shoe
              </div>
            </Html>
          </group>

          {/* Jodhpur Sandstone Pay ~1150m */}
          <group position={[0, -11.55, 0]}>
            <mesh position={[-0.4, 0, 0]}>
              <boxGeometry args={[0.7, 0.02, 0.02]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <Html position={[0, 0, 0]} center distanceFactor={14}>
              <div style={{
                background: 'rgba(20, 26, 36, 0.94)',
                border: '1px solid #ea580c',
                borderRadius: '4px',
                padding: '3px 7px',
                color: '#fbf9f5',
                fontSize: '10px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.5)',
                pointerEvents: 'none'
              }}>
                <strong style={{ color: '#f87171' }}>1150m</strong> — Jodhpur Sandstone Pay
              </div>
            </Html>
          </group>
        </group>
      )}

      {/* =========================================================================
          MODULE: PROMINENT STEEL PRODUCTION INNER PIPE & ROD STRING (0.0 to -9.28m)
          Substantial, heavy-duty alloy steel production tubing column with realistic
          brushed steel & lathe-turned texture, heavy box-and-pin couplings, corrugated
          ring sleeves, and centralizer stabilizer blades.
          Renders 100% solid and distinct with high contrast in X-Ray view.
          renderOrder={1} — Rendered first into depth buffer
          ========================================================================= */}
      <group
        ref={rodStringGroupRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('rodString');
        }}
        cursor="pointer"
        renderOrder={1}
      >
        {Array.from({ length: 18 }).map((_, i) => {
          const segH = 9.28 / 18;
          const segCenterY = -i * segH - segH / 2;
          const hasCentralizer = i % 3 === 1;

          return (
            <group key={i} position={[0, segCenterY, 0]}>
              {/* 1. Main Prominent Steel Production Pipe Body with Anisotropic Brushed Grain & Specular Reflection */}
              <mesh material={innerSteelMaterial}>
                <cylinderGeometry args={[RAD.innerPipe, RAD.innerPipe, segH * 0.92, 32, 1, false]} />
              </mesh>

              {/* 2. Heavy Machined Box-and-Pin Coupling Collar Sleeve in Dark Antique Brass */}
              <group position={[0, segH * 0.46, 0]}>
                <mesh material={innerCollarMaterial}>
                  <cylinderGeometry args={[RAD.innerCollar, RAD.innerCollar, 0.075, 32]} />
                </mesh>
                {/* Top and Bottom Machined 45° Lead-in Chamfers in Dark Burnished Brass */}
                <mesh position={[0, 0.043, 0]} material={innerChamferMaterial}>
                  <cylinderGeometry args={[RAD.innerPipe, RAD.innerCollar, 0.012, 32, 1, true]} />
                </mesh>
                <mesh position={[0, -0.043, 0]} material={innerChamferMaterial}>
                  <cylinderGeometry args={[RAD.innerCollar, RAD.innerPipe, 0.012, 32, 1, true]} />
                </mesh>
              </group>

              {/* 3. API Centralizer Stabilizer Blades (Every 3rd Segment) */}
              {hasCentralizer && (
                <group position={[0, 0, 0]}>
                  {Array.from({ length: 4 }).map((_, fIdx) => {
                    const angle = (fIdx / 4) * Math.PI * 2;
                    const rMid = (RAD.innerPipe + 0.20) / 2;
                    return (
                      <mesh
                        key={`cent_${fIdx}`}
                        position={[Math.cos(angle) * rMid, 0, Math.sin(angle) * rMid]}
                        rotation={[0, -angle, 0]}
                        material={innerCentralizerMaterial}
                      >
                        <boxGeometry args={[0.20 - RAD.innerPipe, segH * 0.40, 0.018]} />
                      </mesh>
                    );
                  })}
                </group>
              )}
            </group>
          );
        })}
      </group>

      {/* =========================================================================
          DOWNHOLE PUMP RECIPROCATING ASSEMBLY (Inside Barrel at y = -8.65 to -10.32)
          Blueprint SRP-BH-001 Sheet 1 & 2: Barrel, Plunger, Cages, Valves, Gas Separator
          renderOrder={1}
          ========================================================================= */}
      <group
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('downholePump');
        }}
        cursor="pointer"
        renderOrder={2}
      >
        {/* --- FIXED COMPONENT 1: PRECISION NITRIDED WC-Co BARREL LINER (-8.86 to -9.94) --- */}
        {/* Blueprint: 0.001" fit tolerance against plunger (Liner ID = 0.265, Plunger OD = 0.255) */}
        {/* Cutaway window faces camera (+Z) with thetaStart = Math.PI * 0.33, thetaLength = Math.PI * 1.34 */}
        <group position={[0, -9.40, 0]}>
          {/* Main Nitrided WC-Co Ceramic Wear Liner Outer Sleeve */}
          <mesh material={pumpMaterials.barrelOuter}>
            <cylinderGeometry args={[0.305, 0.305, 1.10, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>

          {/* Precision Honed Inner Bore Surface */}
          <mesh material={pumpMaterials.barrelInner}>
            <cylinderGeometry args={[0.265, 0.265, 1.10, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>

          {/* Upper Lead-in Chamfer Collar */}
          <mesh position={[0, 0.55, 0]} material={pumpMaterials.barrelCollar}>
            <cylinderGeometry args={[0.305, 0.265, 0.03, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>

          {/* Lower Barrel Seat Bushing */}
          <mesh position={[0, -0.55, 0]} material={pumpMaterials.barrelCollar}>
            <cylinderGeometry args={[0.265, 0.305, 0.03, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>
        </group>

        {/* --- FIXED COMPONENT 2: GAS SEPARATOR WITH HELICAL VORTEX VANE (-8.65 to -8.87) --- */}
        <group position={[0, -8.76, 0]}>
          {/* Separator Outer Wear Sleeve with Front Cutaway */}
          <mesh material={pumpMaterials.separatorOuter}>
            <cylinderGeometry args={[0.315, 0.315, 0.24, 32, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>
          {/* Central Vortex Core Shaft */}
          <mesh material={pumpMaterials.vortexShaft}>
            <cylinderGeometry args={[0.048, 0.048, 0.24, 20]} />
          </mesh>
          {/* Internal Helical Swirl Vortex Vane */}
          <mesh geometry={vortexVaneGeometry} scale={[1.2, 1.08, 1.2]} material={pumpMaterials.vortexVane} />
        </group>

        {/* --- FIXED COMPONENT 3: STATIONARY STANDING VALVE (SV) AT BOTTOM OF BARREL (-9.92) --- */}
        <group position={[0, -9.92, 0]}>
          {/* Conical Valve Seat Body */}
          <mesh position={[0, -0.02, 0]} material={pumpMaterials.seatBronze}>
            <cylinderGeometry args={[0.15, 0.24, 0.08, 32, 1, true]} />
          </mesh>
          {/* 45° Precision Ground Seat Chamfer */}
          <mesh position={[0, 0.02, 0]} material={pumpMaterials.seatChamfer}>
            <cylinderGeometry args={[0.10, 0.065, 0.03, 32, 1, true]} />
          </mesh>

          {/* Finned Standing Valve Cage (4 vertical cage prongs forming open basket) */}
          {Array.from({ length: 4 }).map((_, cIdx) => {
            const cAngle = (cIdx / 4) * Math.PI * 2;
            const cx = Math.sin(cAngle) * 0.095;
            const cz = Math.cos(cAngle) * 0.095;
            return (
              <mesh key={cIdx} position={[cx, 0.060, cz]} material={pumpMaterials.valveCage}>
                <cylinderGeometry args={[0.009, 0.009, 0.12, 12]} />
              </mesh>
            );
          })}
          {/* Top Retainer Crown Ring */}
          <mesh position={[0, 0.12, 0]} material={pumpMaterials.valveCage}>
            <cylinderGeometry args={[0.098, 0.098, 0.018, 32, 1, true]} />
          </mesh>

          {/* Snappy Tungsten-Carbide Standing Valve Ball (r = 0.072) */}
          <mesh ref={standingValveBallRef} position={[0, 0.038, 0]} material={pumpMaterials.valveBall}>
            <sphereGeometry args={[0.072, 32, 32]} />
          </mesh>
        </group>

        {/* --- FIXED COMPONENT 4: PUMP INTAKE SUCTION STRAINER (-10.02 to -10.32) --- */}
        <group position={[0, -10.16, 0]}>
          {/* Central Suction Dip Tube */}
          <mesh material={pumpMaterials.strainer}>
            <cylinderGeometry args={[0.13, 0.13, 0.36, 32, 1, true]} />
          </mesh>
          {/* Fluid Intake Ingress Collar */}
          <mesh position={[0, -0.16, 0]} material={pumpMaterials.strainerCollar}>
            <cylinderGeometry args={[0.16, 0.13, 0.05, 32, 1, true]} />
          </mesh>
        </group>

        {/* --- MOVING ASSEMBLY: RECIPROCATING SPRAY-METAL PLUNGER & TRAVELING VALVE --- */}
        {/* Inherits SPM reciprocation, strictly bounded inside the barrel liner */}
        <group ref={plungerRef} position={[0, -9.38, 0]}>
          {/* 1. Sucker Rod Connection Pin & Upper Guide Collar */}
          <mesh position={[0, 0.40, 0]} material={pumpMaterials.plungerPin}>
            <cylinderGeometry args={[0.075, 0.095, 0.14, 24]} />
          </mesh>

          {/* 4 Radial Centralizer Fins on Rod Guide */}
          {Array.from({ length: 4 }).map((_, fIdx) => {
            const fAngle = (fIdx / 4) * Math.PI * 2;
            const fx = Math.sin(fAngle) * 0.15;
            const fz = Math.cos(fAngle) * 0.15;
            return (
              <mesh key={fIdx} position={[fx, 0.40, fz]} rotation={[0, -fAngle, 0]} material={pumpMaterials.centralizerFins}>
                <boxGeometry args={[0.012, 0.12, 0.12]} />
              </mesh>
            );
          })}

          {/* 2. Precision Spray-Metal / Cobalt-Chromium Plunger Body (0.010" clearance to barrel) */}
          <mesh position={[0, 0, 0]} material={pumpMaterials.plungerBody}>
            <cylinderGeometry args={[0.255, 0.255, 0.68, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
          </mesh>

          {/* Machined Annular Fluid-Seal Grooves (8 rings along plunger body) */}
          {[-0.24, -0.17, -0.10, -0.03, 0.04, 0.11, 0.18, 0.25].map((gy, gIdx) => (
            <mesh key={gIdx} position={[0, gy, 0]} material={pumpMaterials.sealGrooves}>
              <cylinderGeometry args={[0.257, 0.257, 0.014, 48, 1, true, Math.PI * 0.33, Math.PI * 1.34]} />
            </mesh>
          ))}

          {/* 3. Traveling Valve (TV) Inside Lower Crown of Plunger */}
          <group position={[0, -0.14, 0]}>
            {/* TV Conical Stellite Valve Seat */}
            <mesh position={[0, -0.02, 0]} material={pumpMaterials.seatBronze}>
              <cylinderGeometry args={[0.13, 0.19, 0.06, 32, 1, true]} />
            </mesh>
            <mesh position={[0, 0.015, 0]} material={pumpMaterials.seatChamfer}>
              <cylinderGeometry args={[0.095, 0.065, 0.025, 32, 1, true]} />
            </mesh>

            {/* Finned Traveling Valve Cage (4 vertical cage prongs) */}
            {Array.from({ length: 4 }).map((_, cIdx) => {
              const cAngle = (cIdx / 4) * Math.PI * 2;
              const cx = Math.sin(cAngle) * 0.090;
              const cz = Math.cos(cAngle) * 0.090;
              return (
                <mesh key={cIdx} position={[cx, 0.055, cz]} material={pumpMaterials.valveCage}>
                  <cylinderGeometry args={[0.008, 0.008, 0.11, 12]} />
                </mesh>
              );
            })}
            {/* Top Retainer Cap */}
            <mesh position={[0, 0.11, 0]} material={pumpMaterials.valveCage}>
              <cylinderGeometry args={[0.092, 0.092, 0.016, 32, 1, true]} />
            </mesh>

            {/* Snappy Tungsten-Carbide Traveling Valve Ball (r = 0.068) */}
            <mesh ref={travelingValveBallRef} position={[0, 0.035, 0]} material={pumpMaterials.valveBall}>
              <sphereGeometry args={[0.068, 32, 32]} />
            </mesh>
          </group>

          {/* Rod Float Alert Badge */}
          {isRodFloating && (
            <Html position={[0.42, 0, 0]} center distanceFactor={10}>
              <div style={{
                background: 'rgba(231, 76, 60, 0.95)',
                color: '#ffffff',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 800,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 10px rgba(231, 76, 60, 0.8)',
                pointerEvents: 'none'
              }}>
                ROD FLOAT LAG
              </div>
            </Html>
          )}
        </group>
      </group>

      {/* =========================================================================
          FLOW LAYER 1: UPWARD GLOSSY AMBER OIL FLOW (Continuous Cylinder Inside Tubing)
          renderOrder={3}, depthWrite={false}
          Continuous moving amber/brown bands scrolling upward with meniscus ripple
          ========================================================================= */}
      <mesh
        position={[0, -5.91, 0]}
        renderOrder={3}
        visible={pipeViewMode === 'xray'}
      >
        <cylinderGeometry
          args={[
            0.32,
            0.32,
            11.82,
            48,
            64,
            true,
            pipeViewMode === 'xray' ? Math.PI * 0.33 : 0,
            pipeViewMode === 'xray' ? Math.PI * 1.34 : Math.PI * 2
          ]}
        />
        <shaderMaterial
          ref={oilFlowMatRef}
          vertexShader={oilFlowVertexShader}
          fragmentShader={oilFlowFragmentShader}
          uniforms={oilFlowUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      {/* FLOW LAYER 2: (Glint capsules removed per user request) */}

      {/* =========================================================================
          FLOW LAYER 3: FLUID INGRESS PARTICLES AT PERFORATIONS
          renderOrder={3}, depthWrite={false}
          ========================================================================= */}
      <points ref={ingressParticlesRef} renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={streakData.length}
            array={streakPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          color="#f59e0b"
          transparent
          opacity={0.0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* =========================================================================
          FLOW LAYER 4: DOWNWARD CYAN/WHITE STEAM INJECTION FLOW (Annular)
          renderOrder={3}, depthWrite={false}
          ========================================================================= */}
      <mesh position={[0, -6.0, 0]} renderOrder={3}>
        <cylinderGeometry
          args={[
            0.52,
            0.52,
            12.0,
            32,
            1,
            true,
            Math.PI * 0.15,
            Math.PI * 1.7
          ]}
        />
        <shaderMaterial
          ref={steamFlowMatRef}
          vertexShader={steamFlowVertexShader}
          fragmentShader={steamFlowFragmentShader}
          uniforms={steamFlowUniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* =========================================================================
          CONTINUOUS BLUEPRINT COMPLETION STRING & HEAVY INDUSTRIAL GREEBLES
          renderOrder={4}: Outer casing and string render with translucent glass in X-Ray
          openEnded: true ensures hollow pipe bore with zero horizontal disc occlusion!
          ========================================================================= */}
      <group position={[0, 0, 0]} renderOrder={4}>
        {/* Core modular completion string */}
        {assemblyStack.map((seg) => {
          const isThread = seg.type === 'thread';
          const isKnurled = seg.type === 'knurled';
          const isHazard = seg.type === 'hazard';
          const holesX = seg.holesX || 4;
          const holeR = seg.holeR || 0.040;
          const radius = seg.rTop;
          const height = seg.height;
          const key = `${seg.type}_${isThread}_${isKnurled}_${isHazard}_${holesX}_${holeR}_${radius.toFixed(3)}_${height.toFixed(3)}`;
          const mat = materialsMap[key] || materialsMap.pipe;
          const isBottomPlug = seg.id === 'bottom_bull_plug';
          const isPumpCutawaySeg = seg.id.includes('pump') || (seg.yTop <= -8.6 && seg.yBottom >= -10.35);

          return (
            <mesh key={seg.id} position={[0, seg.yCenter, 0]} material={mat}>
              <cylinderGeometry
                args={[
                  seg.rTop,
                  seg.rBottom,
                  seg.height,
                  seg.radialSegments || 64,
                  1,
                  !isBottomPlug,
                  isPumpCutawaySeg ? Math.PI * 0.40 : 0,
                  isPumpCutawaySeg ? Math.PI * 1.20 : Math.PI * 2
                ]}
              />
            </mesh>
          );
        })}

        {/* =========================================================================
            GREEBLE 1: 6 HEAVY ARMOR SHROUD SLEEVES (Overlapping Joint Vertebrae)
            ========================================================================= */}
        {armorShrouds.map((s) => (
          <group key={s.key} position={[0, s.y, 0]}>
            {/* Outer heavy armor sleeve */}
            <mesh material={materialsMap.shroud || materialsMap.pipe}>
              <cylinderGeometry
                args={[
                  s.r,
                  s.r,
                  s.height,
                  48,
                  1,
                  true,
                  s.isCutaway ? Math.PI * 0.40 : 0,
                  s.isCutaway ? Math.PI * 1.20 : Math.PI * 2
                ]}
              />
            </mesh>
            {/* Upper and lower machined bevel collars */}
            <mesh position={[0, s.height * 0.49, 0]} material={materialsMap.chamfer}>
              <cylinderGeometry
                args={[
                  s.r * 0.97,
                  s.r,
                  0.016,
                  48,
                  1,
                  true,
                  s.isCutaway ? Math.PI * 0.40 : 0,
                  s.isCutaway ? Math.PI * 1.20 : Math.PI * 2
                ]}
              />
            </mesh>
            <mesh position={[0, -s.height * 0.49, 0]} material={materialsMap.chamfer}>
              <cylinderGeometry
                args={[
                  s.r,
                  s.r * 0.97,
                  0.016,
                  48,
                  1,
                  true,
                  s.isCutaway ? Math.PI * 0.40 : 0,
                  s.isCutaway ? Math.PI * 1.20 : Math.PI * 2
                ]}
              />
            </mesh>
            {/* Longitudinal structural reinforcement ribs (skip front window if cutaway) */}
            {Array.from({ length: s.ribs }).map((_, rIdx) => {
              const rAngle = (rIdx / s.ribs) * Math.PI * 2;
              // If cutaway sleeve, omit ribs facing the front window (+Z)
              if (s.isCutaway && Math.cos(rAngle) > 0.1) return null;
              const ribX = Math.sin(rAngle) * (s.r + 0.012);
              const ribZ = Math.cos(rAngle) * (s.r + 0.012);
              return (
                <mesh
                  key={rIdx}
                  position={[ribX, 0, ribZ]}
                  rotation={[0, -rAngle, 0]}
                  material={materialsMap.shroud}
                >
                  <boxGeometry args={[0.024, s.height * 0.88, 0.026]} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* =========================================================================
            GREEBLE 2: PROMINENT FLANGE STUDS & BOLT HARDWARE (InstancedMesh)
            Detailed compound geometry: Washer + Heavy Hex Nut + Crown + Stud + Root
            ========================================================================= */}
        <instancedMesh
          ref={boltInstancedRef}
          geometry={detailedBoltGeometry}
          args={[null, null, boltHardware.length]}
          material={materialsMap.bolt || materialsMap.pipe}
        />

        {/* =========================================================================
            GREEBLE 3: 3 CONTINUOUS PARALLEL CONDUIT RUNS (Hydraulic / TEC / Tracer)
            ========================================================================= */}
        <group position={[0, -5.75, 0]}>
          {/* Line A: 1/2" Stainless Hydraulic Control Line */}
          <mesh position={[cBaseX, 0, cBaseZ]} material={materialsMap.conduit}>
            <cylinderGeometry args={[0.014, 0.014, 11.5, 8, 1, true]} />
          </mesh>
          {/* Line B: 3/8" Tubing Encased Conductor (TEC) Electrical Line */}
          <mesh position={[cBaseX + tanX * 0.028, 0, cBaseZ + tanZ * 0.028]} material={materialsMap.conduit}>
            <cylinderGeometry args={[0.011, 0.011, 11.5, 8, 1, true]} />
          </mesh>
          {/* Line C: 1/4" Chemical / Thermal Tracer Capillary Line */}
          <mesh position={[cBaseX - tanX * 0.026, 0, cBaseZ - tanZ * 0.026]} material={materialsMap.conduit}>
            <cylinderGeometry args={[0.009, 0.009, 11.5, 8, 1, true]} />
          </mesh>
        </group>

        {/* =========================================================================
            GREEBLE 4: 16 CONDUIT BRACKET CLAMPS (InstancedMesh)
            ========================================================================= */}
        <instancedMesh
          ref={bracketInstancedRef}
          args={[null, null, bracketHardware.length]}
          material={materialsMap.bracket || materialsMap.pipe}
        >
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>

        {/* =========================================================================
            GREEBLE 6: 2 HEAVY CAST INDUSTRIAL JUNCTION / TERMINATION BOXES
            ========================================================================= */}
        {/* Landmark 1: Surface / Wellhead Telemetry Splice Box */}
        <group
          position={[cBaseX + 0.015, -1.25, cBaseZ + 0.015]}
          rotation={[0, -conduitAngle + Math.PI / 2, 0]}
        >
          {/* Cast housing body */}
          <mesh material={materialsMap.junction_box}>
            <boxGeometry args={[0.13, 0.17, 0.075]} />
          </mesh>
          {/* Raised beveled lid */}
          <mesh position={[0, 0, 0.042]} material={materialsMap.junction_box}>
            <boxGeometry args={[0.14, 0.18, 0.018]} />
          </mesh>
          {/* 4 corner hex screws */}
          {[-0.052, 0.052].map((sx) =>
            [-0.072, 0.072].map((sy) => (
              <mesh key={`${sx}_${sy}`} position={[sx, sy, 0.052]} material={materialsMap.bolt}>
                <cylinderGeometry args={[0.007, 0.007, 0.014, 6]} />
              </mesh>
            ))
          )}
          {/* Top and bottom brass conduit entry glands */}
          <mesh position={[0, 0.095, 0]} material={materialsMap.bolt}>
            <cylinderGeometry args={[0.016, 0.016, 0.035, 8]} />
          </mesh>
          <mesh position={[0, -0.095, 0]} material={materialsMap.bolt}>
            <cylinderGeometry args={[0.016, 0.016, 0.035, 8]} />
          </mesh>
        </group>

        {/* Landmark 2: Downhole Telemetry Quartz Interface Terminal Box */}
        <group
          position={[cBaseX + 0.015, -8.65, cBaseZ + 0.015]}
          rotation={[0, -conduitAngle + Math.PI / 2, 0]}
        >
          <mesh material={materialsMap.junction_box}>
            <boxGeometry args={[0.13, 0.17, 0.075]} />
          </mesh>
          <mesh position={[0, 0, 0.042]} material={materialsMap.junction_box}>
            <boxGeometry args={[0.14, 0.18, 0.018]} />
          </mesh>
          {[-0.052, 0.052].map((sx) =>
            [-0.072, 0.072].map((sy) => (
              <mesh key={`${sx}_${sy}`} position={[sx, sy, 0.052]} material={materialsMap.bolt}>
                <cylinderGeometry args={[0.007, 0.007, 0.014, 6]} />
              </mesh>
            ))
          )}
          <mesh position={[0, 0.095, 0]} material={materialsMap.bolt}>
            <cylinderGeometry args={[0.016, 0.016, 0.035, 8]} />
          </mesh>
          <mesh position={[0, -0.095, 0]} material={materialsMap.bolt}>
            <cylinderGeometry args={[0.016, 0.016, 0.035, 8]} />
          </mesh>
        </group>

        {/* =========================================================================
            GREEBLE 5: 4 INDUSTRIAL VALVE HANDWHEELS WITH SPOKES & MOUNTING STEMS
            ========================================================================= */}
        {valveHardware.map((v) => (
          <group key={v.key}>
            {/* Valve Mounting Body / Boss */}
            <mesh position={v.bodyPos} rotation={v.bodyRot} material={materialsMap.valve || materialsMap.pipe}>
              <cylinderGeometry args={[0.042, 0.050, 0.10, 16]} />
            </mesh>
            {/* Machined Spindle / Stem */}
            <mesh position={v.bodyPos} rotation={v.bodyRot} material={materialsMap.valve_trim || materialsMap.pipe}>
              <cylinderGeometry args={[0.016, 0.016, v.stemLen, 12]} />
            </mesh>
            {/* Handwheel Hub */}
            <mesh position={v.wheelPos} rotation={v.wheelRot} material={materialsMap.valve || materialsMap.pipe}>
              <cylinderGeometry args={[0.026, 0.026, 0.020, 16]} />
            </mesh>
            {/* Handwheel Outer Rim */}
            <mesh position={v.wheelPos} rotation={v.wheelRot} material={materialsMap.valve || materialsMap.pipe}>
              <torusGeometry args={[v.wheelR, 0.012, 12, 32]} />
            </mesh>
            {/* Handwheel Spokes */}
            {[0, Math.PI / 2].map((spokeAngle, sIdx) => (
              <mesh
                key={sIdx}
                position={v.wheelPos}
                rotation={[v.wheelRot[0], v.wheelRot[1], v.wheelRot[2] + spokeAngle]}
                material={materialsMap.valve || materialsMap.pipe}
              >
                <boxGeometry args={[v.wheelR * 1.9, 0.010, 0.010]} />
              </mesh>
            ))}
          </group>
        ))}

        {/* =========================================================================
            EDGE DETAILING: MACHINED HIGHLIGHT CHAMFER BEVEL RINGS AT COLLAR RIMS
            ========================================================================= */}
        {chamferRims.map((c) => (
          <mesh
            key={c.key}
            position={c.pos}
            material={materialsMap.chamfer || materialsMap.pipe}
          >
            <cylinderGeometry
              args={[c.rTop, c.rBottom, c.height, c.radialSegments || 64, 1, true]}
            />
          </mesh>
        ))}

        {/* =========================================================================
            EDGE DETAILING: THIN RAISED WELD-SEAM BEADS (BLUE-GREY HEAT TINT)
            ========================================================================= */}
        {weldBeads.map((w) => (
          <mesh
            key={w.key}
            position={[0, w.y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materialsMap.weld || materialsMap.pipe}
          >
            <torusGeometry args={[w.r, 0.009, 8, 48]} />
          </mesh>
        ))}

        {/* =========================================================================
            LANDMARK DOWNHOLE TELEMETRY SENSOR SUB (Sapphire Port & TEC Cable Channel)
            ========================================================================= */}
        <group position={[0, -8.80, 0]}>
          {/* Machined Transducer Bezel Ring */}
          <mesh
            position={[0, 0, 0.480 + 0.012]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materialsMap.sensor_bezel || materialsMap.pipe}
          >
            <cylinderGeometry args={[0.058, 0.058, 0.024, 24]} />
          </mesh>

          {/* Sapphire Optical Sensor Lens with Active Telemetry Heartbeat */}
          <mesh
            position={[0, 0, 0.480 + 0.020]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.040, 0.040, 0.018, 24]} />
            <meshStandardMaterial
              ref={sensorLensMatRef}
              color={currentTempC > 150 ? '#f59e0b' : '#38bdf8'}
              emissive={currentTempC > 150 ? '#d97706' : '#0284c7'}
              emissiveIntensity={0.85}
              roughness={0.12}
              metalness={0.92}
            />
          </mesh>

          {/* Downhole TEC Capillary Cable Channel */}
          <mesh
            position={[0, 0, -0.480]}
            material={materialsMap.pipe}
          >
            <boxGeometry args={[0.048, 0.54, 0.038]} />
          </mesh>
        </group>

        {/* =========================================================================
            REAL 3D GEOMETRIC HOLE CAVITY SOCKETS (Shadowed recessed cylindrical walls!)
            ========================================================================= */}
        <group>
          {holeSockets.map((s) => (
            <mesh key={s.key} position={s.pos} rotation={s.rot}>
              <cylinderGeometry args={[s.radius, s.radius * 0.92, s.depth, 16]} />
              <meshStandardMaterial
                color={PIPE_COLORS.holeSocket}
                metalness={PIPE_PBR.bolt.metalness}
                roughness={0.72}
                transparent={pipeViewMode === 'xray'}
                opacity={pipeViewMode === 'xray' ? 0.38 : 1.0}
                depthWrite={pipeViewMode !== 'xray'}
              />
            </mesh>
          ))}
        </group>

        {/* =========================================================================
            PROMINENT METALLIC SURFACE CONDUCTOR CASING CONE & FOUNDATION SHROUD
            Heavy API 6A/16A tapered transition bell with gusset stiffeners & anchor studs
            ========================================================================= */}
        <group position={[0, 0, 0]}>
          {/* 1. Heavy Top Foundation Anchor Ring (Embeds flush into concrete pad underside) */}
          <mesh position={[0, -0.015, 0]} material={materialsMap.flange || materialsMap.pipe}>
            <cylinderGeometry args={[1.12, 1.12, 0.050, 48]} />
          </mesh>
          <mesh position={[0, 0.005, 0]} material={materialsMap.chamfer || materialsMap.pipe}>
            <cylinderGeometry args={[1.15, 1.12, 0.015, 48, 1, true]} />
          </mesh>

          {/* 16 Heavy Anchor Studs on Upper Flange */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const r = 1.02;
            return (
              <mesh
                key={`cone_stud_${i}`}
                position={[Math.cos(angle) * r, -0.045, Math.sin(angle) * r]}
                material={materialsMap.bolt || materialsMap.pipe}
              >
                <cylinderGeometry args={[0.024, 0.024, 0.038, 6]} />
              </mesh>
            );
          })}

          {/* 2. Main Prominent Metallic Conical Transition Bell */}
          <mesh position={[0, -0.19, 0]} material={materialsMap.flange || materialsMap.pipe}>
            <cylinderGeometry args={[1.02, 0.59, 0.30, 48, 1, false]} />
          </mesh>

          {/* Upper Machined Bevel Ring */}
          <mesh position={[0, -0.045, 0]} material={materialsMap.chamfer || materialsMap.pipe}>
            <cylinderGeometry args={[1.05, 1.01, 0.025, 48, 1, true]} />
          </mesh>

          {/* Mid-Cone Circumferential Reinforcement Collar Rib */}
          <mesh position={[0, -0.19, 0]} material={materialsMap.hardware || materialsMap.pipe}>
            <cylinderGeometry args={[0.85, 0.83, 0.038, 48]} />
          </mesh>
          <mesh position={[0, -0.17, 0]} material={materialsMap.chamfer || materialsMap.pipe}>
            <cylinderGeometry args={[0.86, 0.85, 0.012, 48, 1, true]} />
          </mesh>
          <mesh position={[0, -0.21, 0]} material={materialsMap.chamfer || materialsMap.pipe}>
            <cylinderGeometry args={[0.83, 0.84, 0.012, 48, 1, true]} />
          </mesh>

          {/* Lower Heavy Locking Collar with Radial Clamp Hex Bolts */}
          <mesh position={[0, -0.35, 0]} material={materialsMap.flange || materialsMap.pipe}>
            <cylinderGeometry args={[0.64, 0.64, 0.045, 48]} />
          </mesh>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const r = 0.65;
            return (
              <mesh
                key={`clamp_bolt_${i}`}
                position={[Math.cos(angle) * r, -0.35, Math.sin(angle) * r]}
                rotation={[0, -angle, Math.PI / 2]}
                material={materialsMap.bolt || materialsMap.pipe}
              >
                <cylinderGeometry args={[0.018, 0.018, 0.032, 6]} />
              </mesh>
            );
          })}

          {/* 3. 8 Heavy Welded Structural Gusset Plates (Stiffener Fins) */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={`gusset_${i}`}
                geometry={conductorGussetGeometry}
                position={[0, -0.04, 0]}
                rotation={[0, -angle, 0]}
                material={materialsMap.hardware || materialsMap.pipe}
              />
            );
          })}

          {/* 4. Equipment Specification Nameplate Badge (API 6A Wellhead Conductor Housing) */}
          <group position={[0, -0.19, 0.865]} rotation={[-0.48, 0, 0]}>
            <mesh material={materialsMap.chamfer || materialsMap.pipe}>
              <boxGeometry args={[0.28, 0.11, 0.016]} />
            </mesh>
            {/* 4 Corner Rivet Studs */}
            {[[-0.12, -0.038], [0.12, -0.038], [-0.12, 0.038], [0.12, 0.038]].map(([rx, ry], rIdx) => (
              <mesh key={`rivet_${rIdx}`} position={[rx, ry, 0.010]} material={materialsMap.bolt || materialsMap.pipe}>
                <cylinderGeometry args={[0.007, 0.007, 0.008, 8]} rotation={[Math.PI / 2, 0, 0]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* =========================================================================
          LAYER: OUTER CASING (7" Cylinder with Front Longitudinal Cutaway Window)
          renderOrder={5}
          ========================================================================= */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('wellbore');
        }}
        cursor="pointer"
        renderOrder={5}
      >
        <mesh position={[0, -6.0, 0]}>
          <cylinderGeometry
            args={[
              RAD.casing,
              RAD.casing,
              12.0,
              64,
              1,
              true,
              Math.PI * 0.40, // Back-wall coverage from 72° to 288°, front open!
              Math.PI * 1.20
            ]}
          />
          <meshStandardMaterial
            color={isSelectedWellbore ? '#38bdf8' : (pipeViewMode === 'xray' ? '#93c5fd' : PIPE_COLORS.casingOuter)}
            transparent={pipeViewMode === 'xray'}
            opacity={pipeViewMode === 'xray' ? 0.22 : 1.0}
            metalness={pipeViewMode === 'xray' ? 0.25 : PIPE_PBR.casingOuter.metalness}
            roughness={pipeViewMode === 'xray' ? 0.015 : PIPE_PBR.casingOuter.roughness}
            side={THREE.DoubleSide}
            depthWrite={pipeViewMode !== 'xray'}
          />
        </mesh>
      </group>
    </group>
  );
}
