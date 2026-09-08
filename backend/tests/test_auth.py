"""
Tests for Authentication & Authorization.
"""
import pytest
from fastapi import status


def test_login_success(client):
    response = client.post(
        "/api/auth/token",
        data={"username": "resident", "password": "resident123"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "RESIDENT"
    assert data["username"] == "resident"


def test_login_invalid_password(client):
    response = client.post(
        "/api/auth/token",
        data={"username": "resident", "password": "wrongpassword"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect username or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/token",
        data={"username": "ghost_user", "password": "nopassword"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_me_authenticated(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "resident"
    assert data["role"] == "RESIDENT"


def test_get_me_unauthorized(client):
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
