import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * DesertGroundTerrain.jsx
 * Procedural Thar Desert terrain, wellhead cellar pit, perimeter road,
 * and arid desert vegetation around Baghewala Wellpad DT-07.
 */
export default function DesertGroundTerrain({
  wellboreX = 2.8,
  cellarDepth = 1.8,
  padRadius = 18.0
}) {
  // 1. Concrete Cellar Pit around wellhead (Level 2 feature)
  const cellarGeometry = useMemo(() => {
    // Square concrete box cellar with open top
    const shape = new THREE.Shape();
    const halfSize = 1.1;
    shape.moveTo(-halfSize, -halfSize);
    shape.lineTo(halfSize, -halfSize);
    shape.lineTo(halfSize, halfSize);
    shape.lineTo(-halfSize, halfSize);
    shape.lineTo(-halfSize, -halfSize);

    // Inner cutout hole for wellbore
    const hole = new THREE.Path();
    const innerRadius = 0.55;
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const extrudeSettings = {
      depth: 0.15,
      bevelEnabled: false
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // 2. Procedural Arid Shrub / Bush Locations
  const vegetationInstances = useMemo(() => {
    const items = [];
    const seed = 42;
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + 0.3;
      const dist = 7.5 + (i % 5) * 1.8;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Keep away from front camera and main equipment
      if (Math.abs(x - wellboreX) > 3.0 || Math.abs(z) > 4.0) {
        items.push({
          pos: [x, 0.05, z],
          scale: 0.35 + (i % 3) * 0.15,
          color: i % 2 === 0 ? '#6b705c' : '#a5a58d'
        });
      }
    }
    return items;
  }, [wellboreX]);

  return (
    <group position={[0, 0, 0]}>
      {/* --- 1. Compact Desert Ground Pad Plane --- */}
      <mesh position={[2.0, -0.01, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[padRadius * 2, padRadius * 2, 32, 32]} />
        <meshStandardMaterial
          color="#d4b896"
          roughness={0.92}
          metalness={0.04}
          flatShading={false}
        />
      </mesh>

      {/* --- 2. Compact Crushed Gravel Rig Pad --- */}
      <mesh position={[wellboreX - 1.2, 0.002, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <roundedPlaneGeometry args={[14, 10, 0.6]} />
        <meshStandardMaterial
          color="#b09b85"
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>

      {/* --- 3. Concrete Cellar Pit Walls & Floor (-1.8m depth) --- */}
      <group position={[wellboreX, 0, 0]}>
        {/* Cellar Floor Slab */}
        <mesh position={[0, -cellarDepth + 0.05, 0]} receiveShadow>
          <boxGeometry args={[2.4, 0.1, 2.4]} />
          <meshStandardMaterial color="#475569" roughness={0.9} />
        </mesh>

        {/* Cellar North Wall */}
        <mesh position={[0, -cellarDepth / 2, -1.15]}>
          <boxGeometry args={[2.4, cellarDepth, 0.1]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        {/* Cellar South Wall */}
        <mesh position={[0, -cellarDepth / 2, 1.15]}>
          <boxGeometry args={[2.4, cellarDepth, 0.1]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        {/* Cellar West Wall */}
        <mesh position={[-1.15, -cellarDepth / 2, 0]}>
          <boxGeometry args={[0.1, cellarDepth, 2.2]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        {/* Cellar East Wall */}
        <mesh position={[1.15, -cellarDepth / 2, 0]}>
          <boxGeometry args={[0.1, cellarDepth, 2.2]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>

        {/* Cellar Safety Grating / Perimeter Kerb */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={cellarGeometry} attach="geometry" />
          <meshStandardMaterial color="#94a3b8" metalness={0.65} roughness={0.4} />
        </mesh>

        {/* Safety Corner Posts & Yellow Chain */}
        {[-1.2, 1.2].map((cx) =>
          [-1.2, 1.2].map((cz) => (
            <mesh key={`post_${cx}_${cz}`} position={[cx, 0.45, cz]}>
              <cylinderGeometry args={[0.03, 0.03, 0.9, 8]} />
              <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.3} />
            </mesh>
          ))
        )}
      </group>

      {/* --- 4. Arid Desert Vegetation & Rocks --- */}
      {vegetationInstances.map((item, idx) => (
        <group key={`veg_${idx}`} position={item.pos} scale={item.scale}>
          <mesh position={[0, 0.35, 0]}>
            <dodecahedronGeometry args={[0.45, 1]} />
            <meshStandardMaterial color={item.color} roughness={0.95} />
          </mesh>
          <mesh position={[0.2, 0.15, 0.1]}>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color="#78716c" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
