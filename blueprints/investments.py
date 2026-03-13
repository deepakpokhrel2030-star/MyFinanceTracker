# blueprints/investments.py
import extensions as ext
from flask import Blueprint, request
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("investments", __name__)


@bp.post("/")
@jwt_required
def add_investment():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["type", "symbol", "name", "quantity", "purchase_price", "currency"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    try:
        quantity       = float(data["quantity"])
        purchase_price = float(data["purchase_price"])
        current_price  = float(data.get("current_price", purchase_price))
    except Exception:
        return bad_request("quantity, purchase_price and current_price must be numbers")

    doc = {
        "user_id":        uid,
        "type":           data["type"].strip().lower(),
        "symbol":         data["symbol"].strip().upper(),
        "name":           data["name"].strip(),
        "quantity":       quantity,
        "purchase_price": purchase_price,
        "current_price":  current_price,
        "currency":       data["currency"].strip().upper(),
        "broker":         data.get("broker", "").strip(),
        "sector":         data.get("sector", "").strip(),
    }
    res = ext.mongo.investments.insert_one(doc)
    return created({"id": str(res.inserted_id)})


@bp.get("/")
@jwt_required
def list_investments():
    uid   = get_current_user_id()
    items = []
    for it in ext.mongo.investments.find({"user_id": uid}):
        it["id"]      = str(it.pop("_id"))
        it["user_id"] = str(it["user_id"])
        if hasattr(it.get("purchase_date"), "isoformat"):
            it["purchase_date"] = it["purchase_date"].isoformat()
        invested = it["quantity"] * it["purchase_price"]
        current  = it["quantity"] * it["current_price"]
        it["invested_value"] = round(invested, 2)
        it["current_value"]  = round(current,  2)
        it["profit_loss"]    = round(current - invested, 2)
        it["return_pct"]     = round(((current - invested) / invested) * 100, 2) if invested else 0
        items.append(it)
    return ok({"items": items})


@bp.get("/analytics/")
@jwt_required
def investment_analytics():
    uid            = get_current_user_id()
    total_invested = 0
    total_current  = 0
    items          = []

    for it in ext.mongo.investments.find({"user_id": uid}):
        invested = it["quantity"] * it["purchase_price"]
        current  = it["quantity"] * it["current_price"]
        pl       = round(current - invested, 2)

        total_invested += invested
        total_current  += current

        items.append({
            "id":             str(it["_id"]),
            "type":           it.get("type"),
            "symbol":         it.get("symbol"),
            "name":           it.get("name"),
            "quantity":       it.get("quantity"),
            "purchase_price": it.get("purchase_price"),
            "current_price":  it.get("current_price"),
            "currency":       it.get("currency"),
            "broker":         it.get("broker"),
            "sector":         it.get("sector"),
            "invested_value": round(invested, 2),
            "current_value":  round(current,  2),
            "profit_loss":    pl,
            "return_pct":     round(((current - invested) / invested) * 100, 2) if invested else 0,
            "status":         "profit" if pl > 0 else "loss" if pl < 0 else "break-even"
        })

    by_type = {}
    for it in items:
        t = it["type"]
        if t not in by_type:
            by_type[t] = {"invested": 0, "current": 0, "count": 0}
        by_type[t]["invested"] += it["invested_value"]
        by_type[t]["current"]  += it["current_value"]
        by_type[t]["count"]    += 1

    return ok({
        "assets":           items,
        "by_type":          [{"type": t, "count": v["count"],
                               "invested_value": round(v["invested"], 2),
                               "current_value":  round(v["current"],  2),
                               "profit_loss":    round(v["current"] - v["invested"], 2)} for t, v in by_type.items()],
        "total_invested":   round(total_invested, 2),
        "total_value":      round(total_current,  2),
        "total_pl":         round(total_current - total_invested, 2),
        "total_return_pct": round(((total_current - total_invested) / total_invested) * 100, 2) if total_invested else 0
    })


@bp.put("/<inv_id>")
@jwt_required
def update_investment(inv_id):
    uid = get_current_user_id()
    iid = parse_objectid(inv_id)
    if not iid: return bad_request("invalid id — must be 24-character hex string")

    data    = request.get_json() or {}
    allowed = {}

    if "quantity"       in data:
        try: allowed["quantity"]       = float(data["quantity"])
        except Exception: return bad_request("quantity must be a number")
    if "purchase_price" in data:
        try: allowed["purchase_price"] = float(data["purchase_price"])
        except Exception: return bad_request("purchase_price must be a number")
    if "current_price"  in data:
        try: allowed["current_price"]  = float(data["current_price"])
        except Exception: return bad_request("current_price must be a number")
    if "broker" in data: allowed["broker"] = str(data["broker"]).strip()
    if "sector" in data: allowed["sector"] = str(data["sector"]).strip()

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.investments.update_one({"_id": iid, "user_id": uid}, {"$set": allowed})
    if res.matched_count == 0:
        return not_found("investment not found")
    return ok({"updated": True})


@bp.delete("/<inv_id>")
@jwt_required
def delete_investment(inv_id):
    uid = get_current_user_id()
    iid = parse_objectid(inv_id)
    if not iid: return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.investments.delete_one({"_id": iid, "user_id": uid})
    if res.deleted_count == 0:
        return not_found("investment not found")
    return no_content()