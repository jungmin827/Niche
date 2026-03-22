import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/components/ui/AppText';
import { usePressScale } from '@/hooks/usePressScale';
import { useAuthSession } from '@/hooks/useAuthSession';
import { colors, spacing } from '@/theme/tokens';
import { useCreateFeedCommentMutation, useDeleteFeedCommentMutation } from '../mutations';
import { useFeedCommentsQuery } from '../queries';
import { FeedComment } from '../types';

const MAX_CHARS = 20;
const COUNTER_THRESHOLD = 8;

const TIMING = { duration: 200, easing: Easing.out(Easing.cubic) } as const;

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

function CommentRow({
  comment,
  index,
  isOwn,
  onDelete,
}: {
  comment: FeedComment;
  index: number;
  isOwn: boolean;
  onDelete: (commentId: string) => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(index * 40).easing(Easing.out(Easing.cubic))}
      style={{
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.line.secondary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <AppText variant="caption" style={{ color: colors.text.primary, fontWeight: '600' }}>
            @{comment.author.handle}
          </AppText>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>·</AppText>
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            {formatRelativeTime(comment.createdAt)}
          </AppText>
        </View>
        <AppText variant="bodySmall" style={{ color: colors.text.primary }}>
          {comment.content}
        </AppText>
      </View>

      {isOwn ? (
        <Pressable onPress={() => onDelete(comment.id)} hitSlop={8} style={{ paddingLeft: spacing.md }}>
          {({ pressed }) => (
            <Feather name="trash-2" size={14} color={colors.text.tertiary} style={{ opacity: pressed ? 0.4 : 1 }} />
          )}
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export default function FeedCommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [text, setText] = useState('');

  const { session } = useAuthSession();
  const currentUserId = session?.user?.id ?? null;

  const commentsQuery = useFeedCommentsQuery(postId);
  const createComment = useCreateFeedCommentMutation(postId);
  const deleteComment = useDeleteFeedCommentMutation(postId);

  const isEmpty = text.trim().length === 0;
  const isDisabled = isEmpty || createComment.isPending;
  const remaining = MAX_CHARS - text.length;

  // Send button: fades in when text is ready
  const sendOpacity = useSharedValue(0.35);
  useEffect(() => {
    sendOpacity.value = withTiming(isDisabled ? 0.35 : 1, TIMING);
  }, [isDisabled, sendOpacity]);

  // Counter: appears only when near limit
  const counterOpacity = useSharedValue(0);
  useEffect(() => {
    counterOpacity.value = withTiming(remaining <= COUNTER_THRESHOLD ? 1 : 0, TIMING);
  }, [remaining, counterOpacity]);

  const sendOpacityStyle = useAnimatedStyle(() => ({ opacity: sendOpacity.value }));
  const counterOpacityStyle = useAnimatedStyle(() => ({ opacity: counterOpacity.value }));

  const handleSend = async () => {
    if (isDisabled) return;
    await createComment.mutateAsync(text.trim());
    Haptics.selectionAsync();
    setText('');
  };

  const { gesture: sendGesture, animatedStyle: sendScaleStyle } = usePressScale(
    () => { void handleSend(); },
    isDisabled,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.line.secondary,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          {({ pressed }) => (
            <Feather name="x" size={20} color={colors.text.primary} style={{ opacity: pressed ? 0.4 : 1 }} />
          )}
        </Pressable>

        <AppText variant="caption" style={{ color: colors.text.tertiary }}>
          {formatHeaderDate()}
        </AppText>

        <View style={{ width: 20 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Comment list */}
        {commentsQuery.isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
              Loading...
            </AppText>
          </View>
        ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
          <FlatList
            data={commentsQuery.data}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <CommentRow
                comment={item}
                index={index}
                isOwn={currentUserId === item.author.id}
                onDelete={(commentId) => deleteComment.mutate(commentId)}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: spacing.xl }}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>
              No comments yet.
            </AppText>
          </View>
        )}

        {/* Input row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.line.secondary,
            gap: spacing.md,
          }}
        >
          <TextInput
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_CHARS))}
            placeholder="Leave a thought."
            placeholderTextColor={colors.line.secondary}
            style={{
              flex: 1,
              fontSize: 14,
              color: colors.text.primary,
              paddingVertical: spacing.sm,
            }}
            returnKeyType="send"
            onSubmitEditing={() => { void handleSend(); }}
          />

          {/* Counter: silent until near limit */}
          <Animated.View style={counterOpacityStyle}>
            <AppText
              variant="caption"
              style={{ color: remaining === 0 ? colors.text.primary : colors.text.tertiary }}
            >
              {remaining}
            </AppText>
          </Animated.View>

          {/* Send button */}
          <GestureDetector gesture={sendGesture}>
            <Animated.View style={[sendOpacityStyle, sendScaleStyle]}>
              <AppText
                variant="bodySmall"
                style={{
                  color: colors.text.primary,
                  fontWeight: isDisabled ? '400' : '600',
                }}
              >
                Send
              </AppText>
            </Animated.View>
          </GestureDetector>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
