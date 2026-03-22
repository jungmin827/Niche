import { useQuery } from '@tanstack/react-query';
import { getHighlight, getHighlightSourceSession, getMyArchive } from '../../api/archive';
import { queryKeys } from '../../constants/queryKeys';

export function useArchiveQuery() {
  return useQuery({
    queryKey: queryKeys.archiveMe,
    queryFn: getMyArchive,
  });
}

export function useHighlightDetailQuery(highlightId: string) {
  return useQuery({
    queryKey: queryKeys.highlightDetail(highlightId),
    queryFn: async () => {
      const [highlightResponse, sessionResponse] = await Promise.all([
        getHighlight(highlightId),
        getHighlightSourceSession(highlightId),
      ]);

      return {
        highlight: highlightResponse.highlight,
        session: sessionResponse?.session ?? null,
        note: sessionResponse?.note ?? null,
        sourceLinkageRecovered: sessionResponse?.sourceLinkageRecovered ?? false,
        sourceLinkageMissing: sessionResponse?.sourceLinkageMissing ?? false,
      };
    },
    enabled: Boolean(highlightId),
  });
}
