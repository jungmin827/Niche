# NichE Design System v1

## 문서 목적
이 문서는 **NichE 앱의 시각적 기준과 UI 구현 규칙**을 정의하는 디자인 시스템 문서이다.
Codex, Cloud Code, 디자이너, 프론트엔드 구현 에이전트가 이 문서만 읽고도 다음을 이해할 수 있도록 작성한다.

- NichE가 어떤 무드와 브랜드 인상을 가져야 하는지
- 어떤 타이포그래피, 컬러, 여백 체계를 써야 하는지
- 카드, 탭, 입력창, 버튼, 블로그, 하이라이트가 어떤 스타일로 구현되어야 하는지
- 무엇을 하지 말아야 하는지
- 초기 MVP에서 어떤 수준까지 디자인 시스템을 고정해야 하는지

이 문서는 시안 모음이 아니라 **제품 UI/브랜드 구현의 기준서**다.
상위 기획 기준은 `niche_planning_v1.md`, 프론트 구조 기준은 `frontend_app.md`를 따른다.

---

## 1. 디자인 철학

NichE의 디자인은 화려함보다 **정제된 무드와 깊이 있는 인상**을 우선한다.
사용자가 앱을 열었을 때 떠올라야 하는 감정은 다음과 같다.

- 조용한 몰입
- 현대적인 편집샵
- 흑백 사진집
- 절제된 에디토리얼 디자인
- 취향 있는 사람이 정리한 개인 아카이브

NichE는 생산성 앱처럼 보이면 안 된다.
또한 전형적인 SNS처럼 보이면 안 된다.
NichE는 **콘텐츠 소비를 자극하는 인터페이스**가 아니라, **사유와 축적을 정리해 보여주는 인터페이스**여야 한다.

### 디자인 한 줄 원칙
> **Black & White Editorial Minimalism for Deep Taste.**

---

## 2. 핵심 브랜드 키워드

### 반드시 살아야 하는 키워드
- Modern
- Minimal
- Editorial
- Archive
- Quiet
- Structured
- Tasteful

### 피해야 하는 키워드
- 귀여움
- 과한 따뜻함
- 밝고 통통 튀는 SNS 무드
- 게이미피케이션 과장 표현
- 생산성 툴 같은 기능주의 시각언어
- 네온/글래스모피즘/그라디언트 중심 표현

---

## 3. 시각적 방향성 요약

NichE의 시각적 방향은 다음 4가지로 요약한다.

1. **블랙 앤 화이트 중심**
   - 순도 높은 흑백과 제한된 그레이 스케일을 사용한다.
   - 포인트 컬러는 MVP에서 두지 않거나 극도로 제한한다.

2. **헬베티카 계열 타이포 중심**
   - 텍스트 자체가 시각적 정체성의 핵심이다.
   - 장식보다 활자 배치와 여백으로 분위기를 만든다.

3. **큰 여백과 또렷한 정보 위계**
   - 화면이 꽉 차 보이면 안 된다.
   - 카드와 텍스트는 숨을 쉬는 느낌이 있어야 한다.

4. **편집샵/독립서점/매거진 같은 레이아웃 감도**
   - 상품 진열이 아니라 콘텐츠 편집처럼 보여야 한다.
   - UI 구성요소가 많아도 표면적으로는 조용해 보여야 한다.

---

## 4. 타이포그래피 시스템

## 4.1 기본 원칙
타이포그래피는 NichE 디자인의 중심이다.
텍스트는 정보를 전달하는 도구이면서 동시에 브랜드 인상을 만든다.

원칙:
- 한 화면에 너무 많은 폰트 스타일을 쓰지 않는다.
- 폰트 굵기 차이보다 크기와 여백으로 위계를 만든다.
- 제목은 짧고 단정하게, 본문은 읽기 좋게 유지한다.
- 대문자 남용을 피한다.
- 영문 랭크/칭호는 타이포만으로도 브랜딩이 되게 한다.

## 4.2 폰트 방향
### 브랜드 의도
- Helvetica / Helvetica Neue 계열 감도
- 모던하고 차가운 편집 디자인 무드

### 구현 권장
초기 MVP에서는 다음 우선순위를 따른다.

1. **Helvetica Neue 또는 라이선스가 확보된 유사 서체 사용**
2. iOS에서는 시스템 산세리프를 최대한 헬베티카 무드에 가깝게 사용
3. Android에서는 시각적으로 이질감이 적은 대체 산세리프 사용

### 구현 원칙
- 폰트 라이선스 문제가 있으면 무리해서 번들링하지 않는다.
- MVP에서는 **"헬베티카 그 자체"보다 "헬베티카적 인상"**을 우선한다.
- 디자인 시스템에서 말하는 “Helvetica”는 우선 **브랜드 방향**이다.

### MVP font implementation decision (fixed)
For MVP, the app should **not** bundle Helvetica or other licensed custom fonts by default.
The fixed strategy is:

- Keep **Helvetica / Helvetica Neue** as the brand and visual reference.
- Implement the MVP with **platform system fonts** that approximate the Helvetica mood.
- Prioritize **clean spacing, restrained weight usage, and editorial composition** over exact font matching.
- Revisit custom font bundling only after product validation, when licensing, performance, and visual QA can be handled properly.

Recommended implementation guidance:
- iOS: prefer the native system sans-serif stack closest to the desired mood.
- Android: use the default system sans-serif or an approved neutral sans-serif fallback.
- Web preview / design references: Helvetica-inspired styling is acceptable, but production mobile UI must remain license-safe.

This means the MVP design goal is **Helvetica-like impression**, not literal Helvetica deployment.

## 4.3 타입 스케일
권장 타입 스케일은 아래를 기준으로 한다.

- Display: 40 / 44
- Hero Title: 32 / 38
- H1: 28 / 34
- H2: 24 / 30
- H3: 20 / 26
- Title: 18 / 24
- Body: 16 / 24
- Body Small: 14 / 20
- Caption: 12 / 18
- Micro: 11 / 16

### 권장 사용처
- Display / Hero: 온보딩, 세션 완료, 랭크/칭호 강조
- H1 / H2: 주요 섹션 제목
- Title: 카드 상단, 글 제목, 하이라이트 제목
- Body: 본문, 설명, 노트 입력
- Caption / Micro: 메타데이터, 타임스탬프, 보조 정보

## 4.4 숫자와 시간 표기
세션 시간, 점수, 랭크 등 숫자 데이터는 브랜드 경험에서 중요하다.
따라서 숫자 표시는 다음 원칙을 따른다.

- 숫자는 시각적으로 안정적이고 크게 보여준다.
- 타이머는 화면 중앙에 또렷하게 배치한다.
- 점수는 과하게 화려하게 만들지 않는다.
- 15m, 45m 같은 시간 단위는 미니멀하게 표기한다.

---

## 5. 컬러 시스템

## 5.1 기본 컬러 원칙
NichE는 기본적으로 **모노톤 기반 시스템**을 사용한다.
MVP에서는 컬러를 브랜드 주인공으로 두지 않는다.
브랜드 주인공은 **타이포와 여백**이다.

## 5.2 기본 팔레트
아래는 권장 토큰이다.

- `bg.primary`: `#FFFFFF`
- `bg.secondary`: `#F6F6F4`
- `bg.tertiary`: `#EFEFEA`
- `surface.primary`: `#FFFFFF`
- `surface.inverse`: `#111111`
- `line.primary`: `#111111`
- `line.secondary`: `#D9D9D4`
- `text.primary`: `#111111`
- `text.secondary`: `#555555`
- `text.tertiary`: `#8A8A84`
- `text.inverse`: `#FFFFFF`
- `overlay`: `rgba(0,0,0,0.4)`

## 5.3 다크 모드 원칙
NichE는 블랙 앤 화이트 무드를 가지지만, MVP의 기본 기준 화면은 **라이트 모드**다.
다크 모드는 추후 대응 가능하나, 초기 구현에서는 다음 중 하나를 택한다.

- 앱 전체는 라이트 기반으로 유지
- 일부 공유 템플릿만 다크 스타일 제공

즉, “블랙 앤 화이트”는 곧바로 “다크 모드 앱”을 뜻하지 않는다.

## 5.4 포인트 컬러 정책
MVP에서는 포인트 컬러를 최소화한다.
필요시 아래 둘 중 하나만 제한적으로 사용한다.

- 아주 짙은 그린 또는 네이비
- 아주 옅은 웜 그레이

그러나 이 컬러는 버튼/배지/점수 강조에 남용하지 않는다.
초기 MVP에서는 **무포인트 컬러** 전략이 더 적합하다.

---

## 6. 공간과 레이아웃 시스템

## 6.1 여백 철학
NichE의 여백은 단순한 padding이 아니다.
여백은 브랜드의 조용함과 몰입을 만드는 핵심 요소다.

원칙:
- 카드 안 여백은 넉넉해야 한다.
- 섹션 사이 간격은 명확하게 둔다.
- 화면 상단 헤더는 답답하지 않게 설계한다.
- 한 화면에서 시선이 머무를 포인트를 1~2개로 제한한다.

## 6.2 spacing scale
권장 spacing 토큰:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64

### 규칙
- 기본 카드 padding: 20 또는 24
- 섹션 간격: 24~32
- 대형 섹션 전환: 40 이상
- 타이머/히어로 블록: 32~48 여백

## 6.3 레이아웃 감도
- 1열 구조를 기본으로 한다.
- 카드 폭은 너무 넓지 않게 느껴져야 한다.
- 피드 카드도 “콘텐츠 소비 타일”보다 “편집 노트”처럼 보여야 한다.
- 화면 하단 탭은 존재감이 너무 강하면 안 된다.

---

## 7. 표면(Surface)과 카드 스타일

## 7.1 표면 원칙
NichE의 표면은 과장된 그림자보다 **구조와 선**으로 구분한다.

원칙:
- 큰 그림자를 피한다.
- 경계선 또는 미세한 명도 차이로 블록을 나눈다.
- 카드가 너무 떠 보이지 않게 한다.

## 7.2 카드 규칙
- 배경은 흰색 또는 매우 옅은 회색
- 모서리는 14~20 radius
- 그림자는 거의 없거나 매우 약하게
- 경계선은 1px 수준의 옅은 선
- 텍스트가 카드 안에서 안정적으로 정렬되어야 함

## 7.3 카드 유형
### 세션 카드
- 시간, 주제, 상태를 단정하게 보여준다.
- “지금 시작” 또는 “다음 세션”의 정보 위계가 명확해야 한다.

### 블로그 카드
- 제목, 짧은 본문 미리보기, 날짜
- 사진은 선택 사항이며, 사진 없이도 완성된 카드처럼 보여야 한다.

### 하이라이트 카드
- 최종 렌더 이미지가 중심
- 카드 아래에 세션 메타 정보 최소 표기
- 지나치게 SNS 포스트처럼 보이면 안 된다.

### 피드 카드
- 하이라이트와 블로그가 섞여 보여도 톤이 무너지지 않아야 한다.
- 작성자보다 콘텐츠 인상을 먼저 보여준다.

---

## 8. 컴포넌트 스타일 가이드

## 8.1 버튼
버튼은 화려한 CTA보다 편집된 기능 버튼처럼 보여야 한다.

### Primary Button
- 검은 배경 + 흰 텍스트
- 과도한 라운드 금지
- 높이는 48~52
- 텍스트는 짧고 또렷하게

### Secondary Button
- 흰 배경 + 검은 선
- 배경 채움보다 outline 계열 우선

### Ghost Button
- 배경 없음
- 텍스트 중심
- 삭제/취소/건너뛰기 같은 보조 행동에 적합

## 8.2 입력창
입력창은 생산성 앱처럼 보이지 않게 해야 한다.

원칙:
- 모서리는 부드럽지만 지나치게 둥글지 않게
- 배경은 흰색 또는 매우 옅은 회색
- 경계선은 명확하지만 조용하게
- placeholder는 보조 텍스트처럼 절제해서 사용

### 사용처
- 세션 노트 입력
- 블로그 본문 입력
- 제목 입력
- 퀴즈 답변 입력

## 8.3 탭 바
- 하단 탭은 3개: 세션 / 피드 / 아카이브
- 탭 아이콘은 선형(linear) 또는 극도로 단순한 형태
- 레이블은 짧고 안정적이어야 한다.
- 선택 상태는 컬러보다 명도와 두께로 구분한다.

## 8.4 배지와 상태 라벨
배지는 최소 사용한다.
랭크나 상태는 과장된 칩 UI보다 **텍스트 라벨**처럼 처리하는 것이 낫다.

예:
- `Focus`
- `Archive Ready`
- `3 / 3 Sessions Complete`

---

## 9. 화면별 시각 가이드

## 9.1 세션 화면
세션 화면은 NichE의 심장이다.
따라서 가장 미니멀하고 몰입감 있어야 한다.

구성 원칙:
- 타이머가 가장 큰 시각 요소
- 주변 정보는 최소화
- 현재 세션 주제는 또렷하게
- 불필요한 아이콘/장식 제거
- 종료 후 회고 입력으로 자연스럽게 이어지게 설계

### 키워드
- Quiet
- Focused
- Clean
- Spatial

## 9.2 피드 화면
피드는 일반 SNS보다 훨씬 조용해야 한다.

원칙:
- 한 화면에 너무 많은 카드 종류를 섞지 않는다.
- 글, 이미지, 하이라이트가 섞여도 정돈된 편집면처럼 보여야 한다.
- 좋아요 수, 반응 수 같은 소셜 신호는 MVP에서 전면 노출하지 않는다.

## 9.3 아카이브 화면
아카이브는 개인의 세계관이 쌓여 있는 공간처럼 보여야 한다.

원칙:
- 블로그 리스트와 하이라이트 섹션이 함께 있어도 혼잡하지 않아야 한다.
- 정보량이 많아질수록 더 절제된 그리드가 필요하다.
- “수집함”이 아니라 “편집된 개인 기록관”처럼 보이게 한다.

## 9.4 블로그 상세 화면
- 읽기 경험 우선
- 본문 줄 길이, 줄간격, 단락 간격을 안정적으로 유지
- 본문 주변 장식 최소화
- 공유/저장보다 읽기 흐름이 우선

## 9.5 하이라이트 생성 화면
- 사진 선택
- 템플릿 선택
- 카피/메타 미세 수정
- 최종 렌더 미리보기

이 화면은 일반 편집툴보다 훨씬 단순해야 한다.
사용자가 “디자인을 만든다”기보다 “잘 편집된 결과를 고른다”는 느낌을 받아야 한다.

---

## 10. 공유 템플릿 무드 가이드

하이라이트/스토리 공유 템플릿은 NichE를 외부 세계에 보여주는 포스터 역할을 한다.
따라서 일반 앱 UI보다 조금 더 브랜딩된 표현을 허용한다.

원칙:
- 헬베티카 계열 큰 타이포
- 흑백 사진 또는 절제된 배경 이미지
- 텍스트는 적고 강하게
- 정보는 3~4개 이하
- 사용자의 취향 행위를 포스터처럼 보이게 함

### 템플릿에 들어갈 수 있는 정보 예시
- 세션 시간
- 주제 또는 책 제목
- 한 줄 회고
- 랭크/칭호
- 날짜

### 금지사항
- 과도한 스티커
- 화려한 장식
- 밈 같은 문구
- 다색 그래픽
- 생산성 앱 리포트처럼 보이는 차트 남용

---

## 11. 이미지와 사진 사용 원칙

NichE의 사진은 인플루언서 SNS 감도보다 **관찰 기록 / 사적인 장면 / 조용한 무드**가 중요하다.

원칙:
- 대비가 지나치게 강한 보정은 피한다.
- 사진 없이도 완성된 UI가 되어야 한다.
- 사진이 있으면 더 좋아지되, 없어도 어색하지 않아야 한다.
- 텍스트와 사진이 경쟁하면 안 된다.

---

## 12. 모션 원칙

NichE의 모션은 눈에 띄기보다 안정감을 줘야 한다.

원칙:
- 빠르고 과한 spring 애니메이션 지양
- fade, slide, gentle scale 위주
- 세션 완료 전환은 조금 더 의식적인 리듬 허용
- 탭 전환은 조용하고 즉각적이어야 함

모션 키워드:
- Subtle
- Smooth
- Low-noise
- Intentional

---

## 13. 접근성과 사용성 원칙

미니멀하더라도 사용성이 희생되면 안 된다.

원칙:
- 본문 텍스트는 최소 14 이상
- 기본 body는 16 권장
- 버튼 터치 영역 충분히 확보
- 대비는 WCAG 기준에 어긋나지 않게 유지
- 타이머, 저장, 종료, 게시 같은 핵심 행동은 즉시 인식 가능해야 함

---

## 14. 구현용 디자인 토큰 초안

```ts
export const colors = {
  bg: {
    primary: '#FFFFFF',
    secondary: '#F6F6F4',
    tertiary: '#EFEFEA',
  },
  surface: {
    primary: '#FFFFFF',
    inverse: '#111111',
  },
  text: {
    primary: '#111111',
    secondary: '#555555',
    tertiary: '#8A8A84',
    inverse: '#FFFFFF',
  },
  line: {
    primary: '#111111',
    secondary: '#D9D9D4',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  hero: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
};

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '500' },
  hero: { fontSize: 32, lineHeight: 38, fontWeight: '500' },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '500' },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '500' },
  h3: { fontSize: 20, lineHeight: 26, fontWeight: '500' },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
};
```

---

## 15. MVP 범위에서 꼭 필요한 컴포넌트 목록

- AppScreen
- AppHeader
- SectionHeader
- PrimaryButton
- SecondaryButton
- GhostButton
- TextInputField
- MultilineInputField
- SessionTimer
- SessionCard
- BlogCard
- HighlightCard
- FeedCard
- EmptyStateBlock
- RankLabel
- Divider
- BottomTabBar
- ModalSheet
- TemplatePreviewCard

---

## 16. 구현 시 하지 말아야 할 것

- UI 라이브러리 기본 스타일을 그대로 쓰지 않는다.
- 과한 그림자, 과한 radius, 과한 컬러를 쓰지 않는다.
- 모든 화면에 카드와 라벨을 과도하게 배치하지 않는다.
- 너무 많은 아이콘을 쓰지 않는다.
- 텍스트 위계를 색으로만 해결하지 않는다.
- “예쁨”을 위해 읽기성과 입력 편의성을 희생하지 않는다.

---

## 17. 후속 결정이 필요한 항목

현재 기준에서 디자인 시스템의 큰 방향은 고정되었지만, 아래는 후속 문서 또는 실제 시안 단계에서 확정하면 된다.

1. 실제 사용 폰트 파일/라이선스 전략
2. 다크 모드 도입 여부
3. 하이라이트 템플릿 1차 세트(3종 또는 5종)
4. 세션 완료/점수 화면의 비주얼 강도
5. 블로그 커버 이미지 사용 강도

---

## 18. 최종 요약

NichE의 디자인은 다음처럼 기억하면 된다.

- **헬베티카 계열의 에디토리얼 감도**
- **블랙 앤 화이트 중심의 절제된 시각 언어**
- **큰 여백과 조용한 정보 위계**
- **편집샵 / 독립서점 / 사진집 같은 모던한 분위기**
- **기록과 취향을 전시하듯 정리하는 UI**

NichE는 시끄럽게 눈에 띄는 앱이 아니라,
**조용하지만 한 번 보면 결이 느껴지는 앱**이어야 한다.
