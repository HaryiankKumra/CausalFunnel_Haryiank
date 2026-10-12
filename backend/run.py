"""
Entry point for the Flask application.

Usage:
    python run.py

The .env file is loaded automatically by python-dotenv.
"""

from dotenv import load_dotenv

# Load environment variables BEFORE importing the app
# so Config reads the correct values
load_dotenv()

from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    print(f"[*] Analytics API running on http://localhost:{Config.PORT}")
    print(f"[*] Health check: http://localhost:{Config.PORT}/api/health")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
