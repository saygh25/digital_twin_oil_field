import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  Sparkles,
  Sliders,
  Maximize2,
  Minimize2,
  Thermometer,
  Flame,
  Droplets,
  Zap,
  Gauge,
  Compass,
  Move,
  Tag,
  CheckCircle2,
  Info,
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronDown
} from 'lucide-react';

export default function XRayReservoir3DModel({
  dynamicRadius = 10.2,
  dynamicTemp = 127.3,
  dynamicViscosity = 142,
  sandboxSteamTemp = 260,
  sandboxSteamQuality = 0.8,
  sandboxSlugTonnes = 1600,
  sandboxNetPay = 18,
  oilFlowRate = 316,
  oilFlowVelocity = 0.74,
  isFullscreen = false,
  onToggleFullscreen = () => {},
  selectedSectionFilter = 'all',
  onSelectSection = () => {},
  renderMode = 'xray',
  onToggleRenderMode = () => {}
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);

  const [wireframeMode, setWireframeMode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  autoRotateRef.current = autoRotate;
  const [showLayerTags, setShowLayerTags] = useState(true);
  const [showTelemetryCards, setShowTelemetryCards] = useState(true);
  const [flowSpeedMultiplier, setFlowSpeedMultiplier] = useState(1);
  const flowSpeedRef = useRef(1);
  flowSpeedRef.current = flowSpeedMultiplier;

  // Live References for WebGL dynamic animation loops
  const oilFlowRateRef = useRef(oilFlowRate);
  oilFlowRateRef.current = oilFlowRate;
  const oilFlowVelocityRef = useRef(oilFlowVelocity);
  oilFlowVelocityRef.current = oilFlowVelocity;
  const dynamicRadiusRef = useRef(dynamicRadius);
  dynamicRadiusRef.current = dynamicRadius;
  const dynamicTempRef = useRef(dynamicTemp);
  dynamicTempRef.current = dynamicTemp;

  // Camera Orbit Navigation States
  const [rotationDeg, setRotationDeg] = useState(0); // 0° Front cross-section default
  const [zoomDistance, setZoomDistance] = useState(34);
  const [tiltDeg, setTiltDeg] = useState(78); // ~78° elevation for realistic front cross-section

  const controlsStateRef = useRef({
    isDragging: false,
    isPanning: false,
    prevMouse: { x: 0, y: 0 },
    spherical: { radius: 34, theta: 0, phi: (78 * Math.PI) / 180 },
    target: new THREE.Vector3(0, -4.5, 0)
  });

  const dynamicGroupsRef = useRef({
    strataSlabs: [],
    steamParticles: null,
    sweepParticles: null,
    oilParticles: null,
    rippleRings: [],
    plumeCore: null,
    plumeShellMid: null,
    plumeShellOuter: null
  });

  // 7 Stratigraphic Horizons Data
  const STRATA_LAYERS = useMemo(() => [
    {
      id: 'l1',
      name: 'Layer 1: Overburden Caprock Soil Crust',
      shortName: 'L1: Caprock',
      depth: '0m - 120m',
      yTop: 0.0,
      yBottom: -1.4,
      color: 0x452b1a,
      xrayColor: 0x5a3e2a,
      roughness: 0.85
    },
    {
      id: 'l2',
      name: 'Layer 2: Upper Tan Jodhpur Sandstone',
      shortName: 'L2: Upper Sand',
      depth: '120m - 280m',
      yTop: -1.4,
      yBottom: -3.0,
      color: 0xb58b57,
      xrayColor: 0xd4a36a,
      roughness: 0.75
    },
    {
      id: 'l3',
      name: 'Layer 3: Slate-Blue Impermeable Shale Barrier',
      shortName: 'L3: Barrier Shale',
      depth: '280m - 480m',
      yTop: -3.0,
      yBottom: -4.8,
      color: 0x273646,
      xrayColor: 0x3d4f5f,
      roughness: 0.65
    },
    {
      id: 'l4',
      name: 'Layer 4: Deep Red Maroon Mudstone',
      shortName: 'L4: Red Mudstone',
      depth: '480m - 680m',
      yTop: -4.8,
      yBottom: -6.5,
      color: 0x6e1a24,
      xrayColor: 0x8a2331,
      roughness: 0.70
    },
    {
      id: 'l5',
      name: 'Layer 5: Main Heavy-Oil Payzone & Steam Sweep',
      shortName: 'L5: Main Payzone',
      depth: '680m - 920m',
      yTop: -6.5,
      yBottom: -8.8,
      color: 0xa85324,
      xrayColor: 0xca682e,
      roughness: 0.80,
      isPayzone: true
    },
    {
      id: 'l6',
      name: 'Layer 6: Lower Dark Silty Shale Barrier',
      shortName: 'L6: Lower Shale',
      depth: '920m - 1060m',
      yTop: -8.8,
      yBottom: -10.2,
      color: 0x1e293b,
      xrayColor: 0x334155,
      roughness: 0.65
    },
    {
      id: 'l7',
      name: 'Layer 7: Basal Basement Bedrock Floor',
      shortName: 'L7: Bedrock',
      depth: '1060m - 1200m+',
      yTop: -10.2,
      yBottom: -12.0,
      color: 0x181412,
      xrayColor: 0x29211c,
      roughness: 0.90
    }
  ], []);

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
    const r = Math.max(16, Math.min(65, newRadius));
    setZoomDistance(r);
    controlsStateRef.current.spherical.radius = r;
    updateCameraPosition();
  };

  const handleRotationChange = (deg) => {
    const normalized = ((deg % 360) + 360) % 360;
    setRotationDeg(Math.round(normalized));
    controlsStateRef.current.spherical.theta = (normalized * Math.PI) / 180;
    updateCameraPosition();
  };

  const handleTiltChange = (deg) => {
    const clamped = Math.max(25, Math.min(88, deg));
    setTiltDeg(Math.round(clamped));
    controlsStateRef.current.spherical.phi = (clamped * Math.PI) / 180;
    updateCameraPosition();
  };

  const resetCamera = () => {
    setRotationDeg(0);
    setZoomDistance(34);
    setTiltDeg(78);
    controlsStateRef.current.spherical = { radius: 34, theta: 0, phi: (78 * Math.PI) / 180 };
    controlsStateRef.current.target.set(0, -4.5, 0);
    updateCameraPosition();
  };

  // --- Three.js 3D WebGL Initialization ---
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 1. Lighting Rig (Cyan & Golden Engineering Studio Lights)
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.6);
    scene.add(ambientLight);

    const cyanKeyLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    cyanKeyLight.position.set(-20, 25, 30);
    scene.add(cyanKeyLight);

    const goldWarmLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
    goldWarmLight.position.set(20, 15, 25);
    scene.add(goldWarmLight);

    const underGlow = new THREE.PointLight(0x00f0ff, 2.0, 35);
    underGlow.position.set(0, -7.5, 5);
    scene.add(underGlow);

    // 2. Distant Wireframe Mountains in Horizon
    const mtnGeo = new THREE.PlaneGeometry(85, 14, 48, 12);
    const mtnPos = mtnGeo.attributes.position;
    for (let i = 0; i < mtnPos.count; i++) {
      const vx = mtnPos.getX(i);
      const vy = mtnPos.getY(i);
      if (vy > -4) {
        const h = Math.sin(vx * 0.12) * 3.2 + Math.cos(vx * 0.28) * 1.8 + Math.sin(vx * 0.05) * 4.5;
        mtnPos.setY(i, vy + Math.max(0, h));
      }
    }
    mtnGeo.computeVertexNormals();
    const mtnMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const mountainMesh = new THREE.Mesh(mtnGeo, mtnMat);
    mountainMesh.position.set(0, 5.0, -18);
    scene.add(mountainMesh);

    // 3. Ground Surface Holographic Scan Grid (Y = 0)
    const groundGrid = new THREE.GridHelper(52, 36, 0x00f0ff, 0x0e7490);
    groundGrid.position.set(0, 0, 0);
    scene.add(groundGrid);

    // 4. 7-Layer Geological Strata 3D Slabs (Wide rectangular geological blocks)
    const slabWidth = 34;
    const slabDepth = 8;
    const slabs = [];

    STRATA_LAYERS.forEach((layer) => {
      const slabH = layer.yTop - layer.yBottom;
      const slabCenterY = (layer.yTop + layer.yBottom) / 2;

      const slabGeo = new THREE.BoxGeometry(slabWidth, slabH, slabDepth, 32, 4, 8);
      
      // Undulate front face vertices for organic sedimentary wave patterns
      const pos = slabGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        if (pz > 0) {
          const wave = Math.sin(px * 0.35 + layer.yTop) * 0.38 + Math.cos(px * 0.72) * 0.18;
          pos.setY(i, py + wave);
        }
      }
      slabGeo.computeVertexNormals();

      const slabMat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: layer.roughness,
        metalness: 0.15,
        transparent: true,
        opacity: layer.isPayzone ? 0.95 : 0.88,
        wireframe: false
      });

      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(0, slabCenterY, 0);
      scene.add(slabMesh);

      // Subtle cyan contour edges on each strata boundary
      const edgeGeo = new THREE.EdgesGeometry(slabGeo, 24);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.35
      });
      const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
      slabMesh.add(edgeLine);

      slabs.push({ mesh: slabMesh, mat: slabMat, edgeMat, id: layer.id });
    });
    dynamicGroupsRef.current.strataSlabs = slabs;

    // 5. Dual 3D Wellbores (Left: INJ-01 @ X=-9, Right: PRD-01 @ X=+9)
    const wellDepth = 12.0;
    const injX = -9.0;
    const prodX = 9.0;

    const create3DWellbore = (xPos, type = 'injector') => {
      const wellGroup = new THREE.Group();
      wellGroup.position.set(xPos, 0, 0);

      // (A) Glowing Cyan-White Holographic Outer X-Ray Sleeve (Transparent Cylinder)
      const outerSleeveGeo = new THREE.CylinderGeometry(0.85, 0.85, wellDepth, 24, 16, true);
      const outerSleeveMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.32,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      const outerSleeveMesh = new THREE.Mesh(outerSleeveGeo, outerSleeveMat);
      outerSleeveMesh.position.set(0, -wellDepth / 2, 0);
      wellGroup.add(outerSleeveMesh);

      // (B) Cyan Wireframe Structural Rings
      const sleeveWireGeo = new THREE.WireframeGeometry(outerSleeveGeo);
      const sleeveWireMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65
      });
      const sleeveWireLine = new THREE.LineSegments(sleeveWireGeo, sleeveWireMat);
      outerSleeveMesh.add(sleeveWireLine);

      // (C) Solid Metallic Inner Production / Injection Tubing String
      const innerTubingGeo = new THREE.CylinderGeometry(0.36, 0.36, wellDepth, 20);
      const innerTubingMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.25
      });
      const innerTubingMesh = new THREE.Mesh(innerTubingGeo, innerTubingMat);
      innerTubingMesh.position.set(0, -wellDepth / 2, 0);
      wellGroup.add(innerTubingMesh);

      // (D) Red Perforated Screen Interval at Payzone Depth (Y = -6.8 to -8.8)
      const perfsGeo = new THREE.CylinderGeometry(0.44, 0.44, 2.0, 20);
      const perfsMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0xef4444,
        emissiveIntensity: 0.65,
        roughness: 0.4
      });
      const perfsMesh = new THREE.Mesh(perfsGeo, perfsMat);
      perfsMesh.position.set(0, -7.8, 0);
      wellGroup.add(perfsMesh);

      // (E) Surface Christmas Tree / Wellhead on Top (Y = 0 to 1.8)
      const treeBaseGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.5, 16);
      const treeBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
      const treeBase = new THREE.Mesh(treeBaseGeo, treeBaseMat);
      treeBase.position.set(0, 0.25, 0);
      wellGroup.add(treeBase);

      const treeValveGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 16);
      const treeValveMat = new THREE.MeshStandardMaterial({
        color: type === 'injector' ? 0xdc2626 : 0x0284c7,
        metalness: 0.7,
        roughness: 0.3
      });
      const treeValve = new THREE.Mesh(treeValveGeo, treeValveMat);
      treeValve.position.set(0, 1.0, 0);
      wellGroup.add(treeValve);

      // (F) Concentric Radiating Cyan Ripple Rings at Base (Y = -12.0)
      for (let r = 1; r <= 3; r++) {
        const ringGeo = new THREE.RingGeometry(r * 0.9, r * 0.9 + 0.08, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.7 - r * 0.18,
          side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.set(0, -wellDepth, 0);
        wellGroup.add(ringMesh);
      }

      scene.add(wellGroup);
      return wellGroup;
    };

    create3DWellbore(injX, 'injector');
    create3DWellbore(prodX, 'producer');

    // 6. Elevated Industrial Surface Facility Platform & Models (Between the Wellheads)
    const platformGeo = new THREE.BoxGeometry(14, 0.25, 4.5);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const platformMesh = new THREE.Mesh(platformGeo, platformMat);
    platformMesh.position.set(0, 0.12, 0);
    scene.add(platformMesh);

    // 3D Storage Silos on Platform
    const tankGeo = new THREE.CylinderGeometry(1.4, 1.4, 2.6, 24);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });
    const tank1 = new THREE.Mesh(tankGeo, tankMat);
    tank1.position.set(-1.8, 1.55, 0);
    scene.add(tank1);

    const tank2 = new THREE.Mesh(tankGeo, tankMat);
    tank2.position.set(1.5, 1.55, -0.6);
    scene.add(tank2);

    // 3D Separator Vessel
    const sepGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.8, 20);
    const sepMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.25 });
    const sepMesh = new THREE.Mesh(sepGeo, sepMat);
    sepMesh.rotation.z = Math.PI / 2;
    sepMesh.position.set(-4.5, 1.2, 0);
    scene.add(sepMesh);

    // 3D Pumpjack Skeleton above Producer
    const pumpjackBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    pumpjackBase.position.set(5.5, 1.15, 0);
    scene.add(pumpjackBase);

    // Interconnecting Surface Pipeline Network
    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 17.5, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(0, 0.5, 0);
    scene.add(pipeMesh);

    // 7. Volumetric 3D Glowing Steam Chamber & Isotherm Shells in Payzone (Y = -7.8)
    const plumeCenter = new THREE.Vector3(0, -7.8, 0);

    // Core Superheated Steam Chamber (>180°C)
    const coreGeo = new THREE.SphereGeometry(1.8, 32, 16);
    coreGeo.scale(3.2, 0.65, 1.2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.copy(plumeCenter);
    scene.add(coreMesh);
    dynamicGroupsRef.current.plumeCore = coreMesh;

    // Mid Isotherm Shell (120°C - 160°C)
    const midGeo = new THREE.SphereGeometry(2.6, 28, 14);
    midGeo.scale(3.8, 0.75, 1.4);
    const midMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    midMesh.position.copy(plumeCenter);
    scene.add(midMesh);
    dynamicGroupsRef.current.plumeShellMid = midMesh;

    // Outer Isotherm Shell (80°C - 110°C)
    const outerGeo = new THREE.SphereGeometry(3.4, 24, 12);
    outerGeo.scale(4.2, 0.85, 1.6);
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.28,
      wireframe: true
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.position.copy(plumeCenter);
    scene.add(outerMesh);
    dynamicGroupsRef.current.plumeShellOuter = outerMesh;

    // 8. Dynamic 3D Flow Particles (Steam Injector Down, Darcy Reservoir Sweep, Producer Up)
    // (A) Steam Injection Particles (Down inside left well)
    const steamCount = 45;
    const steamGeo = new THREE.BufferGeometry();
    const steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) {
      steamPos[i * 3] = injX + (Math.random() - 0.5) * 0.3;
      steamPos[i * 3 + 1] = -Math.random() * 7.8;
      steamPos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({ color: 0xef4444, size: 0.35, transparent: true, opacity: 0.95 });
    const steamParticles = new THREE.Points(steamGeo, steamMat);
    scene.add(steamParticles);
    dynamicGroupsRef.current.steamParticles = steamParticles;

    // (B) Darcy Reservoir Sweep Streamlines (Left to Right from injX to prodX)
    const sweepCount = 220;
    const sweepGeo = new THREE.BufferGeometry();
    const sweepPos = new Float32Array(sweepCount * 3);
    for (let i = 0; i < sweepCount; i++) {
      const frac = Math.random();
      sweepPos[i * 3] = injX + frac * (prodX - injX);
      sweepPos[i * 3 + 1] = -7.8 + (Math.random() - 0.5) * 1.5;
      sweepPos[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    sweepGeo.setAttribute('position', new THREE.BufferAttribute(sweepPos, 3));
    const sweepMat = new THREE.PointsMaterial({ color: 0xfef08a, size: 0.42, transparent: true, opacity: 0.95 });
    const sweepParticles = new THREE.Points(sweepGeo, sweepMat);
    scene.add(sweepParticles);
    dynamicGroupsRef.current.sweepParticles = sweepParticles;

    // (C) Oil Production Lift Particles (Up inside right well)
    const oilCount = 50;
    const oilGeo = new THREE.BufferGeometry();
    const oilPos = new Float32Array(oilCount * 3);
    for (let i = 0; i < oilCount; i++) {
      oilPos[i * 3] = prodX + (Math.random() - 0.5) * 0.3;
      oilPos[i * 3 + 1] = -7.8 + Math.random() * 8.5;
      oilPos[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    oilGeo.setAttribute('position', new THREE.BufferAttribute(oilPos, 3));
    const oilMat = new THREE.PointsMaterial({ color: 0xf59e0b, size: 0.38, transparent: true, opacity: 0.95 });
    const oilParticles = new THREE.Points(oilGeo, oilMat);
    scene.add(oilParticles);
    dynamicGroupsRef.current.oilParticles = oilParticles;

    updateCameraPosition();

    // 9. Interactive Resize Handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth || 1024;
      const nh = container.clientHeight || 540;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Render Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const speed = flowSpeedRef.current || 1;

      // Auto Rotate 360°
      if (autoRotateRef.current) {
        controlsStateRef.current.spherical.theta += 0.006 * speed;
        const newDeg = Math.round(((controlsStateRef.current.spherical.theta * 180) / Math.PI) % 360);
        setRotationDeg(newDeg < 0 ? newDeg + 360 : newDeg);
        updateCameraPosition();
      }

      // (A) Animate Downward Steam Particles
      if (dynamicGroupsRef.current.steamParticles) {
        const pArr = dynamicGroupsRef.current.steamParticles.geometry.attributes.position.array;
        for (let i = 0; i < steamCount; i++) {
          pArr[i * 3 + 1] -= 0.12 * speed;
          if (pArr[i * 3 + 1] < -7.8) {
            pArr[i * 3 + 1] = 0.5;
          }
        }
        dynamicGroupsRef.current.steamParticles.geometry.attributes.position.needsUpdate = true;
      }

      // (B) Animate Horizontal Reservoir Sweep Streamlines (Left to Right)
      if (dynamicGroupsRef.current.sweepParticles) {
        const pArr = dynamicGroupsRef.current.sweepParticles.geometry.attributes.position.array;
        for (let i = 0; i < sweepCount; i++) {
          pArr[i * 3] += 0.08 * speed;
          // Sinuous wave motion along stream path
          pArr[i * 3 + 1] = -7.8 + Math.sin(pArr[i * 3] * 0.45 + time * 3.5) * 0.45;
          if (pArr[i * 3] > prodX) {
            pArr[i * 3] = injX;
          }
        }
        dynamicGroupsRef.current.sweepParticles.geometry.attributes.position.needsUpdate = true;
      }

      // (C) Animate Upward Oil Production Particles
      if (dynamicGroupsRef.current.oilParticles) {
        const pArr = dynamicGroupsRef.current.oilParticles.geometry.attributes.position.array;
        for (let i = 0; i < oilCount; i++) {
          pArr[i * 3 + 1] += 0.10 * speed;
          if (pArr[i * 3 + 1] > 1.2) {
            pArr[i * 3 + 1] = -7.8;
          }
        }
        dynamicGroupsRef.current.oilParticles.geometry.attributes.position.needsUpdate = true;
      }

      // (D) Thermal Core Pulse
      if (dynamicGroupsRef.current.plumeCore) {
        const pulse = 1.0 + Math.sin(time * 3.2) * 0.06;
        dynamicGroupsRef.current.plumeCore.scale.set(3.2 * pulse, 0.65 * pulse, 1.2 * pulse);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update wireframe mode across 3D strata slabs
  useEffect(() => {
    if (dynamicGroupsRef.current.strataSlabs) {
      dynamicGroupsRef.current.strataSlabs.forEach((s) => {
        if (s.mat) s.mat.wireframe = wireframeMode;
      });
    }
  }, [wireframeMode]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e) => {
    controlsStateRef.current.isDragging = true;
    controlsStateRef.current.isPanning = e.button === 2;
    controlsStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!controlsStateRef.current.isDragging) return;
    const dx = e.clientX - controlsStateRef.current.prevMouse.x;
    const dy = e.clientY - controlsStateRef.current.prevMouse.y;
    controlsStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };

    if (controlsStateRef.current.isPanning) {
      const panSpeed = 0.025;
      controlsStateRef.current.target.x -= dx * panSpeed;
      controlsStateRef.current.target.y += dy * panSpeed;
    } else {
      const rotSpeed = 0.007;
      controlsStateRef.current.spherical.theta -= dx * rotSpeed;
      controlsStateRef.current.spherical.phi = Math.max(0.3, Math.min(Math.PI * 0.49, controlsStateRef.current.spherical.phi - dy * rotSpeed));
      
      const newDeg = Math.round(((controlsStateRef.current.spherical.theta * 180) / Math.PI) % 360);
      setRotationDeg(newDeg < 0 ? newDeg + 360 : newDeg);
      setTiltDeg(Math.round((controlsStateRef.current.spherical.phi * 180) / Math.PI));
    }
    updateCameraPosition();
  };

  const handleMouseUp = () => {
    controlsStateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * 0.03;
    handleZoomChange(controlsStateRef.current.spherical.radius + delta);
  };

  return (
    <div
      style={
        isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              background: '#020617',
              overflow: 'hidden'
            }
          : {
              position: 'relative',
              width: '100%',
              aspectRatio: '1024 / 504',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1.5px solid rgba(2, 132, 199, 0.65)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.95)',
              background: '#020617'
            }
      }
    >
      {/* 1. 3D WEBGL CANVAS VIEWPORT */}
      <div
        ref={mountRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
      />

      {/* 2. TOP-LEFT HUD TELEMETRY BADGE (UI OVERLAY) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 20
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(234, 88, 12, 0.65)',
            padding: '0.55rem 0.9rem',
            borderRadius: '10px',
            color: '#1c1917',
            fontSize: '0.72rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            maxWidth: '390px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1.5px solid rgba(234, 88, 12, 0.4)',
              paddingBottom: '5px'
            }}
          >
            <span style={{ fontWeight: 900, color: '#7c2d12', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', letterSpacing: '0.02em' }}>
              <Flame size={15} color="#ea580c" /> 7-LAYER SOLID STRATA STREAM FLOW
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#7c2d12',
                fontWeight: 900,
                background: 'rgba(234, 88, 12, 0.22)',
                border: '1.5px solid #ea580c',
                backdropFilter: 'blur(6px)',
                padding: '2px 7px',
                borderRadius: '4px'
              }}
            >
              {oilFlowRate} BOPD
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5px',
              marginTop: '2px',
              fontSize: '0.68rem'
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(234, 88, 12, 0.35)', padding: '4px 7px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: '#1c1917' }}>
              <Flame size={12} color="#ea580c" />
              <span>Steam: <strong style={{ color: '#7c2d12' }}>{sandboxSteamTemp}°C</strong> ({typeof sandboxSteamQuality === 'number' && sandboxSteamQuality <= 1 ? (sandboxSteamQuality * 100).toFixed(0) + '%' : sandboxSteamQuality + '%'})</span>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(234, 88, 12, 0.35)', padding: '4px 7px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: '#1c1917' }}>
              <Droplets size={12} color="#ea580c" />
              <span>Darcy Vel: <strong style={{ color: '#7c2d12' }}>{oilFlowVelocity} m/d</strong></span>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(234, 88, 12, 0.35)', padding: '4px 7px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: '#1c1917' }}>
              <Thermometer size={12} color="#ea580c" />
              <span>Core T: <strong style={{ color: '#7c2d12' }}>{dynamicTemp}°C</strong></span>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(234, 88, 12, 0.35)', padding: '4px 7px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px', color: '#1c1917' }}>
              <Activity size={12} color="#ea580c" />
              <span>Plume Front: <strong style={{ color: '#7c2d12' }}>{dynamicRadius}m</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LEFT DEPTH SCALE RULER */}
      <div
        style={{
          position: 'absolute',
          top: '22%',
          left: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '0.62rem',
          color: '#94a3b8',
          zIndex: 15,
          pointerEvents: 'none'
        }}
      >
        <span style={{ fontWeight: 800, color: '#cbd5e1' }}>Depth (m)</span>
        <span>0m ──</span>
        <span>200m ──</span>
        <span>400m ──</span>
        <span>600m ──</span>
        <span>800m ──</span>
        <span>1,000m ──</span>
        <span>1,200m ──</span>
      </div>

      {/* 4. TOP-RIGHT CONTROLS: FULLSCREEN & CALLOUT TOGGLES */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          zIndex: 25
        }}
      >
        <button
          onClick={() => setWireframeMode(!wireframeMode)}
          style={{
            background: wireframeMode ? '#0284c7' : 'rgba(2, 6, 23, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title="Toggle 3D Wireframe Scan Mode"
        >
          <Layers size={13} />
          <span>{wireframeMode ? 'Wireframe ON' : 'Wireframe'}</span>
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            background: autoRotate ? '#0284c7' : 'rgba(2, 6, 23, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <RotateCcw size={13} />
          <span>{autoRotate ? 'Orbiting 360°' : '360° Orbit'}</span>
        </button>

        <button
          onClick={() => setShowTelemetryCards(!showTelemetryCards)}
          style={{
            background: showTelemetryCards ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 6, 23, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Info size={13} />
          <span>{showTelemetryCards ? 'Callouts ON' : 'Callouts'}</span>
        </button>

        <button
          onClick={onToggleFullscreen}
          style={{
            background: isFullscreen ? '#0284c7' : 'rgba(2, 6, 23, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            color: '#ffffff',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>

      {/* 5. INTERACTIVE CALLOUTS OVERLAY */}
      {showTelemetryCards && (
        <>
          {/* Steam Injector Callout */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '18%',
              background: 'rgba(15, 8, 8, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(239, 68, 68, 0.7)',
              borderRadius: '6px',
              padding: '0.4rem 0.65rem',
              color: '#fee2e2',
              fontSize: '0.65rem',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#f87171' }}>
              <ArrowDown size={13} color="#ef4444" />
              <span>STEAM INJECTOR (INJ-01)</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#fca5a5', marginTop: '2px' }}>
              P_inj: <strong>92.4 bar</strong> &bull; T: <strong>{sandboxSteamTemp}&deg;C</strong>
            </div>
          </div>

          {/* Oil Producer Callout */}
          <div
            style={{
              position: 'absolute',
              top: '40%',
              right: '18%',
              background: 'rgba(15, 12, 6, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(245, 158, 11, 0.75)',
              borderRadius: '6px',
              padding: '0.4rem 0.65rem',
              color: '#fef3c7',
              fontSize: '0.65rem',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#fbbf24' }}>
              <ArrowUp size={13} color="#f59e0b" />
              <span>OIL PRODUCER (PRD-01)</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#fde68a', marginTop: '2px' }}>
              Flow: <strong style={{ color: '#4ade80' }}>{oilFlowRate} BOPD</strong> &bull; Darcy: <strong>{oilFlowVelocity} m/d</strong>
            </div>
          </div>

          {/* Steam Chamber & Heat Front Badges */}
          <div
            style={{
              position: 'absolute',
              bottom: '52px',
              left: '42%',
              background: 'rgba(12, 9, 7, 0.94)',
              border: '1.5px solid rgba(249, 115, 22, 0.85)',
              borderRadius: '6px',
              padding: '0.35rem 0.7rem',
              color: '#fed7aa',
              fontSize: '0.65rem',
              zIndex: 15,
              pointerEvents: 'none',
              textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: 800 }}>Steam Chamber</div>
            <div style={{ fontSize: '0.58rem', color: '#fdba74' }}>(Liquid Heavy Oil Mobilization)</div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '56px',
              left: '62%',
              background: 'rgba(12, 9, 7, 0.94)',
              border: '1.5px solid rgba(251, 191, 36, 0.9)',
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              color: '#fde047',
              fontSize: '0.65rem',
              fontWeight: 800,
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            Heat Front
          </div>
        </>
      )}

      {/* 6. BOTTOM STRATIGRAPHIC HORIZON BADGE BAR & VIEW TOGGLE PILLS */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(2, 6, 23, 0.94)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          borderRadius: '8px',
          padding: '0.4rem 0.85rem',
          zIndex: 20,
          boxShadow: '0 6px 24px rgba(0,0,0,0.85)',
          flexWrap: 'wrap'
        }}
      >
        {/* Left: Strata Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color="#38bdf8" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8' }}>
            STRATA PROFILE:
          </span>
          <span style={{ fontSize: '0.68rem', color: '#e2e8f0' }}>
            7 Calibrated Horizons &bull; <strong style={{ color: '#fed7aa' }}>Main Heavy Oil Payzone (235 &ndash; 330m)</strong> Active Thermal
          </span>
        </div>

        {/* Center: Dual Render Mode Switcher Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.65)', padding: '2px', borderRadius: '24px', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
          <button
            onClick={() => onToggleRenderMode && onToggleRenderMode('solid')}
            style={{
              background: renderMode === 'solid' ? 'linear-gradient(135deg, #b45309 0%, #ea580c 100%)' : 'transparent',
              color: renderMode === 'solid' ? '#ffffff' : '#fed7aa',
              border: 'none',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🪨 7-Layer Solid Strata View</span>
          </button>
          <button
            onClick={() => onToggleRenderMode && onToggleRenderMode('xray')}
            style={{
              background: renderMode === 'xray' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
              color: renderMode === 'xray' ? '#ffffff' : '#93c5fd',
              border: 'none',
              borderRadius: '20px',
              padding: '4px 14px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: renderMode === 'xray' ? '0 2px 10px rgba(2, 132, 199, 0.6)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>💎 X-Ray Isotherm Shell View</span>
          </button>
        </div>

        {/* Right: Flow Speed Controller & View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={resetCamera}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.64rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Reset 3D Camera Orientation"
          >
            Reset 3D
          </button>

          <span style={{ fontSize: '0.66rem', color: '#a8a29e' }}>
            Flow Speed:
          </span>
          <button
            onClick={() => setFlowSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1))}
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.5)',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.64rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>{flowSpeedMultiplier}x Speed</span>
            <ChevronDown size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
