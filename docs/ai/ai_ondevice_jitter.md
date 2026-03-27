# NichE AI 확장 기획 — Jitter & On-Device LLM (v1, 2026-03)

## 문서 목적

이 문서는 NichE 서비스에 AI를 더 깊이 통합하는 방향에 대한 기획 결정사항을 기록한다.
현재 AI는 퀴즈 생성 보조 도구에 머물러 있으며, 이를 넘어 사용자의 취향 생활에 실질적으로 동반하는 AI 생태계를 구축하는 것이 목표다.

---

## 1. 배경 및 방향성

### 현재 AI 역할 (as-is)

- 세션 기록 기반 퀴즈 1문제 생성 (FastAPI → 외부 LLM API)
- 사용자 데이터는 서버를 경유함
- AI는 보조 점검 도구에 불과

### 목표 방향 (to-be)

> **AI가 사용자의 취향 생활에 깊이 관여하는 동반자가 되는 것.**

핵심 방향은 두 가지다.

1. **Jitter** — 앱 내 상시 AI 대화 봇. 취향과 관심사에 대해 언제든 이야기 나눌 수 있는 개인 AI 동반자.
2. **On-Device LLM** — 모델을 사용자 폰에 설치해 완전한 프라이버시와 오프라인 동작을 보장.

---

## 2. Jitter — AI 동반자 봇

### 개념

- 앱 우측 하단 플로팅 버튼으로 언제든 접근 가능
- 취향, 관심사, 세션 기록, 독서, 사유에 대해 자유롭게 대화
- NichE의 철학과 일치: "취향을 소비하는 것이 아니라 축적하는 경험"

### 핵심 차별점

일반 AI 챗봇이 아니다. **나를 아는 AI** 다.

- 사용자의 세션 기록, 블로그 글, 하이라이트를 컨텍스트로 활용
- "3주 전에 무라카미 하루키 세션 3개 연속으로 했었는데, 그때랑 뭐가 달라졌어?" 같은 대화가 가능

### 프라이버시

- 온디바이스 모델 사용 시 모든 대화와 데이터는 사용자 폰에만 존재
- 서버 전송 없음
- 마케팅 포인트: "내 취향 기록이 서버에 올라가지 않는다"

---

## 3. On-Device LLM 기술 스택

### 권장 라이브러리

**Primary: `llama.rn`**

- llama.cpp의 React Native 공식 바인딩
- iOS / Android 모두 지원
- GGUF 포맷 모델 직접 로드
- Expo SDK 54 호환 (New Architecture 기반)
- GPU 레이어 오프로딩 지원

**중장기: `react-native-executorch`** (Software Mansion)

- Meta ExecuTorch 기반, Instagram 내부 엔진
- `react-native-rag` (로컬 RAG) 생태계와 함께 성장 중
- Expo 공식 블로그 소개 라이브러리

### 권장 모델

**Qwen3-1.7B Q4_K_M**

| 항목 | 수치 |
|---|---|
| 파일 크기 | ~1.1GB |
| 런타임 RAM | ~1.6GB |
| 속도 (iPhone 14) | ~15–20 tok/s |
| 최소 기기 요건 | iPhone 12+ (RAM 4GB 이상) |

- Qwen3 전 모델은 GGUF 포맷으로 Hugging Face 공식 배포 중
- 한국어 지원 포함
- 취향/기록 대화 품질에 충분한 수준

> Qwen3-4B는 iPhone 15 Pro 이상에서만 안정적. 현 시점 기본 모델로는 부적합.
> Qwen3-8B 이상은 모바일에서 실행 불가.

### 모델 배포 방식

앱스토어/플레이스토어에 모델을 번들링하면 심사 거부된다.

**채택 방식: Post-install CDN 다운로드**

```
앱 설치 (앱 자체는 수십 MB)
  ↓
최초 실행 시 "오프라인 AI 활성화" 선택 옵션 제공
  ↓
Wi-Fi 권장 안내 + ~1.1GB 다운로드 (S3 / Cloudflare CDN)
  ↓
이후 완전 오프라인 동작
```

- 강제가 아닌 선택 기능으로 제공
- "한 번 받으면 평생 오프라인 무료"로 UX 마찰 최소화
- 선례: Private LLM 앱이 동일 방식으로 App Store 운영 중

---

## 4. 파생 AI 기능 아이디어

### 4.1 Personal RAG (핵심 장기 과제)

사용자의 세션 기록, 블로그 글, 하이라이트를 로컬 벡터 DB에 임베딩.
Jitter가 대화 시 이 데이터를 자동 컨텍스트로 활용.

```
사용자가 쌓은 기록 → 로컬 벡터 DB (SQLite 기반)
→ Jitter 대화 시 관련 기록 자동 검색
→ "나를 아는 AI" 경험
→ 완전 온디바이스, 서버 전송 없음
```

구현 스택: `react-native-rag` + `llama.rn`

### 4.2 Semantic Search

자연어로 내 기록을 검색하는 기능.

```
"외로움에 대해 내가 썼던 것 찾아줘"
"작년 여름 읽은 책 중 철학 관련 있었나?"

→ 키워드가 아닌 의미 기반 검색
→ 임베딩 벡터 유사도 검색, 완전 로컬
```

현재 NichE에 없는 기능. 아카이브의 가치를 크게 높인다.

### 4.3 Taste Profile 자동 추출

백그라운드(충전 중, 야간)에 온디바이스 분석.

```
누적 세션 + 블로그 글 → 온디바이스 분석
→ "당신의 취향 DNA: 고독한 내면 독백, 70~90년대 일본 소설, 도시 속 단절 테마"
→ 프로필 카드 / 공유 템플릿으로 활용 가능
→ 데이터는 폰에만 존재
```

### 4.4 Adaptive Quiz (현재 기능 진화)

```
현재: 서버가 퀴즈 생성 → 1문제
진화: 온디바이스 Qwen3
   + 과거 퀴즈 결과를 RAG context로 주입
   → "지난번에 이 개념을 틀렸는데, 다시 확인해볼게요"
   → 오프라인 동작, 즉각적 응답
```

---

## 5. 주목할 기술 (2025 기준)

| 기술 | 설명 | NichE 관련성 |
|---|---|---|
| **Apple Foundation Models** (iOS 26+) | Apple이 ~3B 온디바이스 모델을 OS에 내장. API로 호출 가능 | 2026년 이후 전략 옵션. 한국 지원 여부 미정 |
| **Android Gemini Nano** | Pixel 9, Galaxy S25 등 플래그십에 내장 | 기기 파편화 심각. 보조 전략만 가능 |
| **react-native-rag** | Software Mansion labs, ExecuTorch 기반 로컬 RAG | Personal RAG 구현의 핵심 라이브러리 |
| **MobileRAG** | 모바일 특화 RAG 시스템 논문 (2025). 저전력·저RAM 최적화 | react-native-rag 의 기술적 기반 |
| **EmbeddingGemma** (308M) | Google 온디바이스 특화 임베딩 모델 | Semantic Search 구현 시 활용 가능 |

---

## 6. 구현 로드맵

### Phase 0 — 현재 (MVP 완성 전)

- 현재 구조 유지: FastAPI + 외부 LLM API
- Jitter는 클라우드 기반으로 먼저 구현해 UX 검증
- 온디바이스 전환 없음

### Phase 1 — MVP 이후 (3–6개월)

- `llama.rn` + Qwen3-1.7B Q4_K_M 통합
- "오프라인 AI 활성화" 선택 옵션 (강제 아님)
- Jitter 기본 대화 기능 (온디바이스)
- 하이브리드: 온디바이스 다운로드 전이면 클라우드 fallback

### Phase 2 — 중기 (6–12개월)

- `react-native-rag` 통합
- 내 세션 + 블로그 기록 → 로컬 벡터 DB 임베딩
- Jitter가 "나를 아는" 경험으로 진화 (Personal RAG)
- Adaptive Quiz 온디바이스 전환

### Phase 3 — 장기 (12개월+)

- Semantic Search (자연어 기록 검색)
- Taste Profile 자동 추출
- Apple Foundation Models 통합 검토 (iOS 26 이상 전용)

---

## 7. 아키텍처 원칙

- **온디바이스는 강제가 아닌 선택** — 다운로드를 원하지 않는 사용자는 클라우드로 동작
- **클라우드 fallback 항상 유지** — 기기 요건 미달, 미다운로드 상태에서 graceful degradation
- **8B 이상 모델 모바일 탑재 금지** — RAM 물리적 제약으로 사실상 불가
- **Apple Foundation Models는 지금 primary 전략으로 삼지 않는다** — iOS 26 전용, 한국 지원 불확실

---

## 8. 열려 있는 것

- Jitter 페르소나 / 톤 / 이름 최종 확정
- 온디바이스 vs 클라우드 기본값 UX 결정
- 모델 CDN 서버 비용 구조
- Personal RAG 구현 시점 (Phase 2 이전 앞당길 가능성)
- Apple Foundation Models 한국 지원 여부 확정 시 전략 재검토
