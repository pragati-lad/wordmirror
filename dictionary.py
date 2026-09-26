import json
import re
import requests
from database import get_db, is_postgres

WIKTIONARY_URL = "https://en.wiktionary.org/api/rest_v1/page/definition"
WIKTIONARY_HEADERS = {"User-Agent": "WordMirror/1.0 (educational vocabulary app)"}

# Phonetics source (Datamuse — fast, reliable, no key needed)
DATAMUSE_URL = "https://api.datamuse.com/words"

# Optional enrichment source for audio
FREE_DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en"


def look_up(word):
    """Look up a word with SQLite caching.

    Uses Wiktionary (Wikimedia infrastructure) as the primary source,
    then tries to enrich with phonetics/audio from the Free Dictionary API.

    Returns a dictionary with the word's data, or None if not found.
    """
    # 1. Check the cache first
    conn = get_db()
    row = conn.execute(
        "SELECT data FROM word_cache WHERE word = ?", (word.lower(),)
    ).fetchone()
    conn.close()

    if row:
        return json.loads(row["data"])

    # 2. Fetch from APIs (no DB writes)
    result = fetch_word(word)

    if result is None:
        return None

    # 3. Cache and return
    _cache_word(word, result)

    return result


def fetch_word(word):
    """Fetch a word from APIs without any database operations.

    Safe to call from threads since it does no DB writes.
    """
    result = _fetch_wiktionary(word)

    if result is None:
        return None

    _enrich_phonetics(result, word)
    _enrich_audio(result, word)

    return result


def _cache_word(word, result):
    """Write a word result to the cache. Call from the main thread only."""
    conn = get_db()
    if is_postgres:
        conn.execute(
            """INSERT INTO word_cache (word, data) VALUES (?, ?)
               ON CONFLICT (word) DO UPDATE SET data = EXCLUDED.data, cached_at = CURRENT_TIMESTAMP""",
            (word.lower(), json.dumps(result)),
        )
    else:
        conn.execute(
            "INSERT OR REPLACE INTO word_cache (word, data) VALUES (?, ?)",
            (word.lower(), json.dumps(result)),
        )
    conn.commit()
    conn.close()


def _fetch_wiktionary(word):
    """Fetch from the Wiktionary REST API (primary source)."""
    try:
        response = requests.get(
            f"{WIKTIONARY_URL}/{word}",
            headers=WIKTIONARY_HEADERS,
            timeout=5,
        )

        if response.status_code != 200:
            return None

        data = response.json()

        # Wiktionary groups by language — we want English
        entries = data.get("en")
        if not entries:
            return None

        result = {
            "word": word,
            "phonetic": None,
            "audio_url": None,
            "meanings": [],
            "synonyms": [],
            "antonyms": [],
        }

        for entry in entries:
            meaning_data = {
                "part_of_speech": entry.get("partOfSpeech", ""),
                "definitions": [],
            }

            for defn in entry.get("definitions", []):
                # Wiktionary definitions contain HTML tags — strip them
                raw_def = defn.get("definition", "")
                # Strip <style> blocks and their content, then remaining HTML tags
                no_style = re.sub(r"<style[^>]*>.*?</style>", "", raw_def, flags=re.DOTALL)
                clean_def = re.sub(r"<[^>]+>", "", no_style).strip()

                if not clean_def:
                    continue

                example = None
                examples = defn.get("parsedExamples") or defn.get("examples")
                if examples and len(examples) > 0:
                    ex = examples[0]
                    if isinstance(ex, dict):
                        raw_ex = re.sub(r"<style[^>]*>.*?</style>", "", ex.get("example", ""), flags=re.DOTALL)
                        example = re.sub(r"<[^>]+>", "", raw_ex).strip()
                    elif isinstance(ex, str):
                        raw_ex = re.sub(r"<style[^>]*>.*?</style>", "", ex, flags=re.DOTALL)
                        example = re.sub(r"<[^>]+>", "", raw_ex).strip()

                meaning_data["definitions"].append({
                    "definition": clean_def,
                    "example": example,
                })

            if meaning_data["definitions"]:
                result["meanings"].append(meaning_data)

        if not result["meanings"]:
            return None

        return result

    except (requests.RequestException, KeyError, IndexError, ValueError):
        return None


def _enrich_phonetics(result, word):
    """Add IPA phonetics from Datamuse API (fast and reliable)."""
    try:
        response = requests.get(
            DATAMUSE_URL,
            params={"sp": word, "md": "r", "ipa": "1", "max": "1"},
            timeout=3,
        )
        if response.status_code != 200:
            return

        data = response.json()
        if data:
            tags = data[0].get("tags", [])
            for tag in tags:
                if tag.startswith("ipa_pron:"):
                    result["phonetic"] = "/" + tag[9:] + "/"
                    return

    except (requests.RequestException, KeyError, IndexError, ValueError):
        pass


def _enrich_audio(result, word):
    """Try to add audio from the Free Dictionary API (best-effort)."""
    try:
        response = requests.get(f"{FREE_DICT_URL}/{word}", timeout=3)
        if response.status_code != 200:
            return

        data = response.json()
        entry = data[0]

        for p in entry.get("phonetics", []):
            url = p.get("audio", "")
            if url:
                result["audio_url"] = url
                return

    except (requests.RequestException, KeyError, IndexError, ValueError):
        pass
