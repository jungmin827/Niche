import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHighlight } from '../../api/archive';
import { queryKeys } from '../../constants/queryKeys';
import { HighlightCreateInput } from './types';

export function useCreateHighlightMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HighlightCreateInput) => createHighlight(input),
    onSuccess: ({ highlight }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.archiveMe });
      queryClient.invalidateQueries({ queryKey: queryKeys.myHighlights });
      queryClient.setQueryData(queryKeys.highlightDetail(highlight.id), { highlight, session: null, note: null });
    },
  });
}
