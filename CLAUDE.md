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

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
