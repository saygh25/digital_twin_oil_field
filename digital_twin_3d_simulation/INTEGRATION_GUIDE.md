# 3D Well to Surface Digital Twin - Complete Simulation Model Package

> **Heavy-Oil Cyclic Steam Stimulation (CSS) & Sucker Rod Pump (SRP) 3D Subterranean & Surface Digital Twin**  
> Developed for Rajasthan Heavy-Oil (Baghewala Field / Jodhpur Sandstone Formation)

---

## 📦 What's Included in This Package

This standalone package contains the complete **3D Well to Surface Twin & Simulation Model System**:

### 1. Frontend 3D Visual & Kinematic Simulation Model (React + Three.js + WebGL)
- **Surface Unit Simulation**: Real-time 4-bar linkage SRP Pumpjack solver (`pumpjackKinematics.js`) driving walking beam, horsehead, pitman arms, counterweights, and polished rod dynamics. Complete with surface facilities (Christmas Tree wellhead, steam injection manifold, test separator, sludge tank, electrical power unit).
- **Subterranean Formation Model**: 7-band geological strata cross-section (Alluvium, Overburden Shale, Mid Siltstone, Upper Sandstone, Jodhpur Payzone, Basal Siltstone, Crystalline Basement) mapped with high-res PBR textures.
- **Wellbore Completion String Simulation**:
  - **X-Ray Glass View**: Crystal-clear technical sapphire/cyan Fresnel glass outer casing (`0.16` central opacity, `0.88` luminous rim edge), rich machined golden brass coupling collars (`#d4af37`), fine ascending golden-amber crude stream micro-particles, and perforation ingress particles.
  - **Solid Metallic View**: PBR brushed steel API tubulars, heavy API companion flanges, and 6 overlapping armor shroud sleeves.
  - **Thermal Ironbow View**: 100% solid metallic thermal temper gradient depicting continuous wellhead-to-bottomhole heat distribution ($T(z)$ curve from 260°C to wellhead) with isothermal rings.
- **Interactive Instrumentation HUDs**:
  - **DynoCard Mini**: Surface and downhole pump dynamometer stroke simulation (load vs position).
  - **Physics Side Panel**: Real-time casing buckling, von Mises stress, and rod tension simulation.
  - **Borewell Caliper Inspector**: Depth station temperature & pressure probe.
  - **Timeline Scrubber**: Full 72-day CSS cycle simulation (Injection -> Soak -> Hot Peak -> Mid-Cycle -> Late Cut-Off).
  - **What-If Scenario Simulator**: Multi-parameter sensitivity engine (Steam Temp, Quality, SPM, Stroke, VFD Hz).
  - **Solid Strata Stream Flow Cutaway Engine**: Darcy velocity streamflow and thermal plume diffusion.

### 2. Backend Physics & Numerical Simulation Engine (Python)
- `thermal.py` & `thermal_advanced.py`: Analytical Boberg-Lantz & Marx-Langenheim thermal dissipation and steam chamber radius solvers.
- `srp_mechanics.py`: API 11L SRP mechanical solver (PPRL, MPRL, rod stress, rod floating risk).
- `dyno_cards.py`: Downhole pump dynamometer card generator with traveling/standing valve action.
- `mechanics_advanced.py`: Thermal expansion, casing compressive strain, and helical buckling calculator.
- `viscosity.py`: Beggs-Robinson crude viscosity temperature-reduction model.
- `economics_and_fleet.py`: CSS economic steam-oil ratio (SOR) cut-off evaluator.
- `digital_twin_state.py`: Coupled 4-layer digital twin state schema.
- `baghewala_css_srp_integrated_dataset.csv`: Comprehensive physics dataset.

---

## 📁 Package Structure

```text
well_to_surface_3d_digital_twin/
├── INTEGRATION_GUIDE.md             <-- This step-by-step setup guide
├── README.md                        <-- Feature overview and technical specs
├── package.json                     <-- Reference peer dependencies
│
├── public/
│   ├── textures/                    <-- All 17 PBR textures (sand, concrete, steel, strata, asphalt)
│   └── assets/                      <-- UI backgrounds, schematics, and icons
│
├── src/
│   ├── assets/                      <-- Cross-section & thermal background references
│   ├── services/
│   │   └── api.js                   <-- API connector for FastAPI / proxy
│   └── components/
│       └── digital_twin_viz/        <-- Master 3D twin component library
│           ├── WellDigitalTwin3D.jsx           [MASTER 3D COMPONENT]
│           ├── Wellbore3D.jsx                  [LATEST X-RAY & THERMAL WELLBORE]
│           ├── PumpjackSurface3D.jsx           [ANIMATED SRP PUMPJACK]
│           ├── SurfaceFacilities3D.jsx         [SURFACE EQUIPMENT & WELLHEAD]
│           ├── DesertGroundTerrain.jsx         [TERRAIN & WELL PAD]
│           ├── GeologicalCrossSection.jsx      [7-BAND SUBTERRANEAN STRATA]
│           ├── ReservoirZone3D.jsx             [BOTTOMHOLE RESERVOIR MATRIX]
│           ├── BorewellThermalInspectorCard.jsx [CALIPER THERMAL PROBE]
│           ├── WellTelemetryHUDCard.jsx        [TELEMETRY OVERLAY CARD]
│           ├── PhysicsSidePanel.jsx            [CASING & SRP PHYSICS PANEL]
│           ├── DynoCardMini.jsx                [DYNAMOMETER CARD]
│           ├── IncidentSimulatorBanner.jsx     [INCIDENT SIMULATION BAR]
│           ├── TimelineScrubber.jsx            [CSS 72-DAY LIFECYCLE SCRUBBER]
│           ├── SolidStrataStreamFlowView.jsx   [THERMAL FLUID STREAM VIEW]
│           ├── XRayReservoir3DModel.jsx        [VOLUMETRIC RESERVOIR MODEL]
│           ├── ReservoirThermalTwin.jsx        [THERMAL TWIN EXPLORER]
│           ├── WhatIfSimulator.jsx             [SCENARIO SIMULATOR]
│           ├── constants.js                    [FIELD SPECS & FALLBACK DATA]
│           ├── pipeMaterialSpec.js             [PBR METALLIC/ROUGHNESS SPECS]
│           ├── pumpjackKinematics.js           [4-BAR LINKAGE SOLVER]
│           ├── strataPalette.js                [GEOLOGY FORMATION DATA]
│           ├── digital_twin_3d.css             [PREMIUM STYLING & HUD GLASS]
│           └── index.js                        [BARREL EXPORT FILE]
│
└── backend_physics_simulation/      <-- Optional Python Analytical Physics Engine
    ├── thermal.py                   [Boberg-Lantz thermal dissipation solver]
    ├── thermal_advanced.py          [Marx-Langenheim heat balance solver]
    ├── srp_mechanics.py             [API 11L mechanical SRP calculations]
    ├── dyno_cards.py                [Dynamometer card generator]
    ├── mechanics_advanced.py        [Casing thermal expansion & buckling]
    ├── viscosity.py                 [Heavy crude viscosity reduction curves]
    ├── economics_and_fleet.py       [CSS economic cutoff model]
    ├── digital_twin_state.py        [Coupled digital twin state schema]
    └── baghewala_css_srp_integrated_dataset.csv [Physics calibration data]
```

---

## 🚀 Quick Step-by-Step Installation

### Step 1: Install Peer Dependencies

In your target React project root, run:

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing lucide-react
```

---

### Step 2: Copy Files into Your Project

1. Copy `src/components/digital_twin_viz/` to your project's `src/components/digital_twin_viz/`.
2. Copy `public/textures/` to your project's `public/textures/` folder.
   > **Note**: Three.js loads textures from `/textures/...`. Having them in your project's `public/textures/` ensures all shaders and models find their textures automatically.
3. Copy `public/assets/` to your project's `public/assets/`.
4. Copy `src/assets/` to your project's `src/assets/`.
5. *(Optional)* Copy `src/services/api.js` to `src/services/api.js` if you are using backend API integrations.
6. *(Optional)* If your project uses a Python backend, copy `backend_physics_simulation/*.py` into your backend app.

---

### Step 3: Insert the Component

Import and render `<WellDigitalTwin3D />` in any page or view:

```jsx
import React from 'react';
import WellDigitalTwin3D from './components/digital_twin_viz/WellDigitalTwin3D';

export default function DigitalTwinPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0b111e', overflow: 'hidden' }}>
      <WellDigitalTwin3D wellId="B-17" />
    </div>
  );
}
```

---

## 🎨 Simulation Modes & Controls

- **Render Mode Toggle**:
  - `Solid`: Industrial API steel tubulars with heavy armor vertebrae and flanges.
  - `X-Ray`: Crystal-clear sapphire/cyan Fresnel glass outer casing with luminous rim edges, rich golden brass coupling collars (`#d4af37`), and ascending golden micro-particles.
  - `Thermal`: 100% solid metallic Ironbow thermal temper showing continuous temperature dissipation from 260°C bottomhole to wellhead.
- **Camera Views**:
  - `Full View`: Balanced 30° elevation showing both surface facilities and subterranean strata.
  - `Surface`: Focused close-up on the SRP pumpjack, Christmas tree, and manifold.
  - `Pump`: Mid-depth camera locked onto the downhole plunger and standing valve.
  - `Reservoir`: Deep camera locked onto the bottomhole perforation interval and payzone.
- **Interactive Scrubber**:
  - Play, pause, or drag through the 72-day CSS lifecycle (Injection -> Soak -> Early Hot Peak -> Mid-Cycle -> Late Cut-Off).
- **Fullscreen**:
  - Dedicated fullscreen toggle button (supports both browser Fullscreen API and CSS modal fallback).
