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
                "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL)"
            )
            cur.execute(
                "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL)"
            )
            
            # Migrate app_state table if it uses the old global format
            cur.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'app_state' AND column_name = 'user_id'
            """)
            if not cur.fetchone():
                cur.execute("DROP TABLE IF EXISTS app_state")

            cur.execute(
                "CREATE TABLE IF NOT EXISTS app_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL)"
            )

            # Ensure app_state has a primary key on user_id to match ON CONFLICT spec
            cur.execute("""
                SELECT 1 FROM information_schema.table_constraints 
                WHERE table_name = 'app_state' AND constraint_type = 'PRIMARY KEY'
            """)
            if not cur.fetchone():
                try:
                    cur.execute("""
                        DELETE FROM app_state a 
                        WHERE a.ctid <> (
                            SELECT min(b.ctid) 
                            FROM app_state b 
                            WHERE a.user_id = b.user_id
                        )
                    """)
                    cur.execute("ALTER TABLE app_state ADD PRIMARY KEY (user_id)")
                except Exception:
                    cur.execute("DROP TABLE IF EXISTS app_state")
                    cur.execute(
                        "CREATE TABLE IF NOT EXISTS app_state (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL)"
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
            cur.execute("CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_state_id ON transactions(state_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS investments (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    state_id TEXT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    invested_amount NUMERIC(12,2) NOT NULL,
                    current_value NUMERIC(12,2) NOT NULL,
                    investment_date DATE NOT NULL,
                    maturity_date DATE,
                    interest_percent NUMERIC(5,2),
                    interest_period TEXT,
                    sip_amount NUMERIC(12,2),
                    notes TEXT,
                    status TEXT DEFAULT 'Active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_investments_state_id ON investments(state_id)")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS investment_style TEXT DEFAULT 'one-time'")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(12,2)")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS total_investment NUMERIC(12,2)")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS expected_duration INTEGER")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS expected_duration_unit TEXT")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS expected_return_percent NUMERIC(5,2)")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS interest_calculation TEXT")
            cur.execute("ALTER TABLE investments ADD COLUMN IF NOT EXISTS paid_months TEXT DEFAULT '{}'")
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

def get_or_create_category(user_id, name, category_type, amount=None, conn=None):
    name = (name or "").strip()
    category_type = normalize_category_type(category_type)
    if not name:
        raise ValueError("Category name is required")

    def execute_query(connection):
        with connection.cursor() as cur:
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
            return cur.fetchone()[0]

    if conn:
        return execute_query(conn)

    with WRITE_LOCK:
        with connect() as conn_new:
            res = execute_query(conn_new)
            conn_new.commit()
            return res

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
                              amount, note, transaction_date, state_id=None, conn=None):
    tx_type = normalize_category_type(tx_type)
    note = note or ""
    category_name = (category_name or "").strip()

    def execute_query(connection):
        category_id = get_or_create_category(user_id, category_name, tx_type, conn=connection)
        with connection.cursor() as cur:
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
            return cur.fetchone()[0], category_id

    if conn:
        return execute_query(conn)

    with WRITE_LOCK:
        with connect() as conn_new:
            res = execute_query(conn_new)
            conn_new.commit()
            return res

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


def reconcile_transactions(user_id, state_transactions, conn=None):
    state_ids = [
        tx.get("id") for tx in (state_transactions or [])
        if isinstance(tx.get("id"), str) and tx.get("id")
    ]

    def execute_query(connection):
        with connection.cursor() as cur:
            if state_ids:
                cur.execute(
                    "DELETE FROM transactions WHERE user_id = %s AND state_id IS NOT NULL AND NOT (state_id = ANY(%s))",
                    (user_id, state_ids),
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

    if conn:
        execute_query(conn)
        return

    with WRITE_LOCK:
        with connect() as conn_new:
            execute_query(conn_new)
            conn_new.commit()


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


def read_state(user_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT data FROM app_state WHERE user_id = %s", (user_id,))
            row = cur.fetchone()

    if not row:
        return None

    data = row[0]

    # PostgreSQL JSONB already returns dict
    if isinstance(data, dict):
        return data

    # For text/json strings
    return json.loads(data)


def write_state(user_id, data):
    payload = json.dumps(data)
    with WRITE_LOCK:
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO app_state (user_id, data) VALUES (%s, %s) "
                    "ON CONFLICT (user_id) DO UPDATE SET data = excluded.data",
                    (user_id, payload),
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
            user = self.require_user()
            if not user:
                return
            self.send_json({"state": read_state(user["id"])})
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
                user = self.current_user()
                if not user:
                    self.send_json({"error": "Not authenticated"}, status=401)
                    return
                write_state(user["id"], payload.get("state"))
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
                investments = sync_state.get("investments") or []
                category_count = 0
                transaction_count = 0
                investment_count = 0

                with WRITE_LOCK:
                    with connect() as conn:
                        with conn.cursor() as cur:
                            # 1. Fetch and cache all categories for the user
                            cur.execute(
                                "SELECT id, name, type, amount FROM categories WHERE user_id = %s",
                                (user["id"],)
                            )
                            db_categories = cur.fetchall()
                            cat_cache = {
                                (cat[1].lower(), cat[2].lower()): (cat[0], cat[3])
                                for cat in db_categories
                            }

                            # Keep track of categories processed during this sync
                            processed_categories = {}

                            for plan in plans.values():
                                for budget in plan.get("budgets") or []:
                                    name = str(budget.get("name") or "").strip()
                                    if not name:
                                        continue
                                    key = (name.lower(), "expense")
                                    amount = budget.get("amount") or 0

                                    if key in processed_categories:
                                        continue

                                    if key in cat_cache:
                                        cat_id, cat_amount = cat_cache[key]
                                        if cat_amount is None or float(cat_amount) != float(amount):
                                            cur.execute(
                                                "UPDATE categories SET amount = %s WHERE id = %s",
                                                (amount, cat_id)
                                            )
                                        processed_categories[key] = cat_id
                                    else:
                                        cur.execute(
                                            """
                                            INSERT INTO categories (user_id, name, type, amount)
                                            VALUES (%s, %s, %s, %s)
                                            RETURNING id
                                            """,
                                            (user["id"], name, "expense", amount)
                                        )
                                        cat_id = cur.fetchone()[0]
                                        cat_cache[key] = (cat_id, amount)
                                        processed_categories[key] = cat_id
                                    category_count += 1

                                for income in plan.get("incomes") or []:
                                    description = str(income.get("description") or "").strip()
                                    if not description:
                                        continue
                                    key = (description.lower(), "income")
                                    amount = income.get("amount") or 0

                                    if key in processed_categories:
                                        continue

                                    if key in cat_cache:
                                        cat_id, cat_amount = cat_cache[key]
                                        if cat_amount is None or float(cat_amount) != float(amount):
                                            cur.execute(
                                                "UPDATE categories SET amount = %s WHERE id = %s",
                                                (amount, cat_id)
                                            )
                                        processed_categories[key] = cat_id
                                    else:
                                        cur.execute(
                                            """
                                            INSERT INTO categories (user_id, name, type, amount)
                                            VALUES (%s, %s, %s, %s)
                                            RETURNING id
                                            """,
                                            (user["id"], description, "income", amount)
                                        )
                                        cat_id = cur.fetchone()[0]
                                        cat_cache[key] = (cat_id, amount)
                                        processed_categories[key] = cat_id
                                    category_count += 1

                            # Reconcile categories (delete categories not in plans)
                            to_delete = []
                            for key, (cat_id, _) in cat_cache.items():
                                if key not in processed_categories:
                                    to_delete.append(cat_id)
                            if to_delete:
                                cur.execute("DELETE FROM categories WHERE id = ANY(%s)", (to_delete,))

                            # 2. Fetch and cache all transactions for the user
                            cur.execute(
                                """
                                SELECT id, state_id, category_id, type, amount, note, transaction_date 
                                FROM transactions 
                                WHERE user_id = %s
                                """,
                                (user["id"],)
                            )
                            db_transactions = cur.fetchall()
                            tx_by_state = {
                                tx[1]: tx for tx in db_transactions if tx[1]
                            }
                            tx_by_details = {
                                (tx[2], tx[3].lower(), float(tx[4]), tx[5] or "", tx[6].isoformat() if tx[6] else None): tx[0]
                                for tx in db_transactions
                            }

                            processed_tx_ids = []

                            for tx in transactions:
                                category_name = str(tx.get("category") or "").strip()
                                amount = tx.get("amount")
                                transaction_date = tx.get("date") or tx.get("transaction_date")
                                if not category_name or amount is None or not transaction_date:
                                    continue

                                tx_type = normalize_category_type(tx.get("type", "expense"))
                                note = tx.get("note") or ""
                                state_id = tx.get("id")

                                # Resolve category_id from cache
                                cat_key = (category_name.lower(), tx_type)
                                if cat_key in processed_categories:
                                    category_id = processed_categories[cat_key]
                                elif cat_key in cat_cache:
                                    category_id = cat_cache[cat_key][0]
                                else:
                                    # Create category if missing
                                    cur.execute(
                                        """
                                        INSERT INTO categories (user_id, name, type, amount)
                                        VALUES (%s, %s, %s, %s)
                                        RETURNING id
                                        """,
                                        (user["id"], category_name, tx_type, 0)
                                    )
                                    category_id = cur.fetchone()[0]
                                    cat_cache[cat_key] = (category_id, 0)
                                    processed_categories[cat_key] = category_id

                                existing_tx_id = None
                                needs_update = False

                                if state_id and state_id in tx_by_state:
                                    db_tx = tx_by_state[state_id]
                                    existing_tx_id = db_tx[0]
                                    if (db_tx[2] != category_id or 
                                        db_tx[3].lower() != tx_type or 
                                        float(db_tx[4]) != float(amount) or 
                                        (db_tx[5] or "") != note or 
                                        (db_tx[6].isoformat() if db_tx[6] else None) != transaction_date):
                                        needs_update = True
                                else:
                                    details_key = (category_id, tx_type, float(amount), note, transaction_date)
                                    if details_key in tx_by_details:
                                        existing_tx_id = tx_by_details[details_key]
                                        if state_id:
                                            cur.execute(
                                                "UPDATE transactions SET state_id = %s, category_name = %s WHERE id = %s",
                                                (state_id, category_name, existing_tx_id)
                                            )

                                if existing_tx_id:
                                    if needs_update:
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
                                            (category_id, category_name, tx_type, amount, note, transaction_date, existing_tx_id)
                                        )
                                    processed_tx_ids.append(existing_tx_id)
                                else:
                                    cur.execute(
                                        """
                                        INSERT INTO transactions
                                        (user_id, category_id, category_name, type, amount, note, transaction_date, state_id)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                        RETURNING id
                                        """,
                                        (user["id"], category_id, category_name, tx_type, amount, note, transaction_date, state_id)
                                    )
                                    new_tx_id = cur.fetchone()[0]
                                    processed_tx_ids.append(new_tx_id)

                                transaction_count += 1

                            # Reconcile transactions (delete transactions not in processed_tx_ids)
                            if processed_tx_ids:
                                cur.execute(
                                    "DELETE FROM transactions WHERE user_id = %s AND NOT (id = ANY(%s))",
                                    (user["id"], processed_tx_ids)
                                )
                            else:
                                cur.execute(
                                    "DELETE FROM transactions WHERE user_id = %s",
                                    (user["id"],)
                                )

                            # 3. Fetch and cache all investments for the user
                            cur.execute(
                                """
                                SELECT id, state_id, name, type, invested_amount, current_value, 
                                       investment_date, maturity_date, interest_percent, interest_period, 
                                       sip_amount, notes, status, investment_style, monthly_amount,
                                       total_investment, expected_duration, expected_duration_unit,
                                       expected_return_percent, interest_calculation, paid_months
                                FROM investments
                                WHERE user_id = %s
                                """,
                                (user["id"],)
                            )
                            db_investments = cur.fetchall()
                            inv_by_state = {
                                inv[1]: inv for inv in db_investments if inv[1]
                            }

                            processed_inv_ids = []

                            for inv in investments:
                                name = str(inv.get("name") or "").strip()
                                inv_type = str(inv.get("type") or "Mutual Fund").strip()
                                invested_amount = inv.get("investedAmount")
                                current_value = inv.get("currentValue")
                                investment_date = inv.get("investmentDate")
                                state_id = inv.get("id")

                                if not name or invested_amount is None or current_value is None or not investment_date:
                                    continue

                                # Optional values
                                maturity_date = inv.get("maturityDate") or None
                                if maturity_date == "":
                                    maturity_date = None
                                interest_percent = inv.get("interestPercent")
                                if interest_percent == "" or interest_percent is None:
                                    interest_percent = None
                                interest_period = inv.get("interestPeriod") or "Yearly"
                                sip_amount = inv.get("sipAmount")
                                if sip_amount == "" or sip_amount is None:
                                    sip_amount = None
                                notes = inv.get("notes") or ""
                                status = inv.get("status") or "Active"

                                # New monthly recurring fields
                                investment_style = str(inv.get("investmentStyle") or "one-time").strip()
                                monthly_amount = inv.get("monthlyAmount")
                                if monthly_amount == "" or monthly_amount is None:
                                    monthly_amount = None
                                total_investment = inv.get("totalInvestment")
                                if total_investment == "" or total_investment is None:
                                    total_investment = None
                                expected_duration = inv.get("expectedDuration")
                                if expected_duration == "" or expected_duration is None:
                                    expected_duration = None
                                expected_duration_unit = str(inv.get("expectedDurationUnit") or "Months").strip()
                                expected_return_percent = inv.get("expectedReturnPercent")
                                if expected_return_percent == "" or expected_return_percent is None:
                                    expected_return_percent = None
                                interest_calculation = str(inv.get("interestCalculation") or "Monthly Compounding").strip()
                                paid_months_val = inv.get("paidMonths") or {}
                                paid_months_str = json.dumps(paid_months_val)

                                existing_inv_id = None
                                needs_update = False

                                if state_id and state_id in inv_by_state:
                                    db_inv = inv_by_state[state_id]
                                    existing_inv_id = db_inv[0]
                                    
                                    db_inv_date = db_inv[6].isoformat() if db_inv[6] else None
                                    db_mat_date = db_inv[7].isoformat() if db_inv[7] else None
                                    
                                    def float_eq(v1, v2):
                                        if v1 is None and v2 is None:
                                            return True
                                        if v1 is None or v2 is None:
                                            return False
                                        return abs(float(v1) - float(v2)) < 0.001

                                    if (db_inv[2] != name or
                                        db_inv[3] != inv_type or
                                        not float_eq(db_inv[4], invested_amount) or
                                        not float_eq(db_inv[5], current_value) or
                                        db_inv_date != investment_date or
                                        db_mat_date != maturity_date or
                                        not float_eq(db_inv[8], interest_percent) or
                                        db_inv[9] != interest_period or
                                        not float_eq(db_inv[10], sip_amount) or
                                        (db_inv[11] or "") != notes or
                                        db_inv[12] != status or
                                        db_inv[13] != investment_style or
                                        not float_eq(db_inv[14], monthly_amount) or
                                        not float_eq(db_inv[15], total_investment) or
                                        db_inv[16] != expected_duration or
                                        db_inv[17] != expected_duration_unit or
                                        not float_eq(db_inv[18], expected_return_percent) or
                                        db_inv[19] != interest_calculation or
                                        db_inv[20] != paid_months_str):
                                        needs_update = True

                                if existing_inv_id:
                                    if needs_update:
                                        cur.execute(
                                            """
                                            UPDATE investments
                                            SET name = %s,
                                                type = %s,
                                                invested_amount = %s,
                                                current_value = %s,
                                                investment_date = %s,
                                                maturity_date = %s,
                                                interest_percent = %s,
                                                interest_period = %s,
                                                sip_amount = %s,
                                                notes = %s,
                                                status = %s,
                                                investment_style = %s,
                                                monthly_amount = %s,
                                                total_investment = %s,
                                                expected_duration = %s,
                                                expected_duration_unit = %s,
                                                expected_return_percent = %s,
                                                interest_calculation = %s,
                                                paid_months = %s
                                            WHERE id = %s
                                            """,
                                            (name, inv_type, invested_amount, current_value, investment_date, 
                                             maturity_date, interest_percent, interest_period, sip_amount, 
                                             notes, status, investment_style, monthly_amount, total_investment,
                                             expected_duration, expected_duration_unit, expected_return_percent,
                                             interest_calculation, paid_months_str, existing_inv_id)
                                        )
                                    processed_inv_ids.append(existing_inv_id)
                                else:
                                    cur.execute(
                                        """
                                        INSERT INTO investments
                                        (user_id, state_id, name, type, invested_amount, current_value, 
                                         investment_date, maturity_date, interest_percent, interest_period, 
                                         sip_amount, notes, status, investment_style, monthly_amount,
                                         total_investment, expected_duration, expected_duration_unit,
                                         expected_return_percent, interest_calculation, paid_months)
                                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                        RETURNING id
                                        """,
                                        (user["id"], state_id, name, inv_type, invested_amount, current_value, 
                                         investment_date, maturity_date, interest_percent, interest_period, 
                                         sip_amount, notes, status, investment_style, monthly_amount,
                                         total_investment, expected_duration, expected_duration_unit,
                                         expected_return_percent, interest_calculation, paid_months_str)
                                    )
                                    new_inv_id = cur.fetchone()[0]
                                    processed_inv_ids.append(new_inv_id)

                                investment_count += 1

                            # Reconcile investments
                            if processed_inv_ids:
                                cur.execute(
                                    "DELETE FROM investments WHERE user_id = %s AND NOT (id = ANY(%s))",
                                    (user["id"], processed_inv_ids)
                                )
                            else:
                                cur.execute(
                                    "DELETE FROM investments WHERE user_id = %s",
                                    (user["id"],)
                                )

                            conn.commit()

                self.send_json({
                    "ok": True,
                    "categories": category_count,
                    "transactions": transaction_count,
                    "investments": investment_count
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
