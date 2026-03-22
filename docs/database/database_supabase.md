# NichE Database / Supabase Spec v1

## 문서 목적
이 문서는 **NichE의 데이터베이스 및 Supabase 구성 기준 문서**이다.  
Codex, Cloud Code, 기타 코딩 에이전트가 이 문서만 읽고도 다음을 이해할 수 있도록 작성한다.

- Supabase를 어떤 역할로 사용할지
- 어떤 테이블과 관계로 MVP를 시작할지
- 어떤 enum / 제약 / 인덱스 / 공개 정책을 둘지
- RLS, Storage bucket, migration 전략을 어떻게 가져갈지
- 무엇을 지금 만들고 무엇을 나중으로 미룰지

이 문서는 다음 상위 문서를 전제로 한다.

- `niche_planning_v1.md`
- `frontend_app.md`
- `backend_fastapi.md`

이 문서의 목표는 “Supabase 프로젝트와 DB 마이그레이션을 바로 시작할 수 있는 수준의 결정”을 내려두는 것이다.

---

## 1. 한 줄 요약

> **NichE는 Supabase를 Auth + Postgres + Storage 인프라로 사용하고, 핵심 도메인 스키마는 Postgres에 명시적으로 설계하며, FastAPI가 그 위에서 제품 규칙을 집행한다.**

즉, Supabase는 편의성과 운영 단순화를 제공하지만,  
**도메인 모델 자체는 우리가 설계하고 Alembic migration으로 관리한다.**

---

## 2. 설계 원칙

### 2.1 최소 테이블, 명확한 책임
초기 MVP에서는 테이블을 너무 잘게 쪼개지 않는다.  
대신 **세션 / 블로그 / 하이라이트 / 퀴즈 / 프로필**이라는 핵심 축만 살아 있게 설계한다.

### 2.2 피드는 “별도 엔진”보다 “공개 콘텐츠 조합”
초기에는 복잡한 추천 피드나 materialized feed fan-out 구조를 만들지 않는다.  
피드는 **공개 블로그 글 + 공개 하이라이트**를 조합해서 읽어오는 방식으로 시작한다.

### 2.3 세션이 모든 것의 출발점
NichE의 핵심 데이터는 세션이다.  
블로그는 별도 사유 기록이고, 하이라이트는 세션의 공개 가능한 축적 결과물이며, 퀴즈는 세션/세션노트 기반으로 생성된다.

### 2.4 default public
MVP에서는 다음 콘텐츠가 기본 공개다.

- 블로그 글
- 세션 기반 하이라이트
- 아카이브 노출

사용자는 개별 콘텐츠를 비공개로 바꿀 수 있다.

### 2.5 스키마는 MVP에 맞게, 확장은 열어두기
댓글, 북마크, 복잡한 추천 점수, 멀티 공개 범위, 팀/클럽 기능은 지금 넣지 않는다.  
대신 향후 붙일 수 있도록 키 구조와 enum 구조는 무리 없이 확장 가능하게 잡는다.

---

## 3. Supabase 역할 분담

## 3.1 Supabase가 맡는 것
- Auth
- Postgres
- Storage
- 필요한 경우 pgvector 확장 여지
- 필요 시 Realtime 확장 여지

## 3.2 FastAPI가 맡는 것
- 도메인 API
- 모든 핵심 CRUD 규칙
- 공개/비공개 집행
- 하이라이트 생성 조건
- 랭크/칭호 계산
- 퀴즈 생성 job orchestration
- 피드 응답 조합

## 3.3 프론트가 직접 Supabase를 쓰는 범위
- Auth 로그인/세션 획득
- 제한적인 Storage 업로드 flow
- 그 외 도메인 데이터는 FastAPI 경유

---

## 4. 스키마 / 네이밍 기준

## 4.1 스키마 분리
초기 MVP에서는 아래처럼 관리한다.

- `public`: 앱 테이블
- `auth`: Supabase Auth system tables
- `storage`: Supabase Storage system tables

별도 `app` 스키마를 두는 선택지도 있지만, 초기에는 Supabase 기본 흐름과 에이전트 이해도를 위해 `public` 스키마를 사용한다.

## 4.2 테이블 네이밍
- 모두 **복수형 snake_case**
- 예: `profiles`, `sessions`, `blog_posts`

## 4.3 컬럼 네이밍
- snake_case
- FK는 `<entity>_id`
- timestamp는 `created_at`, `updated_at`
- soft delete는 `deleted_at`

## 4.4 PK 기준
- 모든 앱 테이블은 `uuid` PK 사용
- `gen_random_uuid()` 기본값 사용

## 4.5 시간 기준
- 모든 시간은 `timestamptz`
- 앱 API 응답은 UTC ISO string 기준

---

## 5. 확정 enum

초기 MVP에서는 enum을 최소화한다.

### 5.1 visibility_enum
```sql
public | private
```

### 5.2 session_status_enum
```sql
active | completed | cancelled
```

### 5.3 quiz_job_status_enum
```sql
queued | processing | completed | failed
```

### 5.4 quiz_type_enum
```sql
subjective_reflection | short_answer
```

### 5.5 content_type_enum
```sql
blog_post | highlight
```

### 5.6 highlight_source_type_enum
```sql
session | session_bundle
```

### 5.7 rank_code_enum
```sql
surface | trace | focus | depth | frame | tone | shape | archive | signature | canon
```

`rank_code_enum`은 현재 브랜딩 초안 기준이다.  
나중에 랭크 단어가 바뀌더라도 enum 변경보다는 별도 매핑 테이블/상수 레이어로 흡수하는 것을 권장한다.  
즉, DB에는 랭크 히스토리를 저장하지 말고 우선 계산 결과 스냅샷만 저장한다.

---

## 6. 핵심 관계 개요

NichE MVP의 핵심 관계는 아래와 같다.

- `auth.users` 1 --- 1 `profiles`
- `profiles` 1 --- N `sessions`
- `sessions` 1 --- 1 `session_notes` (MVP에서는 최대 1개)
- `sessions` 1 --- N `quiz_jobs`
- `quiz_jobs` 1 --- N `quizzes`
- `profiles` 1 --- N `blog_posts`
- `profiles` 1 --- N `highlights`
- `highlights` N --- 1 `sessions` 또는 `session_bundles`
- `profiles` 1 --- 1 `profile_stats` (캐시성 집계)

핵심은:
- 세션은 원천 행동 데이터
- 블로그는 별도 글 데이터
- 하이라이트는 세션 축적의 공개 표현
- 피드는 공개 블로그 + 공개 하이라이트 조합

---

## 7. 테이블 상세

## 7.1 profiles
사용자 공개 정체성과 앱 내부 프로필을 담당한다.

### 목적
- Auth user와 앱 프로필 매핑
- 공개 프로필 정보 저장
- 아카이브/피드에 노출되는 기본 사용자 정보 보관

### 컬럼
- `id uuid pk`
- `auth_user_id uuid not null unique`
- `handle text not null unique`
- `display_name text not null`
- `bio text null`
- `avatar_path text null`
- `is_public boolean not null default true`
- `current_rank_code text not null default 'surface'`
- `rank_score integer not null default 0`
- `onboarding_completed boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 제약 / 규칙
- `handle`은 소문자/숫자/언더스코어 조합을 권장
- `auth_user_id`는 `auth.users(id)`에 연결
- 초기 MVP에서는 `id == auth_user_id`로 맞춰도 되지만, 스키마상 별도 컬럼으로 두는 편이 이후 확장에 유리하다
- 단, 실제 구현 단순화를 위해 **초기 migration에서는 `id = auth_user_id` 구조**를 채택해도 무방하다

### 인덱스
- unique index on `auth_user_id`
- unique index on `handle`
- index on `(created_at desc)`

---

## 7.2 profile_stats
프로필 상단에 보여줄 캐시성 집계 데이터를 저장한다.

### 목적
- 세션 수
- 총 몰입 시간
- 블로그 수
- 하이라이트 수
- 연속 세션 일수(streak)

이 값들은 매번 heavy aggregation하지 않고 캐시성 테이블에 둔다.

### 컬럼
- `profile_id uuid pk`
- `total_sessions integer not null default 0`
- `total_focus_minutes integer not null default 0`
- `total_blog_posts integer not null default 0`
- `total_highlights integer not null default 0`
- `current_streak_days integer not null default 0`
- `updated_at timestamptz not null default now()`

### 규칙
- source of truth는 원본 테이블
- 이 테이블은 read 최적화를 위한 집계 캐시

---

## 7.3 sessions
사용자의 몰입 세션 자체를 나타내는 핵심 테이블이다.

### 목적
- 세션 시작/종료 기록
- 세션 상태 관리
- 하이라이트/퀴즈의 원천 데이터 제공

### 컬럼
- `id uuid pk`
- `profile_id uuid not null`
- `topic text null`
- `subject text null`
- `planned_minutes integer not null default 15`
- `actual_minutes integer null`
- `started_at timestamptz not null`
- `ended_at timestamptz null`
- `status session_status_enum not null`
- `visibility visibility_enum not null default 'public'`
- `is_highlight_eligible boolean not null default false`
- `source text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 컬럼 해설
- `topic`: 사용자가 세션 전에 잡은 간단한 주제
- `subject`: 책/작가/분야 등 보다 구조화된 표기, nullable
- `planned_minutes`: 기본값 15, 향후 30/45/60 확장 가능
- `actual_minutes`: 실제 종료 시 계산
- `is_highlight_eligible`: 충분히 완료된 세션인지 표시하는 flag

### 규칙
- `status = active`인 세션은 사용자당 동시에 1개만 허용
- `completed` 세션만 퀴즈 생성 대상이 됨
- `actual_minutes`는 `completed`일 때만 채워짐
- `visibility`는 세션 자체 공개 여부. 단, 피드에 직접 노출되지는 않고, 하이라이트 생성 시 참조됨

### 권장 제약
- check `planned_minutes > 0`
- check `actual_minutes is null or actual_minutes > 0`
- partial unique index for one active session per profile:
  - unique on `(profile_id)` where `status = 'active' and deleted_at is null`

### 인덱스
- index on `(profile_id, started_at desc)`
- index on `(status, created_at desc)`
- index on `(visibility, created_at desc)` for archive read

---

## 7.4 session_notes
세션 종료 후 남기는 간단한 기록이다.

### 목적
- 사용자가 무엇을 했는지 짧게 남김
- 퀴즈 생성의 핵심 입력
- 하이라이트 요약의 원천 데이터

### 컬럼
- `id uuid pk`
- `session_id uuid not null unique`
- `profile_id uuid not null`
- `summary text not null`
- `insight text null`
- `mood text null`
- `tags text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 규칙
- MVP에서는 세션당 노트 1개
- `summary`는 필수
- `insight`, `mood`는 선택
- `tags`는 search/filter용 가벼운 보조 수단

### 인덱스
- unique index on `session_id`
- index on `(profile_id, created_at desc)`
- gin index on `tags`

---

## 7.5 session_bundles
여러 세션을 하나의 하이라이트 묶음으로 표현하기 위한 선택적 테이블이다.

### 목적
- 예: “오늘 1시간 문학 딥다이브”처럼 15분 세션 4개를 묶어 하이라이트화
- 하이라이트가 단일 세션뿐 아니라 세션 묶음을 대표할 수 있도록 함

### MVP 판단
이 테이블은 **넣는 편을 권장**한다.  
이유는 기획상 사용자가 15분 세션 4개를 모아 1시간 탐구 경험을 축적하는 흐름이 핵심이기 때문이다.

### 컬럼
- `id uuid pk`
- `profile_id uuid not null`
- `title text not null`
- `description text null`
- `started_at timestamptz not null`
- `ended_at timestamptz not null`
- `total_minutes integer not null`
- `visibility visibility_enum not null default 'public'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 규칙
- 이 테이블은 실제 세션을 대체하지 않는다
- 묶음 표현용 read/write 모델이다

### 인덱스
- index on `(profile_id, created_at desc)`
- index on `(visibility, created_at desc)`

---

## 7.6 session_bundle_items
세션 번들과 세션의 연결 테이블이다.

### 컬럼
- `bundle_id uuid not null`
- `session_id uuid not null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

### PK
- composite pk `(bundle_id, session_id)`

### 인덱스
- index on `(session_id)`
- index on `(bundle_id, sort_order)`

---

## 7.7 quiz_jobs
AI 문제 생성 작업 단위다.

### 목적
- request/response를 분리
- worker가 재시도 가능
- 실패 상태를 DB에 남김

### 컬럼
- `id uuid pk`
- `profile_id uuid not null`
- `session_id uuid null`
- `bundle_id uuid null`
- `status quiz_job_status_enum not null default 'queued'`
- `prompt_version text not null`
- `input_payload jsonb not null`
- `result_payload jsonb null`
- `error_message text null`
- `attempt_count integer not null default 0`
- `queued_at timestamptz not null default now()`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `failed_at timestamptz null`
- `created_at timestamptz not null default now()`

### 규칙
- `session_id` 또는 `bundle_id` 중 하나는 필수
- 둘 다 채우는 것은 금지
- worker는 `queued -> processing -> completed|failed` 전이만 허용

### 제약
- check: exactly one of `session_id`, `bundle_id` is non-null

### 인덱스
- index on `(status, queued_at)`
- index on `(profile_id, created_at desc)`
- index on `(session_id)`
- index on `(bundle_id)`

---

## 7.8 quizzes
생성된 퀴즈/회고 질문 저장 테이블이다.

### 목적
- 실제 사용자에게 보여줄 문제 저장
- job과 분리하여 여러 문항 저장 가능

### 컬럼
- `id uuid pk`
- `job_id uuid not null`
- `profile_id uuid not null`
- `session_id uuid null`
- `bundle_id uuid null`
- `quiz_type quiz_type_enum not null`
- `question text not null`
- `reference_summary text null`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`

### 규칙
- 1 job : N quizzes
- question은 항상 저장
- `reference_summary`는 운영/debug 용으로 짧게 둠

### 인덱스
- index on `(job_id, sort_order)`
- index on `(profile_id, created_at desc)`

---

## 7.9 quiz_attempts
사용자의 답변과 점수화 결과 저장 테이블이다.

### 목적
- 주관식 응답 저장
- AI 또는 규칙 기반 평가 결과 저장
- 랭크 계산 입력 제공

### 컬럼
- `id uuid pk`
- `quiz_id uuid not null`
- `profile_id uuid not null`
- `answer_text text not null`
- `score integer null`
- `feedback text null`
- `graded_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### 규칙
- MVP에서는 quiz당 시도 1회만 허용하는 편이 단순하다
- 재응답 허용이 필요하면 `attempt_no` 추가

### 제약
- unique index on `(quiz_id, profile_id)`

### 인덱스
- index on `(profile_id, created_at desc)`

---

## 7.10 blog_posts
사용자의 블로그형 사유 기록이다.

### 목적
- 일상 관찰
- 생각/감정/사유 기록
- 아카이브 내부 글 피드 구성

### 컬럼
- `id uuid pk`
- `profile_id uuid not null`
- `title text not null`
- `slug text null`
- `excerpt text null`
- `body_md text not null`
- `cover_image_path text null`
- `visibility visibility_enum not null default 'public'`
- `published_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 규칙
- 초기는 markdown 원문 저장만으로 충분
- rich text AST 저장은 하지 않음
- `slug`는 public url이 강해질 때 사용. MVP에서는 nullable 허용
- draft 테이블은 별도 두지 않고 프론트 local draft로 해결

### 인덱스
- index on `(profile_id, published_at desc)`
- index on `(visibility, published_at desc)`
- unique partial index on `(profile_id, slug)` where slug is not null

### 검색 확장 여지
- Postgres full-text search 또는 pg_trgm 확장 가능
- 그러나 MVP에서는 제목/본문 검색을 후순위로 둔다

---

## 7.11 highlights
세션 또는 세션 묶음을 공개/전시 가능한 카드 형태로 저장한다.

### 목적
- 아카이브 하이라이트 노출
- 피드 노출 원천
- 공유 템플릿의 메타데이터 저장

### 컬럼
- `id uuid pk`
- `profile_id uuid not null`
- `source_type highlight_source_type_enum not null`
- `session_id uuid null`
- `bundle_id uuid null`
- `title text not null`
- `caption text null`
- `rendered_image_path text not null`
- `source_photo_path text null`
- `template_code text null`
- `visibility visibility_enum not null default 'public'`
- `published_at timestamptz not null default now()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 규칙
- source_type이 `session`이면 `session_id` 필수, `bundle_id` null
- source_type이 `session_bundle`이면 반대
- 하이라이트는 세션 종료 후 자동 생성하지 않는다
- 사용자가 **사진 + 템플릿을 조합한 최종 이미지 저장 시점에 생성 여부를 선택**할 수 있다
- 서버는 auto-draft 하이라이트를 만들지 않으며, 사용자가 저장을 선택했을 때만 `highlights` row를 생성한다
- `rendered_image_path`는 최종 저장된 하이라이트 이미지 경로이며 필수다
- `source_photo_path`는 사용자가 템플릿과 조합한 원본 사진 경로로, 없는 템플릿도 허용하므로 nullable이다

### 제약
- check source_type별 FK 일관성
- unique partial index on `(session_id)` where session_id is not null
- unique partial index on `(bundle_id)` where bundle_id is not null

### 인덱스
- index on `(profile_id, published_at desc)`
- index on `(visibility, published_at desc)`

---

## 7.12 follows (MVP 제외, v1.1 후보)
팔로우 관계는 **이번 MVP 스키마에는 포함하지 않는다.**

### 이유
- 니치의 MVP 핵심은 세션 / 하이라이트 / 블로그 / 피드 소비 경험이다
- 피드는 우선 공개 콘텐츠 탐색형으로도 충분하다
- 팔로우가 들어가면 API, UI, 집계(`profile_stats`)와 정책이 함께 늘어난다

### 후속 확장 시 컬럼 후보
- `follower_profile_id uuid not null`
- `followee_profile_id uuid not null`
- `created_at timestamptz not null default now()`

### 현재 결정
- 이번 MVP migration에는 **`follows` 테이블을 생성하지 않는다**
- `profile_stats`에도 follower/following count를 포함하지 않는다

---

## 7.13 content_likes (MVP 제외, v1.1 후보)
좋아요 반응은 초기에 없어도 된다.  
피드와 아카이브 경험이 먼저다.

단, 후속 확장을 고려해 아래 형태를 제안만 한다.

### 컬럼 후보
- `profile_id`
- `content_type`
- `content_id`
- `created_at`

### 현재 결정
- **이번 MVP 마이그레이션에는 포함하지 않는다.**

---

## 8. 피드 설계

## 8.1 feed_items 테이블을 두지 않는 이유
초기 MVP에서는 별도 `feed_items` 테이블을 두지 않는다.  
이유는 다음과 같다.

- 공개 블로그 글과 공개 하이라이트 수가 아직 많지 않다
- fan-out on write는 1인 개발 MVP에 과하다
- 피드 규칙이 자주 바뀔 가능성이 높다
- 우선은 read-time UNION 조합으로 충분하다

## 8.2 피드 소스
초기 피드는 아래 둘을 합쳐서 만든다.

- `blog_posts` where `visibility = 'public'`
- `highlights` where `visibility = 'public'`

## 8.3 정렬 기준
- `published_at desc` 기준 최신순
- 이후 필요하면 `rank_score`, `follow 관계`, `관심 태그`를 가중치로 추가할 수 있다

## 8.4 DTO 수준 표준
피드 API는 DB row를 그대로 내려주지 말고 아래 공통 형식으로 내려준다.

- `contentType`
- `contentId`
- `author`
- `title`
- `excerpt`
- `coverImageUrl`
- `publishedAt`
- `stats`

즉, feed는 DB 모델이 아니라 **응답 조합 모델**이다.

---

## 9. 랭크 / 점수 저장 전략

## 9.1 랭크는 이벤트 로그보다 프로필 스냅샷 우선
초기 MVP에서는 랭크 시스템을 과하게 세분화하지 않는다.

### 현재 저장 방식
- `profiles.current_rank_code`
- `profiles.rank_score`

### 입력 데이터
- 세션 누적 시간
- 완료 세션 수
- 퀴즈 점수
- 블로그/하이라이트 축적량

### 이유
- 제품적으로 랭크 체계가 아직 유동적이다
- event-sourcing 식 랭크 히스토리는 너무 이르다

## 9.2 향후 확장
나중에 필요하면 아래를 추가할 수 있다.

- `rank_events`
- `achievements`
- `badges`

하지만 MVP에는 넣지 않는다.

---

## 10. 공개/비공개와 RLS 전략

## 10.1 기본 원칙
NichE는 프론트가 직접 DB를 치지 않는 구조를 지향하지만,  
Supabase 특성상 **RLS를 켜고 최소 정책을 명시하는 것**을 기본 원칙으로 한다.

## 10.2 왜 RLS를 유지하는가
- Storage 정책과 일관성이 맞는다
- 잘못된 direct query가 생겨도 방어선이 하나 더 생긴다
- 미래에 일부 direct read를 열더라도 정책 기반으로 확장 가능하다

## 10.3 테이블별 기본 정책 방향
### profiles
- 공개 프로필 읽기: 허용
- 본인 프로필 수정: 허용
- 타인 프로필 수정: 금지

### sessions / session_notes / quiz_jobs / quizzes / quiz_attempts
- 본인만 읽기
- 본인만 생성/수정
- 타인 읽기 금지
- 예외: 하이라이트에 실린 세션 요약은 별도 DTO로 공개

### blog_posts
- public row는 누구나 읽기
- private row는 작성자만 읽기
- 작성자만 수정/삭제

### highlights
- public row는 누구나 읽기
- private row는 작성자만 읽기
- 작성자만 수정/삭제


## 10.4 soft delete 정책
- 대부분 사용자 콘텐츠는 `deleted_at` 기반 soft delete
- read query는 항상 `deleted_at is null` 포함
- unique 제약은 partial index로 처리

---

## 11. Storage 설계

## 11.1 버킷 구성
초기에는 아래 2개면 충분하다.

### `avatars`
- 프로필 이미지 전용
- 파일 크기 제한 엄격
- 1인 1개 갱신 중심

### `content`
- 블로그 커버 이미지
- 하이라이트 커버 이미지
- 공유 템플릿 업로드 이미지가 필요할 경우 포함

## 11.2 파일 경로 규칙
### avatars
```text
avatars/{profile_id}/avatar-{timestamp}.jpg
```

### content
```text
content/{profile_id}/blog/{blog_post_id}/{filename}
content/{profile_id}/highlight/{highlight_id}/rendered/{filename}
content/{profile_id}/highlight/{highlight_id}/source/{filename}
```

## 11.3 메타데이터 저장
실제 public URL을 DB에 저장하지 말고,  
**storage path만 DB에 저장**한다.

예:
- `profiles.avatar_path`
- `blog_posts.cover_image_path`
- `highlights.cover_image_path`

이유:
- 버킷 정책 변경에 유연
- signed/public URL 정책 변경에 유리
- CDN/transform 도입 시 대응 쉬움

---

## 12. 마이그레이션 전략

## 12.1 source of truth
스키마의 진실 원천은 다음 둘이다.

1. Alembic migration 파일
2. 필요한 경우 Supabase bootstrap SQL

대시보드에서 수동으로 테이블을 만들지 않는다.

## 12.2 권장 순서
1. enum 생성
2. core tables 생성
3. FK 생성
4. index / partial index 생성
5. trigger / updated_at helper 생성
6. RLS 활성화
7. policy 생성
8. storage bucket bootstrap

## 12.3 updated_at 처리
각 주요 테이블에는 `updated_at` 자동 갱신 트리거를 둔다.

대상:
- profiles
- sessions
- session_notes
- session_bundles
- quiz_attempts
- blog_posts
- highlights
- profile_stats

---

## 13. 권장 초기 DDL 구현 순서

초기 구현 순서는 아래가 가장 안전하다.

1. `profiles`
2. `profile_stats`
3. `sessions`
4. `session_notes`
5. `session_bundles`
6. `session_bundle_items`
7. `quiz_jobs`
8. `quizzes`
9. `quiz_attempts`
10. `blog_posts`
11. `highlights`

이 순서대로 만들면 FK 충돌 없이 진행하기 쉽다.

---

## 14. 성능 / 인덱스 전략

## 14.1 지금 필요한 인덱스만 둔다
MVP에서 과도한 인덱스는 쓰기 성능과 마이그레이션 복잡도만 높인다.

반드시 필요한 축은 다음뿐이다.

- 작성자별 최신순 조회
- 공개 콘텐츠 최신순 조회
- 상태별 job polling
- active session unique 보장
- handle unique 조회

## 14.2 전문 검색은 후순위
지금은 `ILIKE` 또는 단순 검색으로 시작할 수 있다.  
정교한 검색은 아래 시점에 추가한다.

- 블로그 글 수가 늘어날 때
- 피드 탐색이 실제 UX 병목이 될 때

후보:
- `pg_trgm`
- full text search
- pgvector 기반 의미 검색

---

## 15. 운영 / 보안 메모

## 15.1 DB 연결 역할
권장 방식은 FastAPI가 운영용 direct Postgres connection을 사용하되,
가능하면 **앱 전용 DB role**을 별도로 만들어 필요한 권한만 부여하는 것이다.

개발 초기에 `postgres` role을 임시 사용하더라도,
프로덕션에서는 전용 role 전환을 권장한다.

## 15.2 백업 / 복구
Supabase의 관리형 백업 정책을 기본으로 사용한다.  
별도 PITR/백업 옵션은 프로젝트 규모와 예산에 따라 추후 강화한다.

## 15.3 delete user
회원 탈퇴는 hard delete chain보다는 **soft delete + 비활성화**를 우선 고려한다.  
특히 Storage 객체와 연계될 수 있어, 무작정 cascade delete는 피한다.

---

## 16. MVP에서 의도적으로 제외하는 것

초기 DB에는 아래를 넣지 않는다.

- comments
- likes
- bookmarks
- notifications
- achievements / badges
- content reports / moderation tables
- vector embeddings tables
- search analytics
- feature flags tables
- feed materialization tables
- draft tables for blog posts

이것들은 필요해지는 시점이 오면 추가 migration으로 붙인다.

---

## 17. 권장 MVP 스키마 최종안

### 반드시 구현
- `profiles`
- `profile_stats`
- `sessions`
- `session_notes`
- `session_bundles`
- `session_bundle_items`
- `quiz_jobs`
- `quizzes`
- `quiz_attempts`
- `blog_posts`
- `highlights`
- `follows`

### 지금은 제외
- `content_likes`
- `comments`
- `notifications`
- `embeddings`

---

## 18. 코딩 에이전트 구현 지침

1. 테이블 생성은 반드시 migration으로 한다.
2. 모든 콘텐츠 테이블에 `created_at`, `updated_at`, `deleted_at` 규칙을 일관되게 둔다.
3. soft delete row는 모든 read query에서 제외한다.
4. `visibility`와 `published_at`는 피드/아카이브 쿼리의 핵심 축이므로 DTO 설계와 함께 맞춘다.
5. `session_bundles`는 “15분 세션 묶음” 기획을 반영하기 위한 핵심 구조다. 생략하지 않는 편이 좋다.
6. 하이라이트는 세션 자동 생성이 아니라 사용자 발행 의도 기반 생성으로 구현한다.
7. 피드는 DB 테이블이 아니라 query composition으로 시작한다.
8. rank 계산은 `profiles.rank_score`, `profiles.current_rank_code` 갱신으로 충분하다.
9. storage path만 DB에 저장하고 URL은 응답 시 해석한다.
10. 향후 검색/추천 고도화 전까지는 인덱스를 최소화한다.

---

## 19. 현재 남아 있는 결정 사항

이번 문서 기준으로 구현은 시작 가능하지만, 아래 2개는 제품적으로 영향이 큰 편이다.

### A. 하이라이트 생성 방식
현재 권장안:
- 세션 완료 후 자동 생성하지 않음
- 사용자가 “하이라이트에 저장”할 때 생성

이 방식을 추천하는 이유:
- 아카이브 품질 유지
- 불필요한 데이터 폭증 방지
- 사용자의 전시 의도를 반영 가능

### B. 팔로우를 MVP에 포함할지
현재 권장안:
- `follows` 테이블은 이번에 포함
- UI 노출은 단순하게 시작 가능

이유:
- 이후 피드 방향 전환이 쉬움
- 구조가 단순하고 비용이 낮음

---

## 20. 다음 문서 우선순위

이 문서 다음으로는 아래 순서가 좋다.

1. `backend_api_contract.md`
2. `ai_quiz_generation.md`
3. `design_system_templates.md`

특히 `backend_api_contract.md`에서는 이 문서의 테이블과 enum을 기준으로 실제 request/response DTO를 고정해야 한다.
