import React, { useState, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { useCellar, CellarWine } from '../../context/CellarContext';
import { QuantityModal } from '../../components/QuantityModal';
import { wines as ALL_WINES } from '../../data/wines';
import { Wine, WineType } from '../../types';
import { colors, radii, spacing } from '../../theme';

// ── Sorting helpers ───────────────────────────────────────────────────────────

const WINE_TYPE_ORDER: WineType[] = ['Rotwein', 'Weißwein', 'Roséwein', 'Schaumwein', 'Süßwein'];
const TASTE_ORDER = ['Trocken', 'Halbtrocken', 'Lieblich'];

const WINE_TYPE_EMOJI: Record<string, string> = {
  Rotwein: '🍷',
  Weißwein: '🥂',
  Roséwein: '🌸',
  Schaumwein: '🍾',
  Süßwein: '🍯',
};

function getTasteGroup(taste: string[]): string {
  const lower = taste.map((t) => t.toLowerCase());
  if (lower.some((t) => ['lieblich', 'süß', 'süßlich'].includes(t))) return 'Lieblich';
  if (lower.some((t) => ['halbtrocken', 'feinherb', 'mild'].includes(t))) return 'Halbtrocken';
  return 'Trocken';
}

type WineSection = { key: string; label: string; data: Wine[] };
type CellarSection = { key: string; label: string; data: CellarWine[] };

function groupWines(wines: Wine[]): WineSection[] {
  const grouped = new Map<string, Wine[]>();
  for (const wine of wines) {
    const taste = getTasteGroup(wine.taste);
    const key = `${wine.type}__${taste}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(wine);
  }
  const sections: WineSection[] = [];
  for (const type of WINE_TYPE_ORDER) {
    for (const taste of TASTE_ORDER) {
      const key = `${type}__${taste}`;
      const data = grouped.get(key);
      if (data && data.length > 0) {
        sections.push({ key, label: `${WINE_TYPE_EMOJI[type] || '🍷'} ${type} · ${taste}`, data });
      }
    }
  }
  return sections;
}

function groupCellarWines(cellarWines: CellarWine[]): CellarSection[] {
  const grouped = new Map<string, CellarWine[]>();
  for (const cw of cellarWines) {
    const taste = getTasteGroup(cw.wine.taste);
    const key = `${cw.wine.type}__${taste}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cw);
  }
  const sections: CellarSection[] = [];
  for (const type of WINE_TYPE_ORDER) {
    for (const taste of TASTE_ORDER) {
      const key = `${type}__${taste}`;
      const data = grouped.get(key);
      if (data && data.length > 0) {
        sections.push({ key, label: `${WINE_TYPE_EMOJI[type] || '🍷'} ${type} · ${taste}`, data });
      }
    }
  }
  return sections;
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ── Watchlist card ────────────────────────────────────────────────────────────

function WatchlistCard({
  wine,
  onCart,
  onRemove,
}: {
  wine: Wine;
  onCart: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.wCard}>
      <Image source={{ uri: wine.image }} style={styles.wImg} resizeMode="cover" />
      <View style={styles.wInfo}>
        <Text style={styles.wType}>{wine.type.toUpperCase()}</Text>
        <Text style={styles.wName} numberOfLines={2}>{wine.name}</Text>
        <Text style={styles.wWinery}>{wine.winery} · {wine.vintage}</Text>
        <View style={styles.wRow}>
          <Text style={styles.wPrice}>€ {wine.price.toFixed(2)}</Text>
          <View style={styles.wRatingBadge}>
            <Text style={styles.wRatingText}>{wine.rating}</Text>
          </View>
        </View>
        <View style={styles.wActions}>
          <TouchableOpacity style={styles.cartBtn} onPress={onCart}>
            <Ionicons name="cart" size={16} color={colors.background} />
            <Text style={styles.cartBtnText}>In den Warenkorb</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color={colors.skip} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Cellar card ───────────────────────────────────────────────────────────────

function CellarCard({
  item,
  onEditQty,
  onRemove,
}: {
  item: CellarWine;
  onEditQty: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.wCard}>
      <Image source={{ uri: item.wine.image }} style={styles.wImg} resizeMode="cover" />
      <View style={styles.wInfo}>
        <Text style={styles.wType}>{item.wine.type.toUpperCase()}</Text>
        <Text style={styles.wName} numberOfLines={2}>{item.wine.name}</Text>
        <Text style={styles.wWinery}>{item.wine.winery} · {item.wine.vintage}</Text>
        <View style={styles.wRow}>
          <Text style={styles.wPrice}>€ {item.wine.price > 0 ? item.wine.price.toFixed(2) : '–'}</Text>
          {item.rating != null && (
            <View style={styles.wRatingBadge}>
              <Text style={styles.wRatingText}>★ {item.rating}</Text>
            </View>
          )}
        </View>
        <View style={styles.wActions}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onEditQty}>
            <Ionicons name="wine" size={14} color={colors.background} />
            <Text style={styles.qtyBtnText}>
              {item.quantity} {item.quantity === 1 ? 'Flasche' : 'Flaschen'}
            </Text>
            <Ionicons name="pencil" size={12} color={colors.background} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color={colors.skip} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Quantity edit modal ───────────────────────────────────────────────────────

function QuantityEditModal({
  visible,
  wineName,
  currentQty,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  wineName: string;
  currentQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(currentQty);
  const [inputVal, setInputVal] = useState(String(currentQty));

  React.useEffect(() => {
    if (visible) {
      setQty(currentQty);
      setInputVal(String(currentQty));
    }
  }, [visible, currentQty]);

  function setAndSync(n: number) {
    const clamped = Math.max(0, n);
    setQty(clamped);
    setInputVal(String(clamped));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.qEditBackdrop}>
        <View style={styles.qEditSheet}>
          <Text style={styles.qEditTitle}>Flaschenzahl</Text>
          <Text style={styles.qEditSub} numberOfLines={1}>{wineName}</Text>
          <View style={styles.qEditRow}>
            <TouchableOpacity style={styles.qEditBtn} onPress={() => setAndSync(qty - 1)}>
              <Ionicons name="remove" size={22} color={colors.accent} />
            </TouchableOpacity>
            <TextInput
              style={styles.qEditInput}
              value={inputVal}
              onChangeText={(v) => {
                setInputVal(v);
                const n = parseInt(v, 10);
                if (!isNaN(n)) setQty(Math.max(0, n));
              }}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity style={styles.qEditBtn} onPress={() => setAndSync(qty + 1)}>
              <Ionicons name="add" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.qEditActions}>
            <TouchableOpacity style={styles.qEditCancel} onPress={onClose}>
              <Text style={styles.qEditCancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qEditConfirm}
              onPress={() => {
                onConfirm(qty);
                onClose();
              }}
            >
              <Text style={styles.qEditConfirmText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Add-to-cellar modal ───────────────────────────────────────────────────────

const WINE_TYPES: WineType[] = ['Rotwein', 'Weißwein', 'Roséwein', 'Schaumwein', 'Süßwein'];
const GESCHMACK_OPTIONS = ['trocken', 'halbtrocken', 'lieblich'];
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=800&q=80';

function AddToCellarModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (wine: Wine, quantity: number) => void;
}) {
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');
  const [search, setSearch] = useState('');
  const [selQty, setSelQty] = useState(1);
  const [selWine, setSelWine] = useState<Wine | null>(null);

  // Manual form state
  const [fName, setFName] = useState('');
  const [fWinery, setFWinery] = useState('');
  const [fVintage, setFVintage] = useState('');
  const [fType, setFType] = useState<WineType>('Rotwein');
  const [fGeschmack, setFGeschmack] = useState('trocken');
  const [fQuantity, setFQuantity] = useState('1');
  const [fPreis, setFPreis] = useState('');
  const [fHerkunft, setFHerkunft] = useState('');

  const filtered = useMemo(
    () =>
      ALL_WINES.filter(
        (w) =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.winery.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  function resetAndClose() {
    setSearch('');
    setSelWine(null);
    setSelQty(1);
    setFName('');
    setFWinery('');
    setFVintage('');
    setFType('Rotwein');
    setFGeschmack('trocken');
    setFQuantity('1');
    setFPreis('');
    setFHerkunft('');
    setMode('catalog');
    onClose();
  }

  function handleAddCatalog() {
    if (!selWine) return;
    onAdd(selWine, selQty);
    resetAndClose();
  }

  function handleAddManual() {
    if (!fName.trim()) {
      Alert.alert('Bitte Weinname eingeben');
      return;
    }
    const wine: Wine = {
      id: `manual_${Date.now()}`,
      name: fName.trim(),
      winery: fWinery.trim() || 'Unbekannt',
      vintage: parseInt(fVintage, 10) || new Date().getFullYear(),
      type: fType,
      region: fHerkunft.trim() || 'Unbekannt',
      country: '',
      grape: '',
      taste: [fGeschmack],
      description: '',
      rating: 0,
      price: parseFloat(fPreis.replace(',', '.')) || 0,
      image: PLACEHOLDER_IMAGE,
    };
    onAdd(wine, parseInt(fQuantity, 10) || 1);
    resetAndClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Zum Weinkeller hinzufügen</Text>
            <TouchableOpacity onPress={resetAndClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Mode tabs */}
          <View style={styles.modeBar}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'catalog' && styles.modeTabActive]}
              onPress={() => setMode('catalog')}
            >
              <Text style={[styles.modeTabText, mode === 'catalog' && styles.modeTabTextActive]}>
                Katalogsuche
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]}
              onPress={() => setMode('manual')}
            >
              <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>
                Freie Eingabe
              </Text>
            </TouchableOpacity>
          </View>

          {/* Catalog search */}
          {mode === 'catalog' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Weinname oder Weingut…"
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
              </View>
              <FlatList
                data={filtered}
                keyExtractor={(w) => w.id}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => {
                  const selected = selWine?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, selected && styles.modalItemSelected]}
                      onPress={() => setSelWine(selected ? null : item)}
                    >
                      <Image source={{ uri: item.image }} style={styles.modalImg} resizeMode="cover" />
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.modalItemSub}>{item.winery} · {item.vintage}</Text>
                      </View>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={24}
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
              {selWine && (
                <View style={styles.catalogFooter}>
                  <View style={styles.qtyRow}>
                    <Text style={styles.qtyLabel}>Anzahl Flaschen:</Text>
                    <TouchableOpacity onPress={() => setSelQty((q) => Math.max(1, q - 1))} style={styles.qtySmallBtn}>
                      <Ionicons name="remove" size={18} color={colors.accent} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{selQty}</Text>
                    <TouchableOpacity onPress={() => setSelQty((q) => q + 1)} style={styles.qtySmallBtn}>
                      <Ionicons name="add" size={18} color={colors.accent} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAddCatalog}>
                    <Ionicons name="library" size={18} color={colors.background} />
                    <Text style={styles.addConfirmText}>Zum Weinkeller hinzufügen</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Manual entry */}
          {mode === 'manual' && (
            <ScrollView contentContainerStyle={styles.manualForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Weinname *</Text>
              <TextInput
                style={styles.fieldInput}
                value={fName}
                onChangeText={setFName}
                placeholder="z. B. Barolo Riserva"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Weingut</Text>
              <TextInput
                style={styles.fieldInput}
                value={fWinery}
                onChangeText={setFWinery}
                placeholder="z. B. Tenuta San Lorenzo"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Jahrgang</Text>
              <TextInput
                style={styles.fieldInput}
                value={fVintage}
                onChangeText={setFVintage}
                placeholder={String(new Date().getFullYear())}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Weinart</Text>
              <View style={styles.pickerRow}>
                {WINE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pickerChip, fType === t && styles.pickerChipActive]}
                    onPress={() => setFType(t)}
                  >
                    <Text style={[styles.pickerChipText, fType === t && styles.pickerChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Geschmack</Text>
              <View style={styles.pickerRow}>
                {GESCHMACK_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.pickerChip, fGeschmack === g && styles.pickerChipActive]}
                    onPress={() => setFGeschmack(g)}
                  >
                    <Text style={[styles.pickerChipText, fGeschmack === g && styles.pickerChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Anzahl Flaschen</Text>
              <TextInput
                style={styles.fieldInput}
                value={fQuantity}
                onChangeText={setFQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Preis (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={fPreis}
                onChangeText={setFPreis}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Herkunft (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={fHerkunft}
                onChangeText={setFHerkunft}
                placeholder="z. B. Toskana, Italien"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity style={[styles.addConfirmBtn, { marginTop: spacing.md }]} onPress={handleAddManual}>
                <Ionicons name="library" size={18} color={colors.background} />
                <Text style={styles.addConfirmText}>Zum Weinkeller hinzufügen</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Tab = 'merkliste' | 'weinkeller';

export default function SammlungScreen() {
  const { watchlist, removeFromWatchlist, addToCart } = useApp();
  const { cellarWines, addToCellar, removeFromCellar, updateQuantity } = useCellar();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('merkliste');
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [editCellarItem, setEditCellarItem] = useState<CellarWine | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const watchlistSections = useMemo(() => groupWines(watchlist), [watchlist]);
  const cellarSections = useMemo(() => groupCellarWines(cellarWines), [cellarWines]);

  const totalBottles = useMemo(
    () => cellarWines.reduce((sum, cw) => sum + cw.quantity, 0),
    [cellarWines],
  );

  // Build flat list items for watchlist
  type ListItem =
    | { type: 'header'; label: string; id: string }
    | { type: 'wine'; wine: Wine; id: string };

  const watchlistItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const section of watchlistSections) {
      items.push({ type: 'header', label: section.label, id: `h_${section.key}` });
      for (const wine of section.data) {
        items.push({ type: 'wine', wine, id: wine.id });
      }
    }
    return items;
  }, [watchlistSections]);

  type CellarListItem =
    | { type: 'header'; label: string; id: string }
    | { type: 'cellar'; item: CellarWine; id: string };

  const cellarItems = useMemo<CellarListItem[]>(() => {
    const items: CellarListItem[] = [];
    for (const section of cellarSections) {
      items.push({ type: 'header', label: section.label, id: `h_${section.key}` });
      for (const cw of section.data) {
        items.push({ type: 'cellar', item: cw, id: cw.id });
      }
    }
    return items;
  }, [cellarSections]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Inner tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('merkliste')}>
          <Text style={[styles.tabText, activeTab === 'merkliste' && styles.tabTextActive]}>
            MERKLISTE
          </Text>
          {activeTab === 'merkliste' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('weinkeller')}>
          <Text style={[styles.tabText, activeTab === 'weinkeller' && styles.tabTextActive]}>
            MEIN WEINKELLER
          </Text>
          {activeTab === 'weinkeller' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* ── MERKLISTE ── */}
      {activeTab === 'merkliste' && (
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
              data={watchlistItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return <SectionHeader label={item.label} />;
                }
                return (
                  <WatchlistCard
                    wine={item.wine}
                    onCart={() => setQtyWine(item.wine)}
                    onRemove={() => removeFromWatchlist(item.wine.id)}
                  />
                );
              }}
            />
          )}
        </>
      )}

      {/* ── MEIN WEINKELLER ── */}
      {activeTab === 'weinkeller' && (
        <View style={{ flex: 1 }}>
          {/* Stats header */}
          <View style={styles.cellarHeader}>
            <View>
              <Text style={styles.cellarStats}>
                {cellarWines.length} {cellarWines.length === 1 ? 'Wein' : 'Weine'} · {totalBottles}{' '}
                {totalBottles === 1 ? 'Flasche' : 'Flaschen'} insgesamt
              </Text>
            </View>
            <TouchableOpacity
              style={styles.scannerBtn}
              onPress={() =>
                router.push({ pathname: '/(tabs)/scanner', params: { addToCellar: 'true' } })
              }
            >
              <Ionicons name="camera-outline" size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {cellarWines.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="library-outline" size={64} color={colors.accent} />
              <Text style={styles.emptyTitle}>Dein Weinkeller ist leer</Text>
              <Text style={styles.emptySub}>
                Füge Weine über den + Button, den Scanner oder den Warenkorb-Checkout hinzu.
              </Text>
            </View>
          ) : (
            <FlatList
              data={cellarItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return <SectionHeader label={item.label} />;
                }
                return (
                  <CellarCard
                    item={item.item}
                    onEditQty={() => setEditCellarItem(item.item)}
                    onRemove={() =>
                      Alert.alert(
                        'Wein entfernen',
                        `"${item.item.wine.name}" aus dem Weinkeller entfernen?`,
                        [
                          { text: 'Abbrechen', style: 'cancel' },
                          {
                            text: 'Entfernen',
                            style: 'destructive',
                            onPress: () => removeFromCellar(item.item.wine.id),
                          },
                        ],
                      )
                    }
                  />
                );
              }}
            />
          )}

          {/* FAB */}
          <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
            <Ionicons name="add" size={28} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}

      {/* Watchlist → Cart quantity modal */}
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

      {/* Cellar quantity edit modal */}
      <QuantityEditModal
        visible={!!editCellarItem}
        wineName={editCellarItem?.wine.name ?? ''}
        currentQty={editCellarItem?.quantity ?? 1}
        onConfirm={(qty) => {
          if (editCellarItem) updateQuantity(editCellarItem.wine.id, qty);
        }}
        onClose={() => setEditCellarItem(null)}
      />

      {/* Add to cellar modal */}
      <AddToCellarModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={(wine, qty) => addToCellar(wine, qty, 'manual')}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Inner tab bar
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
  tabTextActive: { color: colors.accent },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    gap: spacing.sm,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.accent, opacity: 0.4 },
  sectionLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Lists
  list: { padding: spacing.md },

  // Wine card (shared)
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
  cartBtnText: { color: colors.background, fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  qtyBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 8,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  qtyBtnText: { color: colors.background, fontWeight: '700', fontSize: 12 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cellar header
  cellarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cellarStats: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  scannerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
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

  // Quantity edit modal
  qEditBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,10,15,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  qEditSheet: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  qEditTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  qEditSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  qEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  qEditBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qEditInput: {
    width: 72,
    textAlign: 'center',
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: 4,
  },
  qEditActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  qEditCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  qEditCancelText: { color: colors.textMuted, fontWeight: '600' },
  qEditConfirm: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  qEditConfirmText: { color: colors.background, fontWeight: '700' },

  // Add-to-cellar modal
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
    maxHeight: '85%',
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
  modalTitle: { color: colors.accent, fontSize: 15, fontWeight: '700', letterSpacing: 1.5 },
  modeBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2 },
  modeTabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  modeTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  modeTabTextActive: { color: colors.accent },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  modalList: { padding: spacing.sm, paddingTop: 0, gap: spacing.sm },
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
  modalItemSelected: { borderColor: colors.accent },
  modalImg: { width: 48, height: 48, borderRadius: radii.sm },
  modalItemInfo: { flex: 1 },
  modalItemName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  modalItemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  catalogFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  qtySmallBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { color: colors.text, fontWeight: '700', fontSize: 16, width: 32, textAlign: 'center' },
  addConfirmBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addConfirmText: { color: colors.background, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  manualForm: { padding: spacing.lg, gap: 4 },
  fieldLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: 14,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pickerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pickerChipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  pickerChipText: { color: colors.textMuted, fontSize: 13 },
  pickerChipTextActive: { color: colors.background, fontWeight: '700' },
});
