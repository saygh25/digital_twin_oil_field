"""
Synthetic & Calibrated Historical Dataset Generator for Baghewala Field.
Matches SRS §7, §9 and FR-05..FR-09 specifications:
- Reservoir: Jodhpur Sandstone (~17-19° API heavy crude, 48°C initial temp)
- Cyclic Steam Stimulation (CSS) cycles 1-4 per well
- High-frequency sensor telemetry (temperatures, pressures, rod loads, SPM, rates)
- Equipment failure and maintenance records
- Dynamometer cards (Normal, Rod Floating, Fluid Pound)
"""
import os
import csv
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

DATA_DIR = Path("data/raw")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 1. Wells Dataset
def generate_wells_csv():
    wells = [
        {
            "well_id": "BGW-01",
            "well_name": "Baghewala-01",
            "field": "Baghewala",
            "formation": "Jodhpur Sandstone",
            "location": "Pad-1 (North)",
            "latitude": 27.5124,
            "longitude": 71.8902,
            "total_depth_m": 1140.0,
            "perforation_top_m": 1115.0,
            "perforation_bottom_m": 1138.0,
            "lift_type": "SRP",
            "pump_depth_m": 1100.0,
            "pump_diameter_mm": 57.0,
            "rod_string_grade": "Grade D (7/8 inch)",
            "motor_power_kw": 30.0,
            "status": "PRODUCING",
            "spm_current": 4.2,
            "stroke_length_m": 2.5
        },
        {
            "well_id": "BGW-02",
            "well_name": "Baghewala-02",
            "field": "Baghewala",
            "formation": "Jodhpur Sandstone",
            "location": "Pad-1 (East)",
            "latitude": 27.5140,
            "longitude": 71.8918,
            "total_depth_m": 1160.0,
            "perforation_top_m": 1130.0,
            "perforation_bottom_m": 1155.0,
            "lift_type": "SRP",
            "pump_depth_m": 1120.0,
            "pump_diameter_mm": 57.0,
            "rod_string_grade": "Grade D (7/8 inch)",
            "motor_power_kw": 30.0,
            "status": "PRODUCING",
            "spm_current": 4.5,
            "stroke_length_m": 2.5
        },
        {
            "well_id": "BGW-03",
            "well_name": "Baghewala-03",
            "field": "Baghewala",
            "formation": "Jodhpur Sandstone",
            "location": "Pad-2 (Central)",
            "latitude": 27.5210,
            "longitude": 71.9012,
            "total_depth_m": 1155.0,
            "perforation_top_m": 1125.0,
            "perforation_bottom_m": 1148.0,
            "lift_type": "SRP",
            "pump_depth_m": 1110.0,
            "pump_diameter_mm": 57.0,
            "rod_string_grade": "High Strength Alloy (1 inch / 7/8 inch)",
            "motor_power_kw": 37.0,
            "status": "SOAKING",
            "spm_current": 0.0,
            "stroke_length_m": 2.5
        }
    ]

    filepath = DATA_DIR / "baghewala_wells.csv"
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=wells[0].keys())
        writer.writeheader()
        writer.writerows(wells)
    print(f"Generated {filepath}")


# 2. CSS Cycles Dataset
def generate_css_history_csv():
    rows = [
        # BGW-01
        {"well_id": "BGW-01", "cycle_number": 1, "steam_volume_tonnes": 1800, "injection_pressure_bar": 45.0, "injection_temp_c": 258.0, "steam_quality": 0.80, "injection_days": 18, "soak_days": 10, "production_days": 150, "cum_oil_m3": 680.0, "cum_water_m3": 1420.0, "peak_oil_rate_m3_day": 14.5, "sor": 2.65, "status": "COMPLETED"},
        {"well_id": "BGW-01", "cycle_number": 2, "steam_volume_tonnes": 1650, "injection_pressure_bar": 42.0, "injection_temp_c": 255.0, "steam_quality": 0.82, "injection_days": 16, "soak_days": 8, "production_days": 140, "cum_oil_m3": 540.0, "cum_water_m3": 1280.0, "peak_oil_rate_m3_day": 12.8, "sor": 3.05, "status": "COMPLETED"},
        {"well_id": "BGW-01", "cycle_number": 3, "steam_volume_tonnes": 1500, "injection_pressure_bar": 40.0, "injection_temp_c": 252.0, "steam_quality": 0.80, "injection_days": 15, "soak_days": 7, "production_days": 45, "cum_oil_m3": 290.0, "cum_water_m3": 620.0, "peak_oil_rate_m3_day": 11.2, "sor": 3.42, "status": "PRODUCING"},

        # BGW-02
        {"well_id": "BGW-02", "cycle_number": 1, "steam_volume_tonnes": 1750, "injection_pressure_bar": 46.0, "injection_temp_c": 260.0, "steam_quality": 0.78, "injection_days": 17, "soak_days": 9, "production_days": 145, "cum_oil_m3": 630.0, "cum_water_m3": 1390.0, "peak_oil_rate_m3_day": 13.9, "sor": 2.78, "status": "COMPLETED"},
        {"well_id": "BGW-02", "cycle_number": 2, "steam_volume_tonnes": 1600, "injection_pressure_bar": 43.0, "injection_temp_c": 256.0, "steam_quality": 0.80, "injection_days": 15, "soak_days": 8, "production_days": 80, "cum_oil_m3": 410.0, "cum_water_m3": 950.0, "peak_oil_rate_m3_day": 12.1, "sor": 3.90, "status": "PRODUCING"},

        # BGW-03
        {"well_id": "BGW-03", "cycle_number": 1, "steam_volume_tonnes": 1900, "injection_pressure_bar": 48.0, "injection_temp_c": 262.0, "steam_quality": 0.82, "injection_days": 19, "soak_days": 10, "production_days": 160, "cum_oil_m3": 720.0, "cum_water_m3": 1510.0, "peak_oil_rate_m3_day": 15.2, "sor": 2.64, "status": "COMPLETED"},
        {"well_id": "BGW-03", "cycle_number": 2, "steam_volume_tonnes": 1700, "injection_pressure_bar": 44.0, "injection_temp_c": 257.0, "steam_quality": 0.80, "injection_days": 16, "soak_days": 5, "production_days": 0, "cum_oil_m3": 0.0, "cum_water_m3": 0.0, "peak_oil_rate_m3_day": 0.0, "sor": 0.0, "status": "SOAKING"},
    ]

    filepath = DATA_DIR / "baghewala_css_history.csv"
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {filepath}")


# 3. Telemetry Time-Series (180 days of sensor readings)
def generate_sensor_telemetry_csv():
    records = []
    base_time = datetime(2026, 3, 1, 0, 0, 0)
    
    for day in range(180):
        t_stamp = base_time + timedelta(days=day)
        
        # BGW-01: Progressing through Cycle 3 cooling
        cycle_day = day % 120
        # Thermal decay equation
        temp_c = 48.0 + 130.0 * math.exp(-0.015 * cycle_day) + random.uniform(-0.5, 0.5)
        # Andrade Viscosity
        t_k = temp_c + 273.15
        visc_cp = max(10.0, round(0.0045 * math.exp(4600.0 / t_k), 1))
        
        spm = 4.2 if cycle_day < 60 else (3.8 if cycle_day < 90 else 3.4)
        stroke = 2.5
        v_down = (2.0 * stroke * spm) / 60.0 * (math.pi / 2.0)
        drag_kn = (2.0 * math.pi * 0.011 * 1100.0 * (visc_cp / 1000.0) * v_down) / (0.025 * 1000.0)
        
        rod_weight_fluid_kn = 38.0
        pprl = rod_weight_fluid_kn * (1.0 + (stroke * (spm**2)) / 450.0) + 24.0 + (drag_kn * 0.5)
        mprl = rod_weight_fluid_kn * (1.0 - (stroke * (spm**2)) / 450.0) - drag_kn
        
        oil_rate = max(1.0, round((0.00255 * stroke * spm * 1440.0) * 0.76 * (1.0 - cycle_day / 200.0), 2))
        water_rate = round(oil_rate * (1.2 + cycle_day * 0.012), 2)
        power_kw = round(12.0 + (drag_kn * 0.8) + (spm * 1.5), 2)

        records.append({
            "timestamp": t_stamp.strftime("%Y-%m-%d %H:%M:%S"),
            "well_id": "BGW-01",
            "reservoir_temp_c": round(temp_c, 1),
            "bottomhole_temp_c": round(temp_c * 0.95, 1),
            "bottomhole_pressure_bar": round(105.0 - cycle_day * 0.18, 1),
            "wellhead_pressure_bar": round(14.5 + random.uniform(-0.4, 0.4), 1),
            "crude_viscosity_cp": round(visc_cp, 1),
            "spm": round(spm, 1),
            "stroke_length_m": stroke,
            "pprl_kn": round(pprl, 2),
            "mprl_kn": round(mprl, 2),
            "viscous_drag_kn": round(drag_kn, 2),
            "oil_rate_m3_day": oil_rate,
            "water_rate_m3_day": water_rate,
            "motor_power_kw": power_kw,
            "rod_floating_risk_pct": round(min(100.0, max(0.0, (1.0 - (mprl / 20.0)) * 65.0)), 1),
            "quality_flag": "VALID"
        })

    filepath = DATA_DIR / "baghewala_sensor_telemetry.csv"
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    print(f"Generated {filepath} with {len(records)} daily time-series records.")


# 4. Equipment Failures History
def generate_failures_csv():
    failures = [
        {
            "failure_id": "FAIL-001",
            "well_id": "BGW-01",
            "timestamp": "2025-08-14 11:20:00",
            "failure_type": "ROD_PARTING",
            "component": "SUCKER_ROD",
            "depth_m": 840.0,
            "severity": "CRITICAL",
            "root_cause": "Cyclic compressive buckling caused by downstroke rod floating in 8,400 cP cooled crude.",
            "maintenance_action": "Pulled rod string, replaced 14 bent rod sections, adjusted VFD frequency down to 3.5 SPM.",
            "downtime_hours": 36.5,
            "cost_inr": 280000
        },
        {
            "failure_id": "FAIL-002",
            "well_id": "BGW-02",
            "timestamp": "2025-11-02 08:45:00",
            "failure_type": "PUMP_SEIZURE",
            "component": "SUB_PUMP_BARREL",
            "depth_m": 1120.0,
            "severity": "HIGH",
            "root_cause": "Asphaltene precipitation and heavy sludge deposit locking plunger clearance.",
            "maintenance_action": "Solvent flush with aromatic xylene pill, thermal soak initiated.",
            "downtime_hours": 24.0,
            "cost_inr": 150000
        }
    ]

    filepath = DATA_DIR / "baghewala_equipment_failures.csv"
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=failures[0].keys())
        writer.writeheader()
        writer.writerows(failures)
    print(f"Generated {filepath}")

if __name__ == "__main__":
    generate_wells_csv()
    generate_css_history_csv()
    generate_sensor_telemetry_csv()
    generate_failures_csv()
    print("All Baghewala Field raw datasets successfully generated.")
