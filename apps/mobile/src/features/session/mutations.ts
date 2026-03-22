import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSession, completeSession, cancelSession, upsertSessionNote } from '../../api/session';
import { queryKeys } from '../../constants/queryKeys';
import { ApiError } from '../../lib/error';
import { CreateSessionInput, UpsertSessionNoteInput } from './types';
import { useSessionStore } from './store';

function invalidateSessionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['sessions'] });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  const setActiveSession = useSessionStore((state) => state.setActiveSession);

  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: ({ session }) => {
      setActiveSession({
        sessionId: session.id,
        startedAt: session.startedAt,
        plannedMinutes: session.plannedMinutes,
        topic: session.topic,
        subject: session.subject,
      });
      invalidateSessionQueries(queryClient);
      queryClient.setQueryData(queryKeys.sessionDetail(session.id), { session, note: null });
    },
  });
}

export function useCompleteSessionMutation() {
  const queryClient = useQueryClient();
  const clearActiveSession = useSessionStore((state) => state.clearActiveSession);

  return useMutation({
    mutationFn: (sessionId: string) =>
      completeSession(sessionId, {
        endedAt: new Date().toISOString(),
      }),
    onSuccess: ({ session }) => {
      clearActiveSession();
      invalidateSessionQueries(queryClient);
      queryClient.setQueryData(queryKeys.sessionDetail(session.id), (previous: any) => ({
        ...previous,
        session,
      }));
    },
    onError: (error, sessionId) => {
      if (error instanceof ApiError && error.code === 'SESSION_ALREADY_FINISHED') {
        // Session completed in DB but local store is stale (e.g. response dropped on server restart).
        clearActiveSession();
        invalidateSessionQueries(queryClient);
        queryClient.invalidateQueries({ queryKey: queryKeys.sessionDetail(sessionId) });
      }
    },
  });
}

export function useCancelSessionMutation() {
  const queryClient = useQueryClient();
  const clearActiveSession = useSessionStore((state) => state.clearActiveSession);

  return useMutation({
    mutationFn: (sessionId: string) => cancelSession(sessionId),
    onSuccess: ({ session }) => {
      clearActiveSession();
      invalidateSessionQueries(queryClient);
      queryClient.setQueryData(queryKeys.sessionDetail(session.id), (previous: any) => ({
        ...previous,
        session,
      }));
    },
  });
}

export function useUpsertSessionNoteMutation(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSessionNoteInput) => upsertSessionNote(sessionId, input),
    onSuccess: ({ note }) => {
      invalidateSessionQueries(queryClient);
      queryClient.setQueryData(queryKeys.sessionNote(sessionId), { note });
      queryClient.setQueryData(queryKeys.sessionDetail(sessionId), (previous: any) => ({
        ...previous,
        note,
      }));
    },
  });
}
