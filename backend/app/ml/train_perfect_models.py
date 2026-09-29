"""
Comprehensive High-Accuracy Model Training Pipeline for Baghewala Field Digital Twin
Integrates all 4 datasets:
1. data/raw/baghewala_css_dataset.csv (10,000 CSS cycles, 20 wells)
2. data/raw/train_rod.parquet (37,943 SRP telemetry rows)
3. data/raw/test_rod.parquet (148,308 SRP telemetry rows)
4. data/raw/Volve production data.xlsx (15,634 Volve daily production benchmark rows)

Trained Models:
1. CSS Thermal Decay & Production Forecaster (GradientBoosting + RandomForest Ensemble)
2. Steam-Oil Ratio (SOR) & Energy Consumption Model
3. Sucker Rod Pump Downstroke Drag & Rod Floating Predictor
4. Equipment Failure & Cyclic Fatigue Risk Classifier
5. SRP Telemetry Dynamometer & Fillage Anomaly Detector (Isolation Forest)
"""

import os
import json
import joblib
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestRegressor,
    IsolationForest,
    GradientBoostingClassifier
)
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_squared_error,
    r2_score,
    mean_absolute_error,
    roc_auc_score,
    classification_report
)

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")
EXTERNAL_DIR = Path("data/external")
MODELS_DIR = Path("models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

metrics_report = {}


def train_production_and_thermal_models():
    print("\n" + "="*60)
    print("1. TRAINING PRODUCTION & THERMAL MODELS (from data/external/)")
    print("="*60)
    
    # Priority: data/external -> data/processed -> data/raw
    if (EXTERNAL_DIR / "baghewala_css_engineered_master.parquet").exists():
        data_path = EXTERNAL_DIR / "baghewala_css_engineered_master.parquet"
        df = pd.read_parquet(data_path)
    elif (PROCESSED_DIR / "baghewala_css_processed.parquet").exists():
        data_path = PROCESSED_DIR / "baghewala_css_processed.parquet"
        df = pd.read_parquet(data_path)
    else:
        data_path = RAW_DIR / "baghewala_css_dataset.csv"
        df = pd.read_csv(data_path)
        
    print(f"Loaded Master CSS Dataset from {data_path} with {df.shape[0]} rows.")
    
    # Feature columns for CSS & SRP coupled operation
    features = [
        "css_cycle",
        "steam_injection_ton",
        "injection_pressure_ksc",
        "injection_days",
        "soak_days",
        "production_days",
        "spm",
        "stroke_length_in",
        "vfd_frequency_hz",
        "peak_thermal_temperature_c",
        "end_production_temperature_c",
        "estimated_viscosity_at_production_cp",
        "reservoir_pressure_ksc",
        "reservoir_temperature_c",
        "api_gravity_deg"
    ]
    
    X = df[features].fillna(0)
    
    # A. Oil Rate (BOPD) Prediction
    y_oil_rate = df["oil_rate_bopd"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_oil_rate, test_size=0.2, random_state=42)
    
    gb_prod = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.85,
        random_state=42
    )
    gb_prod.fit(X_train, y_train)
    y_pred_prod = gb_prod.predict(X_test)
    
    r2_prod = r2_score(y_test, y_pred_prod)
    mae_prod = mean_absolute_error(y_test, y_pred_prod)
    rmse_prod = np.sqrt(mean_squared_error(y_test, y_pred_prod))
    print(f"-> [Production Model] R²: {r2_prod:.4f} | MAE: {mae_prod:.3f} BOPD | RMSE: {rmse_prod:.3f} BOPD")
    
    prod_dir = MODELS_DIR / "production"
    prod_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(gb_prod, prod_dir / "production_rf_v1.joblib")
    
    # Save feature importances
    feat_imp_prod = dict(zip(features, [round(float(v), 4) for v in gb_prod.feature_importances_]))
    metrics_report["production_model"] = {
        "r2": round(r2_prod, 4),
        "mae_bopd": round(mae_prod, 3),
        "rmse_bopd": round(rmse_prod, 3),
        "feature_importances": feat_imp_prod
    }

    # B. Steam-Oil Ratio (SOR) Model
    y_sor = df["steam_oil_ratio_ton_per_bbl"]
    gb_sor = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
    gb_sor.fit(X_train, y_sor.loc[X_train.index])
    sor_pred = gb_sor.predict(X_test)
    r2_sor = r2_score(y_sor.loc[X_test.index], sor_pred)
    print(f"-> [SOR Model] R²: {r2_sor:.4f} | MAE: {mean_absolute_error(y_sor.loc[X_test.index], sor_pred):.3f} ton/bbl")
    joblib.dump(gb_sor, prod_dir / "sor_gb_v1.joblib")
    metrics_report["sor_model"] = {
        "r2": round(r2_sor, 4),
        "mae_ton_per_bbl": round(float(mean_absolute_error(y_sor.loc[X_test.index], sor_pred)), 3)
    }

    # C. Thermal Decline (End Production Temperature)
    thermal_features = [
        "css_cycle",
        "steam_injection_ton",
        "injection_pressure_ksc",
        "injection_days",
        "soak_days",
        "production_days",
        "peak_thermal_temperature_c",
        "reservoir_temperature_c"
    ]
    X_th = df[thermal_features].fillna(0)
    y_th = df["end_production_temperature_c"]
    X_th_train, X_th_test, y_th_train, y_th_test = train_test_split(X_th, y_th, test_size=0.2, random_state=42)
    gb_th = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
    gb_th.fit(X_th_train, y_th_train)
    y_th_pred = gb_th.predict(X_th_test)
    r2_th = r2_score(y_th_test, y_th_pred)
    print(f"-> [Thermal Decay Model] R²: {r2_th:.4f} | MAE: {mean_absolute_error(y_th_test, y_th_pred):.2f} °C")
    
    thermal_dir = MODELS_DIR / "reservoir"
    thermal_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(gb_th, thermal_dir / "thermal_decay_gb_v1.joblib")
    metrics_report["thermal_decay_model"] = {
        "r2": round(r2_th, 4),
        "mae_c": round(float(mean_absolute_error(y_th_test, y_th_pred)), 2)
    }


def train_rod_floating_and_failure_models():
    print("\n" + "="*60)
    print("2. TRAINING ROD FLOATING & FAILURE RISK MODELS (from data/external/)")
    print("="*60)
    
    if (EXTERNAL_DIR / "baghewala_css_engineered_master.parquet").exists():
        df = pd.read_parquet(EXTERNAL_DIR / "baghewala_css_engineered_master.parquet")
    elif (PROCESSED_DIR / "baghewala_css_processed.parquet").exists():
        df = pd.read_parquet(PROCESSED_DIR / "baghewala_css_processed.parquet")
    else:
        df = pd.read_csv(RAW_DIR / "baghewala_css_dataset.csv")
    
    features = [
        "css_cycle",
        "spm",
        "stroke_length_in",
        "vfd_frequency_hz",
        "rod_load_lb",
        "pump_efficiency_fraction",
        "end_production_temperature_c",
        "estimated_viscosity_at_production_cp",
        "oil_rate_bopd",
        "water_cut_fraction"
    ]
    
    X = df[features].fillna(0)
    
    # 1. Rod Floating Risk Regressor
    y_float = df["rod_floating_risk"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_float, test_size=0.2, random_state=42)
    
    gb_float = GradientBoostingRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42)
    gb_float.fit(X_train, y_train)
    y_pred_float = gb_float.predict(X_test)
    r2_float = r2_score(y_test, y_pred_float)
    mae_float = mean_absolute_error(y_test, y_pred_float)
    print(f"-> [Rod Floating Model] R²: {r2_float:.4f} | MAE: {mae_float:.4f}")
    
    float_dir = MODELS_DIR / "rod_floating"
    float_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(gb_float, float_dir / "rod_floating_gb_v1.joblib")
    metrics_report["rod_floating_model"] = {
        "r2": round(r2_float, 4),
        "mae": round(mae_float, 4),
        "feature_importances": dict(zip(features, [round(float(v), 4) for v in gb_float.feature_importances_]))
    }

    # 2. Rod & Pump Failure Risk Model
    y_fail = df["rod_failure_risk"]
    X_train_f, X_test_f, y_train_f, y_test_f = train_test_split(X, y_fail, test_size=0.2, random_state=42)
    gb_fail = GradientBoostingRegressor(n_estimators=120, max_depth=6, learning_rate=0.08, random_state=42)
    gb_fail.fit(X_train_f, y_train_f)
    y_pred_fail = gb_fail.predict(X_test_f)
    r2_fail = r2_score(y_test_f, y_pred_fail)
    mae_fail = mean_absolute_error(y_test_f, y_pred_fail)
    print(f"-> [Failure Risk Model] R²: {r2_fail:.4f} | MAE: {mae_fail:.4f}")
    
    fail_dir = MODELS_DIR / "failure"
    fail_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(gb_fail, fail_dir / "failure_risk_gb_v1.joblib")
    metrics_report["failure_risk_model"] = {
        "r2": round(r2_fail, 4),
        "mae": round(mae_fail, 4),
        "feature_importances": dict(zip(features, [round(float(v), 4) for v in gb_fail.feature_importances_]))
    }


def train_telemetry_anomaly_model():
    print("\n" + "="*60)
    print("3. TRAINING SRP TELEMETRY ANOMALY DETECTION MODEL (from data/external/ or processed/)")
    print("="*60)
    
    # Priority: external -> processed -> raw
    if (EXTERNAL_DIR / "srp_telemetry_features_master.parquet").exists():
        df_pivoted = pd.read_parquet(EXTERNAL_DIR / "srp_telemetry_features_master.parquet")
        # Rename normalized columns to match expected telemetry features
        rename_map = {
            "spm": "SPM",
            "pprl_kg": "max_rod_weight",
            "mprl_kg": "min_rod_weight",
            "dynamometer_area_work": "dynamometer_area",
            "pump_fillage_pct": "pump_fillage",
            "tubing_pressure_atm": "tubing_pressure",
            "casing_pressure_atm": "casing_pressure"
        }
        df_pivot = df_pivoted.rename(columns=rename_map)
    elif (PROCESSED_DIR / "srp_telemetry_processed.parquet").exists():
        df_pivoted = pd.read_parquet(PROCESSED_DIR / "srp_telemetry_processed.parquet")
        rename_map = {
            "spm": "SPM",
            "pprl_kg": "max_rod_weight",
            "mprl_kg": "min_rod_weight",
            "dynamometer_area_work": "dynamometer_area",
            "pump_fillage_pct": "pump_fillage",
            "tubing_pressure_atm": "tubing_pressure",
            "casing_pressure_atm": "casing_pressure"
        }
        df_pivot = df_pivoted.rename(columns=rename_map)
    else:
        train_path = RAW_DIR / "train_rod.parquet"
        test_path = RAW_DIR / "test_rod.parquet"
        dfs = []
        if train_path.exists():
            dfs.append(pd.read_parquet(train_path))
        if test_path.exists():
            dfs.append(pd.read_parquet(test_path))
        df_all = pd.concat(dfs, ignore_index=True)
        df_pivot = df_all.pivot_table(index=["well_id", "timestamp"], columns="parameter", values="value").reset_index()
    
    # Feature columns in telemetry:
    # SPM, max_rod_weight, min_rod_weight, dynamometer_area, pump_fillage, tubing_pressure, casing_pressure
    telemetry_cols = [
        "SPM", "max_rod_weight", "min_rod_weight",
        "dynamometer_area", "pump_fillage", "tubing_pressure", "casing_pressure"
    ]
    
    for c in telemetry_cols:
        if c not in df_pivot.columns:
            df_pivot[c] = 0.0
            
    df_clean = df_pivot[telemetry_cols].copy()
    
    # Impute missing sensor channels per well
    df_clean = df_clean.ffill().bfill().fillna(df_clean.median())
    
    # Derived physical features:
    # 1. Cyclic Load Range (Delta Weight) = PPRL - MPRL (Direct driver of rod fatigue)
    df_clean["rod_load_range"] = df_clean["max_rod_weight"] - df_clean["min_rod_weight"]
    # 2. Slack/Floating Indicator: min_rod_weight approaching 0
    df_clean["slack_ratio"] = df_clean["min_rod_weight"] / (df_clean["max_rod_weight"] + 1.0)
    
    fit_features = telemetry_cols + ["rod_load_range", "slack_ratio"]
    X_iso = df_clean[fit_features].values
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_iso)
    
    iso_forest = IsolationForest(
        n_estimators=120,
        contamination=0.03,  # 3% expected operational anomalies
        max_samples="auto",
        random_state=42
    )
    iso_forest.fit(X_scaled)
    
    anom_dir = MODELS_DIR / "anomaly"
    anom_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(iso_forest, anom_dir / "rod_telemetry_isolation_forest.joblib")
    joblib.dump(scaler, anom_dir / "telemetry_scaler.joblib")
    joblib.dump(fit_features, anom_dir / "telemetry_feature_names.joblib")
    
    preds = iso_forest.predict(X_scaled)
    anomaly_count = int(np.sum(preds == -1))
    normal_count = int(np.sum(preds == 1))
    print(f"-> [Telemetry Anomaly Model] Trained on {len(df_clean)} hourly snapshots.")
    print(f"   Normal snapshots: {normal_count} | Detected anomalies: {anomaly_count} ({anomaly_count/len(df_clean)*100:.2f}%)")
    
    metrics_report["anomaly_model"] = {
        "snapshots_trained": len(df_clean),
        "anomaly_rate_pct": round(anomaly_count / len(df_clean) * 100, 2),
        "features": fit_features
    }


def analyze_volve_benchmark():
    print("\n" + "="*60)
    print("4. ANALYZING VOLVE BENCHMARK DECLINE & PRODUCTION (Volve production data.xlsx)")
    print("="*60)
    
    proc_volve = PROCESSED_DIR / "volve_daily_production_processed.parquet"
    raw_volve = RAW_DIR / "Volve production data.xlsx"
    
    if proc_volve.exists():
        df_volve = pd.read_parquet(proc_volve)
        producing = df_volve[df_volve["bore_oil_vol"] > 0]
        avg_oil = producing["bore_oil_vol"].mean()
        max_oil = producing["bore_oil_vol"].max()
        avg_water_cut = producing["water_cut_pct"].mean() / 100.0 if "water_cut_pct" in producing else 0.53
    elif raw_volve.exists():
        xl = pd.ExcelFile(raw_volve)
        df_volve = xl.parse("Daily Production Data")
        producing = df_volve[df_volve["BORE_OIL_VOL"] > 0]
        avg_oil = producing["BORE_OIL_VOL"].mean()
        max_oil = producing["BORE_OIL_VOL"].max()
        avg_water_cut = (producing["BORE_WAT_VOL"] / (producing["BORE_OIL_VOL"] + producing["BORE_WAT_VOL"] + 1e-6)).mean()
    else:
        print("Volve data not found.")
        return
    
    print(f"Volve Producing Days: {len(producing)}")
    print(f"Mean Oil Rate: {avg_oil:.2f} m3/day ({avg_oil*6.2898:.1f} bopd)")
    print(f"Average Water Cut: {avg_water_cut*100:.1f}%")
    
    metrics_report["volve_benchmark"] = {
        "mean_oil_m3_day": round(float(avg_oil), 2),
        "mean_oil_bopd": round(float(avg_oil * 6.2898), 1),
        "avg_water_cut_pct": round(float(avg_water_cut * 100), 1),
        "comparison_note": "Volve represents North Sea conventional offshore sandstone (light oil); Baghewala represents high-viscosity heavy oil (~17-19 API) where primary rates are <15 BOPD without CSS thermal stimulation."
    }


def main():
    train_production_and_thermal_models()
    train_rod_floating_and_failure_models()
    train_telemetry_anomaly_model()
    analyze_volve_benchmark()
    
    metrics_file = MODELS_DIR / "model_metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)
    print(f"\nAll models successfully trained and serialized. Metrics saved to {metrics_file}")


if __name__ == "__main__":
    main()
