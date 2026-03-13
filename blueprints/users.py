# blueprints/users.py
import bcrypt
import extensions as ext
from flask import Blueprint, request, jsonify
from bson import ObjectId
from decorators import jwt_required, admin_required, get_current_user_id
from utils.responses import ok, created, no_content, bad_request, not_found, forbidden

bp = Blueprint("users", __name__)


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ═══════════════════════════════════════════════════════════════
# ADMIN – User Management
# ═══════════════════════════════════════════════════════════════

@bp.get("/")
@jwt_required
@admin_required
def list_users():
    items = []
    for u in ext.mongo.users.find({}, {"password_hash": 0}):
        u["id"] = str(u.pop("_id"))
        if hasattr(u.get("created_at"), "isoformat"):
            u["created_at"] = u["created_at"].isoformat()
        items.append(u)
    return ok({"items": items, "total": len(items)})


@bp.post("/")
@jwt_required
@admin_required
def create_user():
    data     = request.get_json() or {}
    email    = (data.get("email") or "").lower().strip()
    password = data.get("password", "").strip()
    name     = data.get("name", "").strip()
    roles    = data.get("roles", ["user"])

    if not email or not password:
        return bad_request("email and password required")
    if len(password) < 6:
        return bad_request("password must be at least 6 characters")
    if not isinstance(roles, list):
        return bad_request("roles must be a list e.g. ['user'] or ['admin']")
    if ext.mongo.users.find_one({"email": email}):
        return bad_request("email already exists")

    res = ext.mongo.users.insert_one({
        "email":         email,
        "password_hash": _hash_password(password),
        "name":          name,
        "roles":         roles,
        "is_active":     True,
        "phone":         data.get("phone", ""),
        "address":       data.get("address", {})
    })
    return created({"id": str(res.inserted_id)})


@bp.get("/<user_id>")
@jwt_required
@admin_required
def get_user(user_id):
    try:
        uid = ObjectId(user_id)
    except Exception:
        return bad_request("invalid user id — must be 24-character hex string")

    user = ext.mongo.users.find_one({"_id": uid}, {"password_hash": 0})
    if not user:
        return not_found("user not found")

    user["id"] = str(user.pop("_id"))
    if hasattr(user.get("created_at"), "isoformat"):
        user["created_at"] = user["created_at"].isoformat()
    return ok({"user": user})


@bp.put("/<user_id>")
@jwt_required
@admin_required
def update_user(user_id):
    try:
        uid = ObjectId(user_id)
    except Exception:
        return bad_request("invalid user id — must be 24-character hex string")

    data    = request.get_json() or {}
    allowed = {}

    if "name"      in data: allowed["name"]      = str(data["name"]).strip()
    if "email"     in data: allowed["email"]      = str(data["email"]).lower().strip()
    if "phone"     in data: allowed["phone"]      = str(data["phone"]).strip()
    if "address"   in data: allowed["address"]    = data["address"]
    if "is_active" in data: allowed["is_active"]  = bool(data["is_active"])
    if "roles"     in data:
        if not isinstance(data["roles"], list):
            return bad_request("roles must be a list")
        allowed["roles"] = data["roles"]
    if "password"  in data:
        if len(data["password"]) < 6:
            return bad_request("password must be at least 6 characters")
        allowed["password_hash"] = _hash_password(data["password"])

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.users.update_one({"_id": uid}, {"$set": allowed})
    if res.matched_count == 0:
        return not_found("user not found")
    return ok({"updated": True})


@bp.delete("/<user_id>")
@jwt_required
@admin_required
def delete_user(user_id):
    try:
        uid = ObjectId(user_id)
    except Exception:
        return bad_request("invalid user id — must be 24-character hex string")

    if uid == get_current_user_id():
        return forbidden("cannot delete your own account")

    res = ext.mongo.users.delete_one({"_id": uid})
    if res.deleted_count == 0:
        return not_found("user not found")

    ext.mongo.accounts.delete_many({"user_id": uid})
    ext.mongo.transactions.delete_many({"user_id": uid})
    ext.mongo.budgets.delete_many({"user_id": uid})
    ext.mongo.investments.delete_many({"user_id": uid})
    ext.mongo.savings_goals.delete_many({"user_id": uid})

    return no_content()


# ═══════════════════════════════════════════════════════════════
# ADMIN – System Analytics
# ═══════════════════════════════════════════════════════════════

@bp.get("/admin/transactions")
@jwt_required
@admin_required
def admin_all_transactions():
    page = max(int(request.args.get("page", 1)), 1)
    size = min(max(int(request.args.get("size", 50)), 1), 200)

    cursor = ext.mongo.transactions.find({}).sort("date", -1).skip((page - 1) * size).limit(size)
    items  = []
    for t in cursor:
        t["id"]         = str(t.pop("_id"))
        t["user_id"]    = str(t["user_id"])
        t["account_id"] = str(t["account_id"])
        if hasattr(t.get("date"), "isoformat"):
            t["date"] = t["date"].isoformat()
        items.append(t)

    return ok({"items": items, "page": page, "size": size, "total": ext.mongo.transactions.count_documents({})})


@bp.get("/admin/analytics")
@jwt_required
@admin_required
def admin_analytics():
    bal = list(ext.mongo.accounts.aggregate([{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]))
    inc = list(ext.mongo.transactions.aggregate([{"$match": {"amount": {"$gt": 0}}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]))
    exp = list(ext.mongo.transactions.aggregate([{"$match": {"amount": {"$lt": 0}}}, {"$group": {"_id": None, "total": {"$sum": {"$abs": "$amount"}}}}]))

    top_cats = list(ext.mongo.transactions.aggregate([
        {"$match": {"amount": {"$lt": 0}}},
        {"$group": {"_id": "$category", "total": {"$sum": {"$abs": "$amount"}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": 5},
        {"$project": {"_id": 0, "category": "$_id", "total": {"$round": ["$total", 2]}, "count": 1}}
    ]))

    monthly = list(ext.mongo.transactions.aggregate([
        {"$group": {
            "_id":     {"y": {"$year": "$date"}, "m": {"$month": "$date"}},
            "income":  {"$sum": {"$cond": [{"$gt": ["$amount", 0]}, "$amount", 0]}},
            "expense": {"$sum": {"$cond": [{"$lt": ["$amount", 0]}, {"$abs": "$amount"}, 0]}}
        }},
        {"$sort": {"_id.y": 1, "_id.m": 1}},
        {"$project": {"_id": 0, "year": "$_id.y", "month": "$_id.m",
                      "income": {"$round": ["$income", 2]}, "expense": {"$round": ["$expense", 2]}}}
    ]))

    total_income  = round(inc[0]["total"], 2) if inc else 0
    total_expense = round(exp[0]["total"], 2) if exp else 0

    return ok({
        "total_users":             ext.mongo.users.count_documents({}),
        "total_accounts":          ext.mongo.accounts.count_documents({}),
        "total_transactions":      ext.mongo.transactions.count_documents({}),
        "total_investments":       ext.mongo.investments.count_documents({}),
        "total_goals":             ext.mongo.savings_goals.count_documents({}),
        "total_balance_gbp":       round(bal[0]["total"], 2) if bal else 0,
        "total_income_gbp":        total_income,
        "total_expense_gbp":       total_expense,
        "net_gbp":                 round(total_income - total_expense, 2),
        "top_spending_categories": top_cats,
        "monthly_trend":           monthly
    })