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

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # Flask
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    PORT = int(os.getenv("PORT", 5000))
