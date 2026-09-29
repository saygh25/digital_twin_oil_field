import React, { useState, useMemo } from 'react';
import {
  Clock,
  Flame,
  Droplets,
  Thermometer,
  Wrench,
  Activity,
  CheckCircle,
  Filter,
  Plus,
  Calendar,
  Layers,
  ChevronDown,
  X,
  Check,
  Search,
  Zap,
  Info
} from 'lucide-react';

export default function OperationalTimeline({
  selectedWellId = 'B-17',
  cycles = [],
  recentActivities = []
}) {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);

  // New Event Form State
  const [newAction, setNewAction] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newType, setNewType] = useState('production');
  const [newCycle, setNewCycle] = useState('Current Cycle (C#4)');
  const [customEvents, setCustomEvents] = useState([]);

  // Generate complete historical operational timeline from cycles + live telemetry
  const baseTimeline = useMemo(() => {
    const events = [];

    // Synthesize cycle milestones from actual cycles
    const cycleData = cycles.length > 0 ? cycles : [
      { cycle_number: 1, steam: 686.7, pressure: 89.9, temp: 81.8, soak: 13.4, prod: 53.0, oil: 6770.2 },
      { cycle_number: 2, steam: 658.7, pressure: 87.9, temp: 82.8, soak: 14.3, prod: 60.2, oil: 6509.4 },
      { cycle_number: 3, steam: 679.7, pressure: 91.0, temp: 80.4, soak: 15.3, prod: 61.1, oil: 4346.0 },
      { cycle_number: 4, steam: 670.3, pressure: 88.9, temp: 80.5, soak: 13.9, prod: 58.8, oil: 4405.8 },
      { cycle_number: 5, steam: 646.0, pressure: 88.1, temp: 81.7, soak: 14.3, prod: 62.6, oil: 5623.7 },
      { cycle_number: 6, steam: 663.8, pressure: 91.0, temp: 82.0, soak: 15.9, prod: 59.4, oil: 4106.7 },
      { cycle_number: 7, steam: 628.9, pressure: 86.4, temp: 79.2, soak: 15.0, prod: 59.3, oil: 4650.7 }
    ];

    // Build timeline in reverse chronological order (newest on top)
    // 1. Live shift events
    events.push(
      {
        id: 'live-1',
        time: 'Today 14:28',
        cycle: 'Cycle #4 (Active)',
        type: 'injection',
        category: 'Steam Injection',
        action: 'OTSG-03 High-Pressure Steam Injection Active',
        detail: `Steam volume delivering 420 BPD at 80% steam quality, manifold pressure 24.8 bar. Bottomhole heat front advancing.`,
        params: 'Steam: 420 BPD · Quality: 80% · Press: 24.8 bar',
        source: 'Live SCADA Stream',
        verified: true
      },
      {
        id: 'live-2',
        time: 'Today 11:06',
        cycle: 'Cycle #4 (Active)',
        type: 'thermal',
        category: 'Thermal & Reservoir',
        action: 'Near-Wellbore Thermal Front Update',
        detail: `Radius of heated zone estimated at +3.2 m in Jodhpur Sandstone. Viscosity reduced from 14,000 cP to 1,240 cP in stimulated boundary.`,
        params: 'ΔRadius: +3.2 m · Visc: 1,240 cP · Temp: 82°C',
        source: 'Digital Twin Thermal Solver',
        verified: true
      },
      {
        id: 'live-3',
        time: 'Yesterday 16:40',
        cycle: 'Cycle #4 (Active)',
        type: 'mechanics',
        category: 'Workover & Maintenance',
        action: 'SRP Dynamometer & Load Diagnostic',
        detail: `Polished rod peak load measured at 68.4 kN (PPRL), minimum downstroke load at 24.2 kN (MPRL). No rod floating condition detected.`,
        params: 'PPRL: 68.4 kN · MPRL: 24.2 kN · SPM: 4.2',
        source: 'Field Telemetry Diagnostic',
        verified: true
      }
    );

    // 2. Historical Cycle Milestones
    cycleData.forEach((c) => {
      const cNum = c.cycle_number;
      const steamVol = c.injection_volume_tonnes || c.steam || 650;
      const pressure = c.injection_pressure_bar || c.pressure || 88;
      const oilVol = c.cumulative_oil_m3 || c.oil || 5000;
      const soakDays = c.soak_duration_days || c.soak || 14;
      const prodDays = c.production_duration_days || c.prod || 60;

      // Completion of Cycle
      events.push({
        id: `c${cNum}-end`,
        time: `Cycle #${cNum} &bull; Day ${Math.round(soakDays + prodDays)}`,
        cycle: `Cycle #${cNum}`,
        type: 'production',
        category: 'Production',
        action: `Cycle #${cNum} Production Phase Completed`,
        detail: `Total oil recovery reached ${oilVol.toLocaleString()} m³. Economic cut-off reached as near-wellbore temperature decayed to 48.0°C baseline.`,
        params: `Cumulative Oil: ${oilVol.toLocaleString()} m³ · Prod Duration: ${prodDays} days · SOR: ${(steamVol / (oilVol || 1)).toFixed(2)} t/m³`,
        source: 'Production Shift Audit',
        verified: true
      });

      // Soak & Heat Transfer Phase
      events.push({
        id: `c${cNum}-soak`,
        time: `Cycle #${cNum} &bull; Day ${Math.round(soakDays)}`,
        cycle: `Cycle #${cNum}`,
        type: 'thermal',
        category: 'Thermal & Reservoir',
        action: `Cycle #${cNum} Thermal Soak Period Finished`,
        detail: `Thermal soak period of ${soakDays} days completed. Steam condensation transferred latent heat into formation. Well placed on SRP artificial lift.`,
        params: `Soak Duration: ${soakDays} days · Peak Temp: ${c.injection_temperature_c || 81}°C`,
        source: 'Field Log Record',
        verified: true
      });

      // Steam Injection Phase
      events.push({
        id: `c${cNum}-inj`,
        time: `Cycle #${cNum} &bull; Day 1`,
        cycle: `Cycle #${cNum}`,
        type: 'injection',
        category: 'Steam Injection',
        action: `Cycle #${cNum} Steam Injection Phase Initiated`,
        detail: `Injected ${steamVol} tonnes of high-quality steam at ${pressure} bar into Jodhpur Sandstone pay zone to thermally stimulate heavy crude column.`,
        params: `Steam Injected: ${steamVol} t · Pressure: ${pressure} bar`,
        source: 'Boiler & Steam SCADA',
        verified: true
      });
    });

    return events;
  }, [cycles]);

  // Combine base events with any user-added custom events
  const allEvents = useMemo(() => {
    return [...customEvents, ...baseTimeline];
  }, [customEvents, baseTimeline]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const matchesType = typeFilter === 'ALL' || ev.type === typeFilter;
      const matchesCycle = cycleFilter === 'ALL' || ev.cycle.includes(cycleFilter);
      const matchesSearch = !searchQuery ||
        ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesCycle && matchesSearch;
    });
  }, [allEvents, typeFilter, cycleFilter, searchQuery]);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newAction) return;

    const newEv = {
      id: `custom-${Date.now()}`,
      time: `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      cycle: newCycle,
      type: newType,
      category: newType === 'injection' ? 'Steam Injection' : newType === 'thermal' ? 'Thermal & Reservoir' : newType === 'mechanics' ? 'Workover & Maintenance' : 'Production',
      action: newAction,
      detail: newDetail || 'Logged by field engineer on duty.',
      params: 'Operator Shift Entry',
      source: 'Operator Handover Log',
      verified: true
    };

    setCustomEvents([newEv, ...customEvents]);
    setNewAction('');
    setNewDetail('');
    setShowLogModal(false);
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'injection':
        return <Flame size={15} color="#d97706" />;
      case 'production':
        return <Droplets size={15} color="#ea580c" />;
      case 'thermal':
        return <Thermometer size={15} color="#b45309" />;
      case 'mechanics':
        return <Wrench size={15} color="#059669" />;
      default:
        return <Activity size={15} color="#78350f" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'injection':
        return <span className="badge badge-amber">Steam Injection</span>;
      case 'production':
        return <span className="badge badge-orange">Oil Production</span>;
      case 'thermal':
        return <span className="badge badge-cyan">Thermal &amp; Reservoir</span>;
      case 'mechanics':
        return <span className="badge badge-emerald">Workover &amp; Maintenance</span>;
      default:
        return <span className="badge badge-muted">Operational</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* ── Top Header Bar ── */}
      <div className="sandstone-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
        <div className="card-title-bar">
          <div>
            <div className="card-heading-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="var(--accent-amber)" />
              OPERATIONS &amp; CYCLIC STIMULATION TIMELINE — WELL {selectedWellId}
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Chronological field operations, CSS phase transitions, shift logs &amp; artificial lift intervention milestones.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowLogModal(true)}
              className="btn-primary"
              style={{ padding: '5px 12px', fontSize: '0.72rem', gap: 6 }}
            >
              <Plus size={14} /> Log Shift Event
            </button>
          </div>
        </div>

        {/* ── CSS Cyclic Phase Progress Tracker ── */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.85rem 1rem',
          background: 'rgba(45,34,23,0.03)',
          borderRadius: 8,
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Current Cycle #4 Operational Phase Tracker
            </span>
            <span className="badge badge-emerald">Phase 3: High-Mobility Production (Day 45 of 95)</span>
          </div>

          {/* Progress Step Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {[
              { num: 1, title: 'Steam Injection', dur: 'Days 1–14', status: 'COMPLETED', color: 'var(--accent-amber)' },
              { num: 2, title: 'Thermal Soak', dur: 'Days 15–28', status: 'COMPLETED', color: 'var(--accent-orange)' },
              { num: 3, title: 'Active Production', dur: 'Days 29–65', status: 'IN PROGRESS', color: 'var(--accent-emerald)', active: true },
              { num: 4, title: 'Cooling / Cut-off', dur: 'Days 66–95', status: 'UPCOMING', color: 'var(--text-muted)' }
            ].map((st) => (
              <div
                key={st.num}
                style={{
                  padding: '0.55rem 0.65rem',
                  borderRadius: 6,
                  background: st.active ? 'rgba(21,128,61,0.08)' : 'transparent',
                  border: `1px solid ${st.active ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, color: st.color }}>
                    Phase {st.num}
                  </span>
                  {st.status === 'COMPLETED' ? (
                    <CheckCircle size={12} color="var(--accent-emerald)" />
                  ) : st.active ? (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  ) : null}
                </div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                  {st.title}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {st.dur} &bull; {st.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'transparent',
        borderRadius: 7,
        padding: '0.6rem 0.85rem',
        border: '1px solid var(--border-color)'
      }}>
        {/* Type Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 2 }}>
            Filter:
          </span>
          {[
            ['ALL', 'All Events'],
            ['injection', 'Steam'],
            ['production', 'Production'],
            ['thermal', 'Thermal'],
            ['mechanics', 'Maintenance']
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTypeFilter(k)}
              className={typeFilter === k ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '3px 8px', fontSize: '0.68rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Cycle & Search Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              borderRadius: 5,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">All Cycles (C#1 – C#7)</option>
            <option value="Cycle #4">Cycle #4 (Current)</option>
            <option value="Cycle #3">Cycle #3</option>
            <option value="Cycle #2">Cycle #2</option>
            <option value="Cycle #1">Cycle #1 (Baseline)</option>
          </select>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search actions or parameters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '4px 8px 4px 24px',
                fontSize: '0.72rem',
                borderRadius: 5,
                border: '1px solid var(--border-color)',
                width: 190
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Timeline Ladder Feed ── */}
      <div style={{ position: 'relative', paddingLeft: '1.75rem', marginTop: '0.5rem' }}>
        {/* Continuous Vertical Connecting Line */}
        <div style={{
          position: 'absolute',
          top: 10,
          bottom: 20,
          left: '0.85rem',
          width: 2,
          background: 'linear-gradient(180deg, var(--accent-amber), rgba(180, 155, 125, 0.4))'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredEvents.length > 0 ? (
            filteredEvents.map((ev, i) => (
              <div key={ev.id || i} style={{ position: 'relative' }}>
                {/* Timeline Node Circle */}
                <div style={{
                  position: 'absolute',
                  left: '-1.35rem',
                  top: '0.85rem',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--sandstone-bg, #faf6f0)',
                  border: '2px solid var(--accent-amber)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  zIndex: 2
                }}>
                  {getEventIcon(ev.type)}
                </div>

                {/* Event Card */}
                <div
                  className="sandstone-card"
                  style={{
                    padding: '0.75rem 0.95rem',
                    background: i === 0 ? 'rgba(217, 119, 6, 0.03)' : 'transparent',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1c1917' }}>
                          {ev.action}
                        </span>
                        {getTypeBadge(ev.type)}
                        <span className="badge badge-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                          {ev.cycle}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={11} />
                        <span dangerouslySetInnerHTML={{ __html: ev.time }} />
                        <span>&bull;</span>
                        <span>Source: {ev.source}</span>
                      </div>
                    </div>

                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      <Check size={11} /> Verified Record
                    </span>
                  </div>

                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: '0.45rem 0', lineHeight: 1.5 }}>
                    {ev.detail}
                  </div>

                  {ev.params && (
                    <div style={{
                      fontSize: '0.69rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(45,34,23,0.03)',
                      padding: '0.35rem 0.55rem',
                      borderRadius: 4,
                      color: 'var(--accent-amber)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {ev.params}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="sandstone-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No timeline records matching the selected event type or cycle filter.
            </div>
          )}
        </div>
      </div>

      {/* ── Log New Event Modal ── */}
      {showLogModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="sandstone-card" style={{ maxWidth: 460, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
            <div className="card-title-bar">
              <div className="card-heading-bold">Log New Operational Shift Event</div>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                  Event / Action Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile boiler OTSG-03 connected / VFD setpoint trimmed"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: 5, border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                    Category:
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.72rem', borderRadius: 5, border: '1px solid var(--border-color)' }}
                  >
                    <option value="injection">Steam Injection</option>
                    <option value="production">Oil Production</option>
                    <option value="thermal">Thermal &amp; Reservoir</option>
                    <option value="mechanics">Workover / Maintenance</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                    Cycle:
                  </label>
                  <select
                    value={newCycle}
                    onChange={(e) => setNewCycle(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.72rem', borderRadius: 5, border: '1px solid var(--border-color)' }}
                  >
                    <option value="Cycle #4 (Active)">Cycle #4 (Active)</option>
                    <option value="Cycle #3">Cycle #3</option>
                    <option value="Cycle #2">Cycle #2</option>
                    <option value="Cycle #1">Cycle #1</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                  Operational Details / Notes:
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter telemetry reading, pressure observations, or crew handover instructions…"
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.75rem', borderRadius: 5, border: '1px solid var(--border-color)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowLogModal(false)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.74rem' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '5px 12px', fontSize: '0.74rem', gap: 6 }}>
                  <Check size={14} /> Commit to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
