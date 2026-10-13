"""
Tests for POST /api/events and event validation.
"""

from datetime import datetime, timezone


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code in (200, 503)
    data = response.get_json()
    assert "status" in data


def test_post_valid_page_view(client):
    """Test valid page_view event creation."""
    payload = {
        "session_id": "test_sess_page",
        "event_type": "page_view",
        "page_url": "https://example.com/home",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "viewport_width": 1920,
        "viewport_height": 1080,
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert "event_id" in data
    assert data["message"] == "Event recorded."


def test_post_valid_click(client):
    """Test valid click event creation."""
    payload = {
        "session_id": "test_sess_click",
        "event_type": "click",
        "page_url": "https://example.com/pricing",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "x": 250,
        "y": 180,
        "viewport_width": 1280,
        "viewport_height": 800,
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert "event_id" in data


def test_post_invalid_event_type(client):
    """Test invalid event type rejection."""
    payload = {
        "session_id": "test_sess_bad",
        "event_type": "scroll",
        "page_url": "https://example.com/test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_post_missing_fields(client):
    """Test rejection when required fields are missing."""
    payload = {
        "event_type": "page_view",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_post_click_missing_coordinates(client):
    """Test click event rejection when coordinates are missing."""
    payload = {
        "session_id": "sess_no_coords",
        "event_type": "click",
        "page_url": "https://example.com/btn",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        # missing x, y, viewport_width, viewport_height
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_post_click_rejects_invalid_coordinates(client):
    """Coordinates must be finite and remain within the recorded viewport."""
    payload = {
        "session_id": "sess_bad_coords",
        "event_type": "click",
        "page_url": "https://example.com/test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "x": 1400,
        "y": 100,
        "viewport_width": 1280,
        "viewport_height": 800,
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 400
    assert "viewport width" in response.get_json()["error"]


def test_post_rejects_oversized_identifiers(client):
    """The API bounds identifiers before they reach MongoDB."""
    payload = {
        "session_id": "s" * 129,
        "event_type": "page_view",
        "page_url": "https://example.com",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    response = client.post("/api/events", json=payload)
    assert response.status_code == 400
    assert "128 characters" in response.get_json()["error"]
