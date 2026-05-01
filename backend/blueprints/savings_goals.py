import extensions as ext
from flask import Blueprint, request
from datetime import datetime, timezone
from decorators import jwt_required, get_current_user_id
from utils.validators import parse_objectid
from utils.responses import ok, created, no_content, bad_request, not_found

bp = Blueprint("savings_goals", __name__)


def _parse_date(value):
    if not value:
        return None

    try:
        value = str(value)

        if len(value) == 10:
            return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)

        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _serialize_goal(goal):
    goal["id"] = str(goal.pop("_id"))
    goal["user_id"] = str(goal["user_id"])

    if hasattr(goal.get("deadline"), "isoformat"):
        goal["deadline"] = goal["deadline"].isoformat()

    if hasattr(goal.get("target_date"), "isoformat"):
        goal["target_date"] = goal["target_date"].date().isoformat()

    if hasattr(goal.get("created_at"), "isoformat"):
        goal["created_at"] = goal["created_at"].isoformat()

    title = goal.get("title") or goal.get("name") or "Savings goal"
    goal["title"] = title
    goal["name"] = title

    description = goal.get("description") or goal.get("notes") or ""
    goal["description"] = description
    goal["notes"] = description

    if "deadline" in goal and "target_date" not in goal:
        goal["target_date"] = str(goal["deadline"])[:10]

    if "target_date" in goal and "deadline" not in goal:
        parsed = _parse_date(goal["target_date"])
        goal["deadline"] = parsed.isoformat() if parsed else goal["target_date"]

    goal["category"] = goal.get("category", "")
    goal["priority"] = goal.get("priority", "medium")

    target = float(goal.get("target_amount", 0) or 0)
    current = float(goal.get("current_amount", 0) or 0)

    goal["progress_pct"] = round((current / target) * 100, 1) if target else 0
    goal["remaining"] = round(max(target - current, 0), 2)
    goal["status"] = "completed" if current >= target and target > 0 else "in_progress"

    return goal


@bp.post("/")
@jwt_required
def create_goal():
    uid = get_current_user_id()
    data = request.get_json() or {}

    name = data.get("name") or data.get("title")
    target_date_raw = data.get("target_date") or data.get("deadline")
    notes = data.get("notes") or data.get("description") or ""

    missing = []

    if not name:
        missing.append("name")

    if data.get("target_amount") is None:
        missing.append("target_amount")

    if missing:
        return bad_request(f"missing: {', '.join(missing)}")

    try:
        target = float(data.get("target_amount", 0))
        current = float(data.get("current_amount", 0))
        monthly = float(data.get("monthly_contribution", 0))
    except Exception:
        return bad_request("amounts must be numbers")

    if target <= 0:
        return bad_request("target_amount must be greater than 0")

    target_date = _parse_date(target_date_raw) if target_date_raw else None

    doc = {
        "user_id": uid,
        "title": str(name).strip(),
        "name": str(name).strip(),
        "description": str(notes).strip(),
        "notes": str(notes).strip(),
        "category": str(data.get("category", "")).strip(),
        "target_amount": target,
        "current_amount": current,
        "currency": str(data.get("currency", "GBP")).strip().upper(),
        "created_at": datetime.now(timezone.utc),
        "status": "completed" if current >= target else "in_progress",
        "monthly_contribution": monthly,
        "priority": str(data.get("priority", "medium")).strip().lower()
    }

    if target_date:
        doc["deadline"] = target_date
        doc["target_date"] = target_date

    res = ext.mongo.savings_goals.insert_one(doc)

    saved = ext.mongo.savings_goals.find_one({"_id": res.inserted_id, "user_id": uid})
    return created({"goal": _serialize_goal(saved)})


@bp.get("/")
@jwt_required
def list_goals():
    uid = get_current_user_id()
    items = []

    for goal in ext.mongo.savings_goals.find({"user_id": uid}).sort("created_at", -1):
        items.append(_serialize_goal(goal))

    return ok({"items": items})


@bp.get("/<goal_id>")
@jwt_required
def get_goal(goal_id):
    uid = get_current_user_id()
    gid = parse_objectid(goal_id)

    if not gid:
        return bad_request("invalid id — must be 24-character hex string")

    goal = ext.mongo.savings_goals.find_one({"_id": gid, "user_id": uid})

    if not goal:
        return not_found("goal not found")

    return ok({"goal": _serialize_goal(goal)})


@bp.put("/<goal_id>")
@jwt_required
def update_goal(goal_id):
    uid = get_current_user_id()
    gid = parse_objectid(goal_id)

    if not gid:
        return bad_request("invalid id — must be 24-character hex string")

    existing = ext.mongo.savings_goals.find_one({"_id": gid, "user_id": uid})

    if not existing:
        return not_found("goal not found")

    data = request.get_json() or {}
    allowed = {}

    if "name" in data or "title" in data:
        name = data.get("name") or data.get("title")
        allowed["name"] = str(name).strip()
        allowed["title"] = str(name).strip()

    if "notes" in data or "description" in data:
        notes = data.get("notes") or data.get("description") or ""
        allowed["notes"] = str(notes).strip()
        allowed["description"] = str(notes).strip()

    if "category" in data:
        allowed["category"] = str(data["category"]).strip()

    if "priority" in data:
        allowed["priority"] = str(data["priority"]).strip().lower()

    if "currency" in data:
        allowed["currency"] = str(data["currency"]).strip().upper()

    if "monthly_contribution" in data:
        try:
            allowed["monthly_contribution"] = float(data["monthly_contribution"])
        except Exception:
            return bad_request("monthly_contribution must be a number")

    if "target_amount" in data:
        try:
            allowed["target_amount"] = float(data["target_amount"])
        except Exception:
            return bad_request("target_amount must be a number")

    if "current_amount" in data:
        try:
            allowed["current_amount"] = float(data["current_amount"])
        except Exception:
            return bad_request("current_amount must be a number")

    if "target_date" in data or "deadline" in data:
        raw_date = data.get("target_date") or data.get("deadline")

        if raw_date:
            parsed = _parse_date(raw_date)

            if not parsed:
                return bad_request("invalid target_date")

            allowed["target_date"] = parsed
            allowed["deadline"] = parsed
        else:
            allowed["target_date"] = ""
            allowed["deadline"] = ""

    final_target = float(allowed.get("target_amount", existing.get("target_amount", 0)) or 0)
    final_current = float(allowed.get("current_amount", existing.get("current_amount", 0)) or 0)

    allowed["status"] = "completed" if final_current >= final_target and final_target > 0 else "in_progress"

    if not allowed:
        return bad_request("no updatable fields provided")

    res = ext.mongo.savings_goals.update_one(
        {"_id": gid, "user_id": uid},
        {"$set": allowed}
    )

    if res.matched_count == 0:
        return not_found("goal not found")

    updated = ext.mongo.savings_goals.find_one({"_id": gid, "user_id": uid})
    return ok({"updated": True, "goal": _serialize_goal(updated)})


@bp.delete("/<goal_id>")
@jwt_required
def delete_goal(goal_id):
    uid = get_current_user_id()
    gid = parse_objectid(goal_id)

    if not gid:
        return bad_request("invalid id — must be 24-character hex string")

    res = ext.mongo.savings_goals.delete_one({"_id": gid, "user_id": uid})

    if res.deleted_count == 0:
        return not_found("goal not found")

    return no_content()