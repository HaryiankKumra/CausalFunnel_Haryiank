"""
GET /api/sessions            — List all sessions with summary stats.
GET /api/sessions/<id>/events — Get all events for a specific session.
"""

from flask import Blueprint, jsonify, current_app
from app.models import get_sessions, get_session_events

sessions_bp = Blueprint("sessions", __name__)


@sessions_bp.route("/api/sessions", methods=["GET"])
def list_sessions():
    """
    Return a list of distinct sessions with aggregated metrics.
    Sorted by most recent activity. Uses MongoDB aggregation pipeline.
    """
    try:
        db = current_app.config["DB"]
        sessions = get_sessions(db)
        return jsonify({"sessions": sessions, "count": len(sessions)}), 200
    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Failed to retrieve sessions."}), 500


@sessions_bp.route("/api/sessions/<session_id>/events", methods=["GET"])
def session_events(session_id):
    """
    Return all events for a given session, sorted chronologically.
    Returns 404 if no events exist for the session.
    """
    try:
        db = current_app.config["DB"]
        events = get_session_events(db, session_id)

        if not events:
            return jsonify({
                "error": f"No events found for session: {session_id}"
            }), 404

        return jsonify({
            "session_id": session_id,
            "events": events,
            "count": len(events),
        }), 200
    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Failed to retrieve session events."}), 500
