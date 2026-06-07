import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { useTutorial } from '../../context/TutorialContext';
import { colors, radii, spacing } from '../../theme';

const { width: SW, height: SH } = Dimensions.get('window');

interface HoleRect {
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
}

interface CoachMarkDef {
  hole: HoleRect;
  title: string;
  text: string;
  tooltipBelow: boolean;
}

const TAB_H = 84;
const TAB_W = SW / 4;
const HEADER_TOP = 50;

const COACH_MARKS: CoachMarkDef[] = [
  {
    hole: { x: SW * 0.05, y: SH * 0.17, w: SW * 0.9, h: SH * 0.52, radius: 16 },
    title: 'Weine entdecken',
    text: 'Wische die Karte um Weine zu entdecken',
    tooltipBelow: false,
  },
  {
    hole: { x: SW - 68, y: HEADER_TOP + 36, w: 48, h: 48, radius: 24 },
    title: 'Nach Geschmack filtern',
    text: 'Hier kannst du nach deinem Geschmack filtern',
    tooltipBelow: true,
  },
  {
    hole: { x: 0, y: SH - TAB_H, w: TAB_W, h: TAB_H, radius: 0 },
    title: 'Weinetikett scannen',
    text: 'Scanne ein Weinetikett für sofortige Infos',
    tooltipBelow: false,
  },
  {
    hole: { x: TAB_W * 2, y: SH - TAB_H, w: TAB_W, h: TAB_H, radius: 0 },
    title: 'Deine Sammlung',
    text: 'Deine Merkliste und dein Weinkeller',
    tooltipBelow: false,
  },
  {
    hole: { x: TAB_W * 3, y: SH - TAB_H, w: TAB_W, h: TAB_H, radius: 0 },
    title: 'Warenkorb',
    text: 'Hier findest du deine ausgewählten Weine',
    tooltipBelow: false,
  },
];

export default function CoachMarkOverlay() {
  const { coachMarkStep, nextCoachMark, finishCoachMarks } = useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevStep = useRef<number | null>(null);

  useEffect(() => {
    if (coachMarkStep !== null) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
    prevStep.current = coachMarkStep;
  }, [coachMarkStep, fadeAnim]);

  if (coachMarkStep === null) return null;

  const mark = COACH_MARKS[coachMarkStep];
  if (!mark) return null;

  const { hole, title, text, tooltipBelow } = mark;
  const isLast = coachMarkStep === COACH_MARKS.length - 1;

  const tooltipTop = tooltipBelow ? hole.y + hole.h + 12 : hole.y - 140;
  const clampedTooltipTop = Math.max(8, Math.min(tooltipTop, SH - 160));

  const handleNext = () => {
    if (isLast) {
      finishCoachMarks();
    } else {
      nextCoachMark();
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Top strip */}
      <View
        style={[styles.darkStrip, { top: 0, left: 0, right: 0, height: hole.y }]}
        pointerEvents="auto"
      />
      {/* Left strip */}
      <View
        style={[styles.darkStrip, { top: hole.y, left: 0, width: hole.x, height: hole.h }]}
        pointerEvents="auto"
      />
      {/* Right strip */}
      <View
        style={[styles.darkStrip, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]}
        pointerEvents="auto"
      />
      {/* Bottom strip */}
      <View
        style={[styles.darkStrip, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]}
        pointerEvents="auto"
      />

      {/* Hole highlight border */}
      <View
        pointerEvents="none"
        style={[
          styles.holeBorder,
          {
            top: hole.y - 2,
            left: hole.x - 2,
            width: hole.w + 4,
            height: hole.h + 4,
            borderRadius: (hole.radius ?? 0) + 2,
          },
        ]}
      />

      {/* Tooltip */}
      <View
        pointerEvents="auto"
        style={[styles.tooltip, { top: clampedTooltipTop, left: spacing.lg, right: spacing.lg }]}
      >
        {/* Step indicator */}
        <Text style={styles.stepIndicator}>{coachMarkStep + 1} / {COACH_MARKS.length}</Text>
        <Text style={styles.tooltipTitle}>{title}</Text>
        <Text style={styles.tooltipText}>{text}</Text>
        <TouchableOpacity style={styles.tooltipBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.tooltipBtnText}>{isLast ? 'Fertig' : 'Weiter'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
  },
  darkStrip: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  holeBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  stepIndicator: {
    color: colors.accentMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tooltipTitle: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  tooltipText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tooltipBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  tooltipBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
