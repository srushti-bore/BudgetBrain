"""
BudgetBrain — pytest Configuration & Fixtures
"""

from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    Provides a FastAPI TestClient for tests.
    """
    yield TestClient(app)
