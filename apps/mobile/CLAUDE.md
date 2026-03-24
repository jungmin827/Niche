# Frontend Scope — apps/mobile

You are implementing frontend code for NichE inside `apps/mobile`.

Expo SDK 55 기준으로 유지한다. `package.json` 의존성 버전 변경 시 SDK 55 호환성을 확인한다.

## Read First
- `docs/frontend/frontend_app.md` — Expo structure and screen flow
- `docs/design/design_system.md` — UI tone and visual rules
- `docs/language/content_language.md` — all user-facing copy and naming

## Responsibilities
- Expo Router screens under `app/`
- Business/data logic under `src/features`, `src/api`, `src/lib`
- Keep route files thin
- Follow feature-based folder structure
- Maintain editorial black/white tone

## Rules
- No flashy UI, no gradients, no gamified visuals
- Copy must align with `content_language.md`
- Use simple reusable components
- Avoid unnecessary global state (Zustand for light local UI only)

---

## 구현 완료 현황 (2026-03-22)

### Feed 탭 — Text Wave (전면 교체 완료)
구 소셜 포스트 피드(`/v1/feed-posts`)를 완전 폐기하고 Text Wave로 교체했다.

**삭제된 파일**
- `src/features/feed/mutations.ts`
- `src/features/feed/screens/FeedComposeScreen.tsx`
- `src/features/feed/screens/FeedCommentsScreen.tsx`
- `src/components/feed/FeedCard.tsx`
- `app/(modals)/feed-compose.tsx`
- `app/(modals)/feed-comments.tsx`

**신규/재작성 파일**
- `src/features/feed/types.ts` — `WaveItem`, `WaveFeedResponse` 타입만 존재
- `src/api/feed.ts` — `getWaveFeed()` 단독. `__DEV__` mock 8개 아이템 포함 (백엔드 연동 전 임시)
- `src/features/feed/queries.ts` — `useWaveFeedQuery()` 단독. staleTime 5m / gcTime 30m / retry 1
- `src/components/feed/TextMarquee.tsx` — 3개 레이어 무한 마키 컴포넌트
- `src/features/feed/screens/FeedHomeScreen.tsx` — 완전 재작성
- `src/constants/queryKeys.ts` — `feedWave: ['feed', 'wave']` 추가, `feedPosts`/`feedComments` 제거

**TextMarquee 구조 (웹/네이티브 모두 동작)**
- `position: absolute, opacity: 0` 측정 View로 아이템 1벌 너비 측정 → `singleWidthSV` (SharedValue) + `setSingleWidth` (setState)
- `useEffect + runOnUI` 로 애니메이션 시작 (onLayout 기반 측정이 웹에서 부모 너비로 제한되는 버그 회피)
- LTR: `posX 0 → -singleWidth` 반복 / RTL: `posX -singleWidth → 0` 반복 (seamless loop)
- `useAnimatedReaction(isPaused)` 로 3개 레이어 동시 pause/resume
- Layer 1: 72px / `#EFEFEA` / 20px/s / LTR
- Layer 2: 28px / `#555555` / 60px/s / RTL
- Layer 3: 18px bold / `#111111` / 100px/s / LTR
- 배경: `#FFFFFF`

**FeedHomeScreen Overlay (inline, not modal)**
- `selectedItem: WaveItem | null` React state로 관리
- `imageUrl` 있으면 expo-image (9:16 비율), null이면 검정 View + title fallback
- X 버튼 → `selectedItem = null` + `isPaused.value = 0`

**백엔드 계약 (`GET /v1/feed/wave?limit=30`)**
- WaveItem 필드: `highlightId`, `title`, `authorHandle` (NOT authorName), `topic | null`, `imageUrl | null`
- `aiScore` 없음
- 백엔드 연동 시 `src/api/feed.ts`의 `if (__DEV__) return DEV_MOCK_WAVE;` 한 줄 제거

---

### Session 탭 — SessionStartCard 개선 (2026-03-22)
`src/components/session/SessionStartCard.tsx` 개선.

**추가된 기능**
- `KeyboardAvoidingView` (`behavior="padding"` iOS) + `SafeAreaView edges={['top']}` + `useSafeAreaInsets()` — 키보드가 play 버튼을 가리지 않음
- `AnimatedTopicInput` 컴포넌트 분리 — 포커스 시 bottom border가 `dark.line.input → dark.line.strong`으로 `interpolateColor` 보간 (220ms)
- `submittingPulse` SharedValue — `isSubmitting` 동안 play 아이콘이 breathing (0.3 opacity, 560ms withRepeat)
- hint 텍스트 전환: `key={hintText}` + `FadeIn.duration(200)` 로 재진입 애니메이션
- accessibility: 스태퍼 4개 + play 버튼에 `accessibilityRole`, `accessibilityState({ disabled, busy })`, `accessibilityLabel`

**정리된 모션 패턴 (파일 상단 상수화)**
```ts
const ENTER_DURATION = 280;
const ENTER_EASING = Easing.out(Easing.cubic);
const BUTTON_SPRING = { stiffness: 180, damping: 22, mass: 0.8 };
```
- 3개 블록 모두 `FadeInDown` + 동일 easing + 0 / 100 / 200ms 스태거

---

### Highlight — HighlightSessionPickerScreen 버그 수정 (2026-03-22)
`src/features/highlight/screens/HighlightSessionPickerScreen.tsx`

- **버그**: 하이라이트가 이미 있는 세션도 항상 새로 만들기 플로우로 진입
- **원인**: 기존 하이라이트 데이터를 불러오지 않음
- **수정**: `useArchiveQuery()`로 하이라이트 목록 조회 → `sessionId → highlightId` Map 생성 → 존재하면 `router.replace(routes.highlightViewer(...))`, 없으면 `router.push(routes.highlightCreate)`
- 기존 하이라이트 있는 세션: 썸네일 + 체크 아이콘 표시 / 없는 세션: chevron-right 표시

**queryKey 정합성 수정**
- `src/features/highlight/queries.ts` — `useMyHighlightsQuery` queryKey를 `queryKeys.highlight.list` → `queryKeys.myHighlights`로 수정 (mutation 무효화 키와 일치)
- `src/constants/queryKeys.ts` — 사용되지 않는 `highlight: { list: [...] }` 제거

---

## 모션 시스템 가이드 (이 프로젝트 표준)

새 화면 구현 시 아래 패턴을 재사용한다.

```ts
// 진입 스태거
FadeInDown.duration(280).easing(Easing.out(Easing.cubic))
FadeInDown.delay(100).duration(280).easing(Easing.out(Easing.cubic))
FadeInDown.delay(200).duration(280).easing(Easing.out(Easing.cubic))

// press scale (usePressScale 훅)
{ stiffness: 200, damping: 20 }

// CTA 버튼 readiness
{ stiffness: 180, damping: 22, mass: 0.8 }

// 값 변경 crossfade (숫자 스태퍼 등)
exit: withTiming(exitY, { duration: 80 })
enter: withTiming(0, { duration: 100, easing: Easing.out(Easing.cubic) })
```

햅틱 규칙:
- 선택/토글: `Haptics.selectionAsync()`
- 확정 액션(세션 시작 등): `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
