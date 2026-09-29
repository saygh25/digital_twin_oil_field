import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * SurfaceFacilities3D.jsx
 * Full 3D Surface Production Gathering & Thermal Facilities:
 * 1. Two-Phase Production Separator Vessel (Horizontal with Saddle Supports)
 * 2. Heavy Crude Sludge / Surge Storage Tank (Vertical API 650 with Spiral Railing)
 * 3. High-Pressure Insulated Steam Injection Header & Manifold Line
 * 4. VFD Power Unit / Transformer Skid & Emergency Shutdown Manifold
 */
export default function SurfaceFacilities3D({
  oilRateBopd = 142,
  steamRateBpd = 220,
  currentTempC = 78,
  onSelectComponent,
  selectedComponent
}) {
  const steamPulseRef = useRef();

  useFrame((state) => {
    if (steamPulseRef.current) {
      const t = state.clock.getElapsedTime();
      steamPulseRef.current.intensity = 1.0 + Math.sin(t * 3.0) * 0.4;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* =========================================================================
          1. TWO-PHASE HORIZONTAL PRODUCTION SEPARATOR
          ========================================================================= */}
      <group
        position={[-4.8, 0, -2.6]}
        rotation={[0, 0.25, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('surfaceFacilities');
        }}
        cursor="pointer"
      >
        {/* Concrete Saddle Foundations */}
        <mesh position={[-0.9, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.5, 1.1]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
        <mesh position={[0.9, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.3, 0.5, 1.1]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>

        {/* Horizontal Vessel Body */}
        <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 2.4, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.3} />
        </mesh>
        {/* Dished End Caps */}
        <mesh position={[-1.2, 0.85, 0]} rotation={[0, 0, Math.PI / 2]}>
          <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.3} />
        </mesh>
        <mesh position={[1.2, 0.85, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <sphereGeometry args={[0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.3} />
        </mesh>

        {/* Top Pressure Safety Valve (PSV) Stack */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 12]} />
          <meshStandardMaterial color="#eab308" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Liquid Sight Glass Indicator */}
        <mesh position={[0.5, 0.85, 0.48]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6, 8]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.8}
            roughness={0.1}
            transmission={0.9}
          />
        </mesh>

        {/* Floating Label */}
        <Html position={[0, 2.1, 0]} center distanceFactor={14}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '4px',
              padding: '3px 6px',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '10px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            2-PHASE SEPARATOR V-101
          </div>
        </Html>
      </group>

      {/* =========================================================================
          2. VERTICAL CRUDE SLUDGE / STORAGE TANK (API 650)
          ========================================================================= */}
      <group
        position={[-6.2, 0, 2.8]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('surfaceFacilities');
        }}
        cursor="pointer"
      >
        {/* Concrete Tank Pad */}
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <cylinderGeometry args={[1.5, 1.55, 0.16, 28]} />
          <meshStandardMaterial color="#475569" roughness={0.95} />
        </mesh>
        {/* Main Cylindrical Shell */}
        <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.35, 1.35, 2.6, 28]} />
          <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.35} />
        </mesh>
        {/* Conical Roof */}
        <mesh position={[0, 2.9, 0]}>
          <coneGeometry args={[1.42, 0.4, 28]} />
          <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Spiral Ladder Railing */}
        <mesh position={[1.4, 1.45, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.6, 6]} />
          <meshStandardMaterial color="#eab308" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Level Indicator Stanchion */}
        <mesh position={[1.2, 1.45, 0.5]}>
          <boxGeometry args={[0.08, 2.0, 0.04]} />
          <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* =========================================================================
          3. HIGH-PRESSURE INSULATED STEAM INJECTION LINE
          ========================================================================= */}
      <group position={[1.2, 0.35, -2.2]}>
        {/* Insulated Steam Header (Yellow thermal jacket) */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 4.5, 16]} />
          <meshStandardMaterial
            color="#f59e0b"
            roughness={0.4}
            metalness={0.6}
            emissive="#b45309"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Steam Expansion Loop (U-Shape) */}
        <mesh position={[-1.2, 0.4, 0]}>
          <torusGeometry args={[0.35, 0.06, 12, 24, Math.PI]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Thermal Glow Point Light */}
        <pointLight
          ref={steamPulseRef}
          position={[0, 0.3, 0]}
          color="#f97316"
          intensity={1.2}
          distance={4.5}
        />

        {/* Steam Injection Control Valve Handwheel */}
        <group position={[1.2, 0.15, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#dc2626" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.025, 8, 16]} />
            <meshStandardMaterial color="#dc2626" metalness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
