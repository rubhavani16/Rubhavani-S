"""
Pytest configuration and fixtures for River Health Portal API tests.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal, get_db
from app.core.security import create_access_token


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db_session():
    """Database session fixture."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="session")
def resident_token():
    """JWT token for resident user."""
    return create_access_token(data={"sub": "resident"})


@pytest.fixture(scope="session")
def volunteer_token():
    """JWT token for volunteer user."""
    return create_access_token(data={"sub": "volunteer"})


@pytest.fixture(scope="session")
def admin_token():
    """JWT token for admin user."""
    return create_access_token(data={"sub": "admin"})


@pytest.fixture(scope="session")
def auth_headers(resident_token):
    """Auth headers fixture for resident."""
    return {"Authorization": f"Bearer {resident_token}"}


@pytest.fixture(scope="session")
def volunteer_headers(volunteer_token):
    """Auth headers fixture for volunteer."""
    return {"Authorization": f"Bearer {volunteer_token}"}


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    """Auth headers fixture for admin."""
    return {"Authorization": f"Bearer {admin_token}"}
