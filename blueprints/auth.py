# blueprints/auth.py
import os
import uuid
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from bson import ObjectId
import extensions as ext
from decorators import jwt_required, get_current_user_id
from utils.responses import bad_request, conflict, ok, created, not_found

bp = Blueprint("auth", __name__)


# ── helpers ───────────────────────────────────────────────────
def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _generate_token(user: dict) -> str:
    secret = os.getenv("JWT_SECRET_KEY", "changeme-secret")
    payload = {
        "sub":   str(user["_id"]),
        "email": user["email"],
        "name":  user.get("name", ""),
        "roles": user.get("roles", []),
        "jti":   str(uuid.uuid4()),          # unique token ID for blacklisting
        "iat":   datetime.now(timezone.utc),
        "exp":   datetime.now(timezone.utc) + timedelta(minutes=30)
    }
    return pyjwt.encode(payload, secret, algorithm="HS256")


# ── POST /auth/register ───────────────────────────────────────
@bp.post("/register")
def register():
    if ext.mongo is None:
        return jsonify(error="DB not initialised"), 500

    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").lower().strip()
    password = data.get("password", "")
    name     = data.get("name", "").strip()

    if not email or not password:
        return bad_request("email and password required")
    if len(password) < 6:
        return bad_request("password must be at least 6 characters")

    if ext.mongo.users.find_one({"email": email}):
        return conflict("email already exists")

    ext.mongo.users.insert_one({
        "email":         email,
        "password_hash": _hash_password(password),
        "name":          name,
        "roles":         ["user"],
        "is_active":     True,
        "phone":         "",
        "address":       {},
        "created_at":    datetime.now(timezone.utc)
    })
    return created({"message": "registered successfully"})


# ── POST /auth/login ──────────────────────────────────────────
# Accepts HTTP Basic Auth (Authorization: Basic base64(email:password))
# OR JSON body { "email": "...", "password": "..." }
@bp.post("/login")
def login():
    if ext.mongo is None:
        return jsonify(error="DB not initialised"), 500

    # Try Basic Auth first
    auth = request.authorization
    if auth:
        email = (auth.username or "").lower().strip()
        pwd   = auth.password or ""
    else:
        data  = request.get_json(silent=True) or {}
        email = (data.get("email") or "").lower().strip()
        pwd   = data.get("password") or ""

    if not email or not pwd:
        return bad_request("email and password required")

    user = ext.mongo.users.find_one({"email": email})
    if not user:
        return jsonify(error="invalid credentials"), 401

    if not _check_password(pwd, user.get("password_hash", "")):
        return jsonify(error="invalid credentials"), 401

    if not user.get("is_active", True):
        return jsonify(error="account is deactivated"), 403

    token = _generate_token(user)

    return ok({
        "access_token": token,
        "token_type":   "Bearer",
        "expires_in":   1800,
        "note":         "Pass token in 'x-access-token' or 'Authorization: Bearer' header",
        "user": {
            "id":    str(user["_id"]),
            "name":  user.get("name"),
            "email": user.get("email"),
            "roles": user.get("roles", [])
        }
    })


# ── POST /auth/logout ─────────────────────────────────────────
@bp.post("/logout")
@jwt_required
def logout():
    payload  = request.current_user
    jti      = payload.get("jti")
    exp      = payload.get("exp")
    exp_dt   = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None

    ext.mongo.token_blacklist.insert_one({
        "jti":        jti,
        "user_id":    ObjectId(payload["sub"]),
        "revoked_at": datetime.now(timezone.utc),
        "expires_at": exp_dt
    })
    return ok({"message": "logged out successfully. Token has been cancelled."})


# ── GET /auth/me ──────────────────────────────────────────────
@bp.get("/me")
@jwt_required
def me():
    uid  = get_current_user_id()
    user = ext.mongo.users.find_one({"_id": uid}, {"password_hash": 0})
    if not user:
        return not_found("user not found")

    user["id"] = str(user.pop("_id"))
    if hasattr(user.get("created_at"), "isoformat"):
        user["created_at"] = user["created_at"].isoformat()
    return ok({"user": user})


# ── PUT /auth/me ──────────────────────────────────────────────
@bp.put("/me")
@jwt_required
def update_me():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    allowed = {}
    if "name"    in data: allowed["name"]    = str(data["name"]).strip()
    if "phone"   in data: allowed["phone"]   = str(data["phone"]).strip()
    if "address" in data: allowed["address"] = data["address"]
    if "password" in data:
        if len(data["password"]) < 6:
            return bad_request("password must be at least 6 characters")
        allowed["password_hash"] = _hash_password(data["password"])

    if not allowed:
        return bad_request("no updatable fields provided")

    ext.mongo.users.update_one({"_id": uid}, {"$set": allowed})
    return ok({"updated": True})