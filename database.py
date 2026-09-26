import os
import sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE = os.path.join(os.path.dirname(__file__), "wordmirror2.db")

is_postgres = DATABASE_URL is not None


class PgConnection:
    """Wraps a psycopg2 connection to provide a sqlite3-compatible interface.

    Translates ? placeholders to %s and returns dict-like rows via RealDictCursor.
    """

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=None):
        sql = sql.replace("?", "%s")
        cursor = self._conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def get_db():
    """Open a connection to the database.

    Uses PostgreSQL if DATABASE_URL is set, otherwise falls back to SQLite.
    Both return dict-like rows (row["column_name"]).
    """
    if is_postgres:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
        return PgConnection(conn)
    else:
        conn = sqlite3.connect(DATABASE, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn


def init_db():
    """Create all database tables if they don't exist yet."""
    conn = get_db()

    pk = "SERIAL PRIMARY KEY" if is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"

    # --- Users table ---
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS users (
            id {pk},
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            age INTEGER,
            country TEXT,
            profession TEXT,
            interests TEXT,
            english_level TEXT,
            learning_goal TEXT,
            native_language TEXT,
            api_key TEXT,
            profile_complete INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- Bookmarks table ---
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id {pk},
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            definition TEXT,
            part_of_speech TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE (user_id, word)
        )
    """)

    # --- Daily words table ---
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS daily_words (
            id {pk},
            user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            date TEXT NOT NULL,
            sentences TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # --- Auth tokens table ---
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id {pk},
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # --- Word cache table ---
    conn.execute("""
        CREATE TABLE IF NOT EXISTS word_cache (
            word TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- Migrate existing databases: add new columns ---
    if is_postgres:
        for col_def in [
            "english_level TEXT",
            "learning_goal TEXT",
            "native_language TEXT",
        ]:
            conn.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_def}")
        conn.execute("ALTER TABLE daily_words ADD COLUMN IF NOT EXISTS sentences TEXT")
    else:
        for col_def in [
            "english_level TEXT",
            "learning_goal TEXT",
            "native_language TEXT",
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
            except sqlite3.OperationalError:
                pass
        try:
            conn.execute("ALTER TABLE daily_words ADD COLUMN sentences TEXT")
        except sqlite3.OperationalError:
            pass

    conn.commit()
    conn.close()
