import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { TIERS, Tier } from '../../../content/academy';
import { tierLabel } from '../../../content/academy/helpers';
import {
  initialTierIndex,
  isTierComplete,
  isTierUnlocked,
  tierProgress,
} from '../../../lib/academy/unlock';
import { useAcademyProgress } from '../../../lib/academy/useAcademyProgress';
import { useAcademyStreak } from '../../../lib/academy/useAcademyStreak';
import { ErrorState, LoadingState, ProgressBar } from '../../../components/academy/AcademyUI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.78);
const CARD_GAP = 14;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_GAP / 2;
const FREEZE_COLOR = '#b8d8e8';

function lockedHint(tier: Tier): string {
  return `Schließe zuerst alle Pflichtlektionen von Tier ${(tier.tier ?? 1) - 1} ab`;
}

// ── Kopfbereich: Streak ───────────────────────────────────────────────────────

function StreakBadge({
  currentStreak,
  freezeAvailable,
}: {
  currentStreak: number | null;
  freezeAvailable: boolean;
}) {
  const active = currentStreak !== null && currentStreak > 0;
  return (
    <View
      style={styles.streak}
      accessibilityLabel={
        currentStreak === null
          ? 'Streak nicht verfügbar'
          : `Streak: ${currentStreak} ${currentStreak === 1 ? 'Tag' : 'Tage'}${freezeAvailable ? ', Freeze verfügbar' : ''}`
      }
    >
      <View style={[styles.streakInner, !active && styles.dimmed]}>
        <Ionicons name="flame" size={20} color={colors.accent} />
        <Text style={styles.streakText}>{currentStreak === null ? '–' : currentStreak}</Text>
      </View>
      {freezeAvailable && <Ionicons name="snow-outline" size={16} color={FREEZE_COLOR} style={styles.freeze} />}
    </View>
  );
}

// ── Karussell-Karte ───────────────────────────────────────────────────────────

function TierCard({
  tier,
  index,
  scrollX,
  completedIds,
  onPress,
}: {
  tier: Tier;
  index: number;
  scrollX: Animated.Value;
  completedIds: Set<string>;
  onPress: (tier: Tier, unlocked: boolean) => void;
}) {
  const unlocked = isTierUnlocked(tier, completedIds);
  const complete = unlocked && isTierComplete(tier, completedIds);
  const { done, total } = tierProgress(tier, completedIds);

  const inputRange = [(index - 1) * SNAP_INTERVAL, index * SNAP_INTERVAL, (index + 1) * SNAP_INTERVAL];
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });

  return (
    <Animated.View style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(tier, unlocked)}
        style={[styles.card, unlocked ? styles.cardUnlocked : styles.cardLocked]}
        accessibilityRole="button"
        accessibilityLabel={`${tierLabel(tier)}: ${tier.name}${unlocked ? '' : ', gesperrt'}`}
      >
        <View style={[styles.cardContent, !unlocked && styles.lockedContent]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.tierLabel}>{tierLabel(tier).toUpperCase()}</Text>
            {!unlocked && <Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
            {complete && <Ionicons name="checkmark-circle" size={24} color={colors.like} />}
          </View>

          <Text style={styles.tierName}>{tier.name}</Text>
          <View style={styles.divider} />
          <Text style={styles.tierDesc} numberOfLines={4}>
            {tier.beschreibung}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.lessonCount}>
              {total} {total === 1 ? 'Lektion' : 'Lektionen'}
            </Text>
            <Text style={styles.progressText}>
              {done} von {total} Lektionen
            </Text>
            <ProgressBar done={done} total={total} style={styles.progressBar} />
            {!unlocked && <Text style={styles.lockedHint}>{lockedHint(tier)}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Seiten-Punkte ─────────────────────────────────────────────────────────────

function Dots({ count, scrollX }: { count: number; scrollX: Animated.Value }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => {
        const inputRange = [(i - 1) * SNAP_INTERVAL, i * SNAP_INTERVAL, (i + 1) * SNAP_INTERVAL];
        const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
        const scale = scrollX.interpolate({ inputRange, outputRange: [1, 1.4, 1], extrapolate: 'clamp' });
        return <Animated.View key={i} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
      })}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AcademyScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { completedIds, loading, error, refresh } = useAcademyProgress();
  const { currentStreak, freezeAvailable } = useAcademyStreak();

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const didInitialScroll = useRef(false);
  const isFirstFocus = useRef(true);

  const [hint, setHint] = useState<string | null>(null);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fortschritt beim Zurückkehren still aktualisieren (erstes Laden macht der Hook selbst).
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const startIndex = useMemo(() => initialTierIndex(completedIds), [completedIds]);

  const jumpToStart = useCallback(() => {
    if (didInitialScroll.current || loading || error) return;
    didInitialScroll.current = true;
    const x = startIndex * SNAP_INTERVAL;
    scrollRef.current?.scrollTo({ x, animated: false });
    scrollX.setValue(x);
  }, [startIndex, loading, error, scrollX]);

  const showHint = useCallback(
    (text: string) => {
      setHint(text);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      Animated.timing(hintOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hintTimer.current = setTimeout(() => {
        Animated.timing(hintOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() =>
          setHint(null),
        );
      }, 2600);
    },
    [hintOpacity],
  );

  const handleCardPress = useCallback(
    (tier: Tier, unlocked: boolean) => {
      if (!unlocked) {
        showHint(lockedHint(tier));
        return;
      }
      router.push({ pathname: '/academy/tier/[key]', params: { key: tier.key } });
    },
    [router, showHint],
  );

  const onScroll = useMemo(
    () =>
      Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true },
      ),
    [scrollX],
  );

  // Nicht eingeloggt: Die App leitet über den AuthGate (app/_layout.tsx) zum Login weiter.
  if (!isAuthenticated) return <SafeAreaView style={styles.container} edges={['top']} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Wein-Akademie</Text>
          <Text style={styles.headerSub}>Vom Novizen zum Sommelier-Niveau</Text>
        </View>
        <StreakBadge currentStreak={currentStreak} freezeAvailable={freezeAvailable} />
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <View style={styles.body}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={styles.carousel}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={jumpToStart}
          >
            {TIERS.map((tier, i) => (
              <TierCard
                key={tier.key}
                tier={tier}
                index={i}
                scrollX={scrollX}
                completedIds={completedIds}
                onPress={handleCardPress}
              />
            ))}
          </Animated.ScrollView>

          <Dots count={TIERS.length} scrollX={scrollX} />

          <View style={styles.hintArea}>
            {hint && (
              <Animated.View style={[styles.hint, { opacity: hintOpacity }]}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.accent} />
                <Text style={styles.hintText}>{hint}</Text>
              </Animated.View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  streakInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  freeze: {
    marginLeft: 2,
  },
  dimmed: {
    opacity: 0.4,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  carousel: {
    paddingHorizontal: SIDE_PADDING,
    alignItems: 'center',
  },
  cardWrap: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_GAP / 2,
  },
  card: {
    minHeight: 400,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
  },
  cardUnlocked: {
    borderColor: colors.accent,
  },
  cardLocked: {
    borderColor: colors.border,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  lockedContent: {
    opacity: 0.45,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  tierLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tierName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '300',
    fontStyle: 'italic',
    marginTop: spacing.lg,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.md,
  },
  tierDesc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  lessonCount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  progressBar: {
    marginTop: spacing.sm,
  },
  lockedHint: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  hintArea: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  hintText: {
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
});
