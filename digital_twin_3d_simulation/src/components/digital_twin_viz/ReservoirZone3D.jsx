import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PIPE_COLORS, PIPE_PBR } from './pipeMaterialSpec';

/**
 * 3D Reservoir Zone (Jodhpur Sandstone Formation) & 2-Way Particle Stream
 * 
 * Features:
 * 1. Radial heated thermal gradient zone:
 *    - Bright orange/red core near wellbore (#ff2a00 / #ea580c)
 *    - Fading out to blue/gray (#0284c7 / #64748b) at outer edge (46-48°C baseline).
 *    - Scales with live heated_radius_m and expands during Steam Injection, fades in Soak/Late Cut-off.
 * 2. Animated Multi-Phase Particle System (Targeting 60fps):
 *    - STEAM INJECTION: Glowing particles flow DOWN tubing and radiate OUTWARD into reservoir.
 *    - THERMAL SOAK: Heat gently diffusing into formation with fading intensity.
 *    - PRODUCTION: Oil droplets flow INWARD from reservoir matrix to perforations and UP tubing.
 * 3. Sedimentary Sandstone Bedrock Strata Slab.
 */
export default function ReservoirZone3D({
  currentTempC = 76.4,
  baseReservoirTempC = 48.0,
  heatedRadiusM = 9.8,
  cssStage = 'PRODUCTION_MID', // 'INJECTION', 'SOAK', 'PRODUCTION_EARLY', 'PRODUCTION_MID', 'PRODUCTION_LATE'
  oilRateBopd = 192,
  steamRateBpd = 420,
  pipeViewMode = 'solid', // 'solid' | 'xray' | 'thermal'
  isThermalView = false,
  cameraView = 'top',
  onSelectComponent,
  selectedComponent
}) {
  const thermalCoreRef = useRef();
  const thermalMidRef = useRef();
  const thermalOuterRef = useRef();
  const steamParticlesRef = useRef();
  const oilParticlesRef = useRef();

  const RESERVOIR = useMemo(() => ({
    wellX: 2.8,
    centerY: -11.5,
    formationThickness: 3.8,
    steamParticlesCount: 140,
    oilParticlesCount: 140
  }), []);

  // Compute thermal glow color, radius scale, and intensity
  const thermalState = useMemo(() => {
    const isInjection = cssStage.includes('INJECTION');
    const isSoak = cssStage.includes('SOAK');
    const isLate = cssStage.includes('LATE');

    // Temperature above baseline
    const deltaT = Math.max(0, currentTempC - baseReservoirTempC);
    let intensity = Math.min(1.0, Math.max(0.2, deltaT / 160.0));
    
    // Scale heated radius (m) to 3D scene units
    let radiusScale = Math.max(1.2, Math.min(4.8, (heatedRadiusM / 10.0) * 3.0));

    if (isInjection) {
      intensity = 1.0;
      radiusScale = Math.max(2.2, radiusScale * 1.15);
    } else if (isSoak) {
      intensity = 0.85;
      radiusScale = radiusScale * 1.25; // heat diffuses outward
    } else if (isLate) {
      intensity = 0.35;
      radiusScale = Math.max(1.0, radiusScale * 0.8);
    }

    if (isThermalView) {
      intensity = Math.min(1.0, Math.max(0.70, intensity * 1.35));
      radiusScale = Math.max(2.0, radiusScale * 1.2);
    }

    return {
      radiusScale,
      intensity,
      isInjection,
      isSoak,
      isProduction: !isInjection && !isSoak
    };
  }, [currentTempC, baseReservoirTempC, heatedRadiusM, cssStage, isThermalView]);

  // Particle data structures
  const particleArrays = useMemo(() => {
    // 1. Steam Particles Data
    const steamPos = new Float32Array(RESERVOIR.steamParticlesCount * 3);
    const steamVels = [];
    for (let i = 0; i < RESERVOIR.steamParticlesCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      steamVels.push({
        theta,
        phi,
        progress: Math.random(),
        speed: 0.25 + Math.random() * 0.25
      });
      steamPos[i * 3] = RESERVOIR.wellX;
      steamPos[i * 3 + 1] = 0;
      steamPos[i * 3 + 2] = 0;
    }

    // 2. Oil Particles Data
    const oilPos = new Float32Array(RESERVOIR.oilParticlesCount * 3);
    const oilVels = [];
    for (let i = 0; i < RESERVOIR.oilParticlesCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.5;
      const initialR = 0.8 + Math.random() * 2.8;
      oilVels.push({
        theta,
        phi,
        initialR,
        progress: Math.random(),
        speed: 0.18 + Math.random() * 0.18
      });
      oilPos[i * 3] = RESERVOIR.wellX + initialR * Math.cos(theta);
      oilPos[i * 3 + 1] = RESERVOIR.centerY;
      oilPos[i * 3 + 2] = initialR * Math.sin(theta);
    }

    return { steamPos, steamVels, oilPos, oilVels };
  }, [RESERVOIR]);

  // Frame animation loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Pulsate Thermal Glow Spheres
    const pulse = 1.0 + 0.04 * Math.sin(time * 2.2);
    if (thermalCoreRef.current) {
      thermalCoreRef.current.scale.set(
        thermalState.radiusScale * 0.55 * pulse,
        thermalState.radiusScale * 0.45 * pulse,
        thermalState.radiusScale * 0.55 * pulse
      );
    }
    if (thermalMidRef.current) {
      thermalMidRef.current.scale.set(
        thermalState.radiusScale * 0.85 * pulse,
        thermalState.radiusScale * 0.65 * pulse,
        thermalState.radiusScale * 0.85 * pulse
      );
    }
    if (thermalOuterRef.current) {
      thermalOuterRef.current.scale.set(
        thermalState.radiusScale * 1.25 * pulse,
        thermalState.radiusScale * 0.85 * pulse,
        thermalState.radiusScale * 1.25 * pulse
      );
    }

    // 2. Animate Steam Injection Particles (Down tubing -> Radiate outward into formation)
    if (steamParticlesRef.current && thermalState.isInjection) {
      const pos = steamParticlesRef.current.geometry.attributes.position;
      for (let i = 0; i < RESERVOIR.steamParticlesCount; i++) {
        const vel = particleArrays.steamVels[i];
        vel.progress = (vel.progress + delta * vel.speed) % 1.0;
        const p = vel.progress;

        let px, py, pz;
        if (p < 0.45) {
          // Flowing down the wellbore tubing from surface (y=0) to reservoir (y=-11.5)
          const downFrac = p / 0.45;
          px = RESERVOIR.wellX + (Math.sin(time * 5 + i) * 0.05);
          py = -downFrac * 11.5;
          pz = Math.cos(time * 5 + i) * 0.05;
        } else {
          // Radiating outward into sandstone formation
          const outFrac = (p - 0.45) / 0.55;
          const r = 0.2 + outFrac * (thermalState.radiusScale * 1.1);
          px = RESERVOIR.wellX + r * Math.cos(vel.theta) * Math.cos(vel.phi);
          py = RESERVOIR.centerY + Math.sin(outFrac * Math.PI) * 0.35;
          pz = r * Math.sin(vel.theta) * Math.cos(vel.phi);
        }

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    }

    // 3. Animate Oil Production Particles (Inward from reservoir matrix -> Up the tubing)
    if (oilParticlesRef.current && thermalState.isProduction) {
      const pos = oilParticlesRef.current.geometry.attributes.position;
      for (let i = 0; i < RESERVOIR.oilParticlesCount; i++) {
        const vel = particleArrays.oilVels[i];
        vel.progress = (vel.progress + delta * vel.speed) % 1.0;
        const p = vel.progress;

        let px, py, pz;
        if (p < 0.55) {
          // Migrating inward from sandstone towards perforations
          const inFrac = 1.0 - (p / 0.55);
          const r = 0.2 + inFrac * (vel.initialR * (thermalState.radiusScale / 3.0));
          px = RESERVOIR.wellX + r * Math.cos(vel.theta) * Math.cos(vel.phi);
          py = RESERVOIR.centerY + (Math.sin(time * 2 + i) * 0.15);
          pz = r * Math.sin(vel.theta) * Math.cos(vel.phi);
        } else {
          // Flowing up through the tubing towards surface
          const upFrac = (p - 0.55) / 0.45;
          px = RESERVOIR.wellX + (Math.sin(time * 6 + i) * 0.05);
          py = RESERVOIR.centerY + upFrac * 11.5; // flows up to surface
          pz = Math.cos(time * 6 + i) * 0.05;
        }

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    }
  });

  const isSelected = selectedComponent === 'reservoir';

  return (
    <group position={[0, 0, 0]}>
      {/* =========================================================================
          Wellbore Perforation Interval (Gun-Perforated Steel Casing at Intake)
          ========================================================================= */}
      <group position={[RESERVOIR.wellX, RESERVOIR.centerY, 0]}>
        <mesh>
          <cylinderGeometry args={[0.56, 0.56, 2.0, 24]} />
          <meshStandardMaterial
            color={pipeViewMode === 'xray' ? PIPE_COLORS.casingOuter : PIPE_COLORS.baseDark}
            transparent={pipeViewMode === 'xray'}
            opacity={pipeViewMode === 'xray' ? 0.16 : 1.0}
            metalness={PIPE_PBR.casingOuter.metalness}
            roughness={PIPE_PBR.casingOuter.roughness}
            depthWrite={pipeViewMode !== 'xray'}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Perforation Ports */}
        {[-0.8, -0.4, 0.0, 0.4, 0.8].map((y, rIdx) => (
          <group key={rIdx} position={[0, y, 0]}>
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, cIdx) => (
              <mesh
                key={cIdx}
                position={[0.56 * Math.cos(angle), 0, 0.56 * Math.sin(angle)]}
                rotation={[0, -angle, 0]}
              >
                <cylinderGeometry args={[0.045, 0.045, 0.05, 8]} rotation={[0, 0, Math.PI / 2]} />
                <meshBasicMaterial
                  color={thermalState.isInjection ? '#ffffff' : '#334155'}
                  transparent={pipeViewMode === 'xray'}
                  opacity={pipeViewMode === 'xray' ? 0.65 : 1.0}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* =========================================================================
          3. RADIAL HEATED ZONE GRADIENT (Red-Hot Core -> Warm Orange -> Blue/Gray 48°C Edge)
          ========================================================================= */}
      <group
        position={[RESERVOIR.wellX, RESERVOIR.centerY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isThermalView) onSelectComponent?.('reservoir');
        }}
        cursor={isThermalView ? 'default' : 'pointer'}
        visible={!isThermalView}
      >
        {/* Inner Red-Hot Core (~260°C near wellbore) */}
        <mesh ref={thermalCoreRef}>
          <sphereGeometry args={[1.0, 24, 24]} />
          <meshStandardMaterial
            color="#ff2a00"
            emissive="#ff2a00"
            emissiveIntensity={1.0 * thermalState.intensity}
            transparent
            opacity={0.65 * thermalState.intensity}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>

        {/* Middle Warm Orange Halo (100°C - 180°C) */}
        <mesh ref={thermalMidRef}>
          <sphereGeometry args={[1.5, 24, 24]} />
          <meshStandardMaterial
            color="#ea580c"
            emissive="#ea580c"
            emissiveIntensity={0.65 * thermalState.intensity}
            transparent
            opacity={0.35 * thermalState.intensity}
            roughness={0.3}
            depthWrite={false}
          />
        </mesh>

        {/* Outer Dissipation Edge Fading to Blue/Gray (46°C - 48°C ambient reservoir) */}
        <mesh ref={thermalOuterRef}>
          <sphereGeometry args={[2.0, 24, 24]} />
          <meshStandardMaterial
            color={isSelected ? '#38bdf8' : '#0284c7'}
            emissive={isSelected ? '#0284c7' : '#0369a1'}
            emissiveIntensity={0.35 * thermalState.intensity}
            transparent
            opacity={0.18 * thermalState.intensity}
            roughness={0.5}
            depthWrite={false}
          />
        </mesh>

        {/* Torus Thermal Front Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[thermalState.radiusScale * 0.9, 0.08, 12, 32]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.7 * thermalState.intensity}
            transparent
            opacity={0.5 * thermalState.intensity}
          />
        </mesh>

        {/* Floating Reservoir HUD Badge (only in underground / reservoir views) */}
        {(cameraView === 'underground' || cameraView === 'wellbore' || cameraView === 'reservoir') && (
          <Html position={[2.4, -0.4, 0]} center distanceFactor={14}>
            <div className="reservoir-thermal-badge" style={{
              background: 'rgba(36, 30, 24, 0.94)',
              border: `1px solid ${thermalState.isInjection ? '#f97316' : 'rgba(16, 185, 129, 0.6)'}`,
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#f8fafc',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none'
            }}>
              <div style={{ fontWeight: 800, color: '#fed7aa' }}>
                JODHPUR SANDSTONE PAY (1,150m)
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px', color: '#cbd5e1' }}>
                <span>Temp: <strong style={{ color: '#f87171' }}>{currentTempC.toFixed(1)}°C</strong></span>
                <span>Heated R: <strong style={{ color: '#fbbf24' }}>{heatedRadiusM.toFixed(1)}m</strong></span>
              </div>
            </div>
          </Html>
        )}
      </group>

      {/* =========================================================================
          4. 2-WAY DYNAMIC PARTICLE STREAMS (Steam Injection vs Oil Production)
          Active in FLOW SIMULATION (X-Ray) and THERMAL view modes
          ========================================================================= */}
      {/* Steam Injection Particles (Down tubing and radiating outward) */}
      {(thermalState.isInjection || (isThermalView && cssStage.includes('INJECTION'))) && (pipeViewMode === 'xray' || isThermalView) && (
        <points ref={steamParticlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={RESERVOIR.steamParticlesCount}
              array={particleArrays.steamPos}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.18}
            color={isThermalView ? '#fef08a' : '#ffffff'}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Oil Production Particles (Inward to wellbore and up tubing) */}
      {thermalState.isProduction && (pipeViewMode === 'xray' || isThermalView) && (
        <points ref={oilParticlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={RESERVOIR.oilParticlesCount}
              array={particleArrays.oilPos}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.16}
            color={isThermalView ? '#f59e0b' : (currentTempC > 70 ? '#f59e0b' : '#991b1b')}
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}
