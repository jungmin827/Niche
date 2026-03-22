import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/components/ui/AppText';
import { usePressScale } from '@/hooks/usePressScale';
import { colors, spacing } from '@/theme/tokens';
import { useCreateFeedPostMutation } from '../mutations';

const MAX_CHARS = 50;
const COUNTER_THRESHOLD = 15;

const TIMING = { duration: 200, easing: Easing.out(Easing.cubic) } as const;

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FeedComposeScreen() {
  const [content, setContent] = useState('');
  const createPost = useCreateFeedPostMutation();

  const isEmpty = content.trim().length === 0;
  const isDisabled = isEmpty || createPost.isPending;
  const remaining = MAX_CHARS - content.length;

  // Post button: fades in when content is ready
  const postOpacity = useSharedValue(0.35);
  useEffect(() => {
    postOpacity.value = withTiming(isDisabled ? 0.35 : 1, TIMING);
  }, [isDisabled, postOpacity]);

  // Counter: appears only when ≤ 15 chars remaining
  const counterOpacity = useSharedValue(0);
  useEffect(() => {
    counterOpacity.value = withTiming(remaining <= COUNTER_THRESHOLD ? 1 : 0, TIMING);
  }, [remaining, counterOpacity]);

  const postOpacityStyle = useAnimatedStyle(() => ({ opacity: postOpacity.value }));
  const counterOpacityStyle = useAnimatedStyle(() => ({ opacity: counterOpacity.value }));

  const handlePost = async () => {
    if (isDisabled) return;
    await createPost.mutateAsync(content.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const { gesture: postGesture, animatedStyle: postScaleStyle } = usePressScale(
    () => { void handlePost(); },
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
            <AppText
              variant="bodySmall"
              style={{ color: colors.text.secondary, opacity: pressed ? 0.5 : 1 }}
            >
              Cancel
            </AppText>
          )}
        </Pressable>

        <AppText variant="caption" style={{ color: colors.text.tertiary }}>
          {formatHeaderDate()}
        </AppText>

        {/* Post button: opacity reflects readiness, scale reflects press */}
        <GestureDetector gesture={postGesture}>
          <Animated.View style={[postOpacityStyle, postScaleStyle]}>
            <AppText
              variant="bodySmall"
              style={{
                color: colors.text.primary,
                fontWeight: isDisabled ? '400' : '600',
              }}
            >
              {createPost.isPending ? 'Posting...' : 'Post'}
            </AppText>
          </Animated.View>
        </GestureDetector>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, padding: spacing.xl }}>
          <TextInput
            value={content}
            onChangeText={(text) => setContent(text.slice(0, MAX_CHARS))}
            placeholder="A thought for today."
            placeholderTextColor={colors.line.secondary}
            multiline
            autoFocus
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 26,
              color: colors.text.primary,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Counter: silent until near limit */}
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.line.secondary,
            alignItems: 'flex-end',
          }}
        >
          <Animated.View style={counterOpacityStyle}>
            <AppText
              variant="caption"
              style={{ color: remaining === 0 ? colors.text.primary : colors.text.tertiary }}
            >
              {remaining}
            </AppText>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
