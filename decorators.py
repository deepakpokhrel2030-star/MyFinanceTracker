# decorators.py
import os
import jwt
from functools import wraps
from datetime import datetime, timezone
from flask import request, jsonify
from bson import ObjectId
import extensions as ext


def _get_token():
    """Extract JWT from x-access-token header or Authorization: Bearer header."""
    token = request.headers.get("x-access-token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


def _decode_token(token):
    """Decode and validate a JWT token. Returns payload or raises."""
    secret = os.getenv("JWT_SECRET_KEY", "changeme-secret")
    return jwt.decode(token, secret, algorithms=["HS256"])


def jwt_required(fn):
    """
    Decorator: protects a route with JWT authentication.
    Checks x-access-token or Authorization: Bearer header.
    Also checks token blacklist in MongoDB.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _get_token()

        if not token:
            return jsonify(error="Token is missing. Provide token in x-access-token or Authorization header"), 401

        try:
            payload = _decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify(error="Token has expired, please login again"), 401
        except jwt.InvalidTokenError as e:
            return jsonify(error=f"Invalid token: {str(e)}"), 401

        # Check blacklist
        jti = payload.get("jti")
        if jti and ext.mongo.token_blacklist.find_one({"jti": jti}):
            return jsonify(error="Token has been cancelled"), 401

        # Attach payload to request for use in route
        request.current_user = payload
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """
    Decorator: must be used AFTER @jwt_required.
    Allows access only if the JWT payload contains role 'admin'.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        payload = getattr(request, "current_user", {})
        if "admin" not in (payload.get("roles") or []):
            return jsonify(error="Admin access required"), 403
        return fn(*args, **kwargs)

    return wrapper


def get_current_user_id():
    """Helper: returns ObjectId of the current logged-in user."""
    payload = getattr(request, "current_user", {})
    return ObjectId(payload["sub"])


def get_current_user_roles():
    """Helper: returns roles list of the current logged-in user."""
    payload = getattr(request, "current_user", {})
    return payload.get("roles", [])