"""
SQLAlchemy ORM Data Models (SIH26153)
Database tables storing ingested flow records, predictions, incident scenarios, and benchmark runs.
"""

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class FlowRecordORM(Base):
    __tablename__ = "flow_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    src_ip = Column(String(45), index=True)
    dst_ip = Column(String(45), index=True)
    protocol = Column(String(10))
    bytes_sent = Column(Float)
    bytes_recv = Column(Float)
    flow_duration_ms = Column(Float)
    syn_ack_ratio = Column(Float)
    port_entropy = Column(Float)
    iat_variance = Column(Float)
    payload_entropy = Column(Float)
    predicted_stage = Column(String(50))
    risk_score = Column(Float)

class ScenarioORM(Base):
    __tablename__ = "scenarios"

    id = Column(String(100), primary_key=True)
    title = Column(String(200))
    dataset = Column(String(50))
    attack_type = Column(String(100))
    description = Column(Text)
    duration_seconds = Column(Integer)
    ground_truth_json = Column(JSON)

class BenchmarkRunORM(Base):
    __tablename__ = "benchmark_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    held_out_scenario = Column(String(100))
    macro_f1 = Column(Float)
    fpr = Column(Float)
    lead_time_seconds = Column(Float)
    results_json = Column(JSON)
