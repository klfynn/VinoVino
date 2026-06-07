import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTutorial, TUTORIAL_SEEN_KEY } from '../../context/TutorialContext';
import { colors, radii, spacing } from '../../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'welcome',
    title: 'Willkommen bei VinoVino',
    text: 'Entdecke Weine die zu dir passen – wie Tinder, aber für Wein.',
    illustration: 'welcome',
  },
  {
    key: 'swipe',
    title: 'Entdecke neue Weine',
    text: 'Wische rechts wenn dir ein Wein gefällt, links zum Überspringen. Nach oben wischen legt ihn direkt in den Warenkorb.',
    illustration: 'swipe',
  },
  {
    key: 'scanner',
    title: 'Etikett scannen',
    text: 'Scanne das Etikett einer Flasche – die KI erkennt den Wein sofort und zeigt dir alle Infos.',
    illustration: 'scanner',
  },
  {
    key: 'cellar',
    title: 'Dein digitaler Weinkeller',
    text: 'Merke Weine für später oder verwalte deinen kompletten Weinkeller – inklusive Anzahl der Flaschen.',
    illustration: 'cellar',
  },
  {
    key: 'filter',
    title: 'Finde genau deinen Wein',
    text: 'Filtere nach Weinart, Jahrgang, Geschmack, Herkunft und mehr. Deine Auswahl landet direkt im Warenkorb.',
    illustration: 'filter',
  },
];

function WelcomeIllustration() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[styles.illustrationWrap, { transform: [{ scale: pulse }] }]}>
      <Text style={styles.illustrationEmoji}>🍷</Text>
      <View style={styles.logoTextWrap}>
        <Text style={styles.logoText}>VinoVino</Text>
      </View>
    </Animated.View>
  );
}

function SwipeIllustration() {
  const leftAnim = useRef(new Animated.Value(0)).current;
  const rightAnim = useRef(new Animated.Value(0)).current;
  const upAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(leftAnim, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(leftAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.delay(400),
      ]),
    );
    const rightLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(rightAnim, { toValue: 12, duration: 500, useNativeDriver: true }),
        Animated.timing(rightAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.delay(200),
      ]),
    );
    const upLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(upAnim, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(upAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    leftLoop.start();
    rightLoop.start();
    upLoop.start();
    return () => {
      leftLoop.stop();
      rightLoop.stop();
      upLoop.stop();
    };
  }, [leftAnim, rightAnim, upAnim]);

  return (
    <View style={styles.illustrationWrap}>
      {/* Wine card mock */}
      <View style={styles.swipeCard}>
        <Text style={styles.swipeCardEmoji}>🍾</Text>
      </View>
      {/* Direction arrows */}
      <View style={styles.arrowRow}>
        <Animated.Text style={[styles.arrowText, { transform: [{ translateX: leftAnim }] }]}>←</Animated.Text>
        <Animated.Text style={[styles.arrowText, { transform: [{ translateY: upAnim }], marginTop: -8 }]}>↑</Animated.Text>
        <Animated.Text style={[styles.arrowText, { transform: [{ translateX: rightAnim }] }]}>→</Animated.Text>
      </View>
    </View>
  );
}

function ScannerIllustration() {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [scan]);

  const scanLineY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 80] });

  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.scanFrame}>
        {/* Corner marks */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        {/* Scan line */}
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
        <Text style={styles.scanEmoji}>📷</Text>
      </View>
    </View>
  );
}

function CellarIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.cellarGrid}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.cellarSlot}>
            <Text style={styles.cellarBottle}>🍷</Text>
          </View>
        ))}
      </View>
      <Text style={styles.cellarLabel}>Mein Weinkeller</Text>
    </View>
  );
}

function FilterIllustration() {
  return (
    <View style={styles.illustrationWrap}>
      <View style={styles.filterRow}>
        <View style={styles.filterBox}>
          <Text style={styles.illustrationEmoji}>⚙️</Text>
          <Text style={styles.filterBoxLabel}>Filter</Text>
        </View>
        <Text style={styles.filterArrow}>→</Text>
        <View style={styles.filterBox}>
          <Text style={styles.illustrationEmoji}>🛒</Text>
          <Text style={styles.filterBoxLabel}>Warenkorb</Text>
        </View>
      </View>
    </View>
  );
}

function Illustration({ type }: { type: string }) {
  switch (type) {
    case 'welcome': return <WelcomeIllustration />;
    case 'swipe': return <SwipeIllustration />;
    case 'scanner': return <ScannerIllustration />;
    case 'cellar': return <CellarIllustration />;
    case 'filter': return <FilterIllustration />;
    default: return null;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { startCoachMarks, finishCoachMarks } = useTutorial();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentSlide(index);
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      handleStart();
    }
  };

  const handleStart = () => {
    startCoachMarks();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    await finishCoachMarks();
    router.replace('/(tabs)');
  };

  const handleScroll = (e: any) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slide);
  };

  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Überspringen</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={styles.slide}>
            <Illustration type={slide.illustration} />
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideText}>{slide.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentSlide ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{isLast ? 'Los geht\'s!' : 'Weiter'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    paddingBottom: 160,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    height: 180,
  },
  illustrationEmoji: {
    fontSize: 72,
    textAlign: 'center',
  },
  logoTextWrap: {
    marginTop: spacing.sm,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 2,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  slideText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Swipe illustration
  swipeCard: {
    width: 100,
    height: 140,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  swipeCardEmoji: {
    fontSize: 48,
  },
  arrowRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 32,
    color: colors.accent,
    fontWeight: '700',
  },
  // Scanner illustration
  scanFrame: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.accent,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.8,
  },
  scanEmoji: {
    fontSize: 52,
  },
  // Cellar illustration
  cellarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 150,
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  cellarSlot: {
    width: 44,
    height: 44,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellarBottle: {
    fontSize: 22,
  },
  cellarLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  // Filter illustration
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterBox: {
    width: 80,
    height: 80,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterBoxLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterArrow: {
    fontSize: 24,
    color: colors.accent,
    fontWeight: '700',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: radii.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  nextBtnText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
