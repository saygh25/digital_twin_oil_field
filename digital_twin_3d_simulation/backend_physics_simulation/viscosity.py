"""
Physics-based viscosity model for Baghewala Heavy Crude (~17-19° API).

Implements Andrade / Walther viscosity-temperature correlation calibrated
for heavy crudes with high asphaltene content (FR-15).
"""
import math


def calculate_crude_viscosity_cp(temp_celsius: float, api_gravity: float = 18.0) -> float:
    """
    Calculates dynamic viscosity of Baghewala heavy crude in centipoise (cP)
    given reservoir/wellbore temperature in Celsius.

    At 46-48°C (reservoir base temp), dead crude viscosity is ~5,000 - 15,000 cP.
    At 150-200°C (post-steam injection), viscosity drops dramatically to < 20 cP.
    """
    if temp_celsius < 10.0:
        temp_celsius = 10.0

    # Calibrated Andrade parameters for 18° API heavy oil
    t_kelvin = temp_celsius + 273.15
    # Reference: Viscosity ~ A * exp(B / T_K)
    # Calibrated to ~8,000 cP at 48°C (321.15 K) and ~15 cP at 180°C (453.15 K)
    b_param = 6840.0
    a_param = 8000.0 / math.exp(b_param / (48.0 + 273.15))

    viscosity_cp = a_param * math.exp(b_param / t_kelvin)
    return max(1.0, round(viscosity_cp, 2))


def calculate_mobility_ratio(viscosity_cp: float, base_viscosity_cp: float = 8000.0) -> float:
    """
    Mobility relative to baseline cold reservoir state (Mobility ~ 1 / viscosity).
    Higher is better for oil flow.
    """
    if viscosity_cp <= 0:
        return 1.0
    return round(base_viscosity_cp / viscosity_cp, 3)
