import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { useRecentSessionsQuery } from '../../session/queries';
import { Session } from '../../session/types';

function formatPickerDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(isoString),
  );
}

export default function HighlightSessionPickerScreen() {
  const sessionsQuery = useRecentSessionsQuery();
  const completedSessions = (sessionsQuery.data ?? []).filter(
    (session) => session.status === 'completed',
  );

  function handleSelectSession(item: Session) {
    router.push({
      pathname: routes.highlightCreate,
      params: {
        sessionId: item.id,
        sessionTitle: item.topic,
        actualMinutes: String(item.actualMinutes ?? 0),
        completedAt: item.endedAt ?? '',
      },
    });
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
        <AppText variant="caption" className="text-[#8A8A84]">
          New Highlight
        </AppText>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={completedSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
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
              <AppText variant="caption" className="text-[#8A8A84] mt-1">
                {item.actualMinutes ?? 0} min
                {item.endedAt ? `  ·  ${formatPickerDate(item.endedAt)}` : ''}
              </AppText>
            </View>
            <Feather name="chevron-right" size={16} color="#8A8A84" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <AppText variant="bodySmall" className="text-[#8A8A84]">
              No completed sessions yet.
            </AppText>
          </View>
        }
      />
    </SafeAreaView>
  );
}
