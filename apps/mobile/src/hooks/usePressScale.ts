import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING_CONFIG = { stiffness: 200, damping: 20 } as const;

export function usePressScale(onPress?: () => void, disabled = false) {
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.97, SPRING_CONFIG);
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1.0, SPRING_CONFIG);
    })
    .onEnd(() => {
      'worklet';
      if (onPress) runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { gesture, animatedStyle };
}
