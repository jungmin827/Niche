export const routes = {
  welcome: '/(auth)/welcome',
  signIn: '/(auth)/sign-in',
  sessionHome: '/(tabs)/session',
  sessionActive: '/(tabs)/session/active',
  sessionComplete: '/(tabs)/session/complete',
  sessionDetail: (sessionId: string) => `/(tabs)/session/${sessionId}`,
  sessionNoteModal: '/(modals)/session-note',
  sharePreviewModal: (params: { sessionId?: string; bundleId?: string; quizScore?: number }) => ({
    pathname: '/(modals)/share-preview' as const,
    params: {
      sessionId: params.sessionId ?? '',
      bundleId: params.bundleId ?? '',
      quizScore: params.quizScore?.toString() ?? '',
    },
  }),
  archiveHome: '/(tabs)/archive',
  archiveHighlightDetail: (highlightId: string) => `/(tabs)/archive/highlight/${highlightId}`,
  blogHome: '/(tabs)/blog',
  blogDetail: (postId: string) => `/(tabs)/blog/${postId}`,
  blogCompose: '/(modals)/blog-compose',
  quizLoading: '/(modals)/quiz-loading',
  quizAnswer: '/(modals)/quiz-answer',
  quizResult: '/(modals)/quiz-result',
  highlightSessionPicker: '/(modals)/highlight-session-picker' as const,
  highlightCreate: (sessionId: string) =>
    ({ pathname: '/(modals)/highlight-create' as const, params: { sessionId } }),
  highlightViewer: (highlightId: string) =>
    ({ pathname: '/(modals)/highlight-viewer' as const, params: { highlightId } }),
  feedCompose: '/(modals)/feed-compose',
  feedComments: (postId: string) => `/(modals)/feed-comments?postId=${postId}`,
  profileEdit: (displayName: string) =>
    `/(modals)/profile-edit?displayName=${encodeURIComponent(displayName)}`,
  jitter: '/(modals)/jitter',
  interestHome: '/(tabs)/interests',
  interestDetail: (interestId: string) => `/(tabs)/interests/${interestId}`,
  interestCompose: '/(modals)/interest-compose',
  logCompose: (interestId: string) =>
    ({ pathname: '/(modals)/log-compose' as const, params: { interestId } }),
} as const;
