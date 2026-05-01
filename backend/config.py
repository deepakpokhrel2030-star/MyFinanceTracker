# config.py
import os


class Config:
    # ── Security ──────────────────────────────────────────────
    SECRET_KEY     = os.getenv("SECRET_KEY",     "change-this-secret-key-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-this-jwt-secret-key-in-production")

    # ── MongoDB ───────────────────────────────────────────────
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/financeDB")