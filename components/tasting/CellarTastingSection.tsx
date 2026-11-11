// Abschnitt „Verkostungen“ in der Detailansicht eines Weins im Weinkeller:
// Button „Verkostung starten“, Profil der letzten Verkostung und Verlauf.
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import { PrimaryButton } from '../academy/AcademyUI';
import {
  aromaPreview,
  formatTastingDate,
  levelLabel,
  profileRows,
  selectedAromaIds,
  summarySentence,
  TRINKREIFE_LABELS,
} from '../../lib/tasting/summary';
import type { TastingNote, WeinKategorie } from '../../lib/tasting/types';
import { AromaChipList, HintBox, ProfileBars, SectionTitle, TOUCH, tastingStyles } from './TastingUI';

export function CellarTastingSection({
  notes,
  kategorie,
  loading,
  error,
  hint,
  onStart,
  onOpen,
  onRetry,
}: {
  /** Verkostungen dieses Weins, neueste zuerst */
  notes: TastingNote[];
  kategorie: WeinKategorie;
  loading: boolean;
  error: string | null;
  /** Hinweis statt des Buttons (nicht angemeldet / nur vorübergehend) */
  hint: string | null;
  onStart: () => void;
  onOpen: (note: TastingNote) => void;
  onRetry: () => void;
}) {
  const latest = notes[0] ?? null;
  const rows = latest ? profileRows(latest.data, kategorie) : [];
  const preview = latest ? aromaPreview(selectedAromaIds(latest.data)) : { labels: [], rest: 0 };
  const trinkreife = latest?.data.fazit?.trinkreife;

  return (
    <View style={styles.section}>
      <SectionTitle title="VERKOSTUNGEN" />

      {hint ? (
        <HintBox text={hint} icon="lock-closed-outline" />
      ) : (
        <PrimaryButton label="Verkostung starten" onPress={onStart} />
      )}

      {error ? (
        <TouchableOpacity
          style={styles.block}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Verkostungen erneut laden"
        >
          <HintBox tone="error" text={`${error} Tippen zum erneuten Laden.`} />
        </TouchableOpacity>
      ) : null}

      {loading && notes.length === 0 ? (
        <View style={styles.block}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !hint && !error && notes.length === 0 ? (
        <View style={[tastingStyles.card, styles.block, styles.empty]}>
          <Ionicons name="wine-outline" size={28} color={colors.accent} />
          <Text style={styles.emptyText}>Noch keine Verkostung. Probier es aus.</Text>
        </View>
      ) : null}

      {latest && (
        <View style={[tastingStyles.card, styles.block]}>
          <Text style={styles.cardTitle}>Letzte Verkostung</Text>
          <Text style={styles.cardSub}>
            {formatTastingDate(latest.tastedAt)} · {levelLabel(latest.level)}
          </Text>
          <View style={styles.inner}>
            <ProfileBars rows={rows} />
          </View>
          {preview.labels.length > 0 && (
            <View style={styles.inner}>
              <AromaChipList labels={preview.labels} rest={preview.rest} />
            </View>
          )}
          {trinkreife && (
            <Text style={styles.trinkreife}>
              Trinkreife: <Text style={styles.trinkreifeValue}>{TRINKREIFE_LABELS[trinkreife]}</Text>
            </Text>
          )}
        </View>
      )}

      {notes.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.listTitle}>Verlauf</Text>
          {notes.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={styles.item}
              onPress={() => onOpen(n)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Verkostung vom ${formatTastingDate(n.tastedAt)}, Stufe ${levelLabel(n.level)}, ${summarySentence(n.data, kategorie)}. Öffnen`}
            >
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>
                  {formatTastingDate(n.tastedAt)}
                  <Text style={styles.itemLevel}>{'  ·  '}{levelLabel(n.level).toUpperCase()}</Text>
                </Text>
                <Text style={styles.itemSub} numberOfLines={1}>{summarySentence(n.data, kategorie)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  block: { marginTop: spacing.md },
  inner: { marginTop: spacing.md },
  empty: { alignItems: 'center', gap: spacing.sm },
  emptyText: { color: colors.text, fontSize: 14, textAlign: 'center' },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  trinkreife: { color: colors.textMuted, fontSize: 13, marginTop: spacing.md },
  trinkreifeValue: { color: colors.text, fontWeight: '600' },
  listTitle: { color: colors.textMuted, fontSize: 11, letterSpacing: 2, marginBottom: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH + 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  itemText: { flex: 1 },
  itemTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  itemLevel: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
