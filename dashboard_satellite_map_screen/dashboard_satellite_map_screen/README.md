# Baghewala Field Satellite GIS Digital Twin Subsystem

A production-grade, self-contained **Satellite GIS & Field Infrastructure Digital Twin** designed for heavy-oil artificial lift (Sucker Rod Pumps) and Cyclic Steam Stimulation (CSS) in the Baghewala Heavy Oil Field (Rajasthan, India).

This subsystem is fully decoupled from the primary Digital Twin platform and is packaged with its own **standalone React frontend**, **live FastAPI GIS backend**, **high-contrast glassmorphic HUD controls**, **real-time wellhead telemetry drawer**, and **multi-layer infrastructure overlays**.

---

## 🌟 Key Features

1. **High-Resolution Multi-Mode GIS Canvas**:
   - **Satellite Hybrid Imagery**: Ultra-sharp optical imagery powered by Google Maps Satellite tiles.
   - **Topographic Terrain**: Elevation contours, desert tracks, and surface elevation HUD.
   - **CAD Field Plan (FDP)**: Engineering blueprint view with Top Jodhpur Sandstone depth structural contours and geological fault traces.

2. **Zero-Blue/Green High-Contrast Visual Standards**:
   - High-contrast deep burnt orange (`#ea580c`), warm golden amber (`#d97706`), and terracotta (`#c2410c`) color palette.
   - High-contrast dark charcoal/terracotta typography (`#1c1917`, `#431407`, `#7c2d12`) ensuring maximum legibility on bright desert sand and satellite imagery.
   - Elimination of all distracting generic blues, greens, and purples.

3. **Glassmorphic Interactive Overlays**:
   - **Map Layers Switcher**: Glassmorphic panel controlling wells, 52.4 km² field boundary, heated flowlines, steam injection trunklines, facilities, and thermal drainage halos.
   - **Live Well Searchbar**: Type-to-fly search with instant dropdown results and flow rate previews.
   - **GPS & Elevation HUD**: Real-time cursor coordinates (`°N, °E`), elevation in meters MSL, and dynamic scale bar.
   - **Active Well Target Pill**: Glowing orange beacon with quick focus capability.

4. **Deep Wellhead Telemetry Drawer**:
   - Triggered upon clicking any well marker or the Focus button.
   - Displays real-time heavy oil rate (BOPD), steam injection rate, water cut %, bottomhole temperature (°C), in-situ viscosity (cP), casing/tubing pressures, SRP pump dynamics (SPM, polished rod load, motor torque, pump fillage), and CSS thermal recovery cycle stats.

---

## 📁 Repository Structure

```
dashboard_satellite_map_screen/
├── README.md                      # Subsystem documentation (this file)
├── IMPLEMENTATION.md              # Step-by-step merge & integration guide
├── run_dev.sh                     # Turnkey 1-command dev runner (macOS/Linux)
├── backend/                       # Dedicated FastAPI GIS backend service
│   ├── requirements.txt           # Python dependencies
│   └── app/
│       ├── main.py                # FastAPI microservice entry point & CORS
│       └── api/
│           └── gis.py             # REST API routes (/api/wells, /api/telemetry/{well_id})
└── frontend/                      # Standalone React + Vite frontend
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                # Standalone previewer with map mode switcher
        ├── components/
        │   └── dashboard/
        │       └── BaghewalaSatelliteMap.jsx # Core Leaflet Satellite Map component
        ├── services/
        │   └── api.js             # Live API client with calibrated mock fallback
        └── styles/
            └── satellite_map.css  # Self-contained glassmorphism & typography
```

---

## 🚀 Quick Start (Running Standalone)

### Option 1: Turnkey Dev Script

```bash
cd dashboard_satellite_map_screen
./run_dev.sh
```

### Option 2: Running Backend & Frontend Manually

#### Step 1: Start Backend (Port 8003)
```bash
cd dashboard_satellite_map_screen/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8003 --reload
```

#### Step 2: Start Frontend (Port 5174)
```bash
cd dashboard_satellite_map_screen/frontend
npm install
npm run dev
```

Open [http://127.0.0.1:5174](http://127.0.0.1:5174) in your browser.

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/wells` | GET | Returns all 30 Baghewala heavy oil wells with coordinates and production status |
| `/api/telemetry/{well_id}` | GET | Returns detailed surface and downhole telemetry for a specific well |

---

## 📄 License & Attribution
Proprietary Oil India Limited (OIL) Digital Twin Subsystem. Built for Smart India Hackathon (SIH).
