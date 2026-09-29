# Implementation & Integration Guide: Baghewala Satellite GIS Map Subsystem

This document provides step-by-step instructions to integrate the **Baghewala Satellite GIS Map** into any external or existing React web application.

---

## 📦 Prerequisites

Ensure the following NPM dependencies are installed in your target frontend project:

```bash
npm install leaflet lucide-react
npm install -D @types/leaflet
```

---

## 🛠️ Step-by-Step Integration

### Step 1: Copy Map Component & CSS Styles

1. Copy `BaghewalaSatelliteMap.jsx` to your target project:
   ```bash
   cp dashboard_satellite_map_screen/frontend/src/components/dashboard/BaghewalaSatelliteMap.jsx \
      path/to/your/project/src/components/
   ```

2. Copy or import `satellite_map.css`:
   ```bash
   cp dashboard_satellite_map_screen/frontend/src/styles/satellite_map.css \
      path/to/your/project/src/styles/
   ```

3. Ensure Leaflet CSS is loaded in your root `index.html` or main stylesheet:
   ```html
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
   ```

---

### Step 2: Import and Render Component

Import `BaghewalaSatelliteMap` in your page or dashboard view:

```jsx
import React, { useState } from 'react';
import BaghewalaSatelliteMap from './components/BaghewalaSatelliteMap';
import './styles/satellite_map.css';

export default function FieldDashboard() {
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

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <BaghewalaSatelliteMap
        selectedWellId={selectedWellId}
        onSelectWell={(wellId) => setSelectedWellId(wellId)}
        mapMode={mapMode}
        setMapMode={setMapMode}
        mapLayers={mapLayers}
        setMapLayers={setMapLayers}
      />
    </div>
  );
}
```

---

### Step 3: Props Specification

| Prop | Type | Default | Description |
|---|---|---|---|
| `wellPins` | `Array<Object>` | `[]` | Optional custom well objects. If omitted, built-in calibrated Baghewala dataset is used. |
| `selectedWellId` | `string` | `'B-17'` | The well ID currently highlighted on the map and loaded in the telemetry drawer. |
| `onSelectWell` | `(wellId: string) => void` | `() => {}` | Callback invoked when a user clicks any well pin or searches for a well. |
| `mapMode` | `'Satellite' \| 'Terrain' \| 'Field Plan'` | `'Satellite'` | Current active base map layer. |
| `setMapMode` | `(mode: string) => void` | `() => {}` | State setter for changing map mode. |
| `mapLayers` | `Object` | (see defaults) | Object with booleans toggling `wells`, `productionLines`, `steamLines`, `facilities`, `thermalZones`, and `reservoirBoundary`. |
| `setMapLayers` | `(layers: Object) => void` | `() => {}` | State setter for toggling individual overlay layers. |

---

### Step 4: Backend API Integration (Optional)

If your app has a live backend, you can connect the map to fetch real-time well states:

```javascript
// Example GET /api/wells response schema
[
  {
    "id": "B-17",
    "name": "Well B-17",
    "lat": 27.5110,
    "lon": 71.9010,
    "type": "CSS Injector / Producer",
    "state": "Injection", // "Production" | "Injection" | "Soak"
    "bopd": 128,
    "steam": 380,
    "temp": 132.1,
    "waterCut": 24.6
  }
]
```

---

## 🎨 Design System & Customization

The subsystem uses CSS variables for easy theming:

```css
:root {
  --accent-orange: #ea580c;  /* Burnt Orange buttons & production lines */
  --accent-amber: #d97706;   /* Warm Amber soak status & steam lines */
  --accent-fire: #c2410c;    /* Deep Fire Orange injection wells & active tags */
  --text-primary: #1c1917;   /* High-contrast dark charcoal text */
  --text-secondary: #431407; /* High-contrast terracotta labels */
}
```
