import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import AppText from '../../../components/ui/AppText';
import { presignHighlightUpload, uploadImageToStorage } from '../../../api/highlight';
import { useCreateHighlightMutation } from '../mutations';
import { useSessionQuizResultQuery } from '../queries';

const { width: screenWidth } = Dimensions.get('window');

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
      {/* Bottom overlay */}
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
      {/* NichE watermark */}
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
  const [isSaving, setIsSaving] = useState(false);

  const quizResultQuery = useSessionQuizResultQuery(sessionId);
  const createHighlightMutation = useCreateHighlightMutation();

  const dateLabel = formatHighlightDate(completedAt);
  const totalScore = quizResultQuery.data?.totalScore ?? null;
  const scoreLabel = totalScore !== null ? `${totalScore} / 100` : 'No score';

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
    if (isSaving) return;
    setIsSaving(true);
    try {
      const renderedUri: string = await viewShotRef.current.capture();

      const renderedPresign = await presignHighlightUpload('highlightRendered', 'image/jpeg', 'jpg');
      await uploadImageToStorage(renderedPresign, renderedUri);

      let sourcePhotoPath: string | null = null;
      if (photoUri) {
        const photoPresign = await presignHighlightUpload(
          'highlightSourcePhoto',
          'image/jpeg',
          'jpg',
        );
        await uploadImageToStorage(photoPresign, photoUri);
        sourcePhotoPath = photoPresign.path;
      }

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

      router.replace('/(tabs)/archive');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message ?? '' : '';
      const isConflict = msg.includes('409');
      Alert.alert(
        isConflict ? 'Already saved' : 'Save failed',
        isConflict
          ? 'A highlight already exists for this session.'
          : 'Could not save highlight. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} disabled={isSaving}>
          <AppText variant="bodySmall" style={{ color: isSaving ? '#8A8A84' : '#111' }}>
            Cancel
          </AppText>
        </Pressable>
        <AppText variant="caption" style={{ color: '#8A8A84' }}>
          Preview
        </AppText>
        <Pressable onPress={handleSave} hitSlop={8} disabled={isSaving}>
          <AppText variant="bodySmall" style={{ color: isSaving ? '#8A8A84' : '#111' }}>
            Save
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Template preview */}
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

        {/* Photo picker row */}
        <Pressable onPress={handlePickPhoto} style={styles.photoPickerRow}>
          <Feather name="camera" size={18} color="#555" />
          <AppText variant="bodySmall">{photoUri ? 'Change photo' : 'Add photo'}</AppText>
        </Pressable>

        {isSaving ? (
          <AppText
            variant="caption"
            style={{ color: '#8A8A84', textAlign: 'center', marginTop: 16 }}
          >
            Saving...
          </AppText>
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
    borderBottomColor: '#D9D9D4',
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
    borderBottomColor: '#D9D9D4',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
});
