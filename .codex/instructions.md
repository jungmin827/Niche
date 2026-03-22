# NichE — Codex Project Instructions

## Role
You are working inside the NichE repository.
NichE is a mobile app service for recording, proving, and sharing deep, minor interests such as books, taste, observation, and reflection.

You must treat the repository docs as the source of truth for implementation decisions.

## Primary References
Always consult these documents before making structural decisions:

- docs/product/niche_planning_v1.md
- docs/backend/backend_fastapi.md
- docs/backend/backend_api_contract.md
- docs/database/database_supabase.md
- docs/frontend/frontend_app.md
- docs/ai/ai_quiz_generation.md
- docs/design/design_system.md
- docs/language/content_language.md

## Architecture
- Frontend: Expo + React Native + TypeScript
- Backend: FastAPI + Python
- Database/Auth/Storage: Supabase
- Backend is the domain source of truth
- Frontend uses FastAPI for domain data and Supabase mainly for auth/storage support

## Non-negotiables
- Keep changes small, reviewable, and incremental.
- Do not invent product behavior that contradicts docs.
- Prefer editing existing patterns over introducing new architecture.
- Follow JSON-only API design for backend.
- Use camelCase in API DTOs and snake_case internally for Python/DB.
- Respect the NichE tone: editorial, minimal, quiet, precise.
- Do not add flashy UI, heavy gradients, or productivity-app style copy.
- Do not overengineer.

## Backend Rules
- FastAPI async-first
- Use service/repository separation
- No business logic in routers
- No direct raw DB logic inside routers
- Prepare code to align with Supabase/Postgres schema docs
- Health/readiness endpoints should remain simple and stable

## Frontend Rules
- Expo Router structure should remain clear
- Keep route files thin
- Put business/data logic into src/features, src/api, src/lib
- UI should align with design_system.md
- Language must follow content_language.md
- Prefer simple black/white editorial styling
- Avoid unnecessary global state

## Working Style
Before coding:
1. Identify the exact doc section relevant to the task.
2. State assumptions briefly in code comments or commit message if needed.
3. Implement the smallest useful slice.
4. Keep TODOs explicit rather than silently skipping important gaps.

## Priorities
Current implementation priority:
1. backend skeleton stabilization
2. frontend skeleton stabilization
3. session domain end-to-end
4. note / reflection flow
5. archive / highlights
6. AI quiz flow

## Output Style
- Produce code that is directly usable
- Prefer explicit names
- Avoid placeholder abstractions unless clearly justified
- Keep diffs easy to review
