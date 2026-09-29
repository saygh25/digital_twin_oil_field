import React, { useState, useEffect } from 'react';
import BaghewalaSatelliteMap from './components/dashboard/BaghewalaSatelliteMap';
import { fetchWellsList } from './services/api';
import './styles/satellite_map.css';

export default function App() {
  const [wells, setWells] = useState([]);
  const [selectedWellId, setSelectedWellId] = useState('B-17');
  const [mapMode, setMapMode] = useState('Satellite'); // 'Satellite' | 'Terrain' | 'Field Plan'
  const [mapLayers, setMapLayers] = useState({
    wells: true,
    productionLines: true,
    steamLines: true,
    facilities: true,
    thermalZones: true,
    reservoirBoundary: true
  });

  useEffect(() => {
    fetchWellsList().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setWells(data);
      }
    });
  }, []);

  return (
    <div className="map-standalone-wrapper">
      <header className="map-standalone-header">
        <div className="map-standalone-title">
          <span>OIL INDIA LIMITED — BAGHEWALA FIELD GIS DIGITAL TWIN</span>
          <span className="map-standalone-badge">LIVE SATELLITE TELEMETRY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="map-mode-pills">
            {['Satellite', 'Terrain', 'Field Plan'].map((mode) => (
              <button
                key={mode}
                className={`map-mode-btn ${mapMode === mode ? 'active' : ''}`}
                onClick={() => setMapMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="map-standalone-container">
        <BaghewalaSatelliteMap
          wellPins={wells}
          selectedWellId={selectedWellId}
          onSelectWell={(id) => setSelectedWellId(id)}
          mapMode={mapMode}
          setMapMode={setMapMode}
          mapLayers={mapLayers}
          setMapLayers={setMapLayers}
        />
      </main>
    </div>
  );
}
