"""
BudgetBrain — pytest Configuration & Fixtures

Provides:
  - client: FastAPI TestClient with authenticated User context via get_current_user override
  - unauthenticated_client: Pure unauthenticated TestClient (without dependency overrides)
"""

from collections.abc import Generator
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.main import app
from app.models.user import User

TEST_USER = User(
    id="00000000-0000-0000-0000-000000000001",
    email="test@budgetbrain.com",
    full_name="Pytest User",
    is_active=True,
    is_verified=True,
    created_at=datetime.now(timezone.utc),
)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """
    Provides a FastAPI TestClient with get_current_user overridden to return a valid User.
    Ensures all functional tests run with guaranteed authentication context.
    """
    async def override_get_current_user() -> User:
        return TEST_USER

    app.dependency_overrides[get_current_user] = override_get_current_user
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def unauthenticated_client() -> Generator[TestClient, None, None]:
    """Provides a raw unauthenticated TestClient with no dependency overrides."""
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as test_client:
        yield test_client
