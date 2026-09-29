import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ============================================================================
 * 3D SURFACE FACILITIES & INDUSTRIAL WELLSITE YARD (API SPECIFICATION)
 * ============================================================================
 * 
 * High-fidelity 3D industrial equipment matching the reference layout:
 * 1. Concrete Well Pad with circular cutout and perimeter fence.
 * 2. Excavated Circular Well Cellar Pit with heavy bolted collar flange ring.
 * 3. Christmas Tree (API 6A Wellhead) with multi-stage valves & red handwheels.
 * 4. Horizontal 3-Phase Separator Pressure Vessel with concrete saddles, manway & catwalk.
 * 5. Vertical Sludge / Boot Tank with conical roof, side ladder & nozzles.
 * 6. Power Unit / VFD Control Shelter with roof vents, double steel doors & cable trays.
 * 7. High-Pressure Steam Distribution Pipeline & Manifold with yellow stanchions, walkover bridge & red valves.
 * 8. Watertight flanged piping connecting Wellhead, Separator, Sludge Tank, and Steam Header.
 * 9. Interactive 3D Callout Tags (Pumpjack, Separator, Sludge Tank, Wellhead, Power Unit, Steam Pipeline).
 * ============================================================================
 */

export default function SurfaceFacilities3D({
  cameraView = 'top',
  facilityVisibility = {
    separator: true,
    sludgeTank: true,
    steamPipeline: true,
    powerUnit: true,
    wellhead: true
  },
  onSelectComponent,
  selectedComponent,
  isThermalView = false,
  showLabels = true,
  hideRightLabels = false
}) {
  // Only show east/right equipment labels when HUD tab is not overlapping them
  const showEastLabels = showLabels && !hideRightLabels;

  // Common PBR Materials
  const materials = useMemo(() => ({
    padConcrete: new THREE.MeshStandardMaterial({
      color: '#A89C8C',
      roughness: 0.88,
      metalness: 0.05
    }),
    curbConcrete: new THREE.MeshStandardMaterial({
      color: '#8E8272',
      roughness: 0.85,
      metalness: 0.08
    }),
    cellarRock: new THREE.MeshStandardMaterial({
      color: '#5c4b3c',
      roughness: 0.96,
      metalness: 0.10
    }),
    steelVessel: new THREE.MeshStandardMaterial({
      color: '#9aa6b4',
      metalness: 0.88,
      roughness: 0.30
    }),
    steelTank: new THREE.MeshStandardMaterial({
      color: '#a4b0be',
      metalness: 0.85,
      roughness: 0.32
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: '#4b5563',
      metalness: 0.90,
      roughness: 0.38
    }),
    steelMachined: new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.94,
      roughness: 0.22
    }),
    steamPipeInsulated: isThermalView
      ? new THREE.MeshStandardMaterial({
          color: '#f97316',
          emissive: '#ea580c',
          emissiveIntensity: 1.4,
          metalness: 0.50,
          roughness: 0.25
        })
      : new THREE.MeshStandardMaterial({
          color: '#94a3b8',
          metalness: 0.86,
          roughness: 0.28
        }),
    yellowStructural: new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      metalness: 0.78,
      roughness: 0.26
    }),
    yellowGrating: new THREE.MeshStandardMaterial({
      color: '#d97706',
      metalness: 0.80,
      roughness: 0.32
    }),
    redValve: new THREE.MeshStandardMaterial({
      color: '#dc2626',
      metalness: 0.82,
      roughness: 0.24
    }),
    powerCabinWall: new THREE.MeshStandardMaterial({
      color: '#334155',
      metalness: 0.85,
      roughness: 0.40
    }),
    powerCabinRoof: new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.88,
      roughness: 0.35
    }),
    fenceWire: new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.85,
      roughness: 0.45,
      transparent: true,
      opacity: 0.60,
      side: THREE.DoubleSide,
      depthWrite: false
    }),
    fencePost: new THREE.MeshStandardMaterial({
      color: '#64748b',
      metalness: 0.88,
      roughness: 0.35
    })
  }), [isThermalView]);

  // Perimeter Fence Posts (around full Yard: 29.5m wide X from -12.0 to 17.5, 19m deep Z from -13.0 to 6.0)
  // Front glass/fence line is removed for open unobstructed view; keeping back, left, right and front corners
  const fencePosts = useMemo(() => {
    const minX = -12.0;
    const maxX = 17.5;
    const minZ = -13.0;
    const maxZ = 6.0;
    const posts = [];
    const step = 2.4;

    // Back (Z = minZ)
    for (let x = minX; x <= maxX; x += step) {
      posts.push({ x, z: minZ });
    }
    // Left (X = minX) & Right (X = maxX)
    for (let z = minZ + step; z <= maxZ; z += step) {
      posts.push({ x: minX, z });
      posts.push({ x: maxX, z });
    }
    // Front corner posts
    posts.push({ x: minX, z: maxZ });
    posts.push({ x: maxX, z: maxZ });
    return posts;
  }, []);

  // Unified Monolithic Concrete Yard Foundation (29.5m x 19.0m)
  // Completely fills the space between the glass walls and the grey floor
  const padGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const halfW = 14.75;
    const halfD = 9.50;
    shape.moveTo(-halfW, -halfD);
    shape.lineTo(halfW, -halfD);
    shape.lineTo(halfW, halfD);
    shape.lineTo(-halfW, halfD);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0.025, 0);
    return geo;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* =========================================================================
          1. CONCRETE WELL PAD FOUNDATION (29.5m x 19.0m) — FULL YARD EXPANSION
          ========================================================================= */}
      <group position={[2.75, 0, -3.5]}>
        <mesh geometry={padGeometry} receiveShadow>
          <primitive object={materials.padConcrete} />
        </mesh>

        {/* Concrete Expansion Joint Cut Lines covering the entire 29.5m x 19.0m yard */}
        {[-12.0, -8.0, -4.0, 0, 4.0, 8.0, 12.0].map((gx, idx) => (
          <mesh key={`gx-${idx}`} position={[gx, 0.052, 0]}>
            <boxGeometry args={[0.03, 0.002, 18.8]} />
            <meshBasicMaterial color="#4a3e32" />
          </mesh>
        ))}
        {[-7.0, -4.5, -2.0, 0.5, 3.0, 5.5, 8.0].map((gz, idx) => (
          <mesh key={`gz-${idx}`} position={[0, 0.052, gz]}>
            <boxGeometry args={[29.2, 0.002, 0.03]} />
            <meshBasicMaterial color="#4a3e32" />
          </mesh>
        ))}

        {/* Outer Perimeter Curbs with Yellow Safety Hazard Stripes along Yard Boundary */}
        <mesh position={[0, 0.06, 9.45]}>
          <boxGeometry args={[29.5, 0.08, 0.14]} />
          <primitive object={materials.curbConcrete} />
        </mesh>
        <mesh position={[0, 0.06, -9.45]}>
          <boxGeometry args={[29.5, 0.08, 0.14]} />
          <primitive object={materials.curbConcrete} />
        </mesh>
        <mesh position={[-14.7, 0.06, 0]}>
          <boxGeometry args={[0.14, 0.08, 19.0]} />
          <primitive object={materials.curbConcrete} />
        </mesh>
        <mesh position={[14.7, 0.06, 0]}>
          <boxGeometry args={[0.14, 0.08, 19.0]} />
          <primitive object={materials.curbConcrete} />
        </mesh>
      </group>

      {/* =========================================================================
          3. HIGH-PRESSURE CHRISTMAS TREE WELLHEAD (API 6A) (X=2.8, Z=0)
          ========================================================================= */}
      {facilityVisibility.wellhead && (
        <group position={[2.8, 0, 0]}>
          {/* Lower Casing Head Flange (Casing Spool) */}
          <mesh position={[0, 0.20, 0]}>
            <cylinderGeometry args={[0.34, 0.40, 0.36, 24]} />
            <primitive object={materials.steelDark} />
          </mesh>
          {/* Tubing Head Spool */}
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.28, 0.34, 0.24, 24]} />
            <primitive object={materials.steelMachined} />
          </mesh>

          {/* Lower Master Gate Valve with Red Handwheel */}
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[0.32, 0.22, 0.32]} />
            <primitive object={materials.steelDark} />
          </mesh>
          <group position={[0, 0.72, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.22, 12]} />
            <mesh position={[0, 0.12, 0]}>
              <torusGeometry args={[0.13, 0.022, 8, 20]} />
              <primitive object={materials.redValve} />
            </mesh>
          </group>

          {/* Upper Master Gate Valve with Red Handwheel */}
          <mesh position={[0, 1.05, 0]}>
            <boxGeometry args={[0.30, 0.22, 0.30]} />
            <primitive object={materials.steelDark} />
          </mesh>
          <group position={[0, 1.05, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.22, 12]} />
            <mesh position={[0, 0.12, 0]}>
              <torusGeometry args={[0.13, 0.022, 8, 20]} />
              <primitive object={materials.redValve} />
            </mesh>
          </group>

          {/* Flow Cross / Tee Body (Branches Left & Right) */}
          <mesh position={[0, 1.38, 0]}>
            <boxGeometry args={[0.32, 0.30, 0.32]} />
            <primitive object={materials.steelDark} />
          </mesh>
          {/* Horizontal Cross Spool */}
          <mesh position={[0, 1.38, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 1.20, 20]} />
            <primitive object={materials.steelMachined} />
          </mesh>

          {/* Left Wing Valve (Leading to Separator) */}
          <group position={[-0.45, 1.38, 0]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.12, 0.18, 16]} />
              <primitive object={materials.steelDark} />
            </mesh>
            <group position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh position={[0, 0.10, 0]}>
                <torusGeometry args={[0.11, 0.02, 8, 20]} />
                <primitive object={materials.redValve} />
              </mesh>
            </group>
          </group>

          {/* Right Wing Valve (Leading to Steam Manifold) */}
          <group position={[0.45, 1.38, 0]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.12, 0.18, 16]} />
              <primitive object={materials.steelDark} />
            </mesh>
            <group position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh position={[0, 0.10, 0]}>
                <torusGeometry args={[0.11, 0.02, 8, 20]} />
                <primitive object={materials.redValve} />
              </mesh>
            </group>
          </group>

          {/* Swab Valve & Top Cap */}
          <mesh position={[0, 1.68, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 0.28, 20]} />
            <primitive object={materials.steelDark} />
          </mesh>
          <mesh position={[0, 1.90, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.16, 20]} />
            <primitive object={materials.steelMachined} />
          </mesh>

          {/* Top Pressure Gauge Dial */}
          <group position={[0.18, 1.75, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 10]} />
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.03, 16]} />
              <primitive object={materials.steelDark} />
              {/* Dial Face */}
              <mesh position={[0, 0.016, 0]}>
                <circleGeometry args={[0.055, 16]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
          </group>

          {/* Wellhead 3D HTML Callout Tag */}
          {showLabels && (
            <Html position={[0, 2.3, 0]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>Wellhead (API 6A Xmas Tree)</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* =========================================================================
          4. HORIZONTAL 3-PHASE SEPARATOR VESSEL (Left Zone: X = -4.2, Z = -3.2)
          ========================================================================= */}
      {facilityVisibility.separator && (
        <group position={[-4.2, 0, -3.2]}>
          {/* Dual Reinforced Concrete Support Saddles */}
          <mesh position={[-1.3, 0.42, 0]}>
            <boxGeometry args={[0.55, 0.84, 1.60]} />
            <primitive object={materials.padConcrete} />
          </mesh>
          <mesh position={[1.3, 0.42, 0]}>
            <boxGeometry args={[0.55, 0.84, 1.60]} />
            <primitive object={materials.padConcrete} />
          </mesh>

          {/* Steel Saddle Support Cradles */}
          <mesh position={[-1.3, 0.88, 0]}>
            <cylinderGeometry args={[0.88, 0.88, 0.50, 24, 1, false, Math.PI, Math.PI]} />
            <primitive object={materials.steelDark} />
          </mesh>
          <mesh position={[1.3, 0.88, 0]}>
            <cylinderGeometry args={[0.88, 0.88, 0.50, 24, 1, false, Math.PI, Math.PI]} />
            <primitive object={materials.steelDark} />
          </mesh>

          {/* Main Cylindrical Pressure Vessel Shell */}
          <group position={[0, 1.72, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.82, 0.82, 3.80, 32]} />
              <primitive object={materials.steelVessel} />
            </mesh>

            {/* Left Dished Elliptical Head */}
            <mesh position={[-1.90, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.45, 1, 1]}>
              <sphereGeometry args={[0.82, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={materials.steelVessel} />
            </mesh>

            {/* Right Dished Elliptical Head */}
            <mesh position={[1.90, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.45, 1, 1]}>
              <sphereGeometry args={[0.82, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={materials.steelVessel} />
            </mesh>

            {/* Top Inspection Manway Neck & Bolted Blind Flange */}
            <group position={[0, 0.82, 0]}>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.30, 0.30, 0.32, 20]} />
                <primitive object={materials.steelDark} />
              </mesh>
              <mesh position={[0, 0.34, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.06, 20]} />
                <primitive object={materials.steelMachined} />
              </mesh>
            </group>

            {/* Safety Relief Valve (PRV) with Vertical Vent Stack */}
            <group position={[-0.9, 0.82, 0]}>
              <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.50, 16]} />
                <primitive object={materials.steelMachined} />
              </mesh>
              <mesh position={[0, 0.60, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.22, 16]} />
                <primitive object={materials.redValve} />
              </mesh>
              {/* Vent stack pipe */}
              <mesh position={[0, 1.10, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.80, 12]} />
                <primitive object={materials.steelDark} />
              </mesh>
            </group>

            {/* Liquid Level Gauge Glass Column on Side */}
            <group position={[1.4, 0, 0.84]}>
              <mesh>
                <cylinderGeometry args={[0.025, 0.025, 0.90, 12]} />
                <meshStandardMaterial color="#38bdf8" metalness={0.90} roughness={0.10} transparent opacity={0.7} />
              </mesh>
              <mesh position={[0, 0.45, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
                <primitive object={materials.steelDark} />
              </mesh>
              <mesh position={[0, -0.45, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
                <primitive object={materials.steelDark} />
              </mesh>
            </group>

            {/* Vessel Weld Seam Reinforcement Rings */}
            {[-1.2, 0, 1.2].map((wx, widx) => (
              <mesh key={`wring-${widx}`} position={[wx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.825, 0.012, 8, 32]} />
                <primitive object={materials.steelMachined} />
              </mesh>
            ))}
          </group>

          {/* Elevated Service Catwalk Platform & Yellow Safety Guardrails */}
          <group position={[0, 0.95, 1.25]}>
            {/* Grated Steel Catwalk Floor */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[4.4, 0.90]} />
              <primitive object={materials.yellowGrating} />
            </mesh>
            {/* Yellow Guardrails */}
            {[-2.1, -1.0, 0.0, 1.0, 2.1].map((rx, ridx) => (
              <mesh key={`spost-${ridx}`} position={[rx, 0.42, 0.45]}>
                <cylinderGeometry args={[0.016, 0.016, 0.84, 8]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
            ))}
            <mesh position={[0, 0.84, 0.45]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.015, 4.4, 10]} />
              <primitive object={materials.yellowStructural} />
            </mesh>
            <mesh position={[0, 0.42, 0.45]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 4.4, 10]} />
              <primitive object={materials.yellowStructural} />
            </mesh>
          </group>

          {/* Separator 3D HTML Callout Tag */}
          {showLabels && (
            <Html position={[0, 3.2, 0]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>3-Phase Test Separator</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* =========================================================================
          5. VERTICAL SLUDGE TANK / BOOT TANK (Left-Front Zone: X = -5.0, Z = 0.8)
          ========================================================================= */}
      {facilityVisibility.sludgeTank && (
        <group position={[-5.0, 0, 0.8]}>
          {/* Concrete Base Pad */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[1.05, 1.10, 0.12, 24]} />
            <primitive object={materials.padConcrete} />
          </mesh>

          {/* Vertical Cylindrical Tank Shell */}
          <mesh position={[0, 1.25, 0]}>
            <cylinderGeometry args={[0.85, 0.85, 2.25, 28]} />
            <primitive object={materials.steelTank} />
          </mesh>

          {/* Conical Roof Cap */}
          <mesh position={[0, 2.50, 0]}>
            <coneGeometry args={[0.88, 0.28, 28]} />
            <primitive object={materials.steelDark} />
          </mesh>

          {/* Side Access Ladder */}
          <group position={[0.88, 1.25, 0]}>
            <mesh position={[0, 0, -0.15]}>
              <cylinderGeometry args={[0.012, 0.012, 2.30, 8]} />
              <primitive object={materials.steelDark} />
            </mesh>
            <mesh position={[0, 0, 0.15]}>
              <cylinderGeometry args={[0.012, 0.012, 2.30, 8]} />
              <primitive object={materials.steelDark} />
            </mesh>
            {Array.from({ length: 7 }).map((_, li) => (
              <mesh key={`lrung-${li}`} position={[0, -0.9 + li * 0.30, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.30, 8]} />
                <primitive object={materials.steelDark} />
              </mesh>
            ))}
          </group>

          {/* Sludge Tank 3D HTML Callout Tag */}
          {showLabels && (
            <Html position={[0, 3.0, 0]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>Sludge Boot Tank</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* =========================================================================
          6. POWER UNIT / ELECTRICAL CONTROL CABIN (VFD SHELTER) (X = 9.2, Z = -3.8)
          ========================================================================= */}
      {facilityVisibility.powerUnit && (
        <group position={[9.2, 0, -3.8]}>
          {/* Elevated Foundation Pad */}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[3.8, 0.16, 3.2]} />
            <primitive object={materials.padConcrete} />
          </mesh>

          {/* Main Cabin Enclosure Body */}
          <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 2.40, 2.8]} />
            <primitive object={materials.powerCabinWall} />
          </mesh>

          {/* Pitched / Overhanging Weatherproof Roof */}
          <mesh position={[0, 2.62, 0]} castShadow>
            <boxGeometry args={[3.7, 0.14, 3.1]} />
            <primitive object={materials.powerCabinRoof} />
          </mesh>

          {/* Dual Roof Ventilation Cowls / Louvered Exhaust Hoods */}
          {[-0.8, 0.8].map((vx, vidx) => (
            <group key={`vent-${vidx}`} position={[vx, 2.82, 0]}>
              <mesh position={[0, 0.12, 0]}>
                <boxGeometry args={[0.55, 0.26, 0.55]} />
                <primitive object={materials.steelDark} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <boxGeometry args={[0.65, 0.06, 0.65]} />
                <primitive object={materials.powerCabinRoof} />
              </mesh>
            </group>
          ))}

          {/* Double Industrial Access Doors on Front (+Z face) */}
          <group position={[0, 1.15, 1.41]}>
            {/* Left Door Panel */}
            <mesh position={[-0.65, 0, 0]}>
              <boxGeometry args={[1.15, 1.95, 0.04]} />
              <primitive object={materials.steelDark} />
            </mesh>
            {/* Right Door Panel */}
            <mesh position={[0.65, 0, 0]}>
              <boxGeometry args={[1.15, 1.95, 0.04]} />
              <primitive object={materials.steelDark} />
            </mesh>
            {/* Door Handles */}
            <mesh position={[-0.12, 0, 0.04]}>
              <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            <mesh position={[0.12, 0, 0.04]}>
              <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Yellow Warning Triangle Sign */}
            <mesh position={[0, 0.55, 0.03]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.01, 3]} />
              <primitive object={materials.yellowStructural} />
            </mesh>
          </group>

          {/* High-Voltage Cable Conduit Tray leading to Pumpjack & Wellhead */}
          <group position={[-1.75, 0.16, 0]}>
            <mesh position={[-2.4, 0, 0.6]}>
              <boxGeometry args={[4.8, 0.10, 0.22]} />
              <primitive object={materials.steelDark} />
            </mesh>
          </group>

          {/* Power Unit 3D HTML Callout Tag */}
          {showEastLabels && (
            <Html position={[0, 3.4, 0]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>VFD Power Control Unit</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* =========================================================================
          7. HIGH-PRESSURE STEAM DISTRIBUTION PIPELINE & MANIFOLD NETWORK
          ========================================================================= */}
      {facilityVisibility.steamPipeline && (
        <group position={[0, 0, 0]}>
          {/* Main High-Pressure Steam Distribution Header (East-West trunk from X=5.8 to X=14.5) */}
          <group position={[10.15, 0.52, 0.8]}>
            {/* Main Insulated Pipe Trunk */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.16, 0.16, 8.7, 24]} />
              <primitive object={materials.steamPipeInsulated} />
            </mesh>
            {/* Flanged Joint Rings */}
            {[-3.5, -1.5, 0.5, 2.5, 3.8].map((fx, fidx) => (
              <mesh key={`flange-${fidx}`} position={[fx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.23, 0.23, 0.06, 24]} />
                <primitive object={materials.steelMachined} />
              </mesh>
            ))}
          </group>

          {/* Yellow Heavy Structural Pipe Trestles / Support Stanchions (E-W run) */}
          {[6.5, 8.5, 10.5, 12.5].map((sx, sidx) => (
            <group key={`stanchion-${sidx}`} position={[sx, 0, 0.8]}>
              {/* Vertical Support Legs */}
              <mesh position={[0, 0.25, -0.25]}>
                <boxGeometry args={[0.06, 0.50, 0.06]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0, 0.25, 0.25]}>
                <boxGeometry args={[0.06, 0.50, 0.06]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              {/* Horizontal Cross Beam */}
              <mesh position={[0, 0.46, 0]}>
                <boxGeometry args={[0.12, 0.08, 0.65]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              {/* Concrete Base Footing */}
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.32, 0.08, 0.75]} />
                <primitive object={materials.curbConcrete} />
              </mesh>
            </group>
          ))}

          {/* ── 90° Elbow at Bottom Blue Circle [14.5, 0.52, 0.8] turning North (-Z) ── */}
          <group position={[14.5, 0.52, 0.8]}>
            <mesh>
              <sphereGeometry args={[0.20, 16, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Corner support stanchion */}
            <group position={[0, -0.52, 0]}>
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.12, 0.50, 0.12]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.40, 0.08, 0.40]} />
                <primitive object={materials.curbConcrete} />
              </mesh>
            </group>
          </group>

          {/* ── North-South Steam Line along Eastern Yard Boundary (Z=0.8 to Z=-10.5) ── */}
          <group position={[14.5, 0.52, -4.85]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 11.3, 24]} />
              <primitive object={materials.steamPipeInsulated} />
            </mesh>
            {/* Flanged Joint Rings along N-S run */}
            {[-4.5, -2.5, -0.5, 1.5, 3.5, 5.0].map((fz, fidx) => (
              <mesh key={`flange-ns-${fidx}`} position={[0, 0, fz]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.23, 0.23, 0.06, 24]} />
                <primitive object={materials.steelMachined} />
              </mesh>
            ))}
          </group>

          {/* Yellow Heavy Structural Stanchions along N-S Steam Line */}
          {[-1.5, -3.8, -6.2, -8.5].map((sz, sidx) => (
            <group key={`stanchion-ns-${sidx}`} position={[14.5, 0, sz]}>
              <mesh position={[-0.25, 0.25, 0]}>
                <boxGeometry args={[0.06, 0.50, 0.06]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0.25, 0.25, 0]}>
                <boxGeometry args={[0.06, 0.50, 0.06]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0, 0.46, 0]}>
                <boxGeometry args={[0.65, 0.08, 0.12]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.75, 0.08, 0.32]} />
                <primitive object={materials.curbConcrete} />
              </mesh>
            </group>
          ))}

          {/* ── Turn / Loop at Top Blue Circle [14.5, 0.52, -10.5] ── */}
          <group position={[14.5, 0.52, -10.5]}>
            {/* Corner elbow */}
            <mesh>
              <sphereGeometry args={[0.20, 16, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Lateral branch / expansion turn towards -X (towards flare/facility) */}
            <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.16, 0.16, 1.6, 24]} />
              <primitive object={materials.steamPipeInsulated} />
            </mesh>
            {/* Terminal Main Steam Supply Riser / Flanged Header */}
            <mesh position={[-1.6, 0.4, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.8, 20]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            <mesh position={[-1.6, 0.82, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.08, 20]} />
              <primitive object={materials.steelDark} />
            </mesh>
            {/* Support stanchion at top corner */}
            <group position={[0, -0.52, 0]}>
              <mesh position={[0, 0.25, 0]}>
                <boxGeometry args={[0.12, 0.50, 0.12]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.40, 0.08, 0.40]} />
                <primitive object={materials.curbConcrete} />
              </mesh>
            </group>
          </group>

          {/* Steam Manifold Loop to Wellhead (Branching from Steam Header at X=5.8 to Wellhead Right Wing X=3.25) */}
          <group position={[4.5, 0.52, 0.4]}>
            {/* Lateral Pipe Connecting Header to Wellhead */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.10, 0.10, 3.4, 20]} />
              <primitive object={materials.steamPipeInsulated} />
            </mesh>
            {/* 90-Degree Elbow turn towards Wellhead */}
            <mesh position={[-1.7, 0, -0.4]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.10, 0.10, 0.8, 20]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Vertical Riser to Wellhead Right Wing Valve (Y = 1.38) */}
            <mesh position={[-1.25, 0.43, -0.4]}>
              <cylinderGeometry args={[0.09, 0.09, 0.86, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>

            {/* High-Pressure Control Gate Valve with Red Handwheel */}
            <group position={[0.5, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.16, 0.16, 0.26, 16]} />
                <primitive object={materials.steelDark} />
              </mesh>
              <group position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.18, 10]} />
                <mesh position={[0, 0.10, 0]}>
                  <torusGeometry args={[0.12, 0.02, 8, 20]} />
                  <primitive object={materials.redValve} />
                </mesh>
              </group>
            </group>

            {/* Digital Steam Flowmeter Sensor Spool */}
            <group position={[-0.8, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 0.32, 20]} />
                <primitive object={materials.steelDark} />
              </mesh>
              {/* Sensor Display Housing */}
              <mesh position={[0, 0.22, 0]}>
                <boxGeometry args={[0.16, 0.14, 0.16]} />
                <primitive object={materials.steelMachined} />
                <mesh position={[0, 0, 0.082]}>
                  <planeGeometry args={[0.10, 0.06]} />
                  <meshBasicMaterial color="#38bdf8" />
                </mesh>
              </mesh>
            </group>
          </group>

          {/* Interconnected Emulsion Flowline (Wellhead Left Wing at X=2.35 to Separator at X=-4.2) */}
          <group position={[-0.9, 0.42, -1.2]}>
            {/* Long Transverse Flowline Tube */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.085, 0.085, 6.6, 20]} />
              <primitive object={materials.steelVessel} />
            </mesh>
            {/* Vertical Drop from Wellhead Wing Valve to Flowline */}
            <mesh position={[3.25, 0.48, 1.2]}>
              <cylinderGeometry args={[0.085, 0.085, 0.96, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Pipe Elbow connecting Wellhead drop to Transverse Pipe */}
            <mesh position={[3.25, 0, 0.6]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 1.2, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Vertical Riser up into Separator Vessel Emulsion Inlet */}
            <mesh position={[-3.3, 0.65, -2.0]}>
              <cylinderGeometry args={[0.085, 0.085, 1.30, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>
            {/* Elbow into Separator */}
            <mesh position={[-3.3, 0, -1.0]} rotation={[0, Math.PI / 2, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 2.0, 16]} />
              <primitive object={materials.steelMachined} />
            </mesh>

            {/* Pipe Support Footings along Flowline */}
            {[-2.5, -0.8, 1.0, 2.5].map((fx, fidx) => (
              <group key={`psup-${fidx}`} position={[fx, -0.22, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.025, 0.025, 0.32, 10]} />
                  <primitive object={materials.yellowStructural} />
                </mesh>
                <mesh position={[0, -0.16, 0]}>
                  <boxGeometry args={[0.22, 0.04, 0.22]} />
                  <primitive object={materials.curbConcrete} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Yellow Safety Walkover Bridge crossing over the Steam Manifold */}
          <group position={[7.2, 0, 0.8]}>
            {/* Bridge Catwalk Deck */}
            <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.2, 1.8]} />
              <primitive object={materials.yellowGrating} />
            </mesh>
            {/* Bridge Support Legs */}
            {[
              [-0.55, 0.31, -0.85],
              [0.55, 0.31, -0.85],
              [-0.55, 0.31, 0.85],
              [0.55, 0.31, 0.85]
            ].map((lp, lidx) => (
              <mesh key={`bleg-${lidx}`} position={lp}>
                <boxGeometry args={[0.06, 0.62, 0.06]} />
                <primitive object={materials.yellowStructural} />
              </mesh>
            ))}
            {/* Bridge Handrails */}
            {[-0.55, 0.55].map((hx, hidx) => (
              <group key={`bhand-${hidx}`} position={[hx, 0.62, 0]}>
                <mesh position={[0, 0.42, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.84, 8]} />
                  <primitive object={materials.yellowStructural} />
                </mesh>
                <mesh position={[0, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 1.8, 8]} />
                  <primitive object={materials.yellowStructural} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Steam Pipeline 3D HTML Callout Tag */}
          {showEastLabels && (
            <Html position={[10.3, 1.3, 0.8]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>Steam Header</span>
              </div>
            </Html>
          )}
          {showEastLabels && (
            <Html position={[14.5, 1.3, -4.8]} center distanceFactor={14}>
              <div className="surface-facility-badge">
                <span className="facility-badge-dot" />
                <span>Steam Corridor Line</span>
              </div>
            </Html>
          )}
        </group>
      )}

      {/* =========================================================================
          NEW: ADDITIONAL STORAGE, GAS TREATMENT & FLARE FACILITIES
          Pad boundary: X -8.7..14.3, Z -11.0..4.0
          New equipment in unused back half (Z -5..-11):
            Crude Oil Tank A  X=-6.5, Z=-8.2
            Crude Oil Tank B  X=-2.8, Z=-8.2
            Produced Water Tank X=1.2, Z=-8.2
            Gas KO Drum       X= 5.8, Z=-6.8
            Flare Stack       X=11.8, Z=-9.5
            Transfer Pump Skid X=-4.2, Z=-5.8
          ========================================================================= */}

      {/* ── A. CRUDE OIL STORAGE TANK A ───────────────────────────────── */}
      <group position={[-6.5, 0, -8.2]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[1.35, 1.40, 0.14, 32]} />
          <primitive object={materials.padConcrete} />
        </mesh>
        <mesh position={[0, 1.92, 0]}>
          <cylinderGeometry args={[1.20, 1.20, 3.50, 32]} />
          <meshStandardMaterial color="#8fa3b1" metalness={0.82} roughness={0.30} />
        </mesh>
        {[0.6, 1.4, 2.2, 3.0].map((ry, ri) => (
          <mesh key={`rA-${ri}`} position={[0, 0.15 + ry, 0]}>
            <torusGeometry args={[1.207, 0.022, 8, 32]} />
            <primitive object={materials.steelMachined} />
          </mesh>
        ))}
        <mesh position={[0, 3.72, 0]}><coneGeometry args={[1.22, 0.55, 32]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0, 4.30, 0]}><cylinderGeometry args={[0.10, 0.10, 0.30, 12]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0, 4.52, 0]}><coneGeometry args={[0.18, 0.14, 12]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[1.22, 1.80, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.28, 10]} /><primitive object={materials.steelMachined} /></mesh>
        <group position={[1.22, 1.92, 0]}>
          {[-0.14, 0.14].map((lz, li) => (<mesh key={`lsA-${li}`} position={[0, 0, lz]}><cylinderGeometry args={[0.011, 0.011, 3.52, 8]} /><primitive object={materials.steelDark} /></mesh>))}
          {Array.from({ length: 11 }).map((_, ri) => (<mesh key={`lrA-${ri}`} position={[0, -1.52 + ri * 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.28, 8]} /><primitive object={materials.steelDark} /></mesh>))}
        </group>
        <mesh position={[0.9, 0.14, 0.9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.28, 12]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0.9, 0.14, 1.05]}><boxGeometry args={[0.14, 0.14, 0.12]} /><primitive object={materials.redValve} /></mesh>
        {showLabels && (<Html position={[0, 4.8, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Crude Storage Tank A</span></div></Html>)}
      </group>

      {/* ── B. CRUDE OIL STORAGE TANK B ───────────────────────────────── */}
      <group position={[-2.8, 0, -8.2]}>
        <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[1.35, 1.40, 0.14, 32]} /><primitive object={materials.padConcrete} /></mesh>
        <mesh position={[0, 1.92, 0]}><cylinderGeometry args={[1.20, 1.20, 3.50, 32]} /><meshStandardMaterial color="#8fa3b1" metalness={0.82} roughness={0.30} /></mesh>
        {[0.6, 1.4, 2.2, 3.0].map((ry, ri) => (<mesh key={`rB-${ri}`} position={[0, 0.15 + ry, 0]}><torusGeometry args={[1.207, 0.022, 8, 32]} /><primitive object={materials.steelMachined} /></mesh>))}
        <mesh position={[0, 3.72, 0]}><coneGeometry args={[1.22, 0.55, 32]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0, 4.30, 0]}><cylinderGeometry args={[0.10, 0.10, 0.30, 12]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0, 4.52, 0]}><coneGeometry args={[0.18, 0.14, 12]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[1.22, 1.60, 0]}><cylinderGeometry args={[0.025, 0.025, 1.20, 10]} /><meshStandardMaterial color="#38bdf8" metalness={0.90} roughness={0.10} transparent opacity={0.75} /></mesh>
        <group position={[-1.22, 1.92, 0]}>
          {[-0.14, 0.14].map((lz, li) => (<mesh key={`lsB-${li}`} position={[0, 0, lz]}><cylinderGeometry args={[0.011, 0.011, 3.52, 8]} /><primitive object={materials.steelDark} /></mesh>))}
          {Array.from({ length: 11 }).map((_, ri) => (<mesh key={`lrB-${ri}`} position={[0, -1.52 + ri * 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.28, 8]} /><primitive object={materials.steelDark} /></mesh>))}
        </group>
        <mesh position={[-0.9, 0.14, 0.9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.055, 0.055, 0.28, 12]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[-0.9, 0.14, 1.05]}><boxGeometry args={[0.14, 0.14, 0.12]} /><primitive object={materials.redValve} /></mesh>
        {showLabels && (<Html position={[0, 4.8, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Crude Storage Tank B</span></div></Html>)}
      </group>

      {/* ── C. PRODUCED WATER BOOT TANK ────────────────────────────────── */}
      <group position={[1.2, 0, -8.2]}>
        <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.98, 1.02, 0.14, 28]} /><primitive object={materials.padConcrete} /></mesh>
        <mesh position={[0, 1.48, 0]}><cylinderGeometry args={[0.88, 0.88, 2.70, 28]} /><meshStandardMaterial color="#94a3b8" metalness={0.80} roughness={0.35} /></mesh>
        {[0.5, 1.2, 1.9].map((ry, ri) => (<mesh key={`rC-${ri}`} position={[0, 0.14 + ry, 0]}><torusGeometry args={[0.885, 0.018, 8, 28]} /><primitive object={materials.steelMachined} /></mesh>))}
        <mesh position={[0, 2.90, 0]}><coneGeometry args={[0.90, 0.38, 28]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0, 3.30, 0]}><cylinderGeometry args={[0.08, 0.08, 0.22, 10]} /><primitive object={materials.steelDark} /></mesh>
        <group position={[0.90, 1.48, 0]}>
          {[-0.12, 0.12].map((lz, li) => (<mesh key={`lsC-${li}`} position={[0, 0, lz]}><cylinderGeometry args={[0.010, 0.010, 2.72, 8]} /><primitive object={materials.steelDark} /></mesh>))}
          {Array.from({ length: 8 }).map((_, ri) => (<mesh key={`lrC-${ri}`} position={[0, -1.18 + ri * 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.24, 8]} /><primitive object={materials.steelDark} /></mesh>))}
        </group>
        {showLabels && (<Html position={[0, 3.7, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Produced Water Tank</span></div></Html>)}
      </group>

      {/* ── D. GAS KNOCK-OUT DRUM (horizontal, on saddles) ─────────────── */}
      <group position={[5.8, 0, -6.8]}>
        {[-1.1, 1.1].map((lx, li) => (<mesh key={`kodf-${li}`} position={[lx, 0.10, 0]}><boxGeometry args={[0.50, 0.20, 0.90]} /><primitive object={materials.padConcrete} /></mesh>))}
        {[-1.1, 1.1].map((lx, li) => (<mesh key={`kods-${li}`} position={[lx, 0.56, 0]}><cylinderGeometry args={[0.58, 0.58, 0.30, 20, 1, false, Math.PI, Math.PI]} /><primitive object={materials.steelDark} /></mesh>))}
        <mesh position={[0, 1.10, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.55, 0.55, 2.80, 24]} /><primitive object={materials.steelVessel} /></mesh>
        <mesh position={[-1.40, 1.10, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.40, 1, 1]}><sphereGeometry args={[0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={materials.steelVessel} /></mesh>
        <mesh position={[1.40, 1.10, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.40, 1, 1]}><sphereGeometry args={[0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={materials.steelVessel} /></mesh>
        {[-0.80, 0, 0.80].map((wx, wi) => (<mesh key={`kodw-${wi}`} position={[wx, 1.10, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.555, 0.010, 8, 24]} /><primitive object={materials.steelMachined} /></mesh>))}
        <mesh position={[0.8, 1.68, 0]}><cylinderGeometry args={[0.065, 0.065, 0.24, 10]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[-0.5, 1.72, 0]}><cylinderGeometry args={[0.08, 0.08, 0.22, 12]} /><primitive object={materials.redValve} /></mesh>
        {showEastLabels && (<Html position={[0, 2.4, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Gas Knockout Drum</span></div></Html>)}
      </group>

      {/* ── E. FLARE STACK TOWER ────────────────────────────────────────── */}
      <group position={[11.8, 0, -9.5]}>
        <mesh position={[0, 0.08, 0]}><boxGeometry args={[1.60, 0.16, 1.60]} /><primitive object={materials.padConcrete} /></mesh>
        {/* 4 thick vertical corner legs — wider base for visual mass */}
        {[[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]].map(([lx, lz], li) => (
          <mesh key={`fleg-${li}`} position={[lx, 2.0, lz]}>
            <boxGeometry args={[0.130, 4.0, 0.130]} />
            <meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} />
          </mesh>
        ))}
        {/* Heavy horizontal ring bracing at 3 levels */}
        {[0.8, 1.8, 2.8].map((hy, hi) => (
          <group key={`fring-${hi}`} position={[0, hy, 0]}>
            <mesh><boxGeometry args={[1.32, 0.090, 0.090]} /><meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} /></mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[1.32, 0.090, 0.090]} /><meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} /></mesh>
          </group>
        ))}
        {/* X-diagonal bracing panels — thick */}
        {[0, 1.8].map((hy, hi) => (
          <group key={`fxd-${hi}`}>
            <mesh position={[0, hy + 0.9, -0.65]} rotation={[0, 0, Math.PI * 0.22]}>
              <boxGeometry args={[0.060, 1.85, 0.060]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.42} />
            </mesh>
            <mesh position={[0, hy + 0.9, -0.65]} rotation={[0, 0, -Math.PI * 0.22]}>
              <boxGeometry args={[0.060, 1.85, 0.060]} />
              <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.42} />
            </mesh>
          </group>
        ))}


        {/* Main stack pipe */}
        <mesh position={[0, 5.30, 0]}><cylinderGeometry args={[0.11, 0.17, 7.0, 16]} /><meshStandardMaterial color="#475569" metalness={0.85} roughness={0.38} /></mesh>
        {/* Stack flange joints */}
        {[1.9, 3.7, 5.5, 7.3].map((fy, fi) => (<mesh key={`ffj-${fi}`} position={[0, 1.9 + fy, 0]}><cylinderGeometry args={[0.19, 0.19, 0.06, 16]} /><primitive object={materials.steelMachined} /></mesh>))}
        {/* Flare tip */}
        <mesh position={[0, 8.90, 0]}><coneGeometry args={[0.20, 0.42, 16]} /><primitive object={materials.steelDark} /></mesh>
        {/* Flame glow */}
        <mesh position={[0, 9.40, 0]}><sphereGeometry args={[0.26, 14, 10]} /><meshStandardMaterial color="#ff6a00" emissive="#ff4400" emissiveIntensity={2.8} transparent opacity={0.85} /></mesh>
        <mesh position={[0, 9.68, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={3.5} transparent opacity={0.70} /></mesh>
        {/* Guy wires */}
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle, gi) => (
          <mesh key={`fguy-${gi}`} position={[Math.sin(angle) * 1.7, 4.0, Math.cos(angle) * 1.7]}
            rotation={[Math.atan2(4.0, 1.7), 0, -angle]}>
            <cylinderGeometry args={[0.006, 0.006, 4.50, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.80} roughness={0.50} />
          </mesh>
        ))}
        {/* Base KO pot */}
        <mesh position={[0.85, 0.55, 0]}><cylinderGeometry args={[0.22, 0.22, 0.80, 16]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0.85, 0.98, 0]}><coneGeometry args={[0.24, 0.15, 16]} /><primitive object={materials.steelDark} /></mesh>
        {showEastLabels && (<Html position={[0, 10.4, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Flare Stack Tower</span></div></Html>)}
      </group>

      {/* ── F. TRANSFER PUMP SKID ───────────────────────────────────────── */}
      <group position={[-4.2, 0, -5.8]}>
        <mesh position={[0, 0.08, 0]}><boxGeometry args={[1.80, 0.12, 1.10]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[-0.45, 0.42, 0]}><boxGeometry args={[0.55, 0.48, 0.55]} /><primitive object={materials.powerCabinWall} /></mesh>
        <mesh position={[-0.75, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.08, 16]} /><primitive object={materials.steelDark} /></mesh>
        <mesh position={[0.10, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.22, 0.22, 0.38, 16]} /><meshStandardMaterial color="#6b7280" metalness={0.88} roughness={0.30} /></mesh>
        <mesh position={[0.10, 0.38, 0.24]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.20, 12]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[0.10, 0.38, -0.24]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.20, 12]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[0.55, 0.38, 0.24]}><boxGeometry args={[0.13, 0.13, 0.11]} /><primitive object={materials.redValve} /></mesh>
        <mesh position={[0.72, 0.55, -0.20]}><boxGeometry args={[0.28, 0.65, 0.18]} /><primitive object={materials.powerCabinWall} /></mesh>
        <mesh position={[0.72, 0.55, -0.112]}><planeGeometry args={[0.16, 0.22]} /><meshBasicMaterial color="#0ea5e9" /></mesh>
        {showLabels && (<Html position={[0, 1.5, 0]} center distanceFactor={14}><div className="surface-facility-badge"><span className="facility-badge-dot" /><span>Transfer Pump Skid</span></div></Html>)}
      </group>

      {/* ── G. INTERCONNECTING PIPE NETWORK ─────────────────────────────── */}
      <group>
        {/* G1: Separator south drop → pump skid  Z -3.2 to -5.8 at X=-4.2 */}
        <mesh position={[-4.2, 0.52, -4.50]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 2.60, 14]} /><primitive object={materials.steelVessel} /></mesh>
        {[-3.85, -5.15].map((fz, fi) => (<mesh key={`sdrop-${fi}`} position={[-4.2, 0.52, fz]}><cylinderGeometry args={[0.12, 0.12, 0.05, 14]} /><primitive object={materials.steelMachined} /></mesh>))}
        {/* G2: Main oil header E-W at Z=-5.8, Y=0.52, X -7.8 to 1.8 */}
        <mesh position={[-3.0, 0.52, -5.80]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.085, 0.085, 9.6, 14]} /><primitive object={materials.steelVessel} /></mesh>
        {[-7.5, -6.2, -5.0, -3.8, -2.6, -1.4, -0.2, 1.0].map((hx, hi) => (<mesh key={`hdr-${hi}`} position={[hx, 0.52, -5.80]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.05, 14]} /><primitive object={materials.steelMachined} /></mesh>))}
        {/* Shoes along header */}
        {[-7.0, -5.5, -4.0, -2.5, -1.0].map((hx, hi) => (
          <group key={`hs-${hi}`} position={[hx, 0.28, -5.80]}>
            <mesh><cylinderGeometry args={[0.020, 0.020, 0.28, 8]} /><primitive object={materials.yellowStructural} /></mesh>
            <mesh position={[0, -0.14, 0]}><boxGeometry args={[0.18, 0.04, 0.18]} /><primitive object={materials.curbConcrete} /></mesh>
          </group>
        ))}
        {/* Header isolation valve */}
        <mesh position={[-4.2, 0.52, -5.80]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.135, 0.135, 0.22, 14]} /><primitive object={materials.steelDark} /></mesh>
        <group position={[-4.2, 0.80, -5.80]}>
          <mesh><cylinderGeometry args={[0.016, 0.016, 0.14, 8]} /></mesh>
          <mesh position={[0, 0.08, 0]}><torusGeometry args={[0.09, 0.016, 8, 14]} /><primitive object={materials.redValve} /></mesh>
        </group>
        {/* G3: Tank A drop  X=-6.5  Z -5.8 to -8.2 */}
        <mesh position={[-6.5, 0.52, -7.00]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 2.40, 14]} /><primitive object={materials.steelVessel} /></mesh>
        {/* Elbows at junctions */}
        {[[-6.5, 0.52, -5.92], [-6.5, 0.52, -8.08]].map(([ex, ey, ez], ei) => (<mesh key={`elbA-${ei}`} position={[ex, ey, ez]}><sphereGeometry args={[0.10, 10, 8]} /><primitive object={materials.steelMachined} /></mesh>))}
        {/* G4: Tank B drop  X=-2.8  Z -5.8 to -8.2 */}
        <mesh position={[-2.8, 0.52, -7.00]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 2.40, 14]} /><primitive object={materials.steelVessel} /></mesh>
        {[[-2.8, 0.52, -5.92], [-2.8, 0.52, -8.08]].map(([ex, ey, ez], ei) => (<mesh key={`elbB-${ei}`} position={[ex, ey, ez]}><sphereGeometry args={[0.10, 10, 8]} /><primitive object={materials.steelMachined} /></mesh>))}
        {/* G5: Water Tank drop  X=1.2  Z -5.8 to -8.2 */}
        <mesh position={[1.2, 0.52, -7.00]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.065, 0.065, 2.40, 14]} /><primitive object={materials.steelMachined} /></mesh>
        {/* G6: Elevated gas vent line (orange) from separator area to KO drum to flare */}
        {/* Seg A: east at Z=-3.2, Y=2.05, X -5.0 to 5.8 */}
        <mesh position={[0.4, 2.05, -3.2]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 10.8, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Seg B: south at X=5.8, Z -3.2 to -6.8, Y=2.05 */}
        <mesh position={[5.8, 2.05, -5.0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 3.60, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Drop to KO inlet */}
        <mesh position={[5.8, 1.58, -6.8]}><cylinderGeometry args={[0.045, 0.045, 0.94, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Seg C: east at Z=-6.8, X 5.8 to 11.8, Y=1.92 */}
        <mesh position={[8.8, 1.92, -6.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 6.0, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Seg D: south at X=11.8, Z -6.8 to -9.5, Y=1.92 */}
        <mesh position={[11.8, 1.92, -8.15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 2.70, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Rise into flare base */}
        <mesh position={[11.8, 0.96, -9.5]}><cylinderGeometry args={[0.045, 0.045, 1.92, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.78} roughness={0.28} /></mesh>
        {/* Gas line elevated supports */}
        {[-3.5, -0.5, 2.5].map((hx, hi) => (
          <group key={`gls-${hi}`} position={[hx, 0, -3.2]}>
            <mesh position={[0, 1.08, 0]}><cylinderGeometry args={[0.018, 0.018, 1.80, 8]} /><primitive object={materials.yellowStructural} /></mesh>
            <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.14, 0.08, 0.14]} /><primitive object={materials.padConcrete} /></mesh>
          </group>
        ))}
      </group>
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* =========================================================================
          8. PERIMETER WIRE-MESH SECURITY FENCE (Around Pad Boundary)
          Front glass and front top rail removed for clear viewing
          ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Tubular Steel Fence Posts */}
        {fencePosts.map((post, pidx) => (
          <mesh key={`fpost-${pidx}`} position={[post.x, 0.95, post.z]}>
            <cylinderGeometry args={[0.025, 0.025, 1.90, 8]} />
            <primitive object={materials.fencePost} />
          </mesh>
        ))}

        {/* Top Tension Rails — Back, Left, Right (Front rail removed) */}
        <mesh position={[2.75, 1.88, -13.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 29.5, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>
        <mesh position={[-12.0, 1.88, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 19.0, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>
        <mesh position={[17.5, 1.88, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 19.0, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>

        {/* Semi-transparent Wire Mesh Panels — Back, Left, Right (Front glass removed) */}
        <mesh position={[2.75, 0.95, -13.0]}>
          <planeGeometry args={[29.5, 1.85]} />
          <primitive object={materials.fenceWire} />
        </mesh>
        <mesh position={[-12.0, 0.95, -3.5]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[19.0, 1.85]} />
          <primitive object={materials.fenceWire} />
        </mesh>
        <mesh position={[17.5, 0.95, -3.5]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[19.0, 1.85]} />
          <primitive object={materials.fenceWire} />
        </mesh>

        {/* Bottom Tension Rails — Back, Left, Right */}
        <mesh position={[2.75, 0.08, -13.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 29.5, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>
        <mesh position={[-12.0, 0.08, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 19.0, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>
        <mesh position={[17.5, 0.08, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 19.0, 8]} />
          <primitive object={materials.fencePost} />
        </mesh>
      </group>

      {/* =========================================================================
          9. ELECTRIC POWER INFRASTRUCTURE
          ========================================================================= */}

      {/* ── 9a. 220kV LATTICE TRANSMISSION PYLON — mathematically correct
          Base: ±1.7m (3.4m). Top: ±0.3m. Height: 12m.
          Leg mid-points [±1.0, 6.0, ±1.0]. Length 12.16m. Tilt 0.116 rad.
          Face Z at height y: z(y) = 1.7 − 0.1167y
          Ring widths = 2 × z(y). Face X-brace midFace = avg z(y0)+z(y1).
          Galvanized-steel gray (#6b7280) for visual clarity.                */}
      <group position={[-14, 0, -18]} rotation={[0, Math.PI / 4, 0]}>

        {/* Concrete footing */}
        <mesh position={[0, 0.10, 0]}><boxGeometry args={[3.6, 0.20, 3.6]} /><primitive object={materials.padConcrete} /></mesh>

        {/* ── 4 TAPERED CYLINDER LEGS ─────────────────────────────────────
            [+x+z]: mid[ 1.0, 6.0,  1.0]  rot[-0.116, 0, +0.116]
            [-x+z]: mid[-1.0, 6.0,  1.0]  rot[-0.116, 0, -0.116]
            [+x-z]: mid[ 1.0, 6.0, -1.0]  rot[+0.116, 0, +0.116]
            [-x-z]: mid[-1.0, 6.0, -1.0]  rot[+0.116, 0, -0.116]            */}
        <mesh position={[ 1.0, 6.0,  1.0]} rotation={[-0.116, 0,  0.116]}><cylinderGeometry args={[0.088, 0.088, 12.16, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
        <mesh position={[-1.0, 6.0,  1.0]} rotation={[-0.116, 0, -0.116]}><cylinderGeometry args={[0.088, 0.088, 12.16, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
        <mesh position={[ 1.0, 6.0, -1.0]} rotation={[ 0.116, 0,  0.116]}><cylinderGeometry args={[0.088, 0.088, 12.16, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
        <mesh position={[-1.0, 6.0, -1.0]} rotation={[ 0.116, 0, -0.116]}><cylinderGeometry args={[0.088, 0.088, 12.16, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>

        {/* ── HORIZONTAL RING BRACING ─────────────────────────────────────
            leg_x(y) = 1.7 − 0.1167×y  →  ring width w = 2 × leg_x(y)
            y=0.2: w=3.35  y=3: w=2.70  y=6: w=2.00  y=9: w=1.30  y=11: w=0.84 */}
        {[
          { y: 0.20, w: 3.35 },
          { y: 3.00, w: 2.70 },
          { y: 6.00, w: 2.00 },
          { y: 9.00, w: 1.30 },
          { y: 11.0, w: 0.84 },
        ].map(({ y, w }, hi) => (
          <group key={`ring-${hi}`} position={[0, y, 0]}>
            <mesh><boxGeometry args={[w, 0.066, 0.066]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[w, 0.066, 0.066]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
          </group>
        ))}

        {/* ── X-DIAGONAL BRACING — true 3D line-segments from leg corner to leg corner ──
            Each diagonal goes from a ring corner at y0 to opposite ring corner at y1.
            s(y) = 1.7 - 0.1167y — actual leg position at height y
            For +Z face, Diag1: A=[-s0,y0,+s0] → B=[+s1,y1,+s1]
              D=[s0+s1, dh, s1-s0]=[ss, dh, ds]
              rotX=atan2(ds,dh)   rotZ=-atan2(ss,sqrt(dh²+ds²))
            For +Z face, Diag2: A=[+s0,y0,+s0] → B=[-s1,y1,+s1]
              D=[-ss, dh, ds]
              rotX=atan2(ds,dh)   rotZ=+atan2(ss,sqrt(dh²+ds²))
            For ±X faces: swap x↔z with sign adjustments (symmetric square tower)  */}
        {[
          { y0: 0.20, y1: 3.00, s0: 1.677, s1: 1.350 },
          { y0: 3.00, y1: 6.00, s0: 1.350, s1: 1.000 },
          { y0: 6.00, y1: 9.00, s0: 1.000, s1: 0.650 },
          { y0: 9.00, y1: 11.0, s0: 0.650, s1: 0.417 },
        ].map(({ y0, y1, s0, s1 }, pi) => {
          const midY   = (y0 + y1) / 2;
          const dh     = y1 - y0;
          const ds     = s1 - s0;          // negative (tower narrows)
          const ss     = s0 + s1;          // used for arm-tip X/Z positions
          const L      = Math.sqrt(ss*ss + dh*dh + ds*ds);   // diagonal length
          const qDhDs  = Math.sqrt(dh*dh + ds*ds);           // for ±Z face rotZ
          const qDhSs  = Math.sqrt(dh*dh + ss*ss);           // for ±X face rotZ
          const rxZ    = Math.atan2(ds, dh);                  // ≈ -0.116 all panels
          const rzZ    = Math.atan2(ss, qDhDs);               // varies: 0.82→0.65→0.50→0.49
          const rxX    = Math.atan2(ss, dh);                  // ≈ same as rzZ
          const rzX    = Math.atan2(-ds, qDhSs);              // small ≈ 0.079
          return (
            <group key={`xbr3d-${pi}`}>
              {/* +Z face */}
              <mesh position={[ ds/2, midY,  ss/2]} rotation={[ rxZ, 0, -rzZ]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              <mesh position={[-ds/2, midY,  ss/2]} rotation={[ rxZ, 0, +rzZ]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              {/* -Z face */}
              <mesh position={[ ds/2, midY, -ss/2]} rotation={[-rxZ, 0, -rzZ]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              <mesh position={[-ds/2, midY, -ss/2]} rotation={[-rxZ, 0, +rzZ]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              {/* +X face */}
              <mesh position={[ ss/2, midY,  ds/2]} rotation={[+rxX, 0, +rzX]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              <mesh position={[ ss/2, midY, -ds/2]} rotation={[-rxX, 0, +rzX]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              {/* -X face */}
              <mesh position={[-ss/2, midY, -ds/2]} rotation={[-rxX, 0, -rzX]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
              <mesh position={[-ss/2, midY,  ds/2]} rotation={[+rxX, 0, -rzX]}><boxGeometry args={[0.046, L, 0.046]}/><meshStandardMaterial color="#4b5563" metalness={0.80} roughness={0.40}/></mesh>
            </group>
          );
        })}


        {/* ── UPPER MAST (above 11m ring, carries cross-arm) ──────────── */}
        <mesh position={[0, 12.0, 0]}><cylinderGeometry args={[0.052, 0.095, 2.2, 8]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>

        {/* ── CROSS-ARM at 11.1m — 5.0m total span ───────────────────── */}
        <mesh position={[0, 11.1, 0]}><boxGeometry args={[5.0, 0.115, 0.115]} /><meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} /></mesh>
        {/* V-braces from mast to cross-arm tips */}
        {[-2.1, 2.1].map((ax, ai) => (
          <mesh key={`vb-${ai}`} position={[ax * 0.45, 11.45, 0]} rotation={[0, 0, Math.atan2(0.72, Math.abs(ax))]}>
            <boxGeometry args={[0.082, 1.55, 0.082]} />
            <meshStandardMaterial color="#6b7280" metalness={0.82} roughness={0.28} />
          </mesh>
        ))}

        {/* ── INSULATOR STRINGS — 3 phases hanging from cross-arm ─────── */}
        {[-1.8, 0, 1.8].map((ax, ai) => (
          <group key={`ins-${ai}`} position={[ax, 11.04, 0]}>
            {[0, 0.10, 0.20, 0.30].map((iy, ii) => (
              <mesh key={`d-${ii}`} position={[0, -iy, 0]}>
                <cylinderGeometry args={[0.050, 0.036, 0.068, 10]} />
                <meshStandardMaterial color="#bfdbfe" metalness={0.18} roughness={0.10} transparent opacity={0.90} />
              </mesh>
            ))}
          </group>
        ))}

        {/* ── LIGHTNING MAST + AVIATION WARNING LIGHT ─────────────────── */}
        <mesh position={[0, 13.5, 0]}><cylinderGeometry args={[0.016, 0.038, 3.2, 6]} /><meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.18} /></mesh>
        <mesh position={[0, 15.0, 0]}><sphereGeometry args={[0.062, 10, 8]} /><meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.8} /></mesh>

        {/* Transmission Tower 3D Callout Tag */}
        {showLabels && (
          <Html position={[0, 15.6, 0]} center distanceFactor={14}>
            <div className="surface-facility-badge">
              <span className="facility-badge-dot" />
              <span>220kV Transmission Tower</span>
            </div>
          </Html>
        )}
      </group>

      {/* ── 9b. GROUND-MOUNT DISTRIBUTION TRANSFORMER (beside Power Unit) ── */}
      <group position={[8.0, 0, -1.0]}>
        {/* Transformer tank body */}
        <mesh position={[0, 0.62, 0]}><boxGeometry args={[0.80, 1.10, 0.55]} /><meshStandardMaterial color="#374151" metalness={0.88} roughness={0.38} /></mesh>
        {/* Cooling fins */}
        {[-0.32, -0.20, -0.08, 0.04, 0.16, 0.28].map((fx, fi) => (
          <mesh key={`fin-${fi}`} position={[0, 0.62, fx - 0.12]}>
            <boxGeometry args={[0.06, 0.90, 0.016]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.40} />
          </mesh>
        ))}
        {/* HV bushing insulators on top */}
        {[-0.22, 0, 0.22].map((bx, bi) => (
          <group key={`bushing-${bi}`} position={[bx, 1.22, 0]}>
            <mesh><cylinderGeometry args={[0.042, 0.030, 0.38, 12]} /><meshStandardMaterial color="#e2e8f0" metalness={0.20} roughness={0.60} /></mesh>
            {[0.04, 0.12, 0.20, 0.30].map((dy, di) => (
              <mesh key={`shed-${di}`} position={[0, dy, 0]}><cylinderGeometry args={[0.065, 0.040, 0.025, 12]} /><meshStandardMaterial color="#f8fafc" metalness={0.10} roughness={0.70} /></mesh>
            ))}
          </group>
        ))}
        {/* Conservator tank on top */}
        <mesh position={[0, 1.48, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.55, 12]} /><meshStandardMaterial color="#374151" metalness={0.88} roughness={0.38} /></mesh>
        {/* Concrete plinth */}
        <mesh position={[0, 0.06, 0]}><boxGeometry args={[1.0, 0.12, 0.75]} /><primitive object={materials.padConcrete} /></mesh>
        {/* Yellow safety fence around transformer */}
        {[[-0.55, 0], [0.55, 0], [0, -0.42], [0, 0.42]].map(([rx, rz], ri) => (
          <mesh key={`tfpost-${ri}`} position={[rx, 0.52, rz]}><cylinderGeometry args={[0.014, 0.014, 1.0, 8]} /><primitive object={materials.yellowStructural} /></mesh>
        ))}
        {/* Transformer 3D Callout Tag */}
        {showEastLabels && (
          <Html position={[0, 2.0, 0]} center distanceFactor={14}>
            <div className="surface-facility-badge">
              <span className="facility-badge-dot" />
              <span>Distribution Transformer</span>
            </div>
          </Html>
        )}
      </group>

      {/* =========================================================================
          10. CORNER SECURITY FLOODLIGHT MASTS (4 corners of the compound)
          ========================================================================= */}
      {[
        [-8.4,  3.5],   // front-left corner
        [14.0,  3.5],   // front-right corner
        [-8.4, -10.5],  // back-left corner
        [14.0, -10.5],  // back-right corner
      ].map(([mx, mz], mi) => (
        <group key={`mast-${mi}`} position={[mx, 0, mz]}>
          {/* Steel pole */}
          <mesh position={[0, 4.8, 0]}><cylinderGeometry args={[0.040, 0.065, 9.5, 10]} /><meshStandardMaterial color="#475569" metalness={0.88} roughness={0.36} /></mesh>
          {/* Base plate */}
          <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.35, 0.12, 0.35]} /><primitive object={materials.steelDark} /></mesh>
          {/* Luminaire arm */}
          <mesh position={[0.18, 9.55, 0]} rotation={[0, 0, -Math.PI * 0.08]}><boxGeometry args={[0.50, 0.04, 0.04]} /><meshStandardMaterial color="#334155" metalness={0.90} roughness={0.35} /></mesh>
          {/* LED floodlight fixture */}
          <mesh position={[0.42, 9.42, 0]} rotation={[Math.PI * 0.18, 0, 0]}><boxGeometry args={[0.30, 0.08, 0.18]} /><meshStandardMaterial color="#1e293b" metalness={0.88} roughness={0.30} /></mesh>
          {/* Light face — emissive amber */}
          <mesh position={[0.42, 9.38, 0.09]} rotation={[Math.PI * 0.18, 0, 0]}><planeGeometry args={[0.24, 0.10]} /><meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.8} /></mesh>
        </group>
      ))}

      {/* =========================================================================
          11. SECONDARY CONTAINMENT BUND WALLS (around tank farm area)
          Tank farm: X -8.2..2.8, Z -6.5..-10.5
          Bund wall is 0.55m high poured concrete with yellow hazard stripe top
          ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Bund perimeter — 4 walls */}
        {/* North wall  (Z = -6.5, X = -8.0..2.5) */}
        <mesh position={[-2.75, 0.27, -6.5]}><boxGeometry args={[10.5, 0.55, 0.22]} /><primitive object={materials.curbConcrete} /></mesh>
        {/* South wall  (Z = -10.5, X = -8.0..2.5) */}
        <mesh position={[-2.75, 0.27, -10.5]}><boxGeometry args={[10.5, 0.55, 0.22]} /><primitive object={materials.curbConcrete} /></mesh>
        {/* West wall   (X = -8.0, Z = -6.5..-10.5) */}
        <mesh position={[-8.0, 0.27, -8.5]}><boxGeometry args={[0.22, 0.55, 4.0]} /><primitive object={materials.curbConcrete} /></mesh>
        {/* East wall   (X = 2.5, Z = -6.5..-10.5) */}
        <mesh position={[2.5, 0.27, -8.5]}><boxGeometry args={[0.22, 0.55, 4.0]} /><primitive object={materials.curbConcrete} /></mesh>
        {/* Yellow hazard stripe along top of all 4 walls */}
        <mesh position={[-2.75, 0.56, -6.5]}><boxGeometry args={[10.5, 0.06, 0.23]} /><primitive object={materials.yellowStructural} /></mesh>
        <mesh position={[-2.75, 0.56, -10.5]}><boxGeometry args={[10.5, 0.06, 0.23]} /><primitive object={materials.yellowStructural} /></mesh>
        <mesh position={[-8.0, 0.56, -8.5]}><boxGeometry args={[0.23, 0.06, 4.0]} /><primitive object={materials.yellowStructural} /></mesh>
        <mesh position={[2.5, 0.56, -8.5]}><boxGeometry args={[0.23, 0.06, 4.0]} /><primitive object={materials.yellowStructural} /></mesh>
        {/* Gravel floor inside bund (lighter colour) */}
        <mesh position={[-2.75, 0.055, -8.5]}>
          <boxGeometry args={[10.3, 0.04, 3.80]} />
          <meshStandardMaterial color="#c8b89a" roughness={0.97} metalness={0.01} />
        </mesh>
        {/* Bund drain sump cover at SW corner */}
        <mesh position={[-7.6, 0.08, -10.0]}><cylinderGeometry args={[0.15, 0.15, 0.04, 12]} /><primitive object={materials.steelDark} /></mesh>
        {/* Containment Bund 3D Callout Tag */}
        {showLabels && (
          <Html position={[-2.75, 1.1, -6.5]} center distanceFactor={14}>
            <div className="surface-facility-badge">
              <span className="facility-badge-dot" />
              <span>Secondary Containment Bund</span>
            </div>
          </Html>
        )}
      </group>

      {/* =========================================================================
          12. FIRE HYDRANT POSTS (red cast-iron, 3 around tank farm)
          ========================================================================= */}
      {[
        [-7.5, -6.8],
        [-2.5, -6.8],
        [-5.0, -10.2],
      ].map(([hx, hz], hi) => (
        <group key={`hydrant-${hi}`} position={[hx, 0, hz]}>
          <mesh position={[0, 0.40, 0]}><cylinderGeometry args={[0.090, 0.100, 0.72, 12]} /><meshStandardMaterial color="#dc2626" metalness={0.80} roughness={0.30} /></mesh>
          {/* Top bonnet */}
          <mesh position={[0, 0.79, 0]}><cylinderGeometry args={[0.065, 0.090, 0.16, 12]} /><meshStandardMaterial color="#dc2626" metalness={0.80} roughness={0.28} /></mesh>
          <mesh position={[0, 0.90, 0]}><cylinderGeometry args={[0.040, 0.055, 0.08, 12]} /><meshStandardMaterial color="#b91c1c" metalness={0.82} roughness={0.25} /></mesh>
          {/* Side outlet nozzle cap */}
          <mesh position={[0.12, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.038, 0.038, 0.12, 10]} /><meshStandardMaterial color="#dc2626" metalness={0.80} roughness={0.28} /></mesh>
          <mesh position={[0.18, 0.42, 0]}><cylinderGeometry args={[0.048, 0.048, 0.04, 10]} /><meshStandardMaterial color="#dc2626" metalness={0.80} roughness={0.28} /></mesh>
          {/* White reflective band */}
          <mesh position={[0, 0.55, 0]}><torusGeometry args={[0.093, 0.012, 6, 12]} /><meshStandardMaterial color="#f8fafc" metalness={0.60} roughness={0.20} /></mesh>
          {/* Concrete base collar */}
          <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.18, 0.20, 0.08, 12]} /><primitive object={materials.padConcrete} /></mesh>
        </group>
      ))}

      {/* =========================================================================
          13. ENTRANCE GATE (front fence gap with swing barrier & guard booth)
          ========================================================================= */}
      <group position={[2.8, 0, 4.0]}>
        {/* Gate post pillars */}
        {[-1.5, 1.5].map((gx, gi) => (
          <group key={`gpost-${gi}`} position={[gx, 0, 0]}>
            <mesh position={[0, 1.10, 0]}><boxGeometry args={[0.22, 2.20, 0.22]} /><primitive object={materials.steelDark} /></mesh>
            {/* Concrete base */}
            <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.38, 0.16, 0.38]} /><primitive object={materials.padConcrete} /></mesh>
            {/* Top cap pyramid */}
            <mesh position={[0, 2.28, 0]}><coneGeometry args={[0.16, 0.25, 4]} /><primitive object={materials.steelDark} /></mesh>
          </group>
        ))}
        {/* Horizontal barrier arm */}
        <mesh position={[0, 1.10, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.022, 2.8, 8]} /><meshStandardMaterial color="#ef4444" metalness={0.78} roughness={0.30} /></mesh>
        {/* Red/white stripes on arm */}
        {[-1.1, -0.5, 0.1, 0.7].map((sx, si) => (
          <mesh key={`stripe-${si}`} position={[sx, 1.10, 0]}><boxGeometry args={[0.20, 0.048, 0.048]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        ))}
        {/* Guard post/booth — small box */}
        <mesh position={[2.2, 0.75, 0.6]}><boxGeometry args={[0.85, 1.50, 0.80]} /><primitive object={materials.powerCabinWall} /></mesh>
        <mesh position={[2.2, 1.58, 0.6]}><boxGeometry args={[0.92, 0.10, 0.86]} /><primitive object={materials.powerCabinRoof} /></mesh>
        {/* Window */}
        <mesh position={[2.2, 0.82, 0.205]}><planeGeometry args={[0.50, 0.42]} /><meshStandardMaterial color="#7dd3fc" transparent opacity={0.65} /></mesh>
        {/* Bollard posts each side of gate */}
        {[-3.2, -2.5, 3.1, 3.8].map((bx, bi) => (
          <mesh key={`boll-${bi}`} position={[bx, 0.45, 0]}><cylinderGeometry args={[0.08, 0.10, 0.90, 10]} /><meshStandardMaterial color="#f59e0b" metalness={0.80} roughness={0.28} /></mesh>
        ))}
        {/* Guard Post 3D Callout Tag */}
        {showLabels && (
          <Html position={[2.2, 2.2, 0.6]} center distanceFactor={14}>
            <div className="surface-facility-badge">
              <span className="facility-badge-dot" />
              <span>Site Security Guard Post</span>
            </div>
          </Html>
        )}
      </group>

      {/* =========================================================================
          14. INSTRUMENT / WEATHER STATION MAST & GAS DETECTION POLES
          ========================================================================= */}
      {/* Meteorological / flare meteorology mast near flare (X=10.5, Z=-8.5) */}
      <group position={[10.5, 0, -8.5]}>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.020, 0.028, 5.0, 8]} /><meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.32} /></mesh>
        {/* Anemometer cup rotor */}
        <mesh position={[0, 5.1, 0]}><boxGeometry args={[0.50, 0.018, 0.018]} /><primitive object={materials.steelMachined} /></mesh>
        <mesh position={[0, 5.1, 0]} rotation={[0, Math.PI / 3, 0]}><boxGeometry args={[0.50, 0.018, 0.018]} /><primitive object={materials.steelMachined} /></mesh>
        {[0.25, -0.25].map((ax, ai) => (
          <mesh key={`cup-${ai}`} position={[ax, 5.12, 0]}><sphereGeometry args={[0.04, 8, 6]} /><primitive object={materials.steelMachined} /></mesh>
        ))}
        {/* Wind vane */}
        <mesh position={[0.15, 4.80, 0]} rotation={[0, 0, -Math.PI * 0.1]}><boxGeometry args={[0.28, 0.012, 0.012]} /><primitive object={materials.redValve} /></mesh>
        {/* Red aviation light */}
        <mesh position={[0, 5.22, 0]}><sphereGeometry args={[0.03, 8, 6]} /><meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.2} /></mesh>
        {/* Weather Mast 3D Callout Tag */}
        {showEastLabels && (
          <Html position={[0, 5.8, 0]} center distanceFactor={14}>
            <div className="surface-facility-badge">
              <span className="facility-badge-dot" />
              <span>Weather & Gas Monitoring Mast</span>
            </div>
          </Html>
        )}
      </group>
      {/* Gas detection pole near separator */}
      <group position={[-2.5, 0, -2.0]}>
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.016, 0.022, 3.0, 8]} /><meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} /></mesh>
        {/* Sensor housing */}
        <mesh position={[0.08, 2.80, 0]}><boxGeometry args={[0.14, 0.10, 0.10]} /><meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.30} /></mesh>
        {/* Yellow warning light */}
        <mesh position={[0.08, 2.96, 0]}><sphereGeometry args={[0.038, 8, 6]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
      </group>
      {/* Second detector near KO drum */}
      <group position={[4.5, 0, -6.2]}>
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.016, 0.022, 3.0, 8]} /><meshStandardMaterial color="#64748b" metalness={0.88} roughness={0.35} /></mesh>
        <mesh position={[0.08, 2.80, 0]}><boxGeometry args={[0.14, 0.10, 0.10]} /><meshStandardMaterial color="#fbbf24" metalness={0.78} roughness={0.30} /></mesh>
        <mesh position={[0.08, 2.96, 0]}><sphereGeometry args={[0.038, 8, 6]} /><meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.5} /></mesh>
      </group>

    </group>

  );
}
