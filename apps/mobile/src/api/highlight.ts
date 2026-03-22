import { apiRequest } from './client';
import { uploadImageToStorage, PresignResponse } from './blog';

export interface SessionQuizResult {
  totalScore: number | null;
}

export interface CreateHighlightInput {
  sourceType: 'session' | 'sessionBundle';
  sessionId: string | null;
  bundleId: string | null;
  title: string;
  caption: string | null;
  templateCode: string;
  renderedImagePath: string;
  sourcePhotoPath: string | null;
  visibility: 'public' | 'private';
}

export interface Highlight {
  id: string;
  sourceType: string;
  sessionId: string | null;
  title: string;
  caption: string | null;
  templateCode: string;
  renderedImageUrl: string;
  sourcePhotoUrl: string | null;
  visibility: string;
  publishedAt: string;
}

export interface HighlightListItem {
  id: string;
  title: string;
  caption: string | null;
  templateCode: string;
  renderedImageUrl: string;
  visibility: string;
  publishedAt: string;
}

export async function getMyHighlights(): Promise<{ items: HighlightListItem[] }> {
  return apiRequest<{ items: HighlightListItem[] }>('/v1/me/highlights');
}

export async function getSessionQuizResult(sessionId: string): Promise<SessionQuizResult> {
  return apiRequest<SessionQuizResult>(`/v1/sessions/${sessionId}/quiz-result`);
}

export async function createHighlight(input: CreateHighlightInput): Promise<{ highlight: Highlight }> {
  return apiRequest<{ highlight: Highlight }>('/v1/highlights', {
    method: 'POST',
    body: input,
  });
}

export async function presignHighlightUpload(
  scope: 'highlightRendered' | 'highlightSourcePhoto',
  contentType: string,
  fileExt: string,
): Promise<PresignResponse> {
  return apiRequest<PresignResponse>('/v1/uploads/presign', {
    method: 'POST',
    body: { bucket: 'content', scope, contentType, fileExt },
  });
}

export { uploadImageToStorage };
