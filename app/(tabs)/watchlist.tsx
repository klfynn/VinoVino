import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { QuantityModal } from '../../components/QuantityModal';
import { wines as ALL_WINES } from '../../data/wines';
import { PurchasedWine, Wine } from '../../types';
import { colors, radii, spacing } from '../../theme';

type Tab = 'watchlist' | 'purchased';

// ── Star rating row ──────────────────────────────────────────────────────────
function StarRow({
  value,
  onPress,
}: {
  value: number | null;
  onPress: (star: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onPress(star)} hitSlop={6}>
          <Ionicons
            name={value != null && star <= value ? 'star' : 'star-outline'}
            size={20}
            color={value != null && star <= value ? colors.accent : colors.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Single purchased card (owns local note state) ────────────────────────────
function PurchasedCard({ item }: { item: PurchasedWine }) {
  const { updatePurchasedRating } = useApp();
  const [note, setNote] = useState(item.myNote);

  useEffect(() => {
    setNote(item.myNote);
  }, [item.myNote]);

  const handleStar = (star: number) => {
    const next = item.myRating === star ? null : star;
    updatePurchasedRating(item.wine.id, next, note);
  };

  const handleNoteBlur = () => {
    if (note !== item.myNote) {
      updatePurchasedRating(item.wine.id, item.myRating, note);
    }
  };

  const dateStr = item.purchasedAt.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.pCard}>
      <Image source={{ uri: item.wine.image }} style={styles.pImg} resizeMode="cover" />
      <View style={styles.pInfo}>
        <Text style={styles.pDate}>{dateStr}</Text>
        <Text style={styles.pName} numberOfLines={2}>
          {item.wine.name}
        </Text>
        <Text style={styles.pWinery}>
          {item.wine.winery} · {item.wine.vintage}
        </Text>

        <View style={styles.pRatingRow}>
          <StarRow value={item.myRating} onPress={handleStar} />
          {item.myRating == null && (
            <Text style={styles.pRatingHint}>Bewertung hinzufügen</Text>
          )}
        </View>

        <TextInput
          style={styles.pNote}
          value={note}
          onChangeText={setNote}
          onBlur={handleNoteBlur}
          placeholder="Notiz hinzufügen…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          maxLength={200}
          multiline={false}
        />
      </View>
    </View>
  );
}

// ── Add-wine modal ───────────────────────────────────────────────────────────
function AddWineModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (wine: Wine) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wein hinzufügen</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={ALL_WINES}
            keyExtractor={(w) => w.id}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Image source={{ uri: item.image }} style={styles.modalImg} resizeMode="cover" />
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.modalItemSub}>
                    {item.winery} · {item.vintage}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function WatchlistScreen() {
  const { watchlist, removeFromWatchlist, addToCart, purchasedWines, addToPurchased } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const sorted = [...purchasedWines].sort(
    (a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime(),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('watchlist')}>
          <Text style={[styles.tabText, activeTab === 'watchlist' && styles.tabTextActive]}>
            MERKLISTE
          </Text>
          {activeTab === 'watchlist' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('purchased')}>
          <Text style={[styles.tabText, activeTab === 'purchased' && styles.tabTextActive]}>
            GEKAUFT
          </Text>
          {activeTab === 'purchased' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* ── MERKLISTE tab ── */}
      {activeTab === 'watchlist' && (
        <>
          {watchlist.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={64} color={colors.accent} />
              <Text style={styles.emptyTitle}>Noch nichts gemerkt</Text>
              <Text style={styles.emptySub}>
                Swipe rechts auf Weine, die dich interessieren.
              </Text>
            </View>
          ) : (
            <FlatList
              data={watchlist}
              keyExtractor={(w) => w.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.wCard}>
                  <Image source={{ uri: item.image }} style={styles.wImg} resizeMode="cover" />
                  <View style={styles.wInfo}>
                    <Text style={styles.wType}>{item.type.toUpperCase()}</Text>
                    <Text style={styles.wName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.wWinery}>
                      {item.winery} · {item.vintage}
                    </Text>
                    <View style={styles.wRow}>
                      <Text style={styles.wPrice}>€ {item.price.toFixed(2)}</Text>
                      <View style={styles.wRatingBadge}>
                        <Text style={styles.wRatingText}>{item.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.wActions}>
                      <TouchableOpacity
                        style={styles.cartBtn}
                        onPress={() => setQtyWine(item)}
                      >
                        <Ionicons name="cart" size={16} color={colors.background} />
                        <Text style={styles.cartBtnText}>In den Warenkorb</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeFromWatchlist(item.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.skip} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* ── GEKAUFT tab ── */}
      {activeTab === 'purchased' && (
        <>
          <View style={styles.purchasedHeader}>
            <Text style={styles.purchasedCount}>
              {sorted.length} {sorted.length === 1 ? 'Wein' : 'Weine'}
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={20} color={colors.background} />
            </TouchableOpacity>
          </View>

          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wine-outline" size={64} color={colors.accent} />
              <Text style={styles.emptyTitle}>Noch keine gekauften Weine</Text>
              <Text style={styles.emptySub}>
                Weine werden nach dem Checkout automatisch hinzugefügt.
              </Text>
            </View>
          ) : (
            <FlatList
              data={sorted}
              keyExtractor={(p) => p.wine.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => <PurchasedCard item={item} />}
            />
          )}
        </>
      )}

      <QuantityModal
        visible={!!qtyWine}
        wine={qtyWine}
        onConfirm={(qty) => {
          if (qtyWine) {
            addToCart(qtyWine, qty);
            setQtyWine(null);
          }
        }}
        onClose={() => setQtyWine(null)}
      />

      <AddWineModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSelect={addToPurchased}
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tabTextActive: {
    color: colors.accent,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },

  // Lists
  list: { padding: spacing.md, gap: spacing.md },

  // Watchlist card
  wCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  wImg: { width: 110, minHeight: 180 },
  wInfo: { flex: 1, padding: spacing.md },
  wType: { color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  wName: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 4 },
  wWinery: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  wRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  wPrice: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  wRatingBadge: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  wRatingText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  wActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cartBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartBtnText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Purchased header
  purchasedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  purchasedCount: { color: colors.textMuted, fontSize: 13 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Purchased card
  pCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pImg: { width: 90, minHeight: 160 },
  pInfo: { flex: 1, padding: spacing.md, gap: 4 },
  pDate: { color: colors.textMuted, fontSize: 10, letterSpacing: 1 },
  pName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  pWinery: { color: colors.accent, fontSize: 12, fontStyle: 'italic' },
  pRatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  starRow: { flexDirection: 'row', gap: 4 },
  pRatingHint: { color: colors.accent, fontSize: 11, fontStyle: 'italic' },
  pNote: {
    marginTop: 6,
    color: colors.text,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: spacing.md },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  // Add-wine modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,10,15,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  modalList: { padding: spacing.md, gap: spacing.sm },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  modalImg: { width: 48, height: 48, borderRadius: radii.sm },
  modalItemInfo: { flex: 1 },
  modalItemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  modalItemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

});
