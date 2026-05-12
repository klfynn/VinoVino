import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { wines as ALL_WINES } from '../../data/wines';
import { useApp } from '../../context/AppContext';
import { SwipeableCard } from '../../components/SwipeableCard';
import { QuantityModal } from '../../components/QuantityModal';
import { WineDetailModal } from '../../components/WineDetailModal';
import { Wine } from '../../types';
import { colors, radii, spacing } from '../../theme';

export default function SwipeScreen() {
  const { addToWatchlist, addToCart, watchlist } = useApp();
  const [index, setIndex] = useState(0);
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [detailWine, setDetailWine] = useState<Wine | null>(null);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const current = ALL_WINES[index];
  const next = ALL_WINES[index + 1];

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

  const handleCloseQty = () => setQtyWine(null);
  const handleReset = () => setIndex(0);
  const isWatchlisted = (w: Wine | null) => !!w && watchlist.some((x) => x.id === w.id);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>VinoVino</Text>
          <Text style={styles.tagline}>Entdecke deinen nächsten Lieblingswein</Text>
        </View>
      </View>

      <View style={styles.deck}>
        {!current ? (
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
                key={next.id} wine={next}
                onSwipeLeft={() => {}} onSwipeRight={() => {}}
                onSwipeUp={() => {}} onTap={() => {}}
                isTop={false} stackIndex={1}
              />
            )}
            <SwipeableCard
              key={current.id} wine={current}
              onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp} onTap={handleTap}
              isTop stackIndex={0}
            />
          </>
        )}
      </View>

      {current && (
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

      <QuantityModal visible={!!qtyWine} wine={qtyWine} onConfirm={handleConfirmQty} onClose={handleCloseQty} />

      <WineDetailModal
        visible={!!detailWine} wine={detailWine}
        onClose={() => setDetailWine(null)}
        onAddToWatchlist={(w) => { addToWatchlist(w); }}
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  logo: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  deck: { flex: 1, margin: spacing.md, marginBottom: spacing.sm },
  actions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1,
  },
  skipBtn: { borderColor: colors.skip },
  likeBtn: { borderColor: colors.like },
  cartActionBtn: { width: 56, height: 56, borderRadius: 28, borderColor: colors.accent },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
  resetBtn: {
    marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.accent,
  },
  resetText: { color: colors.accent, fontWeight: '700', letterSpacing: 1 },
});
