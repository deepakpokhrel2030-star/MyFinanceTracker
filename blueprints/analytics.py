# blueprints/analytics.py
import extensions as ext
from flask import Blueprint, request
from datetime import datetime, timezone
from decorators import jwt_required, get_current_user_id
from utils.responses import ok, bad_request

bp = Blueprint("analytics", __name__)


@bp.get("/spending/monthly")
@jwt_required
def monthly_spending():
    uid = get_current_user_id()
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {
            "_id":      {"y": {"$year": "$date"}, "m": {"$month": "$date"}},
            "expenses": {"$sum": {"$cond": [{"$lt": ["$amount", 0]}, {"$abs": "$amount"}, 0]}},
            "income":   {"$sum": {"$cond": [{"$gt": ["$amount", 0]}, "$amount", 0]}}
        }},
        {"$project": {
            "_id": 0, "year": "$_id.y", "month": "$_id.m",
            "income":   {"$round": ["$income",   2]},
            "expenses": {"$round": ["$expenses", 2]},
            "net":      {"$round": [{"$subtract": ["$income", "$expenses"]}, 2]}
        }},
        {"$sort": {"year": 1, "month": 1}}
    ]
    return ok({"data": list(ext.mongo.transactions.aggregate(pipeline))})


@bp.get("/top-categories")
@jwt_required
def top_categories():
    uid   = get_current_user_id()
    limit = min(int(request.args.get("limit", 5)), 20)
    pipeline = [
        {"$match": {"user_id": uid, "amount": {"$lt": 0}}},
        {"$group": {"_id": "$category", "total": {"$sum": {"$abs": "$amount"}}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "category": "$_id", "total": {"$round": ["$total", 2]}, "count": 1}}
    ]
    return ok({"data": list(ext.mongo.transactions.aggregate(pipeline))})


@bp.get("/income-vs-expense")
@jwt_required
def income_vs_expense():
    uid = get_current_user_id()
    pipeline = [
        {"$match": {"user_id": uid}},
        {"$group": {
            "_id":     {"y": {"$year": "$date"}, "m": {"$month": "$date"}},
            "income":  {"$sum": {"$cond": [{"$gt": ["$amount", 0]}, "$amount", 0]}},
            "expense": {"$sum": {"$cond": [{"$lt": ["$amount", 0]}, {"$abs": "$amount"}, 0]}}
        }},
        {"$project": {
            "_id": 0, "year": "$_id.y", "month": "$_id.m",
            "income":  {"$round": ["$income",  2]},
            "expense": {"$round": ["$expense", 2]},
            "net":     {"$round": [{"$subtract": ["$income", "$expense"]}, 2]}
        }},
        {"$sort": {"year": 1, "month": 1}}
    ]
    data          = list(ext.mongo.transactions.aggregate(pipeline))
    total_income  = round(sum(d["income"]  for d in data), 2)
    total_expense = round(sum(d["expense"] for d in data), 2)
    return ok({"monthly": data, "total_income": total_income,
               "total_expense": total_expense, "net": round(total_income - total_expense, 2)})


@bp.get("/portfolio-value")
@jwt_required
def portfolio_value():
    uid            = get_current_user_id()
    total_invested = 0
    total_current  = 0
    assets         = []
    by_currency    = {}

    for inv in ext.mongo.investments.find({"user_id": uid}):
        qty      = inv.get("quantity", 0)
        buy      = inv.get("purchase_price", 0)
        cur      = inv.get("current_price", buy)
        invested = qty * buy
        value    = qty * cur
        pl       = round(value - invested, 2)
        currency = inv.get("currency", "GBP")

        total_invested += invested
        total_current  += value

        assets.append({
            "id": str(inv["_id"]), "type": inv.get("type"), "symbol": inv.get("symbol"),
            "name": inv.get("name"), "quantity": qty, "purchase_price": buy,
            "current_price": cur, "currency": currency, "broker": inv.get("broker"),
            "sector": inv.get("sector"), "invested_value": round(invested, 2),
            "current_value": round(value, 2), "profit_loss": pl,
            "return_pct": round(((value - invested) / invested) * 100, 2) if invested else 0,
            "status": "profit" if pl > 0 else "loss" if pl < 0 else "break-even"
        })

        if currency not in by_currency:
            by_currency[currency] = {"invested": 0, "current": 0, "count": 0}
        by_currency[currency]["invested"] += invested
        by_currency[currency]["current"]  += value
        by_currency[currency]["count"]    += 1

    return ok({
        "assets": assets,
        "by_currency": [{"currency": c, "count": v["count"],
                          "invested_value": round(v["invested"], 2),
                          "current_value":  round(v["current"],  2),
                          "profit_loss":    round(v["current"] - v["invested"], 2)} for c, v in by_currency.items()],
        "total_invested":   round(total_invested, 2),
        "total_value":      round(total_current,  2),
        "total_pl":         round(total_current - total_invested, 2),
        "total_return_pct": round(((total_current - total_invested) / total_invested) * 100, 2) if total_invested else 0
    })


@bp.get("/budgets/<yyyymm>")
@jwt_required
def budget_vs_actual(yyyymm):
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
    limits      = {b["category"]: float(b.get("limit", 0))
                   for b in ext.mongo.budgets.find({"user_id": uid, "month": yyyymm})}

    items = []
    for cat in sorted(set(limits.keys()) | set(spent_map.keys())):
        spent = spent_map.get(cat, 0.0)
        limit = limits.get(cat, 0.0)
        over  = round(max(spent - limit, 0), 2)
        items.append({
            "category": cat, "limit": round(limit, 2), "spent": round(spent, 2),
            "remaining": round(limit - spent, 2) if limit > 0 else 0.0,
            "over": over, "pct_used": round((spent / limit) * 100, 1) if limit > 0 else 0,
            "status": "over" if over > 0 else "ok"
        })

    total_limit = round(sum(i["limit"] for i in items), 2)
    total_spent = round(sum(i["spent"] for i in items), 2)
    return ok({"month": yyyymm, "items": items, "total_limit": total_limit,
               "total_spent": total_spent, "total_over": round(max(total_spent - total_limit, 0), 2),
               "total_saved": round(max(total_limit - total_spent, 0), 2)})