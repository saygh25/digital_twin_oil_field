"""
Digital Twin Core State Container (FR-10, FR-11, FR-12).

Maintains a comprehensive, coupled digital representation of:
1. Reservoir State (Pressure, Temperature, Viscosity, Mobility)
2. Wellbore State (Bottomhole P/T, Fluid Level, Inflow Rate)
3. SRP Mechanical State (PPRL, MPRL, Fluid Drag, Pump Efficiency, Rod Floating Risk, Failure Risk)
4. Surface & Energy State (Flow Rate BOPD, Water Cut, Motor Load, Power kW, SOR)
5. 7-Day AI Trajectory Forecast
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.physics.viscosity import calculate_crude_viscosity_cp, calculate_mobility_ratio
from app.physics.thermal import calculate_css_thermal_state
from app.physics.srp_mechanics import calculate_srp_mechanics


class ReservoirTwinState(BaseModel):
    temperature_c: float = 48.0
    pressure_bar: float = 110.0
    viscosity_cp: float = 8000.0
    mobility_ratio: float = 1.0
    cooling_rate_c_day: float = 0.0
    heated_radius_m: float = 0.0


class WellboreTwinState(BaseModel):
    bottomhole_temp_c: float = 48.0
    bottomhole_pressure_bar: float = 85.0
    wellhead_pressure_bar: float = 12.0
    wellhead_temp_c: float = 38.0
    fluid_level_depth_m: float = 250.0


class SRPTwinState(BaseModel):
    stroke_length_m: float = 2.5
    stroke_length_in: float = 98.4
    spm: float = 4.0
    vfd_frequency_hz: float = 50.0
    pprl_kn: float = 85.0
    mprl_kn: float = 25.0
    viscous_drag_kn: float = 10.0
    net_downward_force_kn: float = 15.0
    pump_volumetric_efficiency_pct: float = 78.0
    motor_load_pct: float = 65.0
    power_kw: float = 18.5
    rod_floating_risk_pct: float = 15.0
    failure_risk_pct: float = 12.0


class SurfaceTwinState(BaseModel):
    oil_rate_bopd: int = 412
    oil_rate_m3_day: float = 12.5
    water_cut_pct: float = 35.0
    gas_oil_ratio: float = 15.0
    sor: float = 3.2
    energy_kwh_bbl: float = 22.4


class DigitalTwinFullState(BaseModel):
    well_id: str
    well_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "PRODUCING"
    reservoir: ReservoirTwinState
    wellbore: WellboreTwinState
    srp: SRPTwinState
    surface: SurfaceTwinState
    trajectory_7d: List[Dict[str, Any]] = Field(default_factory=list)
    active_alerts: List[Dict[str, Any]] = Field(default_factory=list)
    recent_recommendations: List[Dict[str, Any]] = Field(default_factory=list)


def compute_well_digital_twin_state(
    well_id: str,
    well_name: str,
    status: str = "PRODUCING",
    days_since_soak: float = 45.0,
    steam_injected_tonnes: float = 1500.0,
    stroke_length_m: float = 2.5,
    spm: float = 4.2,
    pump_depth_m: float = 1100.0,
    pump_diameter_mm: float = 57.0,
    base_reservoir_temp_c: float = 48.0,
    base_reservoir_pressure_bar: float = 110.0,
) -> DigitalTwinFullState:
    """
    Synthesizes physical models into a coherent live Digital Twin state.
    """
    # 1. Thermal state & cooling
    thermal = calculate_css_thermal_state(
        injection_volume_tonnes=steam_injected_tonnes,
        days_since_soak=days_since_soak,
        base_reservoir_temp_c=base_reservoir_temp_c
    )
    current_temp_c = thermal["current_temperature_c"]
    cooling_rate = thermal["cooling_rate_c_day"]

    # 2. Viscosity and mobility
    viscosity_cp = calculate_crude_viscosity_cp(current_temp_c)
    mobility = calculate_mobility_ratio(viscosity_cp)

    # 3. SRP mechanics & loading
    srp_mech = calculate_srp_mechanics(
        stroke_length_m=stroke_length_m,
        spm=spm,
        pump_depth_m=pump_depth_m,
        pump_diameter_mm=pump_diameter_mm,
        viscosity_cp=viscosity_cp
    )

    # 4. Reservoir state container
    res_state = ReservoirTwinState(
        temperature_c=current_temp_c,
        pressure_bar=round(base_reservoir_pressure_bar - (days_since_soak * 0.15), 1),
        viscosity_cp=viscosity_cp,
        mobility_ratio=mobility,
        cooling_rate_c_day=cooling_rate,
        heated_radius_m=thermal["heated_radius_m"]
    )

    # 5. Wellbore state
    wellbore_state = WellboreTwinState(
        bottomhole_temp_c=round(current_temp_c * 0.95, 2),
        bottomhole_pressure_bar=round(res_state.pressure_bar * 0.82, 2),
        wellhead_pressure_bar=14.5,
        wellhead_temp_c=round(max(35.0, current_temp_c * 0.65), 2),
        fluid_level_depth_m=round(200.0 + (days_since_soak * 1.5), 1)
    )

    # 6. Failure risk estimation (coupled rod load, viscosity, SPM, and floating risk)
    failure_risk = min(100.0, (
        (srp_mech["rod_floating_risk_pct"] * 0.45) +
        (srp_mech["pprl_kn"] / 120.0 * 25.0) +
        (spm / 6.0 * 15.0) +
        (viscosity_cp / 8000.0 * 15.0)
    ))

    # 7. SRP state
    srp_state = SRPTwinState(
        stroke_length_m=stroke_length_m,
        stroke_length_in=round(stroke_length_m * 39.3701, 1),
        spm=spm,
        vfd_frequency_hz=round((spm / 5.0) * 50.0, 1),
        pprl_kn=srp_mech["pprl_kn"],
        mprl_kn=srp_mech["mprl_kn"],
        viscous_drag_kn=srp_mech["shear_drag_kn"],
        net_downward_force_kn=srp_mech["net_downward_force_kn"],
        pump_volumetric_efficiency_pct=srp_mech["estimated_pump_efficiency_pct"],
        motor_load_pct=round(min(98.0, (srp_mech["estimated_motor_power_kw"] / 30.0) * 100.0), 1),
        power_kw=srp_mech["estimated_motor_power_kw"],
        rod_floating_risk_pct=srp_mech["rod_floating_risk_pct"],
        failure_risk_pct=round(failure_risk, 1)
    )

    # 8. Surface state
    oil_rate_m3 = srp_mech["estimated_oil_rate_m3_day"]
    oil_bopd = int(round(oil_rate_m3 * 6.2898))
    sor_val = round(steam_injected_tonnes / max(1.0, (oil_rate_m3 * max(1.0, days_since_soak))), 2)

    surface_state = SurfaceTwinState(
        oil_rate_bopd=oil_bopd,
        oil_rate_m3_day=oil_rate_m3,
        water_cut_pct=round(min(85.0, 30.0 + days_since_soak * 0.4), 1),
        gas_oil_ratio=12.0,
        sor=sor_val,
        energy_kwh_bbl=round((srp_state.power_kw * 24.0) / max(0.1, float(oil_bopd)), 1)
    )

    # 9. 7-Day Forward Trajectory
    trajectory = [
        {"day": "Day 0 (Now)", "temp": current_temp_c, "visc": int(viscosity_cp), "bopd": oil_bopd, "float_risk": srp_state.rod_floating_risk_pct},
        {"day": "Day +2", "temp": round(current_temp_c - 1.8, 1), "visc": int(viscosity_cp * 1.15), "bopd": int(oil_bopd * 0.94), "float_risk": min(100.0, round(srp_state.rod_floating_risk_pct + 6, 1))},
        {"day": "Day +4", "temp": round(current_temp_c - 3.9, 1), "visc": int(viscosity_cp * 1.34), "bopd": int(oil_bopd * 0.87), "float_risk": min(100.0, round(srp_state.rod_floating_risk_pct + 14, 1))},
        {"day": "Day +7", "temp": round(current_temp_c - 7.5, 1), "visc": int(viscosity_cp * 1.68), "bopd": int(oil_bopd * 0.76), "float_risk": min(100.0, round(srp_state.rod_floating_risk_pct + 26, 1))},
    ]

    # Alerts & risk tags
    alerts = []
    if srp_state.rod_floating_risk_pct > 50.0:
        alerts.append({
            "severity": "HIGH",
            "type": "ROD_FLOATING_RISK",
            "message": f"Elevated rod floating risk ({srp_state.rod_floating_risk_pct}%) due to high crude viscosity ({viscosity_cp} cP) and downstroke shear drag ({srp_state.viscous_drag_kn} kN)."
        })
    if srp_state.failure_risk_pct > 65.0:
        alerts.append({
            "severity": "HIGH",
            "type": "EQUIPMENT_FAILURE_RISK",
            "message": f"Elevated pump/rod failure risk score ({srp_state.failure_risk_pct}%). Recommend VFD frequency reduction."
        })

    return DigitalTwinFullState(
        well_id=well_id,
        well_name=well_name,
        status=status,
        reservoir=res_state,
        wellbore=wellbore_state,
        srp=srp_state,
        surface=surface_state,
        trajectory_7d=trajectory,
        active_alerts=alerts
    )
