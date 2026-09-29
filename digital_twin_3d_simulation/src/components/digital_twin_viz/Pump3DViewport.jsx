import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Gauge,
  Sparkles,
  Layers,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Activity,
  Eye,
  Sliders,
  Zap,
  CheckCircle2,
  Maximize2,
  Thermometer,
  Flame,
  Droplets,
  AlertTriangle,
  ShieldAlert,
  Wind
} from 'lucide-react';

export default function Pump3DViewport({
  selectedPart = 'pump',
  onSelectPart,
  pumpComponents = {}
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);

  // Simulation & Animation States
  const [isPlaying, setIsPlaying] = useState(true);
  const [spm, setSpm] = useState(8.5); // Strokes Per Minute (4 to 18 SPM)
  const [strokeLengthM, setStrokeLengthM] = useState(2.4); // meters (1.2 to 3.6m)
  const [viewPreset, setViewPreset] = useState('full'); // 'full' | 'surface' | 'downhole'
  const [wireframeMode, setWireframeMode] = useState(false);
  // Live Camera Navigation States for Interactive Bars
  const [zoomDistance, setZoomDistance] = useState(34);
  const [rotationDeg, setRotationDeg] = useState(25);
  const [tiltDeg, setTiltDeg] = useState(75);

  const controlsStateRef = useRef({
    isDragging: false,
    isPanning: false,
    prevMouse: { x: 0, y: 0 },
    spherical: { radius: 34, theta: (25 * Math.PI) / 180, phi: (75 * Math.PI) / 180 },
    target: new THREE.Vector3(0, 1.0, 0)
  });

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = controlsStateRef.current.spherical;
    const target = controlsStateRef.current.target;
    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + radius * Math.cos(phi);
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(target);
  };

  const handleZoomChange = (newRadius) => {
    const r = Math.max(10, Math.min(75, newRadius));
    setZoomDistance(r);
    controlsStateRef.current.spherical.radius = r;
    updateCameraPosition();
  };

  const handleRotationChange = (deg) => {
    const normalizedDeg = ((deg % 360) + 360) % 360;
    setRotationDeg(Math.round(normalizedDeg));
    controlsStateRef.current.spherical.theta = (normalizedDeg * Math.PI) / 180;
    updateCameraPosition();
  };

  const handleTiltChange = (deg) => {
    const clampedDeg = Math.max(15, Math.min(85, deg));
    setTiltDeg(Math.round(clampedDeg));
    controlsStateRef.current.spherical.phi = (clampedDeg * Math.PI) / 180;
    updateCameraPosition();
  };

  const resetCamera = () => {
    setZoomDistance(34);
    setRotationDeg(25);
    setTiltDeg(75);
    controlsStateRef.current.spherical = { radius: 34, theta: (25 * Math.PI) / 180, phi: (75 * Math.PI) / 180 };
    controlsStateRef.current.target.set(0, 1.0, 0);
    updateCameraPosition();
  };

  // Calculated Thermodynamic Couplings
  const physicsState = useMemo(() => {
    // 1. Walther / Andrade Thermal Viscosity Model: mu = 0.0045 * exp(4600 / (T + 273.15))
    const tK = tempC + 273.15;
    const calcViscCp = customVisc !== null ? customVisc : Math.round(Math.max(12, 0.0045 * Math.exp(4600.0 / tK)));

    // 2. Darcy Mobility Ratio: k / mu (mD/cP) assuming perm = 1200 mD
    const darcyMobility = Number((1200 / Math.max(12, calcViscCp)).toFixed(2));

    // 3. Steam Vapor Saturation Pressure Psat (Antoine Equation approximation)
    const pSatBar = Number((0.0001 * Math.exp(0.046 * tempC)).toFixed(2));
    const isFlashing = intakePressureBar < pSatBar;

    // 4. Gas Lock & Volumetric Pump Fillage Efficiency
    // High vapor fraction creates gas compression on downstroke, delaying Traveling Valve opening
    const compressionRatio = dischargePressureBar / Math.max(2, intakePressureBar);
    const gasInterferenceRatio = (steamVaporPct / 100) * (compressionRatio ** 0.65);
    const pumpFillagePct = Math.max(15, Math.min(98, Math.round(98 - gasInterferenceRatio * 85)));
    const isGasLock = pumpFillagePct < 45;
    const isFluidPound = pumpFillagePct >= 45 && pumpFillagePct < 75;

    // 5. Asphaltene Precipitation Margin (AOP ~ 32 bar at 650m)
    const aopBar = Number((34.0 - 0.12 * (tempC - 50.0)).toFixed(1));
    const asphalteneRiskPct = Number(Math.max(0, Math.min(100, (1.0 - intakePressureBar / Math.max(1, aopBar)) * 70 + (1 - tempC / 140) * 30)).toFixed(1));

    // 6. Rod String Loads (kN) & Fluid Throughput (m3/day)
    const baseProductionRate = (spm * strokeLengthM * 0.88 * (pumpFillagePct / 100)).toFixed(1);
    const viscousFrictionKn = (calcViscCp / 500) * 6.5;
    const peakUpstrokeLoadKn = Number((38.0 + (dischargePressureBar - intakePressureBar) * 0.42 + viscousFrictionKn).toFixed(1));
    const minDownstrokeLoadKn = Number((18.0 - viscousFrictionKn * 0.8 - (isGasLock ? 6.0 : 0)).toFixed(1));

    return {
      viscosityCp: calcViscCp,
      darcyMobility,
      pSatBar,
      isFlashing,
      pumpFillagePct,
      isGasLock,
      isFluidPound,
      aopBar,
      asphalteneRiskPct,
      productionRateM3d: Number(baseProductionRate),
      peakUpstrokeLoadKn,
      minDownstrokeLoadKn
    };
  }, [tempC, customVisc, steamVaporPct, intakePressureBar, dischargePressureBar, spm, strokeLengthM]);

  // Real-time kinematic telemetry
  const [telemetry, setTelemetry] = useState({
    phase: 'UPSTROKE', // 'UPSTROKE' | 'DOWNSTROKE'
    strokeProgress: 0.0, // 0 to 1
    tvState: 'CLOSED', // 'OPEN' | 'CLOSED'
    svState: 'OPEN', // 'OPEN' | 'CLOSED'
    rodPositionM: 1.2,
    instantLoadKn: 48.5,
    dynagraphPoint: { x: 0.5, y: 48.5 }
  });

  // Dynamic 3D Mesh References for Live Kinematics
  const dynamicNodesRef = useRef({
    crankL: null,
    crankR: null,
    counterweightL: null,
    counterweightR: null,
    pitmanL: null,
    pitmanR: null,
    walkingBeam: null,
    horsehead: null,
    bridleL: null,
    bridleR: null,
    carrierBar: null,
    polishedRod: null,
    suckerRod: null,
    plunger: null,
    travelingValveBall: null,
    standingValveBall: null,
    gasBubbles: null,
    intakeParticles: null,
    barrelParticles: null,
    liftParticles: null,
    plungerBodyMat: null,
    fluidColumnMat: null
  });

  // Camera Presets
  const applyCameraPreset = (preset) => {
    setViewPreset(preset);
    if (preset === 'surface') {
      controlsStateRef.current.spherical = { radius: 22, theta: 0.55, phi: 1.25 };
      controlsStateRef.current.target.set(0, 9.5, 0);
    } else if (preset === 'downhole') {
      controlsStateRef.current.spherical = { radius: 18, theta: 0.35, phi: 1.45 };
      controlsStateRef.current.target.set(0, -9.0, 0);
    } else {
      controlsStateRef.current.spherical = { radius: 34, theta: 0.45, phi: 1.35 };
      controlsStateRef.current.target.set(0, 1.0, 0);
    }
  };

  // 1. Initialize Three.js Scene, Camera, Lighting & Rendering Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a08);
    scene.fog = new THREE.FogExp2(0x0c0a08, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 250);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // --- Lighting Rig ---
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.75);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 1.4);
    mainSun.position.set(20, 35, 25);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    scene.add(mainSun);

    const rimLight = new THREE.DirectionalLight(0xd97706, 0.95);
    rimLight.position.set(-20, 15, -20);
    scene.add(rimLight);

    const downholePoint = new THREE.PointLight(0xf59e0b, 1.6, 25);
    downholePoint.position.set(0, -8, 5);
    scene.add(downholePoint);

    // Ground Grid & Base Concrete Pad
    const grid = new THREE.GridHelper(36, 24, 0xd97706, 0x24180d);
    grid.position.y = 0;
    scene.add(grid);

    const concretePad = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.1 })
    );
    concretePad.position.set(-2, -0.3, 0);
    scene.add(concretePad);

    const updateCamera = () => {
      const { radius, theta, phi } = controlsStateRef.current.spherical;
      const target = controlsStateRef.current.target;
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = target.y + radius * Math.cos(phi);
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(target);
    };
    updateCamera();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth || 600;
      const nh = container.clientHeight || 560;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // --- Dynamic Kinematics & Multi-Physics Animation Loop ---
    let clock = new THREE.Clock();
    let simTime = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (isPlaying) {
        // Calculate angular velocity omega from SPM: SPM * (2*PI / 60)
        const omega = spm * (Math.PI * 2 / 60);
        simTime += dt * omega;
      }

      // Auto Orbit
      if (autoRotate) {
        controlsStateRef.current.spherical.theta += 0.005;
        updateCamera();
      }

      // -------------------------------------------------------------
      // 1. SRP MECHANICAL KINEMATICS
      // -------------------------------------------------------------
      const crankAngle = simTime % (Math.PI * 2);
      const strokePhase = Math.sin(crankAngle); // -1 (BDC) to +1 (TDC)
      const strokeVelocity = Math.cos(crankAngle); // > 0 is Upstroke, < 0 is Downstroke
      const isUpstroke = strokeVelocity >= 0;

      // Walking Beam Pitch Angle
      const beamAngleMax = 0.16;
      const beamPitch = -strokePhase * beamAngleMax;

      // Rotate Cranks
      if (dynamicNodesRef.current.crankL) dynamicNodesRef.current.crankL.rotation.z = crankAngle;
      if (dynamicNodesRef.current.crankR) dynamicNodesRef.current.crankR.rotation.z = crankAngle;

      // Rock Walking Beam
      if (dynamicNodesRef.current.walkingBeam) {
        dynamicNodesRef.current.walkingBeam.rotation.z = beamPitch;
      }

      // Calculate Horsehead front tip vertical displacement
      const strokeAmp = (strokeLengthM / 2.4) * 1.55;
      const rodDispY = strokePhase * strokeAmp;

      // Update Carrier Bar, Polished Rod & Downhole Sucker Rod String
      if (dynamicNodesRef.current.carrierBar) dynamicNodesRef.current.carrierBar.position.y = 8.5 + rodDispY;
      if (dynamicNodesRef.current.polishedRod) dynamicNodesRef.current.polishedRod.position.y = 5.2 + rodDispY;
      if (dynamicNodesRef.current.suckerRod) dynamicNodesRef.current.suckerRod.position.y = -3.5 + rodDispY;

      // Update Downhole Plunger Position (Inside Stationary Barrel)
      const plungerBaseY = -8.5 + rodDispY;
      if (dynamicNodesRef.current.plunger) {
        dynamicNodesRef.current.plunger.position.y = plungerBaseY;
      }

      // -------------------------------------------------------------
      // 2. VALVE DYNAMICS & GAS INTERFERENCE DELAY
      // -------------------------------------------------------------
      // In normal operation:
      // - Upstroke: TV closed, SV open
      // - Downstroke: SV closed, TV open
      // In Gas Lock / Gas Interference:
      // On downstroke, traveling valve fails to open until gas compresses to discharge pressure!
      const gasDelayThreshold = physicsState.isGasLock ? 0.75 : (steamVaporPct / 100) * 0.45;
      const isTvBypassing = !isUpstroke && (strokePhase < (1.0 - gasDelayThreshold * 2.0));

      const tvBallOffset = isTvBypassing ? 0.45 : 0.0;
      if (dynamicNodesRef.current.travelingValveBall) {
        dynamicNodesRef.current.travelingValveBall.position.y = plungerBaseY + 1.2 + tvBallOffset;
      }

      // Standing Valve (SV): Located at base of stationary Pump Barrel (y = -12.5)
      const svBallOffset = isUpstroke ? 0.55 : 0.0;
      if (dynamicNodesRef.current.standingValveBall) {
        dynamicNodesRef.current.standingValveBall.position.y = -12.2 + svBallOffset;
      }

      // -------------------------------------------------------------
      // 3. MULTI-PHYSICS FLUID PARTICLES (Temperature & Viscosity Scaled)
      // -------------------------------------------------------------
      // Viscosity speed damping factor: high viscosity = sluggish flow
      const viscSpeedFactor = Math.max(0.2, Math.min(1.4, 250 / Math.max(25, physicsState.viscosityCp)));

      // A. Well Intake Particles (Reservoir Perforations -> Sump)
      if (dynamicNodesRef.current.intakeParticles) {
        const pos = dynamicNodesRef.current.intakeParticles.geometry.attributes.position.array;
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          let px = pos[idx];
          let py = pos[idx + 1];
          let pz = pos[idx + 2];
          let r = Math.sqrt(px * px + pz * pz);
          let angle = Math.atan2(pz, px);

          if (r > 0.55) {
            r -= 0.035 * viscSpeedFactor;
            pos[idx] = Math.cos(angle) * r;
            pos[idx + 2] = Math.sin(angle) * r;
          } else {
            py += 0.06 * viscSpeedFactor;
            if (py > -12.3) {
              r = 1.6 + Math.random() * 0.8;
              const newA = Math.random() * Math.PI * 2;
              pos[idx] = Math.cos(newA) * r;
              pos[idx + 1] = -15.5 + Math.random() * 2.5;
              pos[idx + 2] = Math.sin(newA) * r;
            } else {
              pos[idx + 1] = py;
            }
          }
        }
        dynamicNodesRef.current.intakeParticles.geometry.attributes.position.needsUpdate = true;
      }

      // B. Barrel Internal Chamber Particles (Between SV & TV)
      if (dynamicNodesRef.current.barrelParticles) {
        const pos = dynamicNodesRef.current.barrelParticles.geometry.attributes.position.array;
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          let py = pos[idx + 1];

          if (isUpstroke) {
            py += 0.075 * viscSpeedFactor;
            if (py > plungerBaseY - 0.2) {
              py = -12.2;
            }
          } else {
            if (isTvBypassing) {
              py += 0.12 * viscSpeedFactor;
              if (py > plungerBaseY + 1.8) {
                py = -12.2;
              }
            }
          }
          pos[idx + 1] = py;
        }
        dynamicNodesRef.current.barrelParticles.geometry.attributes.position.needsUpdate = true;
      }

      // C. Free Steam Vapor / Gas Bubbles inside Barrel
      if (dynamicNodesRef.current.gasBubbles) {
        const pos = dynamicNodesRef.current.gasBubbles.geometry.attributes.position.array;
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          let py = pos[idx + 1];
          // Wobble and compress
          py += 0.05 * (1 + Math.sin(simTime * 8 + i));
          if (py > plungerBaseY + 1.0) {
            py = -12.0 + Math.random() * 2.0;
          }
          pos[idx + 1] = py;
        }
        dynamicNodesRef.current.gasBubbles.geometry.attributes.position.needsUpdate = true;
      }

      // D. Tubing Lift Column Particles (Above Plunger -> Surface Wellhead)
      if (dynamicNodesRef.current.liftParticles) {
        const pos = dynamicNodesRef.current.liftParticles.geometry.attributes.position.array;
        const count = pos.length / 3;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          let py = pos[idx + 1];

          if (isUpstroke) {
            py += 0.085 * (physicsState.pumpFillagePct / 100);
          } else {
            py += 0.012;
          }

          if (py > 0.8) {
            py = plungerBaseY + 1.5 + Math.random() * 0.5;
          }
          pos[idx + 1] = py;
        }
        dynamicNodesRef.current.liftParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Calculate instantaneous dynagraph polished rod load (kN)
      let instantLoad = isUpstroke
        ? physicsState.peakUpstrokeLoadKn - (1 - (strokePhase + 1) / 2) * 4.2
        : physicsState.minDownstrokeLoadKn + (isTvBypassing ? 0 : 8.5);

      setTelemetry({
        phase: isUpstroke ? 'UPSTROKE' : 'DOWNSTROKE',
        strokeProgress: Number(((strokePhase + 1) / 2).toFixed(2)),
        tvState: isTvBypassing ? 'OPEN' : 'CLOSED',
        svState: isUpstroke ? 'OPEN' : 'CLOSED',
        rodPositionM: Number(((strokePhase + 1) / 2 * strokeLengthM).toFixed(2)),
        instantLoadKn: Number(instantLoad.toFixed(1)),
        dynagraphPoint: {
          x: Number(((strokePhase + 1) / 2).toFixed(2)),
          y: Number(instantLoad.toFixed(1))
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isPlaying, spm, strokeLengthM, autoRotate, tempC, steamVaporPct, intakePressureBar, dischargePressureBar, physicsState]);

  // 2. Build 3D Surface Pumping Unit + Downhole SRP Assembly Meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const toRemove = [];
    scene.traverse((obj) => {
      if (obj.userData?.isAssembly) toRemove.push(obj);
    });
    toRemove.forEach((obj) => scene.remove(obj));

    const assemblyGroup = new THREE.Group();
    assemblyGroup.userData.isAssembly = true;

    // Dynamic fluid color depending on temperature & viscosity
    let fluidColorHex = 0x22c55e; // Low Viscosity Hot Green
    if (physicsState.viscosityCp > 1500) {
      fluidColorHex = 0x1c1917; // Cold Dark Tar Bitumen
    } else if (physicsState.viscosityCp > 300) {
      fluidColorHex = 0x78350f; // Viscous Brown Oil
    } else if (physicsState.viscosityCp > 80) {
      fluidColorHex = 0xd97706; // Amber Mobilized Oil
    }

    const structuralSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8, wireframe: wireframeMode });
    const beamCrimsonMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.75, wireframe: wireframeMode });
    const counterweightMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.9, wireframe: wireframeMode });
    const bronzeGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.85, wireframe: wireframeMode });
    const polishedSteelMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.95, wireframe: wireframeMode });
    const casingWallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.85, transparent: true, opacity: 0.26, side: THREE.DoubleSide, wireframe: wireframeMode });
    const valveSeatMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.9, wireframe: wireframeMode });
    const valveBallMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.1, metalness: 0.95, emissive: 0x7f1d1d, emissiveIntensity: 0.35, wireframe: wireframeMode });

    // =========================================================================
    // A. SURFACE PUMPING UNIT
    // =========================================================================
    const surfaceUnit = new THREE.Group();

    // 1. Samson Post (4-leg A-frame Tower)
    const samsonPost = new THREE.Group();
    const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 8.2, 16);
    const legCoords = [
      { bx: -5.0, bz: -1.8 },
      { bx: -5.0, bz: 1.8 },
      { bx: -2.0, bz: -1.8 },
      { bx: -2.0, bz: 1.8 }
    ];
    legCoords.forEach(({ bx, bz }) => {
      const leg = new THREE.Mesh(legGeo, structuralSteelMat);
      leg.position.set((bx - 3.5) / 2 - 1.75, 4.0, bz / 2);
      leg.lookAt(new THREE.Vector3(-3.5, 7.5, 0));
      leg.rotateX(Math.PI / 2);
      samsonPost.add(leg);
    });

    const saddleBearing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.6), bronzeGoldMat);
    saddleBearing.position.set(-3.5, 7.5, 0);
    samsonPost.add(saddleBearing);
    surfaceUnit.add(samsonPost);

    // 2. Walking Beam & Horsehead
    const beamPivotGroup = new THREE.Group();
    beamPivotGroup.position.set(-3.5, 7.5, 0);

    const beamBody = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.7, 0.5), beamCrimsonMat);
    beamBody.position.set(0.5, 0, 0);
    beamPivotGroup.add(beamBody);

    const horseheadGroup = new THREE.Group();
    horseheadGroup.position.set(5.7, 0, 0);

    const hhArcGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.45, 24, 1, false, Math.PI * 0.75, Math.PI * 0.5);
    const hhArc = new THREE.Mesh(hhArcGeo, beamCrimsonMat);
    hhArc.rotation.z = Math.PI / 2;
    hhArc.position.set(-1.2, 0.2, 0);
    horseheadGroup.add(hhArc);

    const hhFlange = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.48), structuralSteelMat);
    hhFlange.position.set(-0.8, 0, 0);
    horseheadGroup.add(hhFlange);

    beamPivotGroup.add(horseheadGroup);
    dynamicNodesRef.current.walkingBeam = beamPivotGroup;
    surfaceUnit.add(beamPivotGroup);

    // 3. Motor & Gearbox
    const primeMover = new THREE.Group();
    primeMover.position.set(-10.2, 0.8, 0);
    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.8, 24), structuralSteelMat);
    motorBody.rotation.z = Math.PI / 2;
    primeMover.add(motorBody);
    surfaceUnit.add(primeMover);

    const gearBox = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.8), structuralSteelMat);
    gearBox.position.set(-8.0, 1.4, 0);
    surfaceUnit.add(gearBox);

    // 4. Cranks & Pitmans
    const crankL = new THREE.Group();
    crankL.position.set(-8.0, 2.2, -1.6);
    const crankArmMeshL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.25), bronzeGoldMat);
    crankArmMeshL.position.x = 0.8;
    crankL.add(crankArmMeshL);
    const cwL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.6), counterweightMat);
    cwL.position.set(1.4, 0, 0);
    crankL.add(cwL);
    surfaceUnit.add(crankL);
    dynamicNodesRef.current.crankL = crankL;

    const crankR = new THREE.Group();
    crankR.position.set(-8.0, 2.2, 1.6);
    const crankArmMeshR = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.25), bronzeGoldMat);
    crankArmMeshR.position.x = 0.8;
    crankR.add(crankArmMeshR);
    const cwR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.6), counterweightMat);
    cwR.position.set(1.4, 0, 0);
    crankR.add(cwR);
    surfaceUnit.add(crankR);
    dynamicNodesRef.current.crankR = crankR;

    const pitmanL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.8, 16), polishedSteelMat);
    pitmanL.position.set(-8.0, 5.0, -1.6);
    surfaceUnit.add(pitmanL);

    const pitmanR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.8, 16), polishedSteelMat);
    pitmanR.position.set(-8.0, 5.0, 1.6);
    surfaceUnit.add(pitmanR);

    // 5. Bridle & Wellhead
    const bridleL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 12), polishedSteelMat);
    bridleL.position.set(2.2, 8.8, -0.4);
    surfaceUnit.add(bridleL);

    const bridleR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 12), polishedSteelMat);
    bridleR.position.set(2.2, 8.8, 0.4);
    surfaceUnit.add(bridleR);

    const carrierBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 1.2), bronzeGoldMat);
    carrierBar.position.set(2.2, 8.5, 0);
    surfaceUnit.add(carrierBar);
    dynamicNodesRef.current.carrierBar = carrierBar;

    const wellheadGroup = new THREE.Group();
    wellheadGroup.position.set(2.2, 0, 0);
    const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 24), bronzeGoldMat);
    baseFlange.position.y = 0.25;
    wellheadGroup.add(baseFlange);

    const stuffingBox = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.6, 24), bronzeGoldMat);
    stuffingBox.position.y = 1.3;
    wellheadGroup.add(stuffingBox);

    const dischargeTee = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.2, 20), polishedSteelMat);
    dischargeTee.rotation.z = Math.PI / 2;
    dischargeTee.position.set(1.3, 1.0, 0);
    wellheadGroup.add(dischargeTee);
    surfaceUnit.add(wellheadGroup);

    const polishedRod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.0, 20), polishedSteelMat);
    polishedRod.position.set(2.2, 5.2, 0);
    surfaceUnit.add(polishedRod);
    dynamicNodesRef.current.polishedRod = polishedRod;

    assemblyGroup.add(surfaceUnit);

    // =========================================================================
    // B. DOWNHOLE SUCKER ROD PUMP (SRP) CUTAWAY
    // =========================================================================
    const downholeUnit = new THREE.Group();
    downholeUnit.position.set(2.2, 0, 0);

    const casing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 17, 32, 1, true), casingWallMat);
    casing.position.y = -8.5;
    downholeUnit.add(casing);

    // Casing Perforations
    const perfsGroup = new THREE.Group();
    for (let row = 0; row < 5; row++) {
      const ry = -13.5 - row * 0.6;
      for (let h = 0; h < 8; h++) {
        const ha = (h / 8) * Math.PI * 2;
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 10), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        port.rotation.z = Math.PI / 2;
        port.rotation.y = ha;
        port.position.set(Math.cos(ha) * 1.6, ry, Math.sin(ha) * 1.6);
        perfsGroup.add(port);
      }
    }
    downholeUnit.add(perfsGroup);

    // Tubing String Cutaway
    const tubing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 12.5, 24, 1, false, Math.PI * 0.25, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide, wireframe: wireframeMode })
    );
    tubing.position.y = -6.25;
    downholeUnit.add(tubing);

    // Sucker Rod
    const suckerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12.0, 16), polishedSteelMat);
    suckerRod.position.set(0, -3.5, 0);
    downholeUnit.add(suckerRod);
    dynamicNodesRef.current.suckerRod = suckerRod;

    // Pump Barrel Cutaway
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 6.0, 32, 1, false, Math.PI * 0.2, Math.PI * 1.6),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25, metalness: 0.8, side: THREE.DoubleSide, wireframe: wireframeMode })
    );
    barrel.position.y = -9.5;
    downholeUnit.add(barrel);

    // Standing Valve (SV)
    const svGroup = new THREE.Group();
    svGroup.position.set(0, -12.5, 0);
    const svSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.35, 24), valveSeatMat);
    svGroup.add(svSeat);
    const svCage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.9, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.85, wireframe: true })
    );
    svCage.position.y = 0.45;
    svGroup.add(svCage);
    const svBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), valveBallMat);
    svBall.position.set(0, 0.3, 0);
    svGroup.add(svBall);
    dynamicNodesRef.current.standingValveBall = svBall;
    downholeUnit.add(svGroup);

    // Reciprocating Plunger & Traveling Valve (TV)
    const plungerGroup = new THREE.Group();
    plungerGroup.position.set(0, -8.5, 0);
    const plungerBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 3.2, 24, 1, false, Math.PI * 0.25, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.9, side: THREE.DoubleSide, wireframe: wireframeMode })
    );
    plungerGroup.add(plungerBody);
    const tvSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.32, 0.3, 24), valveSeatMat);
    tvSeat.position.y = 1.0;
    plungerGroup.add(tvSeat);
    const tvCage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.85, wireframe: true })
    );
    tvCage.position.y = 1.4;
    plungerGroup.add(tvCage);
    const tvBall = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), valveBallMat);
    tvBall.position.set(0, 1.2, 0);
    plungerGroup.add(tvBall);
    dynamicNodesRef.current.travelingValveBall = tvBall;
    downholeUnit.add(plungerGroup);
    dynamicNodesRef.current.plunger = plungerGroup;

    // =========================================================================
    // C. DYNAMIC PARTICLES & STEAM VAPOR BUBBLES
    // =========================================================================
    // 1. Intake Particles
    const intakeCount = 70;
    const intakePos = new Float32Array(intakeCount * 3);
    for (let i = 0; i < intakeCount; i++) {
      const idx = i * 3;
      const r = 0.4 + Math.random() * 1.8;
      const a = Math.random() * Math.PI * 2;
      intakePos[idx] = Math.cos(a) * r;
      intakePos[idx + 1] = -15.5 + Math.random() * 3.2;
      intakePos[idx + 2] = Math.sin(a) * r;
    }
    const intakeGeo = new THREE.BufferGeometry();
    intakeGeo.setAttribute('position', new THREE.BufferAttribute(intakePos, 3));
    const intakeParticles = new THREE.Points(
      intakeGeo,
      new THREE.PointsMaterial({ size: 0.28, color: fluidColorHex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    downholeUnit.add(intakeParticles);
    dynamicNodesRef.current.intakeParticles = intakeParticles;

    // 2. Barrel Internal Particles
    const barrelCount = 90;
    const barrelPos = new Float32Array(barrelCount * 3);
    for (let i = 0; i < barrelCount; i++) {
      const idx = i * 3;
      const r = Math.random() * 0.35;
      const a = Math.random() * Math.PI * 2;
      barrelPos[idx] = Math.cos(a) * r;
      barrelPos[idx + 1] = -12.2 + Math.random() * 4.0;
      barrelPos[idx + 2] = Math.sin(a) * r;
    }
    const barrelGeo = new THREE.BufferGeometry();
    barrelGeo.setAttribute('position', new THREE.BufferAttribute(barrelPos, 3));
    const barrelParticles = new THREE.Points(
      barrelGeo,
      new THREE.PointsMaterial({ size: 0.26, color: fluidColorHex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
    );
    downholeUnit.add(barrelParticles);
    dynamicNodesRef.current.barrelParticles = barrelParticles;

    // 3. Steam Vapor / Free Gas Bubbles (Pulsing Red / White if steam quality > 0)
    if (steamVaporPct > 2) {
      const bubbleCount = Math.min(100, Math.round(steamVaporPct * 1.8));
      const bubblePos = new Float32Array(bubbleCount * 3);
      for (let i = 0; i < bubbleCount; i++) {
        const idx = i * 3;
        const r = Math.random() * 0.38;
        const a = Math.random() * Math.PI * 2;
        bubblePos[idx] = Math.cos(a) * r;
        bubblePos[idx + 1] = -12.0 + Math.random() * 5.0;
        bubblePos[idx + 2] = Math.sin(a) * r;
      }
      const bubbleGeo = new THREE.BufferGeometry();
      bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
      const bubbleParticles = new THREE.Points(
        bubbleGeo,
        new THREE.PointsMaterial({ size: 0.35, color: 0xef4444, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
      );
      downholeUnit.add(bubbleParticles);
      dynamicNodesRef.current.gasBubbles = bubbleParticles;
    }

    // 4. Tubing Lift Column Particles
    const liftCount = 140;
    const liftPos = new Float32Array(liftCount * 3);
    for (let i = 0; i < liftCount; i++) {
      const idx = i * 3;
      const r = Math.random() * 0.42;
      const a = Math.random() * Math.PI * 2;
      liftPos[idx] = Math.cos(a) * r;
      liftPos[idx + 1] = -6.5 + Math.random() * 7.5;
      liftPos[idx + 2] = Math.sin(a) * r;
    }
    const liftGeo = new THREE.BufferGeometry();
    liftGeo.setAttribute('position', new THREE.BufferAttribute(liftPos, 3));
    const liftParticles = new THREE.Points(
      liftGeo,
      new THREE.PointsMaterial({ size: 0.32, color: fluidColorHex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
    );
    downholeUnit.add(liftParticles);
    dynamicNodesRef.current.liftParticles = liftParticles;

    assemblyGroup.add(downholeUnit);
    scene.add(assemblyGroup);

  }, [wireframeMode, tempC, steamVaporPct, physicsState]);

  // Mouse Orbit, Pan & Zoom Handlers
  const handleMouseDown = (e) => {
    controlsStateRef.current.isDragging = true;
    controlsStateRef.current.isPanning = e.button === 2 || e.shiftKey;
    controlsStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!controlsStateRef.current.isDragging) return;
    const dx = e.clientX - controlsStateRef.current.prevMouse.x;
    const dy = e.clientY - controlsStateRef.current.prevMouse.y;
    controlsStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };

    if (controlsStateRef.current.isPanning) {
      const panSpeed = 0.035;
      controlsStateRef.current.target.x -= dx * panSpeed * Math.cos(controlsStateRef.current.spherical.theta);
      controlsStateRef.current.target.z += dx * panSpeed * Math.sin(controlsStateRef.current.spherical.theta);
      controlsStateRef.current.target.y += dy * panSpeed;
    } else {
      controlsStateRef.current.spherical.theta += dx * 0.008;
      controlsStateRef.current.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controlsStateRef.current.spherical.phi - dy * 0.008));
    }

    if (cameraRef.current) {
      const { radius, theta, phi } = controlsStateRef.current.spherical;
      const target = controlsStateRef.current.target;
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = target.y + radius * Math.cos(phi);
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(target);
    }
  };

  const handleMouseUp = () => {
    controlsStateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * 0.025;
    controlsStateRef.current.spherical.radius = Math.max(10, Math.min(80, controlsStateRef.current.spherical.radius + delta));
    if (cameraRef.current) {
      const { radius, theta, phi } = controlsStateRef.current.spherical;
      const target = controlsStateRef.current.target;
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.position.y = target.y + radius * Math.cos(phi);
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.lookAt(target);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* 1. TOP EXECUTIVE CONTROL BAR: Real-time Phase, Fillage, & Gas Lock Alert */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(24, 18, 14, 0.95)',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(217, 119, 6, 0.35)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Left: Active Stroke Phase & Valve Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: telemetry.phase === 'UPSTROKE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              border: `1.5px solid ${telemetry.phase === 'UPSTROKE' ? '#22c55e' : '#3b82f6'}`,
              color: telemetry.phase === 'UPSTROKE' ? '#4ade80' : '#60a5fa',
              fontWeight: 800,
              fontSize: '0.8rem',
              letterSpacing: '0.04em'
            }}
          >
            {telemetry.phase === 'UPSTROKE' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
            <span>{telemetry.phase}</span>
          </div>

          <div style={{ fontSize: '0.74rem', color: '#fed7aa', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span>TV: <strong style={{ color: telemetry.tvState === 'CLOSED' ? '#ef4444' : '#22c55e' }}>{telemetry.tvState}</strong></span>
            <span>SV: <strong style={{ color: telemetry.svState === 'OPEN' ? '#22c55e' : '#ef4444' }}>{telemetry.svState}</strong></span>
            <span>Pump Fillage: <strong style={{ color: physicsState.isGasLock ? '#ef4444' : physicsState.isFluidPound ? '#f59e0b' : '#22c55e' }}>{physicsState.pumpFillagePct}%</strong></span>
            <span>Oil Output: <strong style={{ color: '#fbbf24' }}>{physicsState.productionRateM3d} m³/d</strong></span>
          </div>
        </div>

        {/* Right: Camera Presets & Playback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
            {[
              { id: 'full', label: 'Full Unit' },
              { id: 'surface', label: 'Surface Beam' },
              { id: 'downhole', label: 'Downhole Cutaway' }
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyCameraPreset(preset.id)}
                style={{
                  background: viewPreset === preset.id ? '#b45309' : 'transparent',
                  color: viewPreset === preset.id ? '#ffffff' : '#fed7aa',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? '#dc2626' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            style={{
              background: wireframeMode ? '#d97706' : 'rgba(255, 255, 255, 0.08)',
              color: '#fed7aa',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
            title="Toggle Wireframe"
          >
            <Layers size={13} />
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              background: autoRotate ? '#d97706' : 'rgba(255, 255, 255, 0.08)',
              color: '#fed7aa',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
            title="360° Orbit"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 2. FOUR GOVERNING PHYSICAL VARIABLES: INTERACTIVE SANDBOX DECK */}
      <div
        style={{
          background: 'linear-gradient(135deg, #18120c 0%, #221710 100%)',
          border: '1px solid rgba(217, 119, 6, 0.4)',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} color="#f59e0b" />
            MULTI-VARIABLE THERMODYNAMIC &amp; HYDRODYNAMIC SIMULATOR
          </span>
          <span style={{ fontSize: '0.72rem', color: '#fed7aa' }}>
            Adjust sliders to see real-time impact on fluid mobility, valve delay, gas lock &amp; rod loads.
          </span>
        </div>

        {/* 4 Interactive Sliders Grid */}
        <div className="responsive-grid-4" style={{ gap: '0.85rem' }}>
          {/* Variable 1: Temperature */}
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(234, 88, 12, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Thermometer size={13} /> Temperature (T)
              </span>
              <strong style={{ color: '#ffffff', fontSize: '0.82rem' }}>{tempC}°C</strong>
            </div>
            <input
              type="range"
              min="40"
              max="260"
              step="5"
              value={tempC}
              onChange={(e) => {
                setTempC(parseFloat(e.target.value));
                setCustomVisc(null); // Return to Walther model
              }}
              style={{ width: '100%', accentColor: '#ea580c', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.66rem', color: '#fed7aa', marginTop: '3px' }}>
              {tempC > 180 ? '🔥 Superheated Steam Wave' : tempC > 100 ? '🌡️ Mobilized Bitumen' : '❄️ Cold Native Tar'}
            </div>
          </div>

          {/* Variable 2: Viscosity */}
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Droplets size={13} /> Viscosity (μ)
              </span>
              <strong style={{ color: '#ffffff', fontSize: '0.82rem' }}>{physicsState.viscosityCp} cP</strong>
            </div>
            <input
              type="range"
              min="15"
              max="5000"
              step="15"
              value={physicsState.viscosityCp}
              onChange={(e) => setCustomVisc(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.66rem', color: '#bae6fd', marginTop: '3px' }}>
              Mobility: <strong>{physicsState.darcyMobility} mD/cP</strong> (Darcy Inflow)
            </div>
          </div>

          {/* Variable 3: Steam Vapour & Free Gas */}
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.8rem', borderRadius: '6px', border: `1px solid ${physicsState.isGasLock ? '#ef4444' : 'rgba(239, 68, 68, 0.35)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={13} /> Steam Vapour (xv)
              </span>
              <strong style={{ color: physicsState.isGasLock ? '#ef4444' : '#ffffff', fontSize: '0.82rem' }}>{steamVaporPct}%</strong>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={steamVaporPct}
              onChange={(e) => setSteamVaporPct(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.66rem', color: physicsState.isGasLock ? '#ef4444' : '#fca5a5', marginTop: '3px', fontWeight: physicsState.isGasLock ? 800 : 500 }}>
              {physicsState.isGasLock ? '⚠️ CRITICAL GAS LOCK' : physicsState.isFluidPound ? '⚡ Fluid Pound Risk' : '✅ Liquid Prime'}
            </div>
          </div>

          {/* Variable 4: Intake & Discharge Pressure */}
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.65rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Gauge size={13} /> Intake Pressure (P)
              </span>
              <strong style={{ color: '#ffffff', fontSize: '0.82rem' }}>{intakePressureBar} bar</strong>
            </div>
            <input
              type="range"
              min="5"
              max="45"
              step="1"
              value={intakePressureBar}
              onChange={(e) => setIntakePressureBar(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.66rem', color: '#fed7aa', marginTop: '3px' }}>
              ΔP: <strong>{(dischargePressureBar - intakePressureBar).toFixed(1)} bar</strong> | AOP: {physicsState.aopBar} bar
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED ZOOM BAR & ROTATE BAR CONTROL DOCK */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, #18120c 0%, #24170f 100%)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(217, 119, 6, 0.35)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}
      >
        {/* ROTATE 360° SLIDER BAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Compass size={14} color="#f59e0b" /> ROTATE 360° (HORIZONTAL AZIMUTH)
            </span>
            <strong style={{ color: '#fed7aa', fontSize: '0.78rem', background: 'rgba(0,0,0,0.4)', padding: '1px 6px', borderRadius: '4px' }}>
              {rotationDeg}°
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.65rem', color: '#a8a29e' }}>0°</span>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={rotationDeg}
              onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#ea580c', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#a8a29e' }}>360°</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
            {[
              { deg: 0, label: 'Front (0°)' },
              { deg: 25, label: 'Iso (25°)' },
              { deg: 90, label: 'Side (90°)' },
              { deg: 180, label: 'Rear (180°)' }
            ].map((btn) => (
              <button
                key={btn.deg}
                onClick={() => handleRotationChange(btn.deg)}
                style={{
                  flex: 1,
                  background: Math.abs(rotationDeg - btn.deg) < 5 ? '#b45309' : 'rgba(255,255,255,0.05)',
                  color: Math.abs(rotationDeg - btn.deg) < 5 ? '#ffffff' : '#fed7aa',
                  border: '1px solid rgba(217, 119, 6, 0.2)',
                  borderRadius: '3px',
                  padding: '2px 4px',
                  fontSize: '0.64rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ZOOM DISTANCE SLIDER BAR & BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ZoomIn size={14} color="#38bdf8" /> ZOOM DISTANCE (CAMERA PROXIMITY)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: '#bae6fd', fontSize: '0.78rem', background: 'rgba(0,0,0,0.4)', padding: '1px 6px', borderRadius: '4px' }}>
                {((75 - zoomDistance) / 20 + 0.5).toFixed(1)}x ({zoomDistance}m)
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleZoomChange(zoomDistance + 4)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#bae6fd',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.66rem'
              }}
              title="Zoom Out"
            >
              <ZoomOut size={12} /> Out
            </button>

            <input
              type="range"
              min="12"
              max="70"
              step="1"
              value={zoomDistance}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
            />

            <button
              onClick={() => handleZoomChange(zoomDistance - 4)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#bae6fd',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.66rem'
              }}
              title="Zoom In"
            >
              <ZoomIn size={12} /> In
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '0.65rem', color: '#fed7aa', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Elevation Pitch:
            </span>
            <input
              type="range"
              min="15"
              max="85"
              step="1"
              value={tiltDeg}
              onChange={(e) => handleTiltChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#f59e0b', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.65rem', color: '#fed7aa', minWidth: '24px' }}>{tiltDeg}°</span>
          </div>
        </div>
      </div>

      {/* 3. 3D WEBGL VIEWPORT CANVAS & REAL-TIME DYNAGRAPH HUD */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '520px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(217, 119, 6, 0.35)',
          boxShadow: 'inset 0 0 35px rgba(0, 0, 0, 0.85)',
          background: '#0c0a08'
        }}
      >
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: '100%', height: '100%', cursor: 'grab' }}
        />

        {/* Real-time Dynagraph Dynamometer Card Overlay (Bottom Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(15, 12, 9, 0.94)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${physicsState.isGasLock ? '#ef4444' : '#d97706'}`,
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            color: '#fed7aa',
            fontSize: '0.72rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            minWidth: '240px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)'
          }}
        >
          <div style={{ fontWeight: 800, color: '#f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} color="#f59e0b" /> SURFACE DYNAGRAPH (F vs y)
            </span>
            <span style={{ fontSize: '0.66rem', color: '#a8a29e' }}>SPM: {spm}</span>
          </div>

          {/* Mini Dynagraph Loop Plot */}
          <svg viewBox="0 0 160 80" style={{ width: '100%', height: '70px', background: '#0a0806', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Grid Lines */}
            <line x1="20" y1="10" x2="20" y2="70" stroke="#262626" strokeWidth="0.8" />
            <line x1="140" y1="10" x2="140" y2="70" stroke="#262626" strokeWidth="0.8" />
            <line x1="20" y1="70" x2="140" y2="70" stroke="#404040" strokeWidth="1" />
            <line x1="20" y1="15" x2="140" y2="15" stroke="#404040" strokeWidth="1" />

            {/* Dynagraph Curve Path */}
            {physicsState.isGasLock ? (
              // Gas Lock Curve: severe delayed traveling valve pickup
              <path
                d="M 25 65 Q 35 22 135 20 L 135 48 Q 95 62 25 65 Z"
                fill="rgba(239, 68, 68, 0.25)"
                stroke="#ef4444"
                strokeWidth="1.8"
              />
            ) : (
              // Normal / Mobilized Curve: Full rectangular card
              <path
                d="M 25 62 L 28 20 L 135 18 L 132 58 Z"
                fill="rgba(34, 197, 94, 0.25)"
                stroke="#22c55e"
                strokeWidth="1.8"
              />
            )}

            {/* Real-time Tracking Point */}
            <circle
              cx={25 + telemetry.dynagraphPoint.x * 105}
              cy={telemetry.phase === 'UPSTROKE' ? 20 : 60}
              r="4"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#d6d3d1' }}>
            <span>Peak: <strong style={{ color: '#fbbf24' }}>{physicsState.peakUpstrokeLoadKn} kN</strong></span>
            <span>Min: <strong style={{ color: '#60a5fa' }}>{physicsState.minDownstrokeLoadKn} kN</strong></span>
            <span>Card: <strong style={{ color: physicsState.isGasLock ? '#ef4444' : '#4ade80' }}>{physicsState.isGasLock ? 'Gas Lock' : 'Full Fillage'}</strong></span>
          </div>
        </div>

        {/* Live Multi-Physics Alerts HUD (Top Left) */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(15, 12, 9, 0.92)',
            border: '1px solid rgba(217, 119, 6, 0.35)',
            padding: '0.55rem 0.85rem',
            borderRadius: '6px',
            color: '#fed7aa',
            fontSize: '0.7rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            maxWidth: '300px'
          }}
        >
          <div style={{ fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} /> DYNAMIC MULTI-PHYSICS RESPONSE
          </div>
          <div>• Fluid: <strong style={{ color: tempC > 180 ? '#4ade80' : '#f59e0b' }}>{tempC}°C ({physicsState.viscosityCp} cP)</strong></div>
          <div>• Steam Flash: <strong style={{ color: physicsState.isFlashing ? '#ef4444' : '#4ade80' }}>{physicsState.isFlashing ? `Flashing (Psat ${physicsState.pSatBar} > ${intakePressureBar} bar)` : 'Stable Liquid Phase'}</strong></div>
          <div>• Asphaltene Risk: <strong style={{ color: physicsState.asphalteneRiskPct > 50 ? '#ef4444' : '#4ade80' }}>{physicsState.asphalteneRiskPct}%</strong></div>
        </div>
      </div>

      {/* 4. DETAILED 4-VARIABLE PHYSICS EXPLANATION DECK */}
      <div className="responsive-grid-4" style={{ gap: '0.75rem' }}>
        {/* Card 1: Temperature & Viscosity Thermal Thinning */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            borderRadius: '8px',
            padding: '0.8rem',
            fontSize: '0.72rem',
            color: '#fed7aa'
          }}
        >
          <div style={{ fontWeight: 800, color: '#fb923c', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Thermometer size={14} /> 1. TEMPERATURE (T)
          </div>
          <div style={{ color: '#d6d3d1', lineHeight: '1.4' }}>
            • <strong>Walther Law</strong>: Heating from 48°C to {tempC}°C slashes viscosity from 15,000 cP to <strong>{physicsState.viscosityCp} cP</strong> (300× mobility jump).<br />
            • Lowers fluid shear drag on the rod string and speeds up valve ball seating.
          </div>
        </div>

        {/* Card 2: Viscosity & Darcy Inflow */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '8px',
            padding: '0.8rem',
            fontSize: '0.72rem',
            color: '#fed7aa'
          }}
        >
          <div style={{ fontWeight: 800, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Droplets size={14} /> 2. VISCOSITY (μ)
          </div>
          <div style={{ color: '#d6d3d1', lineHeight: '1.4' }}>
            • <strong>Darcy Inflow</strong>: q = (k·h·ΔP) / [μ·ln(re/rw)]. Current Mobility: <strong>{physicsState.darcyMobility} mD/cP</strong>.<br />
            • Viscosity &gt; 1500 cP causes "viscous valve float" and rod floating on downstrokes.
          </div>
        </div>

        {/* Card 3: Steam Vapour & Gas Lock */}
        <div
          style={{
            background: physicsState.isGasLock ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${physicsState.isGasLock ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '8px',
            padding: '0.8rem',
            fontSize: '0.72rem',
            color: '#fed7aa'
          }}
        >
          <div style={{ fontWeight: 800, color: '#f87171', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Wind size={14} /> 3. STEAM VAPOUR (xv)
          </div>
          <div style={{ color: '#d6d3d1', lineHeight: '1.4' }}>
            • Free gas (xv = {steamVaporPct}%) compresses on downstroke, delaying Traveling Valve opening.<br />
            • <strong>Gas Lock</strong> drops fillage to <strong>{physicsState.pumpFillagePct}%</strong> and causes dynagraph collapse.
          </div>
        </div>

        {/* Card 4: Pressure & AOP */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '0.8rem',
            fontSize: '0.72rem',
            color: '#fed7aa'
          }}
        >
          <div style={{ fontWeight: 800, color: '#fbbf24', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Gauge size={14} /> 4. PRESSURE (P)
          </div>
          <div style={{ color: '#d6d3d1', lineHeight: '1.4' }}>
            • Intake P = {intakePressureBar} bar vs AOP = {physicsState.aopBar} bar.<br />
            • ΔP lift = {(dischargePressureBar - intakePressureBar).toFixed(1)} bar governs peak sucker rod tensile load (Ppeak = {physicsState.peakUpstrokeLoadKn} kN).
          </div>
        </div>
      </div>
    </div>
  );
}
