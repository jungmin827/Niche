export type LogTag = 'tasting_note' | 'reading' | 'visit' | 'observation' | 'other';

export const LOG_TAG_LABELS: Record<LogTag, string> = {
  tasting_note: 'Tasting Note',
  reading: 'Reading',
  visit: 'Visit',
  observation: 'Observation',
  other: 'Other',
};

export const LOG_TAGS: LogTag[] = ['tasting_note', 'reading', 'visit', 'observation', 'other'];

export type Interest = {
  id: string;
  name: string;
  startedAt: string;
  recordCount: number;
  depthScore: number | null;
  isPublic: boolean;
  createdAt: string;
};

export type Log = {
  id: string;
  interestId: string;
  text: string;
  tag: LogTag;
  loggedAt: string;
  isPublic: boolean;
  createdAt: string;
};

export type InterestListResponse = {
  items: Interest[];
};

export type InterestWithLogsResponse = {
  interest: Interest;
  logs: Log[];
};

export type InterestAndLogResponse = {
  interest: Interest;
  log: Log;
};

export type InterestOnlyResponse = {
  interest: Interest;
};

export type CreateInterestInput = {
  name: string;
  startedAt: string;
};

export type UpdateInterestInput = {
  name?: string;
  startedAt?: string;
};

export type CreateLogInput = {
  text: string;
  tag: LogTag;
};
