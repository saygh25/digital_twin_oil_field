"""
Centralized AI/ML Model Management & Inference Service
Loads and manages all trained models stored in models/ folder:
- models/production/production_rf_v1.joblib
- models/production/sor_gb_v1.joblib
- models/reservoir/thermal_decay_gb_v1.joblib
- models/rod_floating/rod_floating_gb_v1.joblib
- models/failure/failure_risk_gb_v1.joblib
- models/anomaly/rod_telemetry_isolation_forest.joblib
- models/anomaly/telemetry_scaler.joblib
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from app.core.config import MODELS_DIR

logger = logging.getLogger(__name__)


class ModelRegistryService:
    _instance: Optional["ModelRegistryService"] = None

    def __init__(self):
        self.models_dir = MODELS_DIR
        self.prod_model = None
        self.sor_model = None
        self.thermal_model = None
        self.float_model = None
        self.fail_model = None
        self.anomaly_model = None
        self.telemetry_scaler = None
        self.telemetry_features: List[str] = []
        self.metrics: Dict[str, Any] = {}
        self.load_all_models()

    @classmethod
    def get_instance(cls) -> "ModelRegistryService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_all_models(self):
        """Loads all serialized models from the models/ directory."""
        logger.info(f"Loading models from: {self.models_dir.resolve()}")

        # 1. Production Forecaster
        prod_path = self.models_dir / "production" / "production_rf_v1.joblib"
        if prod_path.exists():
            try:
                self.prod_model = joblib.load(prod_path)
                logger.info(f"Loaded Production Model from {prod_path}")
            except Exception as e:
                logger.warning(f"Failed to load production model: {e}")

        # 2. SOR Model
        sor_path = self.models_dir / "production" / "sor_gb_v1.joblib"
        if sor_path.exists():
            try:
                self.sor_model = joblib.load(sor_path)
                logger.info(f"Loaded SOR Model from {sor_path}")
            except Exception as e:
                logger.warning(f"Failed to load SOR model: {e}")

        # 3. Thermal Decay Model
        th_path = self.models_dir / "reservoir" / "thermal_decay_gb_v1.joblib"
        if th_path.exists():
            try:
                self.thermal_model = joblib.load(th_path)
                logger.info(f"Loaded Thermal Decay Model from {th_path}")
            except Exception as e:
                logger.warning(f"Failed to load thermal decay model: {e}")

        # 4. Rod Floating Model
        float_path = self.models_dir / "rod_floating" / "rod_floating_gb_v1.joblib"
        if float_path.exists():
            try:
                self.float_model = joblib.load(float_path)
                logger.info(f"Loaded Rod Floating Model from {float_path}")
            except Exception as e:
                logger.warning(f"Failed to load rod floating model: {e}")

        # 5. Failure Risk Model
        fail_path = self.models_dir / "failure" / "failure_risk_gb_v1.joblib"
        if fail_path.exists():
            try:
                self.fail_model = joblib.load(fail_path)
                logger.info(f"Loaded Failure Risk Model from {fail_path}")
            except Exception as e:
                logger.warning(f"Failed to load failure risk model: {e}")

        # 6. Anomaly Detection Isolation Forest & Scaler
        anom_path = self.models_dir / "anomaly" / "rod_telemetry_isolation_forest.joblib"
        scaler_path = self.models_dir / "anomaly" / "telemetry_scaler.joblib"
        features_path = self.models_dir / "anomaly" / "telemetry_feature_names.joblib"

        if anom_path.exists():
            try:
                self.anomaly_model = joblib.load(anom_path)
                if scaler_path.exists():
                    self.telemetry_scaler = joblib.load(scaler_path)
                if features_path.exists():
                    self.telemetry_features = joblib.load(features_path)
                logger.info(f"Loaded Telemetry Anomaly Model from {anom_path}")
            except Exception as e:
                logger.warning(f"Failed to load anomaly model: {e}")

        # 7. Model Metrics
        metrics_path = self.models_dir / "model_metrics.json"
        if metrics_path.exists():
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
            except Exception:
                self.metrics = {}

    def predict_oil_rate_bopd(self, feat_dict: Dict[str, Any]) -> float:
        """Predicts daily oil production in BOPD."""
        if self.prod_model is not None:
            expected_cols = [
                "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
                "injection_days", "soak_days", "production_days", "spm",
                "stroke_length_in", "vfd_frequency_hz", "peak_thermal_temperature_c",
                "end_production_temperature_c", "estimated_viscosity_at_production_cp",
                "reservoir_pressure_ksc", "reservoir_temperature_c", "api_gravity_deg"
            ]
            row = {col: feat_dict.get(col, 0.0) for col in expected_cols}
            df = pd.DataFrame([row])
            return round(float(self.prod_model.predict(df)[0]), 2)
        # Physics fallback
        spm = feat_dict.get("spm", 4.2)
        stroke_m = feat_dict.get("stroke_length_in", 72.0) * 0.0254
        return round(0.00255 * stroke_m * spm * 1440.0 * 0.70 * 6.2898, 2)

    def predict_sor(self, feat_dict: Dict[str, Any]) -> float:
        """Predicts Steam-Oil Ratio (tonnes steam / bbl oil)."""
        if self.sor_model is not None:
            expected_cols = [
                "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
                "injection_days", "soak_days", "production_days", "spm",
                "stroke_length_in", "vfd_frequency_hz", "peak_thermal_temperature_c",
                "end_production_temperature_c", "estimated_viscosity_at_production_cp",
                "reservoir_pressure_ksc", "reservoir_temperature_c", "api_gravity_deg"
            ]
            row = {col: feat_dict.get(col, 0.0) for col in expected_cols}
            df = pd.DataFrame([row])
            return round(float(self.sor_model.predict(df)[0]), 2)
        steam = feat_dict.get("steam_injection_ton", 1500.0)
        oil_bbl = max(100.0, feat_dict.get("oil_production_bbl", 500.0))
        return round(steam / oil_bbl, 2)

    def predict_thermal_decay_c(self, feat_dict: Dict[str, Any]) -> float:
        """Predicts end-of-production temperature (°C) after steam soak."""
        if self.thermal_model is not None:
            expected_cols = [
                "css_cycle", "steam_injection_ton", "injection_pressure_ksc",
                "injection_days", "soak_days", "production_days",
                "peak_thermal_temperature_c", "reservoir_temperature_c"
            ]
            row = {col: feat_dict.get(col, 0.0) for col in expected_cols}
            df = pd.DataFrame([row])
            return round(float(self.thermal_model.predict(df)[0]), 1)
        peak_t = feat_dict.get("peak_thermal_temperature_c", 75.0)
        days = feat_dict.get("production_days", 45.0)
        return round(max(48.0, peak_t * np.exp(-0.015 * days)), 1)

    def predict_rod_floating_risk_pct(self, feat_dict: Dict[str, Any]) -> float:
        """Predicts Rod Floating Risk (0–100%)."""
        if self.float_model is not None:
            expected_cols = [
                "css_cycle", "spm", "stroke_length_in", "vfd_frequency_hz",
                "rod_load_lb", "pump_efficiency_fraction", "end_production_temperature_c",
                "estimated_viscosity_at_production_cp", "oil_rate_bopd", "water_cut_fraction"
            ]
            row = {col: feat_dict.get(col, 0.0) for col in expected_cols}
            df = pd.DataFrame([row])
            raw_val = float(self.float_model.predict(df)[0])
            # Model output is on ~0.007–0.08 scale, scale to 0–100%
            return round(min(100.0, max(0.0, raw_val * 1000.0)), 1)
        return 25.0

    def predict_failure_risk_pct(self, feat_dict: Dict[str, Any]) -> float:
        """Predicts Equipment Failure Risk (0–100%)."""
        if self.fail_model is not None:
            expected_cols = [
                "css_cycle", "spm", "stroke_length_in", "vfd_frequency_hz",
                "rod_load_lb", "pump_efficiency_fraction", "end_production_temperature_c",
                "estimated_viscosity_at_production_cp", "oil_rate_bopd", "water_cut_fraction"
            ]
            row = {col: feat_dict.get(col, 0.0) for col in expected_cols}
            df = pd.DataFrame([row])
            raw_val = float(self.fail_model.predict(df)[0])
            return round(min(100.0, max(5.0, raw_val * 450.0)), 1)
        return 35.0

    def evaluate_telemetry_anomaly(self, telem_row: Dict[str, float]) -> Dict[str, Any]:
        """Evaluates whether an SRP telemetry snapshot is anomalous using Isolation Forest."""
        if self.anomaly_model is None or self.telemetry_scaler is None:
            return {"is_anomaly": False, "score": 0.0, "status": "NORMAL"}

        cols = self.telemetry_features or [
            "spm", "pprl_kg", "mprl_kg", "dynamometer_area_work",
            "pump_fillage_pct", "tubing_pressure_bar", "casing_pressure_bar",
            "rod_load_range", "slack_ratio"
        ]

        vals = []
        for c in cols:
            vals.append(telem_row.get(c, 0.0))

        X = np.array([vals])
        X_scaled = self.telemetry_scaler.transform(X)
        pred = int(self.anomaly_model.predict(X_scaled)[0])
        score = float(self.anomaly_model.decision_function(X_scaled)[0])

        is_anom = bool(pred == -1)
        return {
            "is_anomaly": is_anom,
            "anomaly_score": round(score, 4),
            "status": "ANOMALOUS" if is_anom else "NORMAL"
        }

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Returns the model performance evaluation metrics."""
        return self.metrics


# Global singleton instance
model_service = ModelRegistryService.get_instance()
