import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Flame, Droplets, Compass } from 'lucide-react';
import { CSS_STAGES } from './constants';

/**
 * CSS Full Cycle Interactive Timeline Scrubber (0 to 72 Days)
 * 
 * Allows scrubbing across:
 * - Days 0-15: Steam Injection (260°C @ 45 bar, 450 BPD)
 * - Days 15-22: Thermal Soak (Heat diffusion, R -> 10m)
 * - Days 22-37: Early Hot Production (Peak oil 245 BOPD, low viscosity)
 * - Days 37-57: Mid-Cycle Production (Optimal SRP operation)
 * - Days 57-72: Late Production / Cooling Cut-Off (Re-steam required)
 */
export default function TimelineScrubber({
  currentDay = 37,
  totalDays = 72,
  isPlaying = false,
  onDayChange,
  onTogglePlay,
  onStepBack,
  onStepForward
}) {
  const getStageFromDay = (day) => {
    if (day <= 15) return { stage: CSS_STAGES.INJECTION, label: 'STEAM INJECTION' };
    if (day <= 22) return { stage: CSS_STAGES.SOAK, label: 'THERMAL SOAK' };
    if (day <= 37) return { stage: CSS_STAGES.PRODUCTION_EARLY, label: 'HOT PRODUCTION' };
    if (day <= 57) return { stage: CSS_STAGES.PRODUCTION_MID, label: 'MID PRODUCTION' };
    return { stage: CSS_STAGES.PRODUCTION_LATE, label: 'LATE / CUT-OFF' };
  };

  const currentStageInfo = getStageFromDay(currentDay);

  return (
    <div className="timeline-scrubber-bar">
      {/* Playback Controls */}
      <div className="timeline-controls-left">
        <button className="timeline-btn" onClick={onStepBack} title="Step Back 5 Days">
          <SkipBack size={14} />
        </button>
        <button
          className={`timeline-btn play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause Timeline' : 'Play Timeline Time-lapse'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="timeline-btn" onClick={onStepForward} title="Step Forward 5 Days">
          <SkipForward size={14} />
        </button>
      </div>

      {/* Scrubber Track & Markers */}
      <div className="timeline-track-container">
        <div className="timeline-stage-headers">
          <span style={{ color: '#f97316' }}>Steam Injection (0-15d)</span>
          <span style={{ color: '#eab308' }}>Soak (15-22d)</span>
          <span style={{ color: '#10b981' }}>Peak Production (22-37d)</span>
          <span style={{ color: '#06b6d4' }}>Mid Cycle (37-57d)</span>
          <span style={{ color: '#ef4444' }}>Late Cut-off (57-72d)</span>
        </div>

        {/* Range Slider */}
        <div className="slider-wrapper">
          <input
            type="range"
            min="0"
            max={totalDays}
            step="1"
            value={currentDay}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="timeline-slider-input"
          />
          {/* Stage Partition Lines */}
          <div className="stage-divider" style={{ left: `${(15 / totalDays) * 100}%` }} />
          <div className="stage-divider" style={{ left: `${(22 / totalDays) * 100}%` }} />
          <div className="stage-divider" style={{ left: `${(37 / totalDays) * 100}%` }} />
          <div className="stage-divider" style={{ left: `${(57 / totalDays) * 100}%` }} />
        </div>
      </div>

      {/* Active Day & Stage Badge */}
      <div className="timeline-status-badge" style={{ borderColor: currentStageInfo.stage.color }}>
        <div className="day-text">
          <Clock size={12} color="#38bdf8" />
          <span>DAY <strong>{currentDay}</strong> / {totalDays}</span>
        </div>
        <div className="stage-text" style={{ color: currentStageInfo.stage.color }}>
          {currentStageInfo.label}
        </div>
      </div>
    </div>
  );
}
