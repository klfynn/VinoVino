import React, { useEffect, useMemo, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity,
  Animated, PanResponder, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Wine, Review } from '../types';
import { useApp } from '../context/AppContext';
import { colors, radii, spacing } from '../theme';

const { height: SCREEN_H } = Dimensions.get('window');

const BIO_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Bio: 'leaf-outline',
  Natur: 'earth-outline',
  Vegan: 'nutrition-outline',
  Vegetarisch: 'leaf',
};

interface Props {
  visible: boolean;
  wine: Wine | null;
  onClose: () => void;
  onAddToWatchlist: (wine: Wine) => void;
  onAddToCart: (wine: Wine) => void;
  watchlisted: boolean;
  onAddToCellar?: (wine: Wine) => void;
}

export function WineDetailModal({
  visible, wine, onClose, onAddToWatchlist, onAddToCart, watchlisted, onAddToCellar,
}: Props) {
  const { myReviews } = useApp();
  const ty = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(ty, {
        toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start();
    } else {
      ty.setValue(SCREEN_H);
    }
  }, [visible, ty]);

  const close = () => {
    Animated.timing(ty, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) ty.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.8) {
          Animated.timing(ty, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }).start(({ finished }) => {
            if (finished) onClose();
          });
        } else {
          Animated.timing(ty, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Merge static mock reviews with any review the current user submitted this session
  const allReviews = useMemo<Review[]>(() => {
    if (!wine) return [];
    const base = wine.reviews ?? [];
    const mine = myReviews[wine.id];
    return mine ? [...base, mine] : base;
  }, [wine, myReviews]);

  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return undefined;
    const sum = allReviews.reduce((s, r) => s + r.rating, 0);
    return Math.round((sum / allReviews.length) * 10) / 10;
  }, [allReviews]);

  if (!wine) return null;

  const hasBio = (wine.bioNaturVegan?.length ?? 0) > 0;
  const hasAnlass = (wine.anlass?.length ?? 0) > 0;
  const hasPasstZu = (wine.passtZu?.length ?? 0) > 0;
  const hasReviews = allReviews.length > 0;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: ty }] }]}>
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: wine.image }} style={styles.image} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(26,10,15,0.5)', colors.card]} style={styles.imageGradient} />
              <TouchableOpacity style={styles.closeBtn} onPress={close}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingNumber}>{wine.rating}</Text>
                <Text style={styles.ratingDenom}>/100</Text>
              </View>
            </View>

            <View style={styles.body}>
              <Text style={styles.eyebrow}>{wine.type.toUpperCase()}</Text>
              <Text style={styles.name}>{wine.name}</Text>
              <Text style={styles.winery}>{wine.winery}</Text>

              {/* Bio / Natur / Vegan Badges */}
              {hasBio && (
                <View style={styles.badgeRow}>
                  {wine.bioNaturVegan!.map((b) => (
                    <View key={b} style={styles.bioBadge}>
                      <Ionicons
                        name={BIO_ICONS[b] ?? 'leaf-outline'}
                        size={11}
                        color={colors.accent}
                        style={styles.badgeIcon}
                      />
                      <Text style={styles.bioBadgeText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Kompakte Info-Grid */}
              <View style={styles.metaGrid}>
                <Meta label="Jahrgang" value={String(wine.vintage)} />
                <Meta label="Herkunft & Region" value={`${wine.country}, ${wine.region}`} />
                <Meta label="Rebsorte" value={wine.grape} />
                <Meta label="Flaschengröße" value="0,75 l" />
              </View>

              {/* Geschmack */}
              <Section title="Geschmack">
                <View style={styles.pillRow}>
                  {wine.taste.map((t) => (
                    <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
                  ))}
                </View>
              </Section>

              {/* Perfekt für (Anlass) */}
              {hasAnlass && (
                <Section title="Perfekt für">
                  <View style={styles.pillRow}>
                    {wine.anlass!.map((a) => (
                      <View key={a} style={styles.anlassPill}>
                        <Text style={styles.anlassPillText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              {/* Passt zu */}
              {hasPasstZu && (
                <Section title="Passt zu">
                  <View style={styles.pillRow}>
                    {wine.passtZu!.map((p) => (
                      <View key={p} style={styles.passtZuPill}>
                        <Text style={styles.passtZuPillText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              {/* Bewertungen */}
              {hasReviews && (
                <Section title="Bewertungen">
                  {/* Durchschnittsbewertung */}
                  {avgRating !== undefined && (
                    <View style={styles.avgRow}>
                      <StarRow rating={Math.round(avgRating)} size={18} />
                      <Text style={styles.avgNumber}>{avgRating.toFixed(1)}</Text>
                      <Text style={styles.avgCount}>
                        ({allReviews.length} {allReviews.length === 1 ? 'Bewertung' : 'Bewertungen'})
                      </Text>
                    </View>
                  )}
                  {/* Review-Liste (max. 4) */}
                  {allReviews.slice(0, 4).map((review, idx) => (
                    <ReviewRow
                      key={review.id}
                      review={review}
                      showDivider={idx < Math.min(allReviews.length, 4) - 1}
                    />
                  ))}
                </Section>
              )}

              {/* Tasting Notes */}
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
            <TouchableOpacity style={[styles.actionBtn, styles.watchBtn]} onPress={() => onAddToWatchlist(wine)}>
              <Ionicons name={watchlisted ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.accent} />
              <Text style={styles.watchText}>{watchlisted ? 'Gemerkt' : 'Merken'}</Text>
            </TouchableOpacity>
            {onAddToCellar ? (
              <TouchableOpacity style={[styles.actionBtn, styles.cartBtn]} onPress={() => onAddToCellar(wine)}>
                <Ionicons name="library" size={20} color={colors.background} />
                <Text style={styles.cartText}>Zum Weinkeller</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.cartBtn]} onPress={() => onAddToCart(wine)}>
                <Ionicons name="cart" size={20} color={colors.background} />
                <Text style={styles.cartText}>In den Warenkorb</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Text key={i} style={{ color: i < rating ? colors.accent : colors.border, fontSize: size }}>
          {i < rating ? '★' : '☆'}
        </Text>
      ))}
    </View>
  );
}

function ReviewRow({ review, showDivider }: { review: Review; showDivider: boolean }) {
  return (
    <>
      <View style={styles.reviewRow}>
        <View style={styles.reviewHeader}>
          <StarRow rating={review.rating} size={13} />
          <Text style={styles.reviewDate}>{review.date}</Text>
        </View>
        <Text style={styles.reviewUser}>{review.userName}</Text>
        {review.comment.length > 0 && (
          <Text style={styles.reviewComment}>{review.comment}</Text>
        )}
      </View>
      {showDivider && <View style={styles.reviewDivider} />}
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    flex: 1, backgroundColor: colors.card, marginTop: 60,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: colors.border, overflow: 'hidden',
  },
  dragArea: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs, backgroundColor: colors.card, zIndex: 10 },
  handle: { width: 44, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  imageWrap: { height: 380, width: '100%' },
  image: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  closeBtn: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(26,10,15,0.75)', borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute', bottom: spacing.lg, right: spacing.lg,
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: 'rgba(26,10,15,0.85)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.accent,
  },
  ratingNumber: { color: colors.accent, fontSize: 26, fontWeight: '700' },
  ratingDenom: { color: colors.textMuted, fontSize: 14, marginLeft: 2 },
  body: { padding: spacing.lg, marginTop: -spacing.lg },
  eyebrow: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  name: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: spacing.sm, lineHeight: 36 },
  winery: { color: colors.textMuted, fontStyle: 'italic', fontSize: 16, marginTop: 4 },

  // Bio badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  bioBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radii.sm, borderWidth: 1, borderColor: colors.accent,
  },
  badgeIcon: { marginRight: 4 },
  bioBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  // Info-Grid
  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg,
    backgroundColor: colors.cardElevated, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.md,
  },
  metaItem: { minWidth: '45%', flexGrow: 1 },
  metaLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 2 },
  metaValue: { color: colors.text, fontSize: 15, fontWeight: '600' },

  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700', marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated,
  },
  chipText: { color: colors.text, fontSize: 13 },

  anlassPill: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
  },
  anlassPillText: { color: colors.text, fontSize: 13 },

  passtZuPill: {
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
  },
  passtZuPillText: { color: colors.accent, fontSize: 13, fontWeight: '600' },

  // Review section
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  avgNumber: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  avgCount: { color: colors.textMuted, fontSize: 13 },

  reviewRow: { paddingVertical: spacing.sm },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewDate: { color: colors.textMuted, fontSize: 11 },
  reviewUser: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  reviewComment: { color: colors.text, fontSize: 14, opacity: 0.85, lineHeight: 20 },
  reviewDivider: { height: 1, backgroundColor: colors.border, opacity: 0.4 },

  description: { color: colors.text, fontSize: 15, lineHeight: 22, opacity: 0.9 },
  priceCard: {
    marginTop: spacing.lg, padding: spacing.lg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardElevated,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  priceLabel: { color: colors.textMuted, fontSize: 12, letterSpacing: 2 },
  price: { color: colors.accent, fontSize: 28, fontWeight: '700', marginTop: 4 },
  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    padding: spacing.md, paddingBottom: spacing.lg,
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radii.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  watchBtn: { borderWidth: 1, borderColor: colors.accent, backgroundColor: 'transparent' },
  watchText: { color: colors.accent, fontWeight: '700' },
  cartBtn: { backgroundColor: colors.accent, flex: 1.4 },
  cartText: { color: colors.background, fontWeight: '700' },
});
