// Aroma-Auswahl für Nase und Gaumen: Abschnitte Primär, Sekundär, Tertiär, darin Familien zum
// Auf- und Zuklappen mit Einzelaromen als Chips (Mehrfachauswahl). Oben die Zusammenfassung.
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import { aromaLabel } from '../../lib/tasting/catalog';
import type { AromaStufe, AromaStufeKatalog } from '../../lib/tasting/types';
import { Chip, TOUCH } from './TastingUI';

export function AromaPicker({
  stufen,
  selectedIds,
  isSelected,
  onToggle,
  emptyHint = 'Noch keine Aromen gewählt. Öffne eine Familie und tippe an, was du wahrnimmst.',
}: {
  stufen: AromaStufeKatalog[];
  /** Alle gewählten Aromen in Auswahlreihenfolge (für die Zusammenfassung) */
  selectedIds: string[];
  isSelected: (stufe: AromaStufe, id: string) => boolean;
  onToggle: (stufe: AromaStufe, id: string) => void;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Zu welcher Stufe gehört ein gewähltes Aroma? (für das Entfernen aus der Zusammenfassung)
  const stufeOf = (id: string): AromaStufe | null => {
    for (const s of stufen) for (const f of s.familien) if (f.aromen.some((a) => a.id === id)) return s.id;
    return null;
  };

  return (
    <View>
      {/* Zusammenfassung */}
      <View style={styles.summary}>
        {selectedIds.length === 0 ? (
          <Text style={styles.summaryEmpty}>{emptyHint}</Text>
        ) : (
          <View style={styles.chipWrap}>
            {selectedIds.map((id) => {
              const label = aromaLabel(id) ?? id;
              const stufe = stufeOf(id);
              return (
                <Chip
                  key={id}
                  label={label}
                  selected
                  icon="close"
                  accessibilityLabel={`${label} entfernen`}
                  onPress={stufe ? () => onToggle(stufe, id) : undefined}
                />
              );
            })}
          </View>
        )}
      </View>

      {stufen.map((stufe) => (
        <View key={stufe.id} style={styles.stufe}>
          <Text style={styles.stufeTitle}>{stufe.label}</Text>
          <Text style={styles.stufeText}>{stufe.beschreibung}</Text>
          {stufe.familien.map((familie) => {
            const key = `${stufe.id}:${familie.id}`;
            const isOpen = !!open[key];
            const count = familie.aromen.filter((a) => isSelected(stufe.id, a.id)).length;
            return (
              <View key={familie.id} style={styles.familie}>
                <TouchableOpacity
                  style={styles.familieHeader}
                  onPress={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${familie.label}${count > 0 ? `, ${count} gewählt` : ''}, ${isOpen ? 'zuklappen' : 'aufklappen'}`}
                >
                  <Text style={styles.familieLabel}>{familie.label}</Text>
                  {count > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{count}</Text>
                    </View>
                  )}
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} />
                </TouchableOpacity>
                {isOpen && (
                  <View style={[styles.chipWrap, styles.familieBody]}>
                    {familie.aromen.map((a) => {
                      const selected = isSelected(stufe.id, a.id);
                      return (
                        <Chip
                          key={a.id}
                          label={a.label}
                          selected={selected}
                          onPress={() => onToggle(stufe.id, a.id)}
                          accessibilityLabel={`${a.label} (${familie.label})${selected ? ', gewählt' : ''}`}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  summaryEmpty: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  stufe: { marginBottom: spacing.md },
  stufeTitle: { color: colors.accent, fontSize: 12, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
  stufeText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: spacing.sm },
  familie: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  familieHeader: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  familieLabel: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  familieBody: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: colors.background, fontSize: 11, fontWeight: '700' },
});
