import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wine } from '../types';
import { colors, radii, spacing } from '../theme';

interface Props {
  wine: Wine;
  onPress?: () => void;
}

export function WineCardView({ wine, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image source={{ uri: wine.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      <LinearGradient
        colors={['transparent', 'rgba(26,10,15,0.25)', 'rgba(26,10,15,0.96)']}
        locations={[0.45, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.tasteRow}>
          {wine.taste.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.pill}>
              <Text style={styles.pillText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {wine.name}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.winery} numberOfLines={1}>
            {wine.winery}
          </Text>
          <Text style={styles.price}>€ {wine.price.toFixed(2)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  tasteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.45)',
  },
  pillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 35,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  winery: {
    color: colors.accent,
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
    marginRight: spacing.sm,
  },
  price: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
});
