# NichE Backend Progress — apps/api

> 마지막 업데이트: 2026-03-17 (feed 도메인 완료 + rank 시스템 완료)
> 기준 문서: `backend_fastapi.md`, `backend_api_contract.md`

---

## 요약

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 뼈대 (app, config, auth, db, middleware) | ✅ 완료 |
| Phase 2 | 세션 도메인 (create / complete / cancel / note) | ✅ 완료 |
| Profile | GET/PATCH /me, GET /users/{id} | ✅ 완료 |
| Phase 3 | 아카이브 (blog posts + highlights + archive endpoint) | ✅ 완료 (갭 있음) |
| Phase 4 | 피드 (feed-posts + comments) | ✅ 완료 |
| Phase 5 | AI / Quiz / Worker / Rank | ⚠️ 부분 완료 |
| Migrations | DB 스키마 마이그레이션 | ⚠️ 부분 완료 |

---

## Phase 1 — 뼈대 ✅

| 파일 | 상태 | 비고 |
|---|---|---|
| `src/main.py` | ✅ | FastAPI app, CORS, error handler, router 등록 |
| `src/config.py` | ✅ | pydantic-settings 기반 Settings |
| `src/db.py` | ✅ | SQLAlchemy 2 AsyncSession |
| `src/security.py` | ✅ | Supabase JWT (ES256 → HS256 fallback, dev fallback) |
| `src/middleware/request_id.py` | ✅ | X-Request-ID 부여 및 응답 헤더 포함 |
| `src/exceptions.py` | ✅ | AppError 계층 |
| `src/error_codes.py` | ✅ | 도메인별 에러 코드 상수 |
| `src/routers/health.py` | ✅ | GET /health |

---

## Phase 2 — 세션 ✅

### 엔드포인트

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/sessions` | ✅ active session 충돌 검사 + planned_minutes 제약 포함 |
| `GET /v1/sessions/{sessionId}` | ✅ note embedded 포함 |
| `POST /v1/sessions/{sessionId}/complete` | ✅ actual_minutes 계산, is_highlight_eligible 설정 |
| `POST /v1/sessions/{sessionId}/cancel` | ✅ |
| `GET /v1/me/sessions` | ✅ cursor pagination, status 필터 |
| `PUT /v1/sessions/{sessionId}/note` | ✅ completed 세션만 허용 |
| `GET /v1/sessions/{sessionId}/note` | ✅ |

### 구현 특이사항

- Repository를 Protocol로 추상화 → `InMemorySessionRepository` + `PostgresSessionRepository` 양쪽 구현
- session_note 필드: spec의 `summary`, `insight`, `source_title` 기준에서 **`mood`, `tags` 추가 / `source_title` 미포함**으로 확장됨

---

## Profile ✅

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me` | ✅ |
| `PATCH /v1/me` | ✅ |
| `GET /v1/users/{userId}` | ✅ public만 노출 |

- `get_or_create`: 프로필 미존재 시 stub 자동 생성

---

## Phase 3 — 아카이브 ✅ (갭 있음)

### Blog Posts

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/blog-posts` | ✅ |
| `GET /v1/blog-posts/{postId}` | ✅ private 접근 차단 |
| `PATCH /v1/blog-posts/{postId}` | ✅ |
| `DELETE /v1/blog-posts/{postId}` | ✅ soft delete |
| `GET /v1/me/blog-posts` | ✅ |
| `GET /v1/users/{userId}/blog-posts` | ❌ 미구현 |

### Highlights

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/highlights` | ✅ session 완료 여부 검증 포함 |
| `GET /v1/highlights/{highlightId}` | ✅ |
| `PATCH /v1/highlights/{highlightId}` | ✅ |
| `DELETE /v1/highlights/{highlightId}` | ✅ |
| `GET /v1/me/highlights` | ✅ cursor pagination |
| `GET /v1/users/{userId}/highlights` | ✅ public only |

- highlight 필드: spec의 `subtitle`, `template_type`, `cover_payload_json` 대신 **`caption`, `rendered_image_path`, `source_photo_path`, `template_code`** 구조로 구현됨

### Archive

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me/archive` | ✅ blog posts + highlights + profile 조합 응답 |
| `GET /v1/users/{userId}/archive` | ❌ 미구현 |

---

## Phase 4 — 피드 ✅

### Feed Posts

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/feed-posts` | ✅ 인증 불필요, 만료된 포스트 자동 필터 |
| `POST /v1/feed-posts` | ✅ 인증 필요, 내용 50자 제한 |
| `DELETE /v1/feed-posts/{postId}` | ✅ 작성자만 삭제 가능 |
| `GET /v1/feed-posts/{postId}/comments` | ✅ 인증 불필요 |
| `POST /v1/feed-posts/{postId}/comments` | ✅ 인증 필요, 내용 20자 제한, 만료된 포스트 차단 |
| `DELETE /v1/feed-posts/{postId}/comments/{commentId}` | ✅ 작성자만 삭제 가능 |

### 구현 특이사항

- `FeedPostRecord.expires_at = created_at + 24h` (서비스 레이어에서 설정)
- `list_active_posts`: `expires_at > now()` 조건으로 만료 필터링
- `delete_expired_posts()`: 하드 delete (soft delete 없음)
- post 삭제 시 댓글 cascade 삭제
- `FeedAuthorDTO`: `handle`, `display_name` 포함 — `ProfileRepository.get_or_create` 경유
- InMemory backend만 구현 (PostgresFeedPostRepository는 TODO)
- Migration: `20260317_0001_feed_posts.py` (`feed_posts`, `feed_post_comments` 테이블)

### Blog Posts 추가 엔드포인트

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/blog-posts` | ✅ 인증 불필요, 전체 공개 포스트 목록 (`authorId` 포함) |

---

## Phase 5 — AI / Quiz / Rank ⚠️

### 엔드포인트

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/quizzes/jobs` | ⚠️ 동기 처리 방식 (아래 참조) |
| `GET /v1/quizzes/jobs/{jobId}` | ✅ |
| `GET /v1/quizzes/{quizId}` | ✅ |
| `POST /v1/quizzes/{quizId}/attempts` | ✅ AI 채점 + rank 적립 포함 |
| `GET /v1/quizzes/{quizId}/attempts/{attemptId}` | ✅ |
| `GET /v1/sessions/{sessionId}/quiz-result` | ✅ |
| `GET /v1/me/quizzes` | ❌ 미구현 |

### Quiz 생성 방식 divergence

spec 설계:
```
queued → (worker picks up) → processing → succeeded/failed
```

현재 구현:
```
POST /v1/quizzes/jobs 요청 안에서 AI 직접 호출 → processing → done/failed
```

- worker 프로세스 (`src/worker/quiz_worker.py`) — **파일만 존재, 내용 없음**
- 현재 구현은 AI 응답 대기 동안 HTTP 요청이 블로킹됨
- 장기적으로 Gemini 응답 지연 시 UX 문제 발생 가능

### Rank ✅

- `src/services/rank_service.py` — **완전 구현됨**
- 10개 등급 정의: `eveil(0)` → `seuil(15)` → `fond(40)` → `strate(80)` → `distillat(150)` → `trame(250)` → `empreinte(400)` → `corpus(600)` → `paraphe(850)` → `canon(1200)`
- `evaluate_rank(score)` — 누적 점수 기반 등급 계산
- `RankService.add_score(profile_id, points)` — 점수 적립 + 등급 재계산 + 승급 로깅
- `ProfileRecord`: `current_rank_code`, `rank_score` 필드 보유
- **QuizService에 연결됨**: `submit_attempt` 시 점수 적립 → rank 자동 업데이트

### AI Provider

- `src/ai/providers/gemini_adapter.py` — Gemini 연동 구현
- `src/ai/base.py` — AIProvider protocol 정의
- `src/ai/mappers/quiz_mapper.py` — 응답 파싱

---

## Uploads ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/uploads/presign` | ✅ scope 기반 path 생성, Supabase presigned URL 반환 |

---

## Session Bundle (spec 외 도메인)

- `session_bundle` — 여러 세션을 묶는 개념으로 추가됨 (spec에 없음)
- router, service, repository, model, schema, migration 모두 구현됨
- highlight의 source_type이 `session` | `session_bundle` 양쪽 지원

---

## DB Migrations ⚠️

현재 마이그레이션 2개:

| 마이그레이션 | 내용 |
|---|---|
| `20260313_0001_session_highlight_slice` | session_bundles, sessions, session_notes, highlights |
| `20260317_0001_feed_posts` | feed_posts, feed_post_comments |

| 테이블 | 상태 |
|---|---|
| `session_bundles` | ✅ |
| `sessions` | ✅ |
| `session_notes` | ✅ |
| `highlights` | ✅ |
| `feed_posts` | ✅ |
| `feed_post_comments` | ✅ |
| `profiles` | ❌ migration 없음 |
| `blog_posts` | ❌ migration 없음 |
| `quiz_jobs` | ❌ migration 없음 |
| `quizzes` | ❌ migration 없음 |
| `quiz_attempts` | ❌ migration 없음 |

---

## 테스트

| 파일 | 내용 |
|---|---|
| `tests/integration/test_mvp_flow_memory.py` | InMemory backend 전체 흐름 |
| `tests/integration/test_mvp_flow_postgres.py` | Postgres backend 전체 흐름 |
| `tests/integration/test_highlight_detail.py` | highlight 상세 조회 |

---

## 우선 해결이 필요한 갭

1. **DB migrations** — profiles, blog_posts, quiz_jobs, quizzes, quiz_attempts 테이블 migration 없음
2. **Quiz worker** — 동기 AI 호출을 DB-backed job 비동기 처리로 전환 필요 (현재 request 블로킹)
3. **누락 엔드포인트** — `GET /v1/me/quizzes`, `GET /v1/users/{userId}/blog-posts`, `GET /v1/users/{userId}/archive`
4. **Postgres 미구현 repo** — FeedPostRepository, BlogPostRepository, QuizRepository, SessionBundleRepository, ProfileRepository (InMemory만 존재)
