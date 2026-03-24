import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import AppText from '../../../components/ui/AppText';
import { presignHighlightUpload, uploadImageToStorage } from '../../../api/highlight';
import { useCreateHighlightMutation } from '../mutations';
import { useSessionQuizResultQuery } from '../queries';
import { colors, spacing } from '../../../theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

// ── Save steps ────────────────────────────────────────────────────────────────
// 0 = idle, 1 = capturing/presigning, 2 = uploading, 3 = saving to API
type SaveStep = 0 | 1 | 2 | 3;

const STEP_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Preparing...',
  2: 'Uploading...',
  3: 'Saving...',
};

// ── Progress bar ──────────────────────────────────────────────────────────────
function UploadProgressBar({ step }: { step: SaveStep }) {
  const progress = useSharedValue(0);

  // Animate to the target fraction each time step changes
  const targetFraction = step === 0 ? 0 : step === 1 ? 0.33 : step === 2 ? 0.66 : 1.0;
  progress.value = withTiming(targetFraction, { duration: 320, easing: Easing.out(Easing.cubic) });

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  if (step === 0) return null;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>
      <View style={styles.progressSteps}>
        {([1, 2, 3] as const).map((s) => (
          <View key={s} style={styles.progressStepItem}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive]} />
            <AppText
              variant="caption"
              style={[styles.progressStepLabel, step >= s ? styles.progressStepLabelActive : undefined]}
            >
              {s === 1 ? 'Prepare' : s === 2 ? 'Upload' : 'Save'}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Highlight template ────────────────────────────────────────────────────────
function formatHighlightDate(isoString: string) {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(isoString),
  );
}

interface HighlightTemplateProps {
  width: number;
  height: number;
  sessionTitle: string;
  actualMinutes: number;
  dateLabel: string;
  scoreLabel: string;
  photoUri: string | null;
}

function HighlightTemplate({
  width,
  height,
  sessionTitle,
  actualMinutes,
  dateLabel,
  scoreLabel,
  photoUri,
}: HighlightTemplateProps) {
  return (
    <View style={[styles.templateContainer, { width, height }]}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : null}
      <View style={styles.templateOverlay}>
        <View style={styles.templateDivider} />
        <AppText
          variant="title"
          style={{ color: '#FFFFFF', fontWeight: '700', marginBottom: 6 }}
          numberOfLines={2}
        >
          {sessionTitle}
        </AppText>
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {actualMinutes} min{'  ·  '}{dateLabel}
        </AppText>
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
          {scoreLabel}
        </AppText>
      </View>
      <AppText
        style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 10,
          letterSpacing: 1,
        }}
      >
        NichE
      </AppText>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  sessionId: string;
  sessionTitle: string;
  actualMinutes: number;
  completedAt: string;
}

export default function HighlightCreateScreen({
  sessionId,
  sessionTitle,
  actualMinutes,
  completedAt,
}: Props) {
  const viewShotRef = useRef<any>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saveStep, setSaveStep] = useState<SaveStep>(0);

  const quizResultQuery = useSessionQuizResultQuery(sessionId);
  const createHighlightMutation = useCreateHighlightMutation();

  const dateLabel = formatHighlightDate(completedAt);
  const totalScore = quizResultQuery.data?.totalScore ?? null;
  const scoreLabel = totalScore !== null ? `${totalScore} / 100` : 'No score';

  // Card scale reveal on mount
  const cardScale = useSharedValue(1.05);
  const cardOpacity = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  // Trigger reveal once (layout effect equivalent via onLayout or direct SV set)
  // Using withSpring on first paint via immediate SV assignment on render
  if (cardOpacity.value === 0) {
    cardOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1.0, { stiffness: 180, damping: 20 });
  }

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (saveStep !== 0) return;
    try {
      // Step 1: capture + presign
      setSaveStep(1);
      const renderedUri: string = await viewShotRef.current.capture();
      const renderedPresign = await presignHighlightUpload('highlightRendered', 'image/jpeg', 'jpg');

      // Step 2: upload
      setSaveStep(2);
      await uploadImageToStorage(renderedPresign, renderedUri);

      let sourcePhotoPath: string | null = null;
      if (photoUri) {
        const photoPresign = await presignHighlightUpload('highlightSourcePhoto', 'image/jpeg', 'jpg');
        await uploadImageToStorage(photoPresign, photoUri);
        sourcePhotoPath = photoPresign.path;
      }

      // Step 3: save to API
      setSaveStep(3);
      await createHighlightMutation.mutateAsync({
        sourceType: 'session',
        sessionId,
        bundleId: null,
        title: sessionTitle,
        caption: null,
        templateCode: 'mono_story_v1',
        renderedImagePath: renderedPresign.path,
        sourcePhotoPath,
        visibility: 'public',
      });

      // Brief pause so the bar hits 100% before navigating
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      router.replace('/(tabs)/archive');
    } catch (e: unknown) {
      setSaveStep(0);
      const msg = e instanceof Error ? e.message ?? '' : '';
      const isConflict = msg.includes('409');
      Alert.alert(
        isConflict ? 'Already saved' : 'Save failed',
        isConflict
          ? 'A highlight already exists for this session.'
          : 'Could not save highlight. Please try again.',
      );
    }
  }

  const isSaving = saveStep !== 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} disabled={isSaving}>
          <AppText variant="bodySmall" style={{ color: isSaving ? colors.text.tertiary : colors.text.primary }}>
            Cancel
          </AppText>
        </Pressable>
        <AppText variant="caption" style={{ color: colors.text.tertiary }}>
          Preview
        </AppText>
        <Pressable onPress={handleSave} hitSlop={8} disabled={isSaving}>
          <AppText variant="bodySmall" style={{ color: isSaving ? colors.text.tertiary : colors.text.primary }}>
            Save
          </AppText>
        </Pressable>
      </View>

      {/* Progress bar — only visible while saving */}
      <UploadProgressBar step={saveStep} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Template preview — scale+opacity reveal on mount */}
        <Animated.View style={cardStyle}>
          <View
            style={{
              width: screenWidth,
              height: (screenWidth * 5) / 7,
              overflow: 'hidden',
              alignSelf: 'center',
            }}
          >
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'jpg', quality: 0.9 }}
              style={{ width: screenWidth, height: (screenWidth * 5) / 7 }}
            >
              <View style={{ width: screenWidth, height: (screenWidth * 5) / 7 }}>
                <HighlightTemplate
                  width={screenWidth}
                  height={(screenWidth * 5) / 7}
                  sessionTitle={sessionTitle}
                  actualMinutes={actualMinutes}
                  dateLabel={dateLabel}
                  scoreLabel={scoreLabel}
                  photoUri={photoUri}
                />
              </View>
            </ViewShot>
          </View>
        </Animated.View>

        {/* Photo picker row */}
        <Pressable onPress={handlePickPhoto} disabled={isSaving} style={styles.photoPickerRow}>
          <Feather name="camera" size={18} color={colors.text.secondary} />
          <AppText variant="bodySmall">{photoUri ? 'Change photo' : 'Add photo'}</AppText>
        </Pressable>

        {/* Save step label */}
        {isSaving ? (
          <Animated.View
            entering={FadeInDown.duration(200).easing(Easing.out(Easing.cubic))}
            style={{ alignItems: 'center', marginTop: spacing.md }}
          >
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {STEP_LABELS[saveStep as 1 | 2 | 3]}
            </AppText>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line.secondary,
  },
  templateContainer: {
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  templateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
  },
  templateDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line.secondary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  // ── Progress bar ──
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line.secondary,
  },
  progressTrack: {
    height: 2,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 1,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line.secondary,
  },
  progressDotActive: {
    backgroundColor: colors.text.primary,
  },
  progressStepLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
  progressStepLabelActive: {
    color: colors.text.primary,
  },
});
