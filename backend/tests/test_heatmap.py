"""
Tests for GET /api/heatmap and GET /api/pages.
"""


def test_heatmap_and_pages(client):
    """Test click heatmap data filtering and page listing."""
    target_page = "https://example.com/heatmap-test"

    # Seed events
    client.post(
        "/api/events",
        json={
            "session_id": "sess_heat_1",
            "event_type": "page_view",
            "page_url": target_page,
            "timestamp": "2026-10-12T02:00:00Z",
            "viewport_width": 1200,
            "viewport_height": 800,
        },
    )
    client.post(
        "/api/events",
        json={
            "session_id": "sess_heat_1",
            "event_type": "click",
            "page_url": target_page,
            "timestamp": "2026-10-12T02:01:00Z",
            "x": 350,
            "y": 420,
            "viewport_width": 1200,
            "viewport_height": 800,
        },
    )

    # Test GET /api/pages
    pages_res = client.get("/api/pages")
    assert pages_res.status_code == 200
    pages_data = pages_res.get_json()
    assert target_page in pages_data["pages"]

    # Test GET /api/heatmap?page_url=...
    heat_res = client.get(f"/api/heatmap?page_url={target_page}")
    assert heat_res.status_code == 200
    heat_data = heat_res.get_json()
    assert heat_data["count"] >= 1
    assert any(c["x"] == 350 and c["y"] == 420 for c in heat_data["clicks"])


def test_heatmap_missing_param(client):
    """Test 400 when page_url query param is omitted."""
    res = client.get("/api/heatmap")
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data


def test_page_scores_and_reset(client):
    """Scores are calculated per page and reset removes collected events."""
    for page_url, clicks in [
        ("https://example.com/strong", 3),
        ("https://example.com/quiet", 1),
    ]:
        client.post(
            "/api/events",
            json={
                "session_id": f"sess_{page_url.rsplit('/', 1)[-1]}",
                "event_type": "page_view",
                "page_url": page_url,
                "timestamp": "2026-10-12T03:00:00Z",
                "viewport_width": 1200,
                "viewport_height": 800,
            },
        )
        for index in range(clicks):
            client.post(
                "/api/events",
                json={
                    "session_id": f"sess_{page_url.rsplit('/', 1)[-1]}",
                    "event_type": "click",
                    "page_url": page_url,
                    "timestamp": f"2026-10-12T03:0{index + 1}:00Z",
                    "x": 100 + index,
                    "y": 200,
                    "viewport_width": 1200,
                    "viewport_height": 800,
                },
            )

    scores = client.get("/api/page-scores")
    assert scores.status_code == 200
    score_map = {item["page_url"]: item["score"] for item in scores.get_json()["pages"]}
    assert score_map["https://example.com/strong"] > score_map["https://example.com/quiet"]

    reset = client.delete("/api/events")
    assert reset.status_code == 200
    assert reset.get_json()["deleted"] >= 8
    assert client.get("/api/pages").get_json()["pages"] == []
