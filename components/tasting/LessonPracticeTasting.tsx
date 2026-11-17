// „Verkostung starten“ an der Praxisaufgabe einer Lektion (Teil C):
// Button, Hinweis aus lektionen.json, Zeile „Du hast diese Aufgabe schon n-mal gemacht.“
// und die Weinauswahl aus dem Weinkeller. Wird nur für Lektionen mit Eintrag in lektionen.json gezeigt.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useCellar, type CellarWine } from '../../context/CellarContext';
import { PrimaryButton } from '../academy/AcademyUI';
import { TOUCH } from './TastingUI';
import { useTastingNotes } from '../../lib/tasting/useTastingNotes';
import { RECENT_MAX_LIMIT } from '../../services/tastingNotes';
import { wineInfoLine } from '../../lib/tasting/wizard';
import {
  countTastingsByLesson,
  LessonTask,
  lessonTastingParams,
  PICKER_HINWEIS_ANMELDEN,
  PICKER_HINWEIS_LEER,
  practiceCountLabel,
  selectTastableWines,
  winePickerState,
} from '../../lib/tasting/lessonLinks';

export function LessonPracticeTasting({ lessonId, task }: { lessonId: string; task: LessonTask }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { cellarWines, loading: cellarLoading } = useCellar();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Dieselbe gesammelte Abfrage wie im Weinkeller (Teil B); gezählt wird im Speicher je lesson_id.
  const { notes, refresh } = useTastingNotes({ limit: RECENT_MAX_LIMIT });
  const counts = useMemo(() => countTastingsByLesson(notes), [notes]);
  // Nach der Rückkehr aus dem Assistenten neu laden, damit der Zähler stimmt.
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) refresh();
    }, [isAuthenticated, refresh]),
  );

  const tastable = useMemo(() => selectTastableWines(cellarWines, isAuthenticated), [cellarWines, isAuthenticated]);
  const state = winePickerState(isAuthenticated, tastable.length);

  const startWith = (entry: CellarWine) => {
    setPickerOpen(false);
    router.push({ pathname: '/tasting/[id]', params: lessonTastingParams(entry.ref, lessonId, task) });
  };

  const goLogin = () => {
    setPickerOpen(false);
    router.push('/login');
  };

  const goCreateWine = () => {
    setPickerOpen(false);
    // Bestehender Weg: Sammlung → Weinkeller → „Eigenen Wein anlegen“.
    router.navigate({ pathname: '/(tabs)/watchlist', params: { tab: 'weinkeller', neu: 'eigener' } });
  };

  return (
    <View style={styles.wrap}>
      <PrimaryButton label="Verkostung starten" onPress={() => setPickerOpen(true)} />
      <Text style={styles.hinweis}>{task.hinweis}</Text>
      {isAuthenticated && (
        <View style={styles.countRow}>
          <Ionicons
            name={counts[lessonId] ? 'checkmark-circle' : 'ellipse-outline'}
            size={14}
            color={counts[lessonId] ? colors.like : colors.textMuted}
          />
          <Text style={styles.countText}>{practiceCountLabel(counts[lessonId] ?? 0)}</Text>
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerOpen(false)}
            accessibilityLabel="Weinauswahl schließen"
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>WEIN WÄHLEN</Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(false)}
                style={styles.sheetClose}
                accessibilityRole="button"
                accessibilityLabel="Schließen"
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {state === 'anmelden' ? (
              <View style={styles.empty}>
                <Ionicons name="person-circle-outline" size={32} color={colors.accentMuted} />
                <Text style={styles.emptyText}>{PICKER_HINWEIS_ANMELDEN}</Text>
                <PrimaryButton label="Anmelden" variant="outline" onPress={goLogin} style={styles.emptyButton} />
              </View>
            ) : cellarLoading && tastable.length === 0 ? (
              <View style={styles.empty}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : state === 'leer' ? (
              <View style={styles.empty}>
                <Ionicons name="library-outline" size={32} color={colors.accentMuted} />
                <Text style={styles.emptyText}>{PICKER_HINWEIS_LEER}</Text>
                <PrimaryButton
                  label="Eigenen Wein anlegen"
                  variant="outline"
                  onPress={goCreateWine}
                  style={styles.emptyButton}
                />
              </View>
            ) : (
              <>
                <Text style={styles.sheetText}>Welchen Wein aus deinem Weinkeller möchtest du verkosten?</Text>
                <FlatList
                  data={tastable}
                  keyExtractor={(e) => e.id}
                  style={styles.list}
                  renderItem={({ item }) => {
                    const info = wineInfoLine(item);
                    return (
                      <TouchableOpacity
                        style={styles.row}
                        onPress={() => startWith(item)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.wine.name}${info ? `, ${info}` : ''}. Verkostung starten`}
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
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  hinweis: { color: colors.textMuted, fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: spacing.sm },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  countText: { color: colors.textMuted, fontSize: 13 },

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
});
