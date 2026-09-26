"""
WordMirror — Web app + JSON API backend.

Serves both:
  - HTML pages for the browser (session-based auth)
  - JSON API for the Flet mobile app (token-based auth)
"""

import json
import os
import secrets
from datetime import date
import random
from concurrent.futures import ThreadPoolExecutor
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, request, jsonify, render_template,
    session, redirect, url_for, flash,
)
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db, init_db, is_postgres
from dictionary import look_up, fetch_word, _cache_word
from words import BARRON_WORDS
from ai_service import generate_sentences, mask_api_key, _get_api_key

# Load environment variables from .env file
load_dotenv()

# Create the Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY")

# Initialize database tables (runs for both Gunicorn and local dev)
init_db()


# =============================================
#  USER HELPER CLASS (for templates)
# =============================================

class User:
    """Wraps a user DB row so templates can use dot notation."""
    def __init__(self, row):
        self.id = row["id"]
        self.name = row["name"]
        self.email = row["email"]
        self.age = row["age"]
        self.country = row["country"]
        self.profession = row["profession"]
        self.interests = row["interests"]
        self.english_level = row["english_level"]
        self.learning_goal = row["learning_goal"]
        self.native_language = row["native_language"]
        self.api_key = row["api_key"]
        self.profile_complete = row["profile_complete"]
        self.is_authenticated = True

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "age": self.age,
            "country": self.country,
            "profession": self.profession,
            "interests": self.interests,
            "english_level": self.english_level,
            "learning_goal": self.learning_goal,
            "native_language": self.native_language,
            "api_key": self.api_key,
            "profile_complete": self.profile_complete,
        }


class AnonymousUser:
    is_authenticated = False


def get_web_user():
    """Get the logged-in user from the session, or AnonymousUser."""
    user_id = session.get("user_id")
    if not user_id:
        return AnonymousUser()
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        session.clear()
        return AnonymousUser()
    return User(row)


def web_login_required(f):
    """Decorator: redirects to login page if not logged in via session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please log in first.", "error")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# =============================================
#  TEMPLATE HELPERS
# =============================================

@app.context_processor
def inject_globals():
    """Make current_user and csrf_token available in all templates."""
    def csrf_token():
        if "csrf_token" not in session:
            session["csrf_token"] = secrets.token_hex(32)
        return session["csrf_token"]
    return {
        "current_user": get_web_user(),
        "csrf_token": csrf_token,
        "mask_api_key": mask_api_key,
    }


# =============================================
#  WEB ROUTES (HTML pages)
# =============================================

@app.route("/")
def home():
    """Render the HTML home page."""
    current_user = get_web_user()
    daily = []
    if current_user.is_authenticated:
        daily = get_daily_words(current_user.id, user=current_user.to_dict())
    # Convert daily word dicts to objects for dot notation in templates
    class DailyWord:
        def __init__(self, d):
            self.word = d["word"]
            self.phonetic = d.get("phonetic", "")
            self.part_of_speech = d.get("part_of_speech", "")
            self.definition = d.get("definition", "")
            self.audio_url = d.get("audio_url", "")
            self.sentence = d.get("sentence", "")
    daily_objs = [DailyWord(d) for d in daily]
    return render_template("home.html", current_user=current_user, daily_words=daily_objs)


@app.route("/register", methods=["GET", "POST"])
def register():
    """Show registration form or handle registration."""
    if session.get("user_id"):
        return redirect(url_for("home"))

    if request.method == "GET":
        return render_template("register.html", current_user=AnonymousUser())

    # Handle form submission
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    confirm = request.form.get("confirm", "")

    if not name or not email or not password:
        flash("Name, email, and password are required.", "error")
        return redirect(url_for("register"))

    if password != confirm:
        flash("Passwords do not match.", "error")
        return redirect(url_for("register"))

    if len(password) < 6:
        flash("Password must be at least 6 characters.", "error")
        return redirect(url_for("register"))

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        flash("An account with that email already exists.", "error")
        return redirect(url_for("register"))

    password_hash = generate_password_hash(password)
    if is_postgres:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id",
            (name, email, password_hash),
        )
        user_id = cursor.fetchone()["id"]
    else:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash),
        )
        user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    session["user_id"] = user_id
    flash("Account created!", "success")
    return redirect(url_for("profile_setup"))


@app.route("/login", methods=["GET", "POST"])
def login():
    """Show login form or handle login."""
    if session.get("user_id"):
        return redirect(url_for("home"))

    if request.method == "GET":
        return render_template("login.html", current_user=AnonymousUser())

    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not row or not check_password_hash(row["password_hash"], password):
        flash("Invalid email or password.", "error")
        return redirect(url_for("login"))

    session["user_id"] = row["id"]
    flash(f"Welcome back, {row['name']}!", "success")
    return redirect(url_for("home"))


@app.route("/logout")
def logout():
    """Log out by clearing the session."""
    session.clear()
    flash("Logged out.", "success")
    return redirect(url_for("home"))


@app.route("/search")
@web_login_required
def search():
    """Search for a word and redirect to the word page."""
    query = request.args.get("q", "").strip().lower()
    if not query:
        flash("Please enter a word to search.", "error")
        return redirect(url_for("home"))

    word_data = look_up(query)
    if word_data is None:
        flash(f'Could not find the word "{query}". Check the spelling and try again.', "error")
        return redirect(url_for("home"))

    return redirect(url_for("word_detail", word=word_data["word"]))


@app.route("/word/<word>")
@web_login_required
def word_detail(word):
    """Show the word detail page."""
    current_user = get_web_user()
    word_data = look_up(word)

    if word_data is None:
        flash(f'Could not load "{word}" — the dictionary service may be temporarily unavailable. Please try again later.', "error")
        return redirect(url_for("home"))

    # Check bookmark status
    conn = get_db()
    bookmark = conn.execute(
        "SELECT id FROM bookmarks WHERE user_id = ? AND word = ?",
        (current_user.id, word),
    ).fetchone()
    conn.close()

    # Generate AI sentences if an API key is available (user's or server's)
    sentences = []
    if _get_api_key(current_user.to_dict()) and word_data["meanings"]:
        first_meaning = word_data["meanings"][0]
        first_def = (
            first_meaning["definitions"][0]["definition"]
            if first_meaning["definitions"]
            else ""
        )
        sentences = generate_sentences(
            word=word_data["word"],
            definition=first_def,
            part_of_speech=first_meaning["part_of_speech"],
            user=current_user.to_dict(),
        )

    # Convert word_data dict to an object for dot notation in templates
    class WordObj:
        def __init__(self, d):
            self.word = d["word"]
            self.phonetic = d.get("phonetic")
            self.audio_url = d.get("audio_url")
            self.meanings = d.get("meanings", [])
            self.synonyms = d.get("synonyms", [])
            self.antonyms = d.get("antonyms", [])

    return render_template(
        "word.html",
        word=WordObj(word_data),
        is_bookmarked=bookmark is not None,
        sentences=sentences,
        current_user=current_user,
    )


@app.route("/bookmark/<word>", methods=["POST"])
@web_login_required
def toggle_bookmark(word):
    """Toggle bookmark and redirect back to the word page."""
    current_user = get_web_user()
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM bookmarks WHERE user_id = ? AND word = ?",
        (current_user.id, word),
    ).fetchone()

    if existing:
        conn.execute("DELETE FROM bookmarks WHERE id = ?", (existing["id"],))
        conn.commit()
        flash(f'Removed "{word}" from bookmarks.', "success")
    else:
        word_data = look_up(word)
        definition = ""
        part_of_speech = ""
        if word_data and word_data["meanings"]:
            first = word_data["meanings"][0]
            part_of_speech = first["part_of_speech"]
            if first["definitions"]:
                definition = first["definitions"][0]["definition"]

        conn.execute(
            "INSERT INTO bookmarks (user_id, word, definition, part_of_speech) VALUES (?, ?, ?, ?)",
            (current_user.id, word, definition, part_of_speech),
        )
        conn.commit()
        flash(f'Saved "{word}" to bookmarks!', "success")

    conn.close()
    return redirect(url_for("word_detail", word=word))


@app.route("/bookmarks")
@web_login_required
def bookmarks():
    """Show the bookmarks page."""
    current_user = get_web_user()
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC",
        (current_user.id,),
    ).fetchall()
    conn.close()

    class Bookmark:
        def __init__(self, row):
            self.id = row["id"]
            self.word = row["word"]
            self.definition = row["definition"]
            self.part_of_speech = row["part_of_speech"]

    return render_template(
        "bookmarks.html",
        bookmarks=[Bookmark(r) for r in rows],
        current_user=current_user,
    )


@app.route("/bookmark/delete/<int:bookmark_id>", methods=["POST"])
@web_login_required
def delete_bookmark(bookmark_id):
    """Delete a bookmark and redirect back to bookmarks page."""
    current_user = get_web_user()
    conn = get_db()
    conn.execute(
        "DELETE FROM bookmarks WHERE id = ? AND user_id = ?",
        (bookmark_id, current_user.id),
    )
    conn.commit()
    conn.close()
    flash("Bookmark removed.", "success")
    return redirect(url_for("bookmarks"))


@app.route("/profile")
@web_login_required
def profile():
    """Show the profile page."""
    return render_template("profile.html", current_user=get_web_user())


@app.route("/profile/edit", methods=["GET", "POST"])
@web_login_required
def profile_edit():
    """Show or handle profile edit form."""
    current_user = get_web_user()

    if request.method == "GET":
        return render_template("profile_edit.html", current_user=current_user)

    name = request.form.get("name", "").strip()
    if not name:
        flash("Name is required.", "error")
        return redirect(url_for("profile_edit"))

    age = request.form.get("age", "").strip()
    country = request.form.get("country", "").strip()
    profession = request.form.get("profession", "").strip()
    interests = request.form.get("interests", "").strip()
    english_level = request.form.get("english_level", "").strip()
    learning_goal = request.form.get("learning_goal", "").strip()
    native_language = request.form.get("native_language", "").strip()
    api_key = request.form.get("api_key", "").strip()

    conn = get_db()
    conn.execute("""
        UPDATE users
        SET name = ?, age = ?, country = ?, profession = ?,
            interests = ?, english_level = ?, learning_goal = ?,
            native_language = ?, api_key = ?
        WHERE id = ?
    """, (
        name,
        int(age) if age else None,
        country or None,
        profession or None,
        interests or None,
        english_level or None,
        learning_goal or None,
        native_language or None,
        api_key or None,
        current_user.id,
    ))
    conn.commit()
    conn.close()

    flash("Profile updated!", "success")
    return redirect(url_for("profile"))


@app.route("/profile/setup", methods=["GET", "POST"])
@web_login_required
def profile_setup():
    """Show or handle initial profile setup."""
    current_user = get_web_user()

    if request.method == "GET":
        return render_template("profile_setup.html", current_user=current_user)

    age = request.form.get("age", "").strip()
    country = request.form.get("country", "").strip()
    profession = request.form.get("profession", "").strip()
    interests = request.form.get("interests", "").strip()
    english_level = request.form.get("english_level", "").strip()
    learning_goal = request.form.get("learning_goal", "").strip()
    native_language = request.form.get("native_language", "").strip()

    conn = get_db()
    conn.execute("""
        UPDATE users
        SET age = ?, country = ?, profession = ?,
            interests = ?, english_level = ?, learning_goal = ?,
            native_language = ?, profile_complete = 1
        WHERE id = ?
    """, (
        int(age) if age else None,
        country or None,
        profession or None,
        interests or None,
        english_level or None,
        learning_goal or None,
        native_language or None,
        current_user.id,
    ))
    conn.commit()
    conn.close()

    return redirect(url_for("home"))


# =============================================
#  API ROUTES (JSON for mobile app)
# =============================================

# --- API Auth Helpers ---

def get_api_user():
    """Check the Authorization header for a valid token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    conn = get_db()
    row = conn.execute("""
        SELECT users.* FROM users
        JOIN auth_tokens ON users.id = auth_tokens.user_id
        WHERE auth_tokens.token = ?
    """, (token,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def api_login_required(f):
    """Decorator: returns 401 JSON error if no valid token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_api_user()
        if user is None:
            return jsonify({"error": "Authentication required."}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated


def create_token(user_id):
    """Generate a random auth token and save it."""
    token = secrets.token_hex(32)
    conn = get_db()
    conn.execute(
        "INSERT INTO auth_tokens (user_id, token) VALUES (?, ?)",
        (user_id, token),
    )
    conn.commit()
    conn.close()
    return token


def user_to_dict(row):
    """Convert a user database row to a safe dictionary."""
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "age": row["age"],
        "country": row["country"],
        "profession": row["profession"],
        "interests": row["interests"],
        "english_level": row["english_level"],
        "learning_goal": row["learning_goal"],
        "native_language": row["native_language"],
        "api_key_set": bool(row["api_key"]),
        "api_key_display": mask_api_key(row["api_key"]) if row["api_key"] else None,
        "profile_complete": bool(row["profile_complete"]),
    }


# --- API Auth Routes ---

@app.route("/api/register", methods=["POST"])
def api_register():
    """Create a new account and return an auth token (JSON)."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm = data.get("confirm", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required."}), 400
    if password != confirm:
        return jsonify({"error": "Passwords do not match."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "An account with that email already exists."}), 409

    password_hash = generate_password_hash(password)
    if is_postgres:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id",
            (name, email, password_hash),
        )
        user_id = cursor.fetchone()["id"]
    else:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name, email, password_hash),
        )
        user_id = cursor.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    token = create_token(user_id)
    return jsonify({
        "message": "Account created!",
        "token": token,
        "user": user_to_dict(row),
    }), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    """Log in and return an auth token (JSON)."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = create_token(row["id"])
    return jsonify({
        "message": f"Welcome back, {row['name']}!",
        "token": token,
        "user": user_to_dict(row),
    })


@app.route("/api/logout", methods=["POST"])
@api_login_required
def api_logout():
    """Log out by deleting the current auth token (JSON)."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:]
    conn = get_db()
    conn.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Logged out."})


# --- API Profile Routes ---

@app.route("/api/profile", methods=["GET"])
@api_login_required
def api_profile():
    """Get the current user's profile (JSON)."""
    return jsonify({"user": user_to_dict(request.user)})


@app.route("/api/profile", methods=["PUT"])
@api_login_required
def api_profile_update():
    """Update the current user's profile (JSON)."""
    data = request.get_json() or {}
    name = data.get("name", request.user["name"])
    if isinstance(name, str):
        name = name.strip()

    age = data.get("age", request.user["age"])
    country = data.get("country", request.user["country"])
    profession = data.get("profession", request.user["profession"])
    interests = data.get("interests", request.user["interests"])
    english_level = data.get("english_level", request.user["english_level"])
    learning_goal = data.get("learning_goal", request.user["learning_goal"])
    native_language = data.get("native_language", request.user["native_language"])
    api_key = data.get("api_key", request.user["api_key"])

    if not name:
        return jsonify({"error": "Name is required."}), 400

    profile_complete = 1 if (request.user["profile_complete"] or data.get("setup")) else 0

    conn = get_db()
    conn.execute("""
        UPDATE users
        SET name = ?, age = ?, country = ?, profession = ?,
            interests = ?, english_level = ?, learning_goal = ?,
            native_language = ?, api_key = ?, profile_complete = ?
        WHERE id = ?
    """, (
        name,
        int(age) if age else None,
        country.strip() if isinstance(country, str) and country.strip() else None,
        profession.strip() if isinstance(profession, str) and profession.strip() else None,
        interests.strip() if isinstance(interests, str) and interests.strip() else None,
        english_level.strip() if isinstance(english_level, str) and english_level.strip() else None,
        learning_goal.strip() if isinstance(learning_goal, str) and learning_goal.strip() else None,
        native_language.strip() if isinstance(native_language, str) and native_language.strip() else None,
        api_key.strip() if isinstance(api_key, str) and api_key.strip() else None,
        profile_complete,
        request.user["id"],
    ))
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (request.user["id"],)).fetchone()
    conn.close()

    return jsonify({
        "message": "Profile updated!",
        "user": user_to_dict(row),
    })


# --- API Word Routes ---

@app.route("/api/search")
@api_login_required
def api_search():
    """Search for a word (JSON)."""
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify({"error": "Please provide a search query."}), 400

    word_data = look_up(query)
    if word_data is None:
        return jsonify({"error": f'Could not find the word "{query}". Check the spelling and try again.'}), 404

    return jsonify({"word": word_data["word"]})


@app.route("/api/word/<word>")
@api_login_required
def api_word_detail(word):
    """Get full details for a word (JSON)."""
    word_data = look_up(word)
    if word_data is None:
        return jsonify({"error": f'Could not find the word "{word}".'}), 404

    conn = get_db()
    bookmark = conn.execute(
        "SELECT id FROM bookmarks WHERE user_id = ? AND word = ?",
        (request.user["id"], word),
    ).fetchone()
    conn.close()

    sentences = []
    if _get_api_key(request.user) and word_data["meanings"]:
        first_meaning = word_data["meanings"][0]
        first_def = (
            first_meaning["definitions"][0]["definition"]
            if first_meaning["definitions"]
            else ""
        )
        sentences = generate_sentences(
            word=word_data["word"],
            definition=first_def,
            part_of_speech=first_meaning["part_of_speech"],
            user=request.user,
        )

    return jsonify({
        "word": word_data,
        "is_bookmarked": bookmark is not None,
        "sentences": sentences,
    })


# --- API Bookmark Routes ---

@app.route("/api/bookmark/<word>", methods=["POST"])
@api_login_required
def api_toggle_bookmark(word):
    """Toggle bookmark (JSON)."""
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM bookmarks WHERE user_id = ? AND word = ?",
        (request.user["id"], word),
    ).fetchone()

    if existing:
        conn.execute("DELETE FROM bookmarks WHERE id = ?", (existing["id"],))
        conn.commit()
        conn.close()
        return jsonify({"message": f'Removed "{word}" from bookmarks.', "bookmarked": False})
    else:
        word_data = look_up(word)
        definition = ""
        part_of_speech = ""
        if word_data and word_data["meanings"]:
            first = word_data["meanings"][0]
            part_of_speech = first["part_of_speech"]
            if first["definitions"]:
                definition = first["definitions"][0]["definition"]

        conn.execute(
            "INSERT INTO bookmarks (user_id, word, definition, part_of_speech) VALUES (?, ?, ?, ?)",
            (request.user["id"], word, definition, part_of_speech),
        )
        conn.commit()
        conn.close()
        return jsonify({"message": f'Saved "{word}" to bookmarks!', "bookmarked": True})


@app.route("/api/bookmarks")
@api_login_required
def api_bookmarks():
    """Get all bookmarked words (JSON)."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC",
        (request.user["id"],),
    ).fetchall()
    conn.close()

    return jsonify({"bookmarks": [
        {"id": r["id"], "word": r["word"], "definition": r["definition"], "part_of_speech": r["part_of_speech"]}
        for r in rows
    ]})


@app.route("/api/bookmark/<int:bookmark_id>", methods=["DELETE"])
@api_login_required
def api_delete_bookmark(bookmark_id):
    """Remove a bookmark by ID (JSON)."""
    conn = get_db()
    conn.execute(
        "DELETE FROM bookmarks WHERE id = ? AND user_id = ?",
        (bookmark_id, request.user["id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Bookmark removed."})


# --- API Daily Words ---

@app.route("/api/daily-words")
@api_login_required
def api_daily_words():
    """Get today's 3 daily words (JSON)."""
    words = get_daily_words(request.user["id"], user=request.user)
    return jsonify({"daily_words": words})


# =============================================
#  SHARED HELPERS
# =============================================

def get_daily_words(user_id, user=None):
    """Pick 3 random words per user per day, with cached AI sentences."""
    today = date.today().isoformat()
    conn = get_db()

    rows = conn.execute(
        "SELECT id, word, sentences FROM daily_words WHERE user_id = ? AND date = ?",
        (user_id, today),
    ).fetchall()

    if not rows:
        chosen = random.sample(BARRON_WORDS, 3)
        for w in chosen:
            conn.execute(
                "INSERT INTO daily_words (user_id, word, date) VALUES (?, ?, ?)",
                (user_id, w, today),
            )
        conn.commit()
        rows = conn.execute(
            "SELECT id, word, sentences FROM daily_words WHERE user_id = ? AND date = ?",
            (user_id, today),
        ).fetchall()

    conn.close()

    # Check cache on the main thread first, then fetch missing words in
    # parallel (API calls only, no DB writes).  After all threads finish,
    # write new cache entries sequentially on the main thread.
    words_list = [row["word"] for row in rows]

    # 1. Read cache on main thread
    cached_results = {}
    conn = get_db()
    for w in words_list:
        cache_row = conn.execute(
            "SELECT data FROM word_cache WHERE word = ?", (w.lower(),)
        ).fetchone()
        if cache_row:
            cached_results[w] = json.loads(cache_row["data"])
    conn.close()

    # 2. Fetch uncached words in parallel (no DB operations in threads)
    uncached_words = [w for w in words_list if w not in cached_results]
    fetched_results = {}
    if uncached_words:
        with ThreadPoolExecutor(max_workers=3) as executor:
            api_results = list(executor.map(fetch_word, uncached_words))
        for w, result in zip(uncached_words, api_results):
            fetched_results[w] = result

    # 3. Cache newly fetched words on the main thread (sequential writes)
    for w, result in fetched_results.items():
        if result is not None:
            _cache_word(w, result)

    # Merge cached + freshly fetched results
    all_results = {}
    all_results.update(cached_results)
    all_results.update(fetched_results)

    daily = []
    for row in rows:
        word_data = all_results.get(row["word"])

        if word_data:
            first_meaning = word_data["meanings"][0] if word_data["meanings"] else {}
            first_def = ""
            if first_meaning.get("definitions"):
                first_def = first_meaning["definitions"][0]["definition"]
                # Find the first sentence boundary for a clean truncation
                if len(first_def) > 100:
                    cut = first_def.find(".", 40)
                    if cut != -1 and cut < 120:
                        first_def = first_def[:cut + 1]
                    else:
                        first_def = first_def[:100].rsplit(" ", 1)[0] + "..."

            # Check for cached sentences or generate new ones
            sentences = []
            if row["sentences"]:
                sentences = json.loads(row["sentences"])
            elif user and _get_api_key(user) and first_def:
                sentences = generate_sentences(
                    word=word_data["word"],
                    definition=first_def,
                    part_of_speech=first_meaning.get("part_of_speech", ""),
                    user=user,
                )
                # Cache sentences in DB (main thread — safe)
                if sentences:
                    conn2 = get_db()
                    conn2.execute(
                        "UPDATE daily_words SET sentences = ? WHERE id = ?",
                        (json.dumps(sentences), row["id"]),
                    )
                    conn2.commit()
                    conn2.close()

            daily.append({
                "word": word_data["word"],
                "phonetic": word_data.get("phonetic", ""),
                "part_of_speech": first_meaning.get("part_of_speech", ""),
                "definition": first_def,
                "audio_url": word_data.get("audio_url", ""),
                "sentence": sentences[0] if sentences else "",
            })
        else:
            daily.append({
                "word": row["word"],
                "phonetic": "",
                "part_of_speech": "",
                "definition": "Definition not available.",
                "audio_url": "",
                "sentence": "",
            })

    return daily


# --- Start the app ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
