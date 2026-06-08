from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import sqlite3
import traceback


APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "budget_monitor.db"


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)"
    )
    return conn


def read_state():
    with connect() as conn:
        row = conn.execute("SELECT data FROM app_state WHERE id = 1").fetchone()
    return json.loads(row[0]) if row else None


def write_state(data):
    payload = json.dumps(data, separators=(",", ":"))
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
        if urlparse(self.path).path == "/api/state":
            self.send_json({"state": read_state()})
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/state":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("content-length", "0"))
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body)
            write_state(payload["state"])
        except Exception as exc:
                # Log exception to server console for debugging
                traceback.print_exc()
                self.send_json({"ok": False, "error": str(exc)}, status=400)
                return

        self.send_json({"ok": True})

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
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
