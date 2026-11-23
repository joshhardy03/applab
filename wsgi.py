import os

from dashboard import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("APPLAB_PORT", "5080")), debug=False)
