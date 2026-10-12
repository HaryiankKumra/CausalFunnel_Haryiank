"""
End-to-End lifecycle verification script.
Tests all requirements from the assignment specification:
1. page_view ingestion
2. click ingestion with coordinates
3. Session persistence & aggregation count matching
4. Chronological journey order
5. Heatmap coordinate retrieval
6. Invalid payload rejections (validation)
7. Non-existent session handling (404)
"""

import sys
import uuid
from datetime import datetime, timezone
import requests

BASE_URL = "http://localhost:5000"


def run_e2e_test():
    print("=" * 60)
    print("Starting End-to-End Verification Test Suite")
    print("=" * 60)

    # 1. Health check
    print("\n[1/7] Testing API Health Check...")
    r = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    health_data = r.json()
    assert health_data.get("status") == "healthy"
    assert health_data.get("database") == "connected"
    print("  [OK] Health check passed: Database connected.")

    # 2. Ingest Page View Event
    test_session = f"sess_e2e_{uuid.uuid4().hex[:8]}"
    test_url = "http://localhost:5500/demo/index.html"
    print(f"\n[2/7] Recording page_view event for session '{test_session}'...")

    pv_payload = {
        "session_id": test_session,
        "event_type": "page_view",
        "page_url": test_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "viewport_width": 1440,
        "viewport_height": 900,
    }
    r = requests.post(f"{BASE_URL}/api/events", json=pv_payload, timeout=5)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    pv_id = r.json().get("event_id")
    assert pv_id is not None
    print(f"  [OK] page_view recorded with ID: {pv_id}")

    # 3. Ingest Multiple Click Events
    print("\n[3/7] Recording 3 distinct click events with coordinates...")
    click_coords = [(120, 240), (450, 320), (455, 322)]  # 2 clicks close to test density
    for idx, (cx, cy) in enumerate(click_coords):
        click_payload = {
            "session_id": test_session,
            "event_type": "click",
            "page_url": test_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "x": cx,
            "y": cy,
            "viewport_width": 1440,
            "viewport_height": 900,
        }
        r = requests.post(f"{BASE_URL}/api/events", json=click_payload, timeout=5)
        assert r.status_code == 201, f"Click {idx+1} failed: {r.text}"
        print(f"  [OK] Click {idx+1} recorded at ({cx}, {cy})")

    # 4. Verify Session Aggregations
    print("\n[4/7] Verifying Session Aggregation and Counts...")
    r = requests.get(f"{BASE_URL}/api/sessions", timeout=5)
    assert r.status_code == 200
    sessions_data = r.json()
    matched_session = next(
        (s for s in sessions_data["sessions"] if s["session_id"] == test_session),
        None,
    )
    assert matched_session is not None, "Created session not found in /api/sessions list"
    assert matched_session["total_events"] == 4, f"Expected 4 events, got {matched_session['total_events']}"
    assert matched_session["page_views"] == 1, f"Expected 1 page_view, got {matched_session['page_views']}"
    assert matched_session["clicks"] == 3, f"Expected 3 clicks, got {matched_session['clicks']}"
    print(f"  [OK] Session counts verified: 1 page_view + 3 clicks = 4 total events.")

    # 5. Verify Chronological User Journey
    print("\n[5/7] Verifying Chronological Event Journey...")
    r = requests.get(f"{BASE_URL}/api/sessions/{test_session}/events", timeout=5)
    assert r.status_code == 200
    journey_data = r.json()
    events = journey_data.get("events", [])
    assert len(events) == 4
    # First event should be page_view
    assert events[0]["event_type"] == "page_view"
    assert events[1]["event_type"] == "click"
    # Verify chronological sorting
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps), "Events are not chronologically sorted!"
    print("  [OK] Journey verified: 4 events strictly sorted chronologically.")

    # 6. Verify Heatmap Data for URL
    print("\n[6/7] Verifying Heatmap Endpoint for Tracked URL...")
    r = requests.get(f"{BASE_URL}/api/heatmap", params={"page_url": test_url}, timeout=5)
    assert r.status_code == 200
    heat_data = r.json()
    clicks_returned = heat_data.get("clicks", [])
    assert len(clicks_returned) >= 3
    # Check that our clicks exist in the returned array
    found_coords = {(c["x"], c["y"]) for c in clicks_returned}
    for cx, cy in click_coords:
        assert (cx, cy) in found_coords, f"Coordinates ({cx}, {cy}) missing from heatmap data"
    print(f"  [OK] Heatmap verified: {len(clicks_returned)} total clicks mapped for page.")

    # 7. Verify Validation Rejections
    print("\n[7/7] Verifying Validation and Error Handling...")
    # Bad event type
    r = requests.post(f"{BASE_URL}/api/events", json={"session_id": "test", "event_type": "invalid"}, timeout=5)
    assert r.status_code == 400
    # Missing required coordinates for click
    r = requests.post(
        f"{BASE_URL}/api/events",
        json={
            "session_id": "test",
            "event_type": "click",
            "page_url": test_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        timeout=5,
    )
    assert r.status_code == 400
    # 404 for unknown session
    r = requests.get(f"{BASE_URL}/api/sessions/unknown_nonexistent_session_9999/events", timeout=5)
    assert r.status_code == 404
    print("  [OK] Validation verified: 400 returned on bad payloads, 404 returned on missing sessions.")

    print("\n" + "=" * 60)
    print("ALL 7 END-TO-END CRITICAL TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)


if __name__ == "__main__":
    try:
        run_e2e_test()
    except Exception as e:
        print(f"\n[FAIL] E2E Test Failed: {e}")
        sys.exit(1)
