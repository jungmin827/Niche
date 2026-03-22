import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHighlight } from '../../api/highlight';
import { queryKeys } from '../../constants/queryKeys';

export function useCreateHighlightMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHighlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.archiveMe });
      queryClient.invalidateQueries({ queryKey: queryKeys.myHighlights });
    },
  });
}
