import { apiRequest } from './client';

export type JitterRole = 'user' | 'assistant';

export type JitterMessage = { role: JitterRole; content: string };

export async function postJitterMessage(payload: {
  messages: JitterMessage[];
  contextSummary?: string | null;
}) {
  return apiRequest<{ reply: string }>('/v1/jitter/messages', {
    method: 'POST',
    body: {
      messages: payload.messages,
      contextSummary: payload.contextSummary ?? undefined,
    },
  });
}
