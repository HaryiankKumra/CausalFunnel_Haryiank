"""
Tests for GET /api/sessions and GET /api/sessions/<id>/events.
"""

from datetime import datetime, timezone


def test_sessions_list_and_journey(client):
    """Test session aggregation and individual session event retrieval."""
    sid = "sess_pytest_journey"
    # Seed events
    client.post(
        "/api/events",
        json={
            "session_id": sid,
            "event_type": "page_view",
            "page_url": "https://example.com/journey",
            "timestamp": "2026-10-12T01:00:00Z",
            "viewport_width": 1024,
            "viewport_height": 768,
        },
    )
    client.post(
        "/api/events",
        json={
            "session_id": sid,
            "event_type": "click",
            "page_url": "https://example.com/journey",
            "timestamp": "2026-10-12T01:05:00Z",
            "x": 100,
            "y": 200,
            "viewport_width": 1024,
            "viewport_height": 768,
        },
    )

    # Test GET /api/sessions
    res = client.get("/api/sessions")
    assert res.status_code == 200
    data = res.get_json()
    assert "sessions" in data
    found = next((s for s in data["sessions"] if s["session_id"] == sid), None)
    assert found is not None
    assert found["total_events"] == 2
    assert found["page_views"] == 1
    assert found["clicks"] == 1

    # Test GET /api/sessions/<id>/events
    detail_res = client.get(f"/api/sessions/{sid}/events")
    assert detail_res.status_code == 200
    events_data = detail_res.get_json()
    assert events_data["count"] == 2
    assert events_data["events"][0]["event_type"] == "page_view"
    assert events_data["events"][1]["event_type"] == "click"


def test_session_events_not_found(client):
    """Test 404 for non-existent session."""
    res = client.get("/api/sessions/non_existent_session_id_9999/events")
    assert res.status_code == 404
    data = res.get_json()
    assert "error" in data
