import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

export default function RecipesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Ionicons name="restaurant-outline" size={64} color={colors.accent} />
        <Text style={styles.title}>Rezepte</Text>
        <Text style={styles.sub}>coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  title: { color: colors.accent, fontSize: 28, fontWeight: '700', letterSpacing: 2, marginTop: spacing.md },
  sub: { color: colors.textMuted, fontSize: 16, marginTop: spacing.sm, fontStyle: 'italic' },
});
