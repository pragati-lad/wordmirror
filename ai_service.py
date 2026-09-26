import json
import os
import requests


def _get_api_key(user):
    """Get the API key to use: user's own key first, then server default."""
    if user.get("api_key"):
        return user["api_key"]
    return os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")


def generate_sentences(word, definition, part_of_speech, user):
    """Generate personalized example sentences using Groq or OpenAI.

    Uses the user's own API key if set, otherwise falls back to the
    server-side key from environment variables.

    Returns a list of sentence strings, or an empty list if it fails.
    """
    api_key = _get_api_key(user)
    if not api_key:
        return []

    # Build a description of the user for the prompt
    user_context = f"Name: {user['name']}"
    if user.get("profession"):
        user_context += f", Profession: {user['profession']}"
    if user.get("interests"):
        user_context += f", Interests: {user['interests']}"
    if user.get("english_level"):
        user_context += f", English Level: {user['english_level']}"
    if user.get("learning_goal"):
        user_context += f", Learning Goal: {user['learning_goal']}"
    if user.get("native_language"):
        user_context += f", Native Language: {user['native_language']}"

    # Adjust complexity based on english level
    level = (user.get("english_level") or "").lower()
    if level == "beginner":
        complexity_rule = "- Use simple sentence structures and common vocabulary alongside the target word"
    elif level == "advanced":
        complexity_rule = "- Use sophisticated sentence structures with rich vocabulary"
    else:
        complexity_rule = "- Use moderately complex sentence structures"

    # Adjust style based on learning goal
    goal = (user.get("learning_goal") or "").lower()
    if "academic" in goal:
        style_rule = "- Use an academic tone suitable for essays or scholarly writing"
    elif "gre" in goal or "toefl" in goal:
        style_rule = "- Use a formal tone similar to GRE/TOEFL reading passages"
    elif "professional" in goal:
        style_rule = "- Use a professional tone suitable for workplace communication"
    else:
        style_rule = "- Use a casual, conversational tone"

    prompt = f"""Generate exactly 2 example sentences using the word "{word}" ({part_of_speech}: {definition}).

The sentences should feel personal and relatable to this person:
{user_context}

Rules:
- Use the word naturally in context
- Connect to the person's interests or profession when possible
{complexity_rule}
{style_rule}
- Keep sentences concise (1-2 lines each)
- Make them feel like real-life situations, not textbook examples

Return ONLY a JSON array with 2 strings, no other text. Example:
["First sentence here.", "Second sentence here."]"""

    # Detect which API provider to use based on the key format
    if api_key.startswith("gsk_"):
        # Groq API
        url = "https://api.groq.com/openai/v1/chat/completions"
        model = "qwen/qwen3.8-27b"
    elif api_key.startswith("sk-"):
        # OpenAI API
        url = "https://api.openai.com/v1/chat/completions"
        model = "gpt-4o-mini"
    else:
        return []

    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 300,
            },
            timeout=15,
        )

        if response.status_code != 200:
            return []

        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Parse the JSON array from the response
        sentences = json.loads(content)
        if isinstance(sentences, list) and len(sentences) >= 2:
            return sentences[:2]
        return []

    except (requests.RequestException, json.JSONDecodeError, KeyError, IndexError):
        return []


def mask_api_key(key):
    """Mask an API key for safe display.

    Shows only the first 5 and last 4 characters.
    Example: "gsk_abc...wxyz"
    """
    if not key or len(key) < 12:
        return "****"
    return key[:5] + "..." + key[-4:]
