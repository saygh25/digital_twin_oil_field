"""
Advanced Thermal & Fluid Chemistry Engineering Module:
1. Continuous Wellbore Depth Profile T(z), P(z), Viscosity(z) (FR-wellbore)
2. Thermodynamic Asphaltene Precipitation & Onset Pressure (AOP) Model (FR-asphaltene)
3. Automated CSS Economic Production Cut-off & Cycle Switch Trigger (FR-cutoff)
"""
from typing import Dict, Any, List
import numpy as np


def compute_wellbore_depth_profile(
    surface_temp_c: float = 38.0,
    bottomhole_temp_c: float = 85.0,
    wellhead_pressure_bar: float = 12.0,
    bottomhole_pressure_bar: float = 82.0,
    total_depth_m: float = 1150.0,
    water_cut_pct: float = 40.0,
    oil_rate_m3_day: float = 14.0,
    stations_count: int = 15
) -> Dict[str, Any]:
    """
    Computes continuous depth profiles for Temperature T(z), Hydrostatic+Friction Pressure P(z),
    and Local Viscosity mu(z) from surface (0 m) to reservoir depth (1,150 m).
    """
    depths = np.linspace(0, total_depth_m, stations_count)
    profiles = []

    # Geothermal gradient baseline (Rajasthan Jodhpur region ~2.6 C / 100m)
    geothermal_surface_c = 32.0
    geo_gradient_c_m = 0.026

    # Fluid density mixture (heavy oil 950 kg/m3 + water 1020 kg/m3)
    wc_frac = water_cut_pct / 100.0
    mix_density_kg_m3 = (1.0 - wc_frac) * 950.0 + wc_frac * 1020.0
    hydrostatic_grad_bar_m = (mix_density_kg_m3 * 9.81) / 100000.0  # bar per meter

    for d in depths:
        frac = d / total_depth_m
        
        # Exponential convective heat transfer profile as warm oil ascends
        # Higher temperature near bottom, cooling towards wellhead
        T_z = surface_temp_c + (bottomhole_temp_c - surface_temp_c) * (frac ** 0.85)
        
        # Pressure profile (hydrostatic head + dynamic friction)
        P_z = wellhead_pressure_bar + (d * hydrostatic_grad_bar_m) + (oil_rate_m3_day / 20.0) * (frac * 3.5)
        
        # Local crude viscosity at depth z
        tK = T_z + 273.15
        visc_z = max(15.0, 0.0045 * np.exp(4600.0 / tK))

        # Asphaltene onset risk at depth z
        # Asphaltenes drop out when pressure drops below AOP or temperature cools below onset
        # AOP in Baghewala dead crude ~28 - 35 bar at ~50-60 C
        aop_bar = 32.0 - 0.15 * (T_z - 50.0)
        asphaltene_instability_index = max(0.0, min(100.0, (1.0 - (P_z / max(1.0, aop_bar))) * 65.0 + (1.0 - T_z / 120.0) * 35.0))

        profiles.append({
            "depth_m": round(float(d), 0),
            "temperature_c": round(float(T_z), 1),
            "pressure_bar": round(float(P_z), 1),
            "viscosity_cp": round(float(visc_z), 0),
            "asphaltene_risk_pct": round(float(asphaltene_instability_index), 1)
        })

    # Identify primary deposition zone
    max_risk_station = max(profiles, key=lambda x: x["asphaltene_risk_pct"])
    primary_zone = f"Upper Tubing ({max_risk_station['depth_m']} m)" if max_risk_station["depth_m"] < 500 else f"Mid Tubing ({max_risk_station['depth_m']} m)"

    return {
        "total_depth_m": total_depth_m,
        "stations_count": stations_count,
        "depth_profile": profiles,
        "bottomhole_conditions": {"temp_c": bottomhole_temp_c, "pressure_bar": bottomhole_pressure_bar},
        "wellhead_conditions": {"temp_c": surface_temp_c, "pressure_bar": wellhead_pressure_bar},
        "asphaltene_critical_zone": primary_zone,
        "max_viscosity_depth_m": profiles[0]["depth_m"],
        "max_viscosity_cp": profiles[0]["viscosity_cp"]
    }


def evaluate_asphaltene_precipitation(
    current_temp_c: float = 67.4,
    current_pressure_bar: float = 18.2,
    viscosity_cp: float = 2850.0,
    cumulative_prod_days: float = 45.0
) -> Dict[str, Any]:
    """
    Thermodynamic de Boer / Flory-Huggins Asphaltene Onset Pressure (AOP) evaluation.
    Baghewala crude: 17-19 API, 8-12 wt% asphaltene content, high resin-to-asphaltene ratio.
    """
    # AOP decreases with higher temperature; lower temperature destabilizes colloidal resin envelope
    base_aop_bar = 28.5
    temp_shift = (70.0 - current_temp_c) * 0.42
    current_aop_bar = round(base_aop_bar + temp_shift, 1)

    # Pressure deficit below AOP
    pressure_deficit_bar = max(0.0, current_aop_bar - current_pressure_bar)
    
    # Asphaltene Deposition Index (0 - 100%)
    adi_score = min(100.0, max(5.0, (pressure_deficit_bar * 4.5) + (max(0.0, 65.0 - current_temp_c) * 1.8)))
    adi_score = round(adi_score, 1)

    deposition_status = "STABLE"
    mitigation_action = "Asphaltene micelles remain solubilized by natural maltene resins."
    if adi_score > 65.0:
        deposition_status = "CRITICAL_PRECIPITATION_RISK"
        mitigation_action = "Severe deposition risk. Schedule aromatic solvent flush (xylene/toluene) or initiate CSS thermal re-stimulation to raise temp > 80°C."
    elif adi_score > 35.0:
        deposition_status = "MODERATE_DEPOSITION_WARNING"
        mitigation_action = "Onset threshold reached in near-wellbore sand face. Monitor pump valve seating pressure."

    # Estimated pump barrel fouling thickness (microns/month)
    barrel_fouling_rate_microns_mo = round(adi_score * 0.75, 1)

    return {
        "current_temp_c": current_temp_c,
        "current_pressure_bar": current_pressure_bar,
        "asphaltene_onset_pressure_bar": current_aop_bar,
        "pressure_deficit_bar": round(pressure_deficit_bar, 1),
        "asphaltene_deposition_index_pct": adi_score,
        "status": deposition_status,
        "estimated_barrel_fouling_microns_mo": barrel_fouling_rate_microns_mo,
        "mitigation_action": mitigation_action
    }


def evaluate_css_production_cutoff(
    well_id: str,
    current_temp_c: float = 58.0,
    current_oil_bopd: float = 145.0,
    current_sor: float = 3.8,
    days_into_production: float = 75.0,
    cooling_rate_c_day: float = 0.32,
    oil_price_usd_bbl: float = 75.0,
    steam_cost_usd_tonne: float = 24.0,
    lift_power_cost_usd_day: float = 48.0,
    fixed_opex_usd_day: float = 350.0
) -> Dict[str, Any]:
    """
    Automated CSS Cycle Economic Production Cut-off Evaluator.
    Determines exactly when to stop producing and trigger the next CSS steam cycle.
    Economic limit occurs when Daily Net Margin <= 0 OR Reservoir Temp drops below mobility threshold (48 C).
    """
    # Daily economics
    daily_revenue_usd = round(current_oil_bopd * oil_price_usd_bbl, 2)
    daily_opex_usd = round(fixed_opex_usd_day + lift_power_cost_usd_day, 2)
    daily_net_margin_usd = round(daily_revenue_usd - daily_opex_usd, 2)

    # Threshold criteria
    economic_min_bopd = round(daily_opex_usd / oil_price_usd_bbl, 1)
    economic_cutoff_temp_c = 48.0  # Baghewala reservoir baseline temperature
    economic_max_sor = 4.8  # Threshold beyond which steam recovery is uneconomic

    # Thermal decline projection
    temp_margin_c = max(0.0, current_temp_c - economic_cutoff_temp_c)
    days_until_thermal_limit = round(temp_margin_c / max(0.05, cooling_rate_c_day), 1)

    # Production decline projection (exponential decay towards economic cut-off)
    bopd_margin = max(0.0, current_oil_bopd - economic_min_bopd)
    decline_rate_per_day = 0.009  # 0.9% daily decline
    days_until_economic_limit = round(np.log(current_oil_bopd / max(1.0, economic_min_bopd)) / decline_rate_per_day, 1) if bopd_margin > 0 else 0.0

    days_remaining = min(days_until_thermal_limit, max(0.0, days_until_economic_limit))

    # Trigger logic
    if current_temp_c <= economic_cutoff_temp_c or current_oil_bopd <= economic_min_bopd or current_sor >= economic_max_sor:
        cycle_status = "CYCLE_CUTOFF_REACHED"
        action = "COMMENCE_NEXT_CSS_CYCLE"
        reason = f"Economic cut-off breached: Temp ({current_temp_c}°C <= {economic_cutoff_temp_c}°C) or Oil Rate ({current_oil_bopd} <= {economic_min_bopd} BOPD). Halt SRP pumping to avoid rod failure in cold crude."
    elif days_remaining <= 14.0:
        cycle_status = "UPCOMING_CYCLE_SWITCH_WINDOW"
        action = "SCHEDULE_STEAM_BOILER"
        reason = f"Approaching cycle boundary in {days_remaining} days. Reserve mobile steam boiler for next injection."
    else:
        cycle_status = "OPTIMAL_PRODUCTION_PHASE"
        action = "MAINTAIN_SRP_PRODUCTION"
        reason = f"Well operating profitably. Net margin ${daily_net_margin_usd}/day. Projected {days_remaining} productive days remaining in current cycle."

    return {
        "well_id": well_id,
        "days_into_production": days_into_production,
        "current_temperature_c": current_temp_c,
        "current_oil_bopd": current_oil_bopd,
        "current_sor": current_sor,
        "economic_cutoffs": {
            "min_temperature_c": economic_cutoff_temp_c,
            "min_economic_bopd": economic_min_bopd,
            "max_sor_threshold": economic_max_sor
        },
        "daily_financials": {
            "daily_revenue_usd": daily_revenue_usd,
            "daily_opex_usd": daily_opex_usd,
            "daily_net_margin_usd": daily_net_margin_usd
        },
        "days_until_thermal_limit": days_until_thermal_limit,
        "days_until_economic_limit": days_until_economic_limit,
        "recommended_days_to_re_steam": days_remaining,
        "cycle_status": cycle_status,
        "action": action,
        "reason": reason
    }
