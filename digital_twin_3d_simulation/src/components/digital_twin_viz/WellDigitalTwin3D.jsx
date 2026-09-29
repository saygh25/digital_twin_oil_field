import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import {
  Flame,
  Droplets,
  Zap,
  ShieldCheck,
  Gauge,
  Thermometer,
  Activity,
  Layers,
  Compass,
  RotateCcw,
  Sparkles,
  Info,
  Box,
  Target,
  Eye,
  Maximize2,
  Minimize2,
  Menu
} from 'lucide-react';

import PumpjackSurface3D from './PumpjackSurface3D';
import Wellbore3D from './Wellbore3D';
import ReservoirZone3D from './ReservoirZone3D';
import GeologicalCrossSection from './GeologicalCrossSection';
import DesertGroundTerrain from './DesertGroundTerrain';
import SurfaceFacilities3D from './SurfaceFacilities3D';
import DynoCardMini from './DynoCardMini';
import PhysicsSidePanel from './PhysicsSidePanel';
import IncidentSimulatorBanner from './IncidentSimulatorBanner';
import TimelineScrubber from './TimelineScrubber';
import WellTelemetryHUDCard from './WellTelemetryHUDCard';
import BorewellThermalInspectorCard from './BorewellThermalInspectorCard';
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';

import {
  API_BASE_URL,
  API_ENDPOINTS,
  FIELD_SPECS,
  CSS_STAGES,
  FALLBACK_CSS_TIMELINE
} from './constants';

import './digital_twin_3d.css';

/**
 * Camera Controller for Smooth Preset Transitions & Subterranean Scroll Bounds
 */
function CameraController({ cameraView }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    let targetPos = [2.8, -6.0, 24.0];
    let lookTarget = [2.8, -6.0, 0.0];

    switch (cameraView) {
      case 'surface':
        targetPos = [2.8, 3.2, 11.5];
        lookTarget = [2.8, 1.2, -1.5];
        break;
      case 'top':
      case 'aerial':
        targetPos = [2.8, 17.5, 14.2];
        lookTarget = [2.8, 0.0, -1.2];
        break;
      case 'wellbore':
      case 'schematic':
        targetPos = [2.8, -2.6, 11.5];
        lookTarget = [2.8, -3.0, 0.0];
        break;
      case 'thermal':
        targetPos = [2.8, -5.8, 15.0];
        lookTarget = [2.8, -5.8, 0.0];
        break;
      case 'pump':
        targetPos = [2.8, -8.0, 10.0];
        lookTarget = [2.8, -8.5, 0.0];
        break;
      case 'reservoir':
        targetPos = [2.8, -11.0, 9.5];
        lookTarget = [2.8, -11.5, 0.0];
        break;
      case 'full':
      default:
        // Land at minPolarAngle (45° polar = 45° elevation) — isometric overhead view
        // Scaled out to ~39 units from target for a wider establishing shot
        targetPos = [2.8, 28.0, 28.0];
        lookTarget = [2.8, 0.5, 0.0];
        break;
    }

    if (controls) {
      // ── GLOBAL LOCKED CONSTRAINTS (never override these) ──────────────────
      // Horizontal rotation: fully locked — no left/right orbit
      controls.minAzimuthAngle = 0;
      controls.maxAzimuthAngle = 0;

      // Vertical rotation: 45° overhead (landing) → 90° horizontal (underground view)
      controls.minPolarAngle = Math.PI / 4;   // 45° — isometric overhead, no pure top-down
      controls.maxPolarAngle = Math.PI * 0.72; // ~130° — well below ground to view underground layers

      // Zoom: allow closer than default but not too far
      controls.minDistance = 2.0;
      controls.maxDistance = 55.0;

      // Pan Y clamp applied via minTargetY/maxTargetY on the controls instance
      controls.minTargetY = -7.5;
      controls.maxTargetY = 2.0;
      // ──────────────────────────────────────────────────────────────────────

      controls.target.set(lookTarget[0], lookTarget[1], lookTarget[2]);
      camera.position.set(targetPos[0], targetPos[1], targetPos[2]);
      camera.lookAt(lookTarget[0], lookTarget[1], lookTarget[2]);
      controls.update();
    } else {
      camera.position.set(...targetPos);
      camera.lookAt(...lookTarget);
    }
  }, [cameraView, camera, controls]);

  // Enforce strict subterranean scroll/pan limits: cannot scroll or pan past the last layer
  useFrame(() => {
    if (controls) {
      // Re-enforce all locks every frame so nothing can ever sneak past them
      controls.minAzimuthAngle = 0;
      controls.maxAzimuthAngle = 0;
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI * 0.72;
      controls.minDistance = 2.0;
      controls.minTargetY = -7.5;
      controls.maxTargetY = 2.0;

      // Hard-clamp the target Y in case an animation slips past minTargetY
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, -7.5, 2.0);
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, 0.5, 5.1);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -3.5, 3.5);
    }
  });

  return null;
}


/**
 * Master 3D Well-to-Surface Digital Twin Container Component
 * 
 * SWAP INSTRUCTIONS:
 * - Pass `wellId` (e.g. "B-17") as prop
 * - Configure `API_BASE_URL` in `constants.js`
 */
export default function WellDigitalTwin3D({
  wellId = 'B-17',
  onComponentClick,
  className = ''
}) {
  // 1. Camera Viewpoint Preset State (Default: full 30° angled view)
  const [cameraView, setCameraView] = useState('full'); // 'full', 'surface', 'pump', 'reservoir'
  const [selectedComponent, setSelectedComponent] = useState(null);

  // 1a. Surface Facilities Visibility Toggles (Separator, Sludge Tank, Steam Pipeline, Power Unit, Wellhead)
  const [facilityVisibility, setFacilityVisibility] = useState({
    separator: true,
    sludgeTank: true,
    steamPipeline: true,
    powerUnit: true,
    wellhead: true
  });

  // 1b. Completion String Render Mode: Solid vs X-Ray vs Thermal
  const [renderMode, setRenderMode] = useState('solid'); // 'solid' | 'xray' | 'thermal'
  const pipeViewMode = renderMode === 'xray' ? 'xray' : (renderMode === 'thermal' ? 'thermal' : 'solid');
  const isThermalView = renderMode === 'thermal';
  const [sidebarMode, setSidebarMode] = useState('3D VIEW');
  const [isThermalInspectorOpen, setIsThermalInspectorOpen] = useState(false);

  // 1c. Fullscreen State & Container Reference
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen Toggle Handler (Supports Native Fullscreen API + Fallback)
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native fullscreen toggle error, toggling CSS fullscreen:', err);
      setIsFullscreen((prev) => !prev);
    }
  }, [isFullscreen]);

  // Synchronize fullscreen state on change / keyboard shortcut
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e) => {
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen, isFullscreen]);

  // 2. Timeline Playback & Scrubber State
  const [timelineDay, setTimelineDay] = useState(37);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // 3. Rod Float Incident Simulation Sequence State
  // 0: Idle, 1: Cooling, 2: Viscosity Spike, 3: Rod Floating Alert, 4: Auto-Remediating, 5: Stabilized
  const [incidentStep, setIncidentStep] = useState(0);
  const incidentTimerRef = useRef(null);

  // 4. Live Backend Data vs Fallback State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveState, setLiveState] = useState(null);
  const [dynoData, setDynoData] = useState(null);
  const [failureData, setFailureData] = useState(null);
  const [depthProfileData, setDepthProfileData] = useState(null);
  const [asphalteneData, setAsphalteneData] = useState(null);
  // Thermal Simulation Stage Override: 'LIVE' | 'STEAM' | 'SOAK' | 'PROD' | 'COOLING'
  const [thermalSimStage, setThermalSimStage] = useState('LIVE');

  // Real-time kinematic stroke tracker
  const [kinematicPosIn, setKinematicPosIn] = useState(36.0);
  const [kinematicLoadKn, setKinematicLoadKn] = useState(45.0);
  const [isHudCardOpen, setIsHudCardOpen] = useState(true);

  // 5. Fetch Live Data from Backend API
  const fetchLiveData = useCallback(async () => {
    try {
      const [stateRes, dynoRes, riskRes, depthRes, asphRes] = await Promise.all([
        fetch(API_ENDPOINTS.DIGITAL_TWIN_STATE(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.DYNO_CARD(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.FAILURE_RISK(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.DEPTH_PROFILE(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.ASPHALTENE_RISK(wellId)).catch(() => null)
      ]);

      if (stateRes && stateRes.ok) {
        const stateJson = await stateRes.json();
        setLiveState(stateJson);
        setIsLiveConnected(true);
      } else {
        setIsLiveConnected(false);
      }

      if (dynoRes && dynoRes.ok) {
        const dynoJson = await dynoRes.json();
        setDynoData(dynoJson);
      }

      if (riskRes && riskRes.ok) {
        const riskJson = await riskRes.json();
        setFailureData(riskJson);
      }

      if (depthRes && depthRes.ok) {
        const depthJson = await depthRes.json();
        setDepthProfileData(depthJson);
      }

      if (asphRes && asphRes.ok) {
        const asphJson = await asphRes.json();
        setAsphalteneData(asphJson);
      }
    } catch (err) {
      setIsLiveConnected(false);
    }
  }, [wellId]);

  // Initial fetch and 2.5-second polling interval
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 2500);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // 6. WebSocket Telemetry Stream (when available)
  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket(API_ENDPOINTS.TELEMETRY_WS(wellId));
      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.stroke_position_in !== undefined) {
            setKinematicPosIn(packet.stroke_position_in);
            setKinematicLoadKn(packet.polished_rod_load_kn);
          }
        } catch (e) {}
      };
      ws.onerror = () => {};
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, [wellId]);

  // Fallback Timeline Interpolation Engine
  const timelineInterpolated = useMemo(() => {
    const total = FALLBACK_CSS_TIMELINE.length;
    // Find closest frame or interpolate between keyframes
    const day = timelineDay;
    const sorted = [...FALLBACK_CSS_TIMELINE].sort((a, b) => a.day - b.day);
    
    let lower = sorted[0];
    let upper = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i++) {
      if (day >= sorted[i].day && day <= sorted[i + 1].day) {
        lower = sorted[i];
        upper = sorted[i + 1];
        break;
      }
    }

    const span = upper.day - lower.day || 1;
    const t = Math.max(0, Math.min(1, (day - lower.day) / span));

    const lerp = (a, b) => a + (b - a) * t;

    return {
      stage: upper.stage,
      stageName: upper.stageName,
      daysRemaining: Math.round(lerp(lower.daysRemaining, upper.daysRemaining)),
      tempC: lerp(lower.tempC, upper.tempC),
      viscosityCp: Math.round(lerp(lower.viscosityCp, upper.viscosityCp)),
      heatedRadiusM: lerp(lower.heatedRadiusM, upper.heatedRadiusM),
      spm: lerp(lower.spm, upper.spm),
      vfdHz: lerp(lower.vfdHz, upper.vfdHz),
      strokeIn: lerp(lower.strokeIn, upper.strokeIn),
      oilRateBopd: Math.round(lerp(lower.oilRateBopd, upper.oilRateBopd)),
      steamRateBpd: Math.round(lerp(lower.steamRateBpd, upper.steamRateBpd)),
      sor: lerp(lower.sor, upper.sor),
      energyKwhBbl: lerp(lower.energyKwhBbl, upper.energyKwhBbl),
      rodRiskPct: lerp(lower.rodRiskPct, upper.rodRiskPct),
      pumpFillagePct: lerp(lower.pumpFillagePct, upper.pumpFillagePct),
      pprlKn: lerp(lower.pprlKn, upper.pprlKn),
      mprlKn: lerp(lower.mprlKn, upper.mprlKn),
      rodStressState: upper.rodStressState
    };
  }, [timelineDay]);

  // Timeline Auto-Play Timer
  useEffect(() => {
    let playTimer = null;
    if (isTimelinePlaying) {
      playTimer = setInterval(() => {
        setTimelineDay((prev) => (prev >= 72 ? 0 : prev + 1));
      }, 400);
    }
    return () => clearInterval(playTimer);
  }, [isTimelinePlaying]);

  // Synthesize Active Digital Twin State (Live API -> Timeline Scrubber -> Incident Override)
  const activeTwinState = useMemo(() => {
    // 1. Base from timeline or live API
    let spm = isLiveConnected && liveState?.srp?.spm ? liveState.srp.spm : timelineInterpolated.spm;
    let vfdHz = isLiveConnected && liveState?.srp?.vfd_frequency_hz ? liveState.srp.vfd_frequency_hz : timelineInterpolated.vfdHz;
    let strokeLengthIn = isLiveConnected && liveState?.srp?.stroke_length_in ? liveState.srp.stroke_length_in : timelineInterpolated.strokeIn || 72.0;
    let tempC = isLiveConnected && liveState?.reservoir?.temperature_c ? liveState.reservoir.temperature_c : timelineInterpolated.tempC;
    let viscosityCp = isLiveConnected && liveState?.reservoir?.viscosity_cp ? liveState.reservoir.viscosity_cp : timelineInterpolated.viscosityCp;
    let heatedRadiusM = isLiveConnected && liveState?.reservoir?.heated_radius_m ? liveState.reservoir.heated_radius_m : timelineInterpolated.heatedRadiusM;
    let pprlKn = isLiveConnected && liveState?.srp?.pprl_kn ? liveState.srp.pprl_kn : timelineInterpolated.pprlKn;
    let mprlKn = isLiveConnected && liveState?.srp?.mprl_kn ? liveState.srp.mprl_kn : timelineInterpolated.mprlKn;
    let rodRiskPct = isLiveConnected && failureData?.overall_risk_score ? failureData.overall_risk_score : timelineInterpolated.rodRiskPct;
    let pumpFillagePct = isLiveConnected && liveState?.srp?.pump_volumetric_efficiency_pct ? liveState.srp.pump_volumetric_efficiency_pct : timelineInterpolated.pumpFillagePct;
    let oilRateBopd = isLiveConnected && liveState?.surface?.oil_rate_bopd ? liveState.surface.oil_rate_bopd : timelineInterpolated.oilRateBopd;
    let sor = isLiveConnected && liveState?.surface?.sor ? liveState.surface.sor : timelineInterpolated.sor;
    let energyKwhBbl = isLiveConnected && liveState?.surface?.energy_kwh_bbl ? liveState.surface.energy_kwh_bbl : timelineInterpolated.energyKwhBbl;

    // 2. Base Thermal parameters derived from backend state or physics formulas
    let bottomholeTempC = isLiveConnected && liveState?.wellbore?.bottomhole_temp_c 
      ? liveState.wellbore.bottomhole_temp_c 
      : (depthProfileData?.bottomhole_conditions?.temp_c || 125.5);
    let wellheadTempC = isLiveConnected && liveState?.wellbore?.wellhead_temp_c 
      ? liveState.wellbore.wellhead_temp_c 
      : (depthProfileData?.wellhead_conditions?.temp_c || 85.9);
    let coolingRateCDay = isLiveConnected && liveState?.reservoir?.cooling_rate_c_day 
      ? liveState.reservoir.cooling_rate_c_day 
      : 1.26;
    let steamRateBpd = 0;

    // Apply Thermal Simulation Stage Overrides if user selects a simulated stage
    if (thermalSimStage === 'STEAM') {
      tempC = 260.0;
      bottomholeTempC = 245.0;
      wellheadTempC = 260.0;
      viscosityCp = 18;
      heatedRadiusM = 16.5;
      coolingRateCDay = 0.0;
      steamRateBpd = 1200;
      oilRateBopd = 0;
      spm = 0;
    } else if (thermalSimStage === 'SOAK') {
      tempC = 195.0;
      bottomholeTempC = 185.0;
      wellheadTempC = 120.0;
      viscosityCp = 28;
      heatedRadiusM = 14.2;
      coolingRateCDay = 2.45;
      steamRateBpd = 0;
      oilRateBopd = 0;
      spm = 0;
    } else if (thermalSimStage === 'PROD') {
      tempC = 145.0;
      bottomholeTempC = 138.0;
      wellheadTempC = 92.0;
      viscosityCp = 45;
      heatedRadiusM = 12.0;
      coolingRateCDay = 1.15;
      oilRateBopd = 310;
      steamRateBpd = 0;
    } else if (thermalSimStage === 'COOLING') {
      tempC = 52.0;
      bottomholeTempC = 54.0;
      wellheadTempC = 38.0;
      viscosityCp = 8900;
      heatedRadiusM = 7.5;
      coolingRateCDay = 0.28;
      oilRateBopd = 42;
      steamRateBpd = 0;
    }

    // 3. Apply Incident Overrides
    let isRodFloating = false;
    let rodLagFactor = 0.0;

    if (incidentStep === 1) {
      // Stage 1: Cooling event
      tempC = 52.0;
    } else if (incidentStep === 2) {
      // Stage 2: Viscosity spike
      tempC = 50.0;
      viscosityCp = 9200;
      mprlKn = 11.0;
      pprlKn = 78.5;
    } else if (incidentStep === 3) {
      // Stage 3: Rod floating & snap shock
      tempC = 48.5;
      viscosityCp = 9600;
      mprlKn = 4.8; // compression!
      pprlKn = 84.0;
      rodRiskPct = 88.0;
      isRodFloating = true;
      rodLagFactor = 0.55;
    } else if (incidentStep === 4) {
      // Stage 4: Auto-remediation in progress (animating down)
      spm = 2.4;
      vfdHz = 24.0;
      mprlKn = 14.2;
      rodRiskPct = 35.0;
      isRodFloating = true;
      rodLagFactor = 0.2;
    } else if (incidentStep === 5) {
      // Stage 5: Remediation stabilized
      spm = 2.4;
      vfdHz = 24.0;
      mprlKn = 18.2;
      pprlKn = 58.0;
      rodRiskPct = 14.0;
      isRodFloating = false;
      rodLagFactor = 0.0;
    }

    const cssStage = timelineInterpolated.stage;

    return {
      spm,
      vfdHz,
      strokeLengthIn,
      strokeLengthM: strokeLengthIn * 0.0254,
      currentTempC: tempC,
      bottomholeTempC,
      wellheadTempC,
      coolingRateCDay,
      steamRateBpd,
      viscosityCp,
      heatedRadiusM,
      pprlKn,
      mprlKn,
      rodFloatingRiskPct: rodRiskPct,
      pumpFillagePct,
      oilRateBopd,
      sor,
      energyKwhBbl,
      cssStage,
      isOperating: spm > 0,
      isRodFloating,
      rodLagFactor
    };
  }, [isLiveConnected, liveState, failureData, depthProfileData, timelineInterpolated, incidentStep, thermalSimStage]);

  // Dynamic Kinematic Oscillation loop (real-time dyno card cursor dot reciprocation)
  useEffect(() => {
    if (activeTwinState.spm <= 0) return;
    let animId;
    let startTime = Date.now();
    const strokeSec = 60 / activeTwinState.spm;
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const phase = (elapsed % strokeSec) / strokeSec;
      const theta = phase * 2 * Math.PI;
      const normPos = 0.5 * (1 - Math.cos(theta));
      const pos = normPos * activeTwinState.strokeLengthIn;
      
      let load;
      if (theta <= Math.PI) {
        load = activeTwinState.mprlKn + (activeTwinState.pprlKn - activeTwinState.mprlKn) * Math.sin(phase * Math.PI);
      } else {
        load = activeTwinState.pprlKn - (activeTwinState.pprlKn - activeTwinState.mprlKn) * Math.sin((phase - 0.5) * Math.PI);
        if (activeTwinState.isRodFloating) {
          load = Math.max(6.0, load - 12.0 * Math.sin((phase - 0.5) * 2 * Math.PI));
        }
      }
      setKinematicPosIn(Number(pos.toFixed(1)));
      setKinematicLoadKn(Number(load.toFixed(1)));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [activeTwinState.spm, activeTwinState.strokeLengthIn, activeTwinState.pprlKn, activeTwinState.mprlKn, activeTwinState.isRodFloating]);

  // Handle "Simulate Rod Float Incident" sequence progression
  const handleStartIncidentSimulation = () => {
    setIncidentStep(1);
    // Automatically progress through stages 1 -> 2 -> 3
    if (incidentTimerRef.current) clearTimeout(incidentTimerRef.current);

    incidentTimerRef.current = setTimeout(() => {
      setIncidentStep(2);
      incidentTimerRef.current = setTimeout(() => {
        setIncidentStep(3); // Critical alert stage - awaits remediation click or auto after 6s
      }, 2500);
    }, 2500);
  };

  const handleApplyRemediation = () => {
    setIncidentStep(4);
    if (incidentTimerRef.current) clearTimeout(incidentTimerRef.current);
    incidentTimerRef.current = setTimeout(() => {
      setIncidentStep(5);
    }, 3000);
  };

  const handleResetIncident = () => {
    if (incidentTimerRef.current) clearTimeout(incidentTimerRef.current);
    setIncidentStep(0);
  };

  // 3D Object Click Handler
  const handleSelectComponent = (compName) => {
    if (isThermalView) return; // In thermal mode, never open side panels on click!
    setSelectedComponent(compName);
    if (compName === 'downholePump') {
      setCameraView('pump');
    } else if (compName === 'surfaceFacilities' || compName === 'wellhead') {
      setCameraView('surface');
    } else if (compName === 'wellbore' || compName === 'rodString') {
      setCameraView('wellbore');
    } else if (compName === 'reservoir' || compName === 'steamChamber') {
      setCameraView('reservoir');
    }
    onComponentClick?.(compName);
  };

  return (
    <div className="digital-twin-page-wrapper">
      <div
        ref={containerRef}
        className={`twin-3d-root-container ${isFullscreen ? 'is-fullscreen' : ''} ${className}`}
      >
      {/* Top Master Header Navigation Bar (Reference Image 1) */}
      <div className="twin-master-header-bar">
        <div className="twin-header-left">
          <button className="twin-header-menu-btn" title="Navigation Menu">
            <Menu size={18} />
          </button>
          <div className="twin-header-title-block">
            <span className="twin-header-well-title">WELL {wellId || 'DT-07'}</span>
            <span className="twin-header-status-pill">
              <span className="twin-status-dot" />
              ONLINE
            </span>
            <span className="twin-header-subtitle">Baghewala Field, Rajasthan</span>
          </div>
        </div>

        {/* Center Navigation Tabs — SOLID, X-RAY, THERMAL, WELLBORE */}
        <div className="twin-header-nav-tabs">
          {[
            { id: 'solid', label: 'SOLID' },
            { id: 'xray', label: 'X-RAY' },
            { id: 'thermal', label: 'THERMAL' },
            { id: 'wellbore', label: 'WELLBORE' }
          ].map((tab) => {
            const isTabActive = renderMode === tab.id;

            return (
              <button
                key={tab.id}
                className={`twin-header-tab-btn ${isTabActive ? 'active' : ''}`}
                onClick={() => {
                  setRenderMode(tab.id);
                  if (tab.id === 'solid') {
                    setSidebarMode('3D VIEW');
                    setCameraView('full');
                  } else if (tab.id === 'xray') {
                    setSidebarMode('FLOW SIMULATION');
                  } else if (tab.id === 'thermal') {
                    setSidebarMode('FLOW SIMULATION');
                    setCameraView('thermal');
                    setSelectedComponent(null); // Explicitly prevent borewell panel from opening!
                    setIsHudCardOpen(false);    // Ensure right-side telemetry panel is closed!
                  } else if (tab.id === 'wellbore') {
                    setSidebarMode('SCHEMATIC');
                    setCameraView('wellbore');
                    handleSelectComponent('wellbore');
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Tools & Fullscreen */}
        <div className="twin-header-right-tools">
          <button
            className="twin-header-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Thermal Response HUD Overlay with Distinct Visual Legend */}
      {isThermalView && (
        <div className="twin-thermal-hud">
          <div className="twin-thermal-hud-title">
            <span className="facility-badge-dot" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
            Thermal Depth Distribution
          </div>
          <div className="twin-thermal-hud-bar" />
          <div className="twin-thermal-hud-range">
            <span style={{ color: '#38bdf8', fontWeight: 800 }}>85°C Blue</span>
            <span style={{ opacity: 0.6 }}>➔</span>
            <span style={{ color: '#34d399', fontWeight: 800 }}>98°C Green</span>
            <span style={{ opacity: 0.6 }}>➔</span>
            <span style={{ color: '#facc15', fontWeight: 800 }}>113°C Yellow</span>
            <span style={{ opacity: 0.6 }}>➔</span>
            <span style={{ color: '#fb923c', fontWeight: 800 }}>124°C Orange</span>
            <span style={{ opacity: 0.6 }}>➔</span>
            <span style={{ color: '#f87171', fontWeight: 800 }}>130°C+ Red/White</span>
          </div>
        </div>
      )}

      {/* Borewell Thermal Simulation & Diagnostics Inspector Panel (Clean Minimal Toggle Pill) */}
      {isThermalView && (
        <div className="thermal-hud-corner-container">
          <button
            className={`thermal-hud-toggle-pill ${isThermalInspectorOpen ? 'active' : ''}`}
            onClick={() => setIsThermalInspectorOpen(!isThermalInspectorOpen)}
            title="Toggle Thermal Simulation & Diagnostics Controls"
          >
            <Flame size={14} className="thermal-fire-icon" />
            <span>Thermal Profile &amp; Controls</span>
            <span className="thermal-pill-stage">{thermalSimStage}</span>
          </button>

          {isThermalInspectorOpen && (
            <BorewellThermalInspectorCard
              wellId={wellId}
              thermalSimStage={thermalSimStage}
              onSelectThermalStage={setThermalSimStage}
              liveState={liveState}
              depthProfileData={depthProfileData}
              asphalteneData={asphalteneData}
              bottomholeTempC={activeTwinState.bottomholeTempC}
              wellheadTempC={activeTwinState.wellheadTempC}
              viscosityCp={activeTwinState.viscosityCp}
              heatedRadiusM={activeTwinState.heatedRadiusM}
              coolingRateCDay={activeTwinState.coolingRateCDay}
              onFocusCamera={(cam) => {
                setCameraView(cam);
                setSelectedComponent(null);
              }}
            />
          )}
        </div>
      )}

      {/* Top-Left Floating Surface Facilities HUD Card (Visible in Top View & Surface View) */}
      {(cameraView === 'top' || cameraView === 'aerial') ? (
        <div className="surface-facilities-hud-overlay">
          <div className="surface-facilities-hud-header">
            <span>Surface Facilities</span>
            <Eye size={13} style={{ color: '#f59e0b' }} />
          </div>
          <div className="surface-facilities-hud-list">
            {[
              { id: 'separator', label: 'Separator', icon: Box },
              { id: 'sludgeTank', label: 'Sludge Tank', icon: Layers },
              { id: 'steamPipeline', label: 'Steam Pipeline', icon: Activity },
              { id: 'powerUnit', label: 'Power Unit', icon: Zap }
            ].map((f) => {
              const Icon = f.icon;
              const isVis = facilityVisibility[f.id];
              return (
                <div
                  key={f.id}
                  className={`surface-facility-hud-row ${isVis ? 'active' : 'inactive'}`}
                  onClick={() =>
                    setFacilityVisibility((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                  }
                >
                  <Icon size={12} className="facility-hud-icon" />
                  <span className="facility-hud-label">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}



      {/* 1. Top Panoramic HUD Overlays — removed per user request */}
      {false && (
        <div className="twin-top-overlay-bar" style={{ top: '60px' }}>
          {/* Left: CSS Cycle Stage Card */}
          <div className="twin-overlay-left">
            <div className="css-stage-hud-card">
              <div className="stage-badge-header">
                <span className="stage-title">CSS LIFECYCLE MONITOR</span>
                <span
                  className="stage-pill"
                  style={{
                    background: `${CSS_STAGES[activeTwinState.cssStage]?.color || '#10b981'}22`,
                    color: CSS_STAGES[activeTwinState.cssStage]?.color || '#10b981',
                    border: `1px solid ${CSS_STAGES[activeTwinState.cssStage]?.color || '#10b981'}66`
                  }}
                >
                  <Flame size={12} />
                  CYCLE #4
                </span>
              </div>
              <div className="stage-name-main">
                {CSS_STAGES[activeTwinState.cssStage]?.name || 'Hot Production'}
              </div>
              {/* Progress Bar */}
              <div className="stage-progress-track">
                <div
                  className="stage-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((timelineDay / 72) * 100))}%`,
                    background: CSS_STAGES[activeTwinState.cssStage]?.color || '#10b981'
                  }}
                />
              </div>
              <div className="stage-timer-sub">
                <span>Day {timelineDay} / 72</span>
                <span>
                  {timelineInterpolated.daysRemaining > 0
                    ? `~${timelineInterpolated.daysRemaining}d to phase switch`
                    : 'Cycle Cut-off reached'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live KPI Cards Grid */}
          <div className="twin-overlay-right">
            <div className="kpi-hud-grid">
              {/* SOR */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">STEAM-OIL RATIO</span>
                <span className="kpi-hud-val" style={{ color: '#fed7aa' }}>
                  {activeTwinState.sor.toFixed(2)}
                </span>
                <span className="kpi-hud-unit">t/m³ steam</span>
              </div>

              {/* Oil Rate */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">OIL RATE</span>
                <span className="kpi-hud-val" style={{ color: '#38bdf8' }}>
                  {activeTwinState.oilRateBopd}
                </span>
                <span className="kpi-hud-unit">BOPD</span>
              </div>

              {/* Energy */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">ENERGY INTENSITY</span>
                <span className="kpi-hud-val" style={{ color: '#facc15' }}>
                  {activeTwinState.energyKwhBbl.toFixed(1)}
                </span>
                <span className="kpi-hud-unit">kWh/bbl</span>
              </div>

              {/* Rod Failure Risk */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">ROD RISK SCORE</span>
                <span
                  className="kpi-hud-val"
                  style={{
                    color: activeTwinState.rodFloatingRiskPct > 50 ? '#ef4444' : '#10b981'
                  }}
                >
                  {activeTwinState.rodFloatingRiskPct.toFixed(1)}%
                </span>
                <span className="kpi-hud-unit">
                  {activeTwinState.rodFloatingRiskPct > 50 ? 'CRITICAL' : 'SAFE'}
                </span>
              </div>

              {/* Pump Fillage */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">PUMP FILLAGE</span>
                <span className="kpi-hud-val" style={{ color: '#34d399' }}>
                  {activeTwinState.pumpFillagePct.toFixed(0)}%
                </span>
                <span className="kpi-hud-unit">Vol. Efficiency</span>
              </div>

              {/* Crude Viscosity */}
              <div className="kpi-hud-tile">
                <span className="kpi-hud-lbl">VISCOSITY (T)</span>
                <span className="kpi-hud-val" style={{ color: '#fb923c' }}>
                  {activeTwinState.viscosityCp.toLocaleString()}
                </span>
                <span className="kpi-hud-unit">cP @ {activeTwinState.currentTempC.toFixed(0)}°C</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Three.js R3F Canvas */}
      <div className="twin-3d-canvas-wrapper">
        <Canvas
          shadows
          camera={{ position: [8.5, -4.5, 20.0], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05
          }}
          onCreated={({ gl, scene, camera }) => {
            window.__scene = scene;
            window.__camera = camera;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            const canvasEl = gl.domElement;
            const onContextLost = (e) => {
              e.preventDefault();
              console.warn('[WebGL] Context lost detected. Calling preventDefault() to allow auto-recovery.');
            };
            const onContextRestored = () => {
              console.info('[WebGL] Context restored successfully.');
            };
            canvasEl.addEventListener('webglcontextlost', onContextLost, false);
            canvasEl.addEventListener('webglcontextrestored', onContextRestored, false);
          }}
        >
          {/* Canvas renders with transparent alpha against CSS vintage desert background */}
          <fog attach="fog" args={['#dfd7ca', 90, 180]} />

          <PerspectiveCamera makeDefault position={[2.8, -6.0, 24.0]} fov={38} />
          <CameraController cameraView={cameraView} />
          
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.06}
            enableZoom={true}
            enablePan={true}
            minDistance={2.0}
            maxDistance={55.0}
            minAzimuthAngle={0}
            maxAzimuthAngle={0}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI * 0.72}
            minTargetY={-7.5}
            maxTargetY={2.0}
          />

          {/* Lighting Rig - Balanced Desert Sun + Front Studio Key & Fill for Brushed Steel */}
          <ambientLight intensity={1.10} color="#f8fafc" />
          {/* Main directional sun casting crisp shadows */}
          <directionalLight
            position={[-14, 18, 14]}
            intensity={1.85}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
            color="#fff8f0"
          />
          {/* Front key light illuminating steel sheen & specular reflections facing camera */}
          <directionalLight
            position={[8, 12, 22]}
            intensity={1.25}
            color="#eef6ff"
          />
          {/* Soft subsurface up-fill light for wellbore & pump details */}
          <directionalLight
            position={[0, -8, 16]}
            intensity={0.75}
            color="#dbeafe"
          />
          
          {/* Subsurface Rim & Thermal Lights */}
          <pointLight position={[2.8, -11.5, 2.0]} intensity={2.8} distance={14} color="#ea580c" />
          <pointLight position={[2.8, -5.0, 3.0]} intensity={1.2} distance={10} color="#0284c7" />
          <pointLight position={[3.0, -9.4, 2.6]} intensity={0.6} distance={8} color="#fed7aa" />
          <pointLight position={[-1.4, -9.4, 2.2]} intensity={0.5} distance={7} color="#fde68a" />

          {/* 3D Model Components (Top to Bottom) */}
          {/* 0. Layered Geological Cross-Section Strata */}
          <GeologicalCrossSection
            cssStage={activeTwinState.cssStage}
            currentTempC={activeTwinState.currentTempC}
            cameraView={cameraView}
            isThermalView={isThermalView}
          />

          {/* 1. Surface Level: Procedural Desert Ground Terrain */}
          <DesertGroundTerrain cameraView={cameraView} />

          {/* 2. Surface Facilities: Well Pad, Cellar Pit, Separator, Sludge Tank, Power Unit, Steam Manifold */}
          <SurfaceFacilities3D
            cameraView={cameraView}
            facilityVisibility={facilityVisibility}
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
            isThermalView={isThermalView}
            showLabels={!['wellbore', 'pump', 'reservoir'].includes(cameraView)}
            hideRightLabels={isHudCardOpen}
            hideTopLabels={true}
          />

          {/* 3. Surface Level: Articulated Pumpjack & VFD Panel (Elevated on Citadel Deck) */}
          <group position={[0, 0.85, 0]}>
            <PumpjackSurface3D
              spm={activeTwinState.spm}
              vfdHz={activeTwinState.vfdHz}
              strokeLengthM={activeTwinState.strokeLengthM}
              isOperating={activeTwinState.isOperating}
              isRodFloating={activeTwinState.isRodFloating}
              rodLagFactor={activeTwinState.rodLagFactor}
              onSelectComponent={handleSelectComponent}
              selectedComponent={selectedComponent}
              showLabels={!['wellbore', 'pump', 'reservoir'].includes(cameraView)}
            />
          </group>

          {/* 4. Wellbore: Transparent Casing, Modular Completion String, Sucker Rods, Pump Valves, Fluid Flows */}
          <Wellbore3D
            spm={activeTwinState.spm}
            strokeLengthM={activeTwinState.strokeLengthM}
            viscosityCp={activeTwinState.viscosityCp}
            rodFloatingRiskPct={activeTwinState.rodFloatingRiskPct}
            pprlKn={activeTwinState.pprlKn}
            mprlKn={activeTwinState.mprlKn}
            oilRateBopd={activeTwinState.oilRateBopd}
            steamRateBpd={activeTwinState.steamRateBpd}
            pumpFillagePct={activeTwinState.pumpFillagePct}
            cssStage={activeTwinState.cssStage}
            currentTempC={activeTwinState.currentTempC}
            bottomholeTempC={activeTwinState.bottomholeTempC}
            wellheadTempC={activeTwinState.wellheadTempC}
            baseReservoirTempC={FIELD_SPECS.baseReservoirTempC}
            heatedRadiusM={activeTwinState.heatedRadiusM}
            coolingRateCDay={activeTwinState.coolingRateCDay}
            depthProfileData={depthProfileData}
            pipeViewMode={pipeViewMode}
            renderMode={renderMode}
            isThermalView={isThermalView}
            isOperating={activeTwinState.isOperating}
            isRodFloating={activeTwinState.isRodFloating}
            rodLagFactor={activeTwinState.rodLagFactor}
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
            cameraView={cameraView}
          />

          {/* 5. Reservoir Zone: Jodhpur Sandstone & Thermal Diffusion Particles */}
          <ReservoirZone3D
            currentTempC={activeTwinState.currentTempC}
            baseReservoirTempC={FIELD_SPECS.baseReservoirTempC}
            heatedRadiusM={activeTwinState.heatedRadiusM}
            cssStage={activeTwinState.cssStage}
            oilRateBopd={activeTwinState.oilRateBopd}
            pipeViewMode={pipeViewMode}
            isThermalView={isThermalView}
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
            cameraView={cameraView}
          />

          {/* Post-Processing: SSAO Contact Shadowing + Subtle Bloom */}
          <EffectComposer multisampling={0}>
            <N8AO
              aoRadius={1.5}
              intensity={2.0}
              distanceFalloff={0.6}
              quality="medium"
            />
            <Bloom
              intensity={0.35}
              luminanceThreshold={0.75}
              luminanceSmoothing={0.25}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>

        {/* Compass Rose Widget (Top Right) */}
        {(cameraView === 'top' || cameraView === 'surface' || cameraView === 'aerial') && (
          <div className="twin-compass-widget">
            <div className="twin-compass-dial">
              <span className="twin-compass-lbl n">N</span>
              <span className="twin-compass-lbl s">S</span>
              <span className="twin-compass-lbl e">E</span>
              <span className="twin-compass-lbl w">W</span>
              <div className="twin-compass-needle" />
            </div>
          </div>
        )}

      </div>

      {/* 3. Right-side Transparent Well Telemetry & Diagnostics Card (Hidden in Thermal Mode) */}
      {!isThermalView && (
        <WellTelemetryHUDCard
          wellName={wellId || "WELL DT-07"}
          padName="Baghewala Field, Rajasthan"
          formation="Jodhpur Sandstone (Proterozoic)"
          depthM={1048}
          pattern="5-Spot Inverted Thermal Pattern"
          gps="27.5445°N, 71.9145°E"
          isOpen={isHudCardOpen}
          onClose={() => setIsHudCardOpen(false)}
          onTargetClick={() => {
            setCameraView('wellbore');
            handleSelectComponent('wellbore');
          }}
          liveData={{
            ...activeTwinState,
            cssCycle: 'CYCLE #4',
            cssStageName: CSS_STAGES[activeTwinState.cssStage]?.name || 'Mid-Cycle Production',
            timelineDay: timelineDay,
            timelineTotalDays: 72,
            daysRemaining: timelineInterpolated.daysRemaining > 0 ? timelineInterpolated.daysRemaining : 20,
            sor: activeTwinState.sor,
            oilRateBopd: activeTwinState.oilRateBopd,
            grossBfpd: Math.round(activeTwinState.oilRateBopd * 1.62),
            energyKwhBbl: activeTwinState.energyKwhBbl,
            rodRiskPct: activeTwinState.rodFloatingRiskPct,
            pumpFillagePct: activeTwinState.pumpFillagePct,
            viscosityCp: activeTwinState.viscosityCp,
            currentTempC: activeTwinState.currentTempC,
            spm: activeTwinState.spm,
            vfdHz: activeTwinState.vfdHz,
            strokeLengthIn: activeTwinState.strokeLengthIn,
            pprlKn: activeTwinState.pprlKn,
            mprlKn: activeTwinState.mprlKn,
            bhpBar: 48.3,
            drawdownBar: 35.9,
            casingHeadBar: 12.4,
            tubingBar: 8.6,
            steamHaloM: activeTwinState.heatedRadiusM || 85,
            cumOilBbls: '14,150',
            cumSteamBbls: '24,300',
            ratingFactorPct: 72,
            motorTorquePct: 68
          }}
        />
      )}

      {/* 4. Interactive Physics Inspector Side Panel (Hidden in Thermal Mode) */}
      {!isThermalView && (
        <PhysicsSidePanel
          selectedComponent={selectedComponent}
          onClose={() => setSelectedComponent(null)}
          liveData={activeTwinState}
        />
      )}

      {/* 5. Bottom Telemetry Sparklines Strip (matching reference image) */}
      {(cameraView === 'top' || cameraView === 'surface' || cameraView === 'aerial') && (
        <div className="twin-bottom-telemetry-bar">
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Pump Speed</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">{activeTwinState.spm.toFixed(1)}</span>
              <span className="telemetry-spark-unit">SPM</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 5 Q 12 1, 25 6 T 50 4" fill="none" stroke="#c2410c" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Polished Rod Load</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">{activeTwinState.pprlKn.toFixed(1)}</span>
              <span className="telemetry-spark-unit">kN</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 6 L 10 3 L 20 8 L 30 2 L 40 7 L 50 4" fill="none" stroke="#dc2626" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Tubing Pressure</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">12.4</span>
              <span className="telemetry-spark-unit">MPa</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 4 Q 15 8, 30 3 T 50 5" fill="none" stroke="#e11d48" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Casing Pressure</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">1.8</span>
              <span className="telemetry-spark-unit">MPa</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 7 L 12 4 L 25 8 L 38 3 L 50 6" fill="none" stroke="#475569" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Steam Temperature</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">215</span>
              <span className="telemetry-spark-unit">°C</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 5 Q 12 2, 25 7 T 50 4" fill="none" stroke="#ea580c" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Bottom-hole Temp</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">248</span>
              <span className="telemetry-spark-unit">°C</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 6 L 15 3 L 30 7 L 45 2 L 50 5" fill="none" stroke="#be123c" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Steam Injection</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">4.2</span>
              <span className="telemetry-spark-unit">t/h</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 5 Q 15 9, 30 3 T 50 6" fill="none" stroke="#9f1239" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="telemetry-spark-tile">
            <span className="telemetry-spark-lbl">Oil Production</span>
            <div className="telemetry-spark-val-row">
              <span className="telemetry-spark-val">38.6</span>
              <span className="telemetry-spark-unit">m³/d</span>
            </div>
            <svg className="telemetry-mini-svg" viewBox="0 0 50 10">
              <path d="M 0 4 L 12 7 L 25 2 L 38 8 L 50 5" fill="none" stroke="#e11d48" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}
    </div>

    {/* =========================================================================
       PAGE BELOW 3D SIMULATION: DYNAMOMETER GRAPH & SIMULATION DETAILS DASHBOARD
       ========================================================================= */}
    <div className="twin-below-simulation-dashboard">
      <div className="twin-below-header-bar">
        <div className="twin-below-title-wrap">
          <h3 className="twin-below-section-title">
            <Activity size={18} style={{ color: '#e11d48' }} />
            Real-Time Dynamometer Diagnostics &amp; Multiphysics Incident Simulation
          </h3>
          <span className="twin-below-section-subtitle">
            Surface &amp; downhole Gibbs wave dynamometer loop, real-time kinematic rod tracking, and closed-loop incident mitigation
          </span>
        </div>
      </div>

      <div className="twin-below-main-grid">
        {/* Panel 1: Real-Time Dynamometer Card */}
        <div className="below-panel-card">
          <div className="below-panel-header">
            <span className="below-panel-title">
              <Gauge size={15} style={{ color: '#b43403' }} />
              Real-Time Dyno Card Telemetry
            </span>
            <span
              style={{
                background: activeTwinState.isRodFloating ? 'rgba(153, 27, 27, 0.12)' : 'rgba(20, 83, 45, 0.12)',
                color: activeTwinState.isRodFloating ? '#991b1b' : '#14532d',
                border: `1px solid ${activeTwinState.isRodFloating ? 'rgba(153, 27, 27, 0.35)' : 'rgba(20, 83, 45, 0.35)'}`,
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}
            >
              {activeTwinState.isRodFloating ? 'ROD FLOATING DETECTED' : 'NORMAL FULL FILLAGE'}
            </span>
          </div>

          <div className="dyno-graph-centered-wrap">
            <DynoCardMini
              surfacePoints={dynoData?.surface_card_points}
              spm={activeTwinState.spm}
              strokeLengthIn={activeTwinState.strokeLengthIn}
              pprlKn={activeTwinState.pprlKn}
              mprlKn={activeTwinState.mprlKn}
              pumpFillagePct={activeTwinState.pumpFillagePct}
              rodFloatingRiskPct={activeTwinState.rodFloatingRiskPct}
              currentStrokePosIn={kinematicPosIn}
              currentLoadKn={kinematicLoadKn}
              isRodFloating={activeTwinState.isRodFloating}
              width={420}
              height={220}
            />
          </div>

          <div className="dyno-metrics-summary-bar">
            <div className="dyno-metric-item">
              <span className="dyno-metric-lbl">Peak Load (PPRL)</span>
              <span className="dyno-metric-val">{activeTwinState.pprlKn.toFixed(1)} kN</span>
            </div>
            <div className="dyno-metric-item">
              <span className="dyno-metric-lbl">Min Load (MPRL)</span>
              <span
                className="dyno-metric-val"
                style={{ color: activeTwinState.mprlKn < 12 ? '#dc2626' : '#92400e' }}
              >
                {activeTwinState.mprlKn.toFixed(1)} kN
              </span>
            </div>
            <div className="dyno-metric-item">
              <span className="dyno-metric-lbl">Pump Fillage</span>
              <span className="dyno-metric-val">{activeTwinState.pumpFillagePct.toFixed(0)}%</span>
            </div>
            <div className="dyno-metric-item">
              <span className="dyno-metric-lbl">Operating SPM</span>
              <span className="dyno-metric-val">{activeTwinState.spm.toFixed(1)} SPM</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Simulation Details & Multiphysics Incident Controls */}
        <div className="below-panel-card">
          <div className="below-panel-header">
            <span className="below-panel-title">
              <Flame size={15} style={{ color: '#b43403' }} />
              Subsurface Multiphysics &amp; Incident Simulation
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: incidentStep > 0 ? '#991b1b' : '#6b5742'
              }}
            >
              {incidentStep === 0 ? 'Status: Standby / Normal' : `Simulation Step ${incidentStep} of 5 Active`}
            </span>
          </div>

          <div className="simulation-incident-box">
            <IncidentSimulatorBanner
              simulationStep={incidentStep}
              onStartSimulation={handleStartIncidentSimulation}
              onResetSimulation={handleResetIncident}
              onApplyRemediation={handleApplyRemediation}
            />
          </div>

          <div className="simulation-physics-grid">
            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">RESERVOIR TEMPERATURE</span>
              <span className="sim-physics-card-val text-rose">
                {activeTwinState.currentTempC.toFixed(1)} °C
              </span>
              <span className="sim-physics-card-sub">Baseline: 42.0 °C (Δ +{(activeTwinState.currentTempC - 42).toFixed(1)} °C)</span>
            </div>

            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">IN-SITU VISCOSITY</span>
              <span className="sim-physics-card-val text-ruby">
                {activeTwinState.viscosityCp.toLocaleString()} cP
              </span>
              <span className="sim-physics-card-sub">
                {activeTwinState.viscosityCp > 5000 ? 'Surging Viscous Drag' : '12.8x Mobility Boost'}
              </span>
            </div>

            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">ROD KINEMATICS</span>
              <span className="sim-physics-card-val text-dark">
                {kinematicPosIn.toFixed(1)}" / {kinematicLoadKn.toFixed(1)} kN
              </span>
              <span className="sim-physics-card-sub">Stroke: {activeTwinState.strokeLengthIn}"</span>
            </div>

            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">ROD FLOATING RISK</span>
              <span
                className="sim-physics-card-val"
                style={{
                  color: activeTwinState.rodFloatingRiskPct > 50 ? '#dc2626' : activeTwinState.rodFloatingRiskPct > 25 ? '#c2410c' : '#475569'
                }}
              >
                {activeTwinState.rodFloatingRiskPct.toFixed(1)}%
              </span>
              <span className="sim-physics-card-sub">
                {activeTwinState.rodFloatingRiskPct > 50 ? 'Immediate Derate Recommended' : 'Nominal Fall Velocity'}
              </span>
            </div>

            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">BOTTOMHOLE PRESSURE (BHP)</span>
              <span className="sim-physics-card-val text-crimson">
                48.3 bar
              </span>
              <span className="sim-physics-card-sub">Drawdown: 35.9 bar • Casing: 12.4 bar</span>
            </div>

            <div className="sim-physics-card">
              <span className="sim-physics-card-lbl">VFD DRIVE &amp; REMEDIATION</span>
              <span className="sim-physics-card-val text-terracotta">
                {activeTwinState.vfdHz.toFixed(1)} Hz
              </span>
              <span className="sim-physics-card-sub">
                {incidentStep >= 4 ? 'Remediation VFD Derate Active' : 'Standard 18.5 kW Frequency'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
