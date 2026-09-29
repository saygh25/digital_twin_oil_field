"""
Physics-based Reservoir Thermal & Cooling Model for Cyclic Steam Stimulation (CSS).
FR-13, FR-14, FR-16.

Calculates temperature decay, steam zone radius, and thermal energy dissipation
as a function of time, steam injected, and fluid production rate.
"""
import math
from typing import Dict, Any


def calculate_css_thermal_state(
    injection_volume_tonnes: float,
    injection_temp_c: float = 260.0,
    steam_quality: float = 0.8,
    days_since_soak: float = 0.0,
    base_reservoir_temp_c: float = 48.0,
    heat_decay_coefficient: float = 0.015,
) -> Dict[str, Any]:
    """
    Computes current near-wellbore reservoir temperature, cooling rate (°C/day),
    and heated zone radius.

    Steam enthalpy at 260°C (~47 bar sat steam): ~2790 kJ/kg = 2.79 GJ/tonne.
    """
    # Peak temperature achievable near wellbore based on volume and steam quality
    effective_enthalpy_gj = injection_volume_tonnes * (2.1 + 0.7 * steam_quality)
    
    # Peak wellbore temperature post-soak
    temp_elevation_peak = min(injection_temp_c - base_reservoir_temp_c, 180.0 * (1.0 - math.exp(-injection_volume_tonnes / 600.0)))
    
    # Temperature decay with time (days of production)
    current_elevation = temp_elevation_peak * math.exp(-heat_decay_coefficient * max(0.0, days_since_soak))
    current_temp_c = base_reservoir_temp_c + current_elevation

    # Instantaneous cooling rate (°C / day)
    cooling_rate_c_day = heat_decay_coefficient * current_elevation

    # Estimated heated radius (m) from volumetric heat balance
    heated_radius_m = round(math.sqrt(max(1.0, injection_volume_tonnes * 0.08)), 2)

    return {
        "current_temperature_c": round(current_temp_c, 2),
        "peak_temperature_c": round(base_reservoir_temp_c + temp_elevation_peak, 2),
        "cooling_rate_c_day": round(cooling_rate_c_day, 3),
        "heated_radius_m": heated_radius_m,
        "total_heat_injected_gj": round(effective_enthalpy_gj, 2),
        "days_since_soak": days_since_soak,
    }
