import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NikeTemplate from '../../../components/share/NikeTemplate';
import AppText from '../../../components/ui/AppText';
import { routes } from '../../../constants/routes';
import { usePressScale } from '../../../hooks/usePressScale';
import { toApiError } from '../../../lib/error';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useSessionBundleQuery, useSessionDetailQuery, useSessionHomeQuery } from '../../session/hooks';
import { captureTemplate, shareCapturedTemplate } from '../capture';
import {
  buildBundleShareModel,
  buildHighlightCaption,
  buildHighlightTitle,
  buildShareModel,
} from '../helpers';
import { useCreateHighlightMutation } from '../hooks';

const TEMPLATE_SPRING = { stiffness: 180, damping: 22, mass: 0.8 } as const;

export default function SharePreviewScreen() {
  const { sessionId, bundleId, quizScore } = useLocalSearchParams<{
    sessionId?: string;
    bundleId?: string;
    quizScore?: string;
  }>();

  const isBundleMode = Boolean(bundleId && bundleId.length > 0);

  const insets = useSafeAreaInsets();
  const detailQuery = useSessionDetailQuery(isBundleMode ? '' : (sessionId ?? ''));
  const bundleQuery = useSessionBundleQuery(isBundleMode ? (bundleId ?? '') : '');
  const homeQuery = useSessionHomeQuery();
  const createHighlightMutation = useCreateHighlightMutation();
  const previewRef = useRef<View>(null);
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);

  const session = detailQuery.data?.session ?? null;
  const note = detailQuery.data?.note ?? null;
  const bundle = bundleQuery.data?.bundle ?? null;

  const parsedScore = quizScore != null ? parseInt(quizScore, 10) : null;
  const scoreValue = parsedScore != null && !isNaN(parsedScore) ? parsedScore : null;

  const streakDays = homeQuery.data?.currentStreakDays ?? 0;
  const rankLabel = homeQuery.data?.rankLabel ?? 'Surface';

  const model = useMemo(() => {
    if (isBundleMode) {
      if (!bundle) return null;
      return buildBundleShareModel({ bundle, templateCode: 'nike_v1', rankLabel, streakDays });
    }
    if (!session) return null;
    return buildShareModel({ session, note, templateCode: 'nike_v1', quizScore: scoreValue, streakDays });
  }, [isBundleMode, bundle, session, note, scoreValue, streakDays, rankLabel]);

  // ── Template drag + pinch ───────────────────────────────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const templateScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedTemplateScale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      'worklet';
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      savedTemplateScale.value = templateScale.value;
    })
    .onUpdate((e) => {
      'worklet';
      templateScale.value = Math.max(0.4, Math.min(3.0, savedTemplateScale.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      if (templateScale.value < 0.5) {
        templateScale.value = withSpring(0.5, TEMPLATE_SPRING);
      }
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const templateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: templateScale.value },
    ],
  }));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setBackgroundUri(result.assets[0].uri);
    }
  };

  const handleShare = async () => {
    try {
      await Haptics.selectionAsync();
      await shareCapturedTemplate(previewRef);
    } catch (error) {
      Alert.alert('Could not share.', toApiError(error).message);
    }
  };

  const handleArchive = async () => {
    if (!model) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const renderedImagePath = await captureTemplate(previewRef);

      if (isBundleMode && bundle) {
        const response = await createHighlightMutation.mutateAsync({
          sourceType: 'sessionBundle',
          sessionId: null,
          bundleId: bundle.id,
          title: bundle.title,
          caption: `${bundle.sessionIds.length} sessions`,
          templateCode: 'nike_v1',
          renderedImagePath,
          sourcePhotoPath: backgroundUri,
          visibility: 'public',
        });
        router.replace(routes.archiveHighlightDetail(response.highlight.id));
      } else if (session) {
        const response = await createHighlightMutation.mutateAsync({
          sourceType: 'session',
          sessionId: session.id,
          bundleId: null,
          title: buildHighlightTitle(session),
          caption: buildHighlightCaption(note),
          templateCode: 'nike_v1',
          renderedImagePath,
          sourcePhotoPath: backgroundUri,
          visibility: 'public',
        });
        router.replace(routes.archiveHighlightDetail(response.highlight.id));
      }
    } catch (error) {
      Alert.alert('Could not save.', toApiError(error).message);
    }
  };

  const archiveDisabled = createHighlightMutation.isPending || !model;

  // ── Button press animations ─────────────────────────────────────────────────
  const back = usePressScale(() => router.back());
  const camera = usePressScale(handlePickImage);

  const isLoading = isBundleMode ? bundleQuery.isLoading : detailQuery.isLoading;

  if (!sessionId && !bundleId) {
    return (
      <View style={styles.centeredFill}>
        <AppText variant="body">Nothing to preview.</AppText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centeredFill}>
        <AppText variant="bodySmall" style={{ color: colors.text.tertiary }}>Loading...</AppText>
      </View>
    );
  }

  const iconColor = backgroundUri ? colors.text.inverse : colors.text.primary;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>

        {/* ── Capturable canvas ── */}
        <View ref={previewRef} collapsable={false} style={StyleSheet.absoluteFill}>
          {backgroundUri ? (
            <Image
              source={{ uri: backgroundUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* NichE logo — fixed top-right, not draggable */}
          <AppText style={[styles.brandLogo, { color: iconColor }]}>
            NichE
          </AppText>

          {model ? (
            <GestureDetector gesture={composed}>
              <Animated.View
                entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))}
                style={[styles.templateAnchor, templateAnimatedStyle]}
              >
                <NikeTemplate model={model} hasBackground={!!backgroundUri} />
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>

        {/* ── Controls overlay (not captured) ── */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

          {/* Back */}
          <GestureDetector gesture={back.gesture}>
            <Animated.View
              style={[styles.backButton, { top: insets.top + spacing.md }, back.animatedStyle]}
            >
              <Ionicons name="arrow-back" size={spacing.xl} color={iconColor} />
            </Animated.View>
          </GestureDetector>

          {/* Camera icon */}
          <GestureDetector gesture={camera.gesture}>
            <Animated.View
              style={[
                styles.cameraButton,
                { bottom: spacing['6xl'] + insets.bottom + spacing.lg },
                camera.animatedStyle,
              ]}
            >
              <Ionicons name="camera-outline" size={spacing.xl} color={colors.text.primary} />
            </Animated.View>
          </GestureDetector>

          {/* Share | Archive */}
          <View style={[styles.actionRow, { height: spacing['6xl'] + insets.bottom }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { paddingBottom: insets.bottom },
                pressed && styles.actionPressed,
              ]}
              onPress={handleShare}
            >
              <AppText variant="bodySmall" style={styles.actionLabel}>
                Share
              </AppText>
            </Pressable>

            <View style={styles.actionDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                { paddingBottom: insets.bottom },
                archiveDisabled && styles.actionDisabled,
                pressed && !archiveDisabled && styles.actionPressed,
              ]}
              onPress={handleArchive}
              disabled={archiveDisabled}
            >
              <AppText variant="bodySmall" style={styles.actionLabel}>
                {createHighlightMutation.isPending ? 'Saving...' : 'Archive'}
              </AppText>
            </Pressable>
          </View>

        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.primary,
  },
  brandLogo: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  templateAnchor: {
    position: 'absolute',
    bottom: spacing['6xl'] + spacing.xl,
    right: spacing['2xl'],
  },
  backButton: {
    position: 'absolute',
    left: spacing.xl,
    width: spacing['4xl'],
    height: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    left: spacing.xl,
    width: spacing['4xl'],
    height: spacing['4xl'],
    backgroundColor: colors.overlayWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.overlayWhite,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDivider: {
    width: 1,
    backgroundColor: colors.line.secondary,
    marginVertical: spacing.lg,
  },
  actionLabel: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionPressed: {
    opacity: 0.6,
  },
});
