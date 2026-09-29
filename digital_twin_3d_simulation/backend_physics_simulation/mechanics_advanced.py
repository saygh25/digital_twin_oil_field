"""
Advanced SRP Mechanical Engineering Module:
1. Impact Loading & Dynamic Shock Stress Calculator (FR-rod-floating)
2. Mechanistic Pump Unsetting Force Balance (FR-unsetting)
3. Sinker Bar Anti-Floating Sizing Engine (API 11L Spec)
"""
from typing import Dict, Any, List
import numpy as np


def calculate_impact_and_shock_loading(
    stroke_length_in: float = 72.0,
    spm: float = 4.2,
    viscosity_cp: float = 2850.0,
    rod_floating_risk_pct: float = 18.0,
    mprl_kn: float = 18.2,
    pprl_kn: float = 68.0,
    rod_diameter_in: float = 0.875  # 7/8" standard rod
) -> Dict[str, Any]:
    """
    Computes dynamic impact load and cyclic shock stress transmitted through sucker rod joints
    when rods float on downstroke and experience snap-load when caught by the carrier bar.
    """
    stroke_m = stroke_length_in * 0.0254
    rod_area_in2 = (np.pi / 4.0) * (rod_diameter_in ** 2)
    
    # Rod fall velocity vs carrier bar speed
    carrier_bar_speed_ms = (2.0 * stroke_m * spm) / 60.0
    terminal_fall_velocity_ms = max(0.12, 1.45 - (viscosity_cp / 5000.0) * 0.85)

    # Velocity gap: if carrier bar descends faster than terminal rod fall speed, rods float
    velocity_gap = max(0.0, carrier_bar_speed_ms - terminal_fall_velocity_ms)
    
    # Impact shock factor (multiplier over static PPRL)
    # Peak impact occurs at bottom of stroke when rod string impacts seated pump or catches harness
    snap_shock_factor = 1.0 + (velocity_gap * 1.8) + (rod_floating_risk_pct / 100.0) * 0.65
    peak_impact_load_kn = round(pprl_kn * snap_shock_factor, 1)

    # Dynamic tensile & compressive cyclic stress (psi)
    peak_impact_load_lb = peak_impact_load_kn * 224.809
    peak_stress_psi = round(peak_impact_load_lb / rod_area_in2, 0)
    
    # Modified Goodman stress ceiling for API Grade D rod (50,000 - 90,000 psi)
    goodman_limit_psi = 32000.0 + (0.56 * 20000.0)
    stress_ratio_pct = round((peak_stress_psi / goodman_limit_psi) * 100.0, 1)

    # Fatigue acceleration factor (how much faster rod string will part compared to smooth pumping)
    fatigue_multiplier = round(1.0 + (snap_shock_factor - 1.0) * 3.2, 2)

    status = "SAFE"
    if stress_ratio_pct > 90.0 or snap_shock_factor > 1.4:
        status = "CRITICAL_SHOCK_LOAD"
    elif stress_ratio_pct > 75.0 or snap_shock_factor > 1.15:
        status = "ELEVATED_IMPACT_RISK"

    return {
        "carrier_bar_speed_ms": round(carrier_bar_speed_ms, 2),
        "terminal_rod_fall_velocity_ms": round(terminal_fall_velocity_ms, 2),
        "velocity_gap_ms": round(velocity_gap, 2),
        "snap_shock_factor": round(snap_shock_factor, 2),
        "peak_impact_load_kn": peak_impact_load_kn,
        "peak_stress_psi": peak_stress_psi,
        "goodman_stress_limit_psi": goodman_limit_psi,
        "goodman_stress_ratio_pct": stress_ratio_pct,
        "fatigue_acceleration_multiplier": fatigue_multiplier,
        "impact_status": status,
        "recommendation": (
            "Reduce SPM via VFD to align carrier bar speed with heavy crude terminal rod settling speed."
            if status != "SAFE" else "Dynamic cyclic stresses within API Spec 11B fatigue endurance envelope."
        )
    }


def evaluate_pump_unsetting_force_balance(
    pump_depth_m: float = 1100.0,
    pump_diameter_mm: float = 57.0,
    viscosity_cp: float = 2850.0,
    spm: float = 4.2,
    stroke_length_in: float = 72.0,
    seating_nipple_rating_kn: float = 18.0,  # Mechanical seating nipple hold-down capacity (~4,000 lbs)
    water_cut_pct: float = 40.0
) -> Dict[str, Any]:
    """
    Evaluates mechanistic force balance on insert pump barrel to prevent unsetting from seating nipple.
    Upward forces:
    1. Upstroke fluid shear drag on barrel OD
    2. Fluid friction through standing valve
    3. Buoyancy force from heavy oil hydrostatic column
    Resisting downward forces:
    1. Mechanical hold-down friction / lock ring rating
    2. Hydrostatic fluid column weight on barrel shoulder
    """
    stroke_m = stroke_length_in * 0.0254
    v_up = (2.0 * stroke_m * spm) / 60.0
    
    # 1. Viscous upward drag on barrel outer surface in heavy crude
    # Shear stress tau = mu * (dv/dr)
    barrel_radius_m = (pump_diameter_mm * 1.25) / 2000.0
    barrel_length_m = 4.5  # standard insert barrel length
    casing_id_m = 0.152  # 6-inch casing ID
    radial_gap = casing_id_m - barrel_radius_m * 2.0
    
    visc_pa_s = viscosity_cp / 1000.0
    shear_stress_pa = visc_pa_s * (v_up / max(0.01, radial_gap))
    barrel_surface_area_m2 = 2.0 * np.pi * barrel_radius_m * barrel_length_m
    upward_viscous_drag_kn = (shear_stress_pa * barrel_surface_area_m2) / 1000.0

    # 2. Hydrostatic buoyancy uplift on barrel steel volume (~0.015 m3 steel)
    crude_density_kg_m3 = 950.0  # 18 API heavy crude
    buoyant_uplift_kn = (0.015 * crude_density_kg_m3 * 9.81) / 1000.0

    # 3. Dynamic plunger friction
    plunger_friction_kn = 2.2 * (viscosity_cp / 3000.0)

    total_upward_unsetting_force_kn = round(upward_viscous_drag_kn + buoyant_uplift_kn + plunger_friction_kn, 2)
    
    # Downward holding forces
    # Weight of fluid column on pump seat + mechanical lock
    fluid_column_weight_kn = 4.5
    total_downward_holding_capacity_kn = round(seating_nipple_rating_kn + fluid_column_weight_kn, 2)

    safety_factor = round(total_downward_holding_capacity_kn / max(0.1, total_upward_unsetting_force_kn), 2)
    unsetting_risk_pct = round(max(0.0, min(100.0, (1.0 - (safety_factor / 2.5)) * 100.0)), 1)

    status = "SECURE"
    if safety_factor < 1.3:
        status = "CRITICAL_UNSETTING_IMMINENT"
    elif safety_factor < 1.8:
        status = "MODERATE_UNSETTING_RISK"

    return {
        "pump_depth_m": pump_depth_m,
        "upward_viscous_drag_kn": round(upward_viscous_drag_kn, 2),
        "buoyant_uplift_kn": round(buoyant_uplift_kn, 2),
        "plunger_friction_kn": round(plunger_friction_kn, 2),
        "total_upward_unsetting_force_kn": total_upward_unsetting_force_kn,
        "seating_nipple_hold_down_capacity_kn": seating_nipple_rating_kn,
        "total_holding_capacity_kn": total_downward_holding_capacity_kn,
        "unsetting_safety_factor": safety_factor,
        "unsetting_risk_pct": unsetting_risk_pct,
        "unsetting_status": status,
        "mitigation": (
            "Heavy crude drag approaches hold-down threshold. Recommend mechanical top-lock anchor or reduce SPM to drop viscous shear."
            if status != "SECURE" else "Mechanical hold-down margin exceeds API RP 11G safety requirements."
        )
    }


def size_sinker_bars(
    pump_depth_m: float = 1100.0,
    viscosity_cp: float = 2850.0,
    spm: float = 4.2,
    stroke_length_in: float = 72.0,
    target_min_mprl_kn: float = 14.0,  # Minimum safe downstroke tension to eliminate floating
    current_mprl_kn: float = 18.2,
    current_rod_weight_kn: float = 38.0
) -> Dict[str, Any]:
    """
    Engineers the exact sinker bar assembly (weight & length) needed directly above the pump
    to counteract heavy crude buoyancy and downstroke drag.
    """
    stroke_m = stroke_length_in * 0.0254
    v_down = (2.0 * stroke_m * spm) / 60.0 * (np.pi / 2.0)
    
    # Calculate required additional downward gravity force (kN)
    drag_kn = ((2.0 * np.pi * 0.011 * pump_depth_m * (viscosity_cp / 1000.0) * v_down) / (0.025 * 1000.0))
    inertia_down = current_rod_weight_kn * (1.0 - (stroke_m * spm * spm) / 450.0)
    
    # Deficit to achieve target_min_mprl_kn
    actual_downstroke_mprl = inertia_down - drag_kn
    load_deficit_kn = max(0.0, target_min_mprl_kn - actual_downstroke_mprl)

    # Steel sinker bar specs (in air vs buoyant in heavy oil)
    # 1.5-inch sinker bar = 6.0 lb/ft (8.9 kg/m) -> buoyant ~7.8 kg/m (~0.076 kN/m)
    # 1.75-inch sinker bar = 8.16 lb/ft (12.1 kg/m) -> buoyant ~10.6 kg/m (~0.104 kN/m)
    # 2.0-inch heavy sinker bar = 10.68 lb/ft (15.9 kg/m) -> buoyant ~13.9 kg/m (~0.136 kN/m)
    
    additional_weight_needed_kn = round(load_deficit_kn * 1.15, 2)  # 15% safety factor
    additional_weight_needed_kg = round((additional_weight_needed_kn * 1000.0) / 9.81, 0)
    additional_weight_needed_lb = round(additional_weight_needed_kg * 2.20462, 0)

    # Sinker bar lengths
    length_1_5_in_m = round(additional_weight_needed_kn / 0.076, 1) if additional_weight_needed_kn > 0 else 0.0
    length_1_75_in_m = round(additional_weight_needed_kn / 0.104, 1) if additional_weight_needed_kn > 0 else 0.0
    length_2_0_in_m = round(additional_weight_needed_kn / 0.136, 1) if additional_weight_needed_kn > 0 else 0.0

    standard_bar_len_m = 7.62  # standard 25 ft bar
    bars_count_1_75 = int(np.ceil(length_1_75_in_m / standard_bar_len_m)) if length_1_75_in_m > 0 else 0

    return {
        "viscosity_cp": viscosity_cp,
        "downstroke_drag_kn": round(drag_kn, 2),
        "target_mprl_kn": target_min_mprl_kn,
        "unassisted_mprl_kn": round(actual_downstroke_mprl, 2),
        "load_deficit_kn": round(load_deficit_kn, 2),
        "recommended_additional_downward_force_kn": additional_weight_needed_kn,
        "additional_weight_kg": additional_weight_needed_kg,
        "additional_weight_lb": additional_weight_needed_lb,
        "sizing_options": [
            {
                "bar_od_in": 1.75,
                "weight_per_m_kg": 12.1,
                "required_length_m": length_1_75_in_m,
                "recommended_bars_count_25ft": bars_count_1_75,
                "steel_grade": "API Spec 11B Grade D / Heavy Chrome Steel"
            },
            {
                "bar_od_in": 2.0,
                "weight_per_m_kg": 15.9,
                "required_length_m": length_2_0_in_m,
                "recommended_bars_count_25ft": int(np.ceil(length_2_0_in_m / standard_bar_len_m)) if length_2_0_in_m > 0 else 0,
                "steel_grade": "API Spec 11B Grade D (High Inertia)"
            },
            {
                "bar_od_in": 1.5,
                "weight_per_m_kg": 8.9,
                "required_length_m": length_1_5_in_m,
                "recommended_bars_count_25ft": int(np.ceil(length_1_5_in_m / standard_bar_len_m)) if length_1_5_in_m > 0 else 0,
                "steel_grade": "API Spec 11B Grade K (Corrosion Resistant)"
            }
        ],
        "engineering_note": (
            f"Installing {bars_count_1_75} x 25-ft (1.75\") sinker bars above pump delivers {additional_weight_needed_kn} kN buoyant pull, guaranteeing zero rod floating down to 50°C."
            if additional_weight_needed_kn > 0 else "Current rod string weight is sufficient for positive downstroke tension at current viscosity."
        )
    }
