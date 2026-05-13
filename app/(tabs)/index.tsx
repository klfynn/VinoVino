import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { wines as ALL_WINES } from '../../data/wines';
import { useApp } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { SwipeableCard } from '../../components/SwipeableCard';
import { QuantityModal } from '../../components/QuantityModal';
import { WineDetailModal } from '../../components/WineDetailModal';
import { Wine } from '../../types';
import { colors, radii, spacing } from '../../theme';

export default function SwipeScreen() {
  const router = useRouter();
  const { addToWatchlist, addToCart, watchlist, cartCount } = useApp();
  const { applyFilters, activeFilterCount } = useFilters();

  // TODO: Replace with paginated server query honoring filters.
  const visibleWines = useMemo(() => applyFilters(ALL_WINES), [applyFilters]);

  const [index, setIndex] = useState(0);
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [detailWine, setDetailWine] = useState<Wine | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [visibleWines]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const current = visibleWines[index];
  const next = visibleWines[index + 1];

  const handleSwipeRight = useCallback(() => {
    if (current) addToWatchlist(current);
    advance();
  }, [current, addToWatchlist, advance]);

  const handleSwipeLeft = useCallback(() => {
    advance();
  }, [advance]);
  const handleSwipeUp = useCallback(() => {
    if (current) setQtyWine(current);
  }, [current]);
  const handleTap = useCallback(() => {
    if (current) setDetailWine(current);
  }, [current]);

  const handleConfirmQty = (qty: number) => {
    if (qtyWine) {
      addToCart(qtyWine, qty);
      setQtyWine(null);
      advance();
    }
  };

  const handleCloseQty = () => setQtyWine(null);
  const handleReset = () => setIndex(0);
  const isWatchlisted = (w: Wine | null) => !!w && watchlist.some((x) => x.id === w.id);

  const openFilter = () => router.push('/filter');
  const openCart = () => router.push('/cart');

  const noResults = visibleWines.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>VinoVino</Text>
          <Text style={styles.tagline}>Entdecke deinen nächsten Lieblingswein</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={openFilter} hitSlop={6} style={styles.iconButton}>
            <Ionicons name="options-outline" size={28} color={colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={openCart} hitSlop={6} style={styles.iconButton}>
            <Ionicons name="cart-outline" size={28} color={colors.text} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.deck}>
        {noResults ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={64} color={colors.accent} />
            <Text style={styles.emptyTitle}>Keine Weine gefunden</Text>
            <Text style={styles.emptySub}>
              Mit den aktuellen Filtern passt kein Wein. Passe die Filter an.
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={openFilter}>
              <Text style={styles.resetText}>Filter anpassen</Text>
            </TouchableOpacity>
          </View>
        ) : !current ? (
          <View style={styles.empty}>
            <Ionicons name="wine-outline" size={64} color={colors.accent} />
            <Text style={styles.emptyTitle}>Alle Weine entdeckt</Text>
            <Text style={styles.emptySub}>Schau in deine Merkliste oder starte von vorn.</Text>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
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

      {current && !noResults && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={handleSwipeLeft}>
            <Ionicons name="close" size={32} color={colors.skip} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.cartActionBtn]} onPress={handleSwipeUp}>
            <Ionicons name="cart" size={26} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleSwipeRight}>
            <Ionicons name="bookmark" size={28} color={colors.like} />
          </TouchableOpacity>
        </View>
      )}

      <QuantityModal
        visible={!!qtyWine}
        wine={qtyWine}
        onConfirm={handleConfirmQty}
        onClose={handleCloseQty}
      />

      <WineDetailModal
        visible={!!detailWine}
        wine={detailWine}
        onClose={() => setDetailWine(null)}
        onAddToWatchlist={(w) => {
          addToWatchlist(w);
        }}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconButton: { padding: 4 },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  logo: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.md },
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
