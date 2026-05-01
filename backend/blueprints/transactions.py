import extensions as ext
from flask import Blueprint, request
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid, parse_date
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("transactions", __name__)


def normalize_amount(amount, tx_type):
    value = abs(float(amount))
    return value if str(tx_type).strip().lower() == "income" else -value


def serialize_tx(tx):
    tx["id"] = str(tx.pop("_id"))
    tx["user_id"] = str(tx["user_id"])
    tx["account_id"] = str(tx["account_id"])

    if hasattr(tx.get("date"), "isoformat"):
        tx["date"] = tx["date"].isoformat()

    return tx


@bp.post("/")
@jwt_required
def create_tx():
    uid = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["account_id", "amount", "date", "type", "category"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    aid = parse_objectid(data["account_id"])
    if not aid:
        return bad_request("invalid account_id — must be 24-character hex string")

    if not ext.mongo.accounts.find_one({"_id": aid, "user_id": uid}):
        return not_found("account not found")

    dt = parse_date(data["date"])
    if not dt:
        return bad_request("invalid date; use YYYY-MM-DD or ISO format")

    tx_type = str(data.get("type", "expense")).strip().lower()

    try:
        amt = normalize_amount(data["amount"], tx_type)
    except Exception:
        return bad_request("amount must be a number")

    tx = {
        "user_id": uid,
        "account_id": aid,
        "amount": amt,
        "type": tx_type,
        "category": str(data.get("category", "")).strip().lower(),
        "merchant": str(data.get("merchant", "")).strip(),
        "description": str(data.get("description", "")).strip(),
        "date": dt,
        "status": str(data.get("status", "completed")).strip().lower(),
        "tags": data.get("tags", [])
    }

    res = ext.mongo.transactions.insert_one(tx)

    ext.mongo.accounts.update_one(
        {"_id": aid, "user_id": uid},
        {"$inc": {"balance": amt}}
    )

    saved = ext.mongo.transactions.find_one({"_id": res.inserted_id, "user_id": uid})
    return created({"transaction": serialize_tx(saved)})


@bp.get("/")
@jwt_required
def list_tx():
    uid = get_current_user_id()
    q = {"user_id": uid}

    start = request.args.get("start")
    end = request.args.get("end")

    if start or end:
        q["date"] = {}

        if start:
            ds = parse_date(start)
            if not ds:
                return bad_request("invalid start date")
            q["date"]["$gte"] = ds

        if end:
            de = parse_date(end)
            if not de:
                return bad_request("invalid end date")
            q["date"]["$lte"] = de

    if request.args.get("category"):
        q["category"] = request.args.get("category").lower()

    if request.args.get("type"):
        q["type"] = request.args.get("type").lower()

    if request.args.get("account_id"):
        aid = parse_objectid(request.args.get("account_id"))
        if aid:
            q["account_id"] = aid

    search = request.args.get("search")
    if search:
        q["$or"] = [
            {"merchant": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]

    page = max(int(request.args.get("page", 1)), 1)

    raw_size = request.args.get("limit") or request.args.get("size") or 20
    size = min(max(int(raw_size), 1), 100)

    total = ext.mongo.transactions.count_documents(q)
    pages = max(1, (total + size - 1) // size)

    cursor = (
        ext.mongo.transactions
        .find(q)
        .sort("date", -1)
        .skip((page - 1) * size)
        .limit(size)
    )

    items = [serialize_tx(tx) for tx in cursor]

    return ok({
        "items": items,
        "page": page,
        "size": size,
        "limit": size,
        "total": total,
        "pages": pages
    })


@bp.get("/<tx_id>")
@jwt_required
def get_tx(tx_id):
    uid = get_current_user_id()
    tid = parse_objectid(tx_id)

    if not tid:
        return bad_request("invalid id — must be 24-character hex string")

    tx = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})

    if not tx:
        return not_found("transaction not found")

    return ok({"transaction": serialize_tx(tx)})


@bp.put("/<tx_id>")
@jwt_required
def update_tx(tx_id):
    uid = get_current_user_id()
    tid = parse_objectid(tx_id)

    if not tid:
        return bad_request("invalid id — must be 24-character hex string")

    tx = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})

    if not tx:
        return not_found("transaction not found")

    data = request.get_json() or {}
    allowed = {}

    new_type = str(data.get("type", tx.get("type", "expense"))).strip().lower()

    if "type" in data:
        allowed["type"] = new_type

    if "amount" in data:
        try:
            allowed["amount"] = normalize_amount(data["amount"], new_type)
        except Exception:
            return bad_request("amount must be a number")

    elif "type" in data:
        allowed["amount"] = normalize_amount(tx.get("amount", 0), new_type)

    if "category" in data:
        allowed["category"] = str(data["category"]).strip().lower()

    if "merchant" in data:
        allowed["merchant"] = str(data["merchant"]).strip()

    if "description" in data:
        allowed["description"] = str(data["description"]).strip()

    if "date" in data:
        dt = parse_date(data["date"])
        if not dt:
            return bad_request("invalid date; use YYYY-MM-DD or ISO format")
        allowed["date"] = dt

    if "account_id" in data:
        aid = parse_objectid(data["account_id"])
        if not aid:
            return bad_request("invalid account_id")

        if not ext.mongo.accounts.find_one({"_id": aid, "user_id": uid}):
            return not_found("account not found")

        allowed["account_id"] = aid

    if "status" in data:
        allowed["status"] = str(data["status"]).strip().lower()

    if "tags" in data:
        allowed["tags"] = data["tags"]

    if not allowed:
        return bad_request("no updatable fields provided")

    old_amount = float(tx.get("amount", 0) or 0)
    new_amount = float(allowed.get("amount", old_amount) or 0)

    old_account_id = tx["account_id"]
    new_account_id = allowed.get("account_id", old_account_id)

    ext.mongo.transactions.update_one(
        {"_id": tid, "user_id": uid},
        {"$set": allowed}
    )

    if "amount" in allowed or "account_id" in allowed:
        if str(old_account_id) == str(new_account_id):
            diff = new_amount - old_amount

            ext.mongo.accounts.update_one(
                {"_id": old_account_id, "user_id": uid},
                {"$inc": {"balance": diff}}
            )
        else:
            ext.mongo.accounts.update_one(
                {"_id": old_account_id, "user_id": uid},
                {"$inc": {"balance": -old_amount}}
            )

            ext.mongo.accounts.update_one(
                {"_id": new_account_id, "user_id": uid},
                {"$inc": {"balance": new_amount}}
            )

    updated = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})
    return ok({"updated": True, "transaction": serialize_tx(updated)})


@bp.delete("/<tx_id>")
@jwt_required
def delete_tx(tx_id):
    uid = get_current_user_id()
    tid = parse_objectid(tx_id)

    if not tid:
        return bad_request("invalid id — must be 24-character hex string")

    tx = ext.mongo.transactions.find_one({"_id": tid, "user_id": uid})

    if not tx:
        return not_found("transaction not found")

    ext.mongo.accounts.update_one(
        {"_id": tx["account_id"], "user_id": uid},
        {"$inc": {"balance": -float(tx.get("amount", 0) or 0)}}
    )

    ext.mongo.transactions.delete_one({"_id": tid, "user_id": uid})

    return no_content()