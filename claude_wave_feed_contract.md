# Feed Text Wave — Frontend ↔ Backend API Contract

> 백엔드 구현 완료 기준 문서. 프론트엔드는 이 문서를 기준으로 싱크를 맞춘다.
> 작성일: 2026-03-22

---

## 1. 변경 요약

| 항목 | 이전 | 현재 |
|---|---|---|
| Feed 탭 API | `GET /v1/feed-posts` (소셜 포스트) | `GET /v1/feed/wave` (하이라이트 마키) |
| 데이터 원천 | `feed_posts` 테이블 | `highlights` 테이블 |
| 페이지네이션 | cursor 기반 | 없음 (limit만) |
| 폐기 엔드포인트 | `/v1/feed-posts`, `/v1/feed-posts/{id}/comments` | **완전 제거됨** |

---

## 2. 엔드포인트

### `GET /v1/feed/wave`

**인증**: `Authorization: Bearer <supabase_access_token>` — 필수

**쿼리 파라미터**

| 파라미터 | 타입 | 기본값 | 범위 | 설명 |
|---|---|---|---|---|
| `limit` | integer | `30` | `1 ~ 50` | 반환 아이템 수 |

**요청 예시**
```
GET /v1/feed/wave?limit=30
Authorization: Bearer eyJhbGciOiJS...
```

---

## 3. 응답

### 성공 — `200 OK`

```json
{
  "waveItems": [
    {
      "highlightId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "하루키 문장의 속도",
      "authorHandle": "niche_reader",
      "topic": "일본문학",
      "imageUrl": "https://storage.niche.local/content/profile-id/highlight/id/rendered.jpg"
    },
    {
      "highlightId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "title": "공간 심리학의 이해",
      "authorHandle": "arch_observer",
      "topic": null,
      "imageUrl": null
    }
  ]
}
```

### 응답 필드 상세

| 필드 | 타입 | Null 가능 | 설명 |
|---|---|---|---|
| `waveItems` | `WaveItem[]` | No | 아이템 배열. 24시간 내 데이터 없으면 빈 배열 `[]` |
| `waveItems[].highlightId` | `string` (UUID) | No | 클릭 시 상세 조회에 사용 |
| `waveItems[].title` | `string` | No | 마키에 표시되는 텍스트 |
| `waveItems[].authorHandle` | `string` | No | 작성자 handle (`@` 없는 문자열) |
| `waveItems[].topic` | `string \| null` | **Yes** | 세션 주제. bundle 기반 하이라이트는 `null` |
| `waveItems[].imageUrl` | `string \| null` | **Yes** | 완성된 Storage URL. 이미지 없는 경우 `null` |

### 에러 응답

| 상태코드 | code | 발생 조건 |
|---|---|---|
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |
| `422` | `VALIDATION_ERROR` | `limit`이 범위 초과 |
| `500` | `INTERNAL_ERROR` | 서버 오류 |

에러 응답 형태:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "...",
    "details": null
  }
}
```

---

## 4. 데이터 특성 — 프론트 처리 주의사항

### 4.1 정렬
- 서버가 `ORDER BY RANDOM()` 적용 후 반환
- 매 요청마다 순서가 다름 — 프론트는 순서에 의존하지 말 것
- 앱 내부 레이어 배분(Layer 1/2/3)은 프론트가 index 기반으로 분배

### 4.2 `topic` null 처리
- 세션 기반 하이라이트: `topic`은 원본 세션의 주제 문자열
- 번들 기반 하이라이트: `topic = null`
- 마키 표시 시 null이면 `title`만 표시하거나 빈 처리 필요

### 4.3 `imageUrl` null 처리
- `rendered_image_path`가 없는 하이라이트는 `imageUrl = null`
- Bottom Sheet 모달에서 이미지 영역을 fallback UI로 처리할 것

### 4.4 빈 배열 처리
- 최근 24시간 내 공개 하이라이트가 없으면 `waveItems: []` 반환
- 서버가 fallback으로 오래된 데이터를 채우지 않음
- 프론트에서 빈 상태 UI (empty state) 필요

### 4.5 갱신 주기
- 서버는 TTL/캐시 없이 매 요청마다 실시간 쿼리
- 프론트가 적절한 polling 또는 pull-to-refresh 구현 권장

---

## 5. TypeScript 타입 정의 (프론트 참고용)

```typescript
interface WaveItem {
  highlightId: string;
  title: string;
  authorHandle: string;
  topic: string | null;
  imageUrl: string | null;
}

interface WaveFeedResponse {
  waveItems: WaveItem[];
}
```

---

## 6. 폐기된 엔드포인트 (호출 금지)

아래 엔드포인트는 서버에서 완전히 제거되었다. 호출 시 `404` 반환.

```
GET  /v1/feed-posts                        ← 제거됨
POST /v1/feed-posts                        ← 제거됨
DELETE /v1/feed-posts/{postId}             ← 제거됨
GET  /v1/feed-posts/{postId}/comments      ← 제거됨
POST /v1/feed-posts/{postId}/comments      ← 제거됨
DELETE /v1/feed-posts/{postId}/comments/{commentId} ← 제거됨
```
