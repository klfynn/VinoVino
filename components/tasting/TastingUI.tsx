// Bausteine des Verkostungsbogens. Farben, Abstände und Schriftgrößen wie im Weinkeller
// (watchlist.tsx) und in der Akademie (AcademyUI.tsx). Animationen nur mit `Animated`.
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import type { Farbe, Skala, Skalenwert, TastingStep } from '../../lib/tasting/types';
import type { ProfileRow } from '../../lib/tasting/summary';

/** Mindestgröße für Tippflächen (Punkte). */
export const TOUCH = 44;

// ── Überschriften ─────────────────────────────────────────────────────────────

/** Abschnittstitel wie in der Detailansicht („GESCHMACK“, „BEWERTUNGEN“). */
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

export function FieldLabel({ label, onHelp, helpLabel }: { label: string; onHelp?: () => void; helpLabel?: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {onHelp && (
        <TouchableOpacity
          onPress={onHelp}
          style={styles.helpBtn}
          accessibilityRole="button"
          accessibilityLabel={helpLabel ?? `Erklärung zu ${label}`}
        >
          <Text style={styles.helpBtnText}>?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Chips und Einfachauswahl ──────────────────────────────────────────────────

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const content = (
    <>
      {icon && <Ionicons name={icon} size={13} color={selected ? colors.background : colors.accent} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </>
  );
  if (!onPress) {
    return <View style={[styles.chip, styles.chipStatic, selected && styles.chipSelected]}>{content}</View>;
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {content}
    </TouchableOpacity>
  );
}

/** Einfachauswahl als Reihe von Chips. Erneutes Tippen hebt die Auswahl auf. */
export function OptionRow<T extends string>({
  options,
  value,
  onChange,
  groupLabel,
}: {
  options: { id: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T | undefined) => void;
  groupLabel: string;
}) {
  return (
    <View style={styles.chipWrap} accessibilityRole="radiogroup" accessibilityLabel={groupLabel}>
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => onChange(selected ? undefined : o.id)}
            activeOpacity={0.8}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${groupLabel}: ${o.label}`}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Skala 1 bis 5 ─────────────────────────────────────────────────────────────

export function ScaleInput({
  skala,
  value,
  onChange,
  onHelp,
}: {
  skala: Skala;
  value: Skalenwert | undefined;
  onChange: (v: Skalenwert | undefined) => void;
  onHelp: () => void;
}) {
  return (
    <View style={styles.field}>
      <FieldLabel label={skala.label} onHelp={onHelp} />
      <View style={styles.scaleRow}>
        {([1, 2, 3, 4, 5] as Skalenwert[]).map((n) => {
          const selected = value === n;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(selected ? undefined : n)}
              activeOpacity={0.8}
              style={[styles.scaleBtn, selected && styles.scaleBtnSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${skala.label} ${n} von 5: ${skala.anker[n - 1] ?? ''}`}
            >
              <Text style={[styles.scaleBtnText, selected && styles.scaleBtnTextSelected]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.anchorRow}>
        <Text style={styles.anchorText}>{skala.anker[0]}</Text>
        <Text style={[styles.anchorText, styles.anchorRight]}>{skala.anker[4]}</Text>
      </View>
      {value ? <Text style={styles.anchorSelected}>{value}: {skala.anker[value - 1]}</Text> : null}
    </View>
  );
}

// ── Farbfelder ────────────────────────────────────────────────────────────────

export function ColorSwatches({
  farben,
  value,
  onChange,
  groupLabel,
}: {
  farben: Farbe[];
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  groupLabel: string;
}) {
  const selectedLabel = farben.find((f) => f.id === value)?.label;
  return (
    <View>
      <View style={styles.swatchRow} accessibilityRole="radiogroup" accessibilityLabel={groupLabel}>
        {farben.map((f) => {
          const selected = value === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => onChange(selected ? undefined : f.id)}
              activeOpacity={0.8}
              style={[styles.swatchOuter, selected && styles.swatchOuterSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${groupLabel}: ${f.label}`}
            >
              <View style={[styles.swatch, { backgroundColor: f.hex }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.swatchCaption}>{selectedLabel ?? 'Tippe auf die passende Farbe.'}</Text>
    </View>
  );
}

// ── Sterne ────────────────────────────────────────────────────────────────────

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.starsRow} accessibilityRole="radiogroup" accessibilityLabel="Gesamtnote in Sternen">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          style={styles.starBtn}
          accessibilityRole="radio"
          accessibilityState={{ selected: star === value }}
          accessibilityLabel={`${star} ${star === 1 ? 'Stern' : 'Sterne'}`}
        >
          <Text style={[styles.star, star <= value && styles.starActive]}>{star <= value ? '★' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Fortschritt (fünf Abschnitte) ─────────────────────────────────────────────

export function StepProgress({
  steps,
  labels,
  current,
  filled,
}: {
  steps: TastingStep[];
  labels: Record<string, string>;
  current: TastingStep;
  filled: TastingStep[];
}) {
  const index = steps.indexOf(current);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Schritt ${index + 1} von ${steps.length}: ${labels[current] ?? ''}`}
    >
      <View style={styles.progressRow}>
        {steps.map((s) => (
          <View
            key={s}
            style={[
              styles.progressSeg,
              filled.includes(s) && styles.progressSegFilled,
              s === current && styles.progressSegCurrent,
            ]}
          />
        ))}
      </View>
      <View style={styles.progressLabels}>
        {steps.map((s) => (
          <Text key={s} style={[styles.progressLabel, s === current && styles.progressLabelCurrent]} numberOfLines={1}>
            {labels[s] ?? s}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Profil-Balken (Animated) ──────────────────────────────────────────────────

function ProfileBar({ row, delay }: { row: ProfileRow; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: row.value / 5,
      duration: 500,
      delay,
      easing: Easing.out(Easing.cubic),
      // Breiten lassen sich nicht mit dem nativen Treiber animieren.
      useNativeDriver: false,
    }).start();
  }, [anim, row.value, delay]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View
      style={styles.barRow}
      accessible
      accessibilityLabel={`${row.label}: ${row.value} von 5, ${row.anker}`}
    >
      <Text style={styles.barLabel} numberOfLines={1}>{row.label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width }]} />
      </View>
      <Text style={styles.barValue}>{row.value}</Text>
    </View>
  );
}

export function ProfileBars({ rows }: { rows: ProfileRow[] }) {
  if (rows.length === 0) {
    return <Text style={styles.mutedText}>Keine Werte zu Süße, Säure, Körper und Co. eingetragen.</Text>;
  }
  return (
    <View style={styles.bars}>
      {rows.map((r, i) => (
        <ProfileBar key={r.id} row={r} delay={i * 60} />
      ))}
    </View>
  );
}

/** Aromen als Chips (nur Anzeige) mit „+ n weitere“. */
export function AromaChipList({ labels, rest }: { labels: string[]; rest: number }) {
  if (labels.length === 0) return null;
  return (
    <View style={styles.chipWrap}>
      {labels.map((l, i) => (
        <Chip key={`${l}-${i}`} label={l} />
      ))}
      {rest > 0 && <Text style={styles.restText}>+ {rest} weitere</Text>}
    </View>
  );
}

// ── Erklärung als Sheet ───────────────────────────────────────────────────────

export function InfoSheet({
  visible,
  title,
  text,
  anker,
  onClose,
}: {
  visible: boolean;
  title: string;
  text: string;
  anker?: string[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Erklärung schließen" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Schließen">
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sheetText}>{text}</Text>
          {anker && anker.length > 0 && (
            <View style={styles.sheetAnker}>
              {anker.map((a, i) => (
                <Text key={i} style={styles.sheetAnkerText}>
                  <Text style={styles.sheetAnkerNum}>{i + 1}</Text>  {a}
                </Text>
              ))}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Kurzer Hinweis in einer Karte (zum Beispiel „Nur vorübergehend“ oder Fehler). */
export function HintBox({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'error' | 'success'; icon?: keyof typeof Ionicons.glyphMap }) {
  const color = tone === 'error' ? colors.skip : tone === 'success' ? colors.like : colors.accent;
  return (
    <View style={[styles.hint, { borderColor: tone === 'info' ? colors.border : color }]}>
      <Ionicons
        name={icon ?? (tone === 'error' ? 'cloud-offline-outline' : tone === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline')}
        size={18}
        color={color}
      />
      <Text style={[styles.hintText, tone === 'error' && { color: colors.skip }]}>{text}</Text>
    </View>
  );
}

export const tastingStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  mutedText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  bodyText: { color: colors.text, fontSize: 14, lineHeight: 20 },
});

const styles = StyleSheet.create({
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  field: { marginBottom: spacing.lg },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  fieldLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  helpBtn: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  helpBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    width: 24,
    height: 24,
    lineHeight: 22,
    textAlign: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    overflow: 'hidden',
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardElevated,
  },
  chipStatic: { minHeight: 32 },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextSelected: { color: colors.background, fontWeight: '700' },
  restText: { color: colors.textMuted, fontSize: 13, alignSelf: 'center' },

  scaleRow: { flexDirection: 'row', gap: spacing.sm },
  scaleBtn: {
    flex: 1,
    minHeight: TOUCH,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  scaleBtnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  scaleBtnTextSelected: { color: colors.background, fontWeight: '700' },
  anchorRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, gap: spacing.sm },
  anchorText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  anchorRight: { textAlign: 'right' },
  anchorSelected: { color: colors.accent, fontSize: 13, fontStyle: 'italic', marginTop: spacing.xs },

  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatchOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOuterSelected: { borderColor: colors.accent },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  swatchCaption: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: spacing.xs },

  starsRow: { flexDirection: 'row', gap: spacing.xs },
  starBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 34, color: colors.border },
  starActive: { color: colors.accent },

  progressRow: { flexDirection: 'row', gap: spacing.xs },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  progressSegFilled: { backgroundColor: colors.accentMuted },
  progressSegCurrent: { backgroundColor: colors.accent, height: 4 },
  progressLabels: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  progressLabel: { flex: 1, color: colors.textMuted, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  progressLabelCurrent: { color: colors.accent, fontWeight: '700' },

  bars: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { color: colors.text, fontSize: 13, width: 72 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  barValue: { color: colors.accent, fontSize: 13, fontWeight: '700', width: 16, textAlign: 'right' },
  mutedText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(26,10,15,0.75)', justifyContent: 'flex-end' },
  sheet: {
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
  sheetText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sheetAnker: { marginTop: spacing.md, gap: 4 },
  sheetAnkerText: { color: colors.textMuted, fontSize: 13 },
  sheetAnkerNum: { color: colors.accent, fontWeight: '700' },

  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  hintText: { color: colors.text, fontSize: 12, lineHeight: 17, flex: 1 },
});
