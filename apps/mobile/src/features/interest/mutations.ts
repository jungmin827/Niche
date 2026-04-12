import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createInterest,
  deleteInterest,
  updateInterest,
  createLog,
  deleteLog,
} from '../../api/interest';
import { queryKeys } from '../../constants/queryKeys';
import { CreateInterestInput, CreateLogInput, UpdateInterestInput } from './types';

function invalidateInterestQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['interests'] });
}

export function useCreateInterestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInterestInput) => createInterest(input),
    onSuccess: () => invalidateInterestQueries(queryClient),
  });
}

export function useUpdateInterestMutation(interestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInterestInput) => updateInterest(interestId, input),
    onSuccess: () => invalidateInterestQueries(queryClient),
  });
}

export function useDeleteInterestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interestId: string) => deleteInterest(interestId),
    onSuccess: () => invalidateInterestQueries(queryClient),
  });
}

export function useCreateLogMutation(interestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLogInput) => createLog(interestId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interestDetail(interestId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.interestList });
    },
  });
}

export function useDeleteLogMutation(interestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteLog(interestId, logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interestDetail(interestId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.interestList });
    },
  });
}
