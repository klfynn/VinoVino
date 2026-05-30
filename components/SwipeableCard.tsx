import React from 'react';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Wine } from '../types';
import { WineCardView } from './WineCardView';
import { colors, radii } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SWIPE_X = SCREEN_W * 0.28;
const SWIPE_Y = 120;

interface Props {
  wine: Wine;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onTap: () => void;
  isTop: boolean;
  stackIndex: number;
}

export function SwipeableCard({
  wine,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onTap,
  isTop,
  stackIndex,
}: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const goingUp = translationY < -SWIPE_Y && Math.abs(translationY) > Math.abs(translationX);
      const goingRight = translationX > SWIPE_X;
      const goingLeft = translationX < -SWIPE_X;

      if (goingUp) {
        tx.value = withTiming(translationX, { duration: 220 });
        ty.value = withTiming(-SCREEN_H, { duration: 260 }, (finished) => {
          if (finished) {
            runOnJS(onSwipeUp)();
            tx.value = 0;
            ty.value = 0;
          }
        });
      } else if (goingRight) {
        tx.value = withTiming(SCREEN_W * 1.5, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
        ty.value = withTiming(translationY, { duration: 260 });
      } else if (goingLeft) {
        tx.value = withTiming(-SCREEN_W * 1.5, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onSwipeLeft)();
        });
        ty.value = withTiming(translationY, { duration: 260 });
      } else {
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
    });

  const tap = Gesture.Tap()
    .enabled(isTop)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const composed = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(tx.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12], Extrapolation.CLAMP);
    const stackOffset = stackIndex * 10;
    const stackScale = 1 - stackIndex * 0.05;
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value + (isTop ? 0 : stackOffset) },
        { rotate: `${rotate}deg` },
        { scale: isTop ? 1 : stackScale },
      ],
      zIndex: 100 - stackIndex,
    };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, SWIPE_X], [0, 1], Extrapolation.CLAMP),
  }));
  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_X, 0], [1, 0], Extrapolation.CLAMP),
  }));
  const cartStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [-SWIPE_Y, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, cardStyle]} pointerEvents={isTop ? 'auto' : 'none'}>
        <WineCardView wine={wine} onPress={onTap} />
        <Animated.View style={[styles.label, styles.likeLabel, likeStyle]}>
          <Text style={styles.labelText}>MERKEN</Text>
        </Animated.View>
        <Animated.View style={[styles.label, styles.skipLabel, skipStyle]}>
          <Text style={styles.labelText}>SKIP</Text>
        </Animated.View>
        <Animated.View style={[styles.label, styles.cartLabel, cartStyle]}>
          <Text style={styles.labelText}>IN DEN WARENKORB</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  label: {
    position: 'absolute',
    top: 40,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 3,
  },
  labelText: {
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
    color: colors.text,
  },
  likeLabel: {
    right: 24,
    borderColor: colors.like,
    transform: [{ rotate: '12deg' }],
  },
  skipLabel: {
    left: 24,
    borderColor: colors.skip,
    transform: [{ rotate: '-12deg' }],
  },
  cartLabel: {
    alignSelf: 'center',
    top: 80,
    borderColor: colors.accent,
  },
});
