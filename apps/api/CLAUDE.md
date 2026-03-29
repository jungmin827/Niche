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
- Storage 연결 완료, 신규 작업은 없음 (배포 준비 단계)

---

## 2026-03-22 구현 이력

### Feed — Text Wave 전면 교체
- `GET /v1/feed/wave` 단일 엔드포인트로 교체 (구 `/v1/feed-posts` CRUD 완전 제거)
- 데이터 원천: `feed_posts` 테이블 → `highlights` 테이블 (24h TTL, `ORDER BY RANDOM()`)
- 신규: `src/services/wave_feed_service.py`, `src/schemas/feed.py` (WaveItemDTO, WaveFeedResponse)
- 삭제: `src/services/feed_post_service.py`, `src/repositories/feed_post_repo.py`, `src/models/feed_post.py`
- imageUrl 조합: `src/services/highlight_serialization.py`의 `build_storage_url()` 재사용
- 프론트 계약 문서: `/Users/parkjungmin/Desktop/NichE/claude_wave_feed_contract.md`

### Migration Chain 정비
- `alembic/env.py`: `get_settings()`로 .env 자동 로딩 적용
- `20260322_0001_profiles.py`: profiles, profile_stats 테이블 (feed_posts FK 선행 조건)
- `20260322_0002_blog_posts.py`: blog_posts 테이블
- `20260322_0003_quiz_tables.py`: quiz_job_status_enum + quiz_jobs, quizzes, quiz_attempts 테이블
- 현재 head: `20260322_0003`

### PostgresQuizRepository 구현 (Quiz 409 수정)
- 원인: quiz_repository가 in-memory 고정 → Postgres session/note와 불일치로 409 발생
- `src/models/base.py`: `QuizJobStatusDBEnum` 추가
- `src/models/quiz_tables.py`: `QuizJobTable`, `QuizTable`, `QuizAttemptTable` (JSONB 컬럼 사용)
- `src/repositories/quiz_job_repo.py`: `PostgresQuizRepository` 추가
  - JSONB 직렬화: `dataclasses.asdict()` / `ClassName(**dict)` 패턴
- `src/dependencies/repositories.py`: `get_quiz_repository()` postgres 분기 추가, `_get_postgres_quiz_repository` lru_cache factory

---

## 2026-03-29 구현 이력

### Supabase Storage 실제 연결
- `src/config.py`: `supabase_service_role_key: str | None = None` 필드 추가
- `src/services/upload_service.py`: `generate_presign` async 전환, httpx로 Supabase Storage `POST /storage/v1/object/upload/sign/{bucket}/{path}` 호출
  - `supabase_service_role_key` 미설정 시 stub URL fallback (warning 로그)
  - signed URL 응답의 상대 경로 `/object/upload/sign/...` → `{supabase_url}/storage/v1{signed_path}` 조합
- `src/routers/uploads.py`: `await service.generate_presign(...)` 적용
- `.env`: `NICHE_SUPABASE_SERVICE_ROLE_KEY`, `NICHE_STORAGE_PUBLIC_BASE_URL` 추가
- Supabase Storage `content` 버킷 생성 (public)
- `build_storage_url()` 조합 URL: `{storage_public_base_url}/content/highlight/{user_id}/{uuid}/rendered.png` — 정상 작동 확인

### Session Bundle — GET 엔드포인트 확인
- `GET /v1/session-bundles/{bundle_id}` 및 `POST /v1/session-bundles` 이미 구현 완료 상태
- 프론트 연결을 위한 별도 백엔드 변경 없음

---

### Migration 작성 주의사항
- Enum 타입 정의 시 두 객체 패턴 필수 (기존 `20260313_0001` 참조):
  ```python
  _enum = postgresql.ENUM(...)              # create_type 기본값 → .create(bind, checkfirst=True)용
  _col  = postgresql.ENUM(..., create_type=False)  # op.create_table 컬럼용
  ```
- `sa.Enum`을 `op.create_table` 안에 쓰면 `create_type=False`가 무시되어 DuplicateObjectError 발생
