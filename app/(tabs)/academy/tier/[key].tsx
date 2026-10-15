import React, { useCallback, useRef } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../../../theme';
import { Lektion } from '../../../../content/academy';
import { getTier, lektionLabel, tierLabel } from '../../../../content/academy/helpers';
import { isTierUnlocked, tierProgress } from '../../../../lib/academy/unlock';
import { useAcademyProgress } from '../../../../lib/academy/useAcademyProgress';
import { BackButton, ErrorState, LoadingState, ProgressBar } from '../../../../components/academy/AcademyUI';

function LessonRow({
  lektion,
  completed,
  disabled,
  onPress,
}: {
  lektion: Lektion;
  completed: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${lektionLabel(lektion)}: ${lektion.titel}${completed ? ', abgeschlossen' : ''}`}
    >
      <View style={styles.rowText}>
        <View style={styles.rowMeta}>
          <Text style={styles.rowNumber}>{lektionLabel(lektion).toUpperCase()}</Text>
          {lektion.optional && (
            <View style={styles.optionalTag}>
              <Text style={styles.optionalText}>freiwillig</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowTitle}>{lektion.titel}</Text>
      </View>
      {completed ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.like} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.accentMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function TierDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const tier = key ? getTier(key) : undefined;
  const { completedIds, loading, error, refresh } = useAcademyProgress();

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  if (!tier) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <BackButton onPress={() => router.back()} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Dieses Tier wurde nicht gefunden.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unlocked = isTierUnlocked(tier, completedIds);
  const { done, total } = tierProgress(tier, completedIds);

  const header = (
    <View style={styles.header}>
      <Text style={styles.tierLabel}>{tierLabel(tier).toUpperCase()}</Text>
      <Text style={styles.tierName}>{tier.name}</Text>
      <Text style={styles.tierDesc}>{tier.beschreibung}</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {done} von {total} Lektionen abgeschlossen
        </Text>
      </View>
      <ProgressBar done={done} total={total} />
      {!unlocked && (
        <View style={styles.lockedNotice}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.accent} />
          <Text style={styles.lockedText}>
            Schließe zuerst alle Pflichtlektionen von Tier {(tier.tier ?? 1) - 1} ab
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={tier.lektionen}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <LessonRow
              lektion={item}
              completed={completedIds.has(item.id)}
              disabled={!unlocked}
              onPress={() => router.push({ pathname: '/academy/lesson/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  tierLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  tierName: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '300',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  tierDesc: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  progressRow: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  progressText: {
    color: colors.text,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
  },
  lockedText: {
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowText: {
    flex: 1,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowNumber: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  optionalTag: {
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  optionalText: {
    color: colors.accentMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
