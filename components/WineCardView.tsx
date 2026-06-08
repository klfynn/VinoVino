import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Wine } from '../types';
import { colors, radii, spacing } from '../theme';

interface Props {
  wine: Wine;
}

export function WineCardView({ wine }: Props) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: wine.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* Top gradient: protects logo, filter and cart icons */}
      <LinearGradient
        colors={['rgba(26,10,15,0.72)', 'rgba(26,10,15,0.30)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Bottom gradient: protects wine name, winery, price and tags */}
      <LinearGradient
        colors={['transparent', 'rgba(26,10,15,0.35)', 'rgba(26,10,15,0.82)', '#1a0a0f']}
        locations={[0, 0.28, 0.62, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
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
    backgroundColor: 'rgba(201, 169, 110, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.5)',
  },
  pillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  name: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  winery: {
    color: colors.accent,
    fontSize: 14,
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
