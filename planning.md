# Vocab App — Planning

## Vision
A vocabulary app that makes learning words stick by generating personalized, relatable example sentences based on the user's own life context.

## Tech Stack (Decided)
- **Framework:** React Native (JavaScript) — cross-platform Android + iOS
- **Dictionary API:** Free Dictionary API (free, no API key)
- **Sentence Generation:** Pre-built sentence bank with smart templates (free, offline-capable)
- **Authentication:** Email/password + Google/Apple OAuth
- **Backend:** TBD (Firebase is a good free option for auth + database)
- **State Management:** TBD

## Features

### Phase 1 — MVP
- [ ] Project setup (React Native + navigation)
- [ ] User registration/login (collect name, interests, profession, hobbies)
- [ ] User profile screen (edit personal info)
- [ ] Word search — look up meanings via Free Dictionary API
- [ ] Sentence template engine — generate personalized sentences from templates
- [ ] Save/bookmark words for later review

### Phase 2 — Enhancements
- [ ] Word of the day
- [ ] Quiz/flashcard mode using saved words
- [ ] Synonym and antonym associations
- [ ] Usage history and progress tracking

### Phase 3 — Polish
- [ ] Multiple user profiles
- [ ] Share sentences/words with friends
- [ ] Dark mode / theme support
- [ ] Offline word cache

## User Flow
1. **Sign up / Log in** — User provides name, interests, profession, hobbies, favorite topics
2. **Search a word** — User types a word, gets meaning, synonyms, antonyms, associations
3. **See personalized examples** — App fills sentence templates with user's context
4. **Save & review** — User bookmarks words and revisits them later

## Sentence Template System
Templates like:
- "{name} demonstrated {word} while working on {interest}."
- "During {hobby}, {name} felt a sense of {word}."
- "As a {profession}, {name} often encounters {word} in daily tasks."

The app picks the best template based on the word type (noun, verb, adjective) and fills in user data.

## Decisions Log
| Question | Decision | Reason |
|---|---|---|
| Platform | Android + iOS mobile app | User requirement |
| Framework | React Native (JavaScript) | No Java needed, beginner-friendly |
| Dictionary API | Free Dictionary API | Free, no API key |
| Sentence generation | Template-based sentence bank | Free, no API costs, works offline |
| Auth | Email/password + OAuth | Flexibility for users |

## Status
**Stage:** Pre-development — all major decisions made, ready to start building
