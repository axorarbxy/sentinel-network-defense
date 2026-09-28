"""
SQLite Database Initialization Module (SIH26153)
Manages SQLAlchemy engine & session factory storing flows and benchmark runs.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models_orm import Base

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "sentinel.db")

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create all SQLite tables if they do not exist."""
    Base.metadata.create_all(bind=engine)
    print("[SENTINEL DB] Database initialized at:", DB_PATH)

def get_db():
    """Dependency helper for FastAPI database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
