import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBlogPost, deleteBlogPost } from '../../api/blog';
import { queryKeys } from '../../constants/queryKeys';

export function useCreateBlogPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogList });
    },
  });
}

export function useDeleteBlogPostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deleteBlogPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blogList });
    },
  });
}
