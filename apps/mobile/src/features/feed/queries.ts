import { useQuery } from '@tanstack/react-query';
import { getWaveFeed } from '../../api/feed';
import { queryKeys } from '../../constants/queryKeys';

export function useWaveFeedQuery() {
  return useQuery({
    queryKey: queryKeys.feedWave,
    queryFn: async () => {
      const response = await getWaveFeed();
      return response.waveItems;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
