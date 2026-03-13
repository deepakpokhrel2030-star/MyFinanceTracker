# blueprints/accounts.py
import extensions as ext
from flask import Blueprint, request
from bson import ObjectId
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("accounts", __name__)


@bp.post("/")
@jwt_required
def create_account():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["account_type", "name", "balance", "currency"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    try:
        balance = float(data["balance"])
    except Exception:
        return bad_request("balance must be a number")

    doc = {
        "user_id":        uid,
        "account_type":   data["account_type"].strip().lower(),
        "name":           data["name"].strip(),
        "balance":        balance,
        "currency":       data["currency"].strip().upper(),
        "bank_name":      data.get("bank_name", "").strip(),
        "account_number": data.get("account_number", "").strip(),
    }
    if "interest_rate" in data:
        try: doc["interest_rate"] = float(data["interest_rate"])
        except Exception: return bad_request("interest_rate must be a number")
    if "credit_limit" in data:
        try: doc["credit_limit"] = float(data["credit_limit"])
        except Exception: return bad_request("credit_limit must be a number")

    res = ext.mongo.accounts.insert_one(doc)
    return created({"id": str(res.inserted_id)})


@bp.get("/")
@jwt_required
def list_accounts():
    uid   = get_current_user_id()
    items = []
    for a in ext.mongo.accounts.find({"user_id": uid}):
        a["id"]      = str(a.pop("_id"))
        a["user_id"] = str(a["user_id"])
        if hasattr(a.get("created_at"), "isoformat"):
            a["created_at"] = a["created_at"].isoformat()
        items.append(a)
    return ok({"items": items})


@bp.get("/<account_id>")
@jwt_required
def get_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)
    if not aid: return bad_request("invalid id — must be 24-character hex string")

    a = ext.mongo.accounts.find_one({"_id": aid, "user_id": uid})
    if not a: return not_found("account not found")

    a["id"]      = str(a.pop("_id"))
    a["user_id"] = str(a["user_id"])
    if hasattr(a.get("created_at"), "isoformat"):
        a["created_at"] = a["created_at"].isoformat()
    return ok({"account": a})


@bp.put("/<account_id>")
@jwt_required
def update_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)
    if not aid: return bad_request("invalid id — must be 24-character hex string")

    data    = request.get_json() or {}
    allowed = {}

    if "name"      in data: allowed["name"]      = str(data["name"]).strip()
    if "bank_name" in data: allowed["bank_name"] = str(data["bank_name"]).strip()
    if "currency"  in data: allowed["currency"]  = str(data["currency"]).strip().upper()
    if "balance"   in data:
        try: allowed["balance"] = float(data["balance"])
        except Exception: return bad_request("balance must be a number")
    if "interest_rate" in data:
        try: allowed["interest_rate"] = float(data["interest_rate"])
        except Exception: return bad_request("interest_rate must be a number")
    if "credit_limit" in data:
        try: allowed["credit_limit"] = float(data["credit_limit"])
        except Exception: return bad_request("credit_limit must be a number")

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.accounts.update_one({"_id": aid, "user_id": uid}, {"$set": allowed})
    if res.matched_count == 0:
        return not_found("account not found")
    return ok({"updated": True})


@bp.delete("/<account_id>")
@jwt_required
def delete_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)
    if not aid: return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.accounts.delete_one({"_id": aid, "user_id": uid})
    if res.deleted_count == 0:
        return not_found("account not found")

    ext.mongo.transactions.delete_many({"account_id": aid, "user_id": uid})
    return no_content()