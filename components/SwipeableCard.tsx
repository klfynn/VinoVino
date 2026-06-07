import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gs) => {
        const { dx, dy } = gs;

        const isTap = Math.abs(dx) < 6 && Math.abs(dy) < 6;
        if (isTap) {
          position.setValue({ x: 0, y: 0 });
          onTap();
          return;
        }

        const goingUp = dy < -SWIPE_Y && Math.abs(dy) > Math.abs(dx);
        const goingRight = dx > SWIPE_X;
        const goingLeft = dx < -SWIPE_X;

        if (goingUp) {
          Animated.timing(position, {
            toValue: { x: dx, y: -SCREEN_H },
            duration: 260,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeUp();
          });
        } else if (goingRight) {
          Animated.timing(position, {
            toValue: { x: SCREEN_W * 1.5, y: dy },
            duration: 260,
            useNativeDriver: true,
          }).start(() => onSwipeRight());
        } else if (goingLeft) {
          Animated.timing(position, {
            toValue: { x: -SCREEN_W * 1.5, y: dy },
            duration: 260,
            useNativeDriver: true,
          }).start(() => onSwipeLeft());
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 6,
        }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_X],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_X, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const cartOpacity = position.y.interpolate({
    inputRange: [-SWIPE_Y, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stackOffset = stackIndex * 10;
  const stackScale = 1 - stackIndex * 0.05;

  const cardStyle = isTop
    ? {
        transform: [
          { translateX: position.x },
          { translateY: position.y },
          { rotate },
        ],
        zIndex: 100,
      }
    : {
        transform: [
          { translateY: stackOffset },
          { scale: stackScale },
        ],
        zIndex: 100 - stackIndex,
      };

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(isTop ? panResponder.panHandlers : {})}
      pointerEvents={isTop ? 'auto' : 'none'}
    >
      <WineCardView wine={wine} />
      <Animated.View style={[styles.label, styles.likeLabel, { opacity: likeOpacity }]}>
        <Text style={styles.labelText}>MERKEN</Text>
      </Animated.View>
      <Animated.View style={[styles.label, styles.skipLabel, { opacity: skipOpacity }]}>
        <Text style={styles.labelText}>SKIP</Text>
      </Animated.View>
      <Animated.View style={[styles.label, styles.cartLabel, { opacity: cartOpacity }]}>
        <Text style={styles.labelText}>IN DEN WARENKORB</Text>
      </Animated.View>
    </Animated.View>
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
