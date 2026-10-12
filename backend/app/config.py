"""
Configuration module.
Reads settings from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

# Ensure .env is loaded in all contexts (pytest, WSGI servers, CLI, run.py)
load_dotenv()


class Config:
    """Application configuration loaded from environment variables."""

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "user_analytics")

    # CORS — allow development origins and any dashboard origins
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null",
    ]
    # Allow appending from env var if provided
    _env_cors = os.getenv("CORS_ORIGINS")
    if _env_cors:
        CORS_ORIGINS.extend([o.strip() for o in _env_cors.split(",") if o.strip()])

    # Flask
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    PORT = int(os.getenv("PORT", 5000))
