"""
POST /api/events — Ingest tracking events.
"""

from flask import Blueprint, request, jsonify, current_app
from app.validators import validate_event
from app.models import insert_event

events_bp = Blueprint("events", __name__)


@events_bp.route("/api/events", methods=["POST"])
def create_event():
    """
    Accept a tracking event from the client-side script.

    Expects JSON body with: session_id, event_type, page_url, timestamp,
    and (for clicks) x, y, viewport_width, viewport_height.

    Returns:
        201 — event stored successfully
        400 — validation error
        500 — database error
    """
    # Parse JSON body
    data = request.get_json(silent=True)
    if data is None:
        try:
            import json
            raw_text = request.get_data(as_text=True)
            if raw_text:
                data = json.loads(raw_text)
        except Exception:
            pass

    if data is None:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    # Validate
    event, error = validate_event(data)
    if error:
        return jsonify({"error": error}), 400

    # Store in MongoDB
    try:
        db = current_app.config["DB"]
        event_id = insert_event(db, event)
        return jsonify({"message": "Event recorded.", "event_id": event_id}), 201
    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Failed to store event."}), 500
