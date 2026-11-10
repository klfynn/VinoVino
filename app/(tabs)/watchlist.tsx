import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
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
import {
  CustomWineFields,
  CustomWineFormState,
  EditCustomWineModal,
  EMPTY_CUSTOM_WINE_FORM,
} from '../../components/CustomWineForm';
import { cellarSubtitle } from '../../lib/cellar/merge';
import type { CellarResult } from '../../lib/cellar/types';
// Hinweis: Die Katalogauswahl im „+“-Dialog stammt weiterhin aus der lokalen Testliste.
import { wines as ALL_WINES } from '../../data/wines';
import { Wine, WineType } from '../../types';
import { colors, radii, spacing } from '../../theme';

// ── Sorting helpers ───────────────────────────────────────────────────────────

const WINE_TYPE_ORDER: WineType[] = ['Rotwein', 'Weißwein', 'Roséwein', 'Schaumwein', 'Süßwein'];
// '' = ohne Geschmacksangabe (z. B. eigene Weine); Abschnitt nur mit der Weinart.
const TASTE_ORDER = ['Trocken', 'Halbtrocken', 'Lieblich', ''];

const WINE_TYPE_EMOJI: Record<string, string> = {
  Rotwein: '🍷',
  Weißwein: '🥂',
  Roséwein: '🌸',
  Schaumwein: '🍾',
  Süßwein: '🍯',
};

function getTasteGroup(taste: string[]): string {
  if (taste.length === 0) return '';
  const lower = taste.map((t) => t.toLowerCase());
  if (lower.some((t) => ['lieblich', 'süß', 'süßlich'].includes(t))) return 'Lieblich';
  if (lower.some((t) => ['halbtrocken', 'feinherb', 'mild'].includes(t))) return 'Halbtrocken';
  return 'Trocken';
}

function sectionLabel(type: WineType, taste: string): string {
  return `${WINE_TYPE_EMOJI[type] || '🍷'} ${type}${taste ? ` · ${taste}` : ''}`;
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
        sections.push({ key, label: sectionLabel(type, taste), data });
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
        sections.push({ key, label: sectionLabel(type, taste), data });
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
  onReview,
  onEdit,
  hasReviewed,
  showTemporary,
}: {
  item: CellarWine;
  onEditQty: () => void;
  onRemove: () => void;
  onReview: () => void;
  onEdit?: () => void;
  hasReviewed: boolean;
  /** Hinweis „nur vorübergehend“ für Einträge, die trotz Anmeldung nicht gespeichert werden */
  showTemporary: boolean;
}) {
  const isCustom = item.ref.kind === 'custom';
  const subtitle = isCustom ? cellarSubtitle(item) : `${item.wine.winery} · ${item.wine.vintage}`;
  return (
    <View style={styles.wCard}>
      <Image source={{ uri: item.wine.image }} style={styles.wImg} resizeMode="cover" />
      <View style={styles.wInfo}>
        <Text style={styles.wType}>{item.wine.type.toUpperCase()}</Text>
        {(isCustom || showTemporary) && (
          <View style={styles.badgeRow}>
            {isCustom && (
              <View style={styles.ownBadge}>
                <Text style={styles.ownBadgeText}>Eigener Wein</Text>
              </View>
            )}
            {showTemporary && (
              <View style={styles.tempBadge}>
                <Text style={styles.tempBadgeText}>Nur vorübergehend</Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.wName} numberOfLines={2}>{item.wine.name}</Text>
        {subtitle ? <Text style={styles.wWinery}>{subtitle}</Text> : null}
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
          {onEdit && (
            <TouchableOpacity style={styles.removeBtn} onPress={onEdit} accessibilityLabel="Eigenen Wein bearbeiten">
              <Ionicons name="create-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Ionicons name="trash-outline" size={18} color={colors.skip} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.reviewLink} onPress={onReview}>
          <Ionicons
            name={hasReviewed ? 'create-outline' : 'star-outline'}
            size={12}
            color={colors.accent}
          />
          <Text style={styles.reviewLinkText}>
            {hasReviewed ? 'Bewertung bearbeiten' : 'Bewerten'}
          </Text>
        </TouchableOpacity>
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
  onConfirm: (qty: number) => Promise<CellarResult<null>>;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(currentQty);
  const [saving, setSaving] = useState(false);
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
              style={[styles.qEditConfirm, saving && { opacity: 0.7 }]}
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                const result = await onConfirm(qty);
                setSaving(false);
                if (result.ok) onClose();
                else Alert.alert('Nicht gespeichert', result.error);
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.qEditConfirmText}>Speichern</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Add-to-cellar modal ───────────────────────────────────────────────────────

function AddToCellarModal({
  visible,
  onClose,
  onAdd,
  onCreateCustom,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (wine: Wine, quantity: number) => void;
  onCreateCustom: (values: CustomWineFormState) => Promise<CellarResult<unknown>>;
}) {
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog');
  const [search, setSearch] = useState('');
  const [selQty, setSelQty] = useState(1);
  const [selWine, setSelWine] = useState<Wine | null>(null);
  // Neuer Schlüssel bei jedem Öffnen, damit das Formular leer startet.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (visible) setFormKey((k) => k + 1);
  }, [visible]);

  // Katalogauswahl: stammt weiterhin aus der lokalen Testliste data/wines.ts (keine UUIDs,
  // deshalb bleiben diese Einträge nur im Arbeitsspeicher).
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
    setMode('catalog');
    onClose();
  }

  function handleAddCatalog() {
    if (!selWine) return;
    onAdd(selWine, selQty);
    resetAndClose();
  }

  async function handleCreateCustom(values: CustomWineFormState): Promise<CellarResult<unknown>> {
    const result = await onCreateCustom(values);
    if (result.ok) resetAndClose();
    return result;
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
              style={[styles.modeTab, mode === 'custom' && styles.modeTabActive]}
              onPress={() => setMode('custom')}
            >
              <Text style={[styles.modeTabText, mode === 'custom' && styles.modeTabTextActive]}>
                Eigenen Wein anlegen
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

          {/* Eigener Wein */}
          {mode === 'custom' && (
            <CustomWineFields
              key={formKey}
              initial={EMPTY_CUSTOM_WINE_FORM}
              submitLabel="Zum Weinkeller hinzufügen"
              onSubmit={handleCreateCustom}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Review modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  visible,
  wine,
  existingRating,
  existingComment,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  wine: Wine | null;
  existingRating?: number;
  existingComment?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<CellarResult<null>>;
}) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setRating(existingRating ?? 0);
      setComment(existingComment ?? '');
      setSuccess(false);
      setSaving(false);
    }
  }, [visible, existingRating, existingComment]);

  async function handleSubmit() {
    if (saving) return;
    if (rating === 0) {
      Alert.alert('Bitte Sterne vergeben', 'Wähle mindestens 1 Stern aus.');
      return;
    }
    setSaving(true);
    const result = await onSubmit(rating, comment.trim());
    setSaving(false);
    if (!result.ok) {
      Alert.alert('Nicht gespeichert', result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1500);
  }

  if (!wine) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={rvStyles.backdrop}>
          <View style={rvStyles.sheet}>
            {success ? (
              <View style={rvStyles.successContent}>
                <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
                <Text style={rvStyles.successTitle}>Danke für deine Bewertung!</Text>
              </View>
            ) : (
              <>
                <Text style={rvStyles.title}>Wein bewerten</Text>
                <Text style={rvStyles.wineName} numberOfLines={2}>{wine.name}</Text>

                <View style={rvStyles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(star)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Text style={[rvStyles.star, star <= rating && rvStyles.starActive]}>
                        {star <= rating ? '★' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={rvStyles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Wie hat dir der Wein geschmeckt?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <View style={rvStyles.privateHint}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                  <Text style={rvStyles.privateHintText}>Nur für dich sichtbar.</Text>
                </View>

                <View style={rvStyles.actions}>
                  <TouchableOpacity style={rvStyles.cancelBtn} onPress={onClose}>
                    <Text style={rvStyles.cancelText}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[rvStyles.submitBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={rvStyles.submitText}>Absenden</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const rvStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,10,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  successContent: { alignItems: 'center', paddingVertical: spacing.xl },
  successTitle: { color: colors.accent, fontSize: 17, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  title: { color: colors.accent, fontSize: 15, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center', marginBottom: spacing.xs },
  wineName: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginBottom: spacing.lg },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  star: { fontSize: 38, color: colors.border },
  starActive: { color: colors.accent },
  commentInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    marginBottom: spacing.xs,
  },
  privateHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  privateHintText: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  submitBtn: {
    flex: 1.5,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  submitText: { color: colors.background, fontWeight: '700' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

type Tab = 'merkliste' | 'weinkeller';

export default function SammlungScreen() {
  const { watchlist, watchlistLoading, watchlistError, removeFromWatchlist, addToCart } = useApp();
  const {
    cellarWines,
    loading: cellarLoading,
    loadError: cellarLoadError,
    isPersistent,
    reload: reloadCellar,
    addToCellar,
    removeEntry,
    setQuantity,
    setRating,
    createCustomWine,
    updateCustomWine,
  } = useCellar();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('merkliste');
  const [qtyWine, setQtyWine] = useState<Wine | null>(null);
  const [editCellarItem, setEditCellarItem] = useState<CellarWine | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reviewCellarWine, setReviewCellarWine] = useState<CellarWine | null>(null);
  const [editCustomItem, setEditCustomItem] = useState<CellarWine | null>(null);

  // Beim Öffnen des Weinkellers den Stand aus Supabase neu laden (still, ohne Spinner).
  useEffect(() => {
    if (activeTab === 'weinkeller' && isPersistent) reloadCellar();
  }, [activeTab, isPersistent, reloadCellar]);

  function confirmRemove(entry: CellarWine) {
    const isCustom = entry.ref.kind === 'custom';
    const title = isCustom ? 'Eigenen Wein löschen' : 'Wein entfernen';
    const message = isCustom
      ? entry.persisted
        ? `„${entry.wine.name}“ wird endgültig gelöscht. Alle Verkostungen dieses Weins werden dabei ebenfalls gelöscht.`
        : `„${entry.wine.name}“ wird gelöscht.`
      : entry.persisted
        ? `„${entry.wine.name}“ aus dem Weinkeller entfernen? Deine Sterne und Verkostungen zu diesem Wein bleiben erhalten.`
        : `„${entry.wine.name}“ aus dem Weinkeller entfernen?`;
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: isCustom ? 'Löschen' : 'Entfernen',
        style: 'destructive',
        onPress: async () => {
          const result = await removeEntry(entry);
          if (!result.ok) Alert.alert('Nicht gelöscht', result.error);
        },
      },
    ]);
  }

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
          {watchlistLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : watchlistError ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={64} color={colors.accent} />
              <Text style={styles.emptyTitle}>Fehler beim Laden</Text>
              <Text style={styles.emptySub}>{watchlistError}</Text>
            </View>
          ) : watchlist.length === 0 ? (
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
          {/* Hinweis ohne Anmeldung */}
          {!isPersistent && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
              <Text style={styles.infoBannerText}>
                Dein Weinkeller wird erst nach der Anmeldung dauerhaft gespeichert. Bis dahin ist er nach
                einem Neustart der App leer.
              </Text>
            </View>
          )}

          {/* Fehler beim Laden */}
          {isPersistent && cellarLoadError && (
            <TouchableOpacity style={styles.errorBanner} onPress={() => reloadCellar()}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.skip} />
              <Text style={styles.errorBannerText}>{cellarLoadError} Tippen zum erneuten Laden.</Text>
            </TouchableOpacity>
          )}

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

          {cellarLoading && cellarWines.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : cellarWines.length === 0 ? (
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
                    onReview={() => setReviewCellarWine(item.item)}
                    onEdit={item.item.custom ? () => setEditCustomItem(item.item) : undefined}
                    hasReviewed={item.item.rating != null}
                    showTemporary={isPersistent && !item.item.persisted}
                    onRemove={() => confirmRemove(item.item)}
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
        onConfirm={(qty) =>
          editCellarItem
            ? setQuantity(editCellarItem, qty)
            : Promise.resolve<CellarResult<null>>({ ok: true, data: null })
        }
        onClose={() => setEditCellarItem(null)}
      />

      {/* Add to cellar modal */}
      <AddToCellarModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={(wine, qty) => addToCellar(wine, qty, 'manual')}
        onCreateCustom={(values) => createCustomWine(values)}
      />

      {/* Eigenen Wein bearbeiten */}
      <EditCustomWineModal
        wine={editCustomItem?.custom ?? null}
        onClose={() => setEditCustomItem(null)}
        onSave={async (values) => {
          if (!editCustomItem) return { ok: true, data: null };
          const result = await updateCustomWine(editCustomItem, values);
          if (result.ok) setEditCustomItem(null);
          return result;
        }}
      />

      {/* Review modal */}
      <ReviewModal
        visible={!!reviewCellarWine}
        wine={reviewCellarWine?.wine ?? null}
        existingRating={reviewCellarWine?.rating}
        existingComment={reviewCellarWine?.notes}
        onClose={() => setReviewCellarWine(null)}
        onSubmit={(rating, comment) =>
          reviewCellarWine
            ? setRating(reviewCellarWine, rating, comment)
            : Promise.resolve<CellarResult<null>>({ ok: true, data: null })
        }
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
  reviewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  reviewLinkText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  ownBadge: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  ownBadgeText: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tempBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  tempBadgeText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Hinweise im Weinkeller
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  infoBannerText: { color: colors.text, fontSize: 12, lineHeight: 17, flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.skip,
    backgroundColor: colors.card,
  },
  errorBannerText: { color: colors.skip, fontSize: 12, lineHeight: 17, flex: 1 },

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
});
