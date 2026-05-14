import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');

const TASTING_LABELS = {
  tannins: 'Tannine',
  acidity: 'Säure',
  fruit: 'Frucht',
  body: 'Körper',
};

export function ScanResultSheet({
  visible,
  wine,
  onClose,
  onAddToWatchlist,
  onAddToCart,
  watchlisted,
}) {
  const ty = useSharedValue(SCREEN_H);

  useEffect(() => {
    if (visible) {
      ty.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
    } else {
      ty.value = SCREEN_H;
    }
  }, [visible, ty]);

  const close = () => {
    ty.value = withTiming(SCREEN_H, { duration: 260 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      if (e.translationY > 0) ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        ty.value = withTiming(SCREEN_H, { duration: 240 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        ty.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));

  if (!wine) return null;

  const handleWatch = () => {
    onAddToWatchlist(wine);
  };

  const handleCart = () => {
    onAddToCart(wine);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.dragArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={colors.accent} />
                <Text style={styles.aiBadgeText}>
                  Von Claude KI erkannt · Konfidenz {wine.confidence}%
                </Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={close}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.eyebrow}>{(wine.type || '').toUpperCase()}</Text>
              <Text style={styles.name}>{wine.name}</Text>
              <Text style={styles.producer}>
                {wine.producer} · {wine.year}
              </Text>

              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingNumber}>{wine.rating}</Text>
                  <Text style={styles.ratingDenom}>/100</Text>
                </View>
                <View style={styles.alcoholBadge}>
                  <Text style={styles.alcoholText}>{wine.alcohol}% vol.</Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <Meta label="Herkunft" value={wine.region} />
                <Meta label="Rebsorte" value={wine.grape} />
              </View>

              <Section title="Geschmacksprofil">
                <View style={styles.tastingNotes}>
                  {Object.entries(wine.tastingNotes || {}).map(([key, value]) => (
                    <TastingBar
                      key={key}
                      label={TASTING_LABELS[key] || key}
                      value={value}
                    />
                  ))}
                </View>
              </Section>

              <Section title="Tasting Notes">
                <Text style={styles.description}>{wine.description}</Text>
              </Section>

              <View style={styles.priceCard}>
                <View>
                  <Text style={styles.priceLabel}>Preis pro Flasche</Text>
                  <Text style={styles.price}>€ {wine.price.toFixed(2)}</Text>
                </View>
                <Ionicons name="wine" size={36} color={colors.accent} />
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.watchBtn]}
              onPress={handleWatch}
            >
              <Ionicons
                name={watchlisted ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={colors.accent}
              />
              <Text style={styles.watchText}>
                {watchlisted ? 'Gemerkt' : 'Merken'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cartBtn]}
              onPress={handleCart}
            >
              <Ionicons name="cart" size={20} color={colors.background} />
              <Text style={styles.cartText}>In den Warenkorb</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TastingBar({ label, value }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.tastingRow}>
      <Text style={styles.tastingLabel}>{label}</Text>
      <View style={styles.tastingTrack}>
        <View style={[styles.tastingFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    flex: 1,
    backgroundColor: colors.card,
    marginTop: 60,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.card,
    zIndex: 10,
  },
  handle: { width: 44, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.cardElevated,
  },
  aiBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.lg },
  eyebrow: {
    color: colors.accent,
    letterSpacing: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: spacing.sm,
    lineHeight: 34,
  },
  producer: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontSize: 15,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.cardElevated,
  },
  ratingNumber: { color: colors.accent, fontSize: 22, fontWeight: '700' },
  ratingDenom: { color: colors.textMuted, fontSize: 13, marginLeft: 2 },
  alcoholBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    justifyContent: 'center',
  },
  alcoholText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    backgroundColor: colors.cardElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  metaItem: { minWidth: '45%', flexGrow: 1 },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 2,
  },
  metaValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  tastingNotes: { gap: spacing.sm },
  tastingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tastingLabel: {
    width: 80,
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1,
  },
  tastingTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tastingFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  priceCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 2 },
  price: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  watchBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  watchText: { color: colors.accent, fontWeight: '700' },
  cartBtn: { backgroundColor: colors.accent, flex: 1.4 },
  cartText: { color: colors.background, fontWeight: '700' },
});
