import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import {
  useCreateSessionBundleMutation,
  useSessionDetailQuery,
  useSessionStore,
  useUpsertSessionNoteMutation,
} from '../hooks';
import { clearSessionNoteDraft, readSessionNoteDraft } from '../utils';

export default function SessionCompleteScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const detailQuery = useSessionDetailQuery(sessionId ?? '');
  const noteMutation = useUpsertSessionNoteMutation(sessionId ?? '');
  const bundleMutation = useCreateSessionBundleMutation();
  const plannedSessionCount = useSessionStore((state) => state.plannedSessionCount);
  const completedSessionCount = useSessionStore((state) => state.completedSessionCount);
  const completedSessionIds = useSessionStore((state) => state.completedSessionIds);
  const resetSessionCounts = useSessionStore((state) => state.resetSessionCounts);

  const [memo, setMemo] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [bundleTitle, setBundleTitle] = useState('');

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
  const isLastInBundle = plannedSessionCount > 1 && !hasMoreSessions;

  // Pre-fill bundle title with the session topic
  useEffect(() => {
    if (isLastInBundle && session?.topic && bundleTitle === '') {
      setBundleTitle(session.topic);
    }
  }, [isLastInBundle, session?.topic]);

  const saveNote = async () => {
    if (sessionId && memo.trim().length > 0) {
      await noteMutation.mutateAsync({ summary: memo, insight: '' });
      await clearSessionNoteDraft(sessionId);
    }
  };

  const handleSaveAndArchive = async () => {
    await saveNote();
    router.push(routes.sharePreviewModal({ sessionId: sessionId ?? '' }));
  };

  const handleBundleAndArchive = async () => {
    await saveNote();
    const title = bundleTitle.trim();
    if (title.length === 0) return;
    const allIds = [...completedSessionIds];
    const { bundle } = await bundleMutation.mutateAsync({ title, sessionIds: allIds });
    resetSessionCounts();
    router.replace(routes.sharePreviewModal({ bundleId: bundle.id }));
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

  const isBusy = noteMutation.isPending || bundleMutation.isPending;

  // ── Bloom — expands from center on screen enter ──────────────────────────
  const bloomScale = useSharedValue(0.15);
  const bloomOpacity = useSharedValue(0);
  useEffect(() => {
    bloomScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
    bloomOpacity.value = withTiming(0.10, { duration: 800, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const bloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bloomScale.value }],
    opacity: bloomOpacity.value,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      {/* Bloom — behind all content */}
      <Animated.View style={[styles.bloom, bloomStyle]} pointerEvents="none" />
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
          placeholder="What's on your mind?"
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

        {/* Bundle section — only shown when last session of multi-session plan */}
        {isLastInBundle && (
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                height: 1,
                backgroundColor: '#EFEFEA',
                marginBottom: 24,
              }}
            />
            <AppText
              variant="caption"
              style={{ color: '#8A8A84', marginBottom: 4 }}
            >
              Bundle title
            </AppText>
            <AppText
              variant="caption"
              style={{ color: '#C0C0BB', marginBottom: 12 }}
            >
              {completedSessionIds.length} sessions · name this deep dive
            </AppText>
            <TextInput
              value={bundleTitle}
              onChangeText={setBundleTitle}
              placeholder="e.g. Philosophy of Mind"
              placeholderTextColor="#C0C0BB"
              maxLength={80}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#D9D9D4',
                paddingVertical: 10,
                fontSize: 16,
                color: '#111',
              }}
            />
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12 }}>
          {isLastInBundle ? (
            <AppButton
              label={isBusy ? 'Saving...' : 'Bundle & Archive'}
              disabled={isBusy || bundleTitle.trim().length === 0}
              onPress={handleBundleAndArchive}
            />
          ) : (
            <AppButton
              label={noteMutation.isPending ? 'Saving...' : 'Save & Archive'}
              disabled={noteMutation.isPending}
              onPress={handleSaveAndArchive}
            />
          )}
          <AppButton
            label="Reflect"
            variant="secondary"
            onPress={handleReflect}
          />
          {hasMoreSessions && (
            <AppButton
              label={`Next Session (${completedSessionCount}/${plannedSessionCount})`}
              variant="ghost"
              onPress={async () => {
                await saveNote();
                router.replace(routes.sessionHome);
              }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bloom: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    alignSelf: 'center',
    top: '12%',
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: 'transparent',
  },
});
