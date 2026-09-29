"""
Digital Twin API Router (FR-10, FR-11, FR-12).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, SRP, CSSCycle
from app.digital_twin.state import DigitalTwinFullState, compute_well_digital_twin_state

router = APIRouter()


@router.get("/{well_id}/digital-twin/state", response_model=DigitalTwinFullState)
def get_digital_twin_state(well_id: str, db: Session = Depends(get_db)):
    """
    Returns the real-time Digital Twin state across Reservoir, Wellbore, SRP, and Surface.
    """
    from app.db.session import resolve_well
    well = resolve_well(well_id, db)
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Well {well_id} not found")

    w_id = well.well_id
    srp = db.query(SRP).filter(SRP.well_id == w_id).first()
    spm = srp.spm if srp else 4.2
    stroke = srp.stroke_length_m if srp else 2.5
    pump_depth = srp.pump_depth_m if srp and srp.pump_depth_m else (well.depth_m or 1100.0) - 40.0
    pump_diam = srp.pump_diameter_mm if srp and srp.pump_diameter_mm else 57.0

    latest_cycle = db.query(CSSCycle).filter(CSSCycle.well_id == w_id).order_by(CSSCycle.cycle_number.desc()).first()
    days_since_soak = latest_cycle.production_duration_days if latest_cycle and latest_cycle.production_duration_days else 45.0
    steam_tonnes = latest_cycle.injection_volume_tonnes if latest_cycle and latest_cycle.injection_volume_tonnes else 1500.0

    state = compute_well_digital_twin_state(
        well_id=well.well_id,
        well_name=well.well_name,
        status=well.status,
        days_since_soak=days_since_soak,
        steam_injected_tonnes=steam_tonnes,
        stroke_length_m=stroke,
        spm=spm,
        pump_depth_m=pump_depth,
        pump_diameter_mm=pump_diam,
        base_reservoir_temp_c=48.0,
        base_reservoir_pressure_bar=110.0
    )
    return state
