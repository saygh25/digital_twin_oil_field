"""
Script to generate production-quality Jupyter Notebooks in notebooks/ and its subfolders:
1. notebooks/01_exploratory_data_analysis.ipynb
2. notebooks/02_thermal_and_production_modeling.ipynb
3. notebooks/03_rod_floating_and_failure_risk.ipynb
4. notebooks/04_srp_telemetry_anomaly_detection.ipynb
"""

import nbformat as nbf
from pathlib import Path

NOTEBOOKS_DIR = Path("notebooks")
EXPLORATION_DIR = NOTEBOOKS_DIR / "exploration"
MODEL_DEV_DIR = NOTEBOOKS_DIR / "model_dev"

EXPLORATION_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DEV_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------------------------------------------------------
# Notebook 1: Exploratory Data Analysis
# -----------------------------------------------------------------------------
def build_notebook_1():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_markdown_cell("""# Baghewala Field Digital Twin — Exploratory Data Analysis (EDA)
**Objective:** Analyze the 4 primary datasets across the production chain:
1. `data/raw/baghewala_css_dataset.csv` (10,000 CSS cycles, 20 wells)
2. `data/raw/train_rod.parquet` & `test_rod.parquet` (186,251 high-frequency SRP telemetry rows)
3. `data/raw/Volve production data.xlsx` (15,634 daily production records for analog decline benchmark)
4. Processed datasets in `data/processed/` and `data/external/`
"""))

    cells.append(nbf.v4.new_code_cell("""import os
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("Current Directory:", os.getcwd())
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 1. Load and Inspect Baghewala CSS Dataset"""))
    cells.append(nbf.v4.new_code_cell("""css_path = Path("data/raw/baghewala_css_dataset.csv")
df_css = pd.read_csv(css_path)
print(f"Baghewala CSS Dataset Shape: {df_css.shape}")
print(f"Unique Wells: {df_css['well_id'].nunique()}")
print(f"CSS Cycles Range: {df_css['css_cycle'].min()} to {df_css['css_cycle'].max()}")
df_css[['well_id', 'css_cycle', 'steam_injection_ton', 'oil_rate_bopd', 'steam_oil_ratio_ton_per_bbl', 'rod_floating_risk']].head()
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 2. Temperature Decline vs. Crude Viscosity Trajectory
Notice how as reservoir temperature cools from post-soak (~80°C) down to native reservoir baseline (46-48°C), heavy crude viscosity escalates from 3,000 cP up to >20,000 cP."""))
    cells.append(nbf.v4.new_code_cell("""temp_bins = pd.cut(df_css['end_production_temperature_c'], bins=8)
visc_trend = df_css.groupby(temp_bins)['estimated_viscosity_at_production_cp'].mean()
print("Temperature vs Average Viscosity (cP):")
print(visc_trend)
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 3. Sucker Rod Pump High-Frequency Telemetry
Inspect hourly dynacard indicators, load metrics, and pump fillage from `train_rod.parquet` & `test_rod.parquet`."""))
    cells.append(nbf.v4.new_code_cell("""pivoted_path = Path("data/processed/srp_telemetry_processed.parquet")
if pivoted_path.exists():
    df_telemetry = pd.read_parquet(pivoted_path)
    print(f"Pivoted Telemetry Shape: {df_telemetry.shape}")
    print(df_telemetry[['well_id', 'timestamp', 'spm', 'pprl_kn', 'mprl_kn', 'pump_fillage_pct', 'tubing_pressure_bar']].head())
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 4. Volve Analog Production Benchmark
Examine the North Sea conventional sandstone baseline for decline curve comparison."""))
    cells.append(nbf.v4.new_code_cell("""volve_proc = Path("data/processed/volve_daily_production_processed.parquet")
if volve_proc.exists():
    df_volve = pd.read_parquet(volve_proc)
    print(f"Volve Cleaned Shape: {df_volve.shape}")
    print(f"Producing Wells: {df_volve['well_bore_code'].nunique()}")
    print(f"Mean Oil Rate: {df_volve[df_volve['bore_oil_vol'] > 0]['bore_oil_vol'].mean():.2f} m3/day")
"""))

    nb.cells = cells
    
    # Save in exploration/
    p = EXPLORATION_DIR / "01_baghewala_eda.ipynb"
    with open(p, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Created {p}")


# -----------------------------------------------------------------------------
# Notebook 2: Thermal & Production Modeling
# -----------------------------------------------------------------------------
def build_notebook_2():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_markdown_cell("""# Baghewala Field Digital Twin — Thermal & Production Machine Learning Models
**Objective:** Train, evaluate, and serialize:
1. **Production Forecaster** (`oil_rate_bopd`) — Target $R^2 \approx 0.79$
2. **Steam-Oil Ratio (SOR) Model** (`steam_oil_ratio_ton_per_bbl`) — Target $R^2 \approx 0.90$
3. **Reservoir Thermal Decay Model** (`end_production_temperature_c`) — Target $R^2 \approx 0.92$

Artifacts saved directly to `models/production/` and `models/reservoir/`.
"""))

    cells.append(nbf.v4.new_code_cell("""from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

MODELS_DIR = Path("models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 1. Load Processed Master Dataset from `data/external/`"""))
    cells.append(nbf.v4.new_code_cell("""ext_path = Path("data/external/baghewala_css_engineered_master.parquet")
if ext_path.exists():
    df = pd.read_parquet(ext_path)
else:
    df = pd.read_parquet("data/processed/baghewala_css_processed.parquet")

print(f"Loaded {len(df)} records for training.")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 2. Train Production Forecasting Model (Oil Rate BOPD)"""))
    cells.append(nbf.v4.new_code_cell("""features = [
    "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
    "injection_days", "soak_days", "production_days", "spm",
    "stroke_length_in", "vfd_frequency_hz", "peak_thermal_temperature_c",
    "end_production_temperature_c", "estimated_viscosity_at_production_cp",
    "reservoir_pressure_ksc", "reservoir_temperature_c", "api_gravity_deg"
]

X = df[features].fillna(0)
y_prod = df["oil_rate_bopd"]

X_train, X_test, y_train, y_test = train_test_split(X, y_prod, test_size=0.2, random_state=42)

model_prod = GradientBoostingRegressor(n_estimators=150, learning_rate=0.08, max_depth=6, random_state=42)
model_prod.fit(X_train, y_train)

y_pred = model_prod.predict(X_test)
r2_prod = r2_score(y_test, y_pred)
mae_prod = mean_absolute_error(y_test, y_pred)
rmse_prod = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"Production Model Evaluation:")
print(f"  R² Score: {r2_prod:.4f}")
print(f"  MAE:      {mae_prod:.3f} BOPD")
print(f"  RMSE:     {rmse_prod:.3f} BOPD")

# Save to models/production/
prod_dir = MODELS_DIR / "production"
prod_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(model_prod, prod_dir / "production_rf_v1.joblib")
print(f"Saved artifact to {prod_dir / 'production_rf_v1.joblib'}")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 3. Feature Importance Analysis for Oil Recovery
Observe that steam injection volume, cycle sequence, viscosity, and SPM are the leading physical drivers."""))
    cells.append(nbf.v4.new_code_cell("""feat_importances = pd.Series(model_prod.feature_importances_, index=features).sort_values(ascending=False)
print("Top 8 Feature Importances:")
print(feat_importances.head(8))
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 4. Train Steam-Oil Ratio (SOR) Optimization Model"""))
    cells.append(nbf.v4.new_code_cell("""y_sor = df["steam_oil_ratio_ton_per_bbl"]
model_sor = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
model_sor.fit(X_train, y_sor.loc[X_train.index])
sor_pred = model_sor.predict(X_test)

print(f"SOR Model Evaluation:")
print(f"  R² Score: {r2_score(y_sor.loc[X_test.index], sor_pred):.4f}")
print(f"  MAE:      {mean_absolute_error(y_sor.loc[X_test.index], sor_pred):.3f} ton/bbl")

joblib.dump(model_sor, prod_dir / "sor_gb_v1.joblib")
print(f"Saved artifact to {prod_dir / 'sor_gb_v1.joblib'}")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 5. Train Reservoir Thermal Decay Model"""))
    cells.append(nbf.v4.new_code_cell("""thermal_features = [
    "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
    "injection_days", "soak_days", "production_days",
    "peak_thermal_temperature_c", "reservoir_temperature_c"
]
X_th = df[thermal_features].fillna(0)
y_th = df["end_production_temperature_c"]

X_th_train, X_th_test, y_th_train, y_th_test = train_test_split(X_th, y_th, test_size=0.2, random_state=42)
model_th = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
model_th.fit(X_th_train, y_th_train)
th_pred = model_th.predict(X_th_test)

print(f"Thermal Decay Model Evaluation:")
print(f"  R² Score: {r2_score(y_th_test, th_pred):.4f}")
print(f"  MAE:      {mean_absolute_error(y_th_test, th_pred):.2f} °C")

res_dir = MODELS_DIR / "reservoir"
res_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(model_th, res_dir / "thermal_decay_gb_v1.joblib")
print(f"Saved artifact to {res_dir / 'thermal_decay_gb_v1.joblib'}")
"""))

    nb.cells = cells
    # Save in model_dev/
    p = MODEL_DEV_DIR / "02_thermal_production_models.ipynb"
    with open(p, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Created {p}")


# -----------------------------------------------------------------------------
# Notebook 3: Rod Floating & Mechanical Failure Risk
# -----------------------------------------------------------------------------
def build_notebook_3():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_markdown_cell("""# Baghewala Field Digital Twin — Rod Floating & Failure Risk ML
**Objective:** Solve the core Baghewala mechanical problem:
1. **Rod Floating Prediction Model** — Downstroke viscous drag exceeds effective rod weight ($F_{\text{drag}} > W_{\text{buoyant}}$)
2. **Equipment Reliability & Fatigue Parting Classifier** — API RP 11L modified Goodman stress ratio & cyclic load range ($\Delta W = PPRL - MPRL$)

Artifacts saved directly to `models/rod_floating/` and `models/failure/`.
"""))

    cells.append(nbf.v4.new_code_cell("""from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error

MODELS_DIR = Path("models")
ext_path = Path("data/external/baghewala_css_engineered_master.parquet")
df = pd.read_parquet(ext_path)
print(f"Loaded {len(df)} records from {ext_path}")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 1. Train Rod Floating Risk Model
Inputs: `rod_load_lb`, `spm`, `stroke_length_in`, `vfd_frequency_hz`, `pump_efficiency_fraction`, `end_production_temperature_c`, `estimated_viscosity_at_production_cp`"""))
    cells.append(nbf.v4.new_code_cell("""mech_features = [
    "css_cycle", "spm", "stroke_length_in", "vfd_frequency_hz",
    "rod_load_lb", "pump_efficiency_fraction", "end_production_temperature_c",
    "estimated_viscosity_at_production_cp", "oil_rate_bopd", "water_cut_fraction"
]

X = df[mech_features].fillna(0)
y_float = df["rod_floating_risk"]

X_train, X_test, y_train, y_test = train_test_split(X, y_float, test_size=0.2, random_state=42)

model_float = GradientBoostingRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42)
model_float.fit(X_train, y_train)

y_pred_float = model_float.predict(X_test)
print(f"Rod Floating Model Evaluation:")
print(f"  R² Score: {r2_score(y_test, y_pred_float):.4f}")
print(f"  MAE:      {mean_absolute_error(y_test, y_pred_float):.4f}")

float_dir = MODELS_DIR / "rod_floating"
float_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(model_float, float_dir / "rod_floating_gb_v1.joblib")
print(f"Saved artifact to {float_dir / 'rod_floating_gb_v1.joblib'}")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 2. Train Equipment Failure Risk Model"""))
    cells.append(nbf.v4.new_code_cell("""y_fail = df["rod_failure_risk"]
X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X, y_fail, test_size=0.2, random_state=42)

model_fail = GradientBoostingRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42)
model_fail.fit(X_train_f, y_train_f)
y_pred_fail = model_fail.predict(X_test_f)

print(f"Failure Risk Model Evaluation:")
print(f"  R² Score: {r2_score(y_test_f, y_pred_fail):.4f}")
print(f"  MAE:      {mean_absolute_error(y_test_f, y_pred_fail):.4f}")

fail_dir = MODELS_DIR / "failure"
fail_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(model_fail, fail_dir / "failure_risk_gb_v1.joblib")
print(f"Saved artifact to {fail_dir / 'failure_risk_gb_v1.joblib'}")
"""))

    nb.cells = cells
    # Save in model_dev/
    p = MODEL_DEV_DIR / "03_rod_floating_failure_risk.ipynb"
    with open(p, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Created {p}")


# -----------------------------------------------------------------------------
# Notebook 4: Telemetry Anomaly Detection
# -----------------------------------------------------------------------------
def build_notebook_4():
    nb = nbf.v4.new_notebook()
    cells = []

    cells.append(nbf.v4.new_markdown_cell("""# Baghewala Field Digital Twin — SRP Telemetry Anomaly Detection
**Objective:** Train an Unsupervised Isolation Forest on 46,112 hourly multi-variate telemetry snapshots from `data/external/srp_telemetry_features_master.parquet`.

Detects:
- Severe fluid pound (collapsed fillage & dynacard work loop)
- Rod floating / slack conditions ($MPRL \to 0$)
- Gas locking & excessive cyclic load range ($\Delta W$)

Artifacts saved directly to `models/anomaly/`.
"""))

    cells.append(nbf.v4.new_code_cell("""from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

MODELS_DIR = Path("models")
telem_path = Path("data/external/srp_telemetry_features_master.parquet")
df_telem = pd.read_parquet(telem_path)
print(f"Loaded {len(df_telem)} pivoted telemetry records across {df_telem['well_id'].nunique()} wells.")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 1. Telemetry Feature Vector Preparation"""))
    cells.append(nbf.v4.new_code_cell("""# Map standardized columns to feature vector
df_telem['rod_load_range'] = df_telem['pprl_kg'] - df_telem['mprl_kg']
df_telem['slack_ratio'] = df_telem['mprl_kg'] / (df_telem['pprl_kg'] + 1.0)

feature_cols = [
    "spm", "pprl_kg", "mprl_kg", "dynamometer_area_work",
    "pump_fillage_pct", "tubing_pressure_bar", "casing_pressure_bar",
    "rod_load_range", "slack_ratio"
]

X_telem = df_telem[feature_cols].ffill().bfill().fillna(0).values

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_telem)
print(f"Feature matrix shape: {X_scaled.shape}")
"""))

    cells.append(nbf.v4.new_markdown_cell("""### 2. Train Unsupervised Isolation Forest Model"""))
    cells.append(nbf.v4.new_code_cell("""iso_forest = IsolationForest(
    n_estimators=120,
    contamination=0.03,  # Expect 3% operational anomalies
    random_state=42
)
iso_forest.fit(X_scaled)

preds = iso_forest.predict(X_scaled)
anom_count = int(np.sum(preds == -1))
print(f"Anomaly Detection Results:")
print(f"  Total Snapshots Evaluated: {len(X_scaled)}")
print(f"  Normal Operating Points:    {int(np.sum(preds == 1))}")
print(f"  Flagged Anomalies:         {anom_count} ({anom_count / len(X_scaled) * 100:.2f}%)")

anom_dir = MODELS_DIR / "anomaly"
anom_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(iso_forest, anom_dir / "rod_telemetry_isolation_forest.joblib")
joblib.dump(scaler, anom_dir / "telemetry_scaler.joblib")
joblib.dump(feature_cols, anom_dir / "telemetry_feature_names.joblib")
print(f"Saved artifacts to {anom_dir}")
"""))

    nb.cells = cells
    # Save in model_dev/
    p = MODEL_DEV_DIR / "04_srp_anomaly_detection.ipynb"
    with open(p, "w", encoding="utf-8") as f:
        nbf.write(nb, f)
    print(f"Created {p}")


if __name__ == "__main__":
    build_notebook_1()
    build_notebook_2()
    build_notebook_3()
    build_notebook_4()
    print("\nAll Jupyter Notebooks successfully generated!")
