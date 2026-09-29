import React, { useState, useEffect } from 'react';
import ReservoirThermalTwin from './components/ReservoirThermalTwin.jsx';
import { Flame, Activity, Layers, RefreshCw } from 'lucide-react';

export default function App() {
  const [wellId, setWellId] = useState('B-17');
  const [twinState, setTwinState] = useState({
    well_id: 'B-17',
    oil_flow_rate_bopd: 245.0,
    steam_injection_temp_c: 220.0,
    steam_quality_x: 0.80,
    darcy_velocity_m_per_day: 0.53,
    core_temperature_c: 112.4,
    plume_front_radius_m: 9.2,
    cycle_number: 4
  });
  const [liveMode, setLiveMode] = useState(true);

  // Poll backend if available, or fall back to internal physics model seamlessly
  useEffect(() => {
    let interval = null;
    if (liveMode) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/twins/${wellId}`);
          if (res.ok) {
            const data = await res.json();
            setTwinState((prev) => ({
              ...prev,
              ...data,
              oil_flow_rate_bopd: data.oil_rate_bopd ?? prev.oil_flow_rate_bopd,
              core_temperature_c: data.reservoir_temperature_c ?? prev.core_temperature_c
            }));
          }
        } catch {
          // Backend offline - client runs autonomous analytical physics
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [wellId, liveMode]);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, #24140b 0%, #0c0a09 100%)', color: '#1c1917', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1.5px solid rgba(234, 88, 12, 0.65)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(234, 88, 12, 0.4)'
            }}
          >
            <Flame size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1c1917', letterSpacing: '0.02em' }}>
              BAGHEWALA OILFIELD — RESERVOIR &amp; THERMAL DIGITAL TWIN
            </h1>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#7c2d12', fontWeight: 700 }}>
              7-Layer Solid Strata Stream Flow • Marx-Langenheim Kinetics • De Boer AOP
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(234, 88, 12, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ea580c' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c2d12' }}>WELL {wellId} ACTIVE</span>
          </div>

          <button
            onClick={() => setLiveMode(!liveMode)}
            style={{
              background: liveMode ? '#ea580c' : 'transparent',
              color: liveMode ? '#ffffff' : '#7c2d12',
              border: '1.5px solid #ea580c',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={12} className={liveMode ? 'spin' : ''} />
            {liveMode ? 'Live Sim Engine' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Main Screen Component Body */}
      <main style={{ flex: 1, padding: '1rem', maxWidth: '1800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <ReservoirThermalTwin
          wellId={wellId}
          twinState={twinState}
          onStateUpdate={(updated) => setTwinState((prev) => ({ ...prev, ...updated }))}
        />
      </main>
    </div>
  );
}
