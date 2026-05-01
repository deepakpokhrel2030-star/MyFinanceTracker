from flask import Blueprint, render_template

bp = Blueprint("frontend", __name__)


@bp.get("/")
def index():
    # UI is mounted at /app/ to avoid colliding with API root
    return render_template("index.html")
