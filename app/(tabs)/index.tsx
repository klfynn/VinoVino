import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { wines as ALL_WINES } from '../../data/wines';
import { useApp } from '../../context/AppContext';
import { useFilter } from '../../context/FilterContext';
import { SwipeableCard } from '../../components/SwipeableCard';
import { QuantityModal } from '../../components/QuantityModal';
import { WineDetailModal } from '../../components/WineDetailModal';
import { Wine } from '../../types';
import { colors, radii, spacing } from '../../theme';

// Maps filter chip labels to Wine.type values
const WEINART_MAP: Record<string, string> = {
  Rot: 'Rotwein',
  Weiß: 'Weißwein',
  Rosé: 'Roséwein',
  Schaumwein: 'Schaumwein',
  Port: 'Süßwein',
};

// Countries considered "Neue Welt" for the herkunft filter
const NEUE_WELT = ['USA', 'Australien', 'Neuseeland', 'Chile', 'Argentinien', 'Südafrika'];

// Maps bewertungMin (1–5 stars) to minimum 100-pt wine rating
// star 1 = no restriction; stars 2–5 progressively tighter
const STAR_MIN = [0, 0, 85, 88, 90, 95];

function CartHeaderIcon() {
  const { cartCount } = useApp();
  return (
    <View>
      <Ionicons name="cart-outline" size={24} color={colors.text} />
      {cartCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function SwipeScreen() {
  const { addToWatchlist, addToCart, watchlist } = useApp();
  const router = useRouter();
  const {
    weinart,
    geschmack,
    herkunft,
    jahrgang,
    preis,
    anlass,
    bio,
    bewertungMin,
    activeFilterCount,
  } = useFilter();

  const [index, setIndex] = useState(0);
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [detailWine, setDetailWine] = useState<Wine | null>(null);

  // TODO: replace with API query passing filter params when backend is available
  const filteredWines = useMemo(() => {
    return ALL_WINES.filter((w) => {
      if (weinart.length > 0) {
        const mapped = weinart.map((wa) => WEINART_MAP[wa]);
        if (!mapped.includes(w.type)) return false;
      }
      if (geschmack.length > 0) {
        const mapped = geschmack.map((g) => g.toLowerCase());
        if (!mapped.some((g) => w.taste.includes(g))) return false;
      }
      if (herkunft.length > 0) {
        const matches = herkunft.some((h) =>
          h === 'Neue Welt' ? NEUE_WELT.includes(w.country) : w.country === h,
        );
        if (!matches) return false;
      }
      if (w.vintage < jahrgang.min || w.vintage > jahrgang.max) return false;
      if (w.price < preis.min || w.price > preis.max) return false;
      if (w.rating < STAR_MIN[bewertungMin]) return false;
      if (bio && !w.bio) return false;
      if (anlass.length > 0 && !anlass.some((a) => w.anlass?.includes(a))) return false;
      return true;
    });
  }, [weinart, geschmack, herkunft, jahrgang, preis, bewertungMin, bio, anlass]);

  // Reset deck position whenever filters change
  useEffect(() => {
    setIndex(0);
  }, [weinart, geschmack, herkunft, jahrgang.min, jahrgang.max, preis.min, preis.max, bewertungMin, bio, anlass]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const current = filteredWines[index];
  const next = filteredWines[index + 1];

  const handleSwipeRight = useCallback(() => {
    if (current) addToWatchlist(current);
    advance();
  }, [current, addToWatchlist, advance]);

  const handleSwipeLeft = useCallback(() => { advance(); }, [advance]);
  const handleSwipeUp = useCallback(() => { if (current) setQtyWine(current); }, [current]);
  const handleTap = useCallback(() => { if (current) setDetailWine(current); }, [current]);

  const handleConfirmQty = (qty: number) => {
    if (qtyWine) {
      addToCart(qtyWine, qty);
      setQtyWine(null);
      advance();
    }
  };

  const isWatchlisted = (w: Wine | null) => !!w && watchlist.some((x) => x.id === w.id);

  const noResults = filteredWines.length === 0;
  const allDiscovered = !noResults && !current;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>VinoVino</Text>
          <Text style={styles.tagline}>Entdecke deinen nächsten Lieblingswein</Text>
        </View>
        <View style={styles.headerIcons}>
          {/* Filter icon with active-filter badge */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/filter')}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={24} color={colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {activeFilterCount > 9 ? '9+' : activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Cart icon with item count */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(tabs)/cart')}
            activeOpacity={0.7}
          >
            <CartHeaderIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Card deck ── */}
      <View style={styles.deck}>
        {noResults ? (
          <View style={styles.empty}>
            <Ionicons name="funnel-outline" size={64} color={colors.accent} />
            <Text style={styles.emptyTitle}>Keine Weine gefunden</Text>
            <Text style={styles.emptySub}>
              Die aktuellen Filter passen auf keinen Wein.
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => router.push('/filter')}>
              <Text style={styles.resetText}>Filter anpassen</Text>
            </TouchableOpacity>
          </View>
        ) : allDiscovered ? (
          <View style={styles.empty}>
            <Ionicons name="wine-outline" size={64} color={colors.accent} />
            <Text style={styles.emptyTitle}>Alle Weine entdeckt</Text>
            <Text style={styles.emptySub}>
              Schau in deine Merkliste oder starte von vorn.
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setIndex(0)}>
              <Text style={styles.resetText}>Neu starten</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {next && (
              <SwipeableCard
                key={next.id}
                wine={next}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
                onSwipeUp={() => {}}
                onTap={() => {}}
                isTop={false}
                stackIndex={1}
              />
            )}
            <SwipeableCard
              key={current.id}
              wine={current}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
              onTap={handleTap}
              isTop
              stackIndex={0}
            />
          </>
        )}
      </View>

      {/* ── Action buttons ── */}
      {current && !noResults && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.skipBtn]}
            onPress={handleSwipeLeft}
          >
            <Ionicons name="close" size={32} color={colors.skip} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cartActionBtn]}
            onPress={handleSwipeUp}
          >
            <Ionicons name="cart" size={26} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={handleSwipeRight}
          >
            <Ionicons name="bookmark" size={28} color={colors.like} />
          </TouchableOpacity>
        </View>
      )}

      <QuantityModal
        visible={!!qtyWine}
        wine={qtyWine}
        onConfirm={handleConfirmQty}
        onClose={() => setQtyWine(null)}
      />
      <WineDetailModal
        visible={!!detailWine}
        wine={detailWine}
        onClose={() => setDetailWine(null)}
        onAddToWatchlist={(w) => addToWatchlist(w)}
        onAddToCart={(w) => {
          setDetailWine(null);
          setTimeout(() => setQtyWine(w), 320);
        }}
        watchlisted={isWatchlisted(detailWine)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logo: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },

  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { padding: spacing.sm, position: 'relative' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.background, fontSize: 9, fontWeight: '700' },

  deck: { flex: 1, margin: spacing.md, marginBottom: spacing.sm },

  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
  },
  skipBtn: { borderColor: colors.skip },
  likeBtn: { borderColor: colors.like },
  cartActionBtn: { width: 56, height: 56, borderRadius: 28, borderColor: colors.accent },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  resetBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resetText: { color: colors.accent, fontWeight: '700', letterSpacing: 1 },
});
