"""
Flask application factory.

Why a factory?
- We can create different app instances for production vs. testing
- Configuration is injected, not hardcoded
- Blueprints keep routes modular
- This pattern is a common Flask interview topic
"""

from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient

from app.config import Config
from app.models import ensure_indexes


def create_app(config=None):
    """
    Create and configure the Flask application.

    Args:
        config: Optional dict to override default configuration.
                Used by tests to inject a test database.
    """
    app = Flask(__name__)

    # ---- Configuration ----
    app.config.from_object(Config)
    if config:
        app.config.update(config)

    # ---- CORS ----
    # Allow any website embedding tracker.js to POST to /api/events
    # Allow dashboard origins to read analytical APIs
    CORS(
        app,
        resources={
            r"/api/events": {
                "origins": "*",
                "methods": ["POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            },
            r"/api/*": {
                "origins": app.config.get("CORS_ORIGINS", Config.CORS_ORIGINS),
                "methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
            },
        },
    )

    # ---- MongoDB connection ----
    if "DB" not in app.config:
        mongo_uri = app.config.get("MONGO_URI", Config.MONGO_URI)
        mongo_db_name = app.config.get("MONGO_DB_NAME", Config.MONGO_DB_NAME)
        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,  # 5s timeout for Atlas DNS
        )
        db = client[mongo_db_name]
        app.config["DB"] = db
        app.config["MONGO_CLIENT"] = client

    # Create indexes (idempotent — safe to call on every startup)
    with app.app_context():
        try:
            ensure_indexes(app.config["DB"])
        except Exception as e:
            app.logger.warning(f"Could not create indexes on startup: {e}")

    # ---- Health check ----
    @app.route("/api/health", methods=["GET"])
    def health():
        """Simple health check to verify the API is running."""
        try:
            # Ping MongoDB to verify connectivity
            app.config["DB"].command("ping")
            return jsonify({"status": "healthy", "database": "connected"}), 200
        except Exception:
            return jsonify({"status": "unhealthy", "database": "disconnected"}), 503

    # ---- Overview endpoint ----
    @app.route("/api/overview", methods=["GET"])
    def overview():
        """Return aggregate dashboard statistics."""
        from app.models import get_overview_stats

        try:
            stats = get_overview_stats(app.config["DB"])
            return jsonify(stats), 200
        except Exception as e:
            app.logger.error(f"Overview error: {e}")
            return jsonify({"error": "Failed to retrieve overview."}), 500

    # ---- Register Blueprints ----
    from app.routes.events import events_bp
    from app.routes.sessions import sessions_bp
    from app.routes.heatmap import heatmap_bp

    app.register_blueprint(events_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(heatmap_bp)

    # Replit can run the API and the built dashboard as one public service.
    project_root = Path(__file__).resolve().parents[2]
    dashboard_dist = project_root / "dashboard" / "dist"
    demo_root = project_root / "demo"
    tracker_root = project_root / "tracker"

    @app.route("/")
    def dashboard_index():
        if not dashboard_dist.exists():
            return jsonify({"error": "Dashboard is not built. Run npm --prefix dashboard run build."}), 503
        return send_from_directory(dashboard_dist, "index.html")

    @app.route("/demo/<path:filename>")
    def demo_file(filename):
        return send_from_directory(demo_root, filename)

    @app.route("/tracker/<path:filename>")
    def tracker_file(filename):
        return send_from_directory(tracker_root, filename)

    @app.route("/<path:filename>")
    def dashboard_assets(filename):
        requested_file = dashboard_dist / filename
        if requested_file.is_file():
            return send_from_directory(dashboard_dist, filename)
        if "." not in Path(filename).name and dashboard_dist.exists():
            return send_from_directory(dashboard_dist, "index.html")
        return jsonify({"error": "Not found."}), 404

    return app
