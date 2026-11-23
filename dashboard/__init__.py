"""Flask app factory for the App Lab dashboard and public web previews."""
from datetime import timedelta

from flask import Flask

from . import db
from .config import load_config


def create_app(env=None):
    app = Flask(__name__)
    cfg = load_config(env)
    cfg["PERMANENT_SESSION_LIFETIME"] = timedelta(seconds=cfg["PERMANENT_SESSION_LIFETIME"])
    app.config.update(cfg)
    db.connect(cfg["DB_PATH"]).close()

    from .views import bp
    app.register_blueprint(bp)
    return app
