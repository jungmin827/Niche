# NichE Backend Progress — apps/api

> 마지막 업데이트: 2026-04-04
> 기준 문서: `backend_fastapi.md`, `backend_api_contract.md`

---

## 요약

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 뼈대 (app, config, auth, db, middleware) | ✅ 완료 |
| Phase 2 | 세션 도메인 (create / complete / cancel / note) | ✅ 완료 |
| Profile | GET/PATCH /me, GET /users/{id} | ✅ 완료 |
| Phase 3 | 아카이브 (blog posts + highlights + archive endpoint) | ✅ 완료 |
| Phase 4 | 피드 — Text Wave (`GET /v1/feed/wave`) | ✅ 완료 |
| Phase 5 | AI / Quiz / Rank | ✅ 완료 |
| Session Bundle | Postgres 영속 저장 | ✅ 완료 |
| Storage | Supabase Storage presign 실연동 | ✅ 완료 |
| Migrations | DB 스키마 마이그레이션 | ✅ 완료 (`head: 20260329_0002`) |

---

## Phase 1 — 뼈대 ✅

| 파일 | 상태 | 비고 |
|---|---|---|
| `src/main.py` | ✅ | FastAPI app, CORS, error handler, router 등록 |
| `src/config.py` | ✅ | pydantic-settings, 기본 backend `postgres` |
| `src/db.py` | ✅ | SQLAlchemy 2 AsyncSession |
| `src/security.py` | ✅ | Supabase JWT (ES256 → HS256 fallback, dev fallback) |
| `src/middleware/request_id.py` | ✅ | X-Request-ID 부여 및 응답 헤더 포함 |
| `src/exceptions.py` | ✅ | AppError 계층, ServiceUnavailableAppError code 파라미터화 |
| `src/error_codes.py` | ✅ | 도메인별 에러 코드 상수, STORAGE_UNAVAILABLE 추가 |
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

---

## Profile ✅

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me` | ✅ |
| `PATCH /v1/me` | ✅ |
| `GET /v1/users/{userId}` | ✅ public만 노출 |
| `GET /v1/users/handle/{handle}` | ✅ |

- `get_or_create`: 프로필 미존재 시 stub 자동 생성
- `get_by_auth_user_id`: id 분리 준비용 메서드 추가 (Protocol + Postgres + InMemory)
- `PostgresProfileRepository` + `InMemoryProfileRepository` 완전 구현

---

## Phase 3 — 아카이브 ✅

### Blog Posts

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/blog-posts` | ✅ |
| `GET /v1/blog-posts/{postId}` | ✅ private 접근 차단 |
| `PATCH /v1/blog-posts/{postId}` | ✅ |
| `DELETE /v1/blog-posts/{postId}` | ✅ soft delete |
| `GET /v1/me/blog-posts` | ✅ |
| `GET /v1/users/{userId}/blog-posts` | ❌ 미구현 |

- `list_public_by_author`: 타 사용자 공개 블로그 조회용 메서드 추가
- 커버 이미지: `cover_image_path` 없을 시 `body_md`에서 첫 번째 마크다운 이미지 URL fallback (`extract_first_md_image_url`)

### Highlights

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/highlights` | ✅ session 완료 여부 검증 포함 |
| `GET /v1/highlights/{highlightId}` | ✅ |
| `PATCH /v1/highlights/{highlightId}` | ✅ |
| `DELETE /v1/highlights/{highlightId}` | ✅ |
| `GET /v1/me/highlights` | ✅ cursor pagination |
| `GET /v1/users/{userId}/highlights` | ✅ public only |

### Archive

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/me/archive` | ✅ blog posts + highlights + profile + stats 조합 |
| `GET /v1/users/{userId}/archive` | ✅ public profile only, public 콘텐츠만 포함 |

---

## Phase 4 — 피드 (Text Wave) ✅

| 엔드포인트 | 상태 |
|---|---|
| `GET /v1/feed/wave` | ✅ 구현 완료 |

- 데이터 원천: `highlights` (24h TTL, `ORDER BY RANDOM()`)
- WaveItemDTO: `highlightId`, `title`, `authorHandle`, `topic | null`, `imageUrl | null`

---

## Phase 5 — AI / Quiz / Rank ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/quizzes/jobs` | ✅ 멱등 처리, note 없을 시 topic fallback |
| `GET /v1/quizzes/jobs/{jobId}` | ✅ |
| `GET /v1/quizzes/{quizId}` | ✅ |
| `POST /v1/quizzes/{quizId}/attempts` | ✅ AI 채점 + rank 적립 포함 |
| `GET /v1/quizzes/{quizId}/attempts/{attemptId}` | ✅ |
| `GET /v1/sessions/{sessionId}/quiz-result` | ✅ |
| `GET /v1/me/quizzes` | ❌ 미구현 |

- 1개 질문 구조, 멱등성 보장
- Gemini `gemini-2.5-flash` 연동
- Rank: 10단계 (`eveil` → `canon`)

---

## Session Bundle ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/session-bundles` | ✅ |
| `GET /v1/session-bundles/{bundleId}` | ✅ |
| `GET /v1/me/session-bundles` | ❌ 미구현 |

- `PostgresSessionBundleRepository` 완전 구현 (`session_ids UUID[]`, `started_at`/`ended_at` nullable)

---

## Jitter ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/jitter/messages` | ✅ Gemini cloud fallback, 턴 순서 검증 |

---

## Uploads ✅

| 엔드포인트 | 상태 |
|---|---|
| `POST /v1/uploads/presign` | ✅ Supabase Storage httpx 실연동 |

- httpx 예외 3종 분리 처리 (Timeout / HTTPStatusError / RequestError) → `503 STORAGE_UNAVAILABLE`

---

## Repository 구현 현황

| Repository | InMemory | Postgres |
|---|---|---|
| `SessionRepository` | ✅ | ✅ |
| `HighlightRepository` | ✅ | ✅ |
| `ProfileRepository` | ✅ | ✅ |
| `BlogPostRepository` | ✅ | ✅ |
| `QuizRepository` | ✅ | ✅ |
| `SessionBundleRepository` | ✅ | ✅ |

---

## DB Migrations ✅

현재 head: `20260329_0002`

| 마이그레이션 | 내용 |
|---|---|
| `20260313_0001_session_highlight_slice` | session_bundles, sessions, session_notes, highlights |
| `20260317_0001_feed_posts` | feed_posts, feed_post_comments (서비스 미사용, 테이블 잔존) |
| `20260322_0001_profiles` | profiles, profile_stats |
| `20260322_0002_blog_posts` | blog_posts |
| `20260322_0003_quiz_tables` | quiz_job_status_enum, quiz_jobs, quizzes, quiz_attempts |
| `20260329_0001_session_bundle_session_ids` | session_bundles에 `session_ids UUID[]` 추가, nullable 컬럼 수정 |
| `20260329_0002_enable_rls` | 도메인 테이블 12개 전체 RLS 활성화 |

---

## 남은 갭

1. **누락 엔드포인트**
   - `GET /v1/me/session-bundles` — 미구현
   - `GET /v1/me/quizzes` — 미구현
   - `GET /v1/users/{userId}/blog-posts` — 미구현
2. **Quiz worker 비동기 전환** — 현재 AI 호출이 HTTP 요청 블로킹. 장기적으로 DB-backed job + worker 프로세스 전환 권장
3. **feed_posts 테이블 정리** — 서비스에서 미사용 중이나 테이블이 DB에 잔존. 명시적 drop migration 필요
4. **Blog cursor pagination** — `GET /v1/me/archive`, `GET /v1/users/{id}/archive` 내 blog 목록은 cursor 미구현 (TODO 주석)
5. **profile_stats 갱신 트리거** — `GET /v1/me` stats는 현재 archive 서비스와 동일하게 매번 집계. profile_stats 캐시 테이블 활용 미구현
