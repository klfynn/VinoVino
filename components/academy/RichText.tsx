import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import type { Block, Segment } from '../../content/academy';
import { parseInline, textToBlocks } from '../../lib/academy/richText';

/** Segmente als verschachtelter Text: fett in Gold, kursiv bleibt kursiv. */
export function InlineText({
  segments,
  text,
  style,
  numberOfLines,
}: {
  segments?: Segment[];
  text?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const parts = useMemo(() => segments ?? parseInline(text ?? ''), [segments, text]);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((s, i) => (
        <Text key={i} style={[s.b && styles.bold, s.i && styles.italic]}>
          {s.t}
        </Text>
      ))}
    </Text>
  );
}

type Variant = 'body' | 'small';

/**
 * Absätze und Aufzählungen (mit goldenem Punkt).
 * Entweder fertige `blocks` (Slides) oder ein einfacher `text` mit `**fett**`/`*kursiv*`.
 */
export default function RichText({
  blocks,
  text,
  variant = 'body',
  style,
}: {
  blocks?: Block[];
  text?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}) {
  const content = useMemo(() => blocks ?? textToBlocks(text ?? ''), [blocks, text]);
  const textStyle = variant === 'small' ? styles.small : styles.body;
  const dotStyle = variant === 'small' ? styles.dotSmall : styles.dot;

  return (
    <View style={style}>
      {content.map((block, i) => (
        <View key={i} style={i > 0 && styles.blockGap}>
          {block.type === 'p' ? (
            <InlineText segments={block.segments} style={textStyle} />
          ) : (
            block.items.map((item, j) => (
              <View key={j} style={[styles.listItem, j > 0 && styles.listGap]}>
                <View style={dotStyle} />
                <InlineText segments={item} style={[textStyle, styles.listText]} />
              </View>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 25,
  },
  small: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  bold: {
    color: colors.accent,
    fontWeight: '600',
  },
  italic: {
    fontStyle: 'italic',
  },
  blockGap: {
    marginTop: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listGap: {
    marginTop: spacing.sm,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 10,
    marginRight: spacing.sm + 4,
  },
  dotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 8.5,
    marginRight: spacing.sm + 2,
  },
  listText: {
    flex: 1,
  },
});
