from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import sqlite3
import traceback
import hashlib
import secrets
import time
import threading
from http.cookies import SimpleCookie



APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "budget_monitor.db"

# Lock to serialize writes to SQLite (ThreadingHTTPServer uses threads)
WRITE_LOCK = threading.Lock()


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)"
    )
    # Users table for server-side authentication
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL)"
    )
    # Sessions table stores session tokens mapped to user ids
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id))"
    )
    return conn


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return h, salt


def create_user(name, email, password):
    h, salt = hash_password(password)
    with WRITE_LOCK:
        with connect() as conn:
            cur = conn.cursor()
            try:
                cur.execute("INSERT INTO users (name, email, password_hash, salt) VALUES (?, ?, ?, ?)", (name, email, h, salt))
                conn.commit()
                return cur.lastrowid
            except sqlite3.IntegrityError:
                return None


def find_user_by_email(email):
    with connect() as conn:
        row = conn.execute("SELECT id, name, email, password_hash, salt FROM users WHERE email = ?", (email,)).fetchone()
    return row


def verify_credentials(email, password):
    row = find_user_by_email(email)
    if not row:
        return None
    user_id, name, email, pw_hash, salt = row
    h, _ = hash_password(password, salt)
    if h == pw_hash:
        return {"id": user_id, "name": name, "email": email}
    return None


def create_session(user_id):
    token = secrets.token_hex(32)
    created = int(time.time())
    with WRITE_LOCK:
        with connect() as conn:
            conn.execute("INSERT OR REPLACE INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user_id, created))
    return token


def get_user_by_session(token):
    if not token:
        return None
    with connect() as conn:
        row = conn.execute("SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?", (token,)).fetchone()
    if not row:
        return None
    user_id, name, email = row
    return {"id": user_id, "name": name, "email": email}


def delete_session(token):
    with WRITE_LOCK:
        with connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def read_state():
    with connect() as conn:
        row = conn.execute("SELECT data FROM app_state WHERE id = 1").fetchone()
    return json.loads(row[0]) if row else None


def write_state(data):
    payload = json.dumps(data, separators=(",", ":"))
    with WRITE_LOCK:
        with connect() as conn:
            conn.execute(
                "INSERT INTO app_state (id, data) VALUES (1, ?) "
                "ON CONFLICT(id) DO UPDATE SET data = excluded.data",
                (payload,),
            )


class BudgetHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            self.send_json({"state": read_state()})
            return

        if path == "/api/auth/me":
            cookie_header = self.headers.get('Cookie')
            token = None
            if cookie_header:
                cookie = SimpleCookie()
                cookie.load(cookie_header)
                if 'session' in cookie:
                    token = cookie['session'].value
            user = get_user_by_session(token)
            if not user:
                self.send_json({"error": "Not authenticated"}, status=401)
                return
            self.send_json({"user": {"id": user['id'], "name": user['name'], "email": user['email']}})
            return

        if path == "/api/debug/users":
            with connect() as conn:
                rows = conn.execute(
                    "SELECT id, name, email FROM users"
                ).fetchall()

            self.send_json({"users": rows})
            return

        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("content-length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else ""
            payload = json.loads(body) if body else {}

            if path == "/api/state":
                write_state(payload.get("state"))
                self.send_json({"ok": True})
                return

            if path == "/api/auth/register":
                name = payload.get("name", "").strip()
                email = payload.get("email", "").strip().lower()
                password = payload.get("password", "")
                if not name or not email or not password:
                    self.send_json({"error": "Missing fields"}, status=400)
                    return
                user_id = create_user(name, email, password)
                if not user_id:
                    self.send_json({"error": "Account already exists"}, status=400)
                    return
                token = create_session(user_id)
                headers = {"Set-Cookie": f"session={token}; Path=/; HttpOnly; SameSite=Lax"}
                self.send_json({"ok": True, "user": {"id": user_id, "name": name, "email": email}}, headers=headers)
                return

            if path == "/api/auth/login":
                email = payload.get("email", "").strip().lower()
                password = payload.get("password", "")
                user = verify_credentials(email, password)
                if not user:
                    self.send_json({"error": "Invalid credentials"}, status=401)
                    return
                token = create_session(user["id"])
                headers = {"Set-Cookie": f"session={token}; Path=/; HttpOnly; SameSite=Lax"}
                self.send_json({"ok": True, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}, headers=headers)
                return

            if path == "/api/auth/logout":
                cookie_header = self.headers.get('Cookie')
                token = None
                if cookie_header:
                    cookie = SimpleCookie()
                    cookie.load(cookie_header)
                    if 'session' in cookie:
                        token = cookie['session'].value
                if token:
                    delete_session(token)
                # expire cookie
                headers = {"Set-Cookie": "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"}
                self.send_json({"ok": True}, headers=headers)
                return

            self.send_error(404)
            return

        except Exception as exc:
            traceback.print_exc()
            self.send_json({"ok": False, "error": str(exc)}, status=400)
            return

    def send_json(self, payload, status=200, headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    host = "0.0.0.0"
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), BudgetHandler)
    print(f"Budget Monitor backend running at http://localhost:{port}/")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()
