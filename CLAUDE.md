# Vocab App

## Project Overview
A personalized vocabulary learning application where users can:
- Search for word meanings and associations
- Get example sentences that are personalized using their profile info (name, interests, topics)
- Make vocabulary learning relatable and memorable

## Core Concept
Collect user information (name, interests, profession, hobbies, etc.) during signup/login and use that context to generate example sentences. For example, if a user named "Praga" likes cricket, the word "tenacity" might show: *"Praga showed tenacity while chasing down the target in the final over."*

## Tech Stack
- **React Native** (JavaScript) — Android + iOS
- **Free Dictionary API** — word meanings
- **Template-based sentence engine** — personalized examples (free, offline)
- **Auth:** Email/password + Google/Apple OAuth

## Conventions
- Keep code modular and well-structured
- Prioritize user experience and fast lookups
- All personalized content must feel natural, not forced

## File Structure
- `CLAUDE.md` — Project rules and context for AI assistance
- `planning.md` — Detailed plan, features, and progress tracking
