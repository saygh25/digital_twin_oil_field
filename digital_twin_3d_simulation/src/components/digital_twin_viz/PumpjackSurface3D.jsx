import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { computeFourBarKinematics, PUMPJACK_GEOMETRY } from './pumpjackKinematics';
import { PIPE_COLORS, PIPE_PBR } from './pipeMaterialSpec';

/**
 * 3D Articulated Beam Pumpjack (API Class I Walking Beam Sucker Rod Pumping Unit)
 * 
 * Exact Analytical Four-Bar Linkage Kinematics (Law of Cosines):
 * - Fulcrum P = (0, H, 0) atop Samson post
 * - Crank center C = (xc, yc, 0), crank radius Rc = baseRc * (strokeLengthM / 1.83)
 * - Rear arm Lr = 2.10, front arm Lf = 2.80, rigid pitman link Lp = 2.35
 * - Walking beam rotation: phi(t) + baseOffset (analytical, ZERO sine placeholder!)
 * - Horsehead cable-riding face: circular arc of EXACT radius Lf = 2.80 centered at P(0,0)
 * - Rigid twin pitman arms positioned and angled strictly by the linkage math
 * - Subsurface rod string reads FrontEnd(t).y directly
 * - Structural parts: A-frame Samson post, counterweights, gearbox, electric motor,
 *   V-belt guard, external mechanical band brake wheel & ratchet lever, skid I-beams.
 */
export default function PumpjackSurface3D({
  spm = 4.2,
  vfdHz = 42.0,
  strokeLengthM = 1.83,
  isOperating = true,
  onSelectComponent,
  selectedComponent,
  isRodFloating = false,
  rodLagFactor = 0.0,
  showLabels = true
}) {
  const crankGroupRef = useRef();
  const walkingBeamRef = useRef();
  const pitmanArmRef = useRef();
  const polishedRodRef = useRef();
  const carrierBarRef = useRef();
  const bridleCablesRef = useRef();

  const { H, P, C, Lf, Lr, Lp, baseRc, wellboreX, crankZ } = PUMPJACK_GEOMETRY;

  // =========================================================================
  // HORSEHEAD SHAPE: Circular Arc of Exact Radius Lf = 2.80 Centered at P(0,0)
  // This curves the outer face so the vertical line at X = Lf is strictly tangent
  // at all beam tilt angles, keeping bridle wirelines and polished rod 100% vertical!
  // =========================================================================
  const horseheadArcGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const segments = 36;
    const alphaMin = -0.42; // rad (~ -24°)
    const alphaMax = 0.44;  // rad (~ +25.2°)
    const R_outer = Lf;     // Exactly 2.80m
    const width = 0.26;     // Width in Z
    const halfW = width / 2;

    const positions = [];
    const uvs = [];
    const normals = [];

    // Outer face where twin wireline bridle cables ride
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const alpha = alphaMin + t * (alphaMax - alphaMin);
      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);

      // 2 vertices per step across width Z
      positions.push(cosA * R_outer, sinA * R_outer, -halfW);
      positions.push(cosA * R_outer, sinA * R_outer, halfW);

      uvs.push(0, t);
      uvs.push(1, t);

      normals.push(cosA, sinA, 0);
      normals.push(cosA, sinA, 0);
    }

    const indices = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
      // Double sided
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }, [Lf]);

  // Upper Arc Wireline Cable Segment (Runs from top crown clamp at alpha = 0.44 down to tangent point alpha = -0.02)
  // NEVER wraps underneath the chin of the horsehead to prevent any arcing loop bug!
  const horseheadUpperCableGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const segments = 24;
    const alphaMin = -0.02; // Tangent contact point
    const alphaMax = 0.44;  // Top crown clamp bracket
    const R_outer = Lf;     // 2.80m
    const width = 0.024;    // Narrow cable ribbon in groove
    const halfW = width / 2;

    const positions = [];
    const uvs = [];
    const normals = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const alpha = alphaMin + t * (alphaMax - alphaMin);
      const cosA = Math.cos(alpha);
      const sinA = Math.sin(alpha);

      positions.push(cosA * (R_outer + 0.005), sinA * (R_outer + 0.005), -halfW);
      positions.push(cosA * (R_outer + 0.005), sinA * (R_outer + 0.005), halfW);

      uvs.push(0, t);
      uvs.push(1, t);

      normals.push(cosA, sinA, 0);
      normals.push(cosA, sinA, 0);
    }

    const indices = [];
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }, [Lf]);

  // Horsehead triangular side web plates with weight-reduction cutouts
  const horseheadWebGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Top attachment to walking beam upper flange
    shape.moveTo(2.20, 0.18);
    // Follow up to top apex of horsehead arc
    shape.lineTo(Lf * Math.cos(0.44), Lf * Math.sin(0.44));
    // Follow arc down to bottom tip of horsehead arc
    const segs = 16;
    for (let i = 1; i <= segs; i++) {
      const a = 0.44 - (i / segs) * 0.86;
      shape.lineTo(Lf * Math.cos(a) - 0.035, Lf * Math.sin(a));
    }
    // Return to walking beam bottom flange
    shape.lineTo(2.35, -0.18);
    shape.closePath();

    // Weight reduction circular holes in the web plate
    const hole1 = new THREE.Path();
    hole1.absarc(2.45, 0.45, 0.14, 0, Math.PI * 2, true);
    shape.holes.push(hole1);

    const hole2 = new THREE.Path();
    hole2.absarc(2.55, -0.22, 0.12, 0, Math.PI * 2, true);
    shape.holes.push(hole2);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2
    });
  }, [Lf]);

  // Sectoral / Crescent Counterweight Geometry (API Curved Counterbalance Slabs)
  const counterweightGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const rIn = 0.22;
    const rOut = 0.78;
    const angleSpan = Math.PI * 0.62; // ~112° arc
    const startAngle = -angleSpan / 2;

    shape.moveTo(rIn * Math.cos(startAngle), rIn * Math.sin(startAngle));
    shape.lineTo(rOut * Math.cos(startAngle), rOut * Math.sin(startAngle));
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const a = startAngle + (i / steps) * angleSpan;
      shape.lineTo(rOut * Math.cos(a), rOut * Math.sin(a));
    }
    shape.lineTo(rIn * Math.cos(startAngle + angleSpan), rIn * Math.sin(startAngle + angleSpan));
    for (let i = steps - 1; i >= 0; i--) {
      const a = startAngle + (i / steps) * angleSpan;
      shape.lineTo(rIn * Math.cos(a), rIn * Math.sin(a));
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2
    });
  }, []);

  // Frame animation loop driven by the EXACT Analytical Four-Bar Linkage
  useFrame((state) => {
    if (!isOperating || spm <= 0) return;

    const time = state.clock.getElapsedTime();
    const kinematics = computeFourBarKinematics(
      time,
      spm,
      strokeLengthM,
      isRodFloating,
      rodLagFactor
    );

    // 1. Walking Beam Rotation around Fulcrum P (top of Samson post):
    // Directly applies the law-of-cosines four-bar angle phi(t) + baseOffset:
    if (walkingBeamRef.current) {
      walkingBeamRef.current.rotation.z = kinematics.beamAngle;
    }

    // 2. Rotating Crank Arms & Counterweights around Crankshaft Center C:
    // Crank pin is positioned at angle thetaC in the XY plane:
    if (crankGroupRef.current) {
      crankGroupRef.current.rotation.z = kinematics.thetaC;
    }

    // 3. Rigid Twin Pitman Arms connecting Crank Pin to Walking Beam Tail Bearing:
    // Exact position and orientation matching the mathematical rigid link:
    if (pitmanArmRef.current) {
      pitmanArmRef.current.position.set(kinematics.pitmanMid.x, kinematics.pitmanMid.y, 0);
      pitmanArmRef.current.rotation.z = kinematics.pitmanAngle;
    }

    // 4. Carrier Bar, Dynamic Bridle Wirelines, and Polished Rod Vertical Motion:
    // Suspended directly from the circular arc tangent point at X = wellboreX:
    if (carrierBarRef.current) {
      carrierBarRef.current.position.y = kinematics.carrierBarY;
    }
    if (polishedRodRef.current) {
      polishedRodRef.current.position.y = kinematics.polishedRodY;
    }
    if (bridleCablesRef.current) {
      // Dynamic vertical bridle cables: strictly connecting horsehead tangent point (P.y = 3.20m) to carrier bar top
      const yTop = P.y; // 3.20m
      const yBottom = kinematics.carrierBarY + 0.045; // Top surface of carrier bar block
      const cableLength = Math.max(0.08, yTop - yBottom);
      bridleCablesRef.current.position.y = (yTop + yBottom) / 2;
      bridleCablesRef.current.scale.set(1, cableLength, 1);
    }
  });

  const isSelected = selectedComponent === 'pumpjack';

  return (
    <group position={[0, 0, 0]}>
      {/* =========================================================================
          STRUCTURAL FOUNDATION: HEAVY WIDE-FLANGE STEEL I-BEAM SKID RAILS
          ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Longitudinal Skid Rail (+Z) */}
        <mesh position={[0.4, 0.06, 0.85]}>
          <boxGeometry args={[7.8, 0.14, 0.22]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Longitudinal Skid Rail (-Z) */}
        <mesh position={[0.4, 0.06, -0.85]}>
          <boxGeometry args={[7.8, 0.14, 0.22]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Transverse Cross-Ties (4 structural box members) */}
        {[-2.8, -1.2, 0.6, 2.6].map((tx, idx) => (
          <mesh key={idx} position={[tx, 0.06, 0]}>
            <boxGeometry args={[0.18, 0.14, 1.85]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseMedium}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
        ))}
      </group>

      {/* =========================================================================
          1. SAMSON POST: HEAVY A-FRAME SUPPORT TOWER (Supports Fulcrum P at y = H)
          ========================================================================= */}
      <group position={[P.x, 0, P.z]}>
        {/* Front-Left Leg (+Z, -X) */}
        <mesh position={[-0.48, H * 0.48, 0.65]} rotation={[0.08, 0, -0.14]}>
          <cylinderGeometry args={[0.075, 0.095, H * 0.98, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Front-Right Leg (+Z, +X) */}
        <mesh position={[0.48, H * 0.48, 0.65]} rotation={[0.08, 0, 0.14]}>
          <cylinderGeometry args={[0.075, 0.095, H * 0.98, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Rear-Left Leg (-Z, -X) */}
        <mesh position={[-0.48, H * 0.48, -0.65]} rotation={[-0.08, 0, -0.14]}>
          <cylinderGeometry args={[0.075, 0.095, H * 0.98, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Rear-Right Leg (-Z, +X) */}
        <mesh position={[0.48, H * 0.48, -0.65]} rotation={[-0.08, 0, 0.14]}>
          <cylinderGeometry args={[0.075, 0.095, H * 0.98, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* Base Anchor Footplates for Samson Post */}
        {[
          [-0.48, 0.08, 0.65],
          [0.48, 0.08, 0.65],
          [-0.48, 0.08, -0.65],
          [0.48, 0.08, -0.65]
        ].map((bp, bidx) => (
          <mesh key={bidx} position={bp}>
            <boxGeometry args={[0.26, 0.04, 0.24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseMedium}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
        ))}

        {/* Structural Horizontal Cross-Ties */}
        <mesh position={[0, 1.25, 0.65]}>
          <boxGeometry args={[1.05, 0.06, 0.06]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 1.25, -0.65]}>
          <boxGeometry args={[1.05, 0.06, 0.06]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 2.20, 0.52]}>
          <boxGeometry args={[0.78, 0.06, 0.06]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 2.20, -0.52]}>
          <boxGeometry args={[0.78, 0.06, 0.06]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* Diagonal X-Braces */}
        <mesh position={[0, 1.72, 0.58]} rotation={[0, 0, 0.52]}>
          <boxGeometry args={[1.15, 0.045, 0.045]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 1.72, 0.58]} rotation={[0, 0, -0.52]}>
          <boxGeometry args={[1.15, 0.045, 0.045]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 1.72, -0.58]} rotation={[0, 0, 0.52]}>
          <boxGeometry args={[1.15, 0.045, 0.045]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        <mesh position={[0, 1.72, -0.58]} rotation={[0, 0, -0.52]}>
          <boxGeometry args={[1.15, 0.045, 0.045]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* Rear Access Ladder with Safety Cage */}
        <group position={[-0.56, 0, 0]}>
          {/* Ladder Side Rails */}
          <mesh position={[0, H * 0.48, -0.20]}>
            <cylinderGeometry args={[0.015, 0.015, H * 0.94, 8]} />
            <meshStandardMaterial
              color={PIPE_COLORS.conduit}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          <mesh position={[0, H * 0.48, 0.20]}>
            <cylinderGeometry args={[0.015, 0.015, H * 0.94, 8]} />
            <meshStandardMaterial
              color={PIPE_COLORS.conduit}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Ladder Rungs */}
          {Array.from({ length: 9 }).map((_, rIdx) => (
            <mesh key={rIdx} position={[0, 0.35 + rIdx * 0.30, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.40, 8]} />
              <meshStandardMaterial
                color={PIPE_COLORS.hardware}
                metalness={PIPE_PBR.hardware.metalness}
                roughness={PIPE_PBR.hardware.roughness}
              />
            </mesh>
          ))}
          {/* Safety Cage Hoops (horizontal protective rings spanning between rails) */}
          {[1.4, 1.8, 2.2, 2.6, 3.0].map((hy, hIdx) => (
            <mesh key={hIdx} position={[-0.15, hy, 0]} rotation={[Math.PI / 2, 0, 0.927]}>
              <torusGeometry args={[0.25, 0.010, 8, 24, 4.43]} />
              <meshStandardMaterial
                color={PIPE_COLORS.conduit}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
          ))}
          {/* Safety Cage Longitudinal Straps (connecting all hoops vertically) */}
          {/* Rear center spine */}
          <mesh position={[-0.39, 2.20, 0]}>
            <boxGeometry args={[0.012, 1.62, 0.024]} />
            <meshStandardMaterial
              color={PIPE_COLORS.conduit}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Left vertical strap */}
          <mesh position={[-0.32, 2.20, -0.17]}>
            <boxGeometry args={[0.012, 1.62, 0.024]} />
            <meshStandardMaterial
              color={PIPE_COLORS.conduit}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Right vertical strap */}
          <mesh position={[-0.32, 2.20, 0.17]}>
            <boxGeometry args={[0.012, 1.62, 0.024]} />
            <meshStandardMaterial
              color={PIPE_COLORS.conduit}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
        </group>

        {/* Top Saddle Bearing Pillow Block Housing at Fulcrum P */}
        <group position={[0, H, 0]}>
          {/* Heavy Base Clamping Block */}
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.42, 0.12, 1.45]} />
            <meshStandardMaterial
              color={PIPE_COLORS.stuffingBoxBody}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Center Saddle Bearing Shaft */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 1.55, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.suckerRod}
              metalness={PIPE_PBR.suckerRod.metalness}
              roughness={PIPE_PBR.suckerRod.roughness}
            />
          </mesh>
          {/* Central Grease Cap & Fitting */}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
            <meshStandardMaterial
              color={PIPE_COLORS.stuffingBoxNut}
              metalness={PIPE_PBR.nut.metalness}
              roughness={PIPE_PBR.nut.roughness}
            />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          2. GEARBOX, ELECTRIC MOTOR & MECHANICAL BAND BRAKE ASSEMBLY (At Crank Center C)
          ========================================================================= */}
      <group position={[C.x, 0, C.z]}>
        {/* Double-Reduction Helical Gearbox Cast Housing */}
        <mesh position={[0, C.y * 0.72, 0]}>
          <boxGeometry args={[1.25, 1.15, 1.45]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Gearbox Top Inspection Cover Plate with Hex Bolts */}
        <mesh position={[0, C.y * 0.72 + 0.58, 0]}>
          <boxGeometry args={[0.95, 0.04, 1.15]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Gearbox Oil Level Sight Glass */}
        <mesh position={[0.63, 0.45, 0.45]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 16]} />
          <meshStandardMaterial
            color={PIPE_COLORS.sensorBezel}
            metalness={0.80}
            roughness={0.20}
          />
        </mesh>

        {/* Heavy Electric Induction Motor */}
        <group position={[-1.15, 0.48, 0]}>
          {/* Motor Finned Stator Body */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.34, 0.34, 0.85, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Rear Finned Cooling Fan Shroud */}
          <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.35, 0.35, 0.12, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseBrown}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Conduit Terminal Box */}
          <mesh position={[0, 0.35, 0.18]}>
            <boxGeometry args={[0.22, 0.18, 0.16]} />
            <meshStandardMaterial
              color={PIPE_COLORS.junctionBox}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
        </group>

        {/* V-Belt Drive Pulley Guard Enclosure (Between Motor and Gearbox) */}
        <mesh position={[-0.62, 0.52, -0.55]}>
          <boxGeometry args={[0.38, 0.82, 0.32]} />
          <meshStandardMaterial
            color={PIPE_COLORS.shroud}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* MECHANICAL BAND BRAKE WHEEL & PARKING BRAKE LEVER */}
        <group position={[-0.52, C.y + 0.18, 0.76]}>
          {/* Cast Iron Brake Drum Wheel */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.12, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Ground Friction Rim Band */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.245, 0.245, 0.09, 24, 1, true]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseBrown}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Flexible External Steel Brake Band */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.252, 0.016, 8, 24, Math.PI * 1.5]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseMedium}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Industrial Parking Brake Hand-Lever */}
          <mesh position={[0.22, 0.42, 0.08]} rotation={[0, 0, -0.42]}>
            <cylinderGeometry args={[0.018, 0.018, 0.72, 12]} />
            <meshStandardMaterial
              color={PIPE_COLORS.hardware}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
          {/* Notched Ratchet Sector Plate */}
          <mesh position={[0.12, 0.14, 0.08]}>
            <boxGeometry args={[0.16, 0.14, 0.03]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
        </group>

        {/* Main Crankshaft Passing Through Gearbox */}
        <mesh position={[0, C.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.10, 0.10, 2.05, 24]} />
          <meshStandardMaterial
            color={PIPE_COLORS.suckerRod}
            metalness={PIPE_PBR.suckerRod.metalness}
            roughness={PIPE_PBR.suckerRod.roughness}
          />
        </mesh>

        {/* =========================================================================
            ROTATING CRANK ASSEMBLY & COUNTERWEIGHTS (Rotates at thetaC(t) around C)
            ========================================================================= */}
        <group ref={crankGroupRef} position={[0, C.y, 0]}>
          {/* Front Crank Arm & Counterweight (+Z) */}
          <group position={[0, 0, crankZ]}>
            {/* Forged Steel Crank Arm (extending from C to Pin at distance baseRc) */}
            <mesh position={[baseRc * 0.5, 0, 0]}>
              <boxGeometry args={[baseRc + 0.18, 0.22, 0.09]} />
              <meshStandardMaterial
                color={PIPE_COLORS.baseDark}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
            {/* Heavy Cast Sectoral Counterweight [ACCENT PART 1: WEATHERED RUST-RED] */}
            <mesh position={[-baseRc * 0.65, 0, 0]} rotation={[0, 0, Math.PI]}>
              <primitive object={counterweightGeometry} />
              <meshStandardMaterial
                color={PIPE_COLORS.pumpjackRustRed}
                metalness={PIPE_PBR.pumpjackAccent.metalness}
                roughness={PIPE_PBR.pumpjackAccent.roughness}
              />
            </mesh>
            {/* Counterweight Heavy Cast Clamping Bracket (dark aged steel) */}
            <mesh position={[-baseRc * 0.65, 0, 0.10]}>
              <boxGeometry args={[0.38, 0.24, 0.02]} />
              <meshStandardMaterial
                color={PIPE_COLORS.baseDark}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
            {/* Front Heavy Crank Pin (Located at distance baseRc from center) */}
            <mesh position={[baseRc, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.24, 20]} />
              <meshStandardMaterial
                color={PIPE_COLORS.suckerRod}
                metalness={PIPE_PBR.suckerRod.metalness}
                roughness={PIPE_PBR.suckerRod.roughness}
              />
            </mesh>
            {/* Crank Pin Retaining Collar & Cap */}
            <mesh position={[baseRc, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.03, 16]} />
              <meshStandardMaterial
                color={PIPE_COLORS.stuffingBoxNut}
                metalness={PIPE_PBR.nut.metalness}
                roughness={PIPE_PBR.nut.roughness}
              />
            </mesh>
          </group>

          {/* Rear Crank Arm & Counterweight (-Z) */}
          <group position={[0, 0, -crankZ]}>
            {/* Forged Steel Crank Arm */}
            <mesh position={[baseRc * 0.5, 0, 0]}>
              <boxGeometry args={[baseRc + 0.18, 0.22, 0.09]} />
              <meshStandardMaterial
                color={PIPE_COLORS.baseDark}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
            {/* Heavy Cast Sectoral Counterweight [ACCENT PART 1: WEATHERED RUST-RED] */}
            <mesh position={[-baseRc * 0.65, 0, -0.18]} rotation={[0, 0, Math.PI]}>
              <primitive object={counterweightGeometry} />
              <meshStandardMaterial
                color={PIPE_COLORS.pumpjackRustRed}
                metalness={PIPE_PBR.pumpjackAccent.metalness}
                roughness={PIPE_PBR.pumpjackAccent.roughness}
              />
            </mesh>
            {/* Counterweight Heavy Cast Clamping Bracket (dark aged steel) */}
            <mesh position={[-baseRc * 0.65, 0, -0.10]}>
              <boxGeometry args={[0.38, 0.24, 0.02]} />
              <meshStandardMaterial
                color={PIPE_COLORS.baseDark}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
            {/* Rear Heavy Crank Pin */}
            <mesh position={[baseRc, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 0.24, 20]} />
              <meshStandardMaterial
                color={PIPE_COLORS.suckerRod}
                metalness={PIPE_PBR.suckerRod.metalness}
                roughness={PIPE_PBR.suckerRod.roughness}
              />
            </mesh>
            {/* Rear Retaining Collar */}
            <mesh position={[baseRc, 0, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.03, 16]} />
              <meshStandardMaterial
                color={PIPE_COLORS.stuffingBoxNut}
                metalness={PIPE_PBR.nut.metalness}
                roughness={PIPE_PBR.nut.roughness}
              />
            </mesh>
          </group>
        </group>
      </group>

      {/* =========================================================================
          3. RIGID TWIN PITMAN CONNECTING ARMS (Connecting Pin(t) to RearEnd(t))
          Positioned and angled strictly by the mathematical four-bar linkage solve
          ========================================================================= */}
      <group ref={pitmanArmRef}>
        {/* Front Pitman Rod (+Z) */}
        <mesh position={[0, 0, crankZ]}>
          <cylinderGeometry args={[0.048, 0.048, Lp, 16]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Lower Crank-Pin Wrist Bearing Socket (+Z) */}
        <mesh position={[0, -Lp / 2, crankZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.14, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Upper Tail-Bearing Eye Socket (+Z) */}
        <mesh position={[0, Lp / 2, crankZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.090, 0.090, 0.14, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* Rear Pitman Rod (-Z) */}
        <mesh position={[0, 0, -crankZ]}>
          <cylinderGeometry args={[0.048, 0.048, Lp, 16]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Lower Crank-Pin Wrist Bearing Socket (-Z) */}
        <mesh position={[0, -Lp / 2, -crankZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.095, 0.095, 0.14, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Upper Tail-Bearing Eye Socket (-Z) */}
        <mesh position={[0, Lp / 2, -crankZ]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.090, 0.090, 0.14, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseMedium}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>

        {/* Heavy Equalizer Cross-Beam (Spanning between top ends of pitman arms) */}
        <mesh position={[0, Lp / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, crankZ * 2 + 0.22, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
      </group>

      {/* =========================================================================
          4. WALKING BEAM & HORSEHEAD ASSEMBLY (Pivoting at Fulcrum P = (0, H, 0))
          Rotation driven strictly by law-of-cosines analytical solve: beamAngle(t)
          ========================================================================= */}
      <group
        position={[P.x, P.y, P.z]}
        ref={walkingBeamRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('pumpjack');
        }}
        cursor="pointer"
      >
        {/* Heavy Structural Steel Walking Beam (Wide-Flange I-Beam Section) */}
        {/* Extends from Rear Tail Bearing (x = -Lr = -2.10) to Front Nose (x = +Lf = +2.80) */}
        <group position={[(Lf - Lr) / 2, 0, 0]}>
          {/* Center Web Plate */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[Lf + Lr, 0.38, 0.04]} />
            <meshStandardMaterial
              color={isSelected ? '#38bdf8' : PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
              emissive={isSelected ? '#0284c7' : '#000000'}
              emissiveIntensity={isSelected ? 0.35 : 0.0}
            />
          </mesh>
          {/* Top Flange Plate */}
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[Lf + Lr + 0.08, 0.035, 0.36]} />
            <meshStandardMaterial
              color={isSelected ? '#38bdf8' : PIPE_COLORS.baseBrown}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Bottom Flange Plate */}
          <mesh position={[0, -0.19, 0]}>
            <boxGeometry args={[Lf + Lr + 0.08, 0.035, 0.36]} />
            <meshStandardMaterial
              color={isSelected ? '#38bdf8' : PIPE_COLORS.baseBrown}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Web Stiffener Ribs (Reinforcing ribs along the beam) */}
          {[-1.5, -0.8, 0.8, 1.6, 2.2].map((sx, idx) => (
            <mesh key={idx} position={[sx, 0, 0]}>
              <boxGeometry args={[0.03, 0.34, 0.32]} />
              <meshStandardMaterial
                color={PIPE_COLORS.baseDark}
                metalness={PIPE_PBR.pumpjackStructural.metalness}
                roughness={PIPE_PBR.pumpjackStructural.roughness}
              />
            </mesh>
          ))}
        </group>

        {/* Center Saddle Bearing Clamping Housing (At Pivot P: x = 0, y = 0) */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.48, 0.44, 0.42]} />
          <meshStandardMaterial
            color={PIPE_COLORS.stuffingBoxBody}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* 4 Heavy Saddle Bearing Clamping U-Bolts */}
        {[-0.14, 0.14].map((ux) =>
          [-0.14, 0.14].map((uz) => (
            <mesh key={`${ux}_${uz}`} position={[ux, 0.22, uz]}>
              <cylinderGeometry args={[0.016, 0.016, 0.08, 12]} />
              <meshStandardMaterial
                color={PIPE_COLORS.bolt}
                metalness={PIPE_PBR.bolt.metalness}
                roughness={PIPE_PBR.bolt.roughness}
              />
            </mesh>
          ))
        )}

        {/* Equalizer Tail Bearing at Rear Arm Tip (x = -Lr = -2.10) */}
        <group position={[-Lr, 0, 0]}>
          {/* Tail Bearing Journal Sleeve */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, crankZ * 2 + 0.28, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Heavy Tail Bearing Clamping Block */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.26, 0.28, 0.38]} />
            <meshStandardMaterial
              color={PIPE_COLORS.baseMedium}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
        </group>

        {/* =========================================================================
            HORSEHEAD ASSEMBLY [ACCENT PART 2: WEATHERED RUST-RED]
            Outer Circular Arc of EXACT Radius Lf = 2.80 Centered at P(0,0)
            ========================================================================= */}
        <group position={[0, 0, 0]}>
          {/* 1. Curved Outer Cable-Riding Face Plate [WEATHERED RUST-RED] */}
          <mesh geometry={horseheadArcGeometry}>
            <meshStandardMaterial
              color={PIPE_COLORS.pumpjackRustRed}
              metalness={PIPE_PBR.pumpjackAccent.metalness}
              roughness={PIPE_PBR.pumpjackAccent.roughness}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 2. Dual Cable Guide Grooves & Retaining Lips on the Curved Arc */}
          {/* Center Dividing Ridge */}
          <mesh position={[0, 0, 0]} geometry={horseheadArcGeometry} scale={[1.006, 1.006, 0.08]}>
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          {/* Outer Guide Lips */}
          <mesh position={[0, 0, 0.125]} geometry={horseheadArcGeometry} scale={[1.008, 1.008, 0.04]}>
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>
          <mesh position={[0, 0, -0.125]} geometry={horseheadArcGeometry} scale={[1.008, 1.008, 0.04]}>
            <meshStandardMaterial
              color={PIPE_COLORS.baseDark}
              metalness={PIPE_PBR.pumpjackStructural.metalness}
              roughness={PIPE_PBR.pumpjackStructural.roughness}
            />
          </mesh>

          {/* 3. Front (+Z) Triangular Side Web Plate [WEATHERED RUST-RED] */}
          <mesh position={[0, 0, 0.11]}>
            <primitive object={horseheadWebGeometry} />
            <meshStandardMaterial
              color={PIPE_COLORS.pumpjackRustRed}
              metalness={PIPE_PBR.pumpjackAccent.metalness}
              roughness={PIPE_PBR.pumpjackAccent.roughness}
            />
          </mesh>
          {/* 4. Rear (-Z) Triangular Side Web Plate [WEATHERED RUST-RED] */}
          <mesh position={[0, 0, -0.13]}>
            <primitive object={horseheadWebGeometry} />
            <meshStandardMaterial
              color={PIPE_COLORS.pumpjackRustRed}
              metalness={PIPE_PBR.pumpjackAccent.metalness}
              roughness={PIPE_PBR.pumpjackAccent.roughness}
            />
          </mesh>

          {/* 5. Top Hoist Eye / Crown Lifting Bracket at Horsehead Apex */}
          <mesh
            position={[Lf * Math.cos(0.44) - 0.04, Lf * Math.sin(0.44) + 0.02, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.08, 0.022, 12, 24]} />
            <meshStandardMaterial
              color={PIPE_COLORS.stuffingBoxNut}
              metalness={PIPE_PBR.nut.metalness}
              roughness={PIPE_PBR.nut.roughness}
            />
          </mesh>

          {/* 6. Wireline Cables Seated in Upper Horsehead Guide Grooves */}
          {/* Left Cable on Upper Arc (Crown apex to tangent point) */}
          <mesh position={[0, 0, 0.065]} geometry={horseheadUpperCableGeometry}>
            <meshStandardMaterial
              color={PIPE_COLORS.bridleCable}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
          {/* Right Cable on Upper Arc (Crown apex to tangent point) */}
          <mesh position={[0, 0, -0.065]} geometry={horseheadUpperCableGeometry}>
            <meshStandardMaterial
              color={PIPE_COLORS.bridleCable}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          5. WIRELINE BRIDLE, CARRIER BAR & POLISHED ROD (At Wellhead Centerline X = wellboreX)
          Strictly plumb vertical travel into stuffing box: FrontEnd(t).y kinematics
          ========================================================================= */}
      <group position={[wellboreX, 0, 0]}>
        {/* Heavy API Wellhead Companion Flange & Christmas Tree Base */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.26, 0.32, 0.44, 24]} />
          <meshStandardMaterial
            color={PIPE_COLORS.wellheadFlange}
            metalness={PIPE_PBR.hardware.metalness}
            roughness={PIPE_PBR.hardware.roughness}
          />
        </mesh>
        {/* Wellhead Flowline Tee Outlets */}
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.72, 16]} />
          <meshStandardMaterial
            color={PIPE_COLORS.wellheadFlowline}
            metalness={PIPE_PBR.hardware.metalness}
            roughness={PIPE_PBR.hardware.roughness}
          />
        </mesh>
        {/* Stuffing Box Housing with Locked Dark Packing Gland Nut (no gold/brass) */}
        <mesh position={[0, 0.60, 0]}>
          <cylinderGeometry args={[0.14, 0.16, 0.38, 20]} />
          <meshStandardMaterial
            color={PIPE_COLORS.stuffingBoxBody}
            metalness={PIPE_PBR.bolt.metalness}
            roughness={PIPE_PBR.hardware.roughness}
          />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.11, 0.14, 0.09, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.stuffingBoxNut}
            metalness={PIPE_PBR.nut.metalness}
            roughness={PIPE_PBR.nut.roughness}
          />
        </mesh>

        {/* Dynamic Twin Wireline Bridle Cables Hanging Vertically from Horsehead Arc Tangent (y=3.20) to Carrier Bar */}
        <group ref={bridleCablesRef} position={[0, 2.58, 0]}>
          {/* Left Vertical Bridle Wireline (+Z) */}
          <mesh position={[0, 0, 0.065]}>
            <cylinderGeometry args={[0.010, 0.010, 1.0, 12]} />
            <meshStandardMaterial
              color={PIPE_COLORS.bridleCable}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
          {/* Right Vertical Bridle Wireline (-Z) */}
          <mesh position={[0, 0, -0.065]}>
            <cylinderGeometry args={[0.010, 0.010, 1.0, 12]} />
            <meshStandardMaterial
              color={PIPE_COLORS.bridleCable}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
        </group>

        {/* MOVING CARRIER BAR (Suspended from bridle cables below horsehead arc) */}
        <group ref={carrierBarRef} position={[0, 2.60, 0]}>
          {/* Heavy Forged Steel Carrier Bar Block */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.48, 0.09, 0.22]} />
            <meshStandardMaterial
              color={PIPE_COLORS.carrierBar}
              metalness={PIPE_PBR.hardware.metalness}
              roughness={PIPE_PBR.hardware.roughness}
            />
          </mesh>
          {/* Polished Rod Clamp (Resting on top of carrier bar) */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.18, 0.08, 0.14]} />
            <meshStandardMaterial
              color={PIPE_COLORS.polishedRodClamp}
              metalness={PIPE_PBR.bolt.metalness}
              roughness={PIPE_PBR.bolt.roughness}
            />
          </mesh>
        </group>

        {/* MOVING POLISHED ROD (Reciprocating vertically through stuffing box) */}
        <group ref={polishedRodRef} position={[0, 1.95, 0]}>
          <mesh position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 3.40, 24]} />
            <meshStandardMaterial
              color={isRodFloating ? '#ef4444' : PIPE_COLORS.polishedRod}
              metalness={PIPE_PBR.pumpMirror.metalness}
              roughness={PIPE_PBR.pumpMirror.roughness}
              emissive={isRodFloating ? '#ef4444' : '#000000'}
              emissiveIntensity={isRodFloating ? 0.75 : 0.0}
            />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          6. VARIABLE FREQUENCY DRIVE (VFD) SMART INVERTER PANEL
          ========================================================================= */}
      <group
        position={[-2.4, 0, 2.1]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent?.('vfd');
        }}
        cursor="pointer"
      >
        {/* Support Pedestal Stand */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.70, 8]} />
          <meshStandardMaterial
            color={PIPE_COLORS.conduit}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Weatherproof NEMA Enclosure Body */}
        <mesh position={[0, 1.05, 0]}>
          <boxGeometry args={[0.68, 0.88, 0.36]} />
          <meshStandardMaterial
            color={PIPE_COLORS.baseDark}
            metalness={PIPE_PBR.pumpjackStructural.metalness}
            roughness={PIPE_PBR.pumpjackStructural.roughness}
          />
        </mesh>
        {/* Digital Telemetry Display Screen */}
        <mesh position={[0, 1.15, 0.185]}>
          <planeGeometry args={[0.48, 0.42]} />
          <meshStandardMaterial color="#0369a1" emissive="#0284c7" emissiveIntensity={0.55} />
        </mesh>
        {/* Heartbeat Status LED */}
        <mesh position={[0.22, 1.36, 0.195]}>
          <circleGeometry args={[0.03, 16]} />
          <meshBasicMaterial color={isRodFloating ? '#ef4444' : '#10b981'} />
        </mesh>

        {/* Live VFD Floating Telemetry Badge */}
        {showLabels && (
          <Html position={[0, 1.72, 0]} center distanceFactor={12}>
            <div className="vfd-floating-badge" style={{
              background: 'rgba(36, 30, 24, 0.94)',
              border: `1px solid ${isRodFloating ? '#ef4444' : 'rgba(217, 119, 6, 0.6)'}`,
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#f8fafc',
              fontFamily: 'monospace',
              fontSize: '11px',
              boxShadow: `0 4px 14px ${isRodFloating ? 'rgba(239,68,68,0.4)' : 'rgba(0,0,0,0.3)'}`,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(6px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isRodFloating ? '#ef4444' : '#10b981',
                  boxShadow: `0 0 6px ${isRodFloating ? '#ef4444' : '#10b981'}`
                }} />
                <strong style={{ color: '#38bdf8' }}>API CLASS I PUMPJACK</strong>
              </div>
              <div style={{ marginTop: '2px', color: '#facc15' }}>
                {vfdHz.toFixed(1)} Hz | {spm.toFixed(1)} SPM (4-Bar Solve)
              </div>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
