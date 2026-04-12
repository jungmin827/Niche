import { apiRequest } from './client';
import {
  CreateInterestInput,
  CreateLogInput,
  Interest,
  InterestAndLogResponse,
  InterestListResponse,
  InterestOnlyResponse,
  InterestWithLogsResponse,
  UpdateInterestInput,
} from '../features/interest/types';

export async function getMyInterests() {
  return apiRequest<InterestListResponse>('/v1/me/interests');
}

export async function createInterest(input: CreateInterestInput) {
  return apiRequest<Interest>('/v1/interests', {
    method: 'POST',
    body: { name: input.name.trim(), startedAt: input.startedAt },
  });
}

export async function getInterestDetail(interestId: string) {
  return apiRequest<InterestWithLogsResponse>(`/v1/interests/${interestId}`);
}

export async function updateInterest(interestId: string, input: UpdateInterestInput) {
  return apiRequest<Interest>(`/v1/interests/${interestId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteInterest(interestId: string) {
  return apiRequest<void>(`/v1/interests/${interestId}`, {
    method: 'DELETE',
  });
}

export async function createLog(interestId: string, input: CreateLogInput) {
  return apiRequest<InterestAndLogResponse>(`/v1/interests/${interestId}/logs`, {
    method: 'POST',
    body: { text: input.text, tag: input.tag },
  });
}

export async function deleteLog(interestId: string, logId: string) {
  return apiRequest<InterestOnlyResponse>(`/v1/interests/${interestId}/logs/${logId}`, {
    method: 'DELETE',
  });
}
