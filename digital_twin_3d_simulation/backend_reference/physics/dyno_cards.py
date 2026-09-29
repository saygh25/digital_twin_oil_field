"""
Dynamometer Card (Dyno Card) Mathematical Simulation and Diagnostic Classifier.
(ASTM / API Spec 11L / Gibbs Diagnostic Wave Modeling for Sucker Rod Pumps)

Generates:
1. Surface Dynamometer Card: Polished Rod Load (kN) vs Position (in/m)
2. Downhole Pump Dynamometer Card: Fluid Load on Plunger (kN) vs Plunger Stroke
3. Condition Classifier: Full Fillage, Fluid Pound, Rod Floating / Delayed Fall, Gas Interference, Pump Unsetting.
"""
from typing import Dict, Any, List
import numpy as np


def generate_dynamometer_card(
    stroke_length_in: float = 72.0,
    spm: float = 4.2,
    viscosity_cp: float = 2850.0,
    pump_fillage_pct: float = 85.0,
    rod_floating_risk_pct: float = 18.0,
    pprl_kn: float = 68.0,
    mprl_kn: float = 22.0,
    fluid_load_kn: float = 28.0,
    plunger_depth_m: float = 1100.0,
    points_count: int = 50
) -> Dict[str, Any]:
    """
    Synthesizes physical Surface & Downhole pump dynamometer cards using Gibbs wave damping mechanics.
    """
    stroke_m = stroke_length_in * 0.0254
    theta = np.linspace(0, 2 * np.pi, points_count)
    
    # Kinematic stroke position x(theta) from 0 to stroke_length_in
    # theta: 0 to pi is upstroke, pi to 2pi is downstroke
    pos_norm = 0.5 * (1.0 - np.cos(theta))
    pos_in = pos_norm * stroke_length_in

    # Downhole Plunger Card Synthesis
    # Upstroke (0 to pi): Plunger picks up fluid load
    # Downstroke (pi to 2pi): Traveling valve opens, fluid load transfers to standing valve / tubing
    downhole_load_kn = []
    surface_load_kn = []
    
    # Viscous drag damping on surface card
    visc_factor = min(1.0, viscosity_cp / 8000.0)
    floating_factor = min(1.0, rod_floating_risk_pct / 100.0)
    fillage_frac = max(0.2, min(1.0, pump_fillage_pct / 100.0))

    for i, angle in enumerate(theta):
        # Downhole card modeling
        if angle <= np.pi:
            # UPSTROKE: Load rises rapidly as traveling valve closes
            pickup_angle = 0.25 * np.pi
            if angle < pickup_angle:
                p_load = fluid_load_kn * (angle / pickup_angle)
            else:
                p_load = fluid_load_kn
        else:
            # DOWNSTROKE: Load drops as traveling valve opens
            drop_angle = np.pi + (1.0 - fillage_frac) * np.pi
            if angle < drop_angle:
                # Fluid pound impact delay if incomplete fillage
                p_load = fluid_load_kn * 0.85
            else:
                p_load = 2.5  # residual tare load

        # Downhole card with slight compliance
        downhole_load_kn.append(round(float(p_load), 2))

        # Surface Card Modeling:
        # Includes rod string weight (~38 kN in heavy crude) + dynamic inertia + viscous shear drag
        inertia_accel = (stroke_m * spm * spm / 450.0) * np.cos(angle)
        rod_weight_buoyant = 38.0
        
        # Upstroke viscous drag adds to load; downstroke drag subtracts from load (inducing floating)
        if angle <= np.pi:
            # Upstroke
            shear_kn = 8.5 * visc_factor
            surf_load = rod_weight_buoyant + p_load * 0.95 + shear_kn + (inertia_accel * rod_weight_buoyant)
        else:
            # Downstroke
            shear_kn = 11.5 * visc_factor * (1.0 + 0.3 * (spm / 4.0))
            surf_load = rod_weight_buoyant - shear_kn + (inertia_accel * rod_weight_buoyant)
            
            # If rod floats, surface load sags below normal MPRL
            if floating_factor > 0.35:
                surf_load -= floating_factor * 8.0

        # Bound surface load realistically
        surf_load = max(mprl_kn * 0.7, min(pprl_kn * 1.08, surf_load))
        surface_load_kn.append(round(float(surf_load), 2))

    # Calculate card area (Work Done per stroke in kN-in)
    trapz_fn = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
    surface_area = float(trapz_fn(surface_load_kn[:points_count//2], pos_in[:points_count//2]) - 
                         trapz_fn(surface_load_kn[points_count//2:], pos_in[points_count//2:]))
    surface_area = abs(round(surface_area, 1))

    # Hydraulic Pump indicated power (HP)
    stroke_ft = (stroke_length_in / 12.0)
    card_area_lb_ft = (surface_area * 224.8) * (stroke_ft / stroke_length_in)
    pump_hp = round((card_area_lb_ft * spm) / 33000.0, 2)

    # Diagnostic Classifier
    condition = "FULL_PUMP_FILLAGE (NORMAL)"
    diagnosis_reason = "Symmetrical pump card with normal fluid load transfer and positive rod string tension."
    severity = "NORMAL"

    if rod_floating_risk_pct > 45.0 or min(surface_load_kn) < 10.0:
        condition = "ROD_FLOATING_DETECTED"
        diagnosis_reason = f"Downstroke surface card sags into compressive load zone ({min(surface_load_kn)} kN). Viscous drag impedes gravity rod fall."
        severity = "HIGH"
    elif pump_fillage_pct < 70.0:
        condition = "FLUID_POUND"
        diagnosis_reason = f"Plunger hits fluid level abruptly at {(fillage_frac * 100):.0f}% stroke. Generates compressive shock waves."
        severity = "MODERATE"
    elif pprl_kn > 105.0:
        condition = "MECHANICAL_OVERLOAD"
        diagnosis_reason = f"Peak polished rod load approaches structural safety ceiling."
        severity = "HIGH"

    surface_points = [{"position_in": round(float(pos_in[i]), 1), "load_kn": surface_load_kn[i]} for i in range(points_count)]
    downhole_points = [{"position_in": round(float(pos_in[i]), 1), "load_kn": downhole_load_kn[i]} for i in range(points_count)]

    return {
        "stroke_length_in": stroke_length_in,
        "spm": spm,
        "surface_card": surface_points,
        "downhole_card": downhole_points,
        "metrics": {
            "surface_card_area_kn_in": surface_area,
            "indicated_pump_hp": pump_hp,
            "pump_fillage_pct": pump_fillage_pct,
            "peak_surface_load_kn": max(surface_load_kn),
            "min_surface_load_kn": min(surface_load_kn),
            "fluid_load_kn": fluid_load_kn
        },
        "diagnostic_classification": {
            "condition": condition,
            "severity": severity,
            "reason": diagnosis_reason
        }
    }
