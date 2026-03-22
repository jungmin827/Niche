import { useQuery } from '@tanstack/react-query';
import { getMyHighlights, getSessionQuizResult } from '../../api/highlight';
import { queryKeys } from '../../constants/queryKeys';

export function useMyHighlightsQuery() {
  return useQuery({
    queryKey: queryKeys.highlight.list,
    queryFn: getMyHighlights,
    select: (data) => data.items,
  });
}

export function useSessionQuizResultQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.highlightSessionQuizResult(sessionId),
    queryFn: () => getSessionQuizResult(sessionId),
    enabled: !!sessionId,
  });
}
