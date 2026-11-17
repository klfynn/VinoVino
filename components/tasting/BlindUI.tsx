// Bausteine der Blindverkostung (Teil D1): Etikett „Blind“, Suchfeld für Land und Rebsorte
// und die Auflösung mit Vergleich. Farben, Abstände und Karten wie im übrigen Verkostungsbogen.
// Bedeutungen (richtig, knapp daneben, daneben) stehen nie nur als Farbe da, sondern immer
// zusätzlich als Symbol und Text.
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import {
  BLIND_FELD_LABELS,
  blindSummaryText,
  BlindErgebnis,
  ergebnisText,
  scoreBlindGuess,
  searchCatalog,
} from '../../lib/tasting/blind';
import { bodenVergleichText, BODEN_HINWEIS, compareBoden } from '../../lib/tasting/terroirCompare';
import type { KatalogEintrag, TastingBlind } from '../../lib/tasting/types';
import { Chip, SectionTitle, TOUCH, tastingStyles } from './TastingUI';

// ── Etikett ───────────────────────────────────────────────────────────────────

/** Kleines Etikett „Blind“ (wie „Eigener Wein“ im Weinkeller). */
export function BlindBadge() {
  return (
    <View style={styles.badge} accessible accessibilityLabel="Blindverkostung">
      <Ionicons name="eye-off-outline" size={11} color={colors.accent} />
      <Text style={styles.badgeText}>Blind</Text>
    </View>
  );
}

// ── Suchfeld mit Liste ────────────────────────────────────────────────────────

/**
 * Auswahl aus einem Katalog (Land oder Rebsorte) über ein Suchfeld. Aliase werden gefunden
 * (zum Beispiel „Pinot Noir“ → Spätburgunder). Gewählte Einträge stehen als Chips darüber und
 * lassen sich durch Antippen entfernen. Bei `max = 1` ersetzt eine neue Wahl die alte.
 */
export function CatalogPicker({
  items,
  selected,
  max,
  onChange,
  placeholder,
  groupLabel,
}: {
  items: readonly KatalogEintrag[];
  selected: string[];
  max: number;
  onChange: (ids: string[]) => void;
  placeholder: string;
  /** zum Beispiel „Land“ oder „Rebsorte“ (für Bedienungshilfen) */
  groupLabel: string;
}) {
  const [query, setQuery] = useState('');
  const voll = max > 1 && selected.length >= max;
  const treffer = query.trim() ? searchCatalog(items.filter((i) => !selected.includes(i.id)), query, 8) : [];
  const labelOf = (id: string) => items.find((i) => i.id === id)?.label ?? id;

  const add = (id: string) => {
    if (max <= 1) onChange([id]);
    else if (!selected.includes(id) && selected.length < max) onChange([...selected, id]);
    setQuery('');
  };

  return (
    <View>
      {selected.length > 0 && (
        <View style={[styles.chipWrap, styles.gapBottom]}>
          {selected.map((id) => (
            <Chip
              key={id}
              label={labelOf(id)}
              selected
              icon="close"
              onPress={() => onChange(selected.filter((x) => x !== id))}
              accessibilityLabel={`${groupLabel} ${labelOf(id)} entfernen`}
            />
          ))}
        </View>
      )}
      {voll ? (
        <Text style={styles.hint}>Höchstens {max} Einträge. Tippe einen an, um ihn zu entfernen.</Text>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={`${groupLabel} suchen`}
          />
          {query.trim() && treffer.length === 0 ? (
            <Text style={styles.hint}>Nichts gefunden. Versuch eine andere Schreibweise.</Text>
          ) : null}
          {treffer.length > 0 && (
            <View style={[styles.chipWrap, styles.gapTop]}>
              {treffer.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  icon="add"
                  onPress={() => add(t.id)}
                  accessibilityLabel={`${groupLabel} ${t.label} wählen`}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Auflösung ─────────────────────────────────────────────────────────────────

const ERGEBNIS_STIL: Record<BlindErgebnis, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  richtig: { icon: 'checkmark-circle', color: colors.like },
  knapp: { icon: 'alert-circle', color: colors.accent },
  falsch: { icon: 'close-circle', color: colors.skip },
  nicht_getippt: { icon: 'help-circle-outline', color: colors.textMuted },
  nicht_bewertbar: { icon: 'remove-circle-outline', color: colors.textMuted },
};

/**
 * „Das war: <Name>“, je Feld Tipp und Wirklichkeit mit Ergebnis (Symbol und Text), die
 * Zusammenfassung und, falls vorhanden, der vorsichtige Boden-Vergleich aus Teil B.
 * Grundlage ist die gespeicherte Momentaufnahme, nicht der heutige Stand des Weins.
 */
export function BlindResolution({
  wineName,
  blind,
  bodenTipp,
  bodenEintrag,
}: {
  wineName: string;
  blind: TastingBlind | undefined;
  bodenTipp?: string | null;
  bodenEintrag?: string | null;
}) {
  const auswertung = scoreBlindGuess(blind ?? {}, blind?.wahrheit ?? {});
  const vergleich = bodenVergleichText(compareBoden(bodenTipp ?? null, bodenEintrag));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>AUFLÖSUNG</Text>
        <Text style={styles.title}>Das war: {wineName}</Text>
      </View>

      <View style={tastingStyles.card}>
        <SectionTitle title="DEIN TIPP" />
        {auswertung.felder.map((f, i) => {
          const stil = ERGEBNIS_STIL[f.ergebnis];
          const text = ergebnisText(f);
          return (
            <View
              key={f.feld}
              style={[styles.row, i > 0 && styles.rowBorder]}
              accessible
              accessibilityLabel={`${BLIND_FELD_LABELS[f.feld]}. Dein Tipp: ${f.tipp ?? 'keiner'}. Wirklich: ${f.wirklich ?? 'keine Angabe'}. ${text}.`}
            >
              <Text style={styles.rowLabel}>{BLIND_FELD_LABELS[f.feld]}</Text>
              <View style={styles.compare}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareHead}>Dein Tipp</Text>
                  <Text style={[styles.compareValue, !f.tipp && styles.compareEmpty]}>{f.tipp ?? '—'}</Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.compareHead}>Wirklich</Text>
                  <Text style={[styles.compareValue, !f.wirklich && styles.compareEmpty]}>{f.wirklich ?? '—'}</Text>
                </View>
              </View>
              <View style={styles.result}>
                <Ionicons name={stil.icon} size={16} color={stil.color} />
                <Text style={[styles.resultText, { color: stil.color }]}>{text}</Text>
              </View>
            </View>
          );
        })}
        <Text style={styles.summary}>{blindSummaryText(auswertung)}</Text>
      </View>

      {vergleich && (
        <View style={tastingStyles.card}>
          <SectionTitle title="BODEN" />
          <Text style={styles.vergleich}>{vergleich}</Text>
          <Text style={styles.bodenHinweis}>{BODEN_HINWEIS}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  badgeText: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gapBottom: { marginBottom: spacing.sm },
  gapTop: { marginTop: spacing.sm },
  input: {
    minHeight: TOUCH,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm, fontStyle: 'italic' },

  wrap: { gap: spacing.md, marginBottom: spacing.md },
  head: { alignItems: 'center', gap: spacing.xs },
  eyebrow: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 28 },

  row: { paddingVertical: spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  compare: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  compareCol: { flex: 1 },
  compareHead: { color: colors.textMuted, fontSize: 11, letterSpacing: 1 },
  compareValue: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 2 },
  compareEmpty: { color: colors.textMuted, fontWeight: '400' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  resultText: { fontSize: 13, fontWeight: '700' },
  summary: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },

  vergleich: { color: colors.text, fontSize: 13, lineHeight: 19 },
  bodenHinweis: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs, fontStyle: 'italic' },
});
