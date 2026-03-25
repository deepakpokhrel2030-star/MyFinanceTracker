# extensions.py
import os
import json
import bcrypt
from urllib.parse import urlparse
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ServerSelectionTimeoutError

# -------------------------------------------------------------------
# Globals
# -------------------------------------------------------------------
mongo = None  # Database handle


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def _extract_db_name(uri: str) -> Optional[str]:
    try:
        parsed = urlparse(uri)
        if parsed.path and parsed.path != "/":
            db = parsed.path.lstrip("/")
            if "?" in db:
                db = db.split("?", 1)[0]
            return db or None
    except Exception:
        pass
    return None


def _convert_extended_json(value):
    """Convert {"$oid": "..."} -> ObjectId and {"$date": "..."} -> datetime recursively."""
    if isinstance(value, dict):
        if "$oid" in value and isinstance(value["$oid"], str):
            return ObjectId(value["$oid"])
        if "$date" in value and isinstance(value["$date"], str):
            return datetime.fromisoformat(value["$date"].replace("Z", "+00:00"))
        return {k: _convert_extended_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_convert_extended_json(v) for v in value]
    return value


def _load_dataset_from_file(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return _convert_extended_json(data)


def _rehash_with_bcrypt(users: list) -> list:
    """
    Ensure all user passwords are hashed with bcrypt.
    If a password_hash doesn't start with $2b$ it's not bcrypt — rehash with default password.
    """
    for user in users:
        ph = user.get("password_hash", "")
        if not ph.startswith("$2b$"):
            user["password_hash"] = bcrypt.hashpw(
                b"password12345", bcrypt.gensalt()
            ).decode("utf-8")
    return users


# -------------------------------------------------------------------
# Public init
# -------------------------------------------------------------------
def init_extensions(app):
    global mongo

    uri     = app.config.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI not set in config/env")

    client  = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db_name = _extract_db_name(uri) or os.getenv("MONGO_DB_NAME") or "financeDB"
    mongo   = client[db_name]

    try:
        client.admin.command("ping")
        print(f"[Mongo] Connected to DB: {db_name}")
    except ServerSelectionTimeoutError as e:
        raise RuntimeError(f"Cannot connect to MongoDB: {e}")

    _create_indexes()

    reload_flag = os.getenv("DATASET_RELOAD", "true").strip().lower()
    if reload_flag in ("1", "true", "yes", "y"):
        _reload_dataset()
    else:
        print("[Dataset] Reload skipped (DATASET_RELOAD is false)")


def _create_indexes():
    global mongo
    try:
        mongo.users.create_index("email", unique=True)
        mongo.accounts.create_index("user_id")
        mongo.transactions.create_index("user_id")
        mongo.transactions.create_index("account_id")
        mongo.transactions.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
        mongo.budgets.create_index([("user_id", ASCENDING), ("month", ASCENDING)])
        mongo.investments.create_index("user_id")
        mongo.savings_goals.create_index("user_id")
        mongo.token_blacklist.create_index("jti", unique=True)
        mongo.token_blacklist.create_index("expires_at", expireAfterSeconds=0)  # auto-cleanup
        print("[Mongo] Indexes created")
    except Exception as e:
        print(f"[Mongo] Index warning: {e}")


def _reload_dataset():
    global mongo
    dataset_path = "dataset.json"

    if not os.path.exists(dataset_path):
        print("[Dataset] dataset.json not found; skipping")
        return

    print("[Dataset] Loading dataset.json ...")
    data = _load_dataset_from_file(dataset_path)

    collections = ["users", "accounts", "transactions", "budgets", "investments", "savings_goals"]

    for coll in collections:
        rows = data.get(coll, [])
        mongo[coll].drop()
        print(f"[Dataset] Dropped {coll}")

        if not rows:
            print(f"[Dataset] {coll}: nothing to insert")
            continue

        if coll == "users":
            rows = _rehash_with_bcrypt(rows)

        mongo[coll].insert_many(rows)
        print(f"[Dataset] Inserted {len(rows)} into {coll}")

    # Clear blacklist on reload
    mongo.token_blacklist.drop()
    print("[Dataset] Dropped token_blacklist (fresh start)")