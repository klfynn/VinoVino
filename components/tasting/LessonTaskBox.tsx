// Einklappbarer Kasten „Aufgabe aus Lektion …“ oben im Assistenten (Teil C).
// Zeigt die Praxisaufgabe aus dem Lektions-JSON (nur gelesen) und den Link „Lektion öffnen“.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme';
import RichText from '../academy/RichText';
import { TOUCH } from './TastingUI';

export function LessonTaskBox({
  label,
  praxisaufgabe,
  onOpenLesson,
}: {
  /** „Lektion 3“ bzw. „Bonus 1“ */
  label: string;
  praxisaufgabe: string;
  onOpenLesson: () => void;
}) {
  const [open, setOpen] = useState(true);
  const rotation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotation, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [open, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.box}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Aufgabe aus ${label}, ${open ? 'zuklappen' : 'aufklappen'}`}
      >
        <Ionicons name="school-outline" size={18} color={colors.accent} />
        <Text style={styles.title}>Aufgabe aus {label}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.accent} />
        </Animated.View>
      </TouchableOpacity>
      {open && (
        <View style={styles.body}>
          <RichText text={praxisaufgabe} variant="small" />
          <TouchableOpacity
            style={styles.link}
            onPress={onOpenLesson}
            activeOpacity={0.8}
            accessibilityRole="link"
            accessibilityLabel={`${label} öffnen`}
          >
            <Text style={styles.linkText}>Lektion öffnen</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH,
    paddingHorizontal: spacing.md,
  },
  title: { flex: 1, color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: TOUCH,
    minWidth: TOUCH,
  },
  linkText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
