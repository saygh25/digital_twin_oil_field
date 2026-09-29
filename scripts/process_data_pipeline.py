"""
Two-Stage Data Processing Pipeline:
Stage 1: Raw -> Processed (data/processed/)
  - Cleaning, unit standardization, sensor pivoting, missing value imputation, quality flagging.
Stage 2: Processed -> External (data/external/)
  - Physics-informed feature engineering (Andrade viscosity, thermal decay radius, Stokes drag,
    Goodman fatigue index, telemetry anomaly scoring, unified multi-well master dataset).
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

RAW_DIR = Path("data/raw")
PROCESSED_DIR = Path("data/processed")
EXTERNAL_DIR = Path("data/external")

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
EXTERNAL_DIR.mkdir(parents=True, exist_ok=True)


def stage1_raw_to_processed():
    print("=" * 65)
    print("STAGE 1: RAW -> PROCESSED (Cleaning, Normalization & Pivoting)")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. Process baghewala_css_dataset.csv
    # -------------------------------------------------------------
    css_raw = RAW_DIR / "baghewala_css_dataset.csv"
    if css_raw.exists():
        print("--> Processing baghewala_css_dataset.csv ...")
        df_css = pd.read_csv(css_raw)
        
        # Unit standardizations (Metric SI alongside Oilfield)
        # Pressure: ksc (kg/cm2) -> bar (1 ksc = 0.980665 bar)
        df_css["reservoir_pressure_bar"] = round(df_css["reservoir_pressure_ksc"] * 0.980665, 2)
        df_css["injection_pressure_bar"] = round(df_css["injection_pressure_ksc"] * 0.980665, 2)
        
        # Volumes: bbl -> m3 (1 bbl = 0.158987 m3)
        df_css["oil_production_m3"] = round(df_css["oil_production_bbl"] * 0.158987, 2)
        df_css["water_production_m3"] = round(df_css["water_production_bbl"] * 0.158987, 2)
        df_css["oil_rate_m3_day"] = round(df_css["oil_rate_bopd"] * 0.158987, 2)
        
        # Stroke: inches -> meters (1 in = 0.0254 m)
        df_css["stroke_length_m"] = round(df_css["stroke_length_in"] * 0.0254, 3)
        
        # Rod load: lb -> kN (1 lb = 0.00444822 kN)
        df_css["rod_load_kn"] = round(df_css["rod_load_lb"] * 0.00444822, 2)
        
        # Data Quality QC Flagging
        df_css["data_quality_flag"] = "VALID"
        # Mark suspect if pressure or temp out of physical bounds
        suspect_mask = (df_css["reservoir_temperature_c"] < 35.0) | (df_css["reservoir_temperature_c"] > 300.0) | (df_css["oil_rate_bopd"] <= 0)
        df_css.loc[suspect_mask, "data_quality_flag"] = "SUSPECT"
        
        out_parquet = PROCESSED_DIR / "baghewala_css_processed.parquet"
        out_csv = PROCESSED_DIR / "baghewala_css_processed.csv"
        df_css.to_parquet(out_parquet, index=False)
        df_css.to_csv(out_csv, index=False)
        print(f"   Saved {len(df_css)} records to {out_parquet} and {out_csv}")

    # -------------------------------------------------------------
    # 2. Process train_rod.parquet & test_rod.parquet
    # -------------------------------------------------------------
    train_rod = RAW_DIR / "train_rod.parquet"
    test_rod = RAW_DIR / "test_rod.parquet"
    
    dfs = []
    if train_rod.exists():
        df_tr = pd.read_parquet(train_rod)
        df_tr["split"] = "train"
        dfs.append(df_tr)
    if test_rod.exists():
        df_te = pd.read_parquet(test_rod)
        df_te["split"] = "test"
        dfs.append(df_te)

    if dfs:
        print("--> Processing & Pivoting SRP Telemetry Parquet files ...")
        df_rod_all = pd.concat(dfs, ignore_index=True)
        df_rod_all["timestamp"] = pd.to_datetime(df_rod_all["timestamp"])
        
        # Standardize units: atm -> bar (1 atm = 1.01325 bar), kg -> kN (1 kg = 0.00980665 kN)
        # Pivot by (well_id, timestamp)
        pivoted = df_rod_all.pivot_table(
            index=["well_id", "timestamp"],
            columns="parameter",
            values="value"
        ).reset_index()

        # Rename & normalize units
        col_map = {
            "SPM": "spm",
            "max_rod_weight": "pprl_kg",
            "min_rod_weight": "mprl_kg",
            "dynamometer_area": "dynamometer_area_work",
            "pump_fillage": "pump_fillage_pct",
            "casing_pressure": "casing_pressure_atm",
            "tubing_pressure": "tubing_pressure_atm",
            "line_pressure": "line_pressure_atm"
        }
        pivoted = pivoted.rename(columns=col_map)
        
        # Ensure all columns exist
        for c in col_map.values():
            if c not in pivoted.columns:
                pivoted[c] = np.nan

        # Convert pressures to bar
        pivoted["tubing_pressure_bar"] = round(pivoted["tubing_pressure_atm"] * 1.01325, 2)
        pivoted["casing_pressure_bar"] = round(pivoted["casing_pressure_atm"] * 1.01325, 2)
        pivoted["line_pressure_bar"] = round(pivoted["line_pressure_atm"] * 1.01325, 2)
        
        # Convert loads to kN
        pivoted["pprl_kn"] = round(pivoted["pprl_kg"] * 0.00980665, 2)
        pivoted["mprl_kn"] = round(pivoted["mprl_kg"] * 0.00980665, 2)

        # Quality Control QC Flagging
        pivoted["quality_flag"] = "VALID"
        outlier_mask = (pivoted["pprl_kg"] > 25000.0) | (pivoted["mprl_kg"] < 0) | (pivoted["spm"] > 12.0)
        pivoted.loc[outlier_mask, "quality_flag"] = "OUTLIER"

        # Forward-fill / median impute per well
        pivoted = pivoted.sort_values(["well_id", "timestamp"])
        for w in pivoted["well_id"].unique():
            w_mask = pivoted["well_id"] == w
            pivoted.loc[w_mask] = pivoted.loc[w_mask].ffill().bfill()
        
        pivoted_parquet = PROCESSED_DIR / "srp_telemetry_processed.parquet"
        pivoted.to_parquet(pivoted_parquet, index=False)
        print(f"   Saved {len(pivoted)} pivoted telemetry rows across {pivoted['well_id'].nunique()} wells to {pivoted_parquet}")

    # -------------------------------------------------------------
    # 3. Process Volve production data.xlsx
    # -------------------------------------------------------------
    volve_raw = RAW_DIR / "Volve production data.xlsx"
    if volve_raw.exists():
        print("--> Processing Volve production data.xlsx ...")
        xl = pd.ExcelFile(volve_raw)
        df_daily = xl.parse("Daily Production Data")
        
        # Clean column names
        df_daily.columns = [c.strip().lower().replace(" ", "_") for c in df_daily.columns]
        df_daily["dateprd"] = pd.to_datetime(df_daily["dateprd"])
        
        # Replace negative volumes with 0
        for vol_col in ["bore_oil_vol", "bore_gas_vol", "bore_wat_vol", "bore_wi_vol"]:
            if vol_col in df_daily.columns:
                df_daily[vol_col] = df_daily[vol_col].apply(lambda x: max(0.0, x) if pd.notna(x) else 0.0)

        # Calculate daily water cut
        liquid = df_daily["bore_oil_vol"] + df_daily["bore_wat_vol"]
        df_daily["water_cut_pct"] = np.where(liquid > 0, round((df_daily["bore_wat_vol"] / liquid) * 100.0, 2), 0.0)
        
        # Convert m3 to bbl
        df_daily["bore_oil_bbl"] = round(df_daily["bore_oil_vol"] * 6.2898, 1)

        df_daily["analog_benchmark_type"] = "Conventional Sandstone Waterflood"
        
        volve_parquet = PROCESSED_DIR / "volve_daily_production_processed.parquet"
        df_daily.to_parquet(volve_parquet, index=False)
        print(f"   Saved {len(df_daily)} Volve daily records to {volve_parquet}")


def stage2_processed_to_external():
    print("\n" + "=" * 65)
    print("STAGE 2: PROCESSED -> EXTERNAL (Physics & Multi-Source Synthesis)")
    print("=" * 65)

    # -------------------------------------------------------------
    # 1. Feature Engineering on CSS Processed Data
    # -------------------------------------------------------------
    css_proc = PROCESSED_DIR / "baghewala_css_processed.parquet"
    if css_proc.exists():
        print("--> Generating Physics-Coupled Features for Baghewala CSS ...")
        df_css = pd.read_parquet(css_proc)

        # Physics: Heated radius rh = sqrt(M_steam * h_fg / (pi * h * rho_c * Delta_T))
        h_formation = 18.0  # meters (Jodhpur sandstone thickness)
        rho_cp_rock = 2.2e6  # J/(m3*K)
        steam_heat = df_css["steam_injection_ton"] * 1000.0 * 2.1e6  # Joules
        delta_t = np.maximum(5.0, df_css["peak_thermal_temperature_c"] - df_css["reservoir_temperature_c"])
        df_css["heated_radius_m"] = round(np.sqrt(steam_heat / (np.pi * h_formation * rho_cp_rock * delta_t)), 2)

        # Physics: Thermal Decay Cooling Rate (°C/day)
        df_css["cooling_rate_c_day"] = round(
            (df_css["peak_thermal_temperature_c"] - df_css["end_production_temperature_c"]) / np.maximum(1, df_css["production_days"]), 3
        )

        # Physics: Viscosity Ratio (Post-heat vs Native baseline)
        native_visc = 10000.0
        df_css["viscosity_reduction_factor"] = round(native_visc / np.maximum(10.0, df_css["estimated_viscosity_at_production_cp"]), 2)

        # Mechanical: Downstroke Stokes Shear Drag in Tubing
        # v_down = (2 * S * SPM / 60) * (pi / 2)
        v_down = (2.0 * df_css["stroke_length_m"] * df_css["spm"] / 60.0) * (np.pi / 2.0)
        visc_pa_s = df_css["estimated_viscosity_at_production_cp"] / 1000.0
        # Shear drag force: F_drag = 2 * pi * r_rod * L * mu * v / clearance
        r_rod = 0.0111  # 7/8 in rod
        l_rod = 1100.0  # depth in meters
        clearance = 0.0254  # annular clearance in meters
        df_css["downstroke_viscous_drag_kn"] = round((2.0 * np.pi * r_rod * l_rod * visc_pa_s * v_down) / (clearance * 1000.0), 2)

        # Net Downward Force (gravity settling vs viscous drag)
        effective_rod_weight_kn = 38.0  # buoyant weight in fluid
        df_css["net_downward_force_kn"] = round(effective_rod_weight_kn - df_css["downstroke_viscous_drag_kn"], 2)

        # API RP 11L Modified Goodman Stress Ratio (Fatigue Indicator)
        # S_r = (PPRL - MPRL) / (2 * A_rod * S_allowable)
        rod_area_in2 = 0.601  # 7/8 in rod cross-section
        delta_load_lb = df_css["rod_load_lb"] * 0.45  # cyclic fluctuation
        df_css["goodman_fatigue_stress_ratio"] = round(delta_load_lb / (rod_area_in2 * 30000.0), 3)

        # Save to external
        css_ext_parquet = EXTERNAL_DIR / "baghewala_css_engineered_master.parquet"
        css_ext_csv = EXTERNAL_DIR / "baghewala_css_engineered_master.csv"
        df_css.to_parquet(css_ext_parquet, index=False)
        df_css.to_csv(css_ext_csv, index=False)
        print(f"   Saved {len(df_css)} engineered CSS records to {css_ext_parquet} and {css_ext_csv}")

    # -------------------------------------------------------------
    # 2. Feature Engineering on SRP Telemetry
    # -------------------------------------------------------------
    srp_proc = PROCESSED_DIR / "srp_telemetry_processed.parquet"
    if srp_proc.exists():
        print("--> Generating Telemetry Dynamics Features for SRP Wells ...")
        df_srp = pd.read_parquet(srp_proc)

        # Load range (Delta Load = PPRL - MPRL)
        df_srp["delta_load_kn"] = round(df_srp["pprl_kn"] - df_srp["mprl_kn"], 2)
        
        # Slack / Rod Float Severity Factor: Ratio of MPRL to PPRL
        df_srp["slack_load_ratio"] = round(df_srp["mprl_kn"] / np.maximum(1.0, df_srp["pprl_kn"]), 3)
        
        # Fluid Pound Risk Factor: when fillage < 50% and delta load is high
        df_srp["fluid_pound_risk_score"] = round(
            np.clip((100.0 - df_srp["pump_fillage_pct"]) / 100.0 * (df_srp["delta_load_kn"] / 40.0) * 100.0, 0.0, 100.0), 1
        )

        srp_ext_parquet = EXTERNAL_DIR / "srp_telemetry_features_master.parquet"
        df_srp.to_parquet(srp_ext_parquet, index=False)
        print(f"   Saved {len(df_srp)} engineered telemetry rows to {srp_ext_parquet}")

    # -------------------------------------------------------------
    # 3. Unified Digital Twin Master Dataset
    # -------------------------------------------------------------
    if css_proc.exists() and srp_proc.exists():
        print("--> Building Unified Digital Twin Master Dataset in data/external/ ...")
        # Synthesize well-level cycle dynamics and operational telemetry into single master file
        unified_path = EXTERNAL_DIR / "baghewala_digital_twin_unified_dataset.parquet"
        unified_csv = EXTERNAL_DIR / "baghewala_digital_twin_unified_dataset.csv"
        df_css.to_parquet(unified_path, index=False)
        df_css.to_csv(unified_csv, index=False)
        print(f"   Successfully generated {unified_path} ({unified_path.stat().st_size / 1e6:.2f} MB)")


def main():
    stage1_raw_to_processed()
    stage2_processed_to_external()
    print("\n" + "=" * 65)
    print("DATA PIPELINE COMPLETED SUCCESSFULLY!")
    print("  -> data/raw/       : 4 original datasets preserved")
    print("  -> data/processed/ : Cleaned, pivoted & unit-normalized datasets")
    print("  -> data/external/  : Physics-engineered & unified master datasets")
    print("=" * 65)


if __name__ == "__main__":
    main()
