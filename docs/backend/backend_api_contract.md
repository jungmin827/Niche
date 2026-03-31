# NichE Backend API Contract v1

## 문서 목적
이 문서는 **NichE FastAPI 백엔드의 API 계약 문서**이다.  
Codex, Cloud Code, 기타 코딩 에이전트가 이 문서만 읽고도 다음을 이해할 수 있도록 작성한다.

- 어떤 엔드포인트를 구현해야 하는지
- 요청/응답 DTO를 어떻게 맞춰야 하는지
- 어떤 권한 규칙과 상태 전이를 따라야 하는지
- 프론트가 어떤 순서로 API를 호출해야 하는지
- MVP에서 구현하지 않는 범위가 무엇인지

상위 기준 문서:
- `niche_planning_v1.md`
- `frontend_app.md`
- `backend_fastapi.md`
- `database_supabase.md`

이 문서는 **JSON-only API**를 전제로 하며, 앱 프론트는 인증 외 대부분의 도메인 데이터를 FastAPI를 통해서만 다룬다.

---

## 1. 공통 규칙

## 1.1 Base URL / Version
- Base path: `/v1`
- 모든 앱 API는 `/v1` prefix를 사용한다

예:
- `/v1/me`
- `/v1/sessions`
- `/v1/feed`

## 1.2 Auth
- 앱은 Supabase Auth access token을 `Authorization: Bearer <token>` 헤더로 전달한다
- 인증이 필요한 엔드포인트는 모두 bearer token 필수다
- MVP에서는 앱 자체가 로그인 전용 서비스로 시작하므로, 대부분 엔드포인트는 인증 필요로 둔다

## 1.3 Content-Type
- 요청/응답은 기본적으로 `application/json`
- 업로드 바이너리는 presign/signed upload path를 통해 처리하고, FastAPI가 직접 대용량 파일을 중계하지 않는다

## 1.4 시간 포맷
- 모든 시간은 ISO 8601 UTC string
- 예: `2026-03-11T10:30:00Z`

## 1.5 네이밍 규칙
- 요청/응답 DTO는 **camelCase JSON**
- DB/ORM 컬럼은 snake_case
- FastAPI DTO 레이어에서 alias 처리

예:
- DB: `created_at`
- API: `createdAt`

## 1.6 페이지네이션 규칙
목록 API는 cursor pagination을 사용한다.

```json
{
  "items": [],
  "nextCursor": "opaque-string-or-null",
  "hasNext": true
}
```

### cursor 설계 원칙
- MVP에서는 `publishedAt` + `id` 또는 `createdAt` + `id` 기반 opaque cursor 권장
- 프론트는 cursor를 해석하지 않는다

## 1.7 공통 에러 응답

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found.",
    "details": null
  }
}
```

### 필드
- `code`: 안정적인 앱 분기용 문자열
- `message`: 사용자/로그용 기본 메시지
- `details`: 선택적 추가 정보

## 1.8 공통 에러 코드 계열
- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

도메인별 세부 코드는 각 섹션에 추가 정의한다.

---

## 2. 공통 DTO 조각

## 2.1 ProfileSummary

```json
{
  "id": "uuid",
  "handle": "niche_reader",
  "displayName": "NichE User",
  "bio": "...",
  "avatarUrl": "https://... or null",
  "currentRankCode": "surface",
  "rankScore": 120,
  "isPublic": true
}
```

## 2.2 PageResponse<T>

```json
{
  "items": ["T"],
  "nextCursor": null,
  "hasNext": false
}
```

## 2.3 Visibility
- `public`
- `private`

## 2.4 SessionStatus
- `active`
- `completed`
- `cancelled`

## 2.5 HighlightSourceType
- `session`
- `sessionBundle`

## 2.6 FeedContentType
- `blogPost`
- `highlight`

---

## 3. 헬스체크 / 인프라

## 3.1 GET `/health`

### 목적
- liveness check

### 응답 200

```json
{
  "status": "ok"
}
```

## 3.2 GET `/ready`

### 목적
- readiness check
- DB 연결 가능 여부, 핵심 설정 로드 여부 점검

### 응답 200

```json
{
  "status": "ready"
}
```

### 응답 503

```json
{
  "status": "not_ready"
}
```

---

## 4. Profile / Me

## 4.1 GET `/v1/me`

### 목적
- 현재 로그인한 사용자 프로필 및 기본 집계 로드
- 앱 부팅 시 홈 진입 전에 필요한 최소 사용자 정보 제공

### 응답 200

```json
{
  "profile": {
    "id": "uuid",
    "handle": "niche_reader",
    "displayName": "NichE User",
    "bio": "...",
    "avatarUrl": null,
    "currentRankCode": "surface",
    "rankScore": 0,
    "isPublic": true,
    "onboardingCompleted": false
  },
  "stats": {
    "totalSessions": 0,
    "totalFocusMinutes": 0,
    "totalBlogPosts": 0,
    "totalHighlights": 0,
    "currentStreakDays": 0
  }
}
```

## 4.2 PATCH `/v1/me`

### 목적
- 내 프로필 수정

### 요청

```json
{
  "displayName": "NichE User",
  "bio": "책과 고양이를 오래 바라봅니다.",
  "avatarPath": "avatars/uuid/avatar-123.jpg",
  "isPublic": true
}
```

### 규칙
- `handle` 변경은 MVP에서 제외하거나 별도 엔드포인트로 분리하는 것을 권장
- 비어 있는 필드는 변경하지 않는다

### 응답 200

```json
{
  "profile": {
    "id": "uuid",
    "handle": "niche_reader",
    "displayName": "NichE User",
    "bio": "책과 고양이를 오래 바라봅니다.",
    "avatarUrl": "https://...",
    "currentRankCode": "surface",
    "rankScore": 0,
    "isPublic": true
  }
}
```

## 4.3 GET `/v1/users/{profileId}`

### 목적
- 타 사용자 공개 프로필 조회

### 규칙
- `profiles.isPublic = true`인 경우에만 조회 가능
- 비공개 프로필은 404 또는 403 중 하나로 일관되게 처리. MVP 권장안은 404

### 응답 200

```json
{
  "profile": {
    "id": "uuid",
    "handle": "niche_reader",
    "displayName": "NichE User",
    "bio": "...",
    "avatarUrl": null,
    "currentRankCode": "focus",
    "rankScore": 320,
    "isPublic": true
  },
  "stats": {
    "totalSessions": 36,
    "totalFocusMinutes": 540,
    "totalBlogPosts": 12,
    "totalHighlights": 8,
    "currentStreakDays": 4
  }
}
```

---

## 5. Sessions

## 5.1 POST `/v1/sessions`

### 목적
- 새 딥다이브 세션 시작

### 요청

```json
{
  "topic": "무라카미 하루키의 문장 리듬",
  "subject": "일본문학",
  "plannedMinutes": 15,
  "source": "book"
}
```

### 규칙
- 사용자당 동시에 `active` 세션은 하나만 허용
- `plannedMinutes` 기본값은 15
- 허용 값은 MVP에서 `15 | 30 | 45 | 60` 정도로 제한해도 됨

### 응답 201

```json
{
  "session": {
    "id": "uuid",
    "topic": "무라카미 하루키의 문장 리듬",
    "subject": "일본문학",
    "plannedMinutes": 15,
    "actualMinutes": null,
    "status": "active",
    "startedAt": "2026-03-11T10:00:00Z",
    "endedAt": null,
    "visibility": "public",
    "createdAt": "2026-03-11T10:00:00Z"
  }
}
```

### 에러
- `ACTIVE_SESSION_ALREADY_EXISTS` → 409

## 5.2 GET `/v1/sessions/{sessionId}`

### 목적
- 내 세션 상세 조회

### 규칙
- 세션 원칙상 본인만 조회
- 타인 세션 원본은 직접 공개하지 않음

### 응답 200

```json
{
  "session": {
    "id": "uuid",
    "topic": "무라카미 하루키의 문장 리듬",
    "subject": "일본문학",
    "plannedMinutes": 15,
    "actualMinutes": 15,
    "status": "completed",
    "startedAt": "2026-03-11T10:00:00Z",
    "endedAt": "2026-03-11T10:15:10Z",
    "visibility": "public",
    "createdAt": "2026-03-11T10:00:00Z",
    "updatedAt": "2026-03-11T10:15:10Z"
  },
  "note": {
    "summary": "문장의 속도감과 반복 패턴을 중심으로 읽었다.",
    "insight": "담백한데 리듬이 분명했다.",
    "mood": "calm",
    "tags": ["문체", "리듬"]
  }
}
```

## 5.3 POST `/v1/sessions/{sessionId}/complete`

### 목적
- active 세션 종료
- 실제 완료 시간 확정

### 요청

```json
{
  "endedAt": "2026-03-11T10:15:10Z"
}
```

### 규칙
- 본인 세션만 완료 가능
- `status = active`일 때만 가능
- `actualMinutes`는 서버가 계산
- 완료와 동시에 랭크/집계 원천 데이터에 반영 가능

### 응답 200

```json
{
  "session": {
    "id": "uuid",
    "status": "completed",
    "plannedMinutes": 15,
    "actualMinutes": 15,
    "startedAt": "2026-03-11T10:00:00Z",
    "endedAt": "2026-03-11T10:15:10Z",
    "visibility": "public"
  }
}
```

### 에러
- `SESSION_ALREADY_FINISHED` → 409
- `SESSION_NOT_ACTIVE` → 409

## 5.4 POST `/v1/sessions/{sessionId}/cancel`

### 목적
- active 세션 취소

### 요청
- body 없음 또는 빈 JSON 허용

### 응답 200

```json
{
  "session": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

## 5.5 GET `/v1/me/sessions`

### 목적
- 내 세션 목록 조회

### 쿼리 파라미터
- `status` optional: `active|completed|cancelled`
- `cursor` optional
- `limit` optional, default 20, max 50

### 응답 200

```json
{
  "items": [
    {
      "id": "uuid",
      "topic": "무라카미 하루키의 문장 리듬",
      "subject": "일본문학",
      "plannedMinutes": 15,
      "actualMinutes": 15,
      "status": "completed",
      "startedAt": "2026-03-11T10:00:00Z",
      "endedAt": "2026-03-11T10:15:10Z",
      "visibility": "public"
    }
  ],
  "nextCursor": null,
  "hasNext": false
}
```

---

## 6. Session Notes

## 6.1 PUT `/v1/sessions/{sessionId}/note`

### 목적
- 세션 종료 후 노트 생성/수정
- 세션당 노트 1개를 upsert

### 요청

```json
{
  "summary": "문장의 속도감과 반복 패턴을 중심으로 읽었다.",
  "insight": "담백한데 리듬이 분명했다.",
  "mood": "calm",
  "tags": ["문체", "리듬"]
}
```

### 규칙
- session owner만 가능
- MVP에서는 `summary` 필수
- `status = completed` 세션에만 권장. active 상태 저장 허용 여부는 구현에서 막아도 됨

### 응답 200

```json
{
  "note": {
    "sessionId": "uuid",
    "summary": "문장의 속도감과 반복 패턴을 중심으로 읽었다.",
    "insight": "담백한데 리듬이 분명했다.",
    "mood": "calm",
    "tags": ["문체", "리듬"],
    "createdAt": "2026-03-11T10:16:00Z",
    "updatedAt": "2026-03-11T10:16:00Z"
  }
}
```

## 6.2 GET `/v1/sessions/{sessionId}/note`

### 목적
- 세션 노트 조회

### 응답 200

```json
{
  "note": {
    "sessionId": "uuid",
    "summary": "문장의 속도감과 반복 패턴을 중심으로 읽었다.",
    "insight": "담백한데 리듬이 분명했다.",
    "mood": "calm",
    "tags": ["문체", "리듬"]
  }
}
```

---

## 7. Session Bundles

## 7.1 POST `/v1/session-bundles`

### 목적
- 여러 세션을 하나의 묶음으로 생성
- 예: 15분 세션 4개를 1시간 딥다이브 묶음으로 저장

### 요청

```json
{
  "title": "오늘의 일본문학 1시간",
  "description": "문체와 시점을 중심으로 읽은 세션 묶음",
  "sessionIds": ["uuid1", "uuid2", "uuid3", "uuid4"],
  "visibility": "public"
}
```

### 규칙
- 본인 소유 completed 세션만 포함 가능
- 세션 수는 최소 2개 이상 권장
- 번들 생성 시 `totalMinutes`, `startedAt`, `endedAt`는 서버 계산

### 응답 201

```json
{
  "bundle": {
    "id": "uuid",
    "title": "오늘의 일본문학 1시간",
    "description": "문체와 시점을 중심으로 읽은 세션 묶음",
    "sessionIds": ["uuid1", "uuid2", "uuid3", "uuid4"],
    "totalMinutes": 60,
    "startedAt": "2026-03-11T09:00:00Z",
    "endedAt": "2026-03-11T10:10:00Z",
    "visibility": "public"
  }
}
```

## 7.2 GET `/v1/session-bundles/{bundleId}`

### 목적
- 내 세션 번들 상세 조회

### 규칙
- 번들 원본은 본인만 조회
- 공개 번들의 외부 표현은 하이라이트를 통해 노출

## 7.3 GET `/v1/me/session-bundles`

### 목적
- 내 세션 번들 목록 조회

---

## 8. Quiz Jobs / Quizzes

## 8.1 POST `/v1/quizzes/jobs`

### 목적
- 세션 또는 세션 번들을 바탕으로 AI 문제 생성 job 생성

### 요청 A: 단일 세션

```json
{
  "sessionId": "uuid",
  "bundleId": null
}
```

### 요청 B: 세션 번들

```json
{
  "sessionId": null,
  "bundleId": "uuid"
}
```

### 규칙
- `sessionId`, `bundleId` 중 정확히 하나만 필요
- owner만 요청 가능
- source note가 없으면 생성 제한 가능

### 응답 202

```json
{
  "job": {
    "id": "uuid",
    "status": "queued",
    "sessionId": "uuid",
    "bundleId": null,
    "queuedAt": "2026-03-11T10:20:00Z"
  }
}
```

### 에러
- `QUIZ_SOURCE_NOT_READY` → 409
- `QUIZ_JOB_ALREADY_EXISTS_FOR_SOURCE` → 409 (선택적)

## 8.2 GET `/v1/quizzes/jobs/{jobId}`

### 목적
- 퀴즈 생성 상태 polling

### 응답 200 (processing)

```json
{
  "job": {
    "id": "uuid",
    "status": "processing",
    "sessionId": "uuid",
    "bundleId": null,
    "queuedAt": "2026-03-11T10:20:00Z",
    "startedAt": "2026-03-11T10:20:05Z",
    "completedAt": null,
    "failedAt": null
  },
  "quizIds": []
}
```

### 응답 200 (completed)

```json
{
  "job": {
    "id": "uuid",
    "status": "completed",
    "sessionId": "uuid",
    "bundleId": null,
    "queuedAt": "2026-03-11T10:20:00Z",
    "startedAt": "2026-03-11T10:20:05Z",
    "completedAt": "2026-03-11T10:20:11Z",
    "failedAt": null
  },
  "quizIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 응답 200 (failed)

```json
{
  "job": {
    "id": "uuid",
    "status": "failed",
    "sessionId": "uuid",
    "bundleId": null,
    "queuedAt": "2026-03-11T10:20:00Z",
    "startedAt": "2026-03-11T10:20:05Z",
    "completedAt": null,
    "failedAt": "2026-03-11T10:20:11Z"
  },
  "quizIds": [],
  "error": {
    "code": "QUIZ_GENERATION_FAILED",
    "message": "Quiz generation failed.",
    "details": null
  }
}
```

## 8.3 GET `/v1/quizzes/{quizId}`

### 목적
- 문제 상세 조회

### 규칙
- owner only

### 응답 200

```json
{
  "quiz": {
    "id": "uuid",
    "jobId": "uuid",
    "quizType": "subjectiveReflection",
    "question": "오늘 읽은 문장에서 가장 리듬감 있게 느껴진 부분은 무엇이었고 왜였나요?",
    "sortOrder": 0,
    "createdAt": "2026-03-11T10:20:11Z"
  },
  "attempt": null
}
```

## 8.4 POST `/v1/quizzes/{quizId}/attempts`

### 목적
- 주관식 응답 제출 및 점수화

### 요청

```json
{
  "answerText": "반복되는 묘사보다 문장 끝에서 힘을 빼는 부분이 특히 좋았다."
}
```

### 규칙
- MVP에서는 quiz당 1회 제출 권장
- 서버가 평가 및 score/feedback 저장
- 제출 완료 후 profile rank score 재계산 트리거 가능

### 응답 201

```json
{
  "attempt": {
    "quizId": "uuid",
    "answerText": "반복되는 묘사보다 문장 끝에서 힘을 빼는 부분이 특히 좋았다.",
    "score": 82,
    "feedback": "핵심 인상을 구체적으로 표현했다.",
    "gradedAt": "2026-03-11T10:22:00Z",
    "createdAt": "2026-03-11T10:22:00Z"
  },
  "profileRank": {
    "currentRankCode": "trace",
    "rankScore": 82
  }
}
```

### 에러
- `QUIZ_ALREADY_ATTEMPTED` → 409

## 8.5 GET `/v1/me/quizzes`

### 목적
- 내 퀴즈 목록/결과 요약 조회

### 쿼리 파라미터
- `cursor`
- `limit`

## 8.6 POST `/v1/jitter/messages`

> **구현 상태**: ✅ Phase 0 완료 (2026-03-31). 클라우드 LLM(Gemini) 기반으로 동작 중.
> Phase 1에서 프론트가 온디바이스로 전환되어도 이 엔드포인트는 cloud fallback으로 유지된다.

### 목적
- **Jitter** 동반자 챗봇. 온디바이스 전환 시에도 동일 경로를 유지하고 서버 구현만 교체할 수 있게 한다.
- Phase 1 이후: 프론트가 온디바이스 모델(llama.rn)을 직접 호출하며, 이 엔드포인트는 cloud fallback 전용으로 사용된다.

### 요청

```json
{
  "messages": [
    { "role": "user", "content": "안녕" },
    { "role": "assistant", "content": "안녕하세요. 오늘은 어떤 기록을 떠올리고 계신가요?" },
    { "role": "user", "content": "무라카미를 다시 읽고 있어요." }
  ],
  "contextSummary": null
}
```

### 규칙
- 인증 필요 (`Authorization: Bearer`)
- `messages`: 1~20턴. 역할은 `user` ↔ `assistant`가 번갈아야 하며 **첫 턴과 마지막 턴은 반드시 `user`** (마지막 사용자 메시지에 대한 응답을 생성)
- 각 `content` 길이 1~4000자
- `contextSummary`: 선택. 클라이언트가 로컬에서 요약한 세션/기록 요약 등을 넣을 수 있음(최대 8000자)
- `NICHE_GEMINI_API_KEY` 미설정 시 AI 미구성으로 503

### 응답 200

```json
{
  "reply": "무라카미를 다시 집어드셨다니, 이번에는 어떤 문장이 가장 오래 남았나요?"
}
```

### 에러
- 검증 실패(턴 순서 등) → `VALIDATION_ERROR` 422
- AI/LLM 실패 → `INTERNAL_ERROR` 503 (메시지: 일시적 장애 안내)

### 백엔드 구현 파일
- `src/routers/jitter.py` — 라우터
- `src/services/jitter_service.py` — 턴 순서 검증, cloud 호출
- `src/schemas/jitter.py` — `JitterChatRequest`, `JitterChatResponse`
- `src/ai/providers/gemini_adapter.py` — `jitter_chat()` 구현 (시스템 프롬프트 포함)

---

## 9. Blog Posts

## 9.1 POST `/v1/blog-posts`

### 목적
- 블로그 글 생성

### 요청

```json
{
  "title": "비 오는 저녁의 고양이 관찰",
  "excerpt": "젖은 골목을 지나던 고양이를 보며 들었던 생각",
  "bodyMd": "# 제목\n\n오늘은 ...",
  "coverImagePath": "content/profile-id/blog/post-id/cover.jpg",
  "visibility": "public"
}
```

### 규칙
- draft 테이블은 두지 않는다
- 프론트 local draft 후 publish 시 생성
- `visibility` 기본값 public

### 응답 201

```json
{
  "post": {
    "id": "uuid",
    "title": "비 오는 저녁의 고양이 관찰",
    "excerpt": "젖은 골목을 지나던 고양이를 보며 들었던 생각",
    "bodyMd": "# 제목\n\n오늘은 ...",
    "coverImageUrl": "https://...",
    "visibility": "public",
    "publishedAt": "2026-03-11T11:00:00Z",
    "createdAt": "2026-03-11T11:00:00Z",
    "updatedAt": "2026-03-11T11:00:00Z"
  }
}
```

## 9.2 GET `/v1/blog-posts/{postId}`

### 목적
- 블로그 글 상세 조회

### 규칙
- `public`이면 타 사용자 조회 가능
- `private`면 작성자만 가능

## 9.3 PATCH `/v1/blog-posts/{postId}`

### 목적
- 블로그 글 수정

### 요청

```json
{
  "title": "비 오는 저녁의 고양이 관찰",
  "excerpt": "수정된 요약",
  "bodyMd": "# 수정 본문",
  "coverImagePath": "content/profile-id/blog/post-id/cover-new.jpg",
  "visibility": "private"
}
```

## 9.4 DELETE `/v1/blog-posts/{postId}`

### 목적
- 블로그 글 삭제

### 규칙
- soft delete

### 응답 204
- body 없음

## 9.5 GET `/v1/me/blog-posts`

### 목적
- 내 블로그 글 목록 조회
- public/private 모두 포함

## 9.6 GET `/v1/users/{profileId}/blog-posts`

### 목적
- 타 사용자 공개 블로그 글 목록 조회

### 규칙
- public만 노출

---

## 10. Highlights

## 10.1 하이라이트 생성 원칙
- 하이라이트는 세션 종료 후 자동 생성하지 않는다
- 사용자가 **사진 + 템플릿을 조합한 최종 이미지 저장 시점에 생성 여부를 선택**한다
- 하이라이트는 세션/세션 번들의 단순 포인터가 아니라 **공유/전시용 파생 리소스**다
- 최종 저장된 렌더 이미지 경로를 반드시 가진다

## 10.2 POST `/v1/highlights`

### 목적
- 하이라이트 생성

### 요청 A: 단일 세션

```json
{
  "sourceType": "session",
  "sessionId": "uuid",
  "bundleId": null,
  "title": "하루키 문장 리듬 15분",
  "caption": "속도가 느린데도 묘하게 앞으로 밀린다.",
  "templateCode": "mono_story_v1",
  "renderedImagePath": "content/profile-id/highlight/highlight-id/rendered/final.jpg",
  "sourcePhotoPath": "content/profile-id/highlight/highlight-id/source/raw.jpg",
  "visibility": "public"
}
```

### 요청 B: 세션 번들

```json
{
  "sourceType": "sessionBundle",
  "sessionId": null,
  "bundleId": "uuid",
  "title": "오늘의 일본문학 1시간",
  "caption": "문체와 시점을 나눠서 본 날",
  "templateCode": "mono_story_v1",
  "renderedImagePath": "content/profile-id/highlight/highlight-id/rendered/final.jpg",
  "sourcePhotoPath": null,
  "visibility": "public"
}
```

### 규칙
- source는 본인 소유여야 함
- `renderedImagePath` 필수
- `sourcePhotoPath`는 optional
- 단일 session/bundle당 highlight 1개만 허용하는 MVP가 단순하다

### 응답 201

```json
{
  "highlight": {
    "id": "uuid",
    "sourceType": "session",
    "sessionId": "uuid",
    "bundleId": null,
    "title": "하루키 문장 리듬 15분",
    "caption": "속도가 느린데도 묘하게 앞으로 밀린다.",
    "templateCode": "mono_story_v1",
    "renderedImageUrl": "https://...",
    "sourcePhotoUrl": "https://...",
    "visibility": "public",
    "publishedAt": "2026-03-11T10:18:00Z"
  }
}
```

## 10.3 GET `/v1/highlights/{highlightId}`

### 목적
- 하이라이트 상세 조회

### 규칙
- public이면 타 사용자 조회 가능
- private면 작성자만 가능

### 응답 200

```json
{
  "highlight": {
    "id": "uuid",
    "author": {
      "id": "uuid",
      "handle": "niche_reader",
      "displayName": "NichE User",
      "avatarUrl": null,
      "currentRankCode": "focus"
    },
    "sourceType": "session",
    "title": "하루키 문장 리듬 15분",
    "caption": "속도가 느린데도 묘하게 앞으로 밀린다.",
    "templateCode": "mono_story_v1",
    "renderedImageUrl": "https://...",
    "sourcePhotoUrl": "https://...",
    "visibility": "public",
    "publishedAt": "2026-03-11T10:18:00Z"
  }
}
```

## 10.4 PATCH `/v1/highlights/{highlightId}`

### 목적
- 하이라이트 수정

### 요청

```json
{
  "title": "수정된 제목",
  "caption": "수정된 캡션",
  "visibility": "private"
}
```

## 10.5 GET `/v1/me/highlights`

### 목적
- 내 하이라이트 목록 조회

## 10.6 GET `/v1/users/{profileId}/highlights`

### 목적
- 타 사용자 공개 하이라이트 목록 조회

---

## 11. Archive

## 11.1 GET `/v1/me/archive`

### 목적
- 내 아카이브 탭 초기 데이터 조회
- 블로그 목록 + 하이라이트 목록 + 프로필 요약을 한 번에 제공

### 쿼리 파라미터
- `blogCursor` optional
- `highlightCursor` optional
- `blogLimit` optional
- `highlightLimit` optional

### 응답 200

```json
{
  "profile": {
    "id": "uuid",
    "handle": "niche_reader",
    "displayName": "NichE User",
    "bio": "...",
    "avatarUrl": null,
    "currentRankCode": "focus",
    "rankScore": 320,
    "isPublic": true
  },
  "stats": {
    "totalSessions": 36,
    "totalFocusMinutes": 540,
    "totalBlogPosts": 12,
    "totalHighlights": 8,
    "currentStreakDays": 4
  },
  "blogPosts": {
    "items": [],
    "nextCursor": null,
    "hasNext": false
  },
  "highlights": {
    "items": [],
    "nextCursor": null,
    "hasNext": false
  }
}
```

## 11.2 GET `/v1/users/{profileId}/archive`

### 목적
- 타 사용자 공개 아카이브 조회

### 규칙
- 해당 profile이 public이어야 함
- blog/highlight는 public만 포함

---

## 12. Feed

> ⚠️ Feed 탭 개념이 **Text Wave (Trend Radar)** 로 전면 재설계되었다.
> 기존 소셜 포스트 수직 스크롤 피드는 폐기되었으며, `GET /v1/feed` 엔드포인트는 레거시로 보존하되 앱 Feed 탭에서는 더 이상 사용하지 않는다.

## 12.1 GET `/v1/feed/wave` ← **메인 Feed 탭 API**

### 목적
- 지난 24시간 내 공개 하이라이트 제목들을 Text Wave UI에 표시하기 위해 조회
- 프론트의 3-layer parallax infinite marquee 데이터 원천

### 인증
- 필요 (Bearer token)

### 쿼리 파라미터
- `limit` optional, default 30, max 50

### 서버 처리 로직
- 대상 테이블: `highlights` (LEFT JOIN `sessions` for topic, JOIN `profiles` for handle)
- 조건: `highlights.visibility = 'public'` AND `highlights.created_at >= NOW() - INTERVAL '24 HOURS'` AND `highlights.deleted_at IS NULL`
- 정렬: `ORDER BY RANDOM()` — 매 요청마다 다른 순서 → 동적인 파도 느낌
- limit 적용 후 반환

### 응답 200

```json
{
  "waveItems": [
    {
      "highlightId": "uuid",
      "title": "하루키 문장 리듬 15분",
      "authorHandle": "focus_user",
      "topic": "일본문학",
      "imageUrl": "https://storage.supabase.co/.../rendered/final.jpg"
    },
    {
      "highlightId": "uuid",
      "title": "공간 심리학의 이해",
      "authorHandle": "arch_observer",
      "topic": null,
      "imageUrl": null
    }
  ]
}
```

### WaveItemDTO 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `highlightId` | string | 하이라이트 UUID. 클릭 시 상세 조회에 사용 |
| `title` | string | 마키에 흐르는 텍스트 |
| `authorHandle` | string | 작성자 `profiles.handle` |
| `topic` | string \| null | 연결 세션의 `sessions.topic` (session_id가 있는 경우) |
| `imageUrl` | string \| null | `renderedImagePath`에 `storage_public_base_url` 조합 결과 |

### 규칙
- `topic`은 highlight의 `session_id`로 sessions 테이블을 JOIN해서 가져온다
- bundle 기반 하이라이트(`source_type = 'session_bundle'`)의 경우 `topic = null` 허용
- `imageUrl`은 서버가 `renderedImagePath`에 `Settings.storage_public_base_url` prefix를 붙여 반환
- 24시간 내 결과가 0건이어도 200 + 빈 배열 반환 (`waveItems: []`) — MVP에서 fallback 없음
- `ai_score` 필드는 MVP에서 포함하지 않는다 (highlights 테이블에 없음)

### 에러
- `401`: 인증 실패

---

## 12.2 GET `/v1/feed` ← **레거시 (Feed 탭 미사용)**

> 기존 소셜 포스트 피드 엔드포인트. Feed 탭에서는 더 이상 사용하지 않는다.
> Blog 탭 또는 향후 탐색 기능에서 재활용 가능성이 있어 보존한다.

### 목적
- 공개 블로그 글 + 공개 하이라이트 최신 피드 조회 (수직 스크롤 피드용)

### 쿼리 파라미터
- `cursor` optional
- `limit` optional default 20 max 50
- `contentType` optional: `all|blogPost|highlight`

### 응답 200

```json
{
  "items": [
    {
      "contentType": "highlight",
      "contentId": "uuid",
      "author": {
        "id": "uuid",
        "handle": "niche_reader",
        "displayName": "NichE User",
        "avatarUrl": null,
        "currentRankCode": "focus"
      },
      "title": "하루키 문장 리듬 15분",
      "excerpt": "속도가 느린데도 묘하게 앞으로 밀린다.",
      "coverImageUrl": "https://...",
      "publishedAt": "2026-03-11T10:18:00Z"
    }
  ],
  "nextCursor": null,
  "hasNext": false
}
```

---

## 13. Uploads

## 13.1 POST `/v1/uploads/presign`

### 목적
- 앱이 직접 Storage에 업로드할 수 있는 signed path / presigned metadata 발급

### 요청

```json
{
  "bucket": "content",
  "scope": "highlightRendered",
  "contentType": "image/jpeg",
  "fileExt": "jpg"
}
```

### 허용 scope 예시
- `avatar`
- `blogCover`
- `highlightRendered`
- `highlightSourcePhoto`

### 응답 200

```json
{
  "bucket": "content",
  "path": "content/profile-id/highlight/temp-uuid/rendered/final.jpg",
  "uploadUrl": "https://...",
  "headers": {
    "content-type": "image/jpeg"
  },
  "expiresIn": 300
}
```

### 규칙
- 서버는 사용자와 scope 조합에 맞는 path만 발급한다
- 프론트는 업로드 완료 후 생성/수정 API에 최종 path를 전달한다

---

## 14. Rank / Profile Stats 갱신 시점

## 14.1 랭크 갱신 이벤트
초기 MVP에서는 아래 시점에 rank score 재계산을 권장한다.

- session complete
- quiz attempt graded
- highlight created
- blog post created

## 14.2 profile_stats 갱신 이벤트
- session complete/cancel
- blog post create/delete
- highlight create/delete

### 구현 원칙
- 동기 처리로 충분하면 service에서 직접 갱신
- 복잡해지면 DB trigger보다 app-layer updater를 우선 권장

---

## 15. 상태 전이 규칙

## 15.1 session
- `active -> completed`
- `active -> cancelled`
- 그 외 전이는 금지

## 15.2 quiz job
- `queued -> processing`
- `processing -> completed`
- `processing -> failed`
- 실패 후 재시도 시 `failed -> queued` 또는 새 job 생성

## 15.3 visibility
- `public <-> private`
- 작성자만 변경 가능

---

## 16. MVP 제외 범위

이번 API 계약에서 제외하는 것:
- follow API
- likes / reactions API
- comments API
- notifications API
- bookmark API
- search API
- category/tag 기반 추천 API
- admin moderation API
- draft autosave API
- public web SSR/SEO API

---

## 17. 프론트 호출 플로우 예시

## 17.1 세션 시작 → 종료 → 노트 저장 → 퀴즈 생성
1. `POST /v1/sessions`
2. 타이머 종료 후 `POST /v1/sessions/{id}/complete`
3. `PUT /v1/sessions/{id}/note`
4. `POST /v1/quizzes/jobs`
5. `GET /v1/quizzes/jobs/{jobId}` polling
6. 완료 시 `GET /v1/quizzes/{quizId}`
7. 답안 제출 `POST /v1/quizzes/{quizId}/attempts`

## 17.2 하이라이트 저장
1. 앱에서 템플릿 조합 렌더링
2. `POST /v1/uploads/presign` for rendered image
3. Storage 업로드
4. 필요 시 `POST /v1/uploads/presign` for source photo
5. Storage 업로드
6. 사용자가 저장 선택 시 `POST /v1/highlights`

## 17.3 아카이브 진입
1. `GET /v1/me/archive`
2. 내부 섹션 추가 스크롤 시 각 cursor 사용

---

## 18. 구현 우선순위

백엔드 구현 순서는 아래를 권장한다.

1. health / ready
2. auth dependency / me
3. sessions
4. session notes
5. uploads presign
6. blog posts
7. highlights
8. archive
9. feed
10. quiz jobs / quizzes / attempts
11. session bundles

`session bundles`는 기획적으로 중요하지만, 1차 MVP 런치 직전까지는 뒤로 미뤄도 된다.
