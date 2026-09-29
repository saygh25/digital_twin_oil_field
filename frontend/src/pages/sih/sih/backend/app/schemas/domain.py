"""
Pydantic v2 schemas for all core entities in the Baghewala Digital Twin system.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# --- Reservoir Schemas ---
class ReservoirBase(BaseModel):
    name: str
    field_name: str = "Baghewala"
    formation: str = "Jodhpur Sandstone"
    initial_temperature: Optional[float] = 48.0
    initial_pressure: Optional[float] = 110.0
    current_temperature: Optional[float] = 48.0
    current_pressure: Optional[float] = 110.0
    api_gravity: Optional[float] = 18.0
    fluid_properties: Optional[Dict[str, Any]] = Field(default_factory=dict)
    geological_parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ReservoirCreate(ReservoirBase):
    pass


class ReservoirResponse(ReservoirBase):
    reservoir_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Well Schemas ---
class WellBase(BaseModel):
    well_name: str
    location: Optional[str] = "Baghewala Pad-1"
    latitude: Optional[float] = 27.512
    longitude: Optional[float] = 71.890
    reservoir_id: Optional[str] = None
    status: str = "PRODUCING"
    lift_type: str = "SRP"
    depth_m: Optional[float] = 1150.0
    perforation_interval: Optional[str] = "1120-1145 m"
    completion_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    operating_limits: Optional[Dict[str, Any]] = Field(default_factory=dict)


class WellCreate(WellBase):
    pass


class WellUpdate(BaseModel):
    well_name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    lift_type: Optional[str] = None
    depth_m: Optional[float] = None
    perforation_interval: Optional[str] = None
    completion_data: Optional[Dict[str, Any]] = None
    operating_limits: Optional[Dict[str, Any]] = None


class WellResponse(WellBase):
    well_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- CSS Cycle Schemas ---
class CSSCycleBase(BaseModel):
    cycle_number: int
    injection_volume_tonnes: Optional[float] = None
    injection_pressure_bar: Optional[float] = None
    injection_temperature_c: Optional[float] = None
    steam_quality_fraction: Optional[float] = None
    injection_duration_days: Optional[float] = None
    soak_duration_days: Optional[float] = None
    production_duration_days: Optional[float] = None
    cumulative_oil_m3: Optional[float] = None
    cumulative_water_m3: Optional[float] = None
    peak_oil_rate_m3_day: Optional[float] = None
    sor: Optional[float] = None
    energy_consumed_gj: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str = "COMPLETED"
    notes: Optional[str] = None


class CSSCycleCreate(CSSCycleBase):
    well_id: str


class CSSCycleResponse(CSSCycleBase):
    cycle_id: str
    well_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- SRP Schemas ---
class SRPBase(BaseModel):
    stroke_length_m: float = 2.5
    spm: float = 4.0
    vfd_frequency_hz: Optional[float] = 50.0
    pump_depth_m: Optional[float] = 1100.0
    pump_diameter_mm: Optional[float] = 57.0
    motor_rating_kw: Optional[float] = 30.0
    motor_load_percent: Optional[float] = 65.0
    surface_unit_type: str = "Conventional"
    rod_string_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    pump_specifications: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SRPCreate(SRPBase):
    well_id: str


class SRPResponse(SRPBase):
    srp_id: str
    well_id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Sensor Data Schemas ---
class SensorDataCreate(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    well_id: str
    sensor_id: Optional[str] = None
    parameter: str
    value: float
    unit: Optional[str] = None
    quality_flag: str = "VALID"


class SensorDataResponse(SensorDataCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Failure Schemas ---
class FailureCreate(BaseModel):
    well_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    failure_type: str
    component: str
    severity: str = "HIGH"
    description: Optional[str] = None
    root_cause: Optional[str] = None
    maintenance_action: Optional[str] = None
    downtime_hours: Optional[float] = None
    repair_cost: Optional[float] = None
    recorded_by: Optional[str] = None


class FailureResponse(FailureCreate):
    failure_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Prediction Schemas ---
class PredictionCreate(BaseModel):
    well_id: str
    model_name: str
    model_version: str = "1.0.0"
    prediction_type: str
    prediction_value: float
    unit: Optional[str] = None
    prediction_interval_lower: Optional[float] = None
    prediction_interval_upper: Optional[float] = None
    confidence: Optional[float] = 0.9
    confidence_tier: str = "High"
    horizon: Optional[str] = "24h"
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)


class PredictionResponse(PredictionCreate):
    prediction_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Recommendation Schemas ---
class RecommendationCreate(BaseModel):
    well_id: str
    recommendation_type: str
    title: str
    recommendation: str
    reason: str
    contributing_factors: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    suggested_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    current_params: Optional[Dict[str, Any]] = Field(default_factory=dict)
    expected_benefit: Optional[str] = None
    confidence: Optional[float] = 0.88


class RecommendationResponse(RecommendationCreate):
    recommendation_id: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    feedback_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecommendationAction(BaseModel):
    status: str = "ACCEPTED"  # REVIEWED, ACCEPTED, REJECTED, ACTION_TAKEN, RESULT_OBSERVED
    feedback_notes: Optional[str] = None


# --- Auth & User Schemas ---
class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "Field Operator"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
