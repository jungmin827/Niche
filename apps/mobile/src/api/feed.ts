import { FeedPost, FeedComment } from '../features/feed/types';
import { apiRequest } from './client';

export async function getFeedPosts(): Promise<{ items: FeedPost[] }> {
  return apiRequest('/v1/feed-posts');
}

export async function createFeedPost(content: string): Promise<{ post: FeedPost }> {
  return apiRequest('/v1/feed-posts', { method: 'POST', body: { content } });
}

export async function deleteFeedPost(postId: string): Promise<void> {
  try {
    await apiRequest(`/v1/feed-posts/${postId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof SyntaxError) return;
    throw e;
  }
}

export async function getFeedComments(postId: string): Promise<{ items: FeedComment[] }> {
  return apiRequest(`/v1/feed-posts/${postId}/comments`);
}

export async function createFeedComment(
  postId: string,
  content: string,
): Promise<{ comment: FeedComment }> {
  return apiRequest(`/v1/feed-posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
  });
}

export async function deleteFeedComment(postId: string, commentId: string): Promise<void> {
  try {
    await apiRequest(`/v1/feed-posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
  } catch (e) {
    if (e instanceof SyntaxError) return;
    throw e;
  }
}
