# blueprints/budgets.py
import extensions as ext
from flask import Blueprint, request
from datetime import datetime, timezone
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("budgets", __name__)


@bp.post("/")
@jwt_required
def create_budget():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["month", "category", "limit"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    try:
        limit = float(data["limit"])
        if limit < 0: return bad_request("limit must be a positive number")
    except Exception:
        return bad_request("limit must be a number")

    try:
        datetime.strptime(data["month"], "%Y-%m")
    except Exception:
        return bad_request("month must be YYYY-MM format e.g. 2024-01")

    doc = {
        "user_id":    uid,
        "month":      data["month"],
        "category":   data["category"].strip().lower(),
        "limit":      limit,
        "spent":      float(data.get("spent", 0.0)),
        "currency":   data.get("currency", "GBP").strip().upper(),
        "created_at": datetime.now(timezone.utc)
    }
    ext.mongo.budgets.update_one(
        {"user_id": uid, "month": data["month"], "category": doc["category"]},
        {"$set": doc},
        upsert=True
    )
    return created({"message": "budget saved"})


@bp.get("/")
@jwt_required
def list_budgets():
    uid   = get_current_user_id()
    month = request.args.get("month")
    q     = {"user_id": uid}
    if month: q["month"] = month

    items = []
    for b in ext.mongo.budgets.find(q).sort([("month", -1), ("category", 1)]):
        b["id"]      = str(b.pop("_id"))
        b["user_id"] = str(b["user_id"])
        if hasattr(b.get("created_at"), "isoformat"):
            b["created_at"] = b["created_at"].isoformat()
        items.append(b)
    return ok({"items": items})


@bp.get("/analysis/<yyyymm>")
@jwt_required
def budget_analysis(yyyymm):
    uid = get_current_user_id()
    try:
        year, month = map(int, yyyymm.split("-"))
    except Exception:
        return bad_request("use YYYY-MM format e.g. 2024-01")

    next_year  = year if month < 12 else year + 1
    next_month = month + 1 if month < 12 else 1

    date_start = datetime(year, month, 1, tzinfo=timezone.utc)
    date_end   = datetime(next_year, next_month, 1, tzinfo=timezone.utc)

    spend = list(ext.mongo.transactions.aggregate([
        {"$match": {"user_id": uid, "amount": {"$lt": 0}, "date": {"$gte": date_start, "$lt": date_end}}},
        {"$group": {"_id": "$category", "spent": {"$sum": {"$abs": "$amount"}}}}
    ]))
    spent_map   = {s["_id"]: round(s["spent"], 2) for s in spend if s["_id"]}
    budget_docs = list(ext.mongo.budgets.find({"user_id": uid, "month": yyyymm}))
    limits      = {b["category"]: float(b.get("limit", 0)) for b in budget_docs}

    all_cats = set(limits.keys()) | set(spent_map.keys())
    items    = []
    for cat in sorted(all_cats):
        spent     = spent_map.get(cat, 0.0)
        limit     = limits.get(cat, 0.0)
        over      = round(max(spent - limit, 0), 2)
        remaining = round(limit - spent, 2) if limit > 0 else 0.0
        items.append({
            "category":  cat,
            "limit":     round(limit, 2),
            "spent":     round(spent, 2),
            "remaining": remaining,
            "over":      over,
            "pct_used":  round((spent / limit) * 100, 1) if limit > 0 else 0,
            "status":    "over" if over > 0 else "ok"
        })

    total_limit = round(sum(i["limit"] for i in items), 2)
    total_spent = round(sum(i["spent"] for i in items), 2)
    return ok({
        "month": yyyymm, "items": items,
        "total_limit": total_limit, "total_spent": total_spent,
        "total_over":  round(max(total_spent - total_limit, 0), 2),
        "total_saved": round(max(total_limit - total_spent, 0), 2)
    })


@bp.delete("/<budget_id>")
@jwt_required
def delete_budget(budget_id):
    uid = get_current_user_id()
    bid = parse_objectid(budget_id)
    if not bid: return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.budgets.delete_one({"_id": bid, "user_id": uid})
    if res.deleted_count == 0:
        return not_found("budget not found")
    return no_content()