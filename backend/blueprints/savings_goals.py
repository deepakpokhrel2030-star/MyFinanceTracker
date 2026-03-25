# blueprints/savings_goals.py
import extensions as ext
from flask import Blueprint, request
from datetime import datetime, timezone
from decorators import jwt_required, get_current_user_id
from utils.validators import require_fields, parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("savings_goals", __name__)


def _parse_iso(s: str):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


@bp.post("/")
@jwt_required
def create_goal():
    uid  = get_current_user_id()
    data = request.get_json() or {}

    missing = require_fields(data, ["title", "target_amount", "deadline"])
    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    deadline = _parse_iso(data["deadline"])
    if not deadline:
        return bad_request("deadline must be ISO date e.g. 2026-06-30T00:00:00Z")

    try:
        target  = float(data["target_amount"])
        current = float(data.get("current_amount", 0.0))
        monthly = float(data.get("monthly_contribution", 0.0))
    except Exception:
        return bad_request("amounts must be numbers")

    doc = {
        "user_id":              uid,
        "title":                data["title"].strip(),
        "description":          data.get("description", "").strip(),
        "target_amount":        target,
        "current_amount":       current,
        "currency":             data.get("currency", "GBP").strip().upper(),
        "deadline":             deadline,
        "created_at":           datetime.now(timezone.utc),
        "status":               "completed" if current >= target else "in_progress",
        "monthly_contribution": monthly,
        "priority":             data.get("priority", "medium").strip().lower()
    }
    res = ext.mongo.savings_goals.insert_one(doc)
    return created({"id": str(res.inserted_id)})


@bp.get("/")
@jwt_required
def list_goals():
    uid   = get_current_user_id()
    items = []
    for g in ext.mongo.savings_goals.find({"user_id": uid}).sort("deadline", 1):
        g["id"]      = str(g.pop("_id"))
        g["user_id"] = str(g["user_id"])
        if hasattr(g.get("deadline"),   "isoformat"): g["deadline"]   = g["deadline"].isoformat()
        if hasattr(g.get("created_at"), "isoformat"): g["created_at"] = g["created_at"].isoformat()
        target  = g.get("target_amount", 0)
        current = g.get("current_amount", 0)
        g["progress_pct"] = round((current / target) * 100, 1) if target else 0
        g["remaining"]    = round(max(target - current, 0), 2)
        items.append(g)
    return ok({"items": items})


@bp.put("/<goal_id>")
@jwt_required
def update_goal(goal_id):
    uid = get_current_user_id()
    gid = parse_objectid(goal_id)
    if not gid: return bad_request("invalid id — must be 24-character hex string")

    data    = request.get_json() or {}
    allowed = {}

    if "title"       in data: allowed["title"]       = str(data["title"]).strip()
    if "description" in data: allowed["description"] = str(data["description"]).strip()
    if "priority"    in data: allowed["priority"]    = str(data["priority"]).strip().lower()
    if "currency"    in data: allowed["currency"]    = str(data["currency"]).strip().upper()
    if "monthly_contribution" in data:
        try: allowed["monthly_contribution"] = float(data["monthly_contribution"])
        except Exception: return bad_request("monthly_contribution must be a number")
    if "target_amount" in data:
        try: allowed["target_amount"] = float(data["target_amount"])
        except Exception: return bad_request("target_amount must be a number")
    if "current_amount" in data:
        try:
            current = float(data["current_amount"])
            allowed["current_amount"] = current
            goal   = ext.mongo.savings_goals.find_one({"_id": gid, "user_id": uid})
            target = allowed.get("target_amount", goal.get("target_amount", 0)) if goal else 0
            allowed["status"] = "completed" if current >= target else "in_progress"
        except Exception:
            return bad_request("current_amount must be a number")
    if "deadline" in data:
        dl = _parse_iso(data["deadline"])
        if not dl: return bad_request("invalid deadline")
        allowed["deadline"] = dl

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.savings_goals.update_one({"_id": gid, "user_id": uid}, {"$set": allowed})
    if res.matched_count == 0:
        return not_found("goal not found")
    return ok({"updated": True})


@bp.delete("/<goal_id>")
@jwt_required
def delete_goal(goal_id):
    uid = get_current_user_id()
    gid = parse_objectid(goal_id)
    if not gid: return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.savings_goals.delete_one({"_id": gid, "user_id": uid})
    if res.deleted_count == 0:
        return not_found("goal not found")
    return no_content()