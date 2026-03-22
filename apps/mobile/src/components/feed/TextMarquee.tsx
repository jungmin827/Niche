import { useEffect, useState } from 'react';
import { Pressable, TextStyle, View } from 'react-native';
import Animated, {
  SharedValue,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  runOnUI,
} from 'react-native-reanimated';
import AppText from '../ui/AppText';
import { WaveItem } from '../../features/feed/types';

export type MarqueeLayerConfig = {
  fontSize: number;
  color: string;
  speedPxPerSecond: number;
  direction: 'ltr' | 'rtl';
  fontWeight?: TextStyle['fontWeight'];
};

type TextMarqueeProps = {
  items: WaveItem[];
  config: MarqueeLayerConfig;
  isPaused: SharedValue<number>;
  onItemPress: (item: WaveItem) => void;
  onPressIn: () => void;
  onPressOut: () => void;
};

export default function TextMarquee({
  items,
  config,
  isPaused,
  onItemPress,
  onPressIn,
  onPressOut,
}: TextMarqueeProps) {
  const tripled = [...items, ...items, ...items];
  const posX = useSharedValue(0);
  // SharedValue for worklet access (useAnimatedReaction)
  const singleWidthSV = useSharedValue(0);
  // React state to trigger useEffect
  const [singleWidth, setSingleWidth] = useState(0);

  const isLtr = config.direction === 'ltr';
  const speed = config.speedPxPerSecond;

  // Start animation once single-copy width is measured
  useEffect(() => {
    if (singleWidth === 0) return;
    const sw = singleWidth;
    runOnUI(() => {
      'worklet';
      // LTR: 0 → -sw → 0 (seamless, new copy enters from right)
      // RTL: -sw → 0 → -sw (seamless, start at copy2 so copy1 enters from left)
      posX.value = isLtr ? 0 : -sw;
      const target = isLtr ? -sw : 0;
      posX.value = withRepeat(
        withTiming(target, {
          duration: (sw / speed) * 1000,
          easing: Easing.linear,
        }),
        -1,
      );
    })();
  }, [singleWidth]);

  // Pause / resume
  useAnimatedReaction(
    () => isPaused.value,
    (paused, prevPaused) => {
      const sw = singleWidthSV.value;
      if (sw === 0) return;

      if (paused === 1 && prevPaused !== 1) {
        cancelAnimation(posX);
      } else if (paused === 0 && prevPaused !== 0) {
        const target = isLtr ? -sw : 0;
        const remaining = Math.abs(target - posX.value);
        posX.value = withTiming(
          target,
          { duration: (remaining / speed) * 1000, easing: Easing.linear },
          (finished) => {
            if (finished) {
              posX.value = isLtr ? 0 : -sw;
              posX.value = withRepeat(
                withTiming(target, {
                  duration: (sw / speed) * 1000,
                  easing: Easing.linear,
                }),
                -1,
              );
            }
          },
        );
      }
    },
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }],
  }));

  const textStyle = {
    fontSize: config.fontSize,
    color: config.color,
    fontWeight: config.fontWeight ?? ('normal' as TextStyle['fontWeight']),
    lineHeight: config.fontSize * 1.2,
  };

  return (
    <View style={{ overflow: 'hidden' }}>
      {/*
       * Measurement view — invisible, position:absolute so it's not constrained
       * by the parent width on web. Renders ONE copy to get singleWidth.
       */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', flexDirection: 'row', opacity: 0 }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && singleWidthSV.value === 0) {
            singleWidthSV.value = w;
            setSingleWidth(w);
          }
        }}
      >
        {items.map((item, index) => (
          <View key={index} style={{ paddingHorizontal: 16 }}>
            <AppText style={textStyle} numberOfLines={1}>
              {item.title}
            </AppText>
          </View>
        ))}
      </View>

      {/* Animated content — tripled for seamless loop */}
      <Animated.View style={[{ flexDirection: 'row' }, animatedStyle]}>
        {tripled.map((item, index) => (
          <Pressable
            key={`${item.highlightId}-${index}`}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() => onItemPress(item)}
            style={{ paddingHorizontal: 16 }}
          >
            <AppText style={textStyle} numberOfLines={1}>
              {item.title}
            </AppText>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}
