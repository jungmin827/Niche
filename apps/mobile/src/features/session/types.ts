export type SessionStatus = 'active' | 'completed' | 'cancelled';

export type Session = {
  id: string;
  topic: string;
  subject: string | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt?: string;
};

export type SessionNote = {
  sessionId: string;
  summary: string;
  insight: string | null;
  mood: string | null;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CreateSessionInput = {
  topic: string;
  subject?: string;
  plannedMinutes: number;
  source?: string;
};

export type CompleteSessionInput = {
  endedAt: string;
};

export type UpsertSessionNoteInput = {
  summary: string;
  insight?: string;
  mood?: string;
  tags?: string[];
};

export type SessionListResponse = {
  items: Session[];
  nextCursor: string | null;
  hasNext: boolean;
};

export type SessionHomeData = {
  activeSession: Session | null;
  recentSessions: Session[];
  todayFocusMinutes: number;
  currentStreakDays: number;
  rankLabel: string;
};
