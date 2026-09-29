"""
Wells API endpoints (FR-03, FR-04).
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Well, Reservoir, SRP
from app.schemas.domain import WellCreate, WellUpdate, WellResponse

router = APIRouter()


ALL_FIELD_WELLS = [
    # Pad-NK (North Heavy Oil Cluster)
    {"name": "NK-07", "pad": "Pad-NK (North Field)", "lat": 27.5630, "lon": 71.9380, "status": "PRODUCING", "lift": "SRP", "depth": 1040.0},
    {"name": "NK-68", "pad": "Pad-NK (North Field)", "lat": 27.5580, "lon": 71.9160, "status": "PRODUCING", "lift": "SRP", "depth": 1045.0},
    {"name": "NK-75", "pad": "Pad-NK (North Field)", "lat": 27.5560, "lon": 71.9240, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
    {"name": "NK-76", "pad": "Pad-NK (North Field)", "lat": 27.5520, "lon": 71.9120, "status": "INJECTION", "lift": "CSS", "depth": 1042.0},
    {"name": "NK-82", "pad": "Pad-NK (North Field)", "lat": 27.5610, "lon": 71.9280, "status": "PRODUCING", "lift": "SRP", "depth": 1048.0},
    {"name": "NK-91", "pad": "Pad-NK (North Field)", "lat": 27.5540, "lon": 71.9360, "status": "PRODUCING", "lift": "SRP", "depth": 1052.0},
    {"name": "NK-93", "pad": "Pad-NK (North Field)", "lat": 27.5590, "lon": 71.9050, "status": "SOAKING", "lift": "CSS", "depth": 1046.0},

    # Pad-1 (North-Jodhpur Sector)
    {"name": "B-01", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5460, "lon": 71.8860, "status": "PRODUCING", "lift": "SRP", "depth": 1045.0},
    {"name": "B-02", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5490, "lon": 71.8940, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
    {"name": "B-03", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5430, "lon": 71.8920, "status": "PRODUCING", "lift": "SRP", "depth": 1048.0},
    {"name": "B-04", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5470, "lon": 71.9020, "status": "PRODUCING", "lift": "SRP", "depth": 1052.0},
    {"name": "B-05", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5410, "lon": 71.8980, "status": "PRODUCING", "lift": "SRP", "depth": 1055.0},
    {"name": "B-06", "pad": "Pad-1 (North-Jodhpur)", "lat": 27.5440, "lon": 71.9060, "status": "PRODUCING", "lift": "SRP", "depth": 1047.0},

    # Pad-2 (Central-GGS Sector)
    {"name": "B-07", "pad": "Pad-2 (Central-GGS)", "lat": 27.5340, "lon": 71.9040, "status": "INJECTION", "lift": "CSS", "depth": 1045.0},
    {"name": "B-08", "pad": "Pad-2 (Central-GGS)", "lat": 27.5370, "lon": 71.9120, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
    {"name": "B-09", "pad": "Pad-2 (Central-GGS)", "lat": 27.5310, "lon": 71.9100, "status": "SOAKING", "lift": "CSS", "depth": 1052.0},
    {"name": "B-10", "pad": "Pad-2 (Central-GGS)", "lat": 27.5350, "lon": 71.9180, "status": "PRODUCING", "lift": "SRP", "depth": 1048.0},
    {"name": "B-11", "pad": "Pad-2 (Central-GGS)", "lat": 27.5280, "lon": 71.9150, "status": "PRODUCING", "lift": "SRP", "depth": 1054.0},
    {"name": "B-12", "pad": "Pad-2 (Central-GGS)", "lat": 27.5320, "lon": 71.9220, "status": "PRODUCING", "lift": "SRP", "depth": 1046.0},

    # Pad-3 (South-Extension Sector)
    {"name": "B-13", "pad": "Pad-3 (South-Extension)", "lat": 27.5180, "lon": 71.8880, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
    {"name": "B-14", "pad": "Pad-3 (South-Extension)", "lat": 27.5210, "lon": 71.8960, "status": "PRODUCING", "lift": "SRP", "depth": 1052.0},
    {"name": "B-15", "pad": "Pad-3 (South-Extension)", "lat": 27.5140, "lon": 71.8940, "status": "PRODUCING", "lift": "SRP", "depth": 1048.0},
    {"name": "B-16", "pad": "Pad-3 (South-Extension)", "lat": 27.5170, "lon": 71.9040, "status": "PRODUCING", "lift": "SRP", "depth": 1055.0},
    {"name": "B-17", "pad": "Pad-3 (South-Extension)", "lat": 27.5110, "lon": 71.9000, "status": "INJECTION", "lift": "CSS", "depth": 1048.0},
    {"name": "B-18", "pad": "Pad-3 (South-Extension)", "lat": 27.5150, "lon": 71.9100, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},

    # Pad-4 (East-Sandstone Sector)
    {"name": "B-19", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5320, "lon": 71.9340, "status": "SOAKING", "lift": "CSS", "depth": 1050.0},
    {"name": "B-20", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5360, "lon": 71.9420, "status": "PRODUCING", "lift": "SRP", "depth": 1046.0},
    {"name": "B-21", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5280, "lon": 71.9380, "status": "PRODUCING", "lift": "SRP", "depth": 1052.0},
    {"name": "B-22", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5330, "lon": 71.9480, "status": "INJECTION", "lift": "CSS", "depth": 1048.0},
    {"name": "B-23", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5240, "lon": 71.9440, "status": "PRODUCING", "lift": "SRP", "depth": 1054.0},
    {"name": "B-24", "pad": "Pad-4 (East-Sandstone)", "lat": 27.5290, "lon": 71.9520, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},

    # Pad-5 (Deep Jodhpur Sector)
    {"name": "B-25", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5160, "lon": 71.9220, "status": "PRODUCING", "lift": "SRP", "depth": 1055.0},
    {"name": "B-26", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5190, "lon": 71.9300, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
    {"name": "B-27", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5120, "lon": 71.9260, "status": "PRODUCING", "lift": "SRP", "depth": 1052.0},
    {"name": "B-28", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5170, "lon": 71.9360, "status": "PRODUCING", "lift": "SRP", "depth": 1048.0},
    {"name": "B-29", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5080, "lon": 71.9320, "status": "PRODUCING", "lift": "SRP", "depth": 1056.0},
    {"name": "B-30", "pad": "Pad-5 (Deep Jodhpur)", "lat": 27.5140, "lon": 71.9420, "status": "PRODUCING", "lift": "SRP", "depth": 1050.0},
]


@router.get("", response_model=List[WellResponse])
def list_wells(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all registered Baghewala field wells."""
    existing_wells = {w.well_name: w for w in db.query(Well).all()}
    
    # Ensure default reservoir exists
    default_reservoir = db.query(Reservoir).filter(Reservoir.name == "Baghewala-Jodhpur-Main").first()
    if not default_reservoir:
        default_reservoir = Reservoir(
            name="Baghewala-Jodhpur-Main",
            field_name="Baghewala",
            formation="Jodhpur Sandstone",
            initial_temperature=48.0,
            initial_pressure=110.0,
            current_temperature=52.0,
            current_pressure=105.0,
            api_gravity=18.2,
            fluid_properties={"dead_oil_viscosity_48c_cp": 8200, "asphaltene_pct": 14.5}
        )
        db.add(default_reservoir)
        db.commit()
        db.refresh(default_reservoir)

    # Seed all missing Baghewala wells
    added = False
    for item in ALL_FIELD_WELLS:
        w_name = item["name"]
        if w_name not in existing_wells and not any(w_name in (w.well_name or '') for w in existing_wells.values()):
            new_well = Well(
                well_name=w_name,
                location=item["pad"],
                latitude=item["lat"],
                longitude=item["lon"],
                reservoir_id=default_reservoir.reservoir_id,
                status=item["status"],
                lift_type=item["lift"],
                depth_m=item["depth"],
                perforation_interval=f"{int(item['depth']-25)}-{int(item['depth']-2)} m",
                completion_data={"casing_od_in": 7.0, "tubing_od_in": 2.875, "pump_depth_m": item["depth"] - 40.0},
                operating_limits={"max_spm": 6.0, "min_spm": 1.5, "max_pprl_kn": 120.0, "max_steam_tonnes": 2500.0}
            )
            db.add(new_well)
            added = True

    if added:
        db.commit()

    wells = db.query(Well).all()
    # Add default SRP config for any well missing it
    for w in wells:
        if not w.srp_config:
            srp = SRP(
                well_id=w.well_id,
                stroke_length_m=2.5,
                spm=4.2,
                vfd_frequency_hz=50.0,
                pump_depth_m=1100.0,
                pump_diameter_mm=57.0,
                motor_rating_kw=30.0,
                motor_load_percent=68.0
            )
            db.add(srp)
    db.commit()

    # Sort in natural alphanumeric order: B-01 to B-30, then NK-07 to NK-93
    def sort_key(w):
        name = w.well_name or w.well_id or ""
        import re
        parts = re.split(r'(\d+)', name)
        return [int(p) if p.isdigit() else p for p in parts]

    sorted_wells = sorted(wells, key=sort_key)
    return sorted_wells[skip:skip+limit]


@router.get("/{well_id}", response_model=WellResponse)
def get_well(well_id: str, db: Session = Depends(get_db)):
    """Get single well details by well_id or well_name."""
    from sqlalchemy import or_
    well = db.query(Well).filter(or_(Well.well_id == well_id, Well.well_name == well_id)).first()
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Well with ID {well_id} not found")
    return well


@router.post("", response_model=WellResponse, status_code=status.HTTP_201_CREATED)
def create_well(well_in: WellCreate, db: Session = Depends(get_db)):
    """Register a new well."""
    existing = db.query(Well).filter(Well.well_name == well_in.well_name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Well with name {well_in.well_name} already exists")
    
    well = Well(**well_in.model_dump())
    db.add(well)
    db.commit()
    db.refresh(well)
    return well


@router.put("/{well_id}", response_model=WellResponse)
def update_well(well_id: str, well_in: WellUpdate, db: Session = Depends(get_db)):
    """Update well configuration or operating limits."""
    from sqlalchemy import or_
    well = db.query(Well).filter(or_(Well.well_id == well_id, Well.well_name == well_id)).first()
    if not well:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Well with ID {well_id} not found")

    update_data = well_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(well, field, val)

    db.commit()
    db.refresh(well)
    return well
