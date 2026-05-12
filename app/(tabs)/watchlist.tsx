import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { QuantityModal } from '../../components/QuantityModal';
import { Wine } from '../../types';
import { colors, radii, spacing } from '../../theme';

export default function WatchlistScreen() {
  const { watchlist, removeFromWatchlist, addToCart } = useApp();
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Merkliste</Text>
        <Text style={styles.subtitle}>{watchlist.length} Weine</Text>
      </View>

      {watchlist.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={64} color={colors.accent} />
          <Text style={styles.emptyTitle}>Noch nichts gemerkt</Text>
          <Text style={styles.emptySub}>Swipe rechts auf Weine, die dich interessieren.</Text>
        </View>
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.img} />
              <View style={styles.info}>
                <Text style={styles.type}>{item.type.toUpperCase()}</Text>
                <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.winery}>{item.winery} · {item.vintage}</Text>
                <View style={styles.row}>
                  <Text style={styles.price}>€ {item.price.toFixed(2)}</Text>
                  <View style={styles.rating}>
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.cartBtn} onPress={() => setQtyWine(item)}>
                    <Ionicons name="cart" size={16} color={colors.background} />
                    <Text style={styles.cartBtnText}>In den Warenkorb</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromWatchlist(item.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.skip} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <QuantityModal
        visible={!!qtyWine} wine={qtyWine}
        onConfirm={(qty) => {
          if (qtyWine) {
            addToCart(qtyWine, qty);
            setQtyWine(null);
          }
        }}
        onClose={() => setQtyWine(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', marginBottom: spacing.md,
  },
  img: { width: 110, height: '100%', minHeight: 180 },
  info: { flex: 1, padding: spacing.md },
  type: { color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  name: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 4 },
  winery: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  price: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  rating: {
    borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.sm,
  },
  ratingText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  cartBtn: {
    flex: 1, backgroundColor: colors.accent,
    paddingVertical: 8, borderRadius: radii.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cartBtnText: { color: colors.background, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  removeBtn: {
    width: 36, height: 36, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
});
