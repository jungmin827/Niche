# NichE 방향성 회고 & 진행상황 점검 플랜 (v2)
Generated: 2026-04-09 | Mode: RALPLAN Consensus | Iteration: 2

---

## Requirements Summary

office-hours에서 확정된 기획(Proof Engine, 2026-04-07)을 기준으로:
1. 현재 구현 상태와 기획 간의 Gap을 정확하게 파악한다
2. MVP 달성을 위한 다음 우선순위 액션을 결정한다
3. 기획 방향이 여전히 유효한지 재검증한다

---

## RALPLAN-DR Summary

### Principles (3-5)
1. **기획 선행, 구현 후행** — 코드보다 명확한 스펙이 먼저다
2. **API 계약 준수** — 프론트가 camelCase DTO를 기준으로 빌드하기 전에 백엔드가 계약을 충족해야 한다
3. **MVP 범위 사수** — Session, 소셜 레이어, 서버사이드 카드는 절대 MVP 범위 아님
4. **창업자가 매일 쓰고 싶은 앱** — 기술적 완성도보다 실사용 가능성이 우선
5. **작고, 검증 가능하고, 점진적** — 큰 PR보다 빠른 피드백 루프

### Decision Drivers (Top 3)
1. **camelCase 계약 위반** — Interest/Log 스키마가 snake_case를 반환. 프론트를 시작하면 모든 화면의 필드 이름이 틀림. 가장 크리티컬한 선행 픽스
2. **프론트엔드 0% 구현** — 백엔드 기능이 존재해도 앱을 쓸 수 없음. 계약 픽스 후 최우선
3. **통합 테스트 없음** — Interest/Log 엔드포인트에 대한 테스트 전무 (기존 테스트는 레거시 highlight/session 도메인 전용)

### Viable Options

#### Option A (기각): 프론트엔드 즉시 시작
**문제:** 백엔드가 snake_case JSON을 반환하는 상태에서 프론트를 시작하면 모든 화면에서 필드 이름이 틀림. 추후 수정 시 O(n) 비용.

#### Option A' (채택): 계약 하드닝 반나절 → 프론트엔드
**Approach:** 반나절(2-4시간) 백엔드 계약 픽스 스프린트를 먼저 수행한 뒤 프론트 구현 시작
- **Pros:** camelCase 계약 준수 후 프론트 시작 / 계약 기반 rework 없음 / 동일 날 프론트 시작 가능
- **Cons:** Option A보다 반나절 지연

#### Option B (기각): 테스트 우선
**문제:** 창업자가 앱을 볼 수 있는 시점이 수일 지연됨. 1인 개발자 모티베이션 저하 위험이 실질적.

---

## 현재 상태 분석 (Gap Analysis — 정정 버전)

### 백엔드 — ⚠️ 기능 구현 완료, 계약 준수 미완

| 항목 | 파일 | 상태 |
|------|------|------|
| Interest Router | `apps/api/src/routers/interests.py` | ✅ 8개 엔드포인트 |
| Interest Service | `apps/api/src/services/interest_service.py` | ✅ depth_score 계산 포함 |
| Interest Repository | `apps/api/src/repositories/interest_repo.py` | ✅ async SQLAlchemy, soft delete |
| Interest/Log 모델 | `apps/api/src/models/interest_table.py`, `log_table.py` | ✅ ORM 완료 |
| DB Migration | `alembic/versions/938501b9a3f2_...` | ✅ interests + logs 테이블 |
| **camelCase DTO** | `apps/api/src/schemas/interest.py`, `log.py` | ❌ **snake_case 반환 중 — 계약 위반** |
| **started_at 미래 검증** | `apps/api/src/schemas/interest.py` | ❌ **validator 없음** |
| **text 길이 검증** | `apps/api/src/schemas/log.py` | ❌ **min/max 없음** |
| **depth_score null 처리** | `apps/api/src/services/interest_service.py` | ❌ **0 records 시 0.0 반환 (null 아님)** |

**백엔드 구체 이슈:**

1. `InterestResponse`, `LogResponse` 등 6개 스키마가 `BaseModel` 직접 상속 — `CamelModel`(`src/schemas/common.py:15` 기준) 미적용. JSON 응답이 `started_at`, `depth_score` 등 snake_case로 반환됨
2. `InterestCreate.started_at: date` — Pydantic validator 없음. 미래 날짜도 저장됨
3. `LogCreate.text: str` — 길이 제약 없음. 빈 문자열, 공백만, 100KB 문자열 모두 통과
4. `_calculate_depth_score(days, 0)` — record_count=0이면 `log10(days+1) * log10(2) ≈ 양수`를 반환. 기록 없는 상태에서 depth_score가 null이 아님
5. N+1 쿼리 — `get_my_interests`에서 각 interest마다 별도 count 쿼리 (`service.py:57-65`, `repo.py:46-52`) — MVP 허용 범위, 알려진 tech debt

### 테스트 — ⚠️ 레거시 도메인 전용, Interest/Log 전무

| 파일 | 도메인 | 상태 |
|------|-------|------|
| `tests/integration/test_mvp_flow_memory.py` | Highlight/Session | ✅ 존재 (레거시) |
| `tests/integration/test_mvp_flow_postgres.py` | Highlight/Session | ✅ 존재 (레거시) |
| `tests/integration/test_highlight_detail.py` | Highlight | ✅ 존재 (레거시) |
| **`tests/integration/test_interest_flow_memory.py`** | Interest/Log | ❌ **미존재** |

### 프론트엔드 — ❌ 전무
Interest, Log 관련 화면, 컴포넌트, query/mutation, 타입 파일 전무.

### 기술 스택 정정
- Expo SDK: **55** (실제 `package.json:20`, CLAUDE.md의 54는 오기)
- `react-native-view-shot` SDK 55 호환성 확인 필요

---

## 수정된 Implementation Priority

### Step 0 — 백엔드 계약 하드닝 (반나절, 프론트 시작 전 필수)

**목적:** 프론트가 잘못된 API 계약 기반으로 빌드하는 것을 방지

1. `apps/api/src/schemas/interest.py` — `InterestCreate`, `InterestUpdate`, `InterestResponse`를 `CamelModel` 상속으로 변경
2. `apps/api/src/schemas/log.py` — `LogCreate`, `LogUpdate`, `LogResponse`를 `CamelModel` 상속으로 변경
3. `InterestCreate.started_at` — Pydantic `field_validator` 추가: 오늘 이후 날짜 → ValidationError 422
4. `LogCreate.text` — `Field(min_length=1, max_length=2000)` 추가 + 공백만 입력 거부
5. `InterestResponse.depth_score` — `float | None = None` 변경, record_count=0이면 None 반환
6. 스모크 테스트 1개 — 관심사 생성 → 로그 추가 → camelCase 응답 키 확인 (`startedAt`, `depthScore`)
7. **주의:** `response_model=dict` 엔드포인트 5개 확인 — alias_generator 적용 후에도 snake_case 반환 가능성 있음. 필요 시 `response_model` 명시

### Step 1 — Interest/Log 통합 테스트 (`test_interest_flow_memory.py`)
패턴: `test_mvp_flow_memory.py` (InMemory backend, httpx.AsyncClient)

커버해야 할 케이스:
- 관심사 생성 → 로그 추가 → depth_score 양수 반환
- 로그 0개 → depth_score = null
- `startedAt` 미래 → 422
- `text` 빈/공백/초과 → 422
- 타인의 interest에 로그 추가 → 404
- Interest 삭제 → 연결 Log cascade soft-delete 확인
- **응답 키가 camelCase인지 확인** (`startedAt`, `depthScore`, `recordCount`)

### Step 2 — 모바일: Interest 목록 + 생성 화면

Expo Router 파일 경로 (예시 — 실제 routing 구조는 `apps/mobile/app/` 확인 필요):
- `apps/mobile/app/(tabs)/interests/index.tsx` — 목록
- `apps/mobile/app/(tabs)/interests/create.tsx` — 생성
- `apps/mobile/src/features/interest/hooks/useInterests.ts` — TanStack Query
- `apps/mobile/src/features/interest/hooks/useCreateInterest.ts` — Mutation

**목록 화면:**
- 관심사 카드: 이름 + 타임라인 바 + depth_score (예: "4.1") + 최근 로그 미리보기
- 빈 상태: "첫 관심사 추가하기" CTA → 생성 화면

**생성 화면:**
- 이름 입력 (필수)
- 시작 날짜 선택 (오늘 이전만, DatePicker)
- 생성 성공 → 목록으로 돌아가기

### Step 3 — 모바일: Interest 상세 + Log 추가

- `apps/mobile/app/(tabs)/interests/[id]/index.tsx` — 상세
- Depth 지표 (depth_score + days + record_count)
- 로그 목록
- Bottom Sheet / 모달: Log 추가 (tag 선택 + text 입력, 1~2000자)

### Step 4 — 공유 카드 생성

- `react-native-view-shot` (SDK 55 호환 확인 후 설치)
- 540×960px, 배경 #1a1a1a
- 포함: 관심사명 / depth_score / 기간 / 기록 수 / 최근 기록 인용 / @username / "niche.app"

### MVP 아님 (명시적 제외)
Session 도메인, 소셜 레이어, 공유 카드 서버사이드 렌더링, 추천 엔진, 페이지네이션(API에 PageResponse 존재하나 MVP 불필요)

---

## Acceptance Criteria

### 백엔드 (Step 0 완료 기준)
- [ ] `GET /v1/me/interests` 응답 키가 `startedAt`, `depthScore`, `recordCount`, `isPublic` (camelCase)
- [ ] `POST /v1/interests` with `startedAt` = 내일 날짜 → 422 반환
- [ ] `POST /v1/interests/{id}/logs` with `text = ""` → 422 반환
- [ ] `POST /v1/interests/{id}/logs` with `text = " "` (공백만) → 422 반환
- [ ] `POST /v1/interests/{id}/logs` with `text` 2001자 → 422 반환
- [ ] 로그 0개 상태에서 `depthScore = null`
- [ ] 로그 1개 추가 후 `depthScore > 0`

### 통합 테스트 (Step 1 완료 기준)
- [ ] `test_interest_flow_memory.py` 파일 존재하고 `make test` 통과
- [ ] cascade soft-delete 확인 (Interest 삭제 → Log 삭제)
- [ ] 타인 접근 404 확인

### 모바일 (Step 2-3 완료 기준)
- [ ] 관심사 목록 화면에서 depth_score가 숫자로 표시됨
- [ ] 관심사 추가 → 로그 기록 → depth_score 증가 확인 (3분 이내, 앱 첫 실행 기준)
- [ ] 빈 상태 CTA 노출

### 공유 카드 (Step 4 완료 기준)
- [ ] 540×960px PNG 생성 성공
- [ ] 관심사명, depth_score, @username, "niche.app" 텍스트 포함 확인
- [ ] 이미지를 기기 갤러리에 저장 가능

---

## Risks & Mitigations

| 리스크 | 영향도 | 대응 |
|--------|-------|------|
| `response_model=dict` 엔드포인트 alias 미적용 | 높음 | Step 0에서 스모크 테스트로 확인 후 response_model 명시 |
| SDK 55에서 react-native-view-shot 호환성 | 중간 | Step 4 시작 시 먼저 설치 테스트 |
| 수요 증거 부재 | 높음 | 이번 주 5명 DM (office-hours Assignment) |
| N+1 쿼리 (get_my_interests) | 낮음(MVP) | 알려진 tech debt로 기록, 유저 10명 이후 최적화 |

---

## Verification Steps

1. `make test` → 모든 테스트 통과 (레거시 + 신규 `test_interest_flow_memory.py`)
2. `curl GET /v1/me/interests` → JSON 키가 `startedAt`, `depthScore` (camelCase 확인)
3. 모바일 앱에서 관심사 추가 → 로그 추가 → depth_score 화면에 표시됨
4. Interest 삭제 → DB에서 related Log.deleted_at 값 확인
5. 공유 카드 PNG 생성 → 파일 크기 및 텍스트 포함 여부 수동 확인

---

## ADR (Architecture Decision Record)

**Decision:** Option A' — 백엔드 계약 하드닝(반나절) 후 프론트엔드 우선 진행

**Drivers:**
- camelCase 계약 위반이 프론트 전체에 O(n) rework 비용을 만듦
- 1인 개발자 모티베이션을 위해 동일 날 프론트 시작 가능해야 함

**Alternatives considered:**
- Option A (즉시 프론트): 계약 위반 상태에서 시작 → 기각
- Option B (테스트 우선): 수일 지연, 모티베이션 저하 → 기각

**Why chosen:** 반나절 투자로 계약 위반 제거 후 같은 날 프론트 시작 가능. 속도와 정확성의 균형점.

**Consequences:**
- 모든 Interest/Log 스키마가 CamelModel 상속으로 변경됨
- depth_score가 null 가능 타입으로 변경됨 (프론트 null 처리 필요)
- 레거시 테스트(highlight/session)와 신규 테스트(interest/log)가 공존

**Follow-ups:**
- N+1 쿼리 최적화 (유저 증가 후)
- react-native-view-shot → 서버사이드 렌더링 마이그레이션 (v2)
- Expo SDK 55 기준으로 CLAUDE.md 수정

---

## Changelog (v1 → v2)

- "백엔드 완료" → "기능 완료, 계약 미완"으로 정정
- camelCase alias 누락 이슈 명시 및 Step 0에 포함
- started_at/text 검증 이슈 명시
- depth_score null 처리 이슈 및 스펙 정정
- 테스트 파일 상태 정정 (레거시 도메인 전용임을 명시)
- Option A → Option A'로 변경 (계약 하드닝 스프린트 추가)
- Expo SDK 54 → 55 정정
- Expo Router 파일 경로 예시 추가
- 주관적 acceptance criteria 제거 (공유 카드 기준: PNG 생성 성공으로 변경)
