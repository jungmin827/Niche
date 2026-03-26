# NichE Backend Progress — apps/api

> 마지막 업데이트: 2026-03-26 (AI 퀴즈 파이프라인 전체 완료)
> 기준 문서: `backend_fastapi.md`, `backend_api_contract.md`

---

## 요약

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 뼈대 (app, config, auth, db, middleware) | ✅ 완료 |
| Phase 2 | 세션 도메인 (create / complete / cancel / note) | ✅ 완료 |
| Profile | GET/PATCH /me, GET /users/{id} | ✅ 완료 |
| Phase 3 | 아카이브 (blog posts + highlights + archive endpoint) | ✅ 완료 (갭 있음) |
| Phase 4 | 피드 — Text Wave (`GET /v1/feed/wave`) | ✅ 완료 |
| Phase 5 | AI / Quiz / Rank | ✅ 완료 |
| Migrations | DB 스키마 마이그레이션 | ✅ 완료 (`head: 20260322_0003`) |

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
- session_note 필드: `mood`, `tags` 추가 / `source_title` 미포함으로 확장됨

---

## Profile ✅

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me` | ✅ |
| `PATCH /v1/me` | ✅ |
| `GET /v1/users/{userId}` | ✅ public만 노출 |

- `get_or_create`: 프로필 미존재 시 stub 자동 생성
- `PostgresProfileRepository` 완전 구현: profiles INSERT 후 `await db.flush()` → profile_stats FK 제약 충족
- `InMemoryProfileRepository` + `PostgresProfileRepository` 양쪽 구현 완료

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

- `PostgresBlogPostRepository` 완전 구현 (`author_id` ↔ `profile_id` 매핑 포함)

### Highlights

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/highlights` | ✅ session 완료 여부 검증 포함 |
| `GET /v1/highlights/{highlightId}` | ✅ |
| `PATCH /v1/highlights/{highlightId}` | ✅ |
| `DELETE /v1/highlights/{highlightId}` | ✅ |
| `GET /v1/me/highlights` | ✅ cursor pagination |
| `GET /v1/users/{userId}/highlights` | ✅ public only |

- highlight 필드: `caption`, `rendered_image_path`, `source_photo_path`, `template_code` 구조

### Archive

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me/archive` | ✅ blog posts + highlights + profile 조합 응답 |
| `GET /v1/users/{userId}/archive` | ❌ 미구현 |

---

## Phase 4 — 피드 (Text Wave) ✅

> 구 `feed_posts` + `feed_post_comments` 소셜 스크롤 방식은 완전히 제거되었다.
> Feed 탭은 `GET /v1/feed/wave` 단일 엔드포인트로 교체되었다.

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/feed/wave` | ✅ 구현 완료 |

### 구현 내용

- **데이터 원천**: `highlights` 테이블 (24h TTL, `ORDER BY RANDOM()`)
- **인증**: Bearer token 필수
- **응답**: `WaveFeedResponse { waveItems: WaveItemDTO[] }`
- **WaveItemDTO 필드**: `highlightId`, `title`, `authorHandle`, `topic | null`, `imageUrl | null`
- `imageUrl`: `build_storage_url()` (`highlight_serialization.py`) 재사용
- 24h 내 결과 0건이어도 `200 + waveItems: []` 반환

### 구현 파일

- `src/routers/feed.py`
- `src/services/wave_feed_service.py`
- `src/schemas/feed.py` — `WaveItemDTO`, `WaveFeedResponse`

### 제거된 파일 (구 feed_posts)

- `src/services/feed_post_service.py` ❌ 삭제
- `src/repositories/feed_post_repo.py` ❌ 삭제
- `src/models/feed_post.py` ❌ 삭제

> `feed_posts`, `feed_post_comments` DB 테이블은 잔존 (migration rollback 미시행). 서비스 레이어에서 더 이상 접근하지 않음.

---

## Phase 5 — AI / Quiz / Rank ✅

### 엔드포인트

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/quizzes/jobs` | ✅ 멱등 처리, note 없을 시 topic fallback |
| `GET /v1/quizzes/jobs/{jobId}` | ✅ |
| `GET /v1/quizzes/{quizId}` | ✅ |
| `POST /v1/quizzes/{quizId}/attempts` | ✅ AI 채점 + rank 적립 포함 |
| `GET /v1/quizzes/{quizId}/attempts/{attemptId}` | ✅ |
| `GET /v1/sessions/{sessionId}/quiz-result` | ✅ |
| `GET /v1/me/quizzes` | ❌ 미구현 |

### Quiz 생성 방식

현재 구현 (동기):
```
POST /v1/quizzes/jobs → AI 직접 호출 → processing → done/failed
```

- AI 응답 대기 동안 HTTP 요청이 블로킹됨
- 클라이언트 타임아웃 방어: 엔드포인트 멱등 설계 — 재시도 시 기존 quiz/job 반환

### Quiz 파이프라인 주요 구현사항 (2026-03-26)

- **1개 질문 구조**: 3개 → 1개로 간소화 (mapper, adapter, schema, service 전체 반영)
- **멱등성**: quiz 이미 존재 시 done job 반환. job이 failed/processing 상태이면 done으로 heal 후 반환
- **note fallback**: session note 없을 때 topic/subject로 대체 (403 → 생성 허용)
- **Gemini 모델**: `gemini-2.5-flash` (구 `gemini-1.5-flash`는 v1beta에서 사용 불가)
- **프론트 버그 수정**: `handleReflect`에서 note 저장 후 quiz job 생성 순서 보장

### AI Provider

| 파일 | 내용 |
|---|---|
| `src/ai/providers/gemini_adapter.py` | Gemini 연동 (google-genai SDK, async) |
| `src/ai/base.py` | AIProvider protocol |
| `src/ai/mappers/quiz_mapper.py` | AI 응답 파싱 (1 question/grade 검증) |

- 모드별 system prompt: `technical` / `interest` / `literary`
- 채점 기준: Q1 max 100pt 단일 문항
- 응답 검증: `parse_generated_quiz`, `parse_grading_result` — ValueError → RuntimeError 변환

### Rank ✅

- `src/services/rank_service.py` — 완전 구현
- 10개 등급: `eveil(0)` → `seuil(15)` → `fond(40)` → `strate(80)` → `distillat(150)` → `trame(250)` → `empreinte(400)` → `corpus(600)` → `paraphe(850)` → `canon(1200)`
- `submit_attempt` 시 점수 적립 → rank 자동 업데이트

---

## Uploads ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/uploads/presign` | ✅ scope 기반 path 생성, Supabase presigned URL 반환 |

---

## Session Bundle

- 여러 세션을 묶는 개념으로 추가됨
- router, service, repository, model, schema, migration 모두 구현됨
- highlight의 source_type이 `session` | `session_bundle` 양쪽 지원
- `PostgresSessionBundleRepository` 미구현 (TODO)

---

## DB Migrations ✅

현재 head: `20260322_0003`

| 마이그레이션 | 내용 |
|---|---|
| `20260313_0001_session_highlight_slice` | session_bundles, sessions, session_notes, highlights |
| `20260317_0001_feed_posts` | feed_posts, feed_post_comments (서비스 미사용, 테이블 잔존) |
| `20260322_0001_profiles` | profiles, profile_stats |
| `20260322_0002_blog_posts` | blog_posts |
| `20260322_0003_quiz_tables` | quiz_job_status_enum, quiz_jobs, quizzes, quiz_attempts |

| 테이블 | 상태 | 비고 |
|---|---|---|
| `session_bundles` | ✅ | |
| `sessions` | ✅ | |
| `session_notes` | ✅ | |
| `highlights` | ✅ | Text Wave 데이터 원천 |
| `profiles` | ✅ | `20260322_0001` |
| `profile_stats` | ✅ | `20260322_0001` |
| `blog_posts` | ✅ | `20260322_0002` |
| `quiz_jobs` | ✅ | `20260322_0003` |
| `quizzes` | ✅ | `20260322_0003` |
| `quiz_attempts` | ✅ | `20260322_0003` |
| `feed_posts` | ⚠️ 서비스 미사용 | Text Wave 전환 후 테이블 잔존 |
| `feed_post_comments` | ⚠️ 서비스 미사용 | Text Wave 전환 후 테이블 잔존 |

---

## Repository 구현 현황

| Repository | InMemory | Postgres |
|---|---|---|
| `SessionRepository` | ✅ | ✅ |
| `HighlightRepository` | ✅ | ✅ |
| `ProfileRepository` | ✅ | ✅ |
| `BlogPostRepository` | ✅ | ✅ |
| `QuizRepository` | ✅ | ✅ |
| `SessionBundleRepository` | ✅ | ❌ TODO |

---

## 테스트

| 파일 | 내용 |
|---|---|
| `tests/integration/test_mvp_flow_memory.py` | InMemory backend 전체 흐름 |
| `tests/integration/test_mvp_flow_postgres.py` | Postgres backend 전체 흐름 |
| `tests/integration/test_highlight_detail.py` | highlight 상세 조회 |

---

## 남은 갭

1. **누락 엔드포인트**
   - `GET /v1/me/quizzes` — 미구현
   - `GET /v1/users/{userId}/blog-posts` — 미구현
   - `GET /v1/users/{userId}/archive` — 미구현
2. **PostgresSessionBundleRepository** — InMemory만 구현됨
3. **Quiz worker 비동기 전환** — 현재 AI 호출이 HTTP 요청 블로킹. 장기적으로 DB-backed job + worker 프로세스 전환 권장
4. **feed_posts 테이블 정리** — 서비스에서 미사용 중이나 테이블이 DB에 잔존. migration rollback 또는 명시적 drop 필요
5. **Quiz 질문 수 확장** — 현재 검증 단계를 위해 1개로 간소화됨. 안정화 후 3개로 복원 예정
