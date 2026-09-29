# Baghewala Field Digital Twin — AI/ML Model Registry

This directory contains versioned and serialized model artifacts (`.joblib`), scalers, feature mappings, and evaluation metrics (`model_metrics.json`). All models are trained on datasets located in `data/` (`raw`, `processed`, and `external`).

---

## 1. Model Catalog & Architecture

| Model Name | Artifact File | Algorithm | Input Features | Target Variable | Performance Metrics |
|---|---|---|---|---|---|
| **Production Forecaster** | `models/production/production_rf_v1.joblib` | Gradient Boosting Regressor | `steam_injection_ton`, `css_cycle`, `viscosity`, `spm`, `stroke_length_in`, `reservoir_pressure_ksc`, `reservoir_temperature_c` | `oil_rate_bopd` | **R²: 0.7918**<br>MAE: 1.287 BOPD<br>RMSE: 1.734 BOPD |
| **Steam-Oil Ratio (SOR)** | `models/production/sor_gb_v1.joblib` | Gradient Boosting Regressor | `css_cycle`, `steam_injection_ton`, `injection_pressure_ksc`, `spm`, `viscosity` | `steam_oil_ratio_ton_per_bbl` | **R²: 0.9006**<br>MAE: 0.408 ton/bbl |
| **Reservoir Thermal Decay** | `models/reservoir/thermal_decay_gb_v1.joblib` | Gradient Boosting Regressor | `peak_thermal_temperature_c`, `steam_injection_ton`, `soak_days`, `production_days`, `reservoir_temp_c` | `end_production_temperature_c` | **R²: 0.9253**<br>MAE: 0.78 °C |
| **Rod Floating Risk** | `models/rod_floating/rod_floating_gb_v1.joblib` | Gradient Boosting Regressor | `rod_load_lb`, `spm`, `stroke_length_in`, `vfd_frequency_hz`, `viscosity_cp`, `end_prod_temp_c` | `rod_floating_risk` (0–100%) | **R²: 0.9981**<br>MAE: 0.0003 |
| **Equipment Failure Risk** | `models/failure/failure_risk_gb_v1.joblib` | Gradient Boosting Regressor | `pump_efficiency_fraction`, `rod_load_lb`, `spm`, `viscosity`, `water_cut_fraction`, `stroke_length_in` | `rod_failure_risk` (0–100%) | **R²: 0.1503**<br>MAE: 0.0198 |
| **SRP Telemetry Anomaly** | `models/anomaly/rod_telemetry_isolation_forest.joblib` | Unsupervised Isolation Forest (120 estimators) | `SPM`, `max_rod_weight`, `min_rod_weight`, `dynamometer_area`, `pump_fillage`, `tubing_pressure`, `casing_pressure`, `rod_load_range`, `slack_ratio` | Anomaly score (-1 outlier, +1 inlier) | Trained on 46,112 hourly snapshots<br>Outlier rate: 2.99% |

---

## 2. Preprocessing & Scaling Artifacts
- `models/anomaly/telemetry_scaler.joblib`: Standard scaler fit on the 9-dimensional multi-variate telemetry snapshots.
- `models/anomaly/telemetry_feature_names.joblib`: Ordered list of expected telemetry feature columns.
- `models/model_metrics.json`: Complete serialized evaluation metrics and feature importances.

---

## 3. Retraining Instructions
To retrain and update all models from the command line:
```bash
python backend/app/ml/train_perfect_models.py
```
Or interactively step through the notebooks in `notebooks/`:
- `notebooks/01_exploratory_data_analysis.ipynb`
- `notebooks/02_thermal_and_production_modeling.ipynb`
- `notebooks/03_rod_floating_and_failure_risk.ipynb`
- `notebooks/04_srp_telemetry_anomaly_detection.ipynb`
