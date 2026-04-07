# TODOS

## Share Card v2: Server-side Rendering

**What:** `react-native-view-shot` 대신 FastAPI에서 OG 이미지 서버사이드 생성 (Playwright 또는 html2image)

**Why:** 디바이스마다 렌더링이 달라질 수 있어 공유 카드 일관성 부족 → 인스타 공유 시 품질 저하 → 바이럴 효과 직결

**Pros:** 일관된 카드 품질, 썸네일 미리보기 가능, 소셜 OG 태그 활용 가능

**Cons:** 서버 의존성 증가, Playwright 헤비 의존성, 구현 복잡도 높음

**Context:** MVP v1은 react-native-view-shot으로 클라이언트 캡처 고정. 실제 공유 빈도와 품질 불만 데이터 수집 후 v2 전환 판단.

**Blocked by:** MVP v1 안정화 + 실제 공유 지표 수집 후

---

## Depth Score v2: 질적 요소 추가

**What:** 현재 `log10(days+1) × log10(count+2)` 정량 공식에 질적 요소 추가 (기록 길이, 사진/링크 첨부 여부)

**Why:** 현재 공식은 오래 + 많이 쓴 것만 보상. 짧고 예리한 기록이 긴 메모보다 낮은 점수를 받는 구조적 한계.

**Pros:** 더 공정한 depth 측정, 양질의 기록 유도

**Cons:** 공식 복잡화 → 사용자가 이해하기 어려워짐, v1 데이터와 점수 단절

**Context:** MVP에서 실제 기록 데이터가 쌓인 후 패턴 분석 → 보정 공식 설계. 섣불리 추가하면 gameable 요소만 늘어남.

**Blocked by:** MVP 사용 데이터 최소 3개월치

---

## 소셜 레이어 v2: 다른 유저 프로필 탐색

**What:** 타 유저의 공개 관심사/Depth 점수 탐색 기능. 공개 프로필 페이지 + 팔로우 없는 단방향 탐색.

**Why:** 공유 카드에 niche.app 워터마크 → 유입 발생 시 탐색할 공간 필요. 소셜 레이어 없으면 유입이 앱 설치 → 빈 피드로 끝남.

**Pros:** 유입 전환율 상승, 네트워크 효과 시작

**Cons:** 공개 콘텐츠 모더레이션 필요, 검색/추천 복잡도 증가

**Context:** MVP는 단독 사용 (single-player). 실제 공유 카드 통해 유입이 발생하는 시점 이후에 진행.

**Blocked by:** MVP 공개 후 실제 유입 발생 확인
