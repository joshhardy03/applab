import pytest

from dashboard import create_app


@pytest.fixture
def app(tmp_path):
    app = create_app({"APPLAB_DATA_DIR": str(tmp_path), "APPLAB_PASSWORD": "pw",
                      "APPLAB_SECRET_KEY": "test", "APPLAB_COOKIE_SECURE": "0"})
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, pw="pw"):
    return client.post("/login", data={"password": pw})


def test_health_is_open(client):
    assert client.get("/health").status_code == 200


def test_index_needs_login(client):
    r = client.get("/")
    assert r.status_code == 302 and "/login" in r.headers["Location"]


def test_wrong_password_rejected(client):
    assert login(client, "nope").status_code == 401
    assert client.get("/").status_code == 302


def test_empty_password_config_never_logs_in(tmp_path):
    app = create_app({"APPLAB_DATA_DIR": str(tmp_path), "APPLAB_PASSWORD": "",
                      "APPLAB_COOKIE_SECURE": "0"})
    assert login(app.test_client(), "").status_code == 401


def test_add_app_and_set_status(client):
    login(client)
    client.post("/apps", data={"slug": "blockdrop", "name": "Block Drop", "idea": "falling blocks"})
    page = client.get("/").get_data(as_text=True)
    assert "Block Drop" in page and "none yet" in page
    assert client.post("/apps/blockdrop/status", data={"status": "preview"}).status_code == 302
    assert client.post("/apps/blockdrop/status", data={"status": "bogus"}).status_code == 400
    assert client.post("/apps/missing/status", data={"status": "live"}).status_code == 404


def test_bad_slug_rejected(client):
    login(client)
    client.post("/apps", data={"slug": "../etc", "name": "x"})
    assert "../etc" not in client.get("/").get_data(as_text=True)


def make_preview(app, slug="blockdrop"):
    d = app.config["PREVIEW_DIR"] / slug
    (d / "_expo").mkdir(parents=True)
    (d / "index.html").write_text("<html>game</html>")
    (d / "_expo" / "app.js").write_text("console.log(1)")
    return d


def test_preview_is_public_and_serves_files(app, client):
    make_preview(app)
    r = client.get("/preview/blockdrop/")
    assert r.status_code == 200 and b"game" in r.data
    assert client.get("/preview/blockdrop/_expo/app.js").data == b"console.log(1)"


def test_preview_unknown_path_falls_back_to_index(app, client):
    make_preview(app)
    assert b"game" in client.get("/preview/blockdrop/some/route").data


def test_preview_missing_app_404(client):
    assert client.get("/preview/nothing/").status_code == 404


def test_preview_cannot_escape_dir(app, client):
    make_preview(app)
    r = client.get("/preview/blockdrop/..%2f..%2fapplab.db")
    assert b"SQLite" not in r.data
