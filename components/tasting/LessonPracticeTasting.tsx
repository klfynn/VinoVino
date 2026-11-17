// „Verkostung starten“ an der Praxisaufgabe einer Lektion (Teil C):
// Button, Hinweis aus lektionen.json, Zeile „Du hast diese Aufgabe schon n-mal gemacht.“
// und die Weinauswahl aus dem Weinkeller (WinePickerSheet). Wird nur für Lektionen mit Eintrag in
// lektionen.json gezeigt. Teil D1: Bei `"blind": true` heißt der Button „Blindverkostung starten“.
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import type { CellarWine } from '../../context/CellarContext';
import { PrimaryButton } from '../academy/AcademyUI';
import { WinePickerSheet } from './WinePickerSheet';
import { useTastingNotes } from '../../lib/tasting/useTastingNotes';
import { RECENT_MAX_LIMIT } from '../../services/tastingNotes';
import type { TastingDraft } from '../../lib/tasting/draft';
import {
  countTastingsByLesson,
  isBlindLessonTask,
  LessonTask,
  lessonTastingParams,
  practiceCountLabel,
} from '../../lib/tasting/lessonLinks';

export function LessonPracticeTasting({ lessonId, task }: { lessonId: string; task: LessonTask }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
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

  // Teil D1: Lektionen mit `"blind": true` in lektionen.json starten eine Blindverkostung.
  const blind = isBlindLessonTask(task);

  const startWith = (entry: CellarWine) => {
    setPickerOpen(false);
    router.push({ pathname: '/tasting/[id]', params: lessonTastingParams(entry.ref, lessonId, task) });
  };

  // Angefangene Blindverkostung fortsetzen; Lektion und Schwerpunkt stehen im Entwurf.
  const resumeBlind = (draft: TastingDraft) => {
    setPickerOpen(false);
    router.push({
      pathname: '/tasting/[id]',
      params: { id: draft.ref.id, kind: draft.ref.kind, blind: '1', ...(draft.lessonId === lessonId ? { lesson: lessonId, from: 'lektion' } : {}) },
    });
  };

  return (
    <View style={styles.wrap}>
      <PrimaryButton label={blind ? 'Blindverkostung starten' : 'Verkostung starten'} onPress={() => setPickerOpen(true)} />
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

      <WinePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        blind={blind}
        onPick={startWith}
        onResumeBlindDraft={resumeBlind}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  hinweis: { color: colors.textMuted, fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: spacing.sm },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  countText: { color: colors.textMuted, fontSize: 13 },
});
