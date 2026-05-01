import extensions as ext
from flask import Blueprint, request
from decorators import jwt_required, get_current_user_id
from utils.validators import parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("accounts", __name__)


def normalize_account_type(data):
    return str(data.get("account_type") or data.get("type") or "").strip().lower()


def normalize_balance(balance, account_type):
    amount = abs(float(balance))

    if str(account_type).strip().lower() == "credit":
        return -amount

    return amount


def serialize_account(account):
    account["id"] = str(account.pop("_id"))
    account["user_id"] = str(account["user_id"])

    if "account_type" not in account and "type" in account:
        account["account_type"] = account["type"]

    if hasattr(account.get("created_at"), "isoformat"):
        account["created_at"] = account["created_at"].isoformat()

    return account


@bp.post("/")
@jwt_required
def create_account():
    uid = get_current_user_id()
    data = request.get_json() or {}

    account_type = normalize_account_type(data)

    missing = []
    if not account_type:
        missing.append("account_type")
    if not data.get("name"):
        missing.append("name")
    if data.get("balance") is None:
        missing.append("balance")
    if not data.get("currency"):
        missing.append("currency")

    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    try:
        balance = normalize_balance(data["balance"], account_type)
    except Exception:
        return bad_request("balance must be a number")

    doc = {
        "user_id": uid,
        "account_type": account_type,
        "name": str(data["name"]).strip(),
        "balance": balance,
        "currency": str(data["currency"]).strip().upper(),
        "bank_name": str(data.get("bank_name", "")).strip(),
        "account_number": str(data.get("account_number", "")).strip(),
    }

    if "interest_rate" in data:
        try:
            doc["interest_rate"] = float(data["interest_rate"])
        except Exception:
            return bad_request("interest_rate must be a number")

    if "credit_limit" in data:
        try:
            doc["credit_limit"] = float(data["credit_limit"])
        except Exception:
            return bad_request("credit_limit must be a number")

    res = ext.mongo.accounts.insert_one(doc)

    account = ext.mongo.accounts.find_one({"_id": res.inserted_id, "user_id": uid})
    return created({"account": serialize_account(account)})


@bp.get("/")
@jwt_required
def list_accounts():
    uid = get_current_user_id()
    items = []

    for account in ext.mongo.accounts.find({"user_id": uid}):
        items.append(serialize_account(account))

    return ok({"items": items})


@bp.get("/<account_id>")
@jwt_required
def get_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)

    if not aid:
        return bad_request("invalid id — must be 24-character hex string")

    account = ext.mongo.accounts.find_one({"_id": aid, "user_id": uid})

    if not account:
        return not_found("account not found")

    return ok({"account": serialize_account(account)})


@bp.put("/<account_id>")
@jwt_required
def update_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)

    if not aid:
        return bad_request("invalid id — must be 24-character hex string")

    existing = ext.mongo.accounts.find_one({"_id": aid, "user_id": uid})

    if not existing:
        return not_found("account not found")

    data = request.get_json() or {}
    allowed = {}

    if "name" in data:
        allowed["name"] = str(data["name"]).strip()

    incoming_type = normalize_account_type(data)
    final_type = incoming_type or existing.get("account_type") or existing.get("type") or "checking"

    if incoming_type:
        allowed["account_type"] = incoming_type

    if "bank_name" in data:
        allowed["bank_name"] = str(data["bank_name"]).strip()

    if "currency" in data:
        allowed["currency"] = str(data["currency"]).strip().upper()

    if "balance" in data:
        try:
            allowed["balance"] = normalize_balance(data["balance"], final_type)
        except Exception:
            return bad_request("balance must be a number")

    elif incoming_type:
        try:
            allowed["balance"] = normalize_balance(existing.get("balance", 0), final_type)
        except Exception:
            return bad_request("balance must be a number")

    if "interest_rate" in data:
        try:
            allowed["interest_rate"] = float(data["interest_rate"])
        except Exception:
            return bad_request("interest_rate must be a number")

    if "credit_limit" in data:
        try:
            allowed["credit_limit"] = float(data["credit_limit"])
        except Exception:
            return bad_request("credit_limit must be a number")

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.accounts.update_one(
        {"_id": aid, "user_id": uid},
        {"$set": allowed}
    )

    if res.matched_count == 0:
        return not_found("account not found")

    updated = ext.mongo.accounts.find_one({"_id": aid, "user_id": uid})
    return ok({"updated": True, "account": serialize_account(updated)})


@bp.delete("/<account_id>")
@jwt_required
def delete_account(account_id):
    uid = get_current_user_id()
    aid = parse_objectid(account_id)

    if not aid:
        return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.accounts.delete_one({"_id": aid, "user_id": uid})

    if res.deleted_count == 0:
        return not_found("account not found")

    ext.mongo.transactions.delete_many({"account_id": aid, "user_id": uid})

    return no_content()