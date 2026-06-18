from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import sys
import traceback
import hashlib
import secrets
import time
import threading
APP_DIR = Path(__file__).resolve().parent
VENDOR_DIR = APP_DIR / "vendor"
if VENDOR_DIR.exists():
    sys.path.insert(0, str(VENDOR_DIR))

try:
    import psycopg2
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing PostgreSQL driver. Run: python -m pip install --target vendor -r requirements.txt"
    ) from exc
from http.cookies import SimpleCookie



def load_env_file(path):
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


load_env_file(APP_DIR / ".env")

# Lock to serialize writes across threads
WRITE_LOCK = threading.Lock()


def connect():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    
    # For local PostgreSQL, don't require SSL; for Render/production, it's required
    if "localhost" in db_url or "127.0.0.1" in db_url:
        return psycopg2.connect(db_url)
    else:
        return psycopg2.connect(db_url, sslmode="require")


def session_cookie_header(token):
    secure = "; Secure" if os.getenv("COOKIE_SECURE", "").lower() in {"1", "true", "yes"} else ""
    return f"session={token}; Path=/; HttpOnly{secure}; SameSite=Lax"


def expired_session_cookie_header():
    secure = "; Secure" if os.getenv("COOKIE_SECURE", "").lower() in {"1", "true", "yes"} else ""
    return (
        "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; "
        f"HttpOnly{secure}; SameSite=Lax"
    )


def masked_database_url():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return "<not set>"

    parsed = urlparse(db_url)
    if parsed.password is None:
        return db_url

    return db_url.replace(f":{parsed.password}@", ":***@")


def init_db():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL)"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL)"
            )
            cur.execute("""
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    amount NUMERIC(12,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                    category_name TEXT,
                    type TEXT NOT NULL,
                    amount NUMERIC(12,2) NOT NULL,
                    note TEXT,
                    transaction_date DATE NOT NULL,
                    state_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        """)
            cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS state_id TEXT")
            cur.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0")
            cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_name TEXT")
            cur.execute("""
                UPDATE transactions t
                SET category_name = c.name
                FROM categories c
                WHERE t.category_id = c.id
                  AND (t.category_name IS NULL OR t.category_name = '')
            """)
        conn.commit()


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return h, salt


def create_user(name, email, password):
    h, salt = hash_password(password)
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        "INSERT INTO users (name, email, password_hash, salt) VALUES (%s, %s, %s, %s) RETURNING id",
                        (name, email, h, salt),
                    )
                    user_id = cur.fetchone()[0]
                    conn.commit()
                    return user_id
                except psycopg2.IntegrityError:
                    conn.rollback()
                    return None


def find_user_by_email(email):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, password_hash, salt FROM users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
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
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO sessions (token, user_id, created_at) VALUES (%s, %s, %s) "
                    "ON CONFLICT (token) DO UPDATE SET user_id = excluded.user_id, created_at = excluded.created_at",
                    (token, user_id, created),
                )
                conn.commit()
    return token


def get_user_by_session(token):
    if not token:
        return None
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = %s",
                (token,),
            )
            row = cur.fetchone()
    if not row:
        return None
    user_id, name, email = row
    return {"id": user_id, "name": name, "email": email}


def delete_session(token):
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM sessions WHERE token = %s", (token,))
                conn.commit()

def normalize_category_type(category_type):
    return "income" if category_type == "income" else "expense"

def create_category(user_id, name, category_type, amount=0):
    category_type = normalize_category_type(category_type)
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO categories
                    (user_id, name, type, amount)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, name, category_type, amount or 0)
                )

                category_id = cur.fetchone()[0]
                conn.commit()

    return category_id

def get_or_create_category(user_id, name, category_type, amount=None):
    name = (name or "").strip()
    category_type = normalize_category_type(category_type)
    if not name:
        raise ValueError("Category name is required")

    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id FROM categories
                    WHERE user_id = %s AND lower(name) = lower(%s) AND type = %s
                    ORDER BY id
                    LIMIT 1
                    """,
                    (user_id, name, category_type),
                )
                row = cur.fetchone()
                if row:
                    if amount is not None:
                        cur.execute(
                            "UPDATE categories SET amount = %s WHERE id = %s",
                            (amount or 0, row[0]),
                        )
                        conn.commit()
                    return row[0]

                cur.execute(
                    """
                    INSERT INTO categories
                    (user_id, name, type, amount)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, name, category_type, amount or 0),
                )
                category_id = cur.fetchone()[0]
                conn.commit()
                return category_id

def create_transaction(user_id, category_id, tx_type,
                       amount, note, transaction_date, state_id=None):
    tx_type = normalize_category_type(tx_type)
    note = note or ""
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT name FROM categories WHERE id = %s", (category_id,))
                row = cur.fetchone()
                category_name = row[0] if row else ""
                cur.execute(
                    """
                    INSERT INTO transactions
                    (user_id, category_id, category_name, type, amount, note, transaction_date, state_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, category_id, category_name, tx_type,
                     amount, note, transaction_date, state_id)
                )

                transaction_id = cur.fetchone()[0]
                conn.commit()
    return transaction_id


def get_or_create_transaction(user_id, category_name, tx_type,
                              amount, note, transaction_date, state_id=None):
    tx_type = normalize_category_type(tx_type)
    note = note or ""
    category_name = (category_name or "").strip()
    category_id = get_or_create_category(user_id, category_name, tx_type)

    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                if state_id:
                    cur.execute(
                        """
                        SELECT id FROM transactions
                        WHERE user_id = %s
                          AND state_id = %s
                        LIMIT 1
                        """,
                        (user_id, state_id),
                    )
                    row = cur.fetchone()
                    if row:
                        cur.execute(
                            """
                            UPDATE transactions
                            SET category_id = %s,
                                category_name = %s,
                                type = %s,
                                amount = %s,
                                note = %s,
                                transaction_date = %s
                            WHERE id = %s
                            """,
                            (
                                category_id,
                                category_name,
                                tx_type,
                                amount,
                                note,
                                transaction_date,
                                row[0],
                            ),
                        )
                        conn.commit()
                        return row[0], category_id

                cur.execute(
                    """
                    SELECT id, state_id FROM transactions
                    WHERE user_id = %s
                      AND category_id = %s
                      AND type = %s
                      AND amount = %s
                      AND COALESCE(note, '') = %s
                      AND transaction_date = %s
                    ORDER BY id
                    LIMIT 1
                    """,
                    (user_id, category_id, tx_type, amount, note, transaction_date),
                )
                row = cur.fetchone()
                if row:
                    existing_id, existing_state_id = row
                    if state_id and existing_state_id != state_id:
                        cur.execute(
                            "UPDATE transactions SET state_id = %s, category_name = %s WHERE id = %s",
                            (state_id, category_name, existing_id),
                        )
                    elif category_name:
                        cur.execute(
                            "UPDATE transactions SET category_name = %s WHERE id = %s",
                            (category_name, existing_id),
                        )
                    conn.commit()
                    return existing_id, category_id

                cur.execute(
                    """
                    INSERT INTO transactions
                    (user_id, category_id, category_name, type, amount, note, transaction_date, state_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (user_id, category_id, category_name, tx_type, amount, note, transaction_date, state_id),
                )
                transaction_id = cur.fetchone()[0]
                conn.commit()
                return transaction_id, category_id

def get_categories(user_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, type, amount FROM categories
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,)
            )
            rows = cur.fetchall()
    categories = []
    for row in rows:
        categories.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "amount": float(row[3] or 0)
        })
    return categories


def reconcile_transactions(user_id, state_transactions):
    state_ids = [
        tx.get("id") for tx in (state_transactions or [])
        if isinstance(tx.get("id"), str) and tx.get("id")
    ]

    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                if state_ids:
                    cur.execute(
                        "DELETE FROM transactions WHERE user_id = %s AND state_id IS NOT NULL AND state_id NOT IN %s",
                        (user_id, tuple(state_ids)),
                    )
                else:
                    cur.execute(
                        "DELETE FROM transactions WHERE user_id = %s AND state_id IS NOT NULL",
                        (user_id,),
                    )
                cur.execute(
                    "DELETE FROM transactions WHERE user_id = %s AND state_id IS NULL",
                    (user_id,),
                )
                conn.commit()


def delete_transaction_by_state_id(user_id, state_id):
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM transactions WHERE user_id = %s AND state_id = %s",
                    (user_id, state_id),
                )
                deleted = cur.rowcount
                conn.commit()
    return deleted


def delete_transaction_by_details(user_id, tx):
    tx_type = normalize_category_type(tx.get("type", "expense"))
    category_id = get_or_create_category(user_id, tx.get("category", ""), tx_type)
    note = tx.get("note", "") or ""
    transaction_date = tx.get("date") or tx.get("transaction_date")
    amount = tx.get("amount")

    if not category_id or amount is None or not transaction_date:
        return 0

    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM transactions
                    WHERE id = (
                        SELECT id FROM transactions
                        WHERE user_id = %s
                          AND category_id = %s
                          AND type = %s
                          AND amount = %s
                          AND COALESCE(note, '') = %s
                          AND transaction_date = %s
                        ORDER BY id
                        LIMIT 1
                    )
                    """,
                    (user_id, category_id, tx_type, amount, note, transaction_date),
                )
                deleted = cur.rowcount
                conn.commit()
    return deleted


def update_transaction(user_id, state_id, previous_tx, updated_tx):
    tx_type = normalize_category_type(updated_tx.get("type", "expense"))
    category = str(updated_tx.get("category") or "").strip()
    amount = updated_tx.get("amount")
    note = updated_tx.get("note", "") or ""
    transaction_date = updated_tx.get("date") or updated_tx.get("transaction_date")

    if not category or amount is None or not transaction_date:
        raise ValueError("Missing transaction fields")

    category_id = get_or_create_category(user_id, category, tx_type)

    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                if state_id:
                    cur.execute(
                        """
                        UPDATE transactions
                        SET category_id = %s,
                            category_name = %s,
                            type = %s,
                            amount = %s,
                            note = %s,
                            transaction_date = %s,
                            state_id = %s
                        WHERE user_id = %s
                          AND state_id = %s
                        RETURNING id
                        """,
                        (
                            category_id,
                            category,
                            tx_type,
                            amount,
                            note,
                            transaction_date,
                            state_id,
                            user_id,
                            state_id,
                        ),
                    )
                    row = cur.fetchone()
                    if row:
                        conn.commit()
                        return row[0], category_id

                previous_tx = previous_tx or {}
                prev_category = str(previous_tx.get("category") or "").strip()
                prev_amount = previous_tx.get("amount")
                prev_date = previous_tx.get("date") or previous_tx.get("transaction_date")

                if prev_category and prev_amount is not None and prev_date:
                    prev_type = normalize_category_type(previous_tx.get("type", "expense"))
                    prev_note = previous_tx.get("note", "") or ""
                    prev_category_id = get_or_create_category(user_id, prev_category, prev_type)
                    cur.execute(
                        """
                        UPDATE transactions
                        SET category_id = %s,
                            category_name = %s,
                            type = %s,
                            amount = %s,
                            note = %s,
                            transaction_date = %s,
                            state_id = %s
                        WHERE id = (
                            SELECT id FROM transactions
                            WHERE user_id = %s
                              AND category_id = %s
                              AND type = %s
                              AND amount = %s
                              AND COALESCE(note, '') = %s
                              AND transaction_date = %s
                            ORDER BY id
                            LIMIT 1
                        )
                        RETURNING id
                        """,
                        (
                            category_id,
                            category,
                            tx_type,
                            amount,
                            note,
                            transaction_date,
                            state_id,
                            user_id,
                            prev_category_id,
                            prev_type,
                            prev_amount,
                            prev_note,
                            prev_date,
                        ),
                    )
                    row = cur.fetchone()
                    if row:
                        conn.commit()
                        return row[0], category_id

                conn.commit()

    return get_or_create_transaction(
        user_id,
        category,
        tx_type,
        amount,
        note,
        transaction_date,
        state_id=state_id,
    )


def read_state():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT data FROM app_state WHERE id = 1")
            row = cur.fetchone()

    if not row:
        return None

    data = row[0]

    # PostgreSQL JSONB already returns dict
    if isinstance(data, dict):
        return data

    # For text/json strings
    return json.loads(data)


def write_state(data):
    payload = json.dumps(data)
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO app_state (id, data) VALUES (1, %s) "
                    "ON CONFLICT (id) DO UPDATE SET data = excluded.data",
                    (payload,),
                )
                conn.commit()


class BudgetHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def current_user(self):
        cookie_header = self.headers.get('Cookie')
        token = None
        if cookie_header:
            cookie = SimpleCookie()
            cookie.load(cookie_header)
            if 'session' in cookie:
                token = cookie['session'].value
        return get_user_by_session(token)

    def require_user(self):
        user = self.current_user()
        if not user:
            self.send_json({"error": "Not authenticated"}, status=401)
            return None
        return user

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            self.send_json({"state": read_state()})
            return

        if path == "/api/auth/me":
            user = self.current_user()
            if not user:
                self.send_json({"error": "Not authenticated"}, status=401)
                return
            self.send_json({"user": {"id": user['id'], "name": user['name'], "email": user['email']}})
            return
        
        if path == "/api/debug/users":
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id, name, email FROM users"
                    )
                    rows = cur.fetchall()
            self.send_json({"users": rows})
            return
        
        if path == "/api/debug/supabase":
            try:
                with connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        cur.fetchone()
                self.send_json({"ok": True})
            except Exception as exc:
                self.send_json({"ok": False, "error": str(exc)}, status=500)
            return

        if path == "/api/debug/categories":
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT
                            id,
                            user_id,
                            name,
                            type,
                            amount
                        FROM categories
                        ORDER BY id
                    """)
                    rows = cur.fetchall()

            categories = []
            for row in rows:
                categories.append({
                    "id": row[0],
                    "user_id": row[1],
                    "name": row[2],
                    "type": row[3],
                    "amount": float(row[4] or 0)
                })

            self.send_json({"categories": categories})
            return

        if path == "/api/debug/add-category":
            category_id = create_category(
                1,
                "Rent",
                "expense"
            )

            self.send_json({
                "ok": True,
                "id": category_id
            })
            return
        
        if path == "/api/categories":
            user = self.require_user()
            if not user:
                return
            categories = get_categories(user["id"])
            self.send_json({"categories": categories})
            return
        
        if path == "/api/debug/transactions":
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT
                            id,
                            user_id,
                            category_id,
                            category_name,
                            type,
                            amount,
                            note,
                            transaction_date
                        FROM transactions
                        ORDER BY id
                    """)
                    rows = cur.fetchall()
                    transactions = []
                    for row in rows:
                        transactions.append({
                            "id": row[0],
                            "user_id": row[1],
                            "category_id": row[2],
                            "category_name": row[3],
                            "type": row[4],
                            "amount": float(row[5]),
                            "note": row[6],
                            "transaction_date": row[7].isoformat() if row[7] else None
                        })
            self.send_json({"transactions": transactions})
            return
        
        if path == "/api/debug/add-transaction":
            transaction_id = create_transaction(
                user_id=1,
                category_id=1,
                tx_type="expense",
                amount=1200.00,
                note="June Rent",
                transaction_date="2026-06-01"
            )

            self.send_json({
                "ok": True,
                "id": transaction_id
            })
            return

        if path == "/api/transactions":
            user = self.require_user()
            if not user:
                return
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT
                            t.id,
                            t.user_id,
                            t.category_id,
                            COALESCE(t.category_name, c.name),
                            t.type,
                            t.amount,
                            t.note,
                            t.transaction_date
                        FROM transactions t
                        LEFT JOIN categories c
                            ON c.id = t.category_id
                        WHERE t.user_id = %s
                        ORDER BY t.transaction_date DESC
                    """, (user["id"],))
                    rows = cur.fetchall()

            transactions = []

            for row in rows:
                transactions.append({
                    "id": row[0],
                    "user_id": row[1],
                    "category_id": row[2],
                    "category": row[3],
                    "type": row[4],
                    "amount": float(row[5]),
                    "note": row[6],
                    "transaction_date": row[7].isoformat() if row[7] else None
                })

            self.send_json({
                "transactions": transactions
            })

            return

        super().do_GET()

    def do_DELETE(self):
        path = urlparse(self.path).path
        try:
            user = self.current_user()
            if not user:
                self.send_json({"error": "Not authenticated"}, status=401)
                return

            if path.startswith("/api/transactions/"):
                state_id = path.rsplit("/", 1)[-1]
                if not state_id:
                    self.send_json({"error": "Missing transaction id"}, status=400)
                    return

                length = int(self.headers.get("content-length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body) if body else {}
                transaction = payload.get("transaction") or {}

                deleted = delete_transaction_by_state_id(user["id"], state_id)
                if deleted == 0 and transaction:
                    deleted = delete_transaction_by_details(user["id"], transaction)

                self.send_json({"ok": True, "deleted": deleted})
                return

            self.send_error(404)
        except Exception as exc:
            traceback.print_exc()
            self.send_json({"ok": False, "error": str(exc)}, status=400)
            return

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
                headers = {"Set-Cookie": session_cookie_header(token)}
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
                headers = {"Set-Cookie": session_cookie_header(token)}
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
                headers = {"Set-Cookie": expired_session_cookie_header()}
                self.send_json({"ok": True}, headers=headers)
                return

            if path == "/api/categories":
                user = self.current_user()
                if not user:
                    self.send_json({"error": "Not authenticated"}, status=401)
                    return

                name = payload.get("name", "").strip()
                category_type = normalize_category_type(payload.get("type", "").strip())
                category_amount = payload.get("amount")

                if not name or not category_type:
                    self.send_json({"error": "Missing fields"}, status=400)
                    return

                category_id = get_or_create_category(
                    user["id"],
                    name,
                    category_type,
                    amount=category_amount
                )

                self.send_json({
                    "ok": True,
                    "id": category_id
                })

                return

            if path.startswith("/api/transactions/"):
                user = self.current_user()
                if not user:
                    self.send_json({"error": "Not authenticated"}, status=401)
                    return

                state_id = path.rsplit("/", 1)[-1]
                transaction = payload.get("transaction") or {}
                previous_transaction = payload.get("previousTransaction") or {}

                if not state_id or not transaction:
                    self.send_json({"error": "Missing transaction fields"}, status=400)
                    return

                transaction_id, category_id = update_transaction(
                    user["id"],
                    state_id,
                    previous_transaction,
                    transaction
                )

                self.send_json({
                    "ok": True,
                    "id": transaction_id,
                    "category_id": category_id
                })
                return

            if path == "/api/transactions":
                user = self.current_user()
                if not user:
                    self.send_json({"error": "Not authenticated"}, status=401)
                    return

                category = payload.get("category", "").strip()
                tx_type = normalize_category_type(payload.get("type", "").strip())
                amount = payload.get("amount")
                note = payload.get("note", "")
                transaction_date = payload.get("date") or payload.get("transaction_date")

                if not category or amount is None or not transaction_date:
                    self.send_json({"error": "Missing fields"}, status=400)
                    return

                transaction_id, category_id = get_or_create_transaction(
                    user["id"],
                    category,
                    tx_type,
                    amount,
                    note,
                    transaction_date,
                    state_id=payload.get("id")
                )

                self.send_json({
                    "ok": True,
                    "id": transaction_id,
                    "category_id": category_id
                })
                return

            if path == "/api/sync-state":
                user = self.current_user()
                if not user:
                    self.send_json({"error": "Not authenticated"}, status=401)
                    return

                sync_state = payload.get("state") or {}
                plans = sync_state.get("plans") or {}
                transactions = sync_state.get("transactions") or []
                category_count = 0
                transaction_count = 0

                for plan in plans.values():
                    for budget in plan.get("budgets") or []:
                        name = str(budget.get("name") or "").strip()
                        if name:
                            get_or_create_category(
                                user["id"],
                                name,
                                "expense",
                                amount=budget.get("amount")
                            )
                            category_count += 1

                    for income in plan.get("incomes") or []:
                        description = str(income.get("description") or "").strip()
                        if description:
                            get_or_create_category(
                                user["id"],
                                description,
                                "income",
                                amount=income.get("amount")
                            )
                            category_count += 1

                for tx in transactions:
                    category = str(tx.get("category") or "").strip()
                    amount = tx.get("amount")
                    transaction_date = tx.get("date") or tx.get("transaction_date")
                    if not category or amount is None or not transaction_date:
                        continue

                    get_or_create_transaction(
                        user["id"],
                        category,
                        tx.get("type", "expense"),
                        amount,
                        tx.get("note", ""),
                        transaction_date,
                        state_id=tx.get("id")
                    )
                    transaction_count += 1

                reconcile_transactions(user["id"], transactions)

                self.send_json({
                    "ok": True,
                    "categories": category_count,
                    "transactions": transaction_count
                })
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
    try:
        init_db()
    except Exception as exc:
        traceback.print_exc()
        print()
        print("Could not initialize PostgreSQL.")
        print("Check DATABASE_URL in .env or your environment.")
        print(f"Current DATABASE_URL: {masked_database_url()}")
        raise SystemExit(1) from exc
    server = ThreadingHTTPServer((host, port), BudgetHandler)
    print(f"Budget Monitor backend running at http://localhost:{port}/")
    print("Supabase Postgres backend using DATABASE_URL")
    server.serve_forever()
