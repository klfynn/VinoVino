import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import { PrimaryButton } from './AcademyUI';

export const FREEZE_COLOR = '#b8d8e8';

function tage(n: number): string {
  return `${n} ${n === 1 ? 'Tag' : 'Tage'}`;
}

/** Detailansicht zur Flamme: aktueller und längster Streak, Freeze-Status, Regel. */
export default function StreakModal({
  visible,
  currentStreak,
  longestStreak,
  freezeAvailable,
  onClose,
}: {
  visible: boolean;
  currentStreak: number | null;
  longestStreak: number | null;
  freezeAvailable: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const unavailable = currentStreak === null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Schließen" />
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <Text style={styles.label} accessibilityRole="header">
            Dein Streak
          </Text>

          <View
            style={styles.current}
            accessible
            accessibilityLabel={unavailable ? 'Aktueller Streak nicht verfügbar' : `Aktueller Streak: ${tage(currentStreak)}`}
          >
            <Ionicons name="flame" size={40} color={colors.accent} style={unavailable && styles.dimmed} />
            <Text style={styles.currentNumber}>{unavailable ? '–' : currentStreak}</Text>
          </View>
          <Text style={styles.currentCaption}>
            {unavailable ? 'Streak gerade nicht verfügbar' : currentStreak === 1 ? 'Tag in Folge' : 'Tage in Folge'}
          </Text>

          <View style={styles.rows}>
            <View style={styles.row}>
              <Ionicons name="trophy-outline" size={18} color={colors.accent} />
              <Text style={styles.rowLabel}>Längster Streak</Text>
              <Text style={styles.rowValue}>{longestStreak === null ? '–' : tage(longestStreak)}</Text>
            </View>

            <View style={[styles.row, styles.rowTop]}>
              <Ionicons
                name="snow-outline"
                size={18}
                color={freezeAvailable ? FREEZE_COLOR : colors.textMuted}
                style={styles.rowIcon}
              />
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, freezeAvailable && { color: FREEZE_COLOR }]}>
                  {freezeAvailable ? 'Freeze verfügbar' : 'Kein Freeze verfügbar'}
                </Text>
                <Text style={styles.rowText}>
                  Du erhältst automatisch jede Woche einen Freeze. Er rettet deinen Streak, wenn du genau einen Tag
                  verpasst.
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.rule}>Ein Tag zählt, sobald du die Akademie öffnest.</Text>

          <PrimaryButton label="Schließen" variant="outline" onPress={onClose} style={styles.close} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  currentNumber: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '300',
  },
  currentCaption: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.4,
  },
  rows: {
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTop: {
    alignItems: 'flex-start',
  },
  rowIcon: {
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowValue: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  rowText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  rule: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  close: {
    marginTop: spacing.lg,
  },
});
