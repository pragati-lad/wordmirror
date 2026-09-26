# WordMirror

A vocabulary learning app that helps you discover, save, and practice English words daily.

**Live:** https://wordmirror.onrender.com

## Features

- **Word Search** — Look up any word with definitions, phonetics, and audio pronunciation
- **Daily Words** — 3 personalized words each day from Barron's word list
- **Bookmarks** — Save words to review later
- **AI Sentences** — Context-rich example sentences tailored to your profile
- **Mobile API** — Full JSON API for the companion mobile app

## Run Locally

```bash
pip install -r requirements.txt
python app.py
```

Create a `.env` file:

```
SECRET_KEY=any-secret-string
GROQ_API_KEY=your-key-here  # optional, for AI sentences
```

## Deploy to Render

1. Push to GitHub
2. On Render, create a **Blueprint** and connect the repo
3. `render.yaml` handles the rest — web service + free PostgreSQL

## Tech Stack

Flask · SQLite (local) · PostgreSQL (production) · Gunicorn · Wiktionary API · Groq AI
