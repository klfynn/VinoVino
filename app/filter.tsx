import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { wines as ALL_WINES } from '../data/wines';
import {
  JAHRGANG_BOUNDS,
  PREIS_BOUNDS,
  useFilters,
} from '../context/FilterContext';
import { Anlass, Geschmack, Weinart } from '../types';
import { colors, radii, spacing } from '../theme';

const WEINARTEN: Weinart[] = ['Rot', 'Weiß', 'Rosé', 'Schaumwein', 'Port'];
const GESCHMACK_OPTIONS: Geschmack[] = ['Trocken', 'Halbtrocken', 'Lieblich'];
const HERKUNFT_OPTIONS = [
  'Frankreich',
  'Italien',
  'Spanien',
  'Deutschland',
  'Österreich',
  'Neue Welt',
];
const ANLASS_OPTIONS: { value: Anlass; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Dinner', icon: 'restaurant-outline' },
  { value: 'Geschenk', icon: 'gift-outline' },
  { value: 'Party', icon: 'sparkles-outline' },
  { value: 'Apéritif', icon: 'wine-outline' },
  { value: 'Zum Kochen', icon: 'flame-outline' },
];

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

function Chip({ label, active, onPress, icon }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.accent : colors.textMuted}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FilterScreen() {
  const router = useRouter();
  const f = useFilters();

  const filteredCount = useMemo(() => f.applyFilters(ALL_WINES).length, [f]);
  const canReset = f.activeFilterCount > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Filter</Text>
        <Pressable onPress={f.resetFilters} disabled={!canReset} hitSlop={10}>
          <Text style={[styles.resetText, !canReset && styles.resetTextDisabled]}>
            Zurücksetzen
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Weinart">
          <View style={styles.chipRow}>
            {WEINARTEN.map((w) => (
              <Chip
                key={w}
                label={w}
                active={f.weinart.includes(w)}
                onPress={() => f.toggleWeinart(w)}
              />
            ))}
          </View>
        </Section>

        <Section title="Geschmack">
          <View style={styles.chipRow}>
            {GESCHMACK_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g}
                active={f.geschmack.includes(g)}
                onPress={() => f.toggleGeschmack(g)}
              />
            ))}
          </View>
        </Section>

        <Section title="Preis">
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeValue}>€ {Math.round(f.preis.min)}</Text>
            <Text style={styles.rangeSeparator}>bis</Text>
            <Text style={styles.rangeValue}>€ {Math.round(f.preis.max)}</Text>
          </View>
          <Text style={styles.sliderHint}>Minimum</Text>
          <Slider
            minimumValue={PREIS_BOUNDS.min}
            maximumValue={PREIS_BOUNDS.max}
            step={5}
            value={f.preis.min}
            onValueChange={(v) =>
              f.setPreis({ min: Math.min(v, f.preis.max), max: f.preis.max })
            }
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
          <Text style={styles.sliderHint}>Maximum</Text>
          <Slider
            minimumValue={PREIS_BOUNDS.min}
            maximumValue={PREIS_BOUNDS.max}
            step={5}
            value={f.preis.max}
            onValueChange={(v) =>
              f.setPreis({ min: f.preis.min, max: Math.max(v, f.preis.min) })
            }
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </Section>

        <Section title="Jahrgang">
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeValue}>{Math.round(f.jahrgang.min)}</Text>
            <Text style={styles.rangeSeparator}>bis</Text>
            <Text style={styles.rangeValue}>{Math.round(f.jahrgang.max)}</Text>
          </View>
          <Text style={styles.sliderHint}>Von</Text>
          <Slider
            minimumValue={JAHRGANG_BOUNDS.min}
            maximumValue={JAHRGANG_BOUNDS.max}
            step={1}
            value={f.jahrgang.min}
            onValueChange={(v) =>
              f.setJahrgang({ min: Math.min(v, f.jahrgang.max), max: f.jahrgang.max })
            }
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
          <Text style={styles.sliderHint}>Bis</Text>
          <Slider
            minimumValue={JAHRGANG_BOUNDS.min}
            maximumValue={JAHRGANG_BOUNDS.max}
            step={1}
            value={f.jahrgang.max}
            onValueChange={(v) =>
              f.setJahrgang({ min: f.jahrgang.min, max: Math.max(v, f.jahrgang.min) })
            }
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </Section>

        <Section title="Herkunft">
          <View style={styles.chipRow}>
            {HERKUNFT_OPTIONS.map((h) => (
              <Chip
                key={h}
                label={h}
                active={f.herkunft.includes(h)}
                onPress={() => f.toggleHerkunft(h)}
              />
            ))}
          </View>
        </Section>

        <Section title="Anlass">
          <View style={styles.chipRow}>
            {ANLASS_OPTIONS.map((a) => (
              <Chip
                key={a.value}
                label={a.value}
                icon={a.icon}
                active={f.anlass.includes(a.value)}
                onPress={() => f.toggleAnlass(a.value)}
              />
            ))}
          </View>
        </Section>

        <Section title="Bio / Natur / Vegan">
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Nur Bio-, Natur- & vegane Weine</Text>
            <Switch
              value={f.bio}
              onValueChange={f.setBio}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={f.bio ? colors.background : colors.textMuted}
            />
          </View>
        </Section>

        <Section title="Mindestbewertung">
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => f.setBewertungMin(f.bewertungMin === n ? 0 : n)}
                hitSlop={6}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={n <= f.bewertungMin ? 'star' : 'star-outline'}
                  size={32}
                  color={n <= f.bewertungMin ? colors.accent : colors.border}
                  style={{ marginRight: spacing.sm }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.applyText}>
            {filteredCount} {filteredCount === 1 ? 'Wein' : 'Weine'} anzeigen
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  resetText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  resetTextDisabled: { color: colors.textMuted, opacity: 0.5 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#200d14',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: '#2a1820' },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.accent },
  rangeLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rangeValue: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  rangeSeparator: { color: colors.textMuted, fontSize: 13 },
  sliderHint: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#200d14',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  toggleLabel: { color: colors.text, fontSize: 14, flex: 1 },
  stars: { flexDirection: 'row', alignItems: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingBottom: spacing.lg + spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: colors.background,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 15,
  },
});
