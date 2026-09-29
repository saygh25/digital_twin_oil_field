# 🛢️ Baghewala Well DT-07: 3D Digital Twin Simulation Package

This package contains the complete, self-contained **3D Digital Twin Visualizer and Simulation System** for the Baghewala CSS Heavy Oil Thermal Recovery well (Well DT-07, Jodhpur Sandstone, Rajasthan).

---

## 🌟 Key Features

1. **Surface Facility & Pumpjack 3D**:
   - High-fidelity Mark II SRP pumpjack with exact 4-bar crank kinematics.
   - VFD drive unit, steam corridor & injection manifolds, gas knockout drum, crude storage/sludge tank, flare stack, distribution transformer, wellhead, cellar, and concrete pad.
2. **Top Front Surface Landing View**:
   - Defaults to an elevated, isometric front view of the surface facility with strictly clamped vertical orbit (sub-horizon void hidden).
3. **Sequential Underground Navigation**:
   - `[Left Arrow]` / `[A]` (or on-screen pill buttons) to step down depth layers:
     - **01 Surface Facilities (0 m)**: Plant overview, wellhead, desert floor.
     - **02 Desert Caprock (-1.8 m)**: Conductor casing & cellar under Thar desert sands.
     - **03 7" Intermediate Casing (-4.2 m)**: Smoky casing & class G cement sheath.
     - **04 Production Tubing (-5.8 m)**: Inside heavy alloy steel tubing with lathe tool marks, box couplings, sleeve rings, and fluid flow particles.
     - **05 Downhole Pump & Valves (-9.4 m)**: Precision plunger, traveling valve, standing valve.
     - **06 Jodhpur Sandstone Payzone (-11.2 m)**: Steam chamber thermal diffusion & perforations.
   - `[Right Arrow]` / `[D]` to ascend back towards the surface.
4. **Rendering Modes & Shader System**:
   - `3D VIEW`: PBR structural render with metallic bronze inner tubing and realistic desert lighting.
   - `FLOW SIMULATION`: Translucent casing with brushed steel inner tubing, animated particle streamlines, and thermal gradient shading.
5. **Interactive Right-Side HUD Tab (`WellTelemetryHUDCard.jsx`)**:
   - Translucent glassmorphic sliding HUD tab positioned cleanly on the right.
   - Dark sand heading (`WELL DT-07 - Telemetry & Status`).
   - Dynamometer card widget (`DynoCardMini.jsx`) with deep wine/crimson loop and real-time load diagnostics.
   - CSS stage lifecycle monitor, real-time KPI telemetry tiles, sparklines, and incident status.
   - 3D labels automatically hide/adjust when the HUD tab is open to prevent overlapping text.
6. **External Simulation Dashboard (Below 3D Canvas)**:
   - Full-width operational analytics section placed cleanly below the 3D viewport.
   - 4-column telemetry KPI grid, live CSS thermal recovery lifecycle monitor, dyno card card details, and physics side inspector.
7. **CSS Stage Timeline Scrubber**:
   - Interactive Day 0–72 lifecycle scrubber (Steam Injection → Soaking → Hot Production → Cold Depletion).
8. **Rod Float Incident Simulator**:
   - Real-time kinematic simulation of rod float shock and automated VFD remediation.

---

## 📦 1. Required Dependencies

Install the following packages in your target React project:

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing lucide-react
```

---

## 🚀 2. How to Merge into Your Project

### Step 1: Copy Files
1. Copy `frontend/src/components/digital_twin_viz/` to your project's `src/components/digital_twin_viz/`.
2. Copy `frontend/public/textures/` to your project's `public/textures/`.
3. Copy `frontend/public/assets/` to your project's `public/assets/`.

### Step 2: Import and Render
```jsx
import React from 'react';
import WellDigitalTwin3D from './components/digital_twin_viz/WellDigitalTwin3D';

function App() {
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0a0d14' }}>
      <WellDigitalTwin3D
        wellId="DT-07"
        onComponentClick={(componentName) => {
          console.log('Selected 3D component:', componentName);
        }}
      />
    </div>
  );
}

export default App;
```

---

## ⚙️ 3. Configuration & Props

### Component Props:
| Prop | Type | Default | Description |
|---|---|---|---|
| `wellId` | `string` | `'DT-07'` | Well identifier used for telemetry and API calls. |
| `onComponentClick` | `function` | `undefined` | Callback `(compName) => {}` triggered on clicking 3D objects. |
| `className` | `string` | `''` | Optional extra CSS class name for root container. |

### Standalone / Offline Resilience:
When no backend is running, the component automatically runs in **high-fidelity standalone mode** with physics interpolation and incident simulation!

---

## 📁 4. Directory Structure

```
digital_twin_viz/
├── DesertGroundTerrain.jsx      # Thar desert terrain plane & ground styling
├── DynoCardMini.jsx             # Mini dynamometer card widget (crimson polygon)
├── GeologicalCrossSection.jsx   # 7-band geological strata & thermal chamber
├── IncidentSimulatorBanner.jsx  # Rod floating simulation banner & controls
├── PhysicsSidePanel.jsx         # Component physics & telemetry inspector
├── PumpjackSurface3D.jsx        # Kinematic Mark II SRP pumpjack & walking beam
├── ReservoirZone3D.jsx          # Jodhpur sandstone & thermal diffusion
├── SurfaceFacilities3D.jsx      # Wellhead, separator, tanks, piping, VFD
├── TimelineScrubber.jsx         # Day 0-72 CSS lifecycle scrubber
├── WellDigitalTwin3D.jsx        # Master Container, Canvas, & Dashboard controller
├── WellTelemetryHUDCard.jsx     # Right-side translucent sliding telemetry tab
├── Wellbore3D.jsx               # Casing, alloy steel pipe, rods, valves, fluid
├── constants.js                 # Field specs, stages, physics constants
├── digital_twin_3d.css          # Dark glassmorphic design system styles
├── index.js                     # Package entry point
├── pipeMaterialSpec.js          # PBR metal shader configs & palettes
├── pumpjackKinematics.js        # Exact four-bar crank kinematics engine
└── strataPalette.js             # Geological strata shader & depth ticks
```

---
*Created for Baghewala Heavy Oil Field Digital Twin Project.*
