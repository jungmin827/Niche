# NichE Backend FastAPI Spec v1

## 문서 목적
이 문서는 **NichE 백엔드 구현의 기준 문서**이다.
Codex, Cloud Code, 기타 코딩 에이전트가 이 문서만 읽고도 다음을 이해할 수 있도록 작성한다.

- 왜 FastAPI 단일 백엔드 구조를 택하는지
- FastAPI + Supabase + Postgres를 어떤 방식으로 연결하는지
- 어떤 모듈 구조, 레이어 구조, 권한 모델로 구현해야 하는지
- 세션 / 피드 / 아카이브 / 블로그 / AI quiz job을 어떤 API 경계로 나누는지
- MVP에서 무엇을 구현하고 무엇을 미루는지

이 문서는 기획 문서 `niche_planning_v1.md`, 프론트 문서 `frontend_app.md`를 상위 기준으로 삼는다.
이 문서의 목표는 “백엔드가 바로 프로젝트를 시작할 수 있는 수준의 결정”을 내려두는 것이다.

---

## 1. 백엔드의 역할

NichE 백엔드는 단순 CRUD 서버가 아니다.
NichE 백엔드는 다음 네 가지를 책임진다.

1. **도메인 진실 원천(source of truth)**
   - 세션
   - 세션 회고
   - 블로그 글
   - 하이라이트
   - 피드 노출 규칙
   - 랭크/칭호 계산

2. **AI 기능의 오케스트레이션 레이어**
   - 세션 기록을 바탕으로 quiz 생성 요청을 관리
   - AI 호출 전 입력 정규화/검증
   - 결과 저장 및 상태 관리

3. **공개/비공개 및 권한 정책의 집행 레이어**
   - 기본 공개 정책 적용
   - 작성자만 수정/삭제 가능
   - 공개 콘텐츠만 피드/탐색에 노출

4. **프론트와 Supabase 사이의 경계 레이어**
   - 앱은 인증 외 대부분의 도메인 데이터를 FastAPI를 통해서만 다룬다
   - Supabase는 Auth / Storage / Postgres 인프라 역할을 수행하되,
     앱의 핵심 비즈니스 로직은 FastAPI가 소유한다

즉, NichE 백엔드는 “API 서버”를 넘어서 **제품 규칙을 소유하는 단일 도메인 서버**다.

---

## 2. 아키텍처 한 줄 요약

> **FastAPI 기반 모듈형 모놀리스(modular monolith)로 시작하고, Supabase Auth + Postgres + Storage를 인프라로 사용하며, AI 생성은 DB-backed job worker로 분리한다.**

이 구조를 선택한 이유는 다음과 같다.

- 1인 개발자가 이해하고 유지보수하기 쉽다.
- 프론트/AI/도메인 로직의 변경을 한 서버에서 빠르게 반영할 수 있다.
- 초기 MVP에서는 마이크로서비스 분리가 오히려 개발 속도를 떨어뜨린다.
- 이후 AI worker, search worker, notification worker를 별도 프로세스로 확장할 여지가 남는다.

---

## 3. 핵심 원칙

### 3.1 단일 모놀리스로 시작한다
- API 서버는 하나의 FastAPI 앱으로 시작한다.
- auth, session, feed, archive, blog, quiz 등은 **코드 레벨 모듈**로만 분리한다.
- 서비스 분리는 실제 운영 병목이 생긴 뒤에만 고려한다.

### 3.2 async-first
- FastAPI endpoint는 `async def` 기준으로 구현한다.
- DB access는 SQLAlchemy 2 AsyncSession 기준으로 통일한다.
- 외부 AI 호출도 async HTTP client 기준으로 구성한다.

### 3.3 JSON-only API
- 모든 요청/응답은 JSON으로 통일한다.
- 파일 업로드가 필요하면 presigned flow 또는 multipart endpoint를 명시적으로 둔다.
- HTML 렌더링/SSR 같은 역할은 백엔드가 하지 않는다.

### 3.4 Router / Service / Repository 분리
- Router: request parsing, response serialization, auth dependency 바인딩만 담당
- Service: 도메인 규칙과 비즈니스 흐름 담당
- Repository: DB query/transaction 담당
- AI provider adapter: 외부 LLM 호출 캡슐화

### 3.5 프론트는 FastAPI를 기준으로 본다
- 인증 세션 획득은 Supabase Auth를 사용한다.
- 그러나 세션/피드/아카이브/블로그/퀴즈 데이터는 FastAPI 경유가 원칙이다.
- 프론트에서 Supabase DB를 직접 두드리는 구조는 만들지 않는다.

### 3.6 기본 공개(default public)
- MVP에서 블로그 글, 세션 하이라이트, 아카이브 노출은 기본 공개다.
- 사용자는 개별 콘텐츠를 비공개로 전환할 수 있다.
- 피드와 탐색에는 공개 데이터만 노출한다.

---

## 4. 권장 기술 스택 (확정안)

## 4.1 런타임 / 프레임워크
- Python 3.12
- FastAPI
- Uvicorn
- Pydantic v2
- pydantic-settings

### 선택 이유
- FastAPI는 타입 힌트 기반으로 API 스펙과 구현을 함께 유지하기 좋다.
- Pydantic v2는 DTO 검증과 직렬화 계층을 일관되게 유지하는 데 적합하다.
- pydantic-settings로 환경 변수 관리 규칙을 통일할 수 있다.

## 4.2 DB / ORM / 마이그레이션
- PostgreSQL: Supabase managed Postgres
- SQLAlchemy 2.0 async ORM
- asyncpg driver
- Alembic

### 선택 이유
- Supabase의 핵심 DB는 PostgreSQL이므로 직접 Postgres에 연결하는 것이 가장 단순하다.
- 백엔드의 핵심 도메인 로직은 Supabase REST API보다 직접 DB access가 더 명확하다.
- SQLAlchemy 2 async는 장기 유지보수에 유리하고, Alembic과 조합이 안정적이다.
- MVP 이후에도 schema evolution이 필수이므로 migration 도구를 처음부터 둔다.

## 4.3 인증 / 보안
- Supabase Auth
- FastAPI Bearer token dependency
- Supabase access token 검증
- 서버 내부에서는 `current_user_id`를 앱 공통 식별자로 사용

## 4.4 외부 통신
- `httpx.AsyncClient`
- AI provider adapter layer

## 4.5 로깅 / 관찰성
- 표준 `logging`
- 구조화 가능한 log formatter
- request_id middleware
- health / readiness endpoint

## 4.6 테스트
- pytest
- pytest-asyncio
- httpx AsyncClient test
- repository/service 단위 테스트 + 핵심 API 통합 테스트

## 4.7 의도적으로 제외하는 것
초기 MVP에는 아래를 넣지 않는다.

- Celery / Redis 기반 분산 큐
- GraphQL
- gRPC
- CQRS / Event Sourcing
- 복잡한 DDD 프레임워크
- Kafka / RabbitMQ
- 멀티 DB 분리
- premature microservices

---

## 5. Supabase와의 역할 분담

NichE는 Supabase를 “백엔드 대체재”로 쓰지 않는다.
Supabase는 **인프라 제공자**, FastAPI는 **도메인 서버**다.

### Supabase가 맡는 것
- Auth
- Postgres
- Storage
- 필요 시 Realtime / pgvector 같은 확장 여지

### FastAPI가 맡는 것
- 도메인 API
- 공개/비공개 규칙
- 세션 생성/종료 규칙
- 하이라이트 생성 조건
- 랭크/칭호 계산
- AI quiz job orchestration
- feed query composition
- archive 응답 조합

### 원칙
- 프론트는 Auth 외 직접 Supabase DB를 사용하지 않는다.
- Storage 사용도 FastAPI가 presigned 정책이나 metadata 저장 규칙을 소유한다.
- 핵심 데이터 모델은 항상 백엔드에서 정의하고 migration으로 관리한다.

---

## 6. 인증 / 인가 모델

## 6.1 인증 흐름
1. 모바일 앱은 Supabase Auth로 로그인한다.
2. 앱은 Supabase access token을 보유한다.
3. FastAPI 요청 시 `Authorization: Bearer <token>` 헤더를 보낸다.
4. FastAPI는 토큰을 검증하고 `user_id`를 추출한다.
5. 앱 DB의 `profiles` row와 매핑하여 current user context를 만든다.

## 6.2 current user 표준
FastAPI 내부에서는 다음 값을 auth context의 표준으로 삼는다.

- `auth_user_id`: Supabase auth user uuid
- `profile_id`: app profile uuid (초기에는 auth_user_id와 동일하게 사용 가능)
- `is_anonymous`: False

초기 MVP에서는 `profile_id == auth_user_id`로 두어 복잡도를 낮춘다.
추후 필요할 때 별도 profile PK를 도입한다.

## 6.3 인가 규칙
### 공개 콘텐츠 읽기
- 누구나 조회 가능
- 로그인 없이도 허용할지는 MVP 후반에 결정 가능
- 초기 앱에서는 인증 유저만 사용 가능해도 무방

### 비공개 콘텐츠 읽기
- 작성자만 가능

### 수정/삭제
- 작성자만 가능

### 피드 노출
- `visibility = public` 인 콘텐츠만 노출
- soft-deleted 콘텐츠는 제외

## 6.4 공개 정책 필드
모든 사용자 생성 콘텐츠에는 아래 visibility enum을 둔다.

- `public`
- `private`

MVP에서는 이 2단계만 지원한다.
`followers`, `unlisted`, `friends` 같은 단계형 공개 범위는 제외한다.

---

## 7. API 버전 / 규약

## 7.1 버전 규칙
- 모든 API prefix는 `/v1`
- 예: `/v1/sessions`, `/v1/blog-posts`

## 7.2 응답 규칙
- 성공 응답은 DTO 기반 JSON
- 에러 응답은 공통 에러 스키마 사용
- 날짜/시간은 ISO 8601 UTC string
- enum은 string literal 사용

## 7.3 페이지네이션 규칙
- MVP는 cursor pagination 우선
- 단순 목록은 아래 형태 사용

```json
{
  "items": [],
  "nextCursor": "...",
  "hasNext": true
}
```

offset pagination은 admin/debug 용도가 아니면 피한다.

## 7.4 정렬 규칙
- 최신순 정렬 기본
- 정렬 기준은 명시적 필드로만 제공
- 복잡한 relevance ranking은 MVP 범위에서 제외

---

## 8. 디렉토리 구조 (권장안)

```text
backend/
  app/
    main.py
    config.py
    logging.py
    db.py
    security.py
    exceptions.py
    error_codes.py
    dependencies/
      auth.py
      db.py
      pagination.py
    middleware/
      request_id.py
      access_log.py
    routers/
      health.py
      auth.py
      profiles.py
      sessions.py
      session_notes.py
      quizzes.py
      feed.py
      archive.py
      blog_posts.py
      highlights.py
      uploads.py
    services/
      auth_service.py
      profile_service.py
      session_service.py
      session_note_service.py
      quiz_service.py
      feed_service.py
      archive_service.py
      blog_post_service.py
      highlight_service.py
      upload_service.py
      rank_service.py
    repositories/
      profile_repo.py
      session_repo.py
      session_note_repo.py
      quiz_job_repo.py
      quiz_repo.py
      blog_post_repo.py
      highlight_repo.py
      feed_repo.py
    models/
      base.py
      profile.py
      session.py
      session_note.py
      quiz_job.py
      quiz.py
      quiz_attempt.py
      blog_post.py
      highlight.py
    schemas/
      common.py
      auth.py
      profile.py
      session.py
      session_note.py
      quiz.py
      feed.py
      archive.py
      blog_post.py
      highlight.py
      upload.py
    ai/
      base.py
      prompts/
        quiz_generation.md
      providers/
        gemini_adapter.py
      mappers/
        quiz_mapper.py
    worker/
      main.py
      quiz_worker.py
    utils/
      time.py
      slug.py
      text.py
      idempotency.py
  alembic/
  tests/
    unit/
    integration/
    e2e/
  pyproject.toml
  alembic.ini
  .env.example
```

### 구조 원칙
- `routers/`는 얇게 유지한다.
- `services/`가 도메인 흐름을 소유한다.
- `repositories/`는 SQLAlchemy query를 캡슐화한다.
- `models/`와 `schemas/`를 분리한다.
- `ai/`는 외부 LLM 호출을 분리하여 도메인 로직과 결합도를 낮춘다.
- `worker/`는 API 프로세스와 별도 실행 가능해야 한다.

---

## 9. 레이어 규칙

## 9.1 Router
역할:
- path / method 선언
- request DTO parse
- auth dependency 주입
- service 호출
- response DTO 반환

금지:
- 직접 SQL 작성
- LLM 호출
- 비즈니스 규칙 계산

## 9.2 Service
역할:
- use case orchestration
- transaction 경계 결정
- visibility/ownership 검증
- rank 재계산 트리거
- AI job 생성 및 상태 전이

금지:
- FastAPI Request 객체 의존
- raw JSON 문자열 조작 난립

## 9.3 Repository
역할:
- query/select/insert/update/delete 캡슐화
- filter / order / pagination 구현
- transaction은 외부 session 기준으로 수행

금지:
- HTTP 호출
- 비즈니스 규칙 판단

## 9.4 Schema (DTO)
- 외부 API 요청/응답은 Pydantic schema만 사용
- ORM model을 직접 response로 내보내지 않는다
- API naming은 camelCase로 통일한다
- 내부 Python attribute는 snake_case 사용 가능

---

## 10. 데이터 모델 (MVP 기준)

아래 스키마는 `database_supabase.md`에서 더 상세하게 풀 수 있지만,
백엔드 기준 최소 모델은 여기서 고정한다.

## 10.1 profiles
사용자 프로필.

핵심 필드:
- `id` UUID PK
- `username` unique
- `display_name`
- `bio`
- `avatar_path`
- `rank_level` int
- `rank_title` string
- `total_session_minutes`
- `created_at`
- `updated_at`

원칙:
- MVP에서는 profile 생성/동기화가 auth 가입 직후 자동으로 일어난다고 가정한다.

## 10.2 sessions
딥다이브 세션 본체.

핵심 필드:
- `id`
- `user_id`
- `topic`
- `category`
- `duration_minutes`
- `started_at`
- `ended_at`
- `status` (`active`, `completed`, `cancelled`)
- `visibility`
- `created_at`

원칙:
- MVP 기본 duration은 15분이지만 서버는 다른 duration도 수용 가능하게 만든다.
- 단, product default는 15분이다.

## 10.3 session_notes
세션 종료 후 작성한 짧은 회고/기록.

핵심 필드:
- `id`
- `session_id`
- `user_id`
- `summary`
- `insight`
- `source_title` (optional)
- `created_at`
- `updated_at`

원칙:
- session과 1:1에 가까운 구조로 시작하되, 별도 테이블로 분리하여 유연성을 확보한다.

## 10.4 quiz_jobs
AI quiz 생성 작업 상태.

핵심 필드:
- `id`
- `user_id`
- `source_type` (`session_batch`)
- `source_ref`
- `status` (`queued`, `processing`, `succeeded`, `failed`)
- `error_code`
- `error_message`
- `attempt_count`
- `created_at`
- `started_at`
- `finished_at`

## 10.5 quizzes
생성된 quiz 세트.

핵심 필드:
- `id`
- `job_id`
- `user_id`
- `title`
- `question_count`
- `questions_json`
- `created_at`

원칙:
- MVP에서는 question을 별도 정규화 테이블로 분리하지 않고 `questions_json`으로 저장해도 충분하다.
- 채점/분석이 고도화되면 question / attempt_answer 정규화로 확장한다.

## 10.6 quiz_attempts
사용자의 quiz 제출 결과.

핵심 필드:
- `id`
- `quiz_id`
- `user_id`
- `answers_json`
- `score`
- `feedback_json`
- `created_at`

## 10.7 blog_posts
아카이브 내부 블로그 글.

핵심 필드:
- `id`
- `user_id`
- `title`
- `body`
- `excerpt`
- `cover_image_path` (optional)
- `visibility`
- `published_at`
- `created_at`
- `updated_at`
- `deleted_at` nullable

원칙:
- MVP에서는 Markdown 또는 plain rich text JSON 중 하나로 통일해야 한다.
- **초기 권장안: Markdown 문자열로 저장**
- 이유: 에이전트 협업과 백업/이관/검색이 단순하다.

## 10.8 highlights
세션 기반 하이라이트 카드/묶음.

핵심 필드:
- `id`
- `user_id`
- `session_id`
- `title`
- `subtitle`
- `template_type`
- `cover_payload_json`
- `visibility`
- `created_at`

원칙:
- highlight는 session의 shadow copy가 아니라, 공유/보관용 파생 리소스다.
- 템플릿 렌더링에 필요한 요약 데이터를 snapshot처럼 보관한다.

## 10.9 feed_posts (폐기 예정)
소셜 포스트 방식의 feed_posts 테이블/서비스는 **Feed 탭 재설계로 폐기 예정**이다.

원칙:
- Feed 탭은 Text Wave (Trend Radar)로 대체되었다. 데이터 원천은 `highlights`다.
- `feed_posts`, `feed_post_comments` 테이블과 `feed_post_service.py`는 Text Wave 전환 완료 후 제거한다.
- 현재 코드는 유지하되 신규 기능 개발 대상에서 제외한다.

## 10.10 follow 관계 (MVP 제외)
팔로우 기능은 이번 MVP 범위에서 제외한다.

원칙:
- follow 기반 personalization은 v1.1 이후 확장으로 둔다.

---

## 11. 공개 정책 / 데이터 노출 규칙

## 11.1 기본 공개
- 새 세션 하이라이트: `public`
- 새 블로그 글: `public`
- 프로필/아카이브 기본 노출: 공개

## 11.2 비공개 전환 가능
- 작성자는 개별 세션 하이라이트 / 블로그 글을 private로 전환 가능
- private 콘텐츠는 작성자 본인 API에서만 조회 가능

## 11.3 피드 규칙 (Text Wave 기준)
Feed 탭은 **Text Wave** 방식으로 동작하며, 데이터 원천은 `highlights` 테이블이다.

- 조건: `visibility = 'public'` AND `created_at >= NOW() - INTERVAL '24 HOURS'` AND `deleted_at IS NULL`
- 정렬: 랜덤 (`ORDER BY RANDOM()`)
- 응답 형태: `WaveFeedResponse { waveItems: [...] }` — 커서 페이지네이션 없음
- 기존 "공개 블로그 글 + 공개 하이라이트 최신순 피드" 컨셉은 Feed 탭에서 제거됨

## 11.4 아카이브 응답 규칙
아카이브 탭은 실제로 두 데이터를 합쳐서 보여준다.
- blog posts list
- highlights list

프론트는 탭 내부에서 섹션/필터를 다르게 보여줄 수 있지만,
백엔드는 아카이브 집계 응답을 따로 제공해도 된다.

---

## 12. AI / Quiz 처리 구조

NichE에서 AI는 핵심 기능이지만, API request-response에 모든 생성을 묶으면 UX와 안정성이 나빠질 수 있다.
따라서 **quiz 생성은 job 기반 비동기 처리**로 설계한다.

## 12.1 기본 흐름
1. 사용자가 세션 몇 개를 완료한다.
2. 앱이 `POST /v1/quizzes/jobs` 호출
3. 서버가 입력 세션 범위를 검증하고 `quiz_jobs` row 생성
4. worker가 queued job을 집어간다.
5. worker가 session notes를 모아 prompt input 구성
6. AI provider 호출
7. 결과를 `quizzes`에 저장하고 job 상태를 `succeeded`로 변경
8. 앱은 polling으로 job 상태 확인
9. 완료 시 quiz 상세를 조회한다.

## 12.2 왜 job으로 처리하는가
- AI 응답 시간이 불안정할 수 있다.
- provider 장애/재시도/timeout 관리가 필요하다.
- 앱에서 로딩 상태를 명확히 처리하기 쉽다.
- 서버 재시작 시에도 job 상태가 DB에 남아 복구가 가능하다.

## 12.3 worker 설계 원칙
- 별도 코드베이스가 아니라 같은 repo 안의 별도 프로세스다.
- queue 브로커는 두지 않는다.
- `quiz_jobs` 테이블을 poll 하며, row lock 기반으로 처리한다.
- 재시도 횟수 제한을 둔다.
- 한 job은 idempotent하게 처리한다.

## 12.4 row lock 전략
- worker는 `queued` 상태 row를 `FOR UPDATE SKIP LOCKED`로 가져온다.
- `processing` 상태로 변경 후 처리한다.
- 성공 시 `succeeded`, 실패 시 `failed` 또는 재시도용 `queued`로 전이한다.

## 12.5 AI provider adapter 원칙
- provider SDK를 service에 직접 박지 않는다.
- `ai/base.py`에 provider interface를 두고 adapter를 구현한다.
- 입력/출력 DTO를 명확히 정의한다.
- provider 교체 시 service 코드 수정 범위를 최소화한다.

## 12.6 MVP 범위의 AI 역할
- session note 묶음을 기반으로 subjective quiz 생성
- 결과 저장
- 간단한 feedback 반환

MVP에서 제외:
- 실시간 스트리밍 생성
- 장문 essay grading 고도화
- 대화형 튜터 모드
- 고급 개인화 prompt memory

---

## 13. 공유 템플릿 지원 방식

공유용 템플릿 이미지는 **프론트 앱에서 렌더링 및 캡처**한다.
백엔드는 템플릿 렌더링 서버가 아니다.

### 백엔드가 담당하는 것
- 공유 카드에 들어갈 데이터 payload 제공
- highlight snapshot 저장
- 템플릿 타입 유효성 검증

### 프론트가 담당하는 것
- 실제 카드 UI 렌더링
- 이미지 캡처
- OS share sheet 호출

### 이유
- 앱에서 보는 카드와 공유 결과물의 일관성을 유지하기 쉽다.
- 서버 사이드 이미지 렌더링 인프라를 피할 수 있다.
- 1인 개발자 기준 운영 복잡도가 크게 줄어든다.

---

## 14. API 설계 (MVP)

아래는 MVP에 필요한 핵심 엔드포인트 목록이다.
세부 request/response DTO는 추후 `backend_api_contract.md`에서 더 자세히 정의할 수 있다.

## 14.1 Health / Infra
- `GET /health`
- `GET /ready`

## 14.2 Profile
- `GET /v1/me`
- `PATCH /v1/me`
- `GET /v1/users/{userId}`

## 14.3 Sessions
- `POST /v1/sessions`
- `GET /v1/sessions/{sessionId}`
- `POST /v1/sessions/{sessionId}/complete`
- `POST /v1/sessions/{sessionId}/cancel`
- `GET /v1/me/sessions`

### 규칙
- 세션 시작 시 `active` row 생성
- complete 호출 시 ended_at / duration 확정
- 취소된 세션은 점수와 랭크 집계에서 제외

## 14.4 Session Notes
- `PUT /v1/sessions/{sessionId}/note`
- `GET /v1/sessions/{sessionId}/note`

### 규칙
- session owner만 작성 가능
- note 저장 이후 quiz generation source로 사용 가능

## 14.5 Highlights
- `POST /v1/highlights`
- `GET /v1/highlights/{highlightId}`
- `PATCH /v1/highlights/{highlightId}`
- `GET /v1/me/highlights`
- `GET /v1/users/{userId}/highlights`

### 규칙
- public만 타 사용자 조회 가능
- highlight는 session 완료 후에만 생성 가능

## 14.6 Blog Posts
- `POST /v1/blog-posts`
- `GET /v1/blog-posts/{postId}`
- `PATCH /v1/blog-posts/{postId}`
- `DELETE /v1/blog-posts/{postId}`
- `GET /v1/me/blog-posts`
- `GET /v1/users/{userId}/blog-posts`

### 규칙
- soft delete 사용
- list 응답은 excerpt 중심으로 얇게 유지

## 14.7 Archive
- `GET /v1/me/archive`
- `GET /v1/users/{userId}/archive`

### 응답 역할
- highlights list
- blog posts list
- profile summary
- optional counters

즉, 아카이브 페이지에서 필요한 조합 응답을 한 번에 제공할 수 있다.

## 14.8 Feed
- `GET /v1/feed`

### MVP 피드 규칙
초기 피드는 아래 조합으로 충분하다.
- 최신 public highlights
- 최신 public blog posts
- 정렬은 최신순을 기본으로 하되, 이후 engagement/popularity 가중치 확장을 고려한다

복잡한 추천 모델은 나중 문제다.

## 14.9 Quizzes
- `POST /v1/quizzes/jobs`
- `GET /v1/quizzes/jobs/{jobId}`
- `GET /v1/quizzes/{quizId}`
- `POST /v1/quizzes/{quizId}/attempts`
- `GET /v1/me/quizzes`

### 규칙
- quiz는 생성자 본인만 조회 가능하게 시작해도 된다.
- score 계산은 서버가 수행한다.
- attempt 제출 시 profile rank 집계를 업데이트할 수 있다.

## 14.10 Uploads
- `POST /v1/uploads/presign`

### 용도
- blog cover image
- avatar image

원칙:
- 업로드 바이너리를 FastAPI가 직접 중계하지 않는다.
- presigned URL 또는 signed upload path를 사용한다.

---

## 15. 랭크 / 칭호 계산 원칙

NichE의 칭호는 감성적 브랜딩 단어 체계로 간다.
예: Surface, Trace, Focus, Depth, Frame, Tone, Shape, Archive, Signature, Canon.

백엔드의 역할은 UI 카피를 만드는 것이 아니라,
**사용자의 활동을 기반으로 rank_level과 rank_title을 계산/보관하는 것**이다.

## 15.1 초기 집계 기준
- 누적 완료 세션 수
- 누적 세션 시간
- quiz score 누적
- recent streak

## 15.2 MVP 권장안
초기에는 아래 정도로 단순화한다.
- rank_level: 정수 1~10
- rank_title: 매핑 문자열
- 계산 주기: session completion / quiz attempt 완료 시 재계산

복잡한 Bayesian score, decay, 카테고리별 rank는 미룬다.

---

## 16. 예외 처리 / 에러 스키마

## 16.1 공통 에러 응답

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found.",
    "requestId": "..."
  }
}
```

## 16.2 원칙
- `code`는 프론트 분기용 stable key다.
- `message`는 사용자 노출 또는 로그 참고용이다.
- `requestId`는 추적용이다.

## 16.3 최소 에러 코드 묶음
- AUTH_INVALID_TOKEN
- AUTH_FORBIDDEN
- PROFILE_NOT_FOUND
- SESSION_NOT_FOUND
- SESSION_INVALID_STATE
- SESSION_NOTE_NOT_FOUND
- BLOG_POST_NOT_FOUND
- HIGHLIGHT_NOT_FOUND
- QUIZ_JOB_NOT_FOUND
- QUIZ_NOT_FOUND
- QUIZ_JOB_ALREADY_RUNNING
- VALIDATION_ERROR
- INTERNAL_ERROR

---

## 17. 로깅 / 관찰성

## 17.1 request_id
- 모든 요청에 request_id를 부여한다.
- 응답 헤더에도 포함한다.
- 로그에 항상 request_id가 찍혀야 한다.

## 17.2 access log
최소 로그 항목:
- request_id
- method
- path
- status_code
- duration_ms
- user_id(optional)

## 17.3 job log
quiz worker는 다음을 로그로 남긴다.
- job_id
- source_ref
- provider
- attempt_count
- latency_ms
- result_status

## 17.4 health/readiness
- `/health`: 프로세스 생존 확인
- `/ready`: DB 접속, 핵심 의존성 readiness 확인

---

## 18. 설정 / 환경 변수

`pydantic-settings` 기반 Settings 클래스로 관리한다.

### 예시
- `APP_ENV`
- `APP_DEBUG`
- `APP_HOST`
- `APP_PORT`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_TIMEOUT_SECONDS`
- `LOG_LEVEL`

### 원칙
- 코드 안에 비밀값 하드코딩 금지
- `.env.example` 제공
- 테스트용 env와 로컬 env 분리

---

## 19. 테스트 전략

## 19.1 우선순위
1. service unit test
2. API integration test
3. worker job processing test
4. auth dependency test

## 19.2 반드시 테스트할 것
- 세션 시작/완료 상태 전이
- 세션 note 저장
- public/private visibility enforcement
- archive 응답 조합
- quiz job 생성 -> worker 성공 저장 흐름
- 본인 외 수정 차단

## 19.3 MVP에서는 과도한 테스트를 하지 않는다
- 모든 endpoint full matrix 테스트는 불필요
- 핵심 도메인 흐름 위주로 커버한다

---

## 20. 구현 순서 (권장)

### Phase 1 — 뼈대
- FastAPI app 생성
- settings / logging / db session / auth dependency
- health endpoint
- profile sync 기본 구조

### Phase 2 — 세션
- sessions CRUD/state transition
- session notes
- me endpoints

### Phase 3 — 아카이브
- blog posts
- highlights
- archive aggregate endpoint

### Phase 4 — 피드
- public list endpoint

### Phase 5 — AI
- quiz_jobs
- worker process
- quiz/attempt endpoint
- rank update

### Phase 6 — polish
- error codes 정리
- observability 개선
- idempotency / retry / timeout 조정

---

## 21. 코딩 규칙

### 21.1 naming
- Python 내부: snake_case
- JSON field: camelCase
- enum: lowercase string literal 우선

### 21.2 transaction
- service 단위로 transaction 경계 관리
- repository 안에서 무단 commit 금지

### 21.3 query 규칙
- N+1 방지
- list endpoint는 필요한 컬럼만 선택
- 큰 body/text는 detail endpoint에서만 fully 반환

### 21.4 time 규칙
- 서버 내부는 UTC 저장
- 클라이언트 표시 시 현지 시간 변환

### 21.5 soft delete
- blog posts는 soft delete 사용
- session/highlight는 초기에 hard delete를 피하고 status or deleted_at 필드 고려

---

## 22. MVP에서 하지 않을 것

아래는 아이디어상 의미가 있어도 첫 구현에서는 넣지 않는다.

- 복잡한 추천 알고리즘
- category별 별도 랭크
- 멀티 이미지 블로그 editor
- collaborative writing
- 알림 시스템
- 검색 엔진 분리
- full-text search 최적화
- comment system
- likes/reactions 대량 설계
- admin CMS 대형 구축

---

## 23. 현재 결정 사항 요약

### 확정
- FastAPI 단일 모놀리스
- Supabase Auth + Postgres + Storage
- SQLAlchemy 2 async + asyncpg + Alembic
- 기본 공개 정책
- Quiz 생성은 DB-backed worker job
- 앱은 FastAPI를 주 API로 사용
- 공유 템플릿은 앱 렌더링
- 아카이브는 blog posts + highlights 결합 구조

### 의식적으로 미룬 것
- 추천 알고리즘 고도화
- 복잡한 공개 범위
- 대형 메시징/큐 인프라
- 마이크로서비스 분리

---

## 24. 다음 파생 문서 권장 순서

1. `database_supabase.md`
   - 실제 table / index / constraint / RLS / storage bucket 설계

2. `backend_api_contract.md`
   - endpoint별 request/response DTO 명세

3. `backend_ai_quiz.md`
   - quiz generation prompt contract, worker retry, scoring policy

4. `backend_deployment_ops.md`
   - local/dev/prod 환경 분리, deploy, secrets, logging, health check

---

## 25. 최종 요약

NichE 백엔드는 **화려한 분산 구조가 아니라, 1인 개발자가 빠르게 구현하고 오래 유지할 수 있는 단일 도메인 서버**로 설계해야 한다.

즉,
- 앱 경험은 Expo 프론트가 만들고,
- 도메인 규칙은 FastAPI가 소유하고,
- 인프라는 Supabase가 맡고,
- AI 생성은 worker가 분리 처리하는 구조가
현재 NichE의 MVP에 가장 적합하다.

이 문서는 그 구조를 실제 구현 가능한 수준으로 고정한 기준 문서다.
