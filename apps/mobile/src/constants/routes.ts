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
  quizLoading: '/(modals)/quiz-loading',
  quizAnswer: '/(modals)/quiz-answer',
  quizResult: '/(modals)/quiz-result',
  profileEdit: (displayName: string) =>
    `/(modals)/profile-edit?displayName=${encodeURIComponent(displayName)}`,
  jitter: '/(modals)/jitter',
  interestHome: '/(tabs)/interests',
  interestDetail: (interestId: string) => `/(tabs)/interests/${interestId}`,
  interestCompose: '/(modals)/interest-compose',
  logCompose: (interestId: string) =>
    ({ pathname: '/(modals)/log-compose' as const, params: { interestId } }),
  interestShare: (interestId: string) =>
    ({ pathname: '/(modals)/interest-share' as const, params: { interestId } }),
} as const;
