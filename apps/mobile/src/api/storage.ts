import { apiRequest } from './client';

export type PresignResponse = {
  bucket: string;
  path: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
};

export async function presignUpload(
  contentType: string,
  fileExt: string,
  scope = 'blogCover',
): Promise<PresignResponse> {
  return apiRequest<PresignResponse>('/v1/uploads/presign', {
    method: 'POST',
    body: {
      bucket: 'content',
      scope,
      contentType,
      fileExt,
    },
  });
}

export async function uploadImageToStorage(
  presignResponse: PresignResponse,
  localUri: string,
): Promise<void> {
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();
  await fetch(presignResponse.uploadUrl, {
    method: 'PUT',
    headers: presignResponse.headers,
    body: blob,
  });
}
