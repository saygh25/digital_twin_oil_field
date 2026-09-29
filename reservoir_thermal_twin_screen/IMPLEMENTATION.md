# Implementation & Integration Guide: Reservoir & Thermal Advanced Twin Screen

This document contains step-by-step instructions to merge and integrate the **Reservoir & Thermal Advanced Twin** screen into any existing website.

---

## 🛠️ 1. Dependencies

In your host web project, install:

```bash
npm install react react-dom three @react-three/fiber @react-three/drei @react-three/postprocessing lucide-react
```

If using Next.js, make sure to add `three` and `@react-three/fiber` to your `transpilePackages` in `next.config.js` if necessary.

---

## 📁 2. File Placement

1. Copy all files from `reservoir_thermal_twin_screen/frontend/src/components/` to your project's component folder:
   ```text
   your-app/src/components/reservoir_thermal/
   ```
2. Copy all files from `reservoir_thermal_twin_screen/frontend/src/assets/` to your project's assets folder:
   ```text
   your-app/src/assets/
   ```
3. Copy `digital_twin_3d.css` into your styles directory:
   ```text
   your-app/src/styles/digital_twin_3d.css
   ```

---

## 🧩 3. Component Usage Example

Import and render the component in any React view:

```jsx
import React, { useState } from 'react';
import ReservoirThermalTwin from './components/reservoir_thermal/ReservoirThermalTwin.jsx';
import './styles/digital_twin_3d.css';

export default function ReservoirThermalScreen() {
  const [twinState, setTwinState] = useState({
    well_id: "B-17",
    oil_flow_rate_bopd: 245.0,
    steam_injection_temp_c: 220.0,
    steam_quality_x: 0.80,
    darcy_velocity_m_per_day: 0.53,
    core_temperature_c: 112.4,
    plume_front_radius_m: 9.2,
    cycle_number: 4
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a09', padding: '1.25rem' }}>
      <ReservoirThermalTwin
        wellId="B-17"
        twinState={twinState}
        onStateUpdate={(updated) => setTwinState((prev) => ({ ...prev, ...updated }))}
      />
    </div>
  );
}
```

---

## 🔌 4. Backend Endpoints (Optional)

If your website connects to a live backend, the screen consumes:

- **`GET /api/twins/{well_id}`**: Retrieves live telemetry values for flow, temperature, and plume radius.
- **`GET /api/reservoir/depth-log`**: Retrieves the multi-track wireline depth stations.
- **`POST /api/reservoir/simulate`**: Runs Marx-Langenheim thermal kinetics calculations.
- **`POST /api/reservoir/inject-pulse`**: Triggers real-time steam injection pulses.

---

## 🎨 5. Design Specs

- **Text**: Dark Charcoal / Deep Espresso (`#1c1917`, `#431407`, `#7c2d12`, `#9a3412`)
- **Buttons / Highlights**: High Contrast Burnt Orange (`#ea580c`, `#c2410c`, `#9a3412`)
- **Telemetry HUD**: Glassmorphic styling with `backdropFilter: blur(16px)` and `background: rgba(255, 255, 255, 0.22)`
- **Panels**: Transparent with thin amber/orange borders.
- **Colors to Avoid**: No blue, cyan, purple, or green in typography, badges, or buttons.
