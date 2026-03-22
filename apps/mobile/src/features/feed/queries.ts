import { useQuery } from '@tanstack/react-query';
import { getFeedComments, getFeedPosts } from '../../api/feed';
import { queryKeys } from '../../constants/queryKeys';

export function useFeedPostsQuery() {
  return useQuery({
    queryKey: queryKeys.feedPosts,
    queryFn: async () => {
      const response = await getFeedPosts();
      return response.items;
    },
  });
}

export function useFeedCommentsQuery(postId: string) {
  return useQuery({
    queryKey: queryKeys.feedComments(postId),
    queryFn: async () => {
      const response = await getFeedComments(postId);
      return response.items;
    },
    enabled: Boolean(postId),
  });
}
