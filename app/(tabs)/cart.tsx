import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors, radii, spacing } from '../../theme';

export default function CartScreen() {
  const { cart, cartLoading, cartError, updateCartQuantity, removeFromCart, cartTotal, cartCount } = useApp();
  const router = useRouter();

  function handleCheckout() {
    if (cart.length === 0) return;
    router.push('/checkout');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Warenkorb</Text>
          <Text style={styles.subtitle}>
            {cartCount} {cartCount === 1 ? 'Flasche' : 'Flaschen'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {cartLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : cartError ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.accent} />
          <Text style={styles.emptyTitle}>Fehler beim Laden</Text>
          <Text style={styles.emptySub}>{cartError}</Text>
        </View>
      ) : cart.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color={colors.accent} />
          <Text style={styles.emptyTitle}>Dein Warenkorb ist leer</Text>
          <Text style={styles.emptySub}>Swipe nach oben auf einer Weinkarte um sie hinzuzufügen.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.wine.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const lineTotal = item.wine.price * item.quantity;
              return (
                <View style={styles.card}>
                  <Image source={{ uri: item.wine.image }} style={styles.img} />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{item.wine.name}</Text>
                    <Text style={styles.winery}>{item.wine.winery} · {item.wine.vintage}</Text>
                    <Text style={styles.pricePer}>€ {item.wine.price.toFixed(2)} / Flasche</Text>

                    <View style={styles.bottomRow}>
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          onPress={() => updateCartQuantity(item.wine.id, item.quantity - 1)}
                          style={styles.stepBtn}>
                          <Ionicons name="remove" size={18} color={colors.accent} />
                        </TouchableOpacity>
                        <Text style={styles.qty}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateCartQuantity(item.wine.id, item.quantity + 1)}
                          style={styles.stepBtn}>
                          <Ionicons name="add" size={18} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.lineTotal}>€ {lineTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeFromCart(item.wine.id)}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gesamt</Text>
              <Text style={styles.totalValue}>€ {cartTotal.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Zur Kasse</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>
        </>
      )}
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
    paddingBottom: spacing.md,
  },
  profileBtn: { padding: 4 },
  title: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  list: { padding: spacing.md, paddingBottom: 200 },
  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', marginBottom: spacing.md,
  },
  img: { width: 90, height: '100%', minHeight: 150 },
  info: { flex: 1, padding: spacing.md },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  winery: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  pricePer: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  bottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, overflow: 'hidden',
  },
  stepBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.cardElevated,
  },
  qty: { width: 36, textAlign: 'center', color: colors.text, fontWeight: '700' },
  lineTotal: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  deleteBtn: { padding: spacing.sm },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  totalLabel: { color: colors.textMuted, fontSize: 14, letterSpacing: 2 },
  totalValue: { color: colors.text, fontSize: 26, fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: colors.accent, paddingVertical: spacing.md, borderRadius: radii.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  checkoutText: { color: colors.background, fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: spacing.sm },
});
