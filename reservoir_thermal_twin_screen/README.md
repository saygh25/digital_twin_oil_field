# Reservoir & Thermal Advanced Digital Twin Screen (Well B-17)

A fully working, self-contained, standalone frontend + backend package for the **Baghewala Heavy Oil Well B-17 Reservoir & Thermal Digital Twin**.

---

## 🚀 Quick Start

To launch both the FastAPI backend and the React Vite frontend:

```bash
chmod +x run_dev.sh
./run_dev.sh
```

Or run them individually:

### Backend (FastAPI):
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API root: `http://127.0.0.1:8000/`
- Swagger Docs: `http://127.0.0.1:8000/docs`

### Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```
- App UI: `http://127.0.0.1:5173/`

---

## 🌟 Included Modules & Features

1. **7-Layer Solid Strata Stream Flow 3D Cutaway Engine (`SolidStrataStreamFlowView.jsx`)**:
   - 7 stratigraphic horizons (Overburden Dune, Bilara Formation, Jodhpur Sandstone Payzone, Nagaur Evaporite, Basement).
   - Glassmorphic telemetry HUD (`7-LAYER SOLID STRATA STREAM FLOW`, `245 BOPD`, `Steam: 220°C`, `Darcy Vel: 0.53 m/d`, `Core T: 112.4°C`, `Plume Front: 9.2m`).
   - Interactive stream pulse particles, Darcy velocity simulation, and dual solid/X-ray mode.

2. **X-Ray Isotherm Shells & Plume Model (`XRayReservoir3DModel.jsx`)**:
   - 4 volumetric shells from `>180°C` core down to `52°C–75°C` matrix.

3. **Thermal Sensitivity Sandbox & Isotherm Table**:
   - Live interactive thermodynamic sliders for Steam Temperature, Quality, Slug Volume, and Net Pay Sandstone Thickness.

4. **Downhole ESP Architecture & Continuous Wireline Depth Logger**:
   - Complete completion schematic with 3D WebGL model, interactive vector, and blueprint view.
   - Wireline depth log with real-time station probe inspector ($T(z)$, $P(z)$, $\mu(z)$, AOP risk).

5. **Thermodynamic Heat Partitioning & Asphaltene Onset Modeling**:
   - Boberg-Lantz / Marx-Langenheim heat distribution bars.
   - De Boer / Flory-Huggins AOP deficit tracking and pump barrel fouling rate alerts.

6. **Design Standards**:
   - **Dark typography** (`#1c1917`, `#431407`, `#7c2d12`, `#9a3412`).
   - **High-contrast deep orange** buttons (`#ea580c`).
   - **Zero blue/green/purple clutter**.
   - **Glassmorphic and transparent containers**.

---

## 📂 Directory Layout

```text
reservoir_thermal_twin_screen/
├── run_dev.sh                     # 1-Click launcher
├── README.md                      # Feature & setup documentation
├── IMPLEMENTATION.md              # Full merge & integration guide
├── backend/                       # Python FastAPI service
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # REST endpoints
│       ├── physics/               # Analytical thermal & viscosity engines
│       └── digital_twin/          # State management
└── frontend/                      # React Vite WebGL application
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx                # Standalone screen launcher
        ├── main.jsx
        ├── components/            # All 3D & 2D visualization components
        ├── assets/                # Background textures and cross-sections
        └── styles/                # digital_twin_3d.css
```
