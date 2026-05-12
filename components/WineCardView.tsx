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
      <Image source={{ uri: wine.image }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(26,10,15,0.4)', 'rgba(26,10,15,0.97)']}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{wine.rating}/100</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.type}>{wine.type.toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {wine.name}
        </Text>
        <Text style={styles.winery}>{wine.winery}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{wine.vintage}</Text>
          <View style={styles.dot} />
          <Text style={styles.meta} numberOfLines={1}>
            {wine.region}, {wine.country}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>€ {wine.price.toFixed(2)}</Text>
          <Text style={styles.priceLabel}>pro Flasche</Text>
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
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(26,10,15,0.75)',
    borderColor: colors.accent,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  badgeText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  type: {
    color: colors.accent,
    letterSpacing: 3,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  winery: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 4,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.text,
    fontSize: 13,
    opacity: 0.85,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginHorizontal: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.md,
  },
  price: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  priceLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
});
