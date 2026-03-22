import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { useSessionDetailQuery, useSessionStore, useUpsertSessionNoteMutation } from '../hooks';
import { clearSessionNoteDraft, readSessionNoteDraft } from '../utils';

export default function SessionCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const noteMutation = useUpsertSessionNoteMutation(sessionId ?? '');
  const plannedSessionCount = useSessionStore((state) => state.plannedSessionCount);
  const completedSessionCount = useSessionStore((state) => state.completedSessionCount);

  const [memo, setMemo] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Pre-fill memo from draft saved during active session
  useEffect(() => {
    if (!sessionId || draftLoaded) return;
    readSessionNoteDraft(sessionId)
      .then((draft) => {
        if (draft?.summary) setMemo(draft.summary);
        setDraftLoaded(true);
      })
      .catch(() => setDraftLoaded(true));
  }, [sessionId, draftLoaded]);

  const session = detailQuery.data?.session;
  const hasMoreSessions = completedSessionCount < plannedSessionCount;

  const saveNoteAndNavigate = async (destination: 'share' | 'nextSession') => {
    if (sessionId && memo.trim().length > 0) {
      await noteMutation.mutateAsync({ summary: memo, insight: '' });
      await clearSessionNoteDraft(sessionId);
    }
    if (destination === 'share') {
      router.push(routes.sharePreviewModal(sessionId ?? ''));
    } else {
      router.replace(routes.sessionHome);
    }
  };

  const handleReflect = () => {
    router.push({
      pathname: routes.sessionNoteModal,
      params: { sessionId: sessionId ?? '' },
    });
  };

  if (!sessionId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 32 }}>
          <AppText variant="body">Session not found.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  const actualMinutes = session?.actualMinutes ?? session?.plannedMinutes ?? 0;
  const mins = String(Math.floor(actualMinutes)).padStart(2, '0');
  const secs = '00';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 48 }}
      >
        {/* Completed time */}
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <AppText
            variant="hero"
            style={{ fontSize: 72, lineHeight: 80, letterSpacing: -1, color: '#000' }}
          >
            {mins} : {secs}
          </AppText>
        </View>

        {/* Topic */}
        <AppText
          variant="caption"
          style={{ color: '#aaa', textAlign: 'center', marginBottom: 32, fontSize: 13, letterSpacing: 0.5 }}
        >
          {session?.topic ?? ''}
        </AppText>

        {/* Memo textarea */}
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="지금 떠오르는 생각을 적어보세요."
          placeholderTextColor="#ccc"
          multiline
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: '#D9D9D4',
            padding: 16,
            fontSize: 14,
            lineHeight: 22,
            color: '#000',
            textAlignVertical: 'top',
            marginBottom: 32,
          }}
        />

        {/* Actions */}
        <View style={{ gap: 12 }}>
            <AppButton
              label={noteMutation.isPending ? 'Saving...' : 'Save & Archive'}
              disabled={noteMutation.isPending}
              onPress={() => saveNoteAndNavigate('share')}
            />
            <AppButton
              label="Reflect"
              variant="secondary"
              onPress={handleReflect}
            />
            {hasMoreSessions && (
              <AppButton
                label={`Next Session (${completedSessionCount}/${plannedSessionCount})`}
                variant="ghost"
                onPress={() => saveNoteAndNavigate('nextSession')}
              />
            )}
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
