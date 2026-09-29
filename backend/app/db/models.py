"""
SQLAlchemy ORM models corresponding to PROJECT_CONTEXT.md §9 (Data Model).

Implements the 8 core domain tables:
1. Well
2. Reservoir
3. CSSCycle
4. SRP
5. SensorData
6. Failure
7. Prediction
8. Recommendation
Plus User & AuditLog tables for RBAC and audit compliance (FR-01, FR-02).
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
    Text,
    Enum as SQLEnum,
    Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class QualityFlag(str, enum.Enum):
    VALID = "VALID"
    SUSPECT = "SUSPECT"
    MISSING = "MISSING"
    OUTLIER = "OUTLIER"
    INVALID = "INVALID"


class RecommendationStatus(str, enum.Enum):
    GENERATED = "GENERATED"
    REVIEWED = "REVIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    ACTION_TAKEN = "ACTION_TAKEN"
    RESULT_OBSERVED = "RESULT_OBSERVED"


class UserRole(str, enum.Enum):
    ADMINISTRATOR = "Administrator"
    FIELD_OPERATOR = "Field Operator"
    PRODUCTION_ENGINEER = "Production Engineer"
    RESERVOIR_ENGINEER = "Reservoir Engineer"
    ARTIFICIAL_LIFT_ENGINEER = "Artificial Lift Engineer"
    MAINTENANCE_ENGINEER = "Maintenance Engineer"
    FIELD_MANAGER = "Field Manager"
    DATA_SCIENTIST = "Data Scientist"
    SYSTEM_ADMINISTRATOR = "System Administrator"


class Reservoir(Base):
    __tablename__ = "reservoirs"

    reservoir_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    field_name = Column(String(100), default="Baghewala")
    formation = Column(String(100), default="Jodhpur Sandstone")
    initial_temperature = Column(Float, nullable=True, comment="Reservoir initial temp in °C")
    initial_pressure = Column(Float, nullable=True, comment="Reservoir initial pressure in bar/psi")
    current_temperature = Column(Float, nullable=True, comment="Reservoir estimated temp in °C")
    current_pressure = Column(Float, nullable=True, comment="Reservoir estimated pressure in bar/psi")
    api_gravity = Column(Float, default=18.0, comment="Crude API gravity (e.g. 17-19° API)")
    fluid_properties = Column(JSON, default=dict, comment="Viscosity-temp correlations, asphaltene %, etc.")
    geological_parameters = Column(JSON, default=dict, comment="Permeability, porosity, pay zone thickness")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    wells = relationship("Well", back_populates="reservoir", cascade="all, delete-orphan")


class Well(Base):
    __tablename__ = "wells"

    well_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_name = Column(String(100), nullable=False, unique=True, index=True)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    reservoir_id = Column(String(50), ForeignKey("reservoirs.reservoir_id"), nullable=True)
    status = Column(String(50), default="PRODUCING", comment="PRODUCING, INJECTING, SOAKING, SHUT_IN, MAINTENANCE")
    lift_type = Column(String(50), default="SRP", comment="Artificial lift mechanism")
    depth_m = Column(Float, nullable=True)
    perforation_interval = Column(String(100), nullable=True)
    completion_data = Column(JSON, default=dict, comment="Casing, tubing, pump depth, liner info")
    operating_limits = Column(JSON, default=dict, comment="Min/max limits for pressure, temp, SPM, stroke, steam")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reservoir = relationship("Reservoir", back_populates="wells")
    css_cycles = relationship("CSSCycle", back_populates="well", cascade="all, delete-orphan", order_by="CSSCycle.cycle_number")
    srp_config = relationship("SRP", back_populates="well", uselist=False, cascade="all, delete-orphan")
    sensor_data = relationship("SensorData", back_populates="well", cascade="all, delete-orphan")
    failures = relationship("Failure", back_populates="well", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="well", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="well", cascade="all, delete-orphan")


class CSSCycle(Base):
    __tablename__ = "css_cycles"

    cycle_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, index=True)
    cycle_number = Column(Integer, nullable=False)
    injection_volume_tonnes = Column(Float, nullable=True, comment="Steam volume injected (tonnes)")
    injection_pressure_bar = Column(Float, nullable=True, comment="Average injection pressure (bar)")
    injection_temperature_c = Column(Float, nullable=True, comment="Injection steam temperature (°C)")
    steam_quality_fraction = Column(Float, nullable=True, comment="Steam quality 0.0 - 1.0")
    injection_duration_days = Column(Float, nullable=True)
    soak_duration_days = Column(Float, nullable=True)
    production_duration_days = Column(Float, nullable=True)
    cumulative_oil_m3 = Column(Float, nullable=True, comment="Total oil produced in cycle (m³)")
    cumulative_water_m3 = Column(Float, nullable=True, comment="Total water produced in cycle (m³)")
    peak_oil_rate_m3_day = Column(Float, nullable=True)
    sor = Column(Float, nullable=True, comment="Steam-Oil Ratio = Steam Injected (t) / Oil Produced (m³)")
    energy_consumed_gj = Column(Float, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="COMPLETED", comment="PLANNED, INJECTING, SOAKING, PRODUCING, COMPLETED")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    well = relationship("Well", back_populates="css_cycles")

    __table_args__ = (
        Index("ix_css_cycles_well_cycle", "well_id", "cycle_number", unique=True),
    )


class SRP(Base):
    __tablename__ = "srp_configurations"

    srp_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, unique=True, index=True)
    stroke_length_m = Column(Float, nullable=False, default=2.5, comment="Stroke length in meters")
    spm = Column(Float, nullable=False, default=4.0, comment="Strokes per minute")
    vfd_frequency_hz = Column(Float, nullable=True, default=50.0, comment="VFD drive frequency in Hz")
    pump_depth_m = Column(Float, nullable=True)
    pump_diameter_mm = Column(Float, nullable=True)
    motor_rating_kw = Column(Float, nullable=True)
    motor_load_percent = Column(Float, nullable=True)
    surface_unit_type = Column(String(100), default="Conventional")
    rod_string_config = Column(JSON, default=dict, comment="Rod sections: grades, tapers, diameter, weight")
    pump_specifications = Column(JSON, default=dict, comment="Plunger clearance, barrel type, valve sizes")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    well = relationship("Well", back_populates="srp_config")


class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, index=True)
    sensor_id = Column(String(100), nullable=True)
    parameter = Column(String(100), nullable=False, index=True, comment="e.g. WHP, WHT, BHP, BHT, SPM, MOTOR_LOAD, PEAK_POLISHED_ROD_LOAD, MIN_POLISHED_ROD_LOAD, FLOW_RATE")
    value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    quality_flag = Column(String(20), default=QualityFlag.VALID.value, nullable=False)
    raw_value = Column(Float, nullable=True)

    # Relationships
    well = relationship("Well", back_populates="sensor_data")

    __table_args__ = (
        Index("ix_sensor_data_lookup", "well_id", "parameter", "timestamp"),
    )


class Failure(Base):
    __tablename__ = "failures"

    failure_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    failure_type = Column(String(100), nullable=False, comment="ROD_PARTING, PUMP_SEIZURE, ROD_FLOATING, VALVE_LEAK, MOTOR_OVERLOAD")
    component = Column(String(100), nullable=False, comment="SUCKER_ROD, PUMP_BARREL, PLUNGER, SURFACE_UNIT, MOTOR")
    severity = Column(String(50), default="HIGH", comment="LOW, MODERATE, HIGH, CRITICAL")
    description = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    maintenance_action = Column(Text, nullable=True)
    downtime_hours = Column(Float, nullable=True)
    repair_cost = Column(Float, nullable=True)
    recorded_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    well = relationship("Well", back_populates="failures")


class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False, default="1.0.0")
    prediction_type = Column(String(100), nullable=False, comment="PRODUCTION_FORECAST, TEMPERATURE_DECAY, VISCOSITY_ESTIMATE, FAILURE_RISK, ROD_FLOATING_RISK")
    prediction_value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    prediction_interval_lower = Column(Float, nullable=True)
    prediction_interval_upper = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True, comment="Confidence score 0.0 - 1.0")
    confidence_tier = Column(String(20), default="High", comment="High, Moderate, Low")
    horizon = Column(String(50), nullable=True, comment="1h, 24h, 7d, next_cycle")
    details = Column(JSON, default=dict, comment="Contributing features, SHAP values, physics parameters")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    well = relationship("Well", back_populates="predictions")


class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(50), ForeignKey("wells.well_id"), nullable=False, index=True)
    recommendation_type = Column(String(100), nullable=False, comment="CSS_OPTIMIZATION, SRP_OPTIMIZATION, JOINT_OPTIMIZATION, PREVENTIVE_MAINTENANCE, INSPECTION")
    title = Column(String(200), nullable=False)
    recommendation = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    contributing_factors = Column(JSON, default=list, comment="List of feature attributions / physics rationale")
    suggested_params = Column(JSON, default=dict, comment="e.g. {'spm': 3.2, 'stroke': 2.8, 'steam_tonnes': 1200}")
    current_params = Column(JSON, default=dict)
    expected_benefit = Column(String(255), nullable=True, comment="e.g. 'Reduces rod load by 18% and avoids rod floating'")
    confidence = Column(Float, nullable=True)
    status = Column(String(50), default=RecommendationStatus.GENERATED.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    action_taken_at = Column(DateTime, nullable=True)
    action_taken_by = Column(String(100), nullable=True)
    feedback_notes = Column(Text, nullable=True)

    # Relationships
    well = relationship("Well", back_populates="recommendations")


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), default=UserRole.FIELD_OPERATOR.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = Column(String(50), nullable=True)
    username = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
