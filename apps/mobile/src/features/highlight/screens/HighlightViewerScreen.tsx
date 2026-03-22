import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  Share,
  StatusBar,
  View,
  ViewabilityConfig,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import { useMyHighlightsQuery } from '../queries';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  highlightId: string;
}

export default function HighlightViewerScreen({ highlightId }: Props) {
  const highlightsQuery = useMyHighlightsQuery();
  const highlights = highlightsQuery.data ?? [];
  const flatListRef = useRef<FlatList>(null);

  const initialIndex = highlights.findIndex((h) => h.id === highlightId);

  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const viewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index!);
      }
    },
  ).current;

  useEffect(() => {
    if (highlights.length > 0 && initialIndex >= 0) {
      flatListRef.current?.scrollToIndex({
        index: initialIndex,
        animated: false,
      });
    }
  }, [highlights.length, initialIndex]);

  async function handleShare(imageUrl: string, title: string) {
    try {
      await Share.share({ url: imageUrl, message: title });
    } catch {
      // user cancelled or share failed — silent
    }
  }

  if (highlightsQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Loading...
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={highlights}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollToIndexFailed={() => {}}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
            <Image
              source={{ uri: item.renderedImageUrl }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              contentFit="contain"
            />
          </View>
        )}
      />

      {/* Overlay buttons — always on top */}
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'box-none',
        }}
      >
        {/* Top-right: close button */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 20,
            paddingTop: 12,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="x" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Bottom: share button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
            paddingBottom: 32,
            pointerEvents: 'box-none',
          }}
        >
          <Pressable
            onPress={() => {
              const current = highlights[currentIndex];
              if (current) handleShare(current.renderedImageUrl, current.title);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <Feather name="share-2" size={16} color="#fff" />
            <AppText variant="caption" style={{ color: '#fff' }}>
              Share
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
