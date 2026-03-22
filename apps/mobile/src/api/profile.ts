import { apiRequest } from './client';
import { presignUpload, uploadImageToStorage } from './blog';

export type ProfileDTO = {
  id: string;
  handle: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  currentRankCode: string;
  rankScore: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileInput = {
  displayName?: string;
  bio?: string;
  avatarPath?: string;
  onboardingCompleted?: boolean;
};

export async function getMyProfile(): Promise<{ profile: ProfileDTO }> {
  return apiRequest('/v1/me');
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<{ profile: ProfileDTO }> {
  return apiRequest('/v1/me', { method: 'PATCH', body: input });
}

export async function uploadAvatar(localUri: string): Promise<string> {
  const presignResponse = await presignUpload('image/jpeg', 'jpg');
  await uploadImageToStorage(presignResponse, localUri);
  return presignResponse.path;
}
