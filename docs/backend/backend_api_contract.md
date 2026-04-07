# NichE Backend API Contract v2

## 문서 목적
이 문서는 **NichE FastAPI 백엔드의 API 계약 문서**이다. "Proof Engine" 개편 방향성에 맞춰 전면 수정되었다.

## 1. 공통 규칙
- Base path: `/v1`
- 인증: `Authorization: Bearer <token>`
- 요청/응답: `application/json` (camelCase)
- Data DTO: `snake_case` in DB, `camelCase` in JSON.

---

## 2. Profile / Me

### 2.1 GET `/v1/me`
- 프로필 요약 및 현재 랭크 리턴.

### 2.2 PATCH `/v1/me`
- 내 프로필 수정.

---

## 3. Interests (Proof Engine 핵심)

### 3.1 POST `/v1/interests`
**목적:** 관심사 생성
**요청:**
```json
{
  "name": "자연 와인",
  "startedAt": "2022-01-01"
}
```
**응답 201:** 생성된 Interest

### 3.2 GET `/v1/me/interests`
**목적:** 내 관심사 목록 조회 (depth_score 포함)
**응답 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "자연 와인",
      "startedAt": "2022-01-01",
      "recordCount": 18,
      "depthScore": 4.1,
      "isPublic": true,
      "createdAt": "..."
    }
  ]
}
```

### 3.3 GET `/v1/interests/{id}`
**목적:** 단일 관심사 상세 조회 (로그 포함)
**응답 200:** Interest 데이터와 Logs 배열, Depth Score 리턴.

### 3.4 PATCH `/v1/interests/{id}`
**목적:** 관심사 이름이나 시작일 변경 (Depth 재계산 트리거)

### 3.5 DELETE `/v1/interests/{id}`
**목적:** 관심사 소프트 삭제 (연결된 모든 Log cascade soft-delete).

---

## 4. Logs (Interest의 하위 레코드)

### 4.1 POST `/v1/interests/{id}/logs`
**목적:** 관심사에 대한 기록 추가
**요청:**
```json
{
  "text": "오늘 마신 오렌지 와인 테이스팅.",
  "tag": "tasting_note"
}
```
**응답 201:** Log 데이터 리턴 (depth_score 즉각 변동됨)

### 4.2 PATCH `/v1/interests/{id}/logs/{logId}`
**목적:** 기록 내용 수정

### 4.3 DELETE `/v1/interests/{id}/logs/{logId}`
**목적:** 기록 삭제

---

## 5. Sessions (타이머 기록 기능 - 보존)

### 5.1 POST `/v1/sessions`
- **목적:** 딥다이브 세션 시작
- **응답:** active 상태 세션

### 5.2 POST `/v1/sessions/{sessionId}/complete`
- **목적:** 세션 종료

### 5.3 PUT `/v1/sessions/{sessionId}/note`
- **목적:** 세션 결과 노트 저장

### 5.4 GET `/v1/me/sessions`
- **목적:** 내 세션 목록 조회

---

## 6. Zitter / AI Chatbot (보존)

### 6.1 POST `/v1/jitter/messages`
- **목적:** Zitter 동반자 챗봇 대화 (Gemini / llama.rn 파싱)

### 6.2 GET / POST `/v1/quizzes/jobs` & `/quizzes/{id}`
- **목적:** AI 회고 퀴즈 시스템 접근.
