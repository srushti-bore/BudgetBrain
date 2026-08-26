"""
Tests for /api/v1/health endpoint.
"""
from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_returns_ok_status(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_health_includes_database_status(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["database"] == "ok"
