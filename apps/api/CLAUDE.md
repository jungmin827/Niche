# Backend Scope — apps/api

You are implementing backend code for NichE inside `apps/api`.

## Read First
- `docs/backend/backend_fastapi.md` — structure and patterns
- `docs/backend/backend_api_contract.md` — exact endpoint contracts
- `docs/database/database_supabase.md` — table/enum/index/RLS specs

## Responsibilities
- FastAPI routers, services, repositories, schemas, models
- Preserve modular monolith structure
- Keep routers thin — no business logic in routers
- Align DTOs with API contract (camelCase)
- Align schema assumptions with database spec (snake_case)

## Rules
- async-first throughout
- use .venv and uv package manager
- No direct raw DB logic in routers
- No vague placeholder code unless explicitly marked `# TODO:`
- Keep changes small and reviewable
- Use precise names

## Current Focus
- Session domain: create / read / complete / note
- `me/profile` bootstrap only if required for session flow
