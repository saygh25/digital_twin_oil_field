# PROJECT CONTEXT — Baghewala Heavy-Oil Digital Twin (CSS + SRP Well-to-Surface Optimization)

> **Purpose of this file:** This is the authoritative, no-compromise context document for this project. It is meant to be loaded by an AI coding assistant (Antigravity IDE) at the start of every session so the assistant has full, durable understanding of the system being built — without needing the original SRS re-pasted. Keep this file updated as the single source of truth for scope, architecture, and progress. Update the **"Current Progress"** section every time meaningful work is done.

---

## 0. How to use this document

- Treat **Sections 1–9** as **frozen requirements context** (derived from the approved SRS v1.0). Do not silently reinterpret scope — if an implementation decision conflicts with the SRS, flag it explicitly rather than deviating quietly.
- Treat **Section 10 ("Current Progress")** as the **living state of the repository**. Update it after every work session: what was built, what was decided, what is stubbed, what is still TODO.
- Treat **Section 11 ("Open Decisions / Assumptions")** as a running log of judgment calls made in the absence of a fully specified detail (e.g., exact DB schema types, exact ML algorithm choice). Anything logged here is a candidate for stakeholder review later.
- The system integrates physics-based modeling with AI/ML — do not "hallucinate" reservoir or mechanical physics; where a physics relationship is asserted (e.g., viscosity vs. temperature), implement it as a clearly labeled, swappable model component, not a magic constant.

---

## 1. System Identity

| Field | Value |
|---|---|
| System name | AI-Enabled Well-to-Surface Digital Twin |
| Domain | Heavy-oil production, Thermal EOR (CSS), Artificial Lift (Sucker Rod Pump), Predictive Maintenance, Production Optimization |
| Field | Baghewala Field, Rajasthan, India |
| Reservoir | Jodhpur Sandstone, ~17–19° API heavy crude |
| Reservoir conditions | High viscosity, high asphaltene content, low pressure, low temperature (~46–48°C), poor primary-recovery mobility |
| Core production chain modeled | Reservoir → Wellbore → Sucker Rod Pump (SRP) → Surface Production System |
| SRS version | 1.0 |

## 2. Problem Statement (why this system exists)

CSS (Cyclic Steam Stimulation) improves oil mobility via thermal stimulation, but reservoir temperature decays after injection, increasing crude viscosity and reducing mobility. This chain reaction —

```
Reservoir cooling → viscosity ↑ → mobility ↓ → production ↓ → pump loading changes →
rod loading ↑ → possible rod floating / impact loading → higher failure risk
```

— means **CSS and SRP operation are mechanically and thermally coupled and must not be optimized independently**. The system's core value proposition is to move operations from *separate, reactive* CSS/SRP management to an *integrated, predictive, constraint-aware* optimization framework.

## 3. Top-Level Objectives

1. **Reservoir/Thermal**: predict temperature, cooling trend, viscosity, mobility from steam/production history.
2. **CSS**: optimize steam volume, injection pressure/duration, soak time, production cut-off; reduce SOR (Steam-Oil Ratio) and steam waste.
3. **SRP**: optimize stroke length, SPM (strokes/min), VFD settings; monitor pump loading/efficiency; detect rod floating; reduce impact loading.
4. **Predictive Maintenance**: rod/pump failure risk scoring; abnormal-condition detection; preventive maintenance support.
5. **Production**: forecast oil production, detect decline, evaluate "what-if" CSS/SRP scenarios.
6. **Explainability**: every AI recommendation must ship with a human-readable reason and contributing factors — never a black-box number alone.
7. **Safety**: the system is **decision-support only**. It must never auto-actuate field equipment without an explicit, separately validated control/safety layer (see Section 8.6).

## 4. Stakeholders & Roles (RBAC model)

| Role | Primary access |
|---|---|
| Administrator | All modules — users, roles, config, well mgmt, model versions, logs |
| Field Operator | Monitoring + alerts + recommendations (view/acknowledge, record actions) |
| Production Engineer | Production history, CSS comparison, SOR, forecasts, optimization scenarios |
| Reservoir Engineer | Reservoir pressure/temperature, thermal model, CSS scenario evaluation |
| Artificial Lift Engineer | SRP performance, rod load, pump efficiency, rod floating, failure predictions |
| Maintenance Engineer | Equipment health, failure risk, maintenance scheduling |
| Field Manager / Management | Production/energy/reliability KPIs and reports |
| Data Scientist | Model training/validation/versioning |
| System Administrator | Users, config, system availability |

RBAC enforcement is mandatory at the API layer, not just UI hiding.

## 5. Major Subsystems (18 modules from SRS §7)

1. Data Acquisition
2. Data Validation & Processing
3. Well Digital Twin (core state container)
4. Reservoir/Thermal Model
5. Wellbore Model
6. SRP Digital Twin
7. Production Prediction
8. Anomaly Detection
9. Failure Prediction
10. CSS Optimization
11. SRP Optimization
12. Joint (CSS+SRP) Optimization
13. Explainability
14. Alert & Recommendation Engine
15. Dashboard & Visualization
16. Database & Data Management
17. User & Access Management
18. Audit & Logging

## 6. End-to-End Data / Control Flow

```
Field Measurements
   → Data Validation (VALID / SUSPECT / MISSING / OUTLIER / INVALID)
   → Feature Engineering (decline rate, ΔT rate, ΔP rate, est. viscosity, pump-load indicators,
      rod-load fluctuation, energy, SOR, cycle performance)
   → Digital Twin State Estimation (Reservoir / Wellbore / SRP / Surface, physics + AI/ML)
   → Predicted Well State
   → Risk & Anomaly Analysis (anomaly detection, rod floating, failure risk)
   → Optimization (CSS / SRP / Joint, constraint-aware)
   → Recommendation (with explanation + confidence)
   → Operator review (GENERATED → REVIEWED → ACCEPTED/REJECTED → ACTION TAKEN → RESULT OBSERVED)
   → New field data → Digital Twin update (continuous feedback loop)
```

This feedback loop (SRS §40) is also the basis for **online model evaluation**: recommended action vs. actual outcome is stored and used to assess/retrain models over time.

## 7. Functional Requirements — Condensed Reference (full IDs preserved for traceability)

> Full requirement text lives in the original SRS; this table is the working index. When implementing, cite the FR-ID in commit messages / PR descriptions / docstrings so behavior stays traceable.

| Area | FR IDs | Summary |
|---|---|---|
| Auth & Authz | FR-01, FR-02 | Login, session mgmt, audit of auth events; strict RBAC per role table above |
| Well Management | FR-03, FR-04 | Well registration (ID, location, completion, reservoir, lift type, SRP config, CSS history); configurable operating limits (pressure, temp, SPM, stroke, VFD, steam) |
| Data Acquisition | FR-05, FR-06, FR-07 | Historical import (production, CSS, steam, SRP/VFD, rod/pump failure, reservoir, completion, fluid, P/T); periodic ingestion; validation flags invalid data rather than silently using it |
| Data Processing | FR-08, FR-09 | Cleaning (missing values, outliers, timestamp alignment, unit normalization, dedup, sensor QC); feature engineering (decline rate, ΔT, ΔP, viscosity est., pump/rod load indicators, energy, SOR, cycle KPIs) |
| Digital Twin Core | FR-10, FR-11, FR-12 | Per-well digital representation; state updates on new data; historical state reconstruction per cycle/period |
| Reservoir/Thermal | FR-13–FR-16 | Temperature prediction from steam/injection/history; cooling-rate estimation; viscosity estimation (T↑ ⇒ μ↓ ⇒ mobility↑); production-response prediction for candidate CSS params |
| CSS Management | FR-17–FR-20 | Cycle recording (volume, pressure, duration, soak, production, SOR, energy); historical comparison; outcome prediction; constrained optimization over steam volume/pressure/duration/soak/cut-off |
| SRP Monitoring | FR-21–FR-23 | Parameter monitoring (stroke, SPM, VFD, motor load, rod load, pump performance); efficiency estimation; trend visualization |
| Rod Floating | FR-24, FR-25 | Detection using rod load/position/velocity/acceleration/dynamometer/motor-load/SPM/fluid data; alert with risk level, signals, confidence, contributing factors, recommended action |
| Anomaly Detection | FR-26, FR-27 | Multivariate anomaly detection (Isolation Forest / Autoencoder / One-Class SVM / statistical); classification into thermal/production/pump/rod-load/sensor/operational anomalies |
| Failure Prediction | FR-28–FR-30 | Rod failure risk; pump unsetting/abnormal-operation risk; normalized 0–100% risk score with configurable Low/Moderate/High/Critical thresholds |
| Production Prediction | FR-31–FR-33 | Multi-horizon forecast (hours/day/days/next cycle); decline prediction; scenario-conditioned production prediction |
| Energy & SOR | FR-34, FR-35 | SOR = Steam Injected / Oil Produced (current, historical, cycle-wise, predicted); SRP + steam energy consumption, energy/bbl |
| SRP Optimization | FR-36–FR-38 | Optimize stroke/SPM/VFD; balance production, efficiency, energy, rod load, failure risk; hard constraint enforcement (never recommend outside configured limits) |
| Joint Optimization | FR-39–FR-41 | Joint CSS+SRP evaluation; configurable multi-objective function `J = w1·SOR + w2·Energy + w3·FailureRisk − w4·Production`; scenario comparison table (no auto-execution) |
| Recommendations | FR-42, FR-43 | Actionable recommendations (modify CSS/SRP params, inspect pump/rods, monitor, schedule maintenance) each with reason + contributing factors |
| Explainable AI | FR-44, FR-45 | Feature attribution (SHAP / feature importance / sensitivity / physics-based); confidence tiers (High/Moderate/Low); never present uncertain predictions as guaranteed |
| Dashboard | FR-46–FR-49 | Well overview; Digital Twin visualization (Reservoir→Wellbore→SRP→Surface, drill-down); historical trend charts; alert dashboard (severity, timestamp, well, type, response, ack status) |
| Reporting | FR-50–FR-52 | Well report, CSS cycle report, equipment health report |
| AI/ML Lifecycle | FR-53–FR-56 | Training on historical data; validation (regression: MAE/RMSE/MAPE/R²; classification: precision/recall/F1/ROC-AUC/PR-AUC; forecasting: MAE/RMSE/MAPE/bias); versioning (name, version, train date, dataset version, metrics, deployment status); drift/degradation monitoring |

## 8. Non-Functional, Safety & Data-Quality Requirements

### 8.1 Performance / Availability / Scalability
- Dashboard requests: interactive response times under expected load; heavy optimization/training jobs run **asynchronously** (job queue, not blocking API calls).
- Architecture must scale from a single well to a multi-well fleet without redesign (wells, sensors, models, cycles, users are all horizontally addable).

### 8.2 Reliability & Data Integrity
- System tolerates temporary data gaps without crashing.
- Historical operational records are **never silently overwritten**; changes to important operational data are logged (append/versioned, not destructive update).

### 8.3 Security
- Authentication, RBAC authorization, secure password storage (hashed, salted), encrypted communication (TLS), input validation, audit logging, session management.

### 8.4 Explainability & Usability (cross-cutting, not a bolt-on)
- Every AI-facing surface (dashboard cards, alerts, recommendations) must present complex model output in a field-engineer-understandable format — this is a first-class UI requirement, not a "nice to have."

### 8.5 Data Quality States
Every incoming measurement is tagged: `VALID | SUSPECT | MISSING | OUTLIER | INVALID`. The AI pipeline must never silently treat `MISSING`/`INVALID` as a real observation. Estimated/imputed values must be flagged as estimated wherever surfaced.

### 8.6 Safety (hard constraint — do not weaken in implementation)
- This is a **decision-support and optimization system**, not a closed-loop controller.
- The system **shall not** automatically modify critical field operating parameters unless an explicitly implemented, separately authorized control-integration + safety mechanism exists (out of scope for v1).
- All recommendations must respect configured operational constraints (pressure, temperature, SPM, stroke, VFD, equipment limits). A **safety override always takes precedence over optimization objectives** — i.e., the optimizer is constrained-first, objective-second.

### 8.7 Model Uncertainty
- Predictions should ship as `{predicted value, prediction interval, confidence tier}` — never a bare point estimate presented as ground truth.

### 8.8 Model Validation Strategy
- Time-respecting split: older cycles → train, more recent → validation, latest unseen → test. **No temporal leakage.**
- Failure prediction must explicitly handle class imbalance (failures are rare events) — e.g., class weighting, resampling, PR-AUC as primary metric rather than accuracy.

## 9. Data Model (core tables, from SRS §27)

- **Well**: well_id, well_name, location, reservoir_id, completion_data, status
- **Reservoir**: reservoir_id, temperature, pressure, fluid properties, geological parameters
- **CSS_Cycle**: cycle_id, well_id, injection_volume, injection_pressure, injection_duration, soak_duration, production_duration, production_result, SOR
- **SRP**: srp_id, well_id, stroke, SPM, VFD, pump_specifications
- **Sensor_Data**: timestamp, well_id, sensor_id, parameter, value, unit, quality_flag
- **Failure**: failure_id, well_id, failure_type, timestamp, component, description, maintenance_action
- **Prediction**: prediction_id, well_id, model, prediction_type, prediction_value, confidence, timestamp
- **Recommendation**: recommendation_id, well_id, recommendation, reason, timestamp, status (GENERATED → REVIEWED → ACCEPTED/REJECTED → ACTION TAKEN → RESULT OBSERVED)

### 9.1 REST API surface (from SRS §28 — treat as the contract to implement against)

```
POST /api/auth/login
POST /api/auth/logout

GET  /api/wells
GET  /api/wells/{well_id}
POST /api/wells
PUT  /api/wells/{well_id}

GET  /api/wells/{well_id}/production
GET  /api/wells/{well_id}/forecast

GET  /api/wells/{well_id}/css
POST /api/wells/{well_id}/css/cycle
POST /api/wells/{well_id}/css/optimize

GET  /api/wells/{well_id}/srp
POST /api/wells/{well_id}/srp/optimize

GET  /api/wells/{well_id}/digital-twin/state
POST /api/wells/{well_id}/digital-twin/update

GET  /api/wells/{well_id}/predictions
POST /api/predictions/run

GET  /api/wells/{well_id}/anomalies
POST /api/anomalies/detect

GET  /api/wells/{well_id}/failure-risk

GET  /api/wells/{well_id}/recommendations
POST /api/recommendations/{id}/acknowledge
```

## 10. Approved Technology Stack

| Layer | Choice |
|---|---|
| Frontend | React.js + Vite, Recharts (charts), Three.js (optional 3D twin visualization) |
| Backend | Python, FastAPI |
| Data processing | Pandas, NumPy, SciPy |
| ML | scikit-learn, XGBoost, PyTorch (only where deep learning is actually warranted) |
| Optimization | SciPy Optimize, Optuna, Pyomo (or equivalent constrained-optimization framework) |
| Database | PostgreSQL (+ time-series extension, e.g. TimescaleDB, for sensor data) |
| Deployment | Docker, Docker Compose |

Architectural note: keep **physics-based model components** (reservoir/thermal, viscosity correlation) as clearly separated, swappable modules distinct from the **data-driven AI/ML models** — the SRS treats these as two collaborating layers (§34), not one blended model, and this must be reflected in code module boundaries (`physics/` vs `ml/`).

## 11. Acceptance Criteria (SRS §42 — definition of "functionally complete" for v1)

The system is acceptable when it can: import/validate historical data; represent a well digitally; display reservoir/wellbore/SRP state; calculate SOR; show CSS cycle history/comparison; predict production from validated data; estimate thermal response; detect defined abnormal SRP patterns; generate rod/pump failure-risk predictions; optimize CSS within constraints; optimize SRP within constraints; evaluate joint CSS-SRP scenarios; display explainable recommendations; generate alerts; enforce RBAC; maintain audit logs; generate well/operational reports.

## 12. Explicit Limitations (acknowledge, do not paper over)

1. Model accuracy is bounded by historical data quality/quantity.
2. Failure prediction is limited by how few recorded failure events exist (severe class imbalance).
3. The Digital Twin is a simplification of true reservoir behavior.
4. Sensor errors propagate into predictions.
5. AI outputs are estimates, never guaranteed physical outcomes.
6. Field deployment requires engineering validation against real constraints.
7. Automatic control must not be enabled without dedicated safety/control-system validation (see §8.6).
8. Optimization results depend entirely on configured limits and objective-function weights — these must be exposed as config, not hardcoded.

## 13. Deferred / Future Scope (do not build in v1 unless asked)

- Reinforcement-learning operational policy agent (constrained).
- High-fidelity reservoir simulator integration.
- Multi-well fleet management.
- Closed-loop automated control (post safety validation only).
- Remaining-useful-life survival/prognostic models for rods/pumps.
- Economic optimization layer (steam cost, electricity cost, maintenance cost, oil value/revenue).

---

## 14. Current Progress

> **Status: Core Scaffolding, Data Model, Physics Modules, Digital Twin Engine, and API Vertical Slices Implemented & Tested.**

### 14.1 Completed Work
1. **Repository Structure**: Full modular directory layout generated matching Section 5 & 10 (`backend/`, `frontend/`, `data/`, `models/`, `docs/`, `docker/`, `scripts/`, `infra/`).
2. **Data Model & ORM (FR-01..FR-04, §9)**:
   - Full SQLAlchemy ORM implementations in [`backend/app/db/models.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/db/models.py) for all 8 core entities (`Well`, `Reservoir`, `CSSCycle`, `SRP`, `SensorData`, `Failure`, `Prediction`, `Recommendation`) plus `User` (RBAC) and `AuditLog`.
   - SQLite/PostgreSQL dynamic session management in [`backend/app/db/session.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/db/session.py).
   - Domain schemas in [`backend/app/schemas/domain.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/schemas/domain.py).
3. **Physics Modeling Layer (§34, FR-13..FR-16, FR-21..FR-25)**:
   - Andrade crude viscosity model for Baghewala heavy crude in [`backend/app/physics/viscosity.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/physics/viscosity.py).
   - CSS thermal decay, cooling rate, and heated radius in [`backend/app/physics/thermal.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/physics/thermal.py).
   - SRP mechanics, PPRL/MPRL, downstroke viscous drag, volumetric efficiency, and rod floating risk calculator in [`backend/app/physics/srp_mechanics.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/physics/srp_mechanics.py).
4. **Digital Twin Core State Container (FR-10..FR-12)**:
   - Live coupled state synthesizer across Reservoir, Wellbore, SRP, and Surface in [`backend/app/digital_twin/state.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/digital_twin/state.py).
5. **Optimization & Explainability (FR-36..FR-45)**:
   - Multi-objective constrained optimizer in [`backend/app/optimization/joint/optimizer.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/optimization/joint/optimizer.py) balancing SOR, energy, and failure risk against production.
6. **API Endpoints (SRS §28, §9.1)**:
   - FastAPI routers mounted in [`backend/app/main.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/app/main.py): `/api/auth`, `/api/wells`, `/api/wells/{id}/digital-twin/state`, `/api/wells/{id}/css`, `/api/wells/{id}/srp`, `/api/wells/{id}/production`, `/api/predictions`, `/api/anomalies`, `/api/failure-risk`, `/api/recommendations`.
7. **Verification & Tests**:
   - Unit test suite in [`backend/tests/unit/test_physics_and_twin.py`](file:///c:/Users/ANINDITA/OneDrive/Desktop/sih/backend/tests/unit/test_physics_and_twin.py) verifying physics formulas, thermal decay, rod floating mechanics, twin state container, and optimizer (5/5 tests passing).

### 14.2 Immediate Next Steps
1. Ingest sample historical CSV data for Baghewala CSS cycles & sensor readings (FR-05..FR-09).
2. Wire up the interactive React frontend dashboard components (SRS §25) connecting to the backend endpoints.
3. Add interactive dynamometer card visualization (polished rod load vs. position) and thermal decay trajectory charts.

### 14.3 Update Log
- **2026-09-25** — Project scaffolding bootstrapped from `setup_project_structure.sh`. Implemented complete SQLAlchemy ORM data models, domain schemas, physics modules (viscosity, CSS thermal decay, SRP mechanics & rod floating), Digital Twin state container, joint multi-objective optimizer, FastAPI REST endpoints, and verified passing unit tests.

---

## 15. Open Decisions / Assumptions Log

> The SRS deliberately leaves some implementation details open ("possible approaches include...", "a suitable approach is..."). Log every judgment call here so it can be revisited.

| # | Topic | SRS language | Decision taken (or "not yet decided") | Rationale |
|---|---|---|---|---|
| 1 | Anomaly detection algorithm | "Possible approaches include Isolation Forest / Autoencoder / One-Class SVM / statistical" | Not yet decided | Needs a first look at real sensor data distribution before choosing |
| 2 | Optimization framework | "SciPy Optimize / Optuna / Pyomo or another suitable framework" | Not yet decided | Depends on whether constraints are linear/nonlinear/mixed-integer once formalized |
| 3 | Time-series DB | "Time-series extension/database where appropriate" | Leaning TimescaleDB on Postgres (keeps single DB engine) | Avoids operating two database systems for v1 |
| 4 | Joint objective weights `w1..w4` | "Configurable" | Not yet decided — must be exposed via admin config, default values TBD with domain expert | Weights materially change recommended operating points; must not be silently hardcoded |
| 5 | Failure risk thresholds | "Configurable... validated against operational requirements" | Default 0–25/25–50/50–75/75–100% per SRS example, marked overridable in config | Matches SRS example; needs field validation |

---

*End of context document. Keep this file in the repo root (or wherever the IDE assistant loads persistent context from) and update Sections 14 and 15 continuously.*
