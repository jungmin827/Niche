export const queryKeys = {
  me: ['me'] as const,
  sessionsToday: ['sessions', 'today'] as const,
  sessionsRecent: ['sessions', 'recent'] as const,
  sessionDetail: (sessionId: string) => ['sessions', sessionId] as const,
  sessionNote: (sessionId: string) => ['sessions', sessionId, 'note'] as const,
  archiveMe: ['archive', 'me'] as const,
  highlightDetail: (highlightId: string) => ['highlight', highlightId] as const,
  myHighlights: ['highlights', 'me'] as const,
} as const;
