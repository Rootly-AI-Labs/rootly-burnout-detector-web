# """
# Database configuration and base models.
# """
# from sqlalchemy import create_engine, MetaData
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker
# import os

# # Database configuration
# DATABASE_URL = os.getenv("DATABASE_URL")
# if not DATABASE_URL:
#     raise ValueError(
#         "DATABASE_URL environment variable is required. "
#         "For local development, use PostgreSQL (e.g., postgresql://user:password@localhost/dbname)"
#     )

# # Create PostgreSQL engine with increased pool limits
# engine = create_engine(
#     DATABASE_URL,
#     pool_size=30,           # Increased from 20 to 30 base connections
#     max_overflow=20,        # Allow 20 overflow connections (total 50 max)
#     pool_pre_ping=True,     # Test connections before use
#     pool_recycle=300,       # Recycle connections every 5 minutes
#     pool_timeout=60,        # Wait up to 60 seconds for connection
#     echo_pool=False         # Set to True for debugging pool issues
# )

# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # Base class for all models
# Base = declarative_base()

# # Dependency to get DB session with better error handling
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#         db.commit()  # Commit successful transactions
#     except Exception as e:
#         db.rollback()  # Rollback on errors
#         raise e
#     finally:
#         db.close()  # Always close the session

# # Create all tables
# def create_tables():
#     Base.metadata.create_all(bind=engine)



"""
Database configuration and base models.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.engine import make_url

# ------------- read env -------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
url = make_url(DATABASE_URL)
backend = url.get_backend_name()

# ------------- engine per dialect -------------
engine_kwargs = {
    "pool_pre_ping": True,
}

if backend == "sqlite":
    # SQLite needs this for multi-threaded FastAPI
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    # SQLite ignores pool_size/max_overflow; don't pass them
else:
    # Postgres / others: keep your pool tuning
    engine_kwargs.update(
        pool_size=30,
        max_overflow=20,
        pool_recycle=300,
        pool_timeout=60,
        echo_pool=False,
    )

engine = create_engine(DATABASE_URL, **engine_kwargs)

# ------------- session/base -------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ------------- dependency -------------
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# ------------- bootstrap -------------
def create_tables():
    Base.metadata.create_all(bind=engine)

