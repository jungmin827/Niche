# NichE — Claude Code Project Context

## What This Project Is
NichE is a mobile app for recording, proving, and sharing deep minor interests — books, taste, observation, reflection. The tone is editorial, minimal, quiet, precise.

## Architecture
- **Frontend**: Expo SDK 54 + React Native + TypeScript, Expo Router, TanStack Query, Zustand, NativeWind
- **Backend**: FastAPI modular monolith, async-first, routers/services/repositories separation
- **Database/Auth/Storage**: Supabase (Postgres + Auth + Storage)
- Backend is the domain source of truth. Frontend uses FastAPI for domain data, Supabase only for auth/storage.

## Primary Reference Docs
Consult these before making structural decisions:

| Topic | File |
|---|---|
| Product truth | `docs/product/niche_planning_v1.md` |
| Backend structure | `docs/backend/backend_fastapi.md` |
| API contracts | `docs/backend/backend_api_contract.md` |
| Database schema | `docs/database/database_supabase.md` |
| Frontend structure | `docs/frontend/frontend_app.md` |
| AI quiz/reflection | `docs/ai/ai_quiz_generation.md` |
| Design system | `docs/design/design_system.md` |
| Copy/language | `docs/language/content_language.md` |

## Non-Negotiables
- Changes must be small, reviewable, and incremental
- Do not invent product behavior that contradicts docs
- Prefer editing existing patterns over introducing new architecture
- JSON-only API design; camelCase in DTOs, snake_case in Python/DB internally
- No flashy UI, no heavy gradients, no productivity-app copy
- Do not overengineer

## Implementation Priority
1. Backend skeleton stabilization (`apps/api`)
2. Frontend skeleton stabilization (`apps/mobile`)
3. Session domain end-to-end (create / read / complete / note)
4. Note / reflection flow
5. Archive / highlights
6. AI quiz flow

**Not yet:** follow system, recommendation engine, likes/comments, complex worker infra

## Working Style
Before coding:
1. Identify the exact doc section relevant to the task
2. State assumptions briefly in comments or commit message if needed
3. Implement the smallest useful slice
4. Keep TODOs explicit rather than silently skipping important gaps

## Code Style
- Produce directly usable code
- Prefer explicit names
- Avoid placeholder abstractions unless clearly justified
- Keep diffs easy to review
