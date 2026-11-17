// Weinauswahl aus dem Weinkeller als Sheet (aus Teil C herausgelöst, damit Praxisaufgabe und
// Weinkeller sie teilen). Im Blind-Modus (Teil D1) gibt es zwei Wege: „Zufällig auswählen“
// (empfohlen, der Name bleibt verborgen) und „Selbst wählen“ (mit Namen). Es erscheinen nur
// Weine, die für eine Blindverkostung genug Angaben haben. Eine angefangene Blindverkostung
// wird ohne Namen zum Weitermachen angeboten.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useCellar, type CellarWine } from '../../context/CellarContext';
import { PrimaryButton } from '../academy/AcademyUI';
import { TOUCH } from './TastingUI';
import { wineInfoLine } from '../../lib/tasting/wizard';
import {
  PICKER_HINWEIS_ANMELDEN,
  PICKER_HINWEIS_LEER,
  selectTastableWines,
  winePickerState,
} from '../../lib/tasting/lessonLinks';
import {
  BLIND_ERKLAERUNG_SELBST,
  BLIND_ERKLAERUNG_ZUFALL,
  BLIND_HINWEIS_ZU_WENIG,
  pickRandomBlindWine,
  selectBlindWines,
} from '../../lib/tasting/blind';
import { useBlindDraft } from '../../lib/tasting/useBlindDraft';
import { sameWineRef } from '../../lib/tasting/wineRef';
import type { TastingDraft } from '../../lib/tasting/draft';
import type { WineRef } from '../../lib/tasting/types';

export function WinePickerSheet({
  visible,
  onClose,
  blind = false,
  onPick,
  onResumeBlindDraft,
  onCreateWine,
}: {
  visible: boolean;
  onClose: () => void;
  /** Teil D1: Auswahl für eine Blindverkostung */
  blind?: boolean;
  /** Gewählter Wein (auch der zufällig gewählte) */
  onPick: (entry: CellarWine) => void;
  /** Teil D1: angefangene Blindverkostung fortsetzen */
  onResumeBlindDraft?: (draft: TastingDraft) => void;
  /** Statt des Standardwegs (Sammlung → Weinkeller → „Eigenen Wein anlegen“) */
  onCreateWine?: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cellarWines, loading: cellarLoading } = useCellar();
  // Im Blind-Modus erst die Wahl zwischen „Zufällig“ und „Selbst wählen“, dann die Liste.
  const [liste, setListe] = useState(!blind);

  const tastable = useMemo(() => selectTastableWines(cellarWines, isAuthenticated), [cellarWines, isAuthenticated]);
  const blindWines = useMemo(() => (blind ? selectBlindWines(tastable) : []), [blind, tastable]);
  const shown = blind ? blindWines : tastable;
  const state = winePickerState(isAuthenticated, shown.length);

  const isAvailable = useCallback(
    (ref: WineRef) => blind && blindWines.some((w) => sameWineRef(w.ref, ref)),
    [blind, blindWines],
  );
  const { draft: blindDraft, refresh: refreshBlindDraft } = useBlindDraft(isAvailable);

  useEffect(() => {
    if (!visible) return;
    setListe(!blind);
    if (blind) refreshBlindDraft();
  }, [visible, blind, refreshBlindDraft]);

  const goLogin = () => {
    onClose();
    router.push('/login');
  };

  const goCreateWine = () => {
    onClose();
    if (onCreateWine) {
      onCreateWine();
      return;
    }
    // Bestehender Weg: Sammlung → Weinkeller → „Eigenen Wein anlegen“.
    router.navigate({ pathname: '/(tabs)/watchlist', params: { tab: 'weinkeller', neu: 'eigener' } });
  };

  const pickRandom = () => {
    const wine = pickRandomBlindWine(blindWines, Math.random);
    if (wine) onPick(wine);
  };

  let content: React.ReactNode;
  if (state === 'anmelden') {
    content = (
      <View style={styles.empty}>
        <Ionicons name="person-circle-outline" size={32} color={colors.accentMuted} />
        <Text style={styles.emptyText}>{PICKER_HINWEIS_ANMELDEN}</Text>
        <PrimaryButton label="Anmelden" variant="outline" onPress={goLogin} style={styles.emptyButton} />
      </View>
    );
  } else if (cellarLoading && shown.length === 0) {
    content = (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (state === 'leer') {
    content = (
      <View style={styles.empty}>
        <Ionicons name={blind ? 'eye-off-outline' : 'library-outline'} size={32} color={colors.accentMuted} />
        <Text style={styles.emptyText}>{blind ? BLIND_HINWEIS_ZU_WENIG : PICKER_HINWEIS_LEER}</Text>
        <PrimaryButton label="Eigenen Wein anlegen" variant="outline" onPress={goCreateWine} style={styles.emptyButton} />
      </View>
    );
  } else if (!liste) {
    content = (
      <View>
        {blindDraft && onResumeBlindDraft && (
          <View style={styles.draftCard}>
            <Ionicons name="time-outline" size={22} color={colors.accent} />
            <Text style={styles.draftText}>Du hast eine angefangene Blindverkostung.</Text>
            <PrimaryButton label="Weitermachen" onPress={() => onResumeBlindDraft(blindDraft)} style={styles.emptyButton} />
          </View>
        )}
        <Text style={styles.sheetText}>Wie soll der Wein ausgewählt werden?</Text>
        <TouchableOpacity
          style={[styles.choice, styles.choiceRecommended]}
          onPress={pickRandom}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Zufällig auswählen. Empfohlen: Der Name bleibt bis zur Auflösung verborgen."
        >
          <Ionicons name="shuffle" size={22} color={colors.accent} />
          <View style={styles.choiceText}>
            <Text style={[styles.choiceTitle, { color: colors.accent }]}>Zufällig auswählen</Text>
            <Text style={styles.choiceHelp}>Empfohlen. Der Name bleibt bis zur Auflösung verborgen.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.choice}
          onPress={() => setListe(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Selbst wählen. Du siehst dann die Namen."
        >
          <Ionicons name="list-outline" size={22} color={colors.textMuted} />
          <View style={styles.choiceText}>
            <Text style={styles.choiceTitle}>Selbst wählen</Text>
            <Text style={styles.choiceHelp}>Du siehst dann die Namen.</Text>
          </View>
        </TouchableOpacity>
        {/* Gastgeber-Weg: kurze Erklärung zu beiden Wegen */}
        <View style={styles.explain}>
          <Text style={styles.explainText}>{BLIND_ERKLAERUNG_ZUFALL}</Text>
          <Text style={styles.explainText}>{BLIND_ERKLAERUNG_SELBST}</Text>
        </View>
      </View>
    );
  } else {
    content = (
      <>
        {blind ? (
          <View style={styles.blindListHead}>
            <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
            <Text style={styles.blindListText}>Du siehst die Namen. Wähle einen Wein, den du nicht schon erkennst.</Text>
          </View>
        ) : (
          <Text style={styles.sheetText}>Welchen Wein aus deinem Weinkeller möchtest du verkosten?</Text>
        )}
        <FlatList
          data={shown}
          keyExtractor={(e) => e.id}
          style={styles.list}
          renderItem={({ item }) => {
            const info = wineInfoLine(item);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => onPick(item)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${item.wine.name}${info ? `, ${info}` : ''}. ${blind ? 'Blindverkostung' : 'Verkostung'} starten`}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{item.wine.name}</Text>
                  {info ? <Text style={styles.rowSub}>{info}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </TouchableOpacity>
            );
          }}
        />
        {blind && (
          <PrimaryButton label="Zurück" variant="ghost" onPress={() => setListe(false)} style={styles.backButton} />
        )}
      </>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Weinauswahl schließen" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{blind ? 'BLINDVERKOSTUNG' : 'WEIN WÄHLEN'}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.sheetClose}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {content}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Wie InfoSheet (TastingUI) und das Hinzufügen-Fenster im Weinkeller
  backdrop: { flex: 1, backgroundColor: 'rgba(26,10,15,0.75)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sheetTitle: { color: colors.accent, fontSize: 15, fontWeight: '700', letterSpacing: 1.5, flex: 1 },
  sheetClose: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
  sheetText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH + 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    marginBottom: spacing.sm,
  },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  emptyText: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  emptyButton: { alignSelf: 'stretch' },

  explain: { gap: spacing.xs, marginTop: spacing.xs },
  explainText: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  // Blind-Modus: Auswahl wie die Stufenkarten im Assistenten
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
    marginBottom: spacing.sm,
  },
  choiceRecommended: { borderColor: colors.accent },
  choiceText: { flex: 1 },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  choiceHelp: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  draftCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.cardElevated,
    marginBottom: spacing.md,
  },
  draftText: { color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  blindListHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  blindListText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, flex: 1 },
  backButton: { marginTop: spacing.xs },
});
