"""All configuration comes from APPLAB_* environment variables.

The systemd unit loads .env via EnvironmentFile; when run by hand we read the same .env.
Real env vars win. Pattern copied from ~/reseller/app/config.py.
"""
import os
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_env_file(path):
    """KEY=value lines; # comments and blank lines skipped; optional quotes stripped."""
    out = {}
    try:
        lines = Path(path).read_text().splitlines()
    except OSError:
        return out
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def load_config(env=None):
    """env=None: .env file overlaid by os.environ. Tests pass a dict and never touch .env."""
    if env is None:
        env = {**read_env_file(ROOT / ".env"), **os.environ}
    get = lambda name, default="": env.get("APPLAB_" + name, "") or default

    data_dir = Path(get("DATA_DIR") or ROOT / "data").resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    secret = get("SECRET_KEY")
    if not secret:
        key_file = data_dir / "secret_key"
        if not key_file.exists():
            key_file.write_text(secrets.token_hex(32))
            key_file.chmod(0o600)
        secret = key_file.read_text().strip()

    return {
        "SECRET_KEY": secret,
        "PASSWORD": get("PASSWORD"),
        "DATA_DIR": data_dir,
        "DB_PATH": data_dir / "applab.db",
        "PREVIEW_DIR": data_dir / "previews",
        "SESSION_COOKIE_SECURE": get("COOKIE_SECURE", "1") == "1",
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "PERMANENT_SESSION_LIFETIME": 60 * 60 * 24 * 30,
    }
