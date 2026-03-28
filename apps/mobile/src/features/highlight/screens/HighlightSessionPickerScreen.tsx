import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { useArchiveQuery } from '../../archive/hooks';
import { useRecentSessionsQuery } from '../../session/queries';
import { Session } from '../../session/types';

function formatPickerDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(isoString),
  );
}

export default function HighlightSessionPickerScreen() {
  const sessionsQuery = useRecentSessionsQuery();
  const archiveQuery = useArchiveQuery();

  const completedSessions = (sessionsQuery.data ?? []).filter(
    (session) => session.status === 'completed',
  );

  // 세션 ID → 이미 만들어진 하이라이트 ID 매핑
  const sessionHighlightMap = new Map<string, string>(
    (archiveQuery.data?.highlights.items ?? [])
      .filter((h) => h.sessionId !== null)
      .map((h) => [h.sessionId as string, h.id]),
  );

  function handleSelectSession(item: Session) {
    const existingHighlightId = sessionHighlightMap.get(item.id);

    if (existingHighlightId) {
      // 이미 하이라이트가 있는 세션 → 뷰어로 이동
      router.replace(routes.highlightViewer(existingHighlightId));
    } else {
      // 하이라이트가 없는 세션 → SharePreviewScreen으로 이동 (세션 완료 흐름과 동일)
      router.push(routes.sharePreviewModal(item.id));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#D9D9D4',
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <AppText variant="bodySmall">Cancel</AppText>
        </Pressable>
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          Highlights
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={completedSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const existingHighlightId = sessionHighlightMap.get(item.id);
          const existingHighlight = archiveQuery.data?.highlights.items.find(
            (h) => h.id === existingHighlightId,
          );

          return (
            <Pressable
              onPress={() => handleSelectSession(item)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: '#D9D9D4',
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <AppText variant="body">{item.topic}</AppText>
                <AppText variant="caption" style={{ color: '#8A8A84', marginTop: 4 }}>
                  {item.actualMinutes ?? 0} min
                  {item.endedAt ? `  ·  ${formatPickerDate(item.endedAt)}` : ''}
                </AppText>
              </View>

              {existingHighlight ? (
                // 이미 하이라이트가 있는 세션 — 썸네일 + 체크
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {existingHighlight.renderedImageUrl ? (
                    <Image
                      source={{ uri: existingHighlight.renderedImageUrl }}
                      style={{ width: 36, height: 36, borderRadius: 4 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 4,
                        backgroundColor: '#111',
                      }}
                    />
                  )}
                  <Feather name="check" size={14} color="#8A8A84" />
                </View>
              ) : (
                // 하이라이트가 없는 세션 — 생성 화살표
                <Feather name="chevron-right" size={16} color="#8A8A84" />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
              No completed sessions yet.
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}
