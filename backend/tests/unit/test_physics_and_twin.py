"""
Unit tests for physics models, digital twin state container, and joint optimizer.
"""
import pytest
from app.physics.viscosity import calculate_crude_viscosity_cp, calculate_mobility_ratio
from app.physics.thermal import calculate_css_thermal_state
from app.physics.srp_mechanics import calculate_srp_mechanics
from app.digital_twin.state import compute_well_digital_twin_state
from app.optimization.joint.optimizer import optimize_joint_css_srp


def test_viscosity_temperature_behavior():
    # Baghewala crude dead oil viscosity at 48°C should be heavy (~8,000 cP)
    visc_cold = calculate_crude_viscosity_cp(48.0)
    assert 7000.0 <= visc_cold <= 9000.0

    # At post-steam temperature (180°C), viscosity should drop sharply (< 30 cP)
    visc_hot = calculate_crude_viscosity_cp(180.0)
    assert visc_hot < 30.0

    # Mobility ratio increases with temperature
    assert calculate_mobility_ratio(visc_hot) > calculate_mobility_ratio(visc_cold)


def test_css_thermal_decay():
    thermal_early = calculate_css_thermal_state(injection_volume_tonnes=1500.0, days_since_soak=5.0)
    thermal_late = calculate_css_thermal_state(injection_volume_tonnes=1500.0, days_since_soak=60.0)

    # Temperature decays over time
    assert thermal_early["current_temperature_c"] > thermal_late["current_temperature_c"]
    assert thermal_early["heated_radius_m"] > 0
    assert thermal_late["cooling_rate_c_day"] > 0


def test_srp_mechanics_and_rod_floating():
    # In cold viscous crude with high SPM, rod floating risk should increase
    srp_fast = calculate_srp_mechanics(stroke_length_m=2.5, spm=5.5, pump_depth_m=1100.0, pump_diameter_mm=57.0, viscosity_cp=7500.0)
    srp_slow = calculate_srp_mechanics(stroke_length_m=2.5, spm=3.0, pump_depth_m=1100.0, pump_diameter_mm=57.0, viscosity_cp=7500.0)

    assert srp_fast["rod_floating_risk_pct"] > srp_slow["rod_floating_risk_pct"]
    assert srp_fast["pprl_kn"] > srp_slow["pprl_kn"]
    assert srp_fast["shear_drag_kn"] > srp_slow["shear_drag_kn"]


def test_digital_twin_state_synthesis():
    state = compute_well_digital_twin_state(
        well_id="well-test-01",
        well_name="BGW-01",
        status="PRODUCING",
        days_since_soak=40.0,
        steam_injected_tonnes=1600.0
    )

    assert state.well_id == "well-test-01"
    assert state.reservoir.temperature_c > 48.0
    assert state.reservoir.viscosity_cp > 0
    assert state.srp.pprl_kn > 0
    assert state.surface.oil_rate_m3_day > 0


def test_joint_optimizer():
    res = optimize_joint_css_srp(
        well_id="well-test-01",
        current_spm=4.5,
        current_stroke_m=2.5,
        current_steam_tonnes=1500.0
    )

    assert "optimal_operating_point" in res
    assert "recommended_action" in res
    assert res["recommended_action"]["confidence"] > 0.8
    assert len(res["recommended_action"]["contributing_factors"]) >= 2
