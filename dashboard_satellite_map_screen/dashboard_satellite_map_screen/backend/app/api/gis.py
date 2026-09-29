from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/api", tags=["GIS & Well Telemetry"])

WELLS_DATA = [
    {"id": "B-01", "name": "Well B-01", "lat": 27.545, "lon": 71.895, "type": "SRP Producer", "state": "Production", "bopd": 117, "steam": 0, "temp": 78.4, "waterCut": 42},
    {"id": "B-02", "name": "Well B-02", "lat": 27.548, "lon": 71.902, "type": "SRP Producer", "state": "Production", "bopd": 139, "steam": 0, "temp": 84.1, "waterCut": 38},
    {"id": "B-03", "name": "Well B-03", "lat": 27.541, "lon": 71.898, "type": "SRP Producer", "state": "Production", "bopd": 161, "steam": 0, "temp": 92.5, "waterCut": 35},
    {"id": "B-04", "name": "Well B-04", "lat": 27.546, "lon": 71.906, "type": "SRP Producer", "state": "Production", "bopd": 183, "steam": 0, "temp": 95.0, "waterCut": 28},
    {"id": "B-05", "name": "Well B-05", "lat": 27.538, "lon": 71.901, "type": "SRP Producer", "state": "Production", "bopd": 205, "steam": 0, "temp": 104.2, "waterCut": 22},
    {"id": "B-06", "name": "Well B-06", "lat": 27.543, "lon": 71.910, "type": "SRP Producer", "state": "Production", "bopd": 95, "steam": 0, "temp": 72.8, "waterCut": 55},
    {"id": "B-07", "name": "Well B-07", "lat": 27.534, "lon": 71.908, "type": "CSS Injector", "state": "Injection", "bopd": 0, "steam": 380, "temp": 240.0, "waterCut": 98},
    {"id": "B-08", "name": "Well B-08", "lat": 27.537, "lon": 71.915, "type": "SRP Producer", "state": "Production", "bopd": 120, "steam": 0, "temp": 81.3, "waterCut": 46},
    {"id": "B-09", "name": "Well B-09", "lat": 27.531, "lon": 71.912, "type": "CSS Soaking", "state": "Soak", "bopd": 0, "steam": 0, "temp": 175.5, "waterCut": 80},
    {"id": "B-10", "name": "Well B-10", "lat": 27.535, "lon": 71.920, "type": "SRP Producer", "state": "Production", "bopd": 183, "steam": 0, "temp": 96.4, "waterCut": 31},
    {"id": "B-11", "name": "Well B-11", "lat": 27.528, "lon": 71.918, "type": "SRP Producer", "state": "Production", "bopd": 205, "steam": 0, "temp": 108.0, "waterCut": 24},
    {"id": "B-12", "name": "Well B-12", "lat": 27.532, "lon": 71.924, "type": "SRP Producer", "state": "Production", "bopd": 95, "steam": 0, "temp": 71.0, "waterCut": 60},
    {"id": "B-13", "name": "Well B-13", "lat": 27.518, "lon": 71.892, "type": "SRP Producer", "state": "Production", "bopd": 117, "steam": 0, "temp": 79.5, "waterCut": 44},
    {"id": "B-14", "name": "Well B-14", "lat": 27.521, "lon": 71.899, "type": "SRP Producer", "state": "Production", "bopd": 139, "steam": 0, "temp": 86.2, "waterCut": 37},
    {"id": "B-15", "name": "Well B-15", "lat": 27.514, "lon": 71.896, "type": "SRP Producer", "state": "Production", "bopd": 161, "steam": 0, "temp": 93.8, "waterCut": 30},
    {"id": "B-16", "name": "Well B-16", "lat": 27.519, "lon": 71.904, "type": "SRP Producer", "state": "Production", "bopd": 183, "steam": 0, "temp": 98.4, "waterCut": 26},
    {"id": "B-17", "name": "Well B-17", "lat": 27.511, "lon": 71.901, "type": "CSS Injector / Producer", "state": "Injection", "bopd": 128, "steam": 380, "temp": 132.1, "waterCut": 24.6},
    {"id": "B-18", "name": "Well B-18", "lat": 27.516, "lon": 71.908, "type": "SRP Producer", "state": "Production", "bopd": 95, "steam": 0, "temp": 74.0, "waterCut": 58},
    {"id": "B-19", "name": "Well B-19", "lat": 27.533, "lon": 71.936, "type": "CSS Soaking", "state": "Soak", "bopd": 0, "steam": 0, "temp": 168.0, "waterCut": 75},
    {"id": "B-20", "name": "Well B-20", "lat": 27.536, "lon": 71.944, "type": "SRP Producer", "state": "Production", "bopd": 139, "steam": 0, "temp": 87.0, "waterCut": 40},
    {"id": "B-21", "name": "Well B-21", "lat": 27.529, "lon": 71.940, "type": "SRP Producer", "state": "Production", "bopd": 161, "steam": 0, "temp": 94.2, "waterCut": 33},
    {"id": "B-22", "name": "Well B-22", "lat": 27.534, "lon": 71.948, "type": "CSS Injector", "state": "Injection", "bopd": 0, "steam": 380, "temp": 245.0, "waterCut": 99},
    {"id": "B-23", "name": "Well B-23", "lat": 27.525, "lon": 71.944, "type": "SRP Producer", "state": "Production", "bopd": 205, "steam": 0, "temp": 106.5, "waterCut": 21},
    {"id": "B-24", "name": "Well B-24", "lat": 27.529, "lon": 71.952, "type": "SRP Producer", "state": "Production", "bopd": 95, "steam": 0, "temp": 70.5, "waterCut": 62},
    {"id": "B-25", "name": "Well B-25", "lat": 27.516, "lon": 71.922, "type": "SRP Producer", "state": "Production", "bopd": 117, "steam": 0, "temp": 80.0, "waterCut": 45},
    {"id": "B-26", "name": "Well B-26", "lat": 27.519, "lon": 71.930, "type": "SRP Producer", "state": "Production", "bopd": 183, "steam": 0, "temp": 99.0, "waterCut": 27},
    {"id": "B-27", "name": "Well B-27", "lat": 27.512, "lon": 71.926, "type": "SRP Producer", "state": "Production", "bopd": 161, "steam": 0, "temp": 92.0, "waterCut": 34},
    {"id": "B-28", "name": "Well B-28", "lat": 27.517, "lon": 71.936, "type": "SRP Producer", "state": "Production", "bopd": 183, "steam": 0, "temp": 97.5, "waterCut": 29},
    {"id": "B-29", "name": "Well B-29", "lat": 27.508, "lon": 71.932, "type": "SRP Producer", "state": "Production", "bopd": 205, "steam": 0, "temp": 105.0, "waterCut": 23},
    {"id": "B-30", "name": "Well B-30", "lat": 27.514, "lon": 71.942, "type": "SRP Producer", "state": "Production", "bopd": 95, "steam": 0, "temp": 69.8, "waterCut": 65}
]

@router.get("/wells")
def get_wells() -> List[Dict[str, Any]]:
    """Returns all 30 Baghewala heavy oil wells with coordinates and live production metrics."""
    return WELLS_DATA

@router.get("/telemetry/{well_id}")
def get_well_telemetry(well_id: str) -> Dict[str, Any]:
    """Returns comprehensive subsurface and surface telemetry for a given well."""
    well = next((w for w in WELLS_DATA if w["id"] == well_id), None)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found")

    is_inj = well["state"] == "Injection"
    return {
        "id": well["id"],
        "name": well["name"],
        "padName": "Pad-3 (South Sector)",
        "formation": "Jodhpur Sandstone (~1050m)",
        "targetDepth": "1054 m MSL",
        "pattern": "Inverted 9-Spot Thermal Flood",
        "lat": well["lat"],
        "lon": well["lon"],
        "state": well["state"],
        "type": "Beam Pumping Unit (C-640D-305-144)" if not is_inj else "CSS High-Pressure Steam Injector",
        "bopd": well["bopd"],
        "grossLiquid": round(well["bopd"] / max(0.01, (1 - well["waterCut"] / 100)), 1),
        "steamRate": well["steam"],
        "waterCut": well["waterCut"],
        "temp": well["temp"],
        "baselineTemp": 42.0,
        "viscosity": 96 if well["temp"] > 100 else 4500,
        "viscosityReduction": "46.8x" if well["temp"] > 100 else "1.0x",
        "gor": 12.4,
        "bhp": 38.2,
        "drawdown": 14.5,
        "casingPress": 12.8,
        "tubingPress": 8.4,
        "steamRadius": 10.9 if is_inj else 4.2,
        "spm": 4.8 if not is_inj else 0.0,
        "strokeLength": 120 if not is_inj else 0,
        "rodLoad": 16840 if not is_inj else 0,
        "motorTorque": 68.4 if not is_inj else 0.0,
        "pumpFillage": 82 if not is_inj else 0,
        "phaseName": "Cycle #4 (Post-Steam Soak)" if well["state"] == "Soak" else ("Injection Phase" if is_inj else "Production Phase"),
        "phaseDays": "Day 18 / 45",
        "cumOil": 48620,
        "cumSteam": 29400,
        "csor": 1.63
    }
