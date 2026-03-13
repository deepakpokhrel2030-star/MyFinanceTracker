# utils/responses.py
from flask import jsonify

def ok(payload=None, status=200):
    return jsonify(payload or {}), status

def created(payload=None):
    return jsonify(payload or {}), 201

def no_content():
    return "", 204

def bad_request(msg="bad request"):
    return jsonify(error=msg), 400

def unauthorized(msg="unauthorized"):
    return jsonify(error=msg), 401

def forbidden(msg="forbidden"):
    return jsonify(error=msg), 403

def not_found(msg="not found"):
    return jsonify(error=msg), 404

def conflict(msg="conflict"):
    return jsonify(error=msg), 409