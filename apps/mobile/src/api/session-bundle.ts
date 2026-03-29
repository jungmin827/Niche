import { apiRequest } from './client';

export type SessionBundleDTO = {
  id: string;
  profileId: string;
  title: string;
  sessionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionBundleInput = {
  title: string;
  sessionIds: string[];
};

export async function createSessionBundle(input: CreateSessionBundleInput) {
  return apiRequest<{ bundle: SessionBundleDTO }>('/v1/session-bundles', {
    method: 'POST',
    body: {
      title: input.title.trim(),
      sessionIds: input.sessionIds,
    },
  });
}

export async function getSessionBundle(bundleId: string) {
  return apiRequest<{ bundle: SessionBundleDTO }>(`/v1/session-bundles/${bundleId}`);
}
