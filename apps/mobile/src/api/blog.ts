import { BlogPost, BlogPostListItem } from '../features/blog/types';
import { apiRequest } from './client';

type BlogPostListResponse = {
  items: BlogPostListItem[];
  nextCursor: string | null;
  hasNext: boolean;
};

export type CreateBlogPostInput = {
  title: string;
  excerpt: string | null;
  bodyMd: string;
  coverImagePath: string | null;
  visibility: 'public' | 'private';
};

type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

export type PresignResponse = {
  bucket: string;
  path: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
};

export async function getMyBlogPosts() {
  return apiRequest<BlogPostListResponse>('/v1/me/blog-posts');
}

export async function getBlogPost(postId: string) {
  return apiRequest<{ post: BlogPost }>(`/v1/blog-posts/${postId}`);
}

export async function createBlogPost(input: CreateBlogPostInput) {
  return apiRequest<{ post: BlogPost }>('/v1/blog-posts', {
    method: 'POST',
    body: input,
  });
}

export async function updateBlogPost(postId: string, input: UpdateBlogPostInput) {
  return apiRequest<{ post: BlogPost }>(`/v1/blog-posts/${postId}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteBlogPost(postId: string): Promise<void> {
  try {
    await apiRequest<void>(`/v1/blog-posts/${postId}`, { method: 'DELETE' });
  } catch (error) {
    // 204 No Content causes JSON parse failure — treat as success
    if (error instanceof SyntaxError) return;
    throw error;
  }
}

export async function presignUpload(contentType: string, fileExt: string) {
  return apiRequest<PresignResponse>('/v1/uploads/presign', {
    method: 'POST',
    body: {
      bucket: 'content',
      scope: 'blogCover',
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
