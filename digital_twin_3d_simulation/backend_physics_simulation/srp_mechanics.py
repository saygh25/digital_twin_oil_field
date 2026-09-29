"""
Physics-based SRP Mechanics & Rod Floating Risk Analysis.
FR-21, FR-22, FR-24, FR-25, FR-34.

Calculates:
- Peak Polished Rod Load (PPRL)
- Minimum Polished Rod Load (MPRL)
- Downstroke Fluid Drag (viscous drag on rod string)
- Rod Floating Risk Score (0-100%)
- Pump Volumetric Efficiency (%)
- Estimated Power Consumption (kW)
"""
import math
from typing import Dict, Any


def calculate_srp_mechanics(
    stroke_length_m: float,
    spm: float,
    pump_depth_m: float,
    pump_diameter_mm: float,
    viscosity_cp: float,
    fluid_level_m: float = 200.0,
    rod_weight_per_m_kg: float = 4.2,  # e.g., 7/8" rod string average
    fluid_density_kg_m3: float = 960.0,  # 18 API crude ~ 950-980 kg/m3
) -> Dict[str, Any]:
    """
    Evaluates SRP mechanical loading, downstroke drag, and rod floating danger.
    """
    g = 9.81
    total_rod_mass_kg = rod_weight_per_m_kg * pump_depth_m
    rod_weight_in_air_kn = (total_rod_mass_kg * g) / 1000.0

    # Buoyancy factor in heavy crude (steel density ~7850 kg/m3)
    buoyancy_factor = 1.0 - (fluid_density_kg_m3 / 7850.0)
    rod_weight_in_fluid_kn = rod_weight_in_air_kn * buoyancy_factor

    # Fluid load on plunger (kN)
    pump_area_m2 = math.pi * ((pump_diameter_mm / 1000.0) / 2.0) ** 2
    net_lift_head_m = max(50.0, pump_depth_m - fluid_level_m)
    fluid_load_kn = (pump_area_m2 * net_lift_head_m * fluid_density_kg_m3 * g) / 1000.0

    # Acceleration factor (Mills formula): alpha = (S * N^2) / 1790 (Imperial) -> in SI:
    # stroke in meters, spm
    accel_factor = (stroke_length_m * (spm ** 2)) / 450.0

    # Polished rod velocity during downstroke (m/s)
    v_down_avg_m_s = (2.0 * stroke_length_m * spm) / 60.0
    v_down_peak_m_s = v_down_avg_m_s * (math.pi / 2.0)

    # Viscous drag force on rod string during downstroke (kN)
    # Drag depends on viscosity, velocity, annulus clearance, rod area
    # F_drag ~ 2 * pi * r_rod * L * (mu * v / clearance)
    rod_radius_m = 0.011  # 22mm rod
    annulus_clearance_m = 0.025  # ~1 inch clearance in 2-7/8" tubing
    viscosity_pa_s = viscosity_cp / 1000.0

    # Viscous shear drag force (kN)
    shear_drag_kn = (2.0 * math.pi * rod_radius_m * pump_depth_m * viscosity_pa_s * v_down_peak_m_s) / (annulus_clearance_m * 1000.0)

    # PPRL (Upstroke: rod + fluid + acceleration + upstroke friction)
    pprl_kn = (rod_weight_in_fluid_kn * (1.0 + accel_factor)) + fluid_load_kn + (shear_drag_kn * 0.5)

    # MPRL (Downstroke: rod in fluid * (1 - accel) - shear drag)
    mprl_kn = (rod_weight_in_fluid_kn * (1.0 - accel_factor)) - shear_drag_kn

    # Net downward force available to pull rods down during downstroke
    net_downward_force_kn = mprl_kn

    # Rod Floating Condition: if MPRL <= 0 or downward force is insufficient to overcome viscous resistance
    # Rod floating risk score (0 to 100%)
    if net_downward_force_kn < 0:
        # Complete floating / compressive load on rods
        rod_floating_risk_pct = min(100.0, 75.0 + abs(net_downward_force_kn) * 10.0)
    elif net_downward_force_kn < (0.25 * rod_weight_in_fluid_kn):
        # High risk zone
        rod_floating_risk_pct = 50.0 + (1.0 - (net_downward_force_kn / (0.25 * rod_weight_in_fluid_kn))) * 25.0
    elif net_downward_force_kn < (0.5 * rod_weight_in_fluid_kn):
        # Moderate risk zone
        rod_floating_risk_pct = 20.0 + (1.0 - (net_downward_force_kn / (0.5 * rod_weight_in_fluid_kn))) * 30.0
    else:
        # Low risk
        rod_floating_risk_pct = max(0.0, 20.0 * (viscosity_cp / 5000.0) * (spm / 5.0))

    # Theoretical pump displacement (m3/day)
    # V = pump_area * stroke * spm * 1440
    displacement_m3_day = pump_area_m2 * stroke_length_m * spm * 1440.0
    
    # Volumetric efficiency estimated from viscosity and gas/fluid slip
    viscosity_efficiency_loss = min(0.4, (viscosity_cp / 10000.0) * 0.25)
    estimated_pump_efficiency_pct = max(35.0, min(95.0, (88.0 - viscosity_efficiency_loss * 100.0)))
    estimated_oil_rate_m3_day = round(displacement_m3_day * (estimated_pump_efficiency_pct / 100.0), 2)

    # Motor power consumption (kW)
    # Hydraulic power = Q * deltaP / 3600
    hydraulic_power_kw = (displacement_m3_day * net_lift_head_m * fluid_density_kg_m3 * g) / (86400.0 * 1000.0)
    motor_power_kw = max(2.0, (hydraulic_power_kw / 0.55) + (shear_drag_kn * v_down_avg_m_s))

    return {
        "pprl_kn": round(pprl_kn, 2),
        "mprl_kn": round(mprl_kn, 2),
        "shear_drag_kn": round(shear_drag_kn, 2),
        "net_downward_force_kn": round(net_downward_force_kn, 2),
        "rod_floating_risk_pct": round(min(100.0, max(0.0, rod_floating_risk_pct)), 1),
        "theoretical_displacement_m3_day": round(displacement_m3_day, 2),
        "estimated_pump_efficiency_pct": round(estimated_pump_efficiency_pct, 1),
        "estimated_oil_rate_m3_day": estimated_oil_rate_m3_day,
        "estimated_motor_power_kw": round(motor_power_kw, 2),
    }
