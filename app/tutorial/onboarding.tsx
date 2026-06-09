import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTutorial } from '../../context/TutorialContext';
import { colors, radii, spacing } from '../../theme';

const { width, height } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(height * 0.6);

const SLIDES = [
  {
    key: 'welcome',
    title: 'Willkommen bei VinoVino',
    text: 'Entdecke Weine die zu dir passen – wie Tinder, aber für Wein.',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
  },
  {
    key: 'swipe',
    title: 'Entdecke neue Weine',
    text: 'Wische rechts wenn dir ein Wein gefällt, links zum Überspringen. Nach oben wischen legt ihn direkt in den Warenkorb.',
    image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800',
  },
  {
    key: 'scanner',
    title: 'Etikett scannen',
    text: 'Scanne das Etikett einer Flasche – die KI erkennt den Wein sofort und zeigt dir alle Infos.',
    image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800',
  },
  {
    key: 'cellar',
    title: 'Dein digitaler Weinkeller',
    text: 'Merke Weine für später oder verwalte deinen kompletten Weinkeller – inklusive Anzahl der Flaschen.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  },
  {
    key: 'filter',
    title: 'Finde genau deinen Wein',
    text: 'Filtere nach Weinart, Jahrgang, Geschmack, Herkunft und mehr. Deine Auswahl landet direkt im Warenkorb.',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800',
  },
  {
    key: 'recipes',
    title: 'Wein & Küche',
    text: 'Entdecke Rezepte für jeden Anlass – mit passenden Weinempfehlungen direkt aus unserem Katalog. Von Vorspeise bis Nachspeise.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  },
];

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
            {/* Photo area – top 60% */}
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: slide.image }}
                style={styles.photo}
                resizeMode="cover"
              />
              {/* Dark gradient overlay for readability */}
              <View style={styles.photoOverlay} />
            </View>

            {/* Text area – bottom 40% */}
            <View style={styles.textArea}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideText}>{slide.text}</Text>
            </View>
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
          <Text style={styles.nextBtnText}>{isLast ? "Los geht's!" : 'Weiter'}</Text>
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
    backgroundColor: colors.background,
  },
  photoContainer: {
    width,
    height: PHOTO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 15, 0.45)',
  },
  textArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 160,
    justifyContent: 'flex-start',
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  slideText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 23,
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
