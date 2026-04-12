import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyProfile } from '../../src/api/profile';
import DepthCardTemplate from '../../src/components/share/DepthCardTemplate';
import AppText from '../../src/components/ui/AppText';
import { queryKeys } from '../../src/constants/queryKeys';
import { useInterestDetailQuery } from '../../src/features/interest/hooks';
import { shareCapturedTemplate } from '../../src/features/share/capture';
import { toApiError } from '../../src/lib/error';

export default function InterestShareModal() {
  const insets = useSafeAreaInsets();
  const { interestId } = useLocalSearchParams<{ interestId: string }>();
  const cardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const detailQuery = useInterestDetailQuery(interestId ?? '');
  const profileQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMyProfile,
  });

  const interest = detailQuery.data?.interest;
  const logs = detailQuery.data?.logs ?? [];
  const handle = profileQuery.data?.profile.handle ?? '';
  const isLoading = detailQuery.isLoading || profileQuery.isLoading;

  const recentLog = logs.length > 0 ? logs[0] : null;

  const days = interest
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(interest.startedAt).getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  async function handleShare() {
    try {
      setIsSharing(true);
      await shareCapturedTemplate(cardRef);
    } catch (error) {
      Alert.alert('Could not share.', toApiError(error).message);
    } finally {
      setIsSharing(false);
    }
  }

  if (!interestId) {
    return (
      <View style={styles.centeredFill}>
        <AppText variant="body">Nothing to preview.</AppText>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centeredFill, { backgroundColor: '#1a1a1a' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  if (!interest) {
    return (
      <View style={[styles.centeredFill, { backgroundColor: '#1a1a1a' }]}>
        <AppText variant="body" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Failed to load.
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      {/* Capturable card — full screen */}
      <View ref={cardRef} collapsable={false} style={StyleSheet.absoluteFill}>
        <DepthCardTemplate
          interestName={interest.name}
          depthScore={interest.depthScore}
          days={days}
          recordCount={interest.recordCount}
          recentLogText={recentLog?.text ?? null}
          handle={handle}
        />
      </View>

      {/* Controls overlay — not captured */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Close */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.closeButton, { top: insets.top + 16 }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={22} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* Share */}
        <Pressable
          onPress={handleShare}
          disabled={isSharing}
          style={({ pressed }) => [
            styles.shareButton,
            { bottom: insets.bottom + 32 },
            (pressed || isSharing) && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          <AppText style={styles.shareLabel}>
            {isSharing ? 'Sharing...' : 'Share'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    position: 'absolute',
    left: 32,
    right: 32,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
