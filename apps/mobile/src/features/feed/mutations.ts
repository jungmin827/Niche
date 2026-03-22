import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createFeedComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
} from '../../api/feed';
import { queryKeys } from '../../constants/queryKeys';

export function useCreateFeedPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createFeedPost(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedPosts });
    },
  });
}

export function useDeleteFeedPostMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => deleteFeedPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedPosts });
    },
  });
}

export function useCreateFeedCommentMutation(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createFeedComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedComments(postId) });
    },
  });
}

export function useDeleteFeedCommentMutation(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteFeedComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedComments(postId) });
    },
  });
}
