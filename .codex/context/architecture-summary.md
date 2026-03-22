# NichE Architecture Summary

## Product
NichE helps users record and accumulate deep interest sessions around books, taste, observation, and reflection.

## Tabs
- 세션
- 피드
- 아카이브

## Core Flow
- user plans / starts session
- user completes session
- user writes a short note
- session records accumulate
- archive/highlight/share flow builds on top
- AI reflection/quiz comes after session bundle completion

## Frontend
- Expo + React Native + TypeScript
- Expo Router
- TanStack Query for server state
- Zustand for light local UI state
- NativeWind-centered styling
- black/white editorial tone

## Backend
- FastAPI modular monolith
- routers / services / repositories separation
- Supabase Auth + Postgres + Storage
- app-layer business rules
- JSON-only API

## DB
- sessions are the core source data
- session_notes are key input for reflection
- blog_posts and highlights power archive/feed
- profile_stats is cached aggregate
