import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import { Tier } from '../../content/academy';
import { tierLabel } from '../../content/academy/helpers';
import { PrimaryButton } from './AcademyUI';

/**
 * Ruhiger Freischalt-Moment: goldener Ring blendet ein und weitet sich sanft,
 * das Schloss öffnet sich. Buttons sind sofort bedienbar; bei „Bewegung reduzieren"
 * gibt es nur ein einfaches Einblenden.
 */
export default function UnlockModal({
  tier,
  onOpenTier,
  onClose,
}: {
  tier: Tier | null;
  onOpenTier: (tier: Tier) => void;
  onClose: () => void;
}) {
  const ring = useRef(new Animated.Value(0)).current;
  const lock = useRef(new Animated.Value(0)).current;
  const lockClosedOpacity = useRef(Animated.subtract(1, lock)).current;
  const visible = tier !== null;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    ring.setValue(0);
    lock.setValue(0);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          ring.setValue(1);
          Animated.timing(lock, { toValue: 1, duration: 300, useNativeDriver: true }).start();
          return;
        }
        Animated.parallel([
          Animated.timing(ring, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(lock, {
            toValue: 1,
            duration: 500,
            delay: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    return () => {
      cancelled = true;
    };
  }, [visible, ring, lock]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const lockScale = lock.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {tier && (
          <View style={styles.card} accessibilityViewIsModal>
            <View style={styles.emblem}>
              <Animated.View style={[styles.ring, { opacity: ring, transform: [{ scale: ringScale }] }]} />
              <Animated.View style={[styles.lockClosed, { opacity: lockClosedOpacity }]}>
                <Ionicons name="lock-closed-outline" size={34} color={colors.accentMuted} />
              </Animated.View>
              <Animated.View style={{ opacity: lock, transform: [{ scale: lockScale }] }}>
                <Ionicons name="lock-open-outline" size={34} color={colors.accent} />
              </Animated.View>
            </View>

            <Text style={styles.label} accessibilityRole="header">
              {tierLabel(tier)} freigeschaltet
            </Text>
            <Text style={styles.name}>{tier.name}</Text>
            <View style={styles.divider} />
            <Text style={styles.text}>Eine neue Etappe deiner Weinreise beginnt. Neue Lektionen warten auf dich.</Text>

            <View style={styles.buttons}>
              <PrimaryButton label={`Zu ${tierLabel(tier)}`} onPress={() => onOpenTier(tier)} />
              <PrimaryButton label="Später" variant="ghost" onPress={onClose} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emblem: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  lockClosed: {
    position: 'absolute',
  },
  label: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
  },
  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '300',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.md,
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  buttons: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
