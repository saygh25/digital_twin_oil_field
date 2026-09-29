"""
Training and serialization of Joint CSS + SRP Multi-Objective Optimizer Surrogates
Trained directly on data/raw/baghewala_css_srp_integrated_dataset.csv (10,000 records).
"""
import os
import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

ROOT = Path(__file__).resolve().parents[4]
DATA_PATH = ROOT / "data" / "raw" / "baghewala_css_srp_integrated_dataset.csv"
SAVE_DIR = ROOT / "models" / "joint_optimization"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

def train_and_save_joint_surrogates():
    print(f"Loading {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} records across {df['well_id'].nunique()} wells.")

    # Core feature set for coupled CSS + SRP evaluation
    feature_cols = [
        "steam_injection_ton",
        "injection_pressure_ksc",
        "soak_days",
        "production_days",
        "spm",
        "stroke_length_in",
        "vfd_frequency_hz",
        "reservoir_temperature_c",
        "reservoir_pressure_ksc",
        "oil_viscosity_50c_cp",
        "api_gravity_deg"
    ]

    X = df[feature_cols].copy()

    targets = {
        "oil_rate_bopd": ("prod_model.joblib", 90, 5),
        "oil_steam_ratio_bbl_per_ton": ("osr_model.joblib", 80, 5),
        "rod_floating_risk": ("float_model.joblib", 80, 5),
        "rod_failure_risk": ("fail_model.joblib", 60, 4),
        "polished_rod_load_max_lb": ("pprl_model.joblib", 80, 5),
        "polished_rod_load_min_lb": ("mprl_model.joblib", 60, 4),
        "srp_power_kw": ("power_model.joblib", 80, 5),
        "total_energy_kwh": ("energy_model.joblib", 80, 5),
        "end_production_temperature_c": ("temp_model.joblib", 60, 4),
        "estimated_viscosity_at_production_cp": ("visc_model.joblib", 60, 4)
    }

    metrics = {}

    for target_col, (fname, n_est, depth) in targets.items():
        y = df[target_col].copy()
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
        model = GradientBoostingRegressor(
            n_estimators=n_est,
            max_depth=depth,
            learning_rate=0.09,
            subsample=0.85,
            random_state=42
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        r2 = float(r2_score(y_test, preds))
        mae = float(mean_absolute_error(y_test, preds))
        print(f"  Target: {target_col:35s} | R²: {r2:.4f} | MAE: {mae:.4f}")
        joblib.dump(model, SAVE_DIR / fname)
        metrics[target_col] = {"r2": round(r2, 4), "mae": round(mae, 4), "file": fname}

    # Save feature metadata
    metadata = {
        "features": feature_cols,
        "dataset_records": len(df),
        "dataset_wells": int(df["well_id"].nunique()),
        "metrics": metrics
    }
    joblib.dump(metadata, SAVE_DIR / "metadata.joblib")
    print(f"All models saved successfully to {SAVE_DIR}")

if __name__ == "__main__":
    train_and_save_joint_surrogates()
