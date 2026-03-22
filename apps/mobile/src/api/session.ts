import { apiRequest } from './client';
import { ApiError } from '../lib/error';
import {
  CompleteSessionInput,
  CreateSessionInput,
  Session,
  SessionListResponse,
  SessionNote,
  UpsertSessionNoteInput,
} from '../features/session/types';

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export async function createSession(input: CreateSessionInput) {
  return apiRequest<{ session: Session }>('/v1/sessions', {
    method: 'POST',
    body: {
      topic: input.topic.trim(),
      subject: normalizeOptionalText(input.subject),
      plannedMinutes: input.plannedMinutes,
      source: normalizeOptionalText(input.source),
    },
  });
}

export async function getSession(sessionId: string) {
  return apiRequest<{ session: Session; note: SessionNote | null }>(`/v1/sessions/${sessionId}`);
}

export async function completeSession(sessionId: string, input: CompleteSessionInput) {
  return apiRequest<{ session: Session }>(`/v1/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: input,
  });
}

export async function cancelSession(sessionId: string) {
  return apiRequest<{ session: Session }>(`/v1/sessions/${sessionId}/cancel`, {
    method: 'POST',
    body: {},
  });
}

export async function getMySessions(status?: Session['status']) {
  const query = status ? `?status=${status}` : '';
  return apiRequest<SessionListResponse>(`/v1/me/sessions${query}`);
}

export async function upsertSessionNote(sessionId: string, input: UpsertSessionNoteInput) {
  return apiRequest<{ note: SessionNote }>(`/v1/sessions/${sessionId}/note`, {
    method: 'PUT',
    body: {
      summary: input.summary.trim(),
      insight: normalizeOptionalText(input.insight),
      mood: normalizeOptionalText(input.mood),
      tags: input.tags?.filter((tag) => tag.trim().length > 0) ?? [],
    },
  });
}

export async function getSessionNote(sessionId: string) {
  try {
    return await apiRequest<{ note: SessionNote | null }>(`/v1/sessions/${sessionId}/note`);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'SESSION_NOTE_NOT_FOUND') {
      return { note: null };
    }

    throw error;
  }
}
