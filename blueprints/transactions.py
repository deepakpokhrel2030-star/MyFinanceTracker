# blueprints/transactions.py
import extensions as ext
from flask import Blueprint, request
from bson import ObjectId
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid, parse_date
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("transactions", __name__)


@bp.post("/")
@jwt_required
def create_tx():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["account_id", "amount", "date", "type", "category"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    aid = parse_objectid(data["account_id"])
    if not aid: return bad_request("invalid account_id — must be 24-character hex string")

    if not ext.mongo.accounts.find_one({"_id": aid, "user_id": uid}):
        return not_found("account not found")

    dt = parse_date(data["date"])
    if not dt: return bad_request("invalid date; use YYYY-MM-DD or ISO format")

    try:
        amt = float(data["amount"])
    except Exception:
        return bad_request("amount must be a number")

    tx = {
        "user_id":     uid,
        "account_id":  aid,
        "amount":      amt,
        "type":        data.get("type", "expense").strip().lower(),
        "category":    data.get("category", "").strip().lower(),
        "merchant":    data.get("merchant", "").strip(),
        "description": data.get("description", "").strip(),
        "date":        dt,
        "status":      data.get("status", "completed").strip().lower(),
        "tags":        data.get("tags", [])
    }
    res = ext.mongo.transactions.insert_one(tx)
    ext.mongo.accounts.update_one({"_id": aid}, {"$inc": {"balance": amt}})
    return created({"id": str(res.inserted_id)})


@bp.get("/")
@jwt_required
def list_tx():
    uid = get_current_user_id()
    q   = {"user_id": uid}

    start = request.args.get("start")
    end   = request.args.get("end")
    if start or end:
        q["date"] = {}
        if start:
            ds = parse_date(start)
            if not ds: return bad_request("invalid start date")
            q["date"]["$gte"] = ds
        if end:
            de = parse_date(end)
            if not de: return bad_request("invalid end date")
            q["date"]["$lte"] = de

    if request.args.get("category"):
        q["category"] = request.args.get("category").lower()
    if request.args.get("type"):
        q["type"] = request.args.get("type").lower()
    if request.args.get("account_id"):
        aid = parse_objectid(request.args.get("account_id"))
        if aid: q["account_id"] = aid

    page = max(int(request.args.get("page", 1)), 1)
    size = min(max(int(request.args.get("size", 20)), 1), 100)

    cursor = ext.mongo.transactions.find(q).sort("date", -1).skip((page - 1) * size).limit(size)
    items  = []
    for d in cursor:
        d["id"]         = str(d.pop("_id"))
        d["user_id"]    = str(d["user_id"])
        d["account_id"] = str(d["account_id"])
        if hasattr(d.get("date"), "isoformat"):
            d["date"] = d["date"].isoformat()
        items.append(d)

    return ok({"items": items, "page": page, "size": size, "total": ext.mongo.transactions.count_documents(q)})


@bp.get("/<tx_id>")
@jwt_required
def get_tx(tx_id):
    uid = get_current_user_id()
    tid = parse_objectid(tx_id)
    if not tid: return bad_request("invalid id — must be 24-character hex string")

    tx = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})
    if not tx: return not_found("transaction not found")

    tx["id"]         = str(tx.pop("_id"))
    tx["user_id"]    = str(tx["user_id"])
    tx["account_id"] = str(tx["account_id"])
    if hasattr(tx.get("date"), "isoformat"):
        tx["date"] = tx["date"].isoformat()
    return ok({"transaction": tx})


@bp.delete("/<tx_id>")
@jwt_required
def delete_tx(tx_id):
    uid = get_current_user_id()
    tid = parse_objectid(tx_id)
    if not tid: return bad_request("invalid id — must be 24-character hex string")

    tx = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})
    if not tx: return not_found("transaction not found")

    ext.mongo.accounts.update_one({"_id": tx["account_id"]}, {"$inc": {"balance": -tx["amount"]}})
    ext.mongo.transactions.delete_one({"_id": tid})
    return no_content()