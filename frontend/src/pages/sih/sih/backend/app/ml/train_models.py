"""
Model Training Pipeline for Baghewala Heavy-Oil Digital Twin (FR-53..FR-56).
Trains:
1. Production Prediction Model (Random Forest / XGBoost Regressor) on baghewala_css_dataset.csv
2. Rod Floating Risk Model (Gradient Boosting Regressor)
3. Equipment Failure Risk Model
4. Anomaly Detection Isolation Forest on rod telemetry
"""
import os
import joblib
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest, RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

DATA_DIR = Path("data/raw")
MODELS_DIR = Path("models")


def train_all_models():
    print("=== STARTING AI/ML MODEL TRAINING PIPELINE ===")
    
    # 1. Train Production Forecast & Thermal Decline Models
    css_file = DATA_DIR / "baghewala_css_dataset.csv"
    if css_file.exists():
        print("--> Training Production & Thermal Models on baghewala_css_dataset.csv ...")
        df_css = pd.read_csv(css_file)
        
        feature_cols = [
            "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
            "injection_days", "soak_days", "production_days", "spm",
            "stroke_length_in", "vfd_frequency_hz", "peak_thermal_temperature_c",
            "end_production_temperature_c", "estimated_viscosity_at_production_cp"
        ]
        
        X = df_css[feature_cols].fillna(0)
        y_prod = df_css["oil_rate_bopd"]
        y_float = df_css["rod_floating_risk"]
        y_fail = df_css["rod_failure_risk"]

        X_train, X_test, y_p_train, y_p_test = train_test_split(X, y_prod, test_size=0.2, random_state=42)
        
        # Production Model
        model_prod = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
        model_prod.fit(X_train, y_p_train)
        p_preds = model_prod.predict(X_test)
        print(f"   [Production Model] R² Score: {r2_score(y_p_test, p_preds):.4f}, MAE: {mean_absolute_error(y_p_test, p_preds):.2f} bopd")
        
        prod_dir = MODELS_DIR / "production"
        prod_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_prod, prod_dir / "production_rf_v1.joblib")

        # Rod Floating Risk Model
        model_float = GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42)
        model_float.fit(X, y_float)
        float_dir = MODELS_DIR / "rod_floating"
        float_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_float, float_dir / "rod_floating_gb_v1.joblib")
        print("   [Rod Floating Model] Trained successfully.")

        # Failure Risk Model
        model_fail = GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42)
        model_fail.fit(X, y_fail)
        fail_dir = MODELS_DIR / "failure"
        fail_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_fail, fail_dir / "failure_risk_gb_v1.joblib")
        print("   [Failure Risk Model] Trained successfully.")

    # 2. Train Anomaly Detection on Rod Telemetry
    train_rod_file = DATA_DIR / "train_rod.parquet"
    if train_rod_file.exists():
        print("--> Training Unsupervised Anomaly Detection Isolation Forest on train_rod.parquet ...")
        df_rod = pd.read_parquet(train_rod_file)
        # Resample / pivot per well and forward fill
        df_pivot = df_rod.pivot_table(index=["well_id", "timestamp"], columns="parameter", values="value")
        df_pivot = df_pivot.ffill().bfill().fillna(0)
        
        if len(df_pivot) > 0:
            iso_forest = IsolationForest(n_estimators=100, contamination=0.03, random_state=42)
            iso_forest.fit(df_pivot)
            
            anom_dir = MODELS_DIR / "anomaly"
            anom_dir.mkdir(parents=True, exist_ok=True)
            joblib.dump(iso_forest, anom_dir / "rod_telemetry_isolation_forest.joblib")
            print(f"   [Anomaly Model] Trained on {len(df_pivot)} multi-variate telemetry snapshots.")

    print("=== MODEL TRAINING COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    train_all_models()
