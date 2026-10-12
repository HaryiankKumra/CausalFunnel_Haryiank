"""
Pytest fixtures for backend testing.
"""

import pytest
from app import create_app
from app.config import Config


@pytest.fixture(scope="session")
def app():
    """Create an application instance for testing."""
    test_app = create_app({"TESTING": True, "MONGO_DB_NAME": "user_analytics_test"})
    yield test_app
    # Teardown: drop test database
    try:
        if "DB" in test_app.config:
            test_app.config["MONGO_CLIENT"].drop_database("user_analytics_test")
    except Exception:
        pass


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
