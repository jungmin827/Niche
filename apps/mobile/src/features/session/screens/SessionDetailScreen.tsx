import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Screen from '../../../components/layout/Screen';
import TopBar from '../../../components/layout/TopBar';
import SessionSummaryCard from '../../../components/session/SessionSummaryCard';
import AppButton from '../../../components/ui/AppButton';
import AppCard from '../../../components/ui/AppCard';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { toApiError } from '../../../lib/error';
import { useSessionDetailQuery } from '../hooks';

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');

  if (!sessionId) {
    return (
      <Screen>
        <TopBar title="Session" leadingLabel="Close" onLeadingPress={() => router.replace(routes.sessionHome)} />
        <AppText variant="body">Session not found.</AppText>
      </Screen>
    );
  }

  const session = detailQuery.data?.session;
  const note = detailQuery.data?.note;

  return (
    <Screen scroll>
      <TopBar
        title="Session"
        leadingLabel="Close"
        onLeadingPress={() => router.replace(routes.sessionHome)}
      />

      {detailQuery.isLoading ? (
        <AppText variant="body">Loading...</AppText>
      ) : detailQuery.isError ? (
        <AppCard className="gap-4 bg-[#F6F6F4]">
          <AppText variant="title">Could not load session.</AppText>
          <AppText variant="bodySmall" className="text-[#555555]">
            {toApiError(detailQuery.error).message}
          </AppText>
          <AppButton label="Retry" variant="secondary" onPress={() => detailQuery.refetch()} />
        </AppCard>
      ) : session ? (
        <View className="gap-6">
          <SessionSummaryCard session={session} />

          <AppCard className="gap-5">
            <AppText variant="title">Notes</AppText>
            {note ? (
              <View className="gap-5">
                <View className="gap-2">
                  <AppText variant="caption" className="text-[#8A8A84]">
                    What did you explore?
                  </AppText>
                  <AppText variant="body">{note.summary}</AppText>
                </View>
                {note.insight ? (
                  <View className="gap-2">
                    <AppText variant="caption" className="text-[#8A8A84]">
                      What stayed with you?
                    </AppText>
                    <AppText variant="body">{note.insight}</AppText>
                  </View>
                ) : null}
                <AppButton
                  label="Create Highlight"
                  onPress={() => router.push(routes.sharePreviewModal(sessionId ?? ''))}
                />
                <AppButton
                  label="Edit Note"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: routes.sessionNoteModal,
                      params: { sessionId },
                    })
                  }
                />
              </View>
            ) : (
              <View className="gap-4">
                <AppText variant="bodySmall" className="text-[#555555]">
                  No note yet.
                </AppText>
                <AppButton
                  label="Add Note"
                  onPress={() =>
                    router.push({
                      pathname: routes.sessionNoteModal,
                      params: { sessionId },
                    })
                  }
                />
              </View>
            )}
          </AppCard>

        </View>
      ) : (
        <AppText variant="body">Session not found.</AppText>
      )}
    </Screen>
  );
}
