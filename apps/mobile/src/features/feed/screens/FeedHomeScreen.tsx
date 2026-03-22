import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';

import AppButton from '@/components/ui/AppButton';
import AppText from '@/components/ui/AppText';
import TextMarquee from '@/components/feed/TextMarquee';
import { toApiError } from '@/lib/error';
import { useWaveFeedQuery } from '../queries';
import { WaveItem } from '../types';

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function FeedHomeScreen() {
  const waveQuery = useWaveFeedQuery();
  const isPaused = useSharedValue(0);
  const [selectedItem, setSelectedItem] = useState<WaveItem | null>(null);

  function handlePressIn() {
    isPaused.value = 1;
  }

  function handlePressOut() {
    if (selectedItem === null) {
      isPaused.value = 0;
    }
  }

  function handleItemPress(item: WaveItem) {
    setSelectedItem(item);
  }

  function handleCloseOverlay() {
    setSelectedItem(null);
    isPaused.value = 0;
  }

  if (waveQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Loading...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (waveQuery.isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <AppText variant="title" style={{ marginBottom: 8 }}>
            Could not load wave.
          </AppText>
          <AppText variant="bodySmall" style={{ color: '#8A8A84', marginBottom: 16 }}>
            {toApiError(waveQuery.error).message}
          </AppText>
          <AppButton label="Retry" variant="secondary" onPress={() => waveQuery.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const items = waveQuery.data ?? [];

  if (items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodySmall" style={{ color: '#8A8A84' }}>
            Nothing circulating yet.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <AppText variant="title" style={{ letterSpacing: -0.5 }}>
          Wave
        </AppText>
        <AppText variant="caption" style={{ color: '#8A8A84', marginTop: 2 }}>
          {formatHeaderDate()}
        </AppText>
      </View>

      {/* Marquee layers */}
      <View style={{ flex: 1, justifyContent: 'center', gap: 48 }}>
        {/* Layer 1 — background ghost */}
        <TextMarquee
          items={items}
          config={{
            fontSize: 72,
            color: '#EFEFEA',
            speedPxPerSecond: 20,
            direction: 'ltr',
          }}
          isPaused={isPaused}
          onItemPress={handleItemPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />

        {/* Layer 2 — middle */}
        <TextMarquee
          items={items}
          config={{
            fontSize: 28,
            color: '#555555',
            speedPxPerSecond: 60,
            direction: 'rtl',
          }}
          isPaused={isPaused}
          onItemPress={handleItemPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />

        {/* Layer 3 — foreground */}
        <TextMarquee
          items={items}
          config={{
            fontSize: 18,
            color: '#111111',
            speedPxPerSecond: 100,
            direction: 'ltr',
            fontWeight: 'bold',
          }}
          isPaused={isPaused}
          onItemPress={handleItemPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />
      </View>

      {/* Overlay */}
      {selectedItem !== null && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={handleCloseOverlay}
            style={{ position: 'absolute', top: 56, right: 20 }}
            hitSlop={12}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          {/* Image or fallback */}
          {selectedItem.imageUrl ? (
            <Image
              source={{ uri: selectedItem.imageUrl }}
              style={{
                width: '75%',
                aspectRatio: 9 / 16,
                borderRadius: 4,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: '75%',
                aspectRatio: 9 / 16,
                borderRadius: 4,
                backgroundColor: '#111111',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <AppText
                variant="body"
                style={{ color: '#FFFFFF', textAlign: 'center', lineHeight: 26 }}
              >
                {selectedItem.title}
              </AppText>
            </View>
          )}

          {/* Bottom bar */}
          <View
            style={{
              position: 'absolute',
              bottom: 48,
              left: 24,
              right: 24,
              gap: 4,
            }}
          >
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
              @{selectedItem.authorHandle}
            </AppText>
            <AppText
              variant="bodySmall"
              style={{ color: '#FFFFFF' }}
              numberOfLines={2}
            >
              {selectedItem.title}
            </AppText>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
