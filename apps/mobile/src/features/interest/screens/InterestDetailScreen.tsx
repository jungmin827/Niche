import { router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { colors } from '../../../theme/colors';
import { useInterestDetailQuery, useDeleteInterestMutation, useDeleteLogMutation } from '../hooks';
import { Log, LOG_TAG_LABELS } from '../types';

function daysSince(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function LogItem({
  item,
  onDelete,
}: {
  item: Log;
  onDelete: (logId: string) => void;
}) {
  const date = new Date(item.loggedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View
      style={{
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.line.secondary,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            {LOG_TAG_LABELS[item.tag]}
          </AppText>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            {date}
          </AppText>
        </View>
        <Pressable
          onPress={() => onDelete(item.id)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Delete log"
        >
          <Feather name="x" size={16} color={colors.text.tertiary} />
        </Pressable>
      </View>
      <AppText variant="body">{item.text}</AppText>
    </View>
  );
}

export default function InterestDetailScreen({ interestId }: { interestId: string }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useInterestDetailQuery(interestId);
  const deleteInterestMutation = useDeleteInterestMutation();
  const deleteLogMutation = useDeleteLogMutation(interestId);

  const interest = data?.interest;
  const logs = data?.logs ?? [];

  function handleDeleteInterest() {
    Alert.alert(
      'Delete Interest',
      'This will delete all records too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInterestMutation.mutateAsync(interestId);
            router.back();
          },
        },
      ],
    );
  }

  function handleDeleteLog(logId: string) {
    Alert.alert('Delete Record', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteLogMutation.mutate(logId),
      },
    ]);
  }

  if (isLoading || !interest) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }

  const days = daysSince(interest.startedAt);
  const years = (days / 365).toFixed(1);

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
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={colors.text.primary} />
        </Pressable>
        <Pressable onPress={handleDeleteInterest} hitSlop={12} accessibilityRole="button" accessibilityLabel="Delete interest">
          <Feather name="trash-2" size={20} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LogItem item={item} onDelete={handleDeleteLog} />}
        ListHeaderComponent={
          <>
            {/* Interest name + depth block */}
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 24,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.line.secondary,
              }}
            >
              <AppText variant="hero" style={{ marginBottom: 16 }}>
                {interest.name}
              </AppText>

              <View style={{ flexDirection: 'row', gap: 32 }}>
                <View>
                  <AppText variant="title" style={{ color: colors.text.primary }}>
                    {interest.depthScore != null ? interest.depthScore.toFixed(1) : '—'}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 2 }}>
                    depth score
                  </AppText>
                </View>
                <View>
                  <AppText variant="title">{years}y</AppText>
                  <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 2 }}>
                    {days} days
                  </AppText>
                </View>
                <View>
                  <AppText variant="title">{interest.recordCount}</AppText>
                  <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 2 }}>
                    records
                  </AppText>
                </View>
              </View>
            </View>

            {/* Add log button */}
            <Pressable
              onPress={() => router.push(routes.logCompose(interestId))}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                marginHorizontal: 20,
                marginTop: 20,
                marginBottom: 4,
                borderWidth: 1,
                borderColor: colors.line.primary,
                paddingVertical: 14,
                alignItems: 'center',
              })}
              accessibilityRole="button"
            >
              <AppText variant="button" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Add Record
              </AppText>
            </Pressable>

            {logs.length > 0 && (
              <AppText
                variant="caption"
                style={{ color: colors.text.tertiary, paddingHorizontal: 20, marginTop: 20, marginBottom: 4 }}
              >
                Records
              </AppText>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
              No records yet.
            </AppText>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      />
    </View>
  );
}
