import React, { useState } from 'react';
import SolidStrataStreamFlowView from './SolidStrataStreamFlowView';
import XRayReservoir3DModel from './XRayReservoir3DModel';

export default function Reservoir3DViewport({
  activeLayer = 'temperature',
  dynamicRadius = 10.2,
  dynamicTemp = 127.3,
  dynamicViscosity = 142,
  sandboxSteamTemp = 260,
  sandboxSteamQuality = 0.8,
  sandboxSlugTonnes = 1600,
  sandboxNetPay = 18,
  dynamicMobility = 8.5,
  oilFlowRate = 316,
  oilFlowVelocity = 0.74,
  selectedSectionFilter = 'all',
  onSelectSection,
  simDay = 45,
  isPlaying = false
}) {
  const [renderMode, setRenderMode] = useState('solid'); // 'solid' | 'xray'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {renderMode === 'solid' ? (
        <SolidStrataStreamFlowView
          dynamicRadius={dynamicRadius}
          dynamicTemp={dynamicTemp}
          dynamicViscosity={dynamicViscosity}
          sandboxSteamTemp={sandboxSteamTemp}
          sandboxSteamQuality={sandboxSteamQuality}
          sandboxSlugTonnes={sandboxSlugTonnes}
          oilFlowRate={oilFlowRate}
          oilFlowVelocity={oilFlowVelocity}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          selectedSectionFilter={selectedSectionFilter}
          onSelectSection={onSelectSection}
          renderMode={renderMode}
          onToggleRenderMode={setRenderMode}
        />
      ) : (
        <XRayReservoir3DModel
          dynamicRadius={dynamicRadius}
          dynamicTemp={dynamicTemp}
          dynamicViscosity={dynamicViscosity}
          sandboxSteamTemp={sandboxSteamTemp}
          sandboxSteamQuality={sandboxSteamQuality}
          sandboxSlugTonnes={sandboxSlugTonnes}
          sandboxNetPay={sandboxNetPay}
          oilFlowRate={oilFlowRate}
          oilFlowVelocity={oilFlowVelocity}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          selectedSectionFilter={selectedSectionFilter}
          onSelectSection={onSelectSection}
          renderMode={renderMode}
          onToggleRenderMode={setRenderMode}
        />
      )}
    </div>
  );
}
