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
  ChevronLeft,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';

import PumpjackSurface3D from './PumpjackSurface3D';
import SurfaceFacilities3D from './SurfaceFacilities3D';
import DesertGroundTerrain from './DesertGroundTerrain';
import Wellbore3D from './Wellbore3D';
import ReservoirZone3D from './ReservoirZone3D';
import GeologicalCrossSection from './GeologicalCrossSection';
import DynoCardMini from './DynoCardMini';
import PhysicsSidePanel from './PhysicsSidePanel';
import IncidentSimulatorBanner from './IncidentSimulatorBanner';
import TimelineScrubber from './TimelineScrubber';
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
 * Sequential Underground Depth Navigation Levels
 */
export const DEPTH_LEVELS = [
  {
    level: 1,
    depthM: 0.0,
    depthFt: 0,
    title: 'Surface Facilities & Wellhead',
    cameraPos: [7.2, 5.8, 14.5],
    lookTarget: [1.8, 0.4, 0],
    viewKey: 'top_front'
  },
  {
    level: 2,
    depthM: -1.8,
    depthFt: 5.9,
    title: 'Desert Sands & Cellar Pit',
    cameraPos: [4.8, -1.8, 6.5],
    lookTarget: [2.8, -1.8, 0],
    viewKey: 'cellar'
  },
  {
    level: 3,
    depthM: -4.2,
    depthFt: 13.8,
    title: 'Intermediate 7" Casing & Cement Seal',
    cameraPos: [5.2, -4.2, 6.8],
    lookTarget: [2.8, -4.2, 0],
    viewKey: 'casing'
  },
  {
    level: 4,
    depthM: -5.8,
    depthFt: 19.0,
    title: 'Inside Alloy Steel Pipe',
    cameraPos: [3.3, -5.8, 2.2],
    lookTarget: [2.8, -5.8, 0],
    viewKey: 'inside_pipe'
  },
  {
    level: 5,
    depthM: -9.4,
    depthFt: 30.8,
    title: 'Downhole Pump & Valves',
    cameraPos: [4.2, -9.42, 3.4],
    lookTarget: [2.8, -9.42, 0],
    viewKey: 'pump'
  },
  {
    level: 6,
    depthM: -11.2,
    depthFt: 36.7,
    title: 'Jodhpur Sandstone Payzone',
    cameraPos: [5.4, -11.5, 6.2],
    lookTarget: [2.8, -11.5, 0],
    viewKey: 'reservoir'
  }
];

/**
 * Camera Controller with Strict Vertical Polar Lock & Smooth Interpolation
 */
function CameraController({ cameraView, depthLevel }) {
  const { camera, controls } = useThree();

  // Strict Vertical Polar Lock in useFrame
  useFrame(() => {
    if (controls) {
      const maxAllowed = Math.PI / 2 - 0.04; // ~87.7° (Strictly above horizontal)
      const minAllowed = 0.05;
      if (controls.maxPolarAngle > maxAllowed) {
        controls.maxPolarAngle = maxAllowed;
      }
      if (controls.minPolarAngle < minAllowed) {
        controls.minPolarAngle = minAllowed;
      }
    }
  });

  useEffect(() => {
    let targetPos = [7.2, 5.8, 14.5]; // Default Top Front elevated view
    let lookTarget = [1.8, 0.4, 0];

    // Check if view matches a depth level
    const foundLevel = DEPTH_LEVELS.find((l) => l.viewKey === cameraView || l.level === depthLevel);

    switch (cameraView) {
      case 'top_front':
        targetPos = [7.2, 5.8, 14.5];
        lookTarget = [1.8, 0.4, 0];
        break;
      case 'surface':
        targetPos = [4.8, 3.2, 8.2];
        lookTarget = [1.2, 1.4, 0];
        break;
      case 'wellbore':
        targetPos = [5.5, -5.5, 8.5];
        lookTarget = [2.2, -5.8, 0];
        break;
      case 'inside_pipe':
        targetPos = [3.3, -5.8, 2.2];
        lookTarget = [2.8, -5.8, 0];
        break;
      case 'pump':
        targetPos = [4.2, -9.42, 3.4];
        lookTarget = [2.8, -9.42, 0];
        break;
      case 'reservoir':
        targetPos = [5.4, -11.5, 6.2];
        lookTarget = [2.8, -11.5, 0];
        break;
      case 'full':
        targetPos = [3.5, -6.5, 29.5];
        lookTarget = [2.0, -6.5, 0];
        break;
      default:
        if (foundLevel) {
          targetPos = foundLevel.cameraPos;
          lookTarget = foundLevel.lookTarget;
        }
        break;
    }

    camera.position.set(...targetPos);
    if (controls) {
      controls.target.set(...lookTarget);
      controls.maxPolarAngle = Math.PI / 2 - 0.04;
      controls.minPolarAngle = 0.05;
      controls.update();
    } else {
      camera.lookAt(...lookTarget);
    }
  }, [cameraView, depthLevel, camera, controls]);

  return null;
}

/**
 * Master 3D Well-to-Surface Digital Twin Container Component
 */
export default function WellDigitalTwin3D({
  wellId = 'B-17',
  onComponentClick,
  className = ''
}) {
  // 1. Camera Viewpoint State - Default to 'top_front'
  const [cameraView, setCameraView] = useState('top_front');
  const [depthLevelIndex, setDepthLevelIndex] = useState(0); // Level 1 (index 0)
  const [selectedComponent, setSelectedComponent] = useState(null);

  // 1b. Completion String Render Mode: Solid ("3D VIEW") vs X-Ray ("FLOW SIMULATION")
  const [sidebarMode, setSidebarMode] = useState('3D VIEW');
  const pipeViewMode = sidebarMode === 'FLOW SIMULATION' || cameraView === 'inside_pipe' ? 'xray' : 'solid';

  // 2. Timeline Playback & Scrubber State
  const [timelineDay, setTimelineDay] = useState(37);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // 3. Rod Float Incident Simulation Sequence State
  const [incidentStep, setIncidentStep] = useState(0);
  const incidentTimerRef = useRef(null);

  // 4. Live Backend Data vs Fallback State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveState, setLiveState] = useState(null);
  const [dynoData, setDynoData] = useState(null);
  const [failureData, setFailureData] = useState(null);

  // Real-time kinematic stroke tracker
  const [kinematicPosIn, setKinematicPosIn] = useState(36.0);
  const [kinematicLoadKn, setKinematicLoadKn] = useState(45.0);

  // Sequential Step-by-Step Depth Navigation Handlers
  const handleDescend = useCallback(() => {
    setDepthLevelIndex((prev) => {
      const nextIdx = Math.min(DEPTH_LEVELS.length - 1, prev + 1);
      const nextLevel = DEPTH_LEVELS[nextIdx];
      setCameraView(nextLevel.viewKey);
      return nextIdx;
    });
  }, []);

  const handleAscend = useCallback(() => {
    setDepthLevelIndex((prev) => {
      const nextIdx = Math.max(0, prev - 1);
      const nextLevel = DEPTH_LEVELS[nextIdx];
      setCameraView(nextLevel.viewKey);
      return nextIdx;
    });
  }, []);

  // Keyboard navigation: Left/A to descend, Right/D to ascend
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleDescend();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleAscend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDescend, handleAscend]);

  // 5. Fetch Live Data from Backend API
  const fetchLiveData = useCallback(async () => {
    try {
      const [stateRes, dynoRes, riskRes] = await Promise.all([
        fetch(API_ENDPOINTS.DIGITAL_TWIN_STATE(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.DYNO_CARD(wellId)).catch(() => null),
        fetch(API_ENDPOINTS.FAILURE_RISK(wellId)).catch(() => null)
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
    } catch (err) {
      setIsLiveConnected(false);
    }
  }, [wellId]);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 2500);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // 6. WebSocket Telemetry Stream
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

  // Synthesize Active Digital Twin State
  const activeTwinState = useMemo(() => {
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

    // Apply Incident Overrides
    let isRodFloating = false;
    let rodLagFactor = 0.0;

    if (incidentStep === 1) {
      tempC = 52.0;
    } else if (incidentStep === 2) {
      tempC = 50.0;
      viscosityCp = 9200;
      mprlKn = 11.0;
      pprlKn = 78.5;
    } else if (incidentStep === 3) {
      tempC = 48.5;
      viscosityCp = 9600;
      mprlKn = 4.8;
      pprlKn = 84.0;
      rodRiskPct = 88.0;
      isRodFloating = true;
      rodLagFactor = 0.55;
    } else if (incidentStep === 4) {
      spm = 2.4;
      vfdHz = 24.0;
      mprlKn = 14.2;
      rodRiskPct = 35.0;
      isRodFloating = true;
      rodLagFactor = 0.2;
    } else if (incidentStep === 5) {
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
  }, [isLiveConnected, liveState, failureData, timelineInterpolated, incidentStep]);

  // Incident Simulation Handlers
  const handleStartIncidentSimulation = () => {
    setIncidentStep(1);
    if (incidentTimerRef.current) clearTimeout(incidentTimerRef.current);
    incidentTimerRef.current = setTimeout(() => {
      setIncidentStep(2);
      incidentTimerRef.current = setTimeout(() => {
        setIncidentStep(3);
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
    setSelectedComponent(compName);
    if (compName === 'downholePump') {
      setCameraView('pump');
      setDepthLevelIndex(4);
    } else if (compName === 'surfaceFacilities' || compName === 'wellhead') {
      setCameraView('surface');
      setDepthLevelIndex(0);
    } else if (compName === 'wellbore' || compName === 'rodString') {
      setCameraView('inside_pipe');
      setDepthLevelIndex(3);
    } else if (compName === 'reservoir' || compName === 'steamChamber') {
      setCameraView('reservoir');
      setDepthLevelIndex(5);
    }
    onComponentClick?.(compName);
  };

  const currentLevelObj = DEPTH_LEVELS[depthLevelIndex] || DEPTH_LEVELS[0];

  return (
    <div className={`twin-3d-root-container ${className}`}>
      {/* 0. Floating Mode & Component Sidebar */}
      <div className="twin-floating-left-sidebar">
        <div className="twin-well-status-card">
          <div className="twin-well-title-row">
            <span className="twin-well-code">WELL DT-07</span>
            <span className="twin-well-status-badge">
              <span className="twin-online-dot" />
              ONLINE
            </span>
          </div>
          <div className="twin-well-subtext">Baghewala Field, Rajasthan</div>
        </div>

        <div className="twin-sidebar-menu-card">
          {[
            { id: '3D VIEW', label: '3D VIEW', icon: Box, mode: 'solid' },
            { id: 'LAYER VIEW', label: 'LAYER VIEW', icon: Layers, mode: 'solid' },
            { id: 'TEMPERATURE', label: 'TEMPERATURE', icon: Thermometer, mode: 'solid' },
            { id: 'PRESSURE', label: 'PRESSURE', icon: Gauge, mode: 'solid' },
            { id: 'FLOW SIMULATION', label: 'FLOW SIMULATION', icon: Activity, mode: 'xray' },
            { id: 'ISOLATION', label: 'ISOLATION', icon: Target, mode: 'solid' }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = sidebarMode === item.id;
            return (
              <button
                key={item.id}
                className={`twin-sidebar-item-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarMode(item.id)}
              >
                <Icon size={13} className="twin-sidebar-icon" />
                <span>{item.label}</span>
                {item.id === '3D VIEW' && (
                  <span className="twin-mode-tag">SOLID</span>
                )}
                {item.id === 'FLOW SIMULATION' && (
                  <span className="twin-mode-tag xray">X-RAY</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="twin-sidebar-components-card">
          {[
            { id: 'surfaceFacilities', label: 'Surface Facilities' },
            { id: 'wellhead', label: 'Wellhead' },
            { id: 'wellbore', label: 'Alloy Tubing' },
            { id: 'rodString', label: 'Rod String' },
            { id: 'downholePump', label: 'Downhole Pump' },
            { id: 'steamChamber', label: 'Steam Chamber' },
            { id: 'reservoir', label: 'Heavy Oil Zone' }
          ].map((comp) => (
            <div
              key={comp.id}
              className={`twin-comp-item ${selectedComponent === comp.id ? 'selected' : ''}`}
              onClick={() => handleSelectComponent(comp.id)}
            >
              <span>{comp.label}</span>
              <Eye size={11} className="twin-eye-icon" />
            </div>
          ))}
        </div>
      </div>

      {/* 1. Top Panoramic HUD Overlays */}
      <div className="twin-top-overlay-bar">
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

        {/* Center: Camera Viewpoint Controls (TOP VIEW REMOVED; TOP FRONT DEFAULT) */}
        <div className="camera-preset-toolbar">
          <button
            className={`camera-preset-btn ${cameraView === 'top_front' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('top_front');
              setDepthLevelIndex(0);
            }}
          >
            Top Front View
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'full' ? 'active' : ''}`}
            onClick={() => setCameraView('full')}
          >
            Full Twin
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'surface' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('surface');
              setDepthLevelIndex(0);
            }}
          >
            Surface Pumpjack
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'wellbore' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('wellbore');
              setDepthLevelIndex(2);
            }}
          >
            Wellbore &amp; Rods
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'inside_pipe' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('inside_pipe');
              setDepthLevelIndex(3);
            }}
          >
            Inside Alloy Pipe
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'pump' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('pump');
              setDepthLevelIndex(4);
            }}
          >
            Downhole Pump
          </button>
          <button
            className={`camera-preset-btn ${cameraView === 'reservoir' ? 'active' : ''}`}
            onClick={() => {
              setCameraView('reservoir');
              setDepthLevelIndex(5);
            }}
          >
            Reservoir Zone
          </button>
        </div>

        {/* Right: Live KPI Cards Grid */}
        <div className="twin-overlay-right">
          <div className="kpi-hud-grid">
            <div className="kpi-hud-tile">
              <span className="kpi-hud-lbl">STEAM-OIL RATIO</span>
              <span className="kpi-hud-val" style={{ color: '#fed7aa' }}>
                {activeTwinState.sor.toFixed(2)}
              </span>
              <span className="kpi-hud-unit">t/m³ steam</span>
            </div>

            <div className="kpi-hud-tile">
              <span className="kpi-hud-lbl">OIL RATE</span>
              <span className="kpi-hud-val" style={{ color: '#38bdf8' }}>
                {activeTwinState.oilRateBopd}
              </span>
              <span className="kpi-hud-unit">BOPD</span>
            </div>

            <div className="kpi-hud-tile">
              <span className="kpi-hud-lbl">ENERGY INTENSITY</span>
              <span className="kpi-hud-val" style={{ color: '#facc15' }}>
                {activeTwinState.energyKwhBbl.toFixed(1)}
              </span>
              <span className="kpi-hud-unit">kWh/bbl</span>
            </div>

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

            <div className="kpi-hud-tile">
              <span className="kpi-hud-lbl">PUMP FILLAGE</span>
              <span className="kpi-hud-val" style={{ color: '#34d399' }}>
                {activeTwinState.pumpFillagePct.toFixed(0)}%
              </span>
              <span className="kpi-hud-unit">Vol. Efficiency</span>
            </div>

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

      {/* 2. Main Three.js R3F Canvas */}
      <div className="twin-3d-canvas-wrapper">
        <Canvas
          shadows
          camera={{ position: [7.2, 5.8, 14.5], fov: 42 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          {/* Cream Sandstone 3D Background */}
          <color attach="background" args={['#dfd7ca']} />
          <fog attach="fog" args={['#dfd7ca', 24, 44]} />

          <PerspectiveCamera makeDefault position={[7.2, 5.8, 14.5]} fov={42} />
          <CameraController cameraView={cameraView} depthLevel={currentLevelObj.level} />
          
          {/* Strict Vertical Polar Angle Lock (Max ~87.7° to eliminate bottom void completely) */}
          <OrbitControls
            makeDefault
            target={[1.8, 0.4, 0]}
            enableDamping
            dampingFactor={0.06}
            minDistance={2.5}
            maxDistance={42.0}
            maxPolarAngle={Math.PI / 2 - 0.04}
            minPolarAngle={0.05}
          />

          {/* Lighting Rig - Desert Sunlight + Ambient + Subsurface Lights */}
          <ambientLight intensity={0.75} color="#fffcf5" />
          <directionalLight
            position={[-16, 12, 10]}
            intensity={2.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
            color="#fff5e6"
          />
          <directionalLight
            position={[16, -2, 8]}
            intensity={0.55}
            color="#9cbcd6"
          />
          
          <pointLight position={[2.8, -11.5, 2.0]} intensity={3.5} distance={14} color="#ea580c" />
          <pointLight position={[2.8, -5.0, 3.0]} intensity={1.5} distance={10} color="#0284c7" />
          <pointLight position={[3.0, -9.4, 2.6]} intensity={3.5} distance={9} color="#ffffff" />
          <pointLight position={[-1.4, -9.4, 2.2]} intensity={1.8} distance={7} color="#e2e8f0" />

          {/* 0. Layered Geological Cross-Section Strata */}
          <GeologicalCrossSection
            cssStage={activeTwinState.cssStage}
            currentTempC={activeTwinState.currentTempC}
            cameraView={cameraView}
          />

          {/* 1. Desert Ground Terrain & Cellar Pit */}
          <DesertGroundTerrain
            wellboreX={2.8}
            cellarDepth={1.8}
          />

          {/* 2. Surface Facilities (Separator, Sludge Tank, Steam Header) */}
          <SurfaceFacilities3D
            oilRateBopd={activeTwinState.oilRateBopd}
            steamRateBpd={activeTwinState.steamRateBpd}
            currentTempC={activeTwinState.currentTempC}
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
          />

          {/* 3. Surface Level: Articulated Pumpjack & VFD Panel */}
          <PumpjackSurface3D
            spm={activeTwinState.spm}
            vfdHz={activeTwinState.vfdHz}
            strokeLengthM={activeTwinState.strokeLengthM}
            isOperating={activeTwinState.isOperating}
            isRodFloating={activeTwinState.isRodFloating}
            rodLagFactor={activeTwinState.rodLagFactor}
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
          />

          {/* 4. Wellbore: Casing, Alloy Steel Tubing, Sucker Rods, Pump Valves, Fluid Flows */}
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
            pipeViewMode={pipeViewMode}
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
            onSelectComponent={handleSelectComponent}
            selectedComponent={selectedComponent}
          />

          {/* Post-Processing */}
          <EffectComposer multisampling={0}>
            <N8AO
              aoRadius={0.8}
              intensity={2.2}
              color="#1a1410"
              quality="medium"
              distanceFalloff={0.6}
            />
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.70}
              luminanceSmoothing={0.3}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* 2b. Floating Glassmorphic Sequential Depth Navigation HUD Pill */}
      <div className="twin-depth-nav-hud-pill">
        <button
          className="depth-nav-arrow-btn"
          onClick={handleDescend}
          disabled={depthLevelIndex >= DEPTH_LEVELS.length - 1}
          title="Descend Step-by-Step (Press Left Arrow / A)"
        >
          <ChevronLeft size={14} />
          <span>[◀ Left / A] Descend</span>
        </button>

        <div className="depth-nav-info">
          <div className="depth-nav-badge">
            LEVEL {currentLevelObj.level} / {DEPTH_LEVELS.length}
          </div>
          <div className="depth-nav-title">
            <span>{currentLevelObj.title}</span>
            <span className="depth-nav-meters">({currentLevelObj.depthM.toFixed(1)}m)</span>
          </div>
        </div>

        <button
          className="depth-nav-arrow-btn"
          onClick={handleAscend}
          disabled={depthLevelIndex <= 0}
          title="Ascend Step-by-Step (Press Right Arrow / D)"
        >
          <span>Ascend [Right / D ▶]</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* 3. Bottom-Left Dock: Mini Dynamometer Card HUD */}
      <div className="twin-bottom-left-dock">
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
          width={290}
          height={165}
        />
      </div>

      {/* 4. Interactive Physics Inspector Side Panel */}
      <PhysicsSidePanel
        selectedComponent={selectedComponent}
        onClose={() => setSelectedComponent(null)}
        liveData={activeTwinState}
      />

      {/* 5. Bottom Dock: Rod Float Incident Simulator & Timeline Scrubber */}
      <div className="twin-bottom-bar-dock">
        <IncidentSimulatorBanner
          simulationStep={incidentStep}
          onStartSimulation={handleStartIncidentSimulation}
          onResetSimulation={handleResetIncident}
          onApplyRemediation={handleApplyRemediation}
        />

        <TimelineScrubber
          currentDay={timelineDay}
          totalDays={72}
          isPlaying={isTimelinePlaying}
          onDayChange={(d) => {
            setTimelineDay(d);
            if (incidentStep !== 0) handleResetIncident();
          }}
          onTogglePlay={() => setIsTimelinePlaying(!isTimelinePlaying)}
          onStepBack={() => setTimelineDay((d) => Math.max(0, d - 5))}
          onStepForward={() => setTimelineDay((d) => Math.min(72, d + 5))}
        />
      </div>
    </div>
  );
}
