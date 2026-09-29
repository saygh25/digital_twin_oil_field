import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * ============================================================================
 * PROCEDURAL THAR DESERT GROUND TERRAIN & WELL PAD PLATFORM (CIRCULAR PASS)
 * ============================================================================
 * 
 * 1. Geometry Footprint: Precisely matched to the top surface of the 270° cylinder:
 *    - Radius: 5.8m, Center: [X = 2.8, Z = 0.0]
 *    - Pac-Man 270° sector with 90° wedge cutaway facing camera (~70.9° azimuth)
 *    - Zero overhang over the cutaway cliff faces.
 * 2. Edge Taper: Tapers micro-elevation to 0.00m at circular perimeter and cut edges.
 * 3. Industrial Caliche Equipment Pad: Circular foundation slab matching pumpjack footprint.
 * 4. Safety Handrailing: Industrial yellow safety guardrail along curved platform edge.
 * ============================================================================
 */

const desertCommonGLSL = `
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
    mat2 rot = mat2(cos(0.52), sin(0.52), -sin(0.52), cos(0.52));
    for (int i = 0; i < 4; ++i) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(100.0);
      a *= 0.5;
    }
    return v;
  }

  // Base elevation displacement function in meters (world XZ)
  float getTerrainElevation(vec2 xz) {
    vec2 rel = xz - vec2(2.8, -3.5);
    float dist = length(rel);

    // 1. Dominant Thar wind direction: ~34 degrees azimuth
    vec2 windDir = normalize(vec2(0.829, 0.559));
    float u = dot(xz, windDir);
    float v = dot(xz, vec2(-windDir.y, windDir.x));

    // 2. Rolling macro dunes (gentle swell across the yard)
    float duneWave = sin(u * 0.15 + fbm(xz * 0.08) * 1.2) * 0.035;
    float crossSwell = cos(v * 0.12 + sin(u * 0.10)) * 0.015;
    float macroDunes = duneWave + crossSwell;

    // 3. Subtle directional wind ripples
    float rippleNoise = noise(xz * 0.6) * 0.5;
    float fineRipples = sin(u * 3.2 + rippleNoise) * 0.008;

    // 4. Equipment Pad Flattening Mask (Keep concrete pad area flat)
    float padDist = max(abs(rel.x) - 12.0, abs(rel.y) - 7.5);
    float desertWeight = smoothstep(0.0, 3.0, padDist);

    return (macroDunes + fineRipples) * desertWeight;
  }
`;

const terrainVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying float vElevation;
  varying vec2 vXZ;

  ${desertCommonGLSL}

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec2 xz = worldPos.xz;

    float elev = getTerrainElevation(xz);
    vElevation = elev;
    vXZ = xz;

    worldPos.y += elev;

    // Analytical finite-difference normal directly in WORLD COORDINATES
    float eps = 0.06;
    float hL = getTerrainElevation(xz - vec2(eps, 0.0));
    float hR = getTerrainElevation(xz + vec2(eps, 0.0));
    float hD = getTerrainElevation(xz - vec2(0.0, eps));
    float hU = getTerrainElevation(xz + vec2(0.0, eps));

    vec3 worldNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
    vWorldNormal = worldNormal;
    vWorldPosition = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const terrainFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  varying float vElevation;
  varying vec2 vXZ;

  uniform vec3 uSunDirection;

  ${desertCommonGLSL}

  void main() {
    if (!gl_FrontFacing) {
      gl_FragColor = vec4(0.25, 0.20, 0.15, 1.0);
      return;
    }

    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDirection);

    // ------------------------------------------------------------------------
    // 1. DUNE RIPPLE MICRO-BUMP NORMAL PERTURBATION
    // ------------------------------------------------------------------------
    vec2 windDir = normalize(vec2(0.829, 0.559));
    float uCoord = dot(vXZ, windDir);
    float rippleFreq = uCoord * 3.2 + noise(vXZ * 0.6) * 0.5;
    float dRipple = cos(rippleFreq) * 0.15;

    vec3 tangentWind = vec3(windDir.x, 0.0, windDir.y);
    vec3 perturbedNormal = normalize(N + tangentWind * dRipple * 0.08);

    // ------------------------------------------------------------------------
    // 2. WARM THAR DESERT COLOR PALETTE & TONAL VARIATION
    // ------------------------------------------------------------------------
    vec3 colSandTrough    = vec3(0.74, 0.60, 0.44);
    vec3 colSandMid       = vec3(0.86, 0.74, 0.56);
    vec3 colSandCrest     = vec3(0.93, 0.83, 0.66);
    vec3 colSandHighlight = vec3(0.98, 0.91, 0.76);

    float patchNoise = fbm(vXZ * 0.12);
    float macroPatch = smoothstep(0.35, 0.70, patchNoise);
    vec3 baseSand = mix(colSandTrough, colSandMid, macroPatch);

    float rippleVal = sin(rippleFreq) * 0.5 + 0.5;
    float microGrain = (noise(vXZ * 48.0) - 0.5) * 0.035;

    vec3 sandColor = mix(baseSand, colSandMid, rippleVal * 0.35);
    float rippleCrest = smoothstep(0.40, 0.90, rippleVal);
    sandColor = mix(sandColor, colSandCrest, rippleCrest * 0.30);
    sandColor += vec3(microGrain);

    // ------------------------------------------------------------------------
    // 3. SHALLOW RAKING SUN LIGHTING & WARM DUST SCATTERING
    // ------------------------------------------------------------------------
    float NdotL = dot(perturbedNormal, L);
    float wrapNdotL = clamp((NdotL + 0.32) / 1.32, 0.0, 1.0);

    vec3 sunLightColor = vec3(1.08, 0.98, 0.88);
    vec3 skyAmbientColor = vec3(0.70, 0.62, 0.50);

    vec3 diffuse = sandColor * (sunLightColor * wrapNdotL * 1.30 + skyAmbientColor * 0.50);

    vec3 V = normalize(vec3(8.0, 14.0, 12.0) - vWorldPosition);
    vec3 H = normalize(L + V);
    float spec = pow(max(0.0, dot(perturbedNormal, H)), 24.0) * 0.08;
    diffuse += colSandHighlight * spec;

    gl_FragColor = vec4(diffuse, 1.0);
  }
`;

// ----------------------------------------------------------------------------
// MAIN REACT COMPONENT: DesertGroundTerrain
// ----------------------------------------------------------------------------

export default function DesertGroundTerrain({
  cameraView = 'aerial',
  padCenterX = 2.8,
  padCenterZ = 0.0,
  radius = 6.2
}) {
  const terrainMaterialRef = useRef();
  const isTerrainVisible = !(cameraView === 'wellbore' || cameraView === 'pump' || cameraView === 'reservoir');

  // 1. Procedural Panoramic Rectangular Ground Terrain
  const { groundGeometry, desertShrubs, desertRocks } = useMemo(() => {
    const W_total = 400.0;  // 400m left to right
    const D_total = 140.0;  // 140m front-to-back depth

    // Sand ground terrain at top surface (Y = 0) centered around pad
    const groundGeo = new THREE.BoxGeometry(W_total, 0.02, D_total, 80, 1, 64);
    groundGeo.translate(0, 0.005, -5.0);
    groundGeo.computeVertexNormals();

    // Natural Desert Shrub / Vegetation Clumps scattered around the perimeter of the pad
    const shrubs = [
      { x: -14.5, z: 2.2, scale: 0.85 },
      { x: -16.0, z: -8.5, scale: 0.95 },
      { x: -13.0, z: -15.0, scale: 0.70 },
      { x: 16.5, z: 1.8, scale: 0.90 },
      { x: 18.0, z: -7.5, scale: 1.10 },
      { x: 15.5, z: -16.0, scale: 0.75 },
      { x: -6.0, z: 7.5, scale: 0.65 },
      { x: 8.0, z: 7.8, scale: 0.90 },
      { x: 0.0, z: -18.0, scale: 1.00 },
      { x: 5.5, z: -19.5, scale: 0.80 },
      { x: -11.0, z: 6.5, scale: 0.70 },
      { x: 13.0, z: 8.0, scale: 0.85 },
      { x: -18.5, z: 0.0, scale: 0.95 },
      { x: 20.0, z: -2.0, scale: 0.90 }
    ];

    // Natural desert rock clusters
    const rocks = [
      { x: -13.0, z: 4.5, scale: [0.6, 0.35, 0.5], rot: 0.4 },
      { x: 15.0, z: 4.0, scale: [0.7, 0.40, 0.6], rot: 1.2 },
      { x: -15.5, z: -4.0, scale: [0.5, 0.30, 0.4], rot: 0.8 },
      { x: 17.5, z: -12.0, scale: [0.8, 0.45, 0.7], rot: 2.1 },
      { x: -8.0, z: 8.5, scale: [0.45, 0.25, 0.4], rot: 0.3 },
      { x: 10.5, z: 8.5, scale: [0.55, 0.30, 0.5], rot: 1.7 }
    ];

    return {
      groundGeometry: groundGeo,
      desertShrubs: shrubs,
      desertRocks: rocks
    };
  }, []);

  // Clean up geometries on unmount
  React.useEffect(() => {
    return () => {
      if (groundGeometry) groundGeometry.dispose();
    };
  }, [groundGeometry]);

  const terrainUniforms = useMemo(() => ({
    uSunDirection: { value: new THREE.Vector3(-16, 12, 10).normalize() }
  }), []);

  return (
    <group position={[padCenterX, 0, padCenterZ]} visible={isTerrainVisible}>
      {/* =========================================================================
          1. PROCEDURAL RECTANGULAR DESERT GROUND MESH (Flush with Strata Top)
          ========================================================================= */}
      <mesh
        geometry={groundGeometry}
        position={[0, 0.002, 0]}
        receiveShadow
      >
        <shaderMaterial
          ref={terrainMaterialRef}
          vertexShader={terrainVertexShader}
          fragmentShader={terrainFragmentShader}
          uniforms={terrainUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* =========================================================================
          2. SCATTERED THAR ARID VEGETATION CLUMPS (Desert Shrubs)
          ========================================================================= */}
      {desertShrubs.map((shrub, idx) => (
        <group key={`shrub-${idx}`} position={[shrub.x, 0.05, shrub.z]} scale={shrub.scale}>
          <mesh position={[0, 0.18, 0]}>
            <dodecahedronGeometry args={[0.35, 1]} />
            <meshStandardMaterial
              color="#5d6b46"
              roughness={0.96}
              metalness={0.02}
            />
          </mesh>
          <mesh position={[0.15, 0.12, 0.12]}>
            <dodecahedronGeometry args={[0.25, 1]} />
            <meshStandardMaterial
              color="#6e7d4f"
              roughness={0.94}
              metalness={0.02}
            />
          </mesh>
        </group>
      ))}

      {/* =========================================================================
          3. SCATTERED DESERT ROCKS & PEBBLES
          ========================================================================= */}
      {desertRocks.map((rock, idx) => (
        <mesh
          key={`rock-${idx}`}
          position={[rock.x, 0.08, rock.z]}
          scale={rock.scale}
          rotation={[0.1, rock.rot, 0.15]}
          receiveShadow
          castShadow
        >
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial
            color="#786b59"
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
