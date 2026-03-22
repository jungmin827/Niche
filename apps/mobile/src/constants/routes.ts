export const routes = {
  welcome: '/(auth)/welcome',
  signIn: '/(auth)/sign-in',
  sessionHome: '/(tabs)/session',
  sessionActive: '/(tabs)/session/active',
  sessionComplete: '/(tabs)/session/complete',
  sessionDetail: (sessionId: string) => `/(tabs)/session/${sessionId}`,
  sessionNoteModal: '/(modals)/session-note',
  sharePreviewModal: '/(modals)/share-preview',
  archiveHome: '/(tabs)/archive',
  archiveHighlightDetail: (highlightId: string) => `/(tabs)/archive/highlight/${highlightId}`,
} as const;
