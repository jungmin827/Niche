import { useQuery } from '@tanstack/react-query';
import { getMyBlogPosts, getBlogPost } from '../../api/blog';
import { queryKeys } from '../../constants/queryKeys';

export function useBlogListQuery() {
  return useQuery({
    queryKey: queryKeys.blogList,
    queryFn: async () => {
      const response = await getMyBlogPosts();
      return response.items;
    },
  });
}

export function useBlogDetailQuery(postId: string) {
  return useQuery({
    queryKey: queryKeys.blogDetail(postId),
    queryFn: async () => getBlogPost(postId),
    enabled: Boolean(postId),
  });
}
