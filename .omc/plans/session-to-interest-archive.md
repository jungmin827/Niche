# Plan: Session Complete -> Interest Archive

**Date:** 2026-04-13
**Scope:** Frontend-only (4 files modified, 1 new component)
**Estimated complexity:** LOW-MEDIUM
**Backend changes:** None required

---

## Context

세션 완료 후 사용자가 해당 세션의 메모/토픽을 특정 관심사의 Log로 저장할 수 있는 기능.
현재 `SessionCompleteScreen`은 메모 저장 + SharePreview 이동만 수행하며, Interest 도메인과 연결되지 않는다.

### Codebase Facts (조사 완료)

- `useCreateLogMutation(interestId)` 이미 존재 -- `POST /v1/interests/{id}/logs` 호출
- `useMyInterestsQuery()` 이미 존재 -- 사용자 관심사 목록 fetch
- `CreateLogInput` = `{ text: string, tag: LogTag }` -- 백엔드 변경 불필요
- `@gorhom/bottom-sheet` 미설치 -- 바텀시트 라이브러리 없음
- Expo Router modal 패턴 (`/(modals)/...`) 사용 중
- `log-compose.tsx` 모달이 참고 패턴으로 존재

---

## Option Analysis

### Recommended: Option B -- Interest Picker Modal (Expo Router modal)

**Why Option B:**
- NichE의 미니멀 톤 유지 -- SessionCompleteScreen에 복잡한 UI 추가 없음
- 기존 Expo Router modal 패턴 재사용 (새 라이브러리 불필요)
- 사용자 선택이 명시적 -- "어떤 관심사에 연결할지" 의도적 행위
- 기존 Save & Archive / Bundle & Archive 흐름 변경 최소

**Why not Option A (inline picker):**
- SessionCompleteScreen이 이미 메모 + 번들 제목 + 버튼 3종으로 밀도가 높음
- 관심사 목록 드롭다운 추가 시 화면 복잡도 초과

**Why not Option C (SharePreview 이후):**
- "저장 완료 후 관심사 연결" 순서가 비직관적
- 사용자가 이미 아카이브 완료 상태에서 추가 행동 요청은 UX 마찰

---

## Guardrails

### Must Have
- 관심사 선택은 optional (skip 가능)
- 기존 Save & Archive / Bundle & Archive 흐름 유지
- 로그 text = memo (비어있으면 session topic fallback)
- 로그 tag = 'observation' (세션 기록의 기본 성격)

### Must NOT Have
- 새 npm 패키지 설치 (바텀시트 라이브러리 등)
- 백엔드 API 변경
- 세션-관심사 DB 레벨 연결 (FK 등) -- MVP 범위 밖
- 관심사 신규 생성 플로우 (기존 관심사 선택만)

---

## Task Flow

```
SessionCompleteScreen
  "Save & Archive" tap
    |- saveNote() (기존)
    |- router.push(interestPickerModal({ sessionId, memo, topic }))
       |- InterestPickerModal
          |- useMyInterestsQuery() 로 목록 표시
          |- 관심사 선택 -> useCreateLogMutation(selectedId).mutateAsync({ text, tag })
          |- "Skip" -> SharePreview로 직행
          |- 성공 -> router.replace(sharePreviewModal({ sessionId }))
```

Bundle & Archive도 동일 패턴 적용 (bundleId 전달).

---

## Detailed TODOs

### Step 1: Interest Picker Modal 생성

**File:** `apps/mobile/app/(modals)/interest-picker.tsx` (NEW)

- `useMyInterestsQuery()`로 관심사 목록 fetch
- 리스트 렌더링: 관심사 이름 + depth score (있으면)
- 각 아이템 탭 -> 선택 상태 표시 + 하단 "Archive to Interest" 버튼 활성화
- "Skip" 버튼 -- 관심사 연결 없이 SharePreview 이동
- 선택 후 "Archive to Interest" -> `useCreateLogMutation` 호출 -> SharePreview로 이동
- 파라미터: `sessionId`, `bundleId`, `memo`, `topic` (search params)
- 로그 생성 입력: `{ text: memo || topic, tag: 'observation' }`
- UI 톤: 기존 `log-compose.tsx` 참고 (헤더 + X 버튼 + 리스트 + 하단 CTA)

**Acceptance criteria:**
- 관심사 0개일 때 빈 상태 메시지 표시 ("No interests yet")
- 관심사 선택 -> 로그 생성 API 호출 성공 -> SharePreview 이동
- Skip -> SharePreview 이동 (로그 생성 없이)
- 에러 발생 시 인라인 에러 메시지 표시

### Step 2: Routes 등록 + SessionCompleteScreen 연결

**File:** `apps/mobile/src/constants/routes.ts`

- `interestPicker` 라우트 추가: `(params: { sessionId?, bundleId?, memo?, topic? }) => ...`

**File:** `apps/mobile/src/features/session/screens/SessionCompleteScreen.tsx`

- `handleSaveAndArchive`: SharePreview 대신 InterestPicker 모달로 이동하도록 변경
- `handleBundleAndArchive`: 번들 생성 후 InterestPicker 모달로 이동하도록 변경
- 전달 params: `{ sessionId, bundleId, memo: memo.trim(), topic: session?.topic }`

**Acceptance criteria:**
- Save & Archive 탭 -> InterestPicker 모달 표시
- Bundle & Archive 탭 -> 번들 생성 -> InterestPicker 모달 표시
- InterestPicker에서 Skip/완료 후 SharePreview로 정상 이동

### Step 3: Interest query cache 갱신 확인

**File:** `apps/mobile/src/features/interest/mutations.ts`

- `useCreateLogMutation` 이미 `interestDetail` + `interestList` queryKey invalidate 중 -- 변경 불필요
- InterestPicker에서 mutation 호출 시 interest 목록의 `recordCount`, `depthScore`가 자동 갱신되는지 확인

**Acceptance criteria:**
- 로그 생성 후 관심사 탭에서 recordCount 증가 확인
- depthScore 재계산 반영 확인

### Step 4: Edge case 처리 + 빈 상태

**File:** `apps/mobile/app/(modals)/interest-picker.tsx`

- memo와 topic 모두 비어있을 때: Skip만 표시 (로그 생성 불가 안내)
- 네트워크 에러: retry 안내 또는 Skip 유도
- 로딩 중: 심플한 로딩 인디케이터

**Acceptance criteria:**
- memo + topic 모두 빈 경우 "Nothing to archive" 안내 + Skip만 활성
- 관심사 목록 로딩 중 스피너 표시
- API 실패 시 에러 메시지 + 재시도 가능

---

## Success Criteria

1. 세션 완료 -> 관심사 선택 -> 로그 자동 생성 -> SharePreview 전체 플로우 동작
2. Skip 시 기존 플로우(SharePreview 직행)와 동일하게 동작
3. 번들 모드에서도 동일하게 동작
4. 백엔드 변경 없음 (기존 `POST /v1/interests/{id}/logs` 재사용)
5. 새 라이브러리 설치 없음
6. 관심사 0개, 메모 없음 등 edge case 처리 완료

---

## Open Questions

- 세션 태그(session topic 카테고리)를 LogTag에 자동 매핑할지, 항상 'observation'으로 고정할지
- 향후 세션-관심사 간 DB 레벨 연결(session_id FK on logs)이 필요한지 (v2 검토)
- 관심사 신규 생성("+ New Interest")을 picker에서 바로 할 수 있게 할지 (MVP 이후)
