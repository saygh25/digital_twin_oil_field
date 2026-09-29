# Baghewala Field Digital Twin — Notebooks Suite

This directory contains Jupyter notebooks to explore data, engineer features, train AI/ML models, and evaluate model performance. All models trained here serialize directly into the `models/` directory for consumption by the FastAPI backend.

---

## Directory Organization

```
d:/sih/notebooks/
├── README.md                                          # Directory documentation
│
├── exploration/                                       # Exploratory Data Analysis
│   └── 01_baghewala_eda.ipynb                         # Multi-source EDA & physics verification
│
└── model_dev/                                         # Model Training & Validation
    ├── 02_thermal_production_models.ipynb             # Trains Production, SOR, and Thermal models
    ├── 03_rod_floating_failure_risk.ipynb             # Trains Rod Floating & Failure Risk models
    └── 04_srp_anomaly_detection.ipynb                 # Trains 9D Isolation Forest on 46k telemetry snapshots
```

---

## Notebook Catalog

### 1. `exploration/01_baghewala_eda.ipynb`
- **Focus:** Multi-source dataset exploration and physics verification.
- **Datasets Analyzed:**
  - `data/raw/baghewala_css_dataset.csv`
  - `data/processed/srp_telemetry_processed.parquet` (pivoted from `train_rod` and `test_rod`)
  - `data/processed/volve_daily_production_processed.parquet`
- **Key Visualizations:**
  - Reservoir cooling curves vs. heavy oil viscosity escalation ($3,000\text{ cP} \to 21,000\text{ cP}$).
  - Dynamometer work loop areas vs. pump fillage percentage.
  - Distribution of rod loads and rod floating occurrences across 20 wells and 7 cycles.

### 2. `model_dev/02_thermal_production_models.ipynb`
- **Focus:** Thermal decay kinetics, oil rate forecasting, and Steam-Oil Ratio (SOR) optimization.
- **Dataset:** `data/external/baghewala_css_engineered_master.parquet` (or `data/processed/`).
- **Models Trained & Exported:**
  - `models/production/production_rf_v1.joblib` ($R^2 = 0.7918$, $\text{MAE} = 1.287\text{ BOPD}$)
  - `models/production/sor_gb_v1.joblib` ($R^2 = 0.9006$, $\text{MAE} = 0.408\text{ ton/bbl}$)
  - `models/reservoir/thermal_decay_gb_v1.joblib` ($R^2 = 0.9253$, $\text{MAE} = 0.78^\circ\text{C}$)

### 3. `model_dev/03_rod_floating_failure_risk.ipynb`
- **Focus:** Mechanical rod dynamics, downstroke drag, and equipment reliability.
- **Dataset:** `data/external/baghewala_css_engineered_master.parquet`.
- **Models Trained & Exported:**
  - `models/rod_floating/rod_floating_gb_v1.joblib` ($R^2 = 0.9981$, $\text{MAE} = 0.0003$)
  - `models/failure/failure_risk_gb_v1.joblib` (Goodman cyclic stress & pump unsetting classifier)

### 4. `model_dev/04_srp_anomaly_detection.ipynb`
- **Focus:** Real-time multi-variate anomaly detection on high-frequency SCADA telemetry.
- **Dataset:** `data/external/srp_telemetry_features_master.parquet` (46,112 hourly snapshots).
- **Models Trained & Exported:**
  - `models/anomaly/rod_telemetry_isolation_forest.joblib` (120 trees, 2.99% contamination rate)
  - `models/anomaly/telemetry_scaler.joblib`
  - `models/anomaly/telemetry_feature_names.joblib`

---

## Execution
Open any notebook in VS Code / Antigravity IDE or start a Jupyter server:
```bash
jupyter lab notebooks/
```
All notebooks read from `data/` and write model artifacts directly into `models/`.
