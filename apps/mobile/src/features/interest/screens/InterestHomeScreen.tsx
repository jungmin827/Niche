import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { colors } from '../../../theme/colors';
import { useMyInterestsQuery } from '../hooks';
import { Interest } from '../types';

function daysSince(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function InterestCard({ item }: { item: Interest }) {
  const days = daysSince(item.startedAt);
  const years = (days / 365).toFixed(1);

  return (
    <Pressable
      onPress={() => router.push(routes.interestDetail(item.id))}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        borderBottomWidth: 1,
        borderBottomColor: colors.line.secondary,
        paddingVertical: 20,
        paddingHorizontal: 20,
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <AppText variant="title" style={{ flex: 1, marginRight: 16 }}>
          {item.name}
        </AppText>
        {item.depthScore != null && (
          <View style={{ alignItems: 'flex-end' }}>
            <AppText
              variant="hero"
              style={{ color: colors.text.primary, lineHeight: 36 }}
            >
              {item.depthScore.toFixed(1)}
            </AppText>
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              depth
            </AppText>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
        <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
          {years}y
        </AppText>
        <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
          {item.recordCount} {item.recordCount === 1 ? 'record' : 'records'}
        </AppText>
      </View>

      {item.depthScore == null && (
        <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 6 }}>
          Add a record to see your depth score.
        </AppText>
      )}
    </Pressable>
  );
}

export default function InterestHomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useMyInterestsQuery();
  const items = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.line.secondary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="title">Interests</AppText>
        <Pressable
          onPress={() => router.push(routes.interestCompose)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Add interest"
        >
          <Feather name="plus" size={24} color={colors.text.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.text.secondary} />
        </View>
      ) : items.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
        >
          <AppText
            variant="body"
            style={{ color: colors.text.tertiary, textAlign: 'center', marginBottom: 24 }}
          >
            What are you going deep on?
          </AppText>
          <Pressable
            onPress={() => router.push(routes.interestCompose)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              borderWidth: 1,
              borderColor: colors.line.primary,
              paddingVertical: 14,
              paddingHorizontal: 24,
            })}
            accessibilityRole="button"
          >
            <AppText variant="button" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Add First Interest
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InterestCard item={item} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}
