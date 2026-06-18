# Local PostgreSQL Setup for Budget Monitor

## Prerequisites

You need PostgreSQL installed locally. Follow the steps below:

### Windows

1. **Download PostgreSQL**
   - Go to https://www.postgresql.org/download/windows/
   - Download PostgreSQL 14 or later

2. **Install PostgreSQL**
   - Run the installer
   - Remember the **password** you set for the `postgres` user (default: `postgres`)
   - Port should be `5432` (default)

3. **Verify Installation**
   ```powershell
   psql --version
   ```

4. **Create Local Database**
   ```powershell
   psql -U postgres -c "CREATE DATABASE budget_monitor;"
   ```
   When prompted, enter the password you set during installation.

### macOS

```bash
# Install using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb budget_monitor
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb budget_monitor
```

---

## Configuration

### 1. Create `.env` file

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

### 2. Edit `.env`

For **local development**:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/budget_monitor
PORT=8000
```

For **Render production** (use your Supabase URL):
```
DATABASE_URL=postgresql://user:password@host.supabase.co:5432/postgres
PORT=8000
```

### 3. Load Environment Variables

**PowerShell:**
```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/budget_monitor"
```

**Bash/macOS/Linux:**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/budget_monitor"
```

Or use `python-dotenv`:
```bash
pip install python-dotenv
```

Then update `server.py` top-level to load `.env`:
```python
from dotenv import load_dotenv
load_dotenv()
```

---

## Run the Server

### 1. Activate Virtual Environment

**PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Bash:**
```bash
source .venv/bin/activate
```

### 2. Start Server

```bash
cd d:\D Driver\Codex\2026-06-02\i-want-create-a-small-app\outputs\budget-monitor
python server.py
```

Expected output:
```
Budget Monitor backend running at http://localhost:8000/
Supabase Postgres backend using DATABASE_URL
127.0.0.1 - - [09/Jun/2026 12:00:00] "GET / HTTP/1.1" 200 -
```

---

## Test Connections

### Check Database Connection

```bash
psql -U postgres -d budget_monitor -c "\dt"
```

### Test API

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"secret123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```

---

## Troubleshooting

### "DATABASE_URL not set"
- Make sure you've created the `.env` file
- Reload your terminal after setting environment variables

### "FATAL: Ident authentication failed"
- On Linux, use: `sudo -u postgres psql`
- Or update PostgreSQL `pg_hba.conf` to use `md5` or `password` auth

### "Could not connect to server"
- Ensure PostgreSQL is running:
  - **Windows:** Check Services (postgresql-x64-14)
  - **macOS:** `brew services list`
  - **Linux:** `sudo systemctl status postgresql`

### Tables Not Created
- Delete any existing tables: `psql -U postgres -d budget_monitor -c "DROP TABLE IF EXISTS sessions, users, app_state;"`
- Restart server to reinitialize tables

---

## Database Schema

The app creates three tables automatically on startup:

1. **app_state** - Stores app configuration/state
   - `id INT PRIMARY KEY` (exactly 1 row)
   - `data TEXT` (JSON-serialized state)

2. **users** - User accounts
   - `id SERIAL PRIMARY KEY`
   - `name TEXT`
   - `email TEXT UNIQUE`
   - `password_hash TEXT` (SHA256)
   - `salt TEXT`

3. **sessions** - Active user sessions
   - `token TEXT PRIMARY KEY` (session token)
   - `user_id INTEGER` (references users)
   - `created_at INTEGER` (Unix timestamp)

---

## Development Notes

- **Local:** Uses plain `postgresql://` (no SSL)
- **Production (Render):** Uses `sslmode=require` for encrypted connections
- Connection logic auto-detects based on `DATABASE_URL` content
- All write operations protected by `WRITE_LOCK` (threading safety)
- Passwords hashed with SHA256 (consider bcrypt/argon2 for production)
