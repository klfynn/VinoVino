import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useFilter,
  Weinart,
  Geschmack,
  Anlass,
} from '../context/FilterContext';
import { colors, radii, spacing } from '../theme';

// ── Simple custom slider using the touch responder system ─────────────────────

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
}

function SimpleSlider({ value, min, max, step = 1, onValueChange }: SliderProps) {
  const trackRef = React.useRef<View>(null);
  const metrics = React.useRef({ width: 1, pageX: 0 });

  const pct = (value - min) / (max - min);

  const update = (pageX: number) => {
    const { width, pageX: trackPageX } = metrics.current;
    const x = pageX - trackPageX;
    const ratio = Math.min(Math.max(x / width, 0), 1);
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onValueChange(Math.min(max, Math.max(min, stepped)));
  };

  // Thumb x: proportional to value, clamped so thumb stays fully in track
  const thumbSize = 22;
  const thumbX = (tw: number) => Math.max(0, Math.min(pct * (tw - thumbSize), tw - thumbSize));

  return (
    <View
      ref={trackRef}
      style={sliderStyles.container}
      onLayout={() => {
        trackRef.current?.measure((_x, _y, w, _h, px) => {
          metrics.current = { width: w, pageX: px };
        });
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => update(e.nativeEvent.pageX)}
      onResponderMove={(e) => update(e.nativeEvent.pageX)}
    >
      {/* Background track */}
      <View style={sliderStyles.track}>
        <View style={[sliderStyles.fill, { width: `${pct * 100}%` as any }]} />
      </View>
      {/* Thumb — position computed once layout is known; falls back to percentage */}
      <View
        style={[
          sliderStyles.thumb,
          { left: `${pct * 100}%` as any, transform: [{ translateX: -thumbSize / 2 }] },
        ]}
      />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { height: 36, justifyContent: 'center', marginBottom: spacing.sm },
  track: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    top: 7,
    elevation: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

// ── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[chipStyles.chip, active && chipStyles.active]}
      activeOpacity={0.7}
    >
      <Text style={[chipStyles.label, active && chipStyles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(201,169,110,0.15)',
  },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  labelActive: { color: colors.accent, fontWeight: '700' },
});

// ── Section title ─────────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return <Text style={sectionStyle.title}>{title}</Text>;
}

const sectionStyle = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

// ── Filter Screen ─────────────────────────────────────────────────────────────

const WEINARTEN: Weinart[] = ['Rot', 'Weiß', 'Rosé', 'Schaumwein', 'Port'];
const GESCHMAECKER: Geschmack[] = ['Trocken', 'Halbtrocken', 'Lieblich'];
const HERKUENFTE = ['Frankreich', 'Italien', 'Spanien', 'Deutschland', 'Österreich', 'Neue Welt'];
const ANLAESSE: [Anlass, string][] = [
  ['Dinner', '🍽️'],
  ['Geschenk', '🎁'],
  ['Party', '🎉'],
  ['Apéritif', '🥂'],
  ['Zum Kochen', '🍳'],
];

export default function FilterScreen() {
  const router = useRouter();
  const {
    weinart,
    geschmack,
    herkunft,
    jahrgang,
    preis,
    anlass,
    bio,
    bewertungMin,
    setFilter,
    resetFilters,
    activeFilterCount,
  } = useFilter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Filter</Text>
        <TouchableOpacity onPress={resetFilters} disabled={activeFilterCount === 0}>
          <Text style={[styles.reset, activeFilterCount === 0 && styles.resetDisabled]}>
            Zurücksetzen
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Weinart */}
        <Section title="Weinart" />
        <View style={styles.chips}>
          {WEINARTEN.map((w) => (
            <Chip
              key={w}
              label={w}
              active={weinart.includes(w)}
              onPress={() => setFilter('weinart', toggle(weinart, w))}
            />
          ))}
        </View>

        {/* Geschmack */}
        <Section title="Geschmack" />
        <View style={styles.chips}>
          {GESCHMAECKER.map((g) => (
            <Chip
              key={g}
              label={g}
              active={geschmack.includes(g)}
              onPress={() => setFilter('geschmack', toggle(geschmack, g))}
            />
          ))}
        </View>

        {/* Preis */}
        <Section title="Preis" />
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>Min: {preis.min} €</Text>
          <Text style={styles.rangeLabel}>Max: {preis.max} €</Text>
        </View>
        <SimpleSlider
          value={preis.min}
          min={5}
          max={preis.max - 5}
          step={5}
          onValueChange={(v) => setFilter('preis', { ...preis, min: v })}
        />
        <SimpleSlider
          value={preis.max}
          min={preis.min + 5}
          max={500}
          step={5}
          onValueChange={(v) => setFilter('preis', { ...preis, max: v })}
        />

        {/* Jahrgang */}
        <Section title="Jahrgang" />
        <View style={styles.rangeRow}>
          <Text style={styles.rangeLabel}>Von: {jahrgang.min}</Text>
          <Text style={styles.rangeLabel}>Bis: {jahrgang.max}</Text>
        </View>
        <SimpleSlider
          value={jahrgang.min}
          min={1990}
          max={jahrgang.max - 1}
          step={1}
          onValueChange={(v) => setFilter('jahrgang', { ...jahrgang, min: v })}
        />
        <SimpleSlider
          value={jahrgang.max}
          min={jahrgang.min + 1}
          max={2024}
          step={1}
          onValueChange={(v) => setFilter('jahrgang', { ...jahrgang, max: v })}
        />

        {/* Herkunft */}
        <Section title="Herkunft" />
        <View style={styles.chips}>
          {HERKUENFTE.map((h) => (
            <Chip
              key={h}
              label={h}
              active={herkunft.includes(h)}
              onPress={() => setFilter('herkunft', toggle(herkunft, h))}
            />
          ))}
        </View>

        {/* Anlass */}
        <Section title="Anlass" />
        <View style={styles.chips}>
          {ANLAESSE.map(([a, emoji]) => (
            <Chip
              key={a}
              label={`${emoji} ${a}`}
              active={anlass.includes(a)}
              onPress={() => setFilter('anlass', toggle(anlass, a))}
            />
          ))}
        </View>

        {/* Bio / Natur / Vegan */}
        <Section title="Bio / Natur / Vegan" />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Nur Bio-Weine anzeigen</Text>
          {/* TODO: filter against wine.bio field once API supports it */}
          <Switch
            value={bio}
            onValueChange={(v) => setFilter('bio', v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={bio ? colors.background : colors.textMuted}
          />
        </View>

        {/* Mindestbewertung */}
        <Section title="Mindestbewertung" />
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setFilter('bewertungMin', star)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons
                name={star <= bewertungMin ? 'star' : 'star-outline'}
                size={34}
                color={colors.accent}
                style={{ marginRight: spacing.sm }}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.applyText}>Weine anzeigen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: 1.5 },
  reset: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  resetDisabled: { color: colors.border },

  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.lg },

  chips: { flexDirection: 'row', flexWrap: 'wrap' },

  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  rangeLabel: { color: colors.textMuted, fontSize: 13 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: { color: colors.text, fontSize: 14, flex: 1 },

  stars: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  applyBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
