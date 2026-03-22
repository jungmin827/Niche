# Frontend Scope — apps/mobile

You are implementing frontend code for NichE inside `apps/mobile`.

Expo SDK 55 기준으로 유지한다. `package.json` 의존성 버전 변경 시 SDK 55 호환성을 확인한다.

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
