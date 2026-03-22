# Frontend Scope — apps/mobile

You are implementing frontend code for NichE inside `apps/mobile`.

## Read First
- `docs/frontend/frontend_app.md` — Expo structure and screen flow
- `docs/design/design_system.md` — UI tone and visual rules
- `docs/language/content_language.md` — all user-facing copy and naming

## Responsibilities
- Expo Router screens under `app/`
- Business/data logic under `src/features`, `src/api`, `src/lib`
- Keep route files thin
- Follow feature-based folder structure
- Maintain editorial black/white tone

## Rules
- No flashy UI, no gradients, no gamified visuals
- Copy must align with `content_language.md`
- Use simple reusable components
- Avoid unnecessary global state (Zustand for light local UI only)

## Current Focus
- Session tab skeleton
- Session start / active / complete flow
- Minimal UI primitives needed for the session flow
