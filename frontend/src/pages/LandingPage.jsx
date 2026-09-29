import React, { useState, useEffect, useRef } from 'react';
import { Radio, ArrowRight, Volume2, VolumeX, Activity } from 'lucide-react';
import transitionVideo from './transition.mp4';
import oilLogo from './oil.png';
import './LandingPage.css';

const DEFAULT_TARGET_DURATION = 4.5; // fallback duration in seconds
const TOTAL_TICKS = 50; // Number of segmented tick marks in tactical uplink loader

export default function LandingPage({ onEnterDashboard }) {
  const videoRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(DEFAULT_TARGET_DURATION);

  const getPhaseText = (pct) => {
    if (pct < 25) return 'Calibrating Reservoir PVT & Thermal Grids...';
    if (pct < 55) return 'Solving Gibbs Wave SRP Dynamometer Models...';
    if (pct < 85) return 'Syncing Multi-Pad Steam Fleet Schedules...';
    if (pct < 100) return 'Asset Telemetry Ready & Synchronized...';
    return 'Launching Operator Command Center...';
  };

  const triggerDashboardRedirect = () => {
    if (isExiting) return;
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
    setIsExiting(true);
    setTimeout(() => {
      onEnterDashboard();
    }, 600); // 600ms smooth fade transition
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((e) => {
        console.warn('Autoplay prevented:', e);
      });
    }

    const timer = setTimeout(() => {
      triggerDashboardRedirect();
    }, (duration + 0.5) * 1000);
    redirectTimerRef.current = timer;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        triggerDashboardRedirect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duration]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const dur = duration || DEFAULT_TARGET_DURATION;
      const pct = Math.min(100, (current / dur) * 100);
      setProgress(pct);

      if (current >= dur - 0.15) {
        triggerDashboardRedirect();
      }
    }
  };

  const handleSeek = (ratio) => {
    if (videoRef.current) {
      const dur = duration || DEFAULT_TARGET_DURATION;
      const newTime = ratio * dur;
      videoRef.current.currentTime = newTime;
      setProgress(ratio * 100);
    }
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const currentTickIndex = Math.floor((progress / 100) * TOTAL_TICKS);

  return (
    <div className={`landing-hero-container ${isExiting ? 'landing-fade-out' : ''}`}>
      {/* Background Fullscreen Video */}
      <video
        ref={videoRef}
        src={transitionVideo}
        className="landing-bg-video"
        playsInline
        muted={isMuted}
        autoPlay
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={triggerDashboardRedirect}
      />

      {/* Subtle Vignette Overlay */}
      <div className="landing-overlay-vignette" />

      {/* Top HUD Navigation Bar */}
      <header className="landing-top-hud">
        <div className="landing-brand-tag">
          <div className="landing-brand-logo-glow">
            <img src={oilLogo} alt="Oil Logo" className="brand-oil-logo-img" />
          </div>
          <div>
            <div className="landing-brand-title">BAGHEWALA DIGITAL TWIN</div>
            <div className="landing-brand-subtitle">ONGC HEAVY OIL ASSET &bull; RAJASTHAN BASIN</div>
          </div>
        </div>

        <div className="landing-hud-status-group">
          <div className="hud-pill hud-pill-live">
            <span className="hud-live-dot" />
            <span>TELEMETRY LINK: ONLINE</span>
          </div>

          <div className="hud-pill hud-pill-coords">
            <Radio size={12} />
            <span>27°58′N 71°14′E &bull; BIKANER-NAGAUR BASIN</span>
          </div>

          <button
            className="hud-audio-toggle"
            onClick={toggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <button
            className="landing-skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerDashboardRedirect();
            }}
            title="Enter Dashboard (or press Enter)"
          >
            <span>ENTER DASHBOARD</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Center Tactical Status Display */}
      <div className="landing-center-hud">
        <div className="landing-center-badge">
          <span className="pulse-beacon" />
          <span>ESTABLISHING OPC-UA EDGE SENSOR UPLINK</span>
        </div>
        <div className="landing-center-title">
          BAGHEWALA DESERT ASSET TWIN
        </div>
        <div className="landing-center-status">
          <Activity size={14} color="#f59e0b" />
          <span>{getPhaseText(progress)}</span>
          <span className="landing-pct-highlight">[{Math.round(progress)}%]</span>
        </div>
      </div>

      {/* Discreet click area to enter dashboard anytime */}
      <div
        className="landing-clickable-canvas"
        onClick={triggerDashboardRedirect}
        title="Click anywhere to proceed to Dashboard"
      />

      {/* Bottom HUD - Sci-Fi Tactical Segmented Slanted Uplink Loader */}
      <footer className="landing-bottom-hud">
        <div
          className="sci-fi-uplink-loader"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            handleSeek(Math.min(1, Math.max(0, ratio)));
          }}
          title="Telemetry Stream Uplink Loader (Click to scrub)"
        >
          <div className="sci-fi-ticks-track">
            {Array.from({ length: TOTAL_TICKS }).map((_, i) => {
              const isMajor = i % 8 === 0;
              const isFilled = i <= currentTickIndex;
              const isHead = i === currentTickIndex && progress > 0 && progress < 100;

              return (
                <div
                  key={i}
                  className={`sci-fi-tick ${isMajor ? 'tick-major' : ''} ${isFilled ? 'tick-filled' : ''} ${isHead ? 'tick-head' : ''}`}
                />
              );
            })}
          </div>
        </div>

        <div className="landing-bottom-bar">
          <div className="landing-bottom-meta">
            <span>BHARAT PETROLEUM &amp; ONGC RESEARCH INITIATIVE</span>
            <span className="meta-sep">&bull;</span>
            <span>SMART INDIA HACKATHON</span>
            <span className="meta-sep">&bull;</span>
            <span className="skip-hint">Click anywhere or press [ENTER] to skip intro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
