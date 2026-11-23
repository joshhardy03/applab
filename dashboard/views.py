"""Routes: login, app list (behind login), public web previews under /preview/<slug>/."""
import hmac
import re
import time

from flask import (Blueprint, abort, current_app, flash, g, redirect, render_template,
                   request, send_from_directory, session, url_for)

from . import db

bp = Blueprint("main", __name__)

SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,30}$")
_failed_logins = []


def get_db():
    if "db" not in g:
        g.db = db.connect(current_app.config["DB_PATH"])
    return g.db


@bp.teardown_app_request
def close_db(_exc):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


@bp.before_app_request
def require_login():
    open_endpoints = ("main.login", "main.health", "main.preview", "main.preview_root")
    if request.endpoint in open_endpoints or request.endpoint is None:
        return None
    if not session.get("auth"):
        return redirect(url_for("main.login"))
    return None


@bp.get("/health")
def health():
    return {"ok": True}


@bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")
    now = time.time()
    _failed_logins[:] = [t for t in _failed_logins if now - t < 900]
    if len(_failed_logins) >= 10:
        return render_template("login.html", error="Too many attempts. Try again later."), 429
    expected = current_app.config["PASSWORD"]
    given = request.form.get("password", "")
    if not expected or not hmac.compare_digest(given.encode(), expected.encode()):
        _failed_logins.append(now)
        return render_template("login.html", error="Wrong password."), 401
    session.clear()
    session["auth"] = True
    session.permanent = True
    return redirect(url_for("main.index"))


@bp.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.login"))


def _preview_exists(slug):
    return (current_app.config["PREVIEW_DIR"] / slug / "index.html").is_file()


@bp.get("/")
def index():
    apps = get_db().execute("SELECT * FROM apps ORDER BY created_at DESC").fetchall()
    rows = [dict(a, has_preview=_preview_exists(a["slug"])) for a in apps]
    return render_template("index.html", apps=rows, statuses=db.STATUSES)


@bp.post("/apps")
def add_app():
    slug = request.form.get("slug", "").strip().lower()
    name = request.form.get("name", "").strip()
    idea = request.form.get("idea", "").strip()
    if not SLUG_RE.match(slug) or not name:
        flash("Slug must be 2-31 chars of a-z, 0-9 and '-', starting with a letter; name is required.")
        return redirect(url_for("main.index"))
    conn = get_db()
    if conn.execute("SELECT 1 FROM apps WHERE slug = ?", (slug,)).fetchone():
        flash(f"'{slug}' already exists.")
        return redirect(url_for("main.index"))
    conn.execute("INSERT INTO apps (slug, name, idea) VALUES (?, ?, ?)", (slug, name, idea))
    conn.commit()
    return redirect(url_for("main.index"))


@bp.post("/apps/<slug>/status")
def set_status(slug):
    status = request.form.get("status", "")
    if status not in db.STATUSES:
        abort(400)
    conn = get_db()
    cur = conn.execute("UPDATE apps SET status = ?, updated_at = datetime('now') WHERE slug = ?",
                       (status, slug))
    conn.commit()
    if cur.rowcount == 0:
        abort(404)
    return redirect(url_for("main.index"))


# Public previews: static Expo web exports built by GitHub Actions (never on this server).
# Unknown paths fall back to index.html so the app's own router handles them.
@bp.get("/preview/<slug>/")
def preview_root(slug):
    return preview(slug, "index.html")


@bp.get("/preview/<slug>/<path:path>")
def preview(slug, path):
    if not SLUG_RE.match(slug) or not _preview_exists(slug):
        abort(404)
    base = current_app.config["PREVIEW_DIR"] / slug
    target = (base / path).resolve()
    if base.resolve() not in target.parents or not target.is_file():
        path = "index.html"
    resp = send_from_directory(base, path)
    if path == "index.html":
        resp.headers["Cache-Control"] = "no-cache"
    return resp
