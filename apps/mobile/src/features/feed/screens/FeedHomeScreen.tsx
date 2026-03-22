import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import { routes } from '@/constants/routes';
import { toApiError } from '@/lib/error';
import { colors, radius, shadows, spacing } from '@/theme/tokens';
import { usePressScale } from '@/hooks/usePressScale';
import { useFeedPostsQuery } from '../queries';
import { FeedPost } from '../types';

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function FeedPostCard({ post, index }: { post: FeedPost; index: number }) {
  const { gesture, animatedStyle } = usePressScale(() => {
    router.push(routes.feedComments(post.id));
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(index * 50).easing(Easing.out(Easing.cubic))}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface.primary,
              borderRadius: radius.sm,
              padding: spacing.xl,
              marginBottom: spacing.sm,
              ...shadows.subtle,
            },
            animatedStyle,
          ]}
        >
          {/* Author + time */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <AppText
              variant="caption"
              style={{ color: colors.text.primary, fontWeight: '600', letterSpacing: 0.3 }}
            >
              @{post.author.handle}
            </AppText>
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {formatRelativeTime(post.createdAt)}
            </AppText>
          </View>

          {/* Content — max 4 lines */}
          <AppText
            variant="body"
            numberOfLines={4}
            style={{ color: colors.text.primary, lineHeight: 24 }}
          >
            {post.content}
          </AppText>

          {/* Comment count */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginTop: spacing.md,
              gap: 4,
            }}
          >
            <Feather name="message-circle" size={13} color={colors.text.tertiary} />
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {post.commentCount}
            </AppText>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function FabButton() {
  const { gesture, animatedStyle } = usePressScale(() => {
    router.push(routes.feedCompose);
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 32,
            right: spacing['2xl'],
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(17, 17, 17, 0.88)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Feather name="plus" size={22} color={colors.text.inverse} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function FeedHomeScreen() {
  const postsQuery = useFeedPostsQuery();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.secondary }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing['2xl'],
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <AppText variant="title" style={{ letterSpacing: -0.5 }}>
          Feed
        </AppText>
        <AppText variant="caption" style={{ color: colors.text.tertiary, marginTop: 2 }}>
          {formatHeaderDate()}
        </AppText>
      </View>

      {/* States */}
      {postsQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
            Loading...
          </AppText>
        </View>
      ) : postsQuery.isError ? (
        <View style={{ padding: spacing['2xl'] }}>
          <View
            style={{
              backgroundColor: colors.surface.primary,
              borderRadius: radius.sm,
              padding: spacing['2xl'],
              gap: spacing.lg,
              ...shadows.subtle,
            }}
          >
            <AppText variant="title">Could not load feed.</AppText>
            <AppText variant="bodySmall" style={{ color: colors.text.secondary }}>
              {toApiError(postsQuery.error).message}
            </AppText>
            <AppButton label="Retry" variant="secondary" onPress={() => postsQuery.refetch()} />
          </View>
        </View>
      ) : postsQuery.data && postsQuery.data.length > 0 ? (
        <FlatList
          data={postsQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <FeedPostCard post={item} index={index} />}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xs,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
            No posts today.
          </AppText>
        </View>
      )}

      <FabButton />
    </SafeAreaView>
  );
}
