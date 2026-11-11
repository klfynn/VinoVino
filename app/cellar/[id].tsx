// Detailansicht eines Weins im Weinkeller mit dem Abschnitt „Verkostungen“.
// Route: /cellar/[id]?kind=market|custom (die WineRef des Eintrags).
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useCellar } from '../../context/CellarContext';
import { BackButton, CloseButton, LoadingState, PrimaryButton } from '../../components/academy/AcademyUI';
import { CellarTastingSection } from '../../components/tasting/CellarTastingSection';
import { TastingResultView } from '../../components/tasting/TastingResultView';
import { TOUCH } from '../../components/tasting/TastingUI';
import { cellarSubtitle } from '../../lib/cellar/merge';
import { TERROIR } from '../../lib/tasting/catalog';
import { formatTastingDate, levelLabel } from '../../lib/tasting/summary';
import { useTastingNotes } from '../../lib/tasting/useTastingNotes';
import { sameWineRef } from '../../lib/tasting/wineRef';
import {
  availabilityHint,
  kategorieForEntry,
  parseTastingParams,
  tastingAvailability,
} from '../../lib/tasting/wizard';
import type { TastingNote, WineRef } from '../../lib/tasting/types';

const KEIN_WEIN: WineRef = { kind: 'market', id: 'kein-wein' };

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default function CellarDetailScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const ref = parseTastingParams(rawParams as Record<string, string | string[] | undefined>).ref;
  const { user } = useAuth();
  const { cellarWines, loading: cellarLoading } = useCellar();
  const entry = useMemo(
    () => (ref ? cellarWines.find((cw) => sameWineRef(cw.ref, ref)) : undefined),
    // ref wird bei jedem Rendern neu gebildet; Art und ID genügen als Abhängigkeit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cellarWines, ref?.kind, ref?.id],
  );

  const availability = tastingAvailability({ signedIn: !!user, persisted: !!entry?.persisted, ref: entry?.ref });
  // Immer mit einem Wein aufrufen: ohne `ref` würde der Hook die letzten Verkostungen aller Weine laden.
  // Für Weine ohne UUID fragt der Dienst gar nicht erst nach und liefert eine leere Liste.
  const tastings = useTastingNotes({ ref: availability === 'ok' && entry ? entry.ref : KEIN_WEIN });
  const notes = availability === 'ok' ? tastings.notes : [];
  const [openNote, setOpenNote] = useState<TastingNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Nach dem Assistenten (oder anderswo gespeichert) beim Zurückkehren still neu laden.
  const { refresh } = tastings;
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/watchlist');
  }, [router]);

  if (!entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {cellarLoading ? (
          <LoadingState />
        ) : (
          <View style={styles.notice}>
            <Ionicons name="library-outline" size={36} color={colors.accentMuted} />
            <Text style={styles.noticeText}>Dieser Wein ist nicht (mehr) in deinem Weinkeller.</Text>
            <PrimaryButton label="Zurück" variant="outline" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const kategorie = kategorieForEntry(entry);
  const isCustom = entry.ref.kind === 'custom';
  const subtitle = cellarSubtitle(entry);
  const custom = entry.custom;
  const boden = custom?.boden && custom.boden !== 'weiss_nicht'
    ? TERROIR.boeden.optionen.find((o) => o.id === custom.boden)?.label
    : undefined;
  const jahrgang = custom ? custom.jahrgang : entry.wine.vintage ? String(entry.wine.vintage) : null;
  const herkunft = [entry.wine.country, entry.wine.region].filter(Boolean).join(', ');

  const startTasting = () =>
    router.push({ pathname: '/tasting/[id]', params: { id: entry.ref.id, kind: entry.ref.kind } });

  const confirmDelete = (note: TastingNote) => {
    Alert.alert('Verkostung löschen?', 'Diese Verkostung wird dauerhaft gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const result = await tastings.remove(note.id);
          setDeleting(false);
          if (!result.ok) {
            Alert.alert('Nicht gelöscht', result.error);
            return;
          }
          setOpenNote(null);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: entry.wine.image }} style={styles.image} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(26,10,15,0.5)', colors.background]} style={styles.imageGradient} />
          <SafeAreaView edges={['top']} style={styles.backWrap}>
            <BackButton onPress={goBack} />
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{entry.wine.type.toUpperCase()}</Text>
          <Text style={styles.name}>{entry.wine.name}</Text>
          {subtitle ? <Text style={styles.winery}>{subtitle}</Text> : null}

          {(isCustom || !entry.persisted) && (
            <View style={styles.badgeRow}>
              {isCustom && (
                <View style={styles.ownBadge}>
                  <Text style={styles.ownBadgeText}>Eigener Wein</Text>
                </View>
              )}
              {!entry.persisted && user && (
                <View style={styles.tempBadge}>
                  <Text style={styles.tempBadgeText}>Nur vorübergehend</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.metaGrid}>
            {jahrgang ? <Meta label="Jahrgang" value={jahrgang} /> : null}
            {herkunft ? <Meta label="Herkunft & Region" value={herkunft} /> : null}
            {entry.wine.grape ? <Meta label="Rebsorte" value={entry.wine.grape} /> : null}
            <Meta label="Im Keller" value={`${entry.quantity} ${entry.quantity === 1 ? 'Flasche' : 'Flaschen'}`} />
            {boden ? <Meta label="Boden" value={boden} /> : null}
          </View>

          {(entry.rating != null || entry.notes) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DEINE BEWERTUNG</Text>
              {entry.rating != null && (
                <Text style={styles.stars} accessibilityLabel={`${entry.rating} von 5 Sternen`}>
                  {[1, 2, 3, 4, 5].map((s) => (s <= (entry.rating ?? 0) ? '★' : '☆')).join(' ')}
                </Text>
              )}
              {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
              {entry.notes ? (
                <View style={styles.privateHint}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.privateHintText}>Nur für dich sichtbar.</Text>
                </View>
              ) : null}
            </View>
          )}

          <CellarTastingSection
            notes={notes}
            kategorie={kategorie}
            loading={tastings.loading}
            error={tastings.error}
            hint={availabilityHint(availability)}
            onStart={startTasting}
            onOpen={setOpenNote}
            onRetry={tastings.refresh}
          />
        </View>
      </ScrollView>

      {/* Nur-Lesen-Ansicht einer Verkostung */}
      <Modal
        visible={!!openNote}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpenNote(null)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <CloseButton onPress={() => setOpenNote(null)} />
            <Text style={styles.modalTitle} numberOfLines={1}>
              {openNote ? formatTastingDate(openNote.tastedAt) : ''}
              <Text style={styles.modalLevel}>{'  ·  '}{openNote ? levelLabel(openNote.level).toUpperCase() : ''}</Text>
            </Text>
          </View>
          {openNote && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalWine}>{entry.wine.name}</Text>
              <TastingResultView data={openNote.data} kategorie={kategorie} bodenEintrag={custom?.boden ?? null} />
              <TouchableOpacity
                style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
                onPress={() => confirmDelete(openNote)}
                disabled={deleting}
                accessibilityRole="button"
                accessibilityLabel="Verkostung löschen"
              >
                {deleting ? (
                  <ActivityIndicator color={colors.skip} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={colors.skip} />
                    <Text style={styles.deleteText}>Verkostung löschen</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: spacing.xl },
  imageWrap: { height: 280, width: '100%' },
  image: { width: '100%', height: '100%' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  backWrap: { position: 'absolute', top: 0, left: spacing.md, paddingTop: spacing.sm },
  body: { padding: spacing.lg, marginTop: -spacing.lg },
  eyebrow: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  name: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: spacing.sm, lineHeight: 36 },
  winery: { color: colors.textMuted, fontStyle: 'italic', fontSize: 16, marginTop: 4 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
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
  metaLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: 2 },
  metaValue: { color: colors.text, fontSize: 15, fontWeight: '600' },

  section: { marginTop: spacing.lg },
  sectionTitle: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700', marginBottom: spacing.sm },
  stars: { color: colors.accent, fontSize: 20, letterSpacing: 2 },
  notes: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, opacity: 0.9 },
  privateHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  privateHintText: { color: colors.textMuted, fontSize: 12 },

  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  noticeText: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: TOUCH + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { flex: 1, color: colors.text, fontSize: 15, fontStyle: 'italic' },
  modalLevel: { color: colors.accent, fontSize: 11, fontStyle: 'normal', fontWeight: '700', letterSpacing: 2 },
  modalContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  modalWine: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: spacing.md },
  deleteBtn: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.skip,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  deleteText: { color: colors.skip, fontSize: 15, fontWeight: '600', letterSpacing: 1 },
});
