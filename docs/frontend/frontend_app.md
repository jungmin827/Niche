# NichE Frontend App Spec v1

## 문서 목적
이 문서는 **NichE 모바일 프론트엔드 구현의 기준 문서**이다.
Codex, Cloud Code, 기타 코딩 에이전트가 이 문서만 읽고도 다음을 이해할 수 있도록 작성한다.

- 어떤 기술 스택으로 시작할지
- 어떤 폴더 구조와 아키텍처를 사용할지
- 세션 / 피드 / 아카이브를 어떤 화면과 상태로 구현할지
- FastAPI / Supabase와 어떻게 연결할지
- MVP에서 무엇을 만들고 무엇을 미룰지

이 문서는 UI 시안 문서가 아니라 **실제 구현 지시문**에 가깝다.
기획 방향은 `niche_planning_v1.md`를 상위 문서로 삼고, 프론트 구현에 필요한 수준까지 구체화한다.

---

## 1. 프론트엔드의 역할

NichE 프론트엔드는 단순 API 소비 계층이 아니다.
앱은 NichE의 핵심 경험을 직접 만들어내는 레이어다.

프론트엔드가 책임지는 핵심은 다음과 같다.

1. **세션 경험**
   - 몰입 시작
   - 타이머 진행
   - 세션 종료
   - 세션 회고 입력

2. **감각적인 기록 표현**
   - 하이라이트 카드
   - 공유 템플릿 미리보기
   - 아카이브 레이아웃

3. **개인 세계관의 축적 UX**
   - 블로그 리스트/상세
   - 하이라이트 보관 구조
   - 프로필/정체성 표현

4. **소셜 탐색 경험**
   - 피드 리스트
   - 유저/콘텐츠 탐색
   - 반응/저장 같은 가벼운 상호작용(팔로우는 MVP 제외)

5. **앱 상태와 네비게이션의 정리**
   - 인증 여부에 따른 라우팅
   - 세션 중 상태 유지
   - draft 및 임시 저장 처리

즉, NichE의 프론트는 “API 화면 붙이기”가 아니라 **서비스의 분위기와 핵심 행동을 직접 구현하는 제품 레이어**다.

---

## 2. 프론트엔드 핵심 원칙

### 2.1 제품 원칙
- 모바일 앱 우선으로 개발한다.
- iOS 감도에 특히 신경 쓰되 Android도 정상 지원한다.
- 웹 호환은 우선순위가 아니다.
- 기능 수보다 **세션 경험과 템플릿 결과물의 완성도**를 우선한다.
- 화려한 인터랙션보다 조용하고 정제된 인터랙션을 택한다.

### 2.2 구현 원칙
- **Expo managed workflow**를 기본으로 한다.
- React Native 네이티브 코드는 가능한 한 늦게 도입한다.
- UI 프레임워크 의존도를 낮추고, 핵심 컴포넌트는 직접 만든다.
- 전역 상태는 최소화하고, 서버 상태와 로컬 상태를 분리한다.
- 라우팅/상태/폼/검증/데이터 fetching 라이브러리는 널리 쓰이고 문서가 좋은 조합을 쓴다.
- 에이전트가 이해하기 쉽게 **규칙이 있는 폴더 구조**를 사용한다.

### 2.3 비기능 원칙
- 앱 초기 진입 속도는 빠르게 유지한다.
- 세션 화면에서는 프레임 드랍이 없어야 한다.
- 공유 템플릿 캡처는 실패율이 낮아야 한다.
- 오프라인이나 네트워크 불안정 상황에서 draft 유실을 막아야 한다.

---

## 3. 권장 기술 스택 (확정안)

## 3.1 앱 프레임워크
- **Expo + React Native + TypeScript**
- Expo Router 기반 파일 라우팅 사용

선정 이유:
- Expo는 앱 개발/실기기 테스트/배포 파이프라인을 빠르게 시작하기 좋다.
- Expo Router는 파일 기반 라우팅을 제공하고 Expo 프로젝트에서 권장되는 경로다.
- TypeScript strict mode로 에이전트와 사람이 함께 다루기 쉬운 코드베이스를 만든다.

## 3.2 상태/데이터 계층
- **TanStack Query**: 서버 상태 관리
- **Zustand**: 로컬 UI 상태/에페메럴 상태
- **React Hook Form + Zod**: 폼 상태 및 검증

선정 이유:
- 서버 응답 캐시/재요청/무한 스크롤/낙관적 갱신은 TanStack Query가 가장 안정적이다.
- 전역 상태까지 React Context로 몰아넣지 않고, 세션 상태나 compose modal 상태 같은 로컬 앱 상태는 Zustand로 단순하게 관리한다.
- 입력 폼은 블로그 작성, 세션 회고, 프로필 수정처럼 형태가 명확해서 RHF + Zod 조합이 적합하다.

## 3.3 인증/백엔드 연동
- **Supabase JS client**: Auth 세션 관리 및 필요한 경우 직접 조회
- **FastAPI REST API**: 앱의 핵심 비즈니스 로직 API
- 프론트는 FastAPI를 기본 API로 보고, Supabase는 Auth와 일부 직접 기능에서만 사용한다.

권장 원칙:
- 앱은 **모든 도메인 데이터의 진실 원천(source of truth)** 으로 FastAPI를 본다.
- Supabase는 프론트에서 직접 남용하지 않는다.
- 프론트가 Supabase와 직접 통신하는 영역은 최대한 아래로 한정한다.
  - 인증 세션 획득/복원
  - 프로필 이미지 업로드 같은 제한적 스토리지 사용
- 세션, 피드, 아카이브, 블로그, 랭크 관련 데이터는 FastAPI 경유를 기본으로 한다.

## 3.4 스타일링
- **NativeWind**를 기본 스타일링 수단으로 사용
- 복잡한 애니메이션/동적 스타일/측정 로직이 필요한 곳만 `StyleSheet` 또는 inline style 병행
- 디자인 토큰은 별도 `theme/` 디렉토리에서 관리

선정 이유:
- 1인 개발 + 에이전트 협업 기준에서 반복 UI를 빠르게 만들기 좋다.
- 에디토리얼/모노크롬 톤을 utility class로 일관되게 맞추기 쉽다.
- 단, 앱 전체를 utility class만으로 해결하려 하지 말고, 공통 컴포넌트에 스타일을 캡슐화한다.

## 3.5 보조 라이브러리
- `react-native-reanimated`: 화면 전환/하단 시트/미세 모션
- `react-native-gesture-handler`: 제스처
- `expo-haptics`: 세션 시작/종료, 저장, 랭크업 등 촉각 피드백
- `expo-sharing`: 외부 공유
- `react-native-view-shot`: 템플릿 캡처
- `expo-image`: 이미지 최적화
- `@react-native-async-storage/async-storage`: draft 캐시 및 일부 persist
- `expo-secure-store`: 민감 세션 토큰 보조 저장이 필요한 경우

## 3.6 의도적으로 제외하는 것
초기 MVP에는 아래를 넣지 않는다.

- 거대한 UI kit
- Redux Toolkit
- GraphQL/Apollo
- WebView 중심 템플릿 렌더러
- 복잡한 오프라인 싱크 엔진
- 과도한 모션 라이브러리 난립
- 서버 컴포넌트/SSR/Web 최적화 중심 설계

---

## 4. 프론트 아키텍처 한 줄 요약

> **Expo Router 기반의 모바일 앱에서, 서버 상태는 TanStack Query로 관리하고, 로컬 UI 상태는 Zustand로 분리하며, 도메인별 feature module 구조로 구현한다.**

---

## 5. 디렉토리 구조 (권장안)

```text
frontend/
  app/
    _layout.tsx
    index.tsx
    (auth)/
      _layout.tsx
      welcome.tsx
      sign-in.tsx
      onboarding.tsx
    (tabs)/
      _layout.tsx
      session/
        index.tsx
        active.tsx
        complete.tsx
        [sessionId].tsx
      feed/
        index.tsx
        [postId].tsx
        user/[userId].tsx
      archive/
        index.tsx
        blog/[postId].tsx
        highlight/[highlightId].tsx
    (modals)/
      blog-compose.tsx
      session-note.tsx
      share-preview.tsx
  src/
    api/
      client.ts
      auth.ts
      session.ts
      feed.ts
      archive.ts
      blog.ts
      profile.ts
    components/
      ui/
        AppText.tsx
        AppButton.tsx
        AppInput.tsx
        AppSheet.tsx
        AppCard.tsx
        AppAvatar.tsx
        AppEmpty.tsx
        AppLoader.tsx
      layout/
        Screen.tsx
        TopBar.tsx
        TabHeader.tsx
      session/
        SessionTimer.tsx
        SessionStartCard.tsx
        SessionSummaryCard.tsx
        SessionNoteForm.tsx
        SessionStreakCard.tsx
      feed/
        FeedCard.tsx
        FeedFilterBar.tsx
      archive/
        BlogListItem.tsx
        HighlightCard.tsx
        ArchiveHero.tsx
      share/
        ShareTemplateA.tsx
        ShareTemplateB.tsx
        SharePreview.tsx
    features/
      auth/
        hooks.ts
        store.ts
        types.ts
      session/
        hooks.ts
        store.ts
        queries.ts
        mutations.ts
        types.ts
        utils.ts
      feed/
        hooks.ts
        queries.ts
        types.ts
      archive/
        hooks.ts
        queries.ts
        types.ts
      blog/
        hooks.ts
        mutations.ts
        queries.ts
        types.ts
      profile/
        hooks.ts
        queries.ts
        types.ts
      share/
        capture.ts
        helpers.ts
        types.ts
    hooks/
      useAuthGuard.ts
      useKeyboard.ts
      useDebouncedValue.ts
      useAppStateRefresh.ts
    lib/
      supabase.ts
      queryClient.ts
      env.ts
      logger.ts
      date.ts
      error.ts
    theme/
      colors.ts
      spacing.ts
      typography.ts
      radius.ts
      shadows.ts
      tokens.ts
    constants/
      queryKeys.ts
      routes.ts
    types/
      api.ts
      common.ts
    providers/
      AppProviders.tsx
  assets/
    images/
    icons/
    fonts/
  package.json
  app.json
  eas.json
```

### 구조 원칙
- `app/`은 **라우트 진입점**만 둔다.
- 실제 구현 로직은 `src/features`, `src/components`, `src/api`에 둔다.
- 라우트 파일에 비즈니스 로직을 과도하게 넣지 않는다.
- 공통 UI 컴포넌트와 도메인 전용 컴포넌트를 분리한다.
- API 호출 함수와 Query hook을 같은 파일에 섞지 않는다.

---

## 6. 네비게이션 구조

NichE의 공식 탭 구조는 아래 3개다.

- **세션**
- **피드**
- **아카이브**

Expo Router의 route group으로 다음 구조를 권장한다.

### 6.1 최상위 그룹
- `(auth)`: 로그인/온보딩
- `(tabs)`: 실제 앱 진입 후 하단 탭
- `(modals)`: 작성/공유/상세 액션용 모달

### 6.2 화면 흐름

#### 인증 전
- welcome
- sign-in
- onboarding

#### 인증 후
- 탭 진입: session / feed / archive

#### 모달/서브 플로우
- session note 작성
- blog compose
- share preview
- highlight 상세
- feed post 상세

### 6.3 라우팅 원칙
- **탭은 3개만 유지**하고, 작성/공유/세부 동작은 modal/push screen으로 해결한다.
- 세션 진행 중에는 사용자가 다른 탭으로 가도 **세션 상태가 유실되지 않아야 한다**.
- 인증이 필요한 화면은 `useAuthGuard`로 보호한다.
- deep link는 나중에 열어두되, MVP에서는 내부 라우팅 안정성을 우선한다.

---

## 7. 화면 스펙 (MVP 기준)

## 7.1 Auth

### Welcome
목적:
- 앱의 정서를 전달
- 로그인 진입

필수 요소:
- 브랜드 카피
- 세션/기록/아카이브 시각 예시 1~2개
- 로그인 CTA
- 약관/개인정보 처리 링크 자리

### Sign-in
권장 MVP 방식:
- 이메일 OTP 또는 magic link 중심
- 소셜 로그인은 추후 도입 가능

필수 요소:
- 이메일 입력
- 인증 코드 또는 링크 안내
- 오류 상태
- loading state

### Onboarding
목적:
- 서비스 톤 이해
- 초기 취향 태그 설정
- 닉네임/프로필 기본값 생성

필수 요소:
- 닉네임
- 관심 태그 몇 개 선택
- 사용 목적/관심 영역 선택 (선택적)

---

## 7.2 세션 탭

### Session Home (`/session`)
세션 탭 메인 화면이다.

보여줘야 할 것:
- 오늘의 누적 몰입 시간
- 최근 세션 카드
- 현재 랭크/칭호
- 세션 시작 CTA
- 오늘의 streak 또는 주간 흐름

핵심 CTA:
- `15분 시작`
- 세션 길이 조절 옵션은 MVP에서 15분 기본값 + 선택형 preset 정도까지만 허용

### Session Active (`/session/active`)
가장 중요한 화면이다.

필수 요소:
- 남은 시간 표시
- 현재 선택한 주제/책/키워드
- 최소 인터랙션 UI
- 일시정지 / 종료 / 포기
- 집중을 깨지 않는 UI

원칙:
- 이 화면은 무조건 가볍고 조용해야 한다.
- 피드나 알림적 요소를 넣지 않는다.
- 배경 애니메이션은 아주 미세한 수준만 허용

### Session Complete (`/session/complete`)
세션 종료 직후 화면.

필수 요소:
- 완료 피드백
- 짧은 회고 입력 유도
- 하이라이트 저장 여부
- 공유 템플릿 생성 CTA

### Session Note Modal (`/session-note`)
필수 입력:
- 무엇을 봤는지 / 읽었는지
- 어떤 내용이었는지
- 오늘의 한 줄 또는 핵심 인사이트

원칙:
- 장문 글쓰기 UI가 아니라 빠른 회고 UI
- 3개 이하 필드로 유지
- draft 자동 저장

### Session Detail (`/session/[sessionId]`)
필수 요소:
- 세션 메타 정보
- 회고 내용
- AI 질문/답변 결과가 있다면 요약
- 하이라이트/공유 재실행

---

## 7.3 피드 탭

### Feed Home (`/feed`)
MVP 기준 목적:
- 비슷한 취향의 콘텐츠를 가볍게 탐색
- 서비스의 사회적 확장 가능성을 미리 보여줌

보여줘야 할 것:
- 블로그형 글 카드 또는 하이라이트 카드 믹스 피드
- 태그 기반 필터
- 유저 카드 또는 추천 섹션 (선택적)

MVP 규칙:
- 알고리즘 추천을 과하게 설계하지 않는다.
- 최신순 + 관심 태그 우선 노출 정도면 충분하다.

### Feed Post Detail (`/feed/[postId]`)
필수 요소:
- 콘텐츠 본문
- 작성자 정보
- 관련 태그
- 저장 / 공유 / 프로필 진입

### Feed User Profile (`/feed/user/[userId]`)
MVP에서는 제한된 공개 프로필.

보여줘야 할 것:
- 유저명
- 대표 태그
- 공개 하이라이트 일부
- 공개 블로그 글 일부

---

## 7.4 아카이브 탭

아카이브는 **블로그 흐름 + 하이라이트 보관함**이 공존하는 개인 공간이다.

### Archive Home (`/archive`)
화면 내 섹션 구조 권장:
1. 상단 프로필/정체성 영역
2. 칭호/랭크/누적 시간 요약
3. 하이라이트 horizontal list
4. 블로그 글 list

핵심 UX:
- 아카이브는 창고가 아니라 **내 세계가 정리된 공간**처럼 보여야 한다.
- 단일 피드가 아니라 섹션 기반 편집형 구조가 적합하다.

### Blog Detail (`/archive/blog/[postId]`)
필수 요소:
- 제목
- 작성일
- 본문
- 태그
- 관련 세션 링크(선택)

### Highlight Detail (`/archive/highlight/[highlightId]`)
필수 요소:
- 대표 카드/커버
- 세션 묶음 정보
- 누적 시간
- 핵심 회고 문장
- 공유/재편집 CTA

### Blog Compose Modal (`/blog-compose`)
필수 요소:
- 제목
- 본문
- 태그
- 공개 여부(기본 공개, 필요 시 비공개로 전환하는 단순 토글)

원칙:
- 블로그는 세션 기록과 다르다.
- 글쓰기 경험은 더 느리고 사유적인 톤으로 설계한다.

---

## 8. 상태 관리 설계

## 8.1 원칙
- 서버에서 오는 데이터는 TanStack Query가 관리한다.
- 화면 간 공유가 필요한 순수 클라이언트 상태만 Zustand로 둔다.
- form 입력 상태는 RHF가 관리한다.
- 전역 store에 서버 응답 객체를 오래 들고 있지 않는다.

## 8.2 Zustand에 둘 상태
권장 store 예시:
- `authUiStore`: 로그인 모달 표시 여부, onboarding 진행 상태 일부
- `sessionStore`: 현재 진행 세션의 로컬 상태(시작 시각, 남은 시간, pause 여부, 임시 주제)
- `composeStore`: 블로그 작성 draft, 공유 템플릿 선택 상태
- `uiStore`: sheet/modal/open state 등

주의:
- 실제 세션 기록의 영속 데이터는 Zustand가 아니라 서버와 Query cache에 있어야 한다.

## 8.3 TanStack Query에 둘 상태
- 내 프로필
- 오늘/최근 세션 목록
- 피드 리스트
- 아카이브 요약
- 블로그 상세
- 하이라이트 상세
- 랭크 정보
- AI 회고/질문 결과

## 8.4 Query Key 규칙
```ts
['me']
['sessions', 'today']
['sessions', sessionId]
['feed', filter]
['archive', 'me']
['blog', postId]
['highlight', highlightId]
```

규칙:
- 배열 키를 사용한다.
- `me`, `list`, `detail`, `filter`, `cursor` 패턴을 일관되게 유지한다.
- API path와 동일한 이름을 강제하지 말고, UI 의미가 드러나는 쿼리 키를 사용한다.

---

## 9. API 연동 규칙

## 9.1 기본 원칙
- 프론트는 FastAPI의 REST API를 중심으로 동작한다.
- `fetch` 래퍼 또는 `ky` 같은 얇은 래퍼를 사용한다. 과한 SDK화는 피한다.
- 응답 DTO와 UI model을 가능한 한 분리한다.
- 라우트 컴포넌트에서 직접 `fetch` 하지 않는다.

## 9.2 API 레이어 구조
- `src/api/*.ts`: 실제 HTTP 호출 함수
- `src/features/*/queries.ts`: React Query hooks
- `src/features/*/mutations.ts`: mutation hooks
- `src/features/*/types.ts`: 도메인 타입

## 9.3 인증 헤더 처리
- Supabase auth session에서 access token 확보
- API client에서 bearer token 자동 부착
- 토큰 만료 시 refresh 처리
- 인증 실패 시 welcome 또는 sign-in으로 안전하게 보냄

## 9.4 에러 처리 규칙
- 네트워크 오류 / 권한 오류 / 검증 오류 / 서버 오류를 구분
- 사용자에게는 짧고 톤 맞는 메시지 노출
- 개발용 로그는 `logger.ts`로 별도 캡슐화

## 9.5 낙관적 업데이트 범위
적용 가능:
- 블로그 저장 후 리스트 선반영
- 피드 반응 상태
- 하이라이트 pin/unpin

주의 필요:
- 세션 완료/종료
- AI 점수 반영
- 랭크 상승

이 영역은 서버 확정값을 기준으로 보여주는 것이 안전하다.

---

## 10. 인증 설계

## 10.1 기본 선택
MVP 인증은 **Supabase Auth 기반 이메일 로그인**으로 간다.

권장 순서:
1. welcome
2. sign-in
3. auth session 수립
4. onboarding
5. tabs 진입

## 10.2 보호 라우트 규칙
- `(tabs)` 진입 전 auth session 확인
- 미인증 상태에서는 `(auth)`로 강제 이동
- onboarding 미완료 상태이면 onboarding 완료 전 tabs 진입 금지

## 10.3 게스트 모드
초기 MVP에서는 **게스트 모드를 기본값으로 채택하지 않는다.**
이유:
- 세션/아카이브/피드 구조상 개인 데이터 축적이 핵심이라 계정 연결이 빠른 편이 낫다.
- 다만 추후 `둘러보기 모드`는 추가할 수 있다.

---

## 11. 폼 설계

모든 입력은 다음 규칙을 따른다.

### 11.1 세션 회고 폼
필드 수는 작게 유지한다.
권장 필드:
- topic
- note
- takeaway

### 11.2 블로그 작성 폼
권장 필드:
- title
- body
- tags
- visibility

### 11.3 검증 규칙
- Zod 스키마를 통해 프론트에서 1차 검증
- 서버 검증 메시지를 다시 맵핑해 2차 표시
- 글자 수 제한은 미리 UI에 보여준다.

### 11.4 draft 저장
- 세션 회고와 블로그 작성은 draft 유실 방지를 위해 AsyncStorage에 저장한다.
- draft key는 userId + route + entityId 조합으로 만든다.

---

## 12. 공유 템플릿 설계

NichE 프론트의 핵심 차별점 중 하나다.

## 12.1 템플릿 구현 원칙
- 템플릿은 **앱 안의 React component**로 구현한다.
- HTML 캔버스 또는 WebView 렌더러로 우회하지 않는다.
- 동일한 데이터로 여러 템플릿 variant를 렌더링할 수 있게 만든다.

## 12.2 기술 흐름
1. 세션/하이라이트 데이터를 share model로 변환
2. `ShareTemplateA/B/...` 컴포넌트에 주입
3. 숨겨진 렌더 영역 또는 별도 preview screen에서 렌더
4. `react-native-view-shot`으로 캡처
5. `expo-sharing`으로 공유

## 12.3 MVP 템플릿 종류
초기에는 2종이면 충분하다.

- **Template A**: editorial / monochrome / time-focused
- **Template B**: quote-like / insight-focused

## 12.4 템플릿 필드 후보
- 날짜
- 총 몰입 시간
- 주제 또는 책 제목
- 한 줄 회고
- 칭호 / rank badge
- 브랜드명 `NichE`

## 12.5 템플릿 주의사항
- 너무 많은 데이터를 우겨넣지 않는다.
- 정보보다 분위기와 가독성을 우선한다.
- 인스타 스토리 비율(9:16)을 우선 지원한다.

---

## 13. 디자인 시스템 초안

## 13.1 브랜드 무드
- editorial
- minimal
- monochrome
- quiet
- reflective
- curated

## 13.2 색상 원칙
기본은 흑백 중심이다.

권장 토큰:
- background.primary = 거의 흰색 또는 거의 검정
- background.secondary = 살짝 톤 차이 나는 중간층
- text.primary = 고대비 본문
- text.secondary = 절제된 보조 텍스트
- border.subtle = 약한 경계선
- accent.soft = 아주 제한적인 포인트색

주의:
- NichE는 화려한 그라데이션 앱이 아니다.
- 포인트 컬러는 이벤트성(랭크업/완료 상태)로만 제한한다.

## 13.3 타이포그래피
브랜드 의도는 **Helvetica 기반의 중립적이고 편집적인 산세리프 무드**다.
다만 모바일 앱 런타임에서는 폰트 라이선스 및 플랫폼 차이 때문에 실사용 폰트 전략을 분리해서 생각한다.

권장 전략:
- 브랜드 가이드 상으로는 Helvetica/Helvetica Neue 계열 무드 유지
- 실제 앱 런타임은 플랫폼 기본 산세리프를 우선 사용
- 공유 템플릿/마케팅 비주얼에 커스텀 폰트를 별도로 적용하는 구조는 추후 검토

즉, **MVP 구현 단계에서 중요한 것은 정확히 Helvetica 파일을 쓰는 것보다 Helvetica적인 결과 톤을 유지하는 것**이다.

## 13.4 spacing / radius
- spacing scale은 4 기준 단위
- 카드 radius는 16~24 계열
- 버튼 radius는 999 또는 16
- 그림자는 최소화

## 13.5 motion
- 짧고 부드러운 fade / slide 위주
- 화면 전환은 과시적이지 않게
- 세션 완료, 저장, 공유 완료에만 약한 강조 모션

---

## 14. 컴포넌트 설계 원칙

## 14.1 공통 컴포넌트 우선 제작 목록
- AppText
- AppButton
- AppInput
- AppTextarea
- AppCard
- AppAvatar
- AppChip
- AppEmpty
- AppLoader
- AppDivider
- AppTopBar
- AppBottomSheet

## 14.2 도메인 컴포넌트 우선 제작 목록
- SessionTimer
- SessionStartCard
- SessionSummaryCard
- FeedCard
- HighlightCard
- BlogListItem
- ArchiveHero
- RankBadge
- ShareTemplateCard

## 14.3 금지 사항
- 화면마다 일회성 버튼/텍스트 스타일을 남발하지 않는다.
- `Text`, `Pressable`, `View`를 매 화면에서 직접 스타일링해 반복하지 않는다.
- 디자인 토큰을 우회하는 hard-coded color를 최소화한다.

---

## 15. 성능/안정성 설계

## 15.1 리스트
- MVP에서는 `FlatList`로 시작한다.
- 피드가 무거워질 때만 `FlashList` 도입을 검토한다.

## 15.2 이미지
- `expo-image` 사용
- 피드 썸네일/아바타는 명시적 크기와 placeholder 정책을 둔다.

## 15.3 재렌더링
- Query 결과를 그대로 하위에 다 흘리지 않는다.
- 큰 screen component 안에서 mapper/select를 먼저 수행한다.
- 타이머는 가능하면 독립 컴포넌트/독립 상태로 분리한다.

## 15.4 앱 복귀 처리
- foreground 복귀 시 필요한 query만 다시 불러온다.
- 세션 active 상태는 무조건 복원해야 한다.

## 15.5 draft/장애 대응
- 회고 작성 중 앱이 종료돼도 복구 가능해야 한다.
- 블로그 draft 유실을 막는다.
- 공유 이미지 생성 실패 시 재시도 UX를 제공한다.

---

## 16. 분석 이벤트 (선택적이지만 권장)

MVP부터 최소한의 제품 분석 이벤트는 심는다.
다만 SDK 남발 대신 얇은 wrapper를 둔다.

필수 이벤트 예시:
- `session_started`
- `session_completed`
- `session_note_saved`
- `share_template_opened`
- `share_template_exported`
- `blog_post_created`
- `feed_post_opened`
- `highlight_opened`

이벤트 목적은 광고 최적화가 아니라:
- 세션 시작 대비 완료율
- 공유 템플릿 사용률
- 블로그 작성 전환율
- 아카이브 재방문 흐름

을 보는 데 있다.

---

## 17. 테스트 전략

## 17.1 단위 테스트
우선 대상:
- mapper 함수
- share model 생성 함수
- zod schema
- session 시간 계산 util

## 17.2 컴포넌트 테스트
우선 대상:
- SessionTimer
- SessionNoteForm
- ShareTemplateA/B
- FeedCard
- BlogListItem

## 17.3 E2E
MVP에서 최소 시나리오만 구성:
1. 로그인
2. 세션 시작
3. 세션 종료 후 회고 저장
4. 아카이브에서 하이라이트 확인
5. 공유 프리뷰 진입

---

## 18. 환경 변수 및 설정

필수 env 예시:
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV`

규칙:
- `EXPO_PUBLIC_*`는 클라이언트 노출 전제를 이해하고 사용한다.
- 비밀키는 앱에 넣지 않는다.
- 앱 버전/빌드 채널은 `eas.json`과 연계해 관리한다.

---

## 19. 구현 우선순위

## Phase 1 — Skeleton
- Expo app 생성
- Router 세팅
- Provider 세팅
- theme / ui primitives 구축
- auth bootstrap
- 탭 3개 골격 생성

## Phase 2 — Session core
- 세션 홈
- active timer
- 종료/회고 저장
- 세션 상세
- 아카이브에 하이라이트 반영

## Phase 3 — Archive core
- archive home
- 블로그 리스트/상세
- 블로그 작성
- 하이라이트 상세

## Phase 4 — Share templates
- share model 정의
- template A/B 구현
- preview + export

## Phase 5 — Feed basic
- 피드 리스트
- 글 상세
- 유저 프로필 미니 페이지

## Phase 6 — Polish
- loading/empty/error 상태 정리
- analytics wrapper
- performance cleanup
- haptics/motion polish

---

## 20. 에이전트 구현 지침

코딩 에이전트는 다음 원칙을 지켜야 한다.

1. 화면 파일에 비즈니스 로직을 과도하게 넣지 말 것.
2. 도메인별 feature module을 우선 만들 것.
3. API 응답 타입과 화면 표시 타입을 필요 시 분리할 것.
4. 세션 플로우를 다른 탭보다 먼저 안정화할 것.
5. UI는 흑백 기반으로 시작하고 장식 요소를 최소화할 것.
6. 템플릿 기능은 “보여주는 UI”가 아니라 “공유 가능한 결과물 생성”까지 포함해 구현할 것.
7. 아카이브는 단순 리스트가 아니라 `프로필 요약 + 하이라이트 + 블로그 리스트`의 편집형 구조로 구현할 것.
8. MVP에서 추천 알고리즘을 과설계하지 말 것.
9. 앱 런타임에서 폰트 라이선스 문제가 있는 경우, 브랜드 톤을 해치지 않는 대체 산세리프 전략을 사용하되 구조를 깨지 말 것.
10. 프론트에서 Supabase를 직접 도메인 DB처럼 사용하지 말 것.

---

## 21. 현재 문서 기준의 프론트 최종 결정사항

### 확정
- 앱은 Expo + React Native + TypeScript로 간다.
- 라우팅은 Expo Router를 사용한다.
- 탭 구조는 세션 / 피드 / 아카이브다.
- 서버 상태는 TanStack Query로 관리한다.
- 로컬 UI 상태는 Zustand로 관리한다.
- 폼은 React Hook Form + Zod를 사용한다.
- 인증은 Supabase Auth 기반으로 시작한다.
- 데이터 진실 원천은 FastAPI다.
- 템플릿 공유는 앱 내부 렌더 + 캡처 방식으로 구현한다.
- 스타일링은 NativeWind 중심으로 간다.

### 아직 열려 있음
- 온보딩 필드의 최종 상세
- 템플릿 variant의 정확한 디자인 세트
- 피드 카드 타입 비율(블로그 vs 하이라이트)
- 공개 범위/프라이버시의 세부 단계(예: 친구 공개, 링크 공개 등)
- 앱 내 알림 전략

---

## 22. 공개 정책 확정값

MVP 기준으로 니치는 **기본 공개(default public)** 정책을 사용한다.

적용 범위:
- 세션 기반 하이라이트: 기본 공개
- 블로그 글: 기본 공개
- 아카이브 노출: 기본 공개
- 피드 노출 가능성: 기본 공개 데이터 기준

프론트에서의 UX 원칙:
- 작성/저장 시 기본값은 `공개`
- 사용자는 필요 시 `비공개`로 명시 전환할 수 있다
- 공개 토글은 숨기지 않되, 과하게 복잡한 단계형 공개 범위는 MVP에서 넣지 않는다
- 온보딩과 작성 화면의 카피는 “기본 공개, 필요하면 비공개로 전환 가능”을 분명히 안내한다

이 결정이 직접 영향을 주는 영역:
- 아카이브 UI 문구
- 피드 노출 조건
- 공개 토글 UX
- onboarding copy
- share/export 기본 동작

이 문서는 위 확정값을 기준으로 작성되었다.

---

## 23. 문서 요약

NichE 프론트엔드는 다음 방향으로 구현한다.

- Expo 기반 모바일 앱
- 3탭 구조: 세션 / 피드 / 아카이브
- FastAPI 중심 API 소비
- Supabase Auth 사용
- TanStack Query + Zustand 분리
- 세션 경험과 공유 템플릿이 MVP 핵심
- 아카이브는 블로그와 하이라이트가 공존하는 개인 세계관 공간

이 문서는 코딩 에이전트가 프론트 초기 구조를 만들고,
핵심 화면과 상태 계층을 설계하는 데 직접 사용 가능한 기준 문서다.
