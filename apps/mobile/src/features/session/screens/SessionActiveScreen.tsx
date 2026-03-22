import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionTimer from '../../../components/session/SessionTimer';
import AppButton from '../../../components/ui/AppButton';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import {
  useCancelSessionMutation,
  useCompleteSessionMutation,
  useSessionStore,
} from '../hooks';
import { writeSessionNoteDraft } from '../utils';

export default function SessionActiveScreen() {
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const activeSessionStartedAt = useSessionStore((state) => state.activeSessionStartedAt);
  const activeSessionPlannedMinutes = useSessionStore((state) => state.activeSessionPlannedMinutes);
  const activeSessionTopic = useSessionStore((state) => state.activeSessionTopic);
  const activeSessionSubject = useSessionStore((state) => state.activeSessionSubject);
  const incrementCompleted = useSessionStore((state) => state.incrementCompletedSessionCount);

  const completeMutation = useCompleteSessionMutation();
  const cancelMutation = useCancelSessionMutation();

  const [memo, setMemo] = useState('');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save memo draft with debounce
  useEffect(() => {
    if (!activeSessionId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      void writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
    }, 800);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [memo, activeSessionId]);

  if (!activeSessionId || !activeSessionStartedAt || !activeSessionPlannedMinutes || !activeSessionTopic) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <AppText variant="body">진행 중인 세션이 없습니다.</AppText>
          <AppButton label="세션으로" onPress={() => router.replace(routes.sessionHome)} />
        </View>
      </SafeAreaView>
    );
  }

  const handleComplete = () => {
    Alert.alert('세션을 완료할까요?', '', [
      { text: '계속하기', style: 'cancel' },
      {
        text: '완료',
        onPress: async () => {
          // Save memo draft before completing
          if (memo.trim().length > 0) {
            await writeSessionNoteDraft(activeSessionId, { summary: memo, insight: '' });
          }
          const response = await completeMutation.mutateAsync(activeSessionId);
          incrementCompleted();
          router.replace({
            pathname: routes.sessionComplete,
            params: { sessionId: response.session.id },
          });
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('세션을 취소할까요?', '지금까지의 기록은 저장되지 않습니다.', [
      { text: '계속하기', style: 'cancel' },
      {
        text: '취소',
        style: 'destructive',
        onPress: async () => {
          await cancelMutation.mutateAsync(activeSessionId);
          router.replace(routes.sessionHome);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        {/* Upper area — timer + controls */}
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 12,
          }}
        >
          {activeSessionSubject ? (
            <AppText variant="caption" style={{ color: '#aaa', letterSpacing: 0.5 }}>
              {activeSessionSubject}
            </AppText>
          ) : null}

          <AppText
            variant="title"
            style={{ textAlign: 'center', fontSize: 18, marginBottom: 8 }}
            numberOfLines={2}
          >
            {activeSessionTopic}
          </AppText>

          <SessionTimer
            startedAt={activeSessionStartedAt}
            plannedMinutes={activeSessionPlannedMinutes}
            mode="elapsed"
          />

          <View style={{ marginTop: 20, width: '100%', gap: 10 }}>
            <AppButton
              label={completeMutation.isPending ? '완료 중...' : 'Stop / Complete'}
              disabled={completeMutation.isPending}
              onPress={handleComplete}
            />
            <AppButton
              label="취소"
              variant="secondary"
              disabled={cancelMutation.isPending}
              onPress={handleCancel}
            />
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#e5e5e5', marginHorizontal: 32 }} />

        {/* Lower area — memo */}
        <View style={{ flex: 1, paddingHorizontal: 32, paddingVertical: 20 }}>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="Write down your thoughts, insights, or observations..."
            placeholderTextColor="#ccc"
            multiline
            style={{
              flex: 1,
              fontSize: 14,
              lineHeight: 22,
              color: '#000',
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: '#e0e0e0',
              padding: 16,
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
