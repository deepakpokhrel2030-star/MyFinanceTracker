from datetime import datetime
from bson import ObjectId

def parse_objectid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None

def parse_date(date_str):
    # Supports 'YYYY-MM-DD' or ISO datetime
    try:
        return datetime.fromisoformat(date_str)
    except Exception:
        return None

def require_fields(data: dict, fields: list[str]):
    missing = [f for f in fields if data.get(f) in (None, "", [])]
    return missing  # empty list means OK