"""
Data Ingestion and Validation Engine (FR-05..FR-09).

Ingests:
1. Well Master Records
2. CSS Cycle History
3. Time-Series Sensor Telemetry
4. Equipment Failure Logs

Applies data quality tagging: VALID | SUSPECT | MISSING | OUTLIER | INVALID.
"""
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import Well, CSSCycle, SensorData, Failure, QualityFlag


def validate_sensor_reading(parameter: str, value: float) -> str:
    """Quality control checks for incoming sensor values (FR-08)."""
    if value is None or math.isnan(value):
        return QualityFlag.MISSING.value

    # Physical boundary limits for Baghewala Field
    limits = {
        "reservoir_temp_c": (30.0, 320.0),
        "bottomhole_temp_c": (30.0, 320.0),
        "bottomhole_pressure_bar": (0.0, 250.0),
        "wellhead_pressure_bar": (0.0, 100.0),
        "crude_viscosity_cp": (1.0, 50000.0),
        "spm": (0.0, 10.0),
        "pprl_kn": (10.0, 160.0),
        "mprl_kn": (-20.0, 80.0),
        "oil_rate_m3_day": (0.0, 80.0),
    }

    if parameter in limits:
        min_v, max_v = limits[parameter]
        if value < min_v or value > max_v:
            return QualityFlag.OUTLIER.value

    return QualityFlag.VALID.value


import math


def import_all_raw_datasets(db: Session, data_dir: str = "data/raw") -> Dict[str, Any]:
    """Ingests and validates all raw CSV files into database."""
    dpath = Path(data_dir)
    stats = {"wells_imported": 0, "css_cycles_imported": 0, "telemetry_rows_imported": 0, "failures_imported": 0}

    # 1. Ingest Wells
    wells_file = dpath / "baghewala_wells.csv"
    if wells_file.exists():
        with open(wells_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing = db.query(Well).filter(Well.well_id == row["well_id"]).first()
                if not existing:
                    well = Well(
                        well_id=row["well_id"],
                        well_name=row["well_name"],
                        location=row["location"],
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        depth_m=float(row["total_depth_m"]),
                        perforation_interval=f"{row['perforation_top_m']}-{row['perforation_bottom_m']} m",
                        status=row["status"],
                        lift_type=row["lift_type"],
                        completion_data={"pump_depth_m": float(row["pump_depth_m"]), "pump_diameter_mm": float(row["pump_diameter_mm"])}
                    )
                    db.add(well)
                    stats["wells_imported"] += 1
        db.commit()

    # 2. Ingest CSS Cycles
    css_file = dpath / "baghewala_css_history.csv"
    if css_file.exists():
        with open(css_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cycle_num = int(row["cycle_number"])
                existing = db.query(CSSCycle).filter(
                    CSSCycle.well_id == row["well_id"],
                    CSSCycle.cycle_number == cycle_num
                ).first()
                if not existing:
                    cycle = CSSCycle(
                        well_id=row["well_id"],
                        cycle_number=cycle_num,
                        injection_volume_tonnes=float(row["steam_volume_tonnes"]),
                        injection_pressure_bar=float(row["injection_pressure_bar"]),
                        injection_temperature_c=float(row["injection_temp_c"]),
                        steam_quality_fraction=float(row["steam_quality"]),
                        injection_duration_days=float(row["injection_days"]),
                        soak_duration_days=float(row["soak_days"]),
                        production_duration_days=float(row["production_days"]),
                        cumulative_oil_m3=float(row["cum_oil_m3"]),
                        cumulative_water_m3=float(row["cum_water_m3"]),
                        peak_oil_rate_m3_day=float(row["peak_oil_rate_m3_day"]),
                        sor=float(row["sor"]),
                        status=row["status"]
                    )
                    db.add(cycle)
                    stats["css_cycles_imported"] += 1
        db.commit()

    # 3. Ingest Sensor Telemetry
    telemetry_file = dpath / "baghewala_sensor_telemetry.csv"
    if telemetry_file.exists():
        with open(telemetry_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                t_stamp = datetime.strptime(row["timestamp"], "%Y-%m-%d %H:%M:%S")
                # Store key telemetry parameters
                for param in ["reservoir_temp_c", "crude_viscosity_cp", "spm", "pprl_kn", "mprl_kn", "oil_rate_m3_day"]:
                    val = float(row[param])
                    q_flag = validate_sensor_reading(param, val)
                    s_data = SensorData(
                        timestamp=t_stamp,
                        well_id=row["well_id"],
                        parameter=param.upper(),
                        value=val,
                        quality_flag=q_flag
                    )
                    db.add(s_data)
                    stats["telemetry_rows_imported"] += 1
        db.commit()

    return stats
