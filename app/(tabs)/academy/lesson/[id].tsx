import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing } from '../../../../theme';
import { getLektion, lektionLabel } from '../../../../content/academy/helpers';
import { BackButton } from '../../../../components/academy/AcademyUI';

// Platzhalter – die Lektionsansicht (Slides und Quiz) folgt in Teil 2.
export default function LessonPlaceholderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lektion = id ? getLektion(id) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />
      </View>

      {!lektion ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Diese Lektion wurde nicht gefunden.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>{lektionLabel(lektion).toUpperCase()}</Text>
          <Text style={styles.title}>{lektion.titel}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Lernziel</Text>
          <Text style={styles.body}>{lektion.lernziel}</Text>

          <View style={styles.notice}>
            <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
            <Text style={styles.noticeText}>Lektionsinhalt folgt in Teil 2</Text>
          </View>
        </ScrollView>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  label: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '300',
    fontStyle: 'italic',
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.lg,
  },
  sectionLabel: {
    color: colors.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
