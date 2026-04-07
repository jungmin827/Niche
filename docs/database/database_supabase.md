# NichE Database / Supabase Spec v2

## 문서 목적
이 문서는 **NichE의 데이터베이스 및 Supabase 구성 기준 문서**이다. "Proof Engine" 개편 방향성에 맞춰 전면 수정되었다.

---

## 1. 한 줄 요약
> **NichE는 Supabase를 Auth + Postgres + Storage 인프라로 사용하고, Interest, Log, Session 도메인 스키마를 Postgres에 명시적으로 설계한다.**

---

## 2. 설계 원칙
- **Proof Engine 중심**: `Interest`와 `Log`가 서비스 데이터를 주도한다.
- **Session 기능 보존**: 기존의 타이머 기반 몰입 기록 기능인 `Session`엔티티와 AI 챗봇 연결고리(`Zitter`/`Quiz` 등)는 독립적으로 온전히 보존한다.
- **BlogPost / Highlight / Archive / Feed 폐기**: 기존의 복잡했던 범용 저장 모델들은 완전히 삭제한다.

---

## 3. 확정 enum
- `visibility_enum`: `public` | `private`
- `session_status_enum`: `active` | `completed` | `cancelled`
- `log_tag_enum`: `tasting_note` | `reading` | `visit` | `observation` | `other`

---

## 4. 핵심 테이블 상세

### 4.1 profiles
사용자의 프로필 정보.
- `id uuid pk`
- `auth_user_id uuid not null unique`
- `handle text not null unique`
- `display_name text not null`
- `bio text null`
- `avatar_path text null`
- `created_at timestamptz not null default now()`

### 4.2 interests (신규)
사용자의 주요 관심사 항목. (예: "자연 와인")
- `id uuid pk`
- `profile_id uuid not null`
- `name text not null`
- `started_at date not null` -- 과거 날짜 허용 (깊이를 증명하기 위함)
- `is_public boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 4.3 logs (신규)
각 관심사에 대한 단일 액션/기록.
- `id uuid pk`
- `interest_id uuid not null references interests(id)`
- `text text not null` -- min 1, max 2000
- `tag log_tag_enum not null`
- `logged_at timestamptz not null default now()`
- `is_public boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz null`

### 4.4 sessions (보존)
타이머 기반 몰입 세션 추적.
- `id uuid pk`
- `profile_id uuid not null`
- `topic text null`
- `planned_minutes integer not null default 15`
- `actual_minutes integer null`
- `started_at timestamptz not null`
- `ended_at timestamptz null`
- `status session_status_enum not null`
- `created_at timestamptz not null default now()`

### 4.5 session_notes (보존)
세션 종료 후 남기는 기록 (Log와 별개로 세션 스펙 유지를 위해 잔존)
- `id uuid pk`
- `session_id uuid not null`
- `profile_id uuid not null`
- `summary text not null`
- `created_at timestamptz not null default now()`

### 4.6 Zitter / AI Quiz 관련 (보존)
기존에 존재하던 `quiz_jobs`, `quizzes`, `quiz_attempts` 구조는 Zitter 챗봇 기능 유지를 위해 보존한다. 구조는 기존 스펙과 동일.

---

## 5. 삭제 대상 테이블
- `blog_posts`
- `highlights`
- `session_bundles`
- `session_bundle_items`
- `profile_stats` (추후 Interest 기반의 Depth Score Aggregation API로 대체되므로 폐기)

---

## 6. Depth Score 관리
- Depth Score는 백엔드 `InterestService`에서 `(log10(days_since_start + 1) * log10(record_count + 2))` 공식을 통해 API 응답 시 실시간으로 계산한다.
- 테이블에 캐싱하지 않는다. 로그의 수가 과도하게 많지 않다는 가정 하에 계산 부하가 낮기 때문이다.

---

## 7. Storage 전략
- `avatars` 버킷: 프로필 이미지
- (삭제) `content` 버킷 내 `blog`, `highlight` 디렉토리 폐기
- `Share Card` 생성은 MVP 시점에 프론트엔드(`react-native-view-shot`)에서 처리하므로 서버 스토리지에 필수적으로 저장할 필요가 없음.
