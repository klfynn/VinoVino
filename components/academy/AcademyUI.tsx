import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';

export function ProgressBar({ done, total, style }: { done: number; total: number; style?: ViewStyle }) {
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={[styles.track, style]}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Schließen"
      hitSlop={8}
    >
      <Ionicons name="close" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="small" color={colors.accent} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={36} color={colors.accentMuted} />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 10, 15, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
