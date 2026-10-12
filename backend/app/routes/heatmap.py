"""
GET /api/heatmap?page_url=<encoded_url> — Click data for heatmap rendering.
GET /api/pages                          — List of tracked page URLs.
"""

from flask import Blueprint, request, jsonify, current_app
from app.models import get_heatmap_data, get_distinct_page_urls

heatmap_bp = Blueprint("heatmap", __name__)


@heatmap_bp.route("/api/heatmap", methods=["GET"])
def heatmap():
    """
    Return click events for a specific page URL.
    Query parameter 'page_url' is required.
    """
    page_url = request.args.get("page_url")

    if not page_url or not page_url.strip():
        return jsonify({"error": "Query parameter 'page_url' is required."}), 400

    try:
        db = current_app.config["DB"]
        clicks = get_heatmap_data(db, page_url.strip())
        return jsonify({
            "page_url": page_url,
            "clicks": clicks,
            "count": len(clicks),
        }), 200
    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Failed to retrieve heatmap data."}), 500


@heatmap_bp.route("/api/pages", methods=["GET"])
def list_pages():
    """
    Return a list of distinct page URLs that have tracked events.
    Used by the dashboard to populate the page selector dropdown.
    """
    try:
        db = current_app.config["DB"]
        pages = get_distinct_page_urls(db)
        return jsonify({"pages": pages, "count": len(pages)}), 200
    except Exception as e:
        current_app.logger.error(f"Database error: {e}")
        return jsonify({"error": "Failed to retrieve pages."}), 500
