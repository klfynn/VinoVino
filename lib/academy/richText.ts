// Reine Text-Helfer für den RichText-Renderer der Akademie (ohne React).
import type { Block, Segment } from '../../content/academy';

// **fett** (darf *kursiv* enthalten) oder *kursiv* (kein Leerzeichen direkt nach dem Stern,
// damit „5 * 3" nicht als Kursivschrift gilt).
const INLINE_PATTERN = /\*\*(.+?)\*\*|\*([^*\s](?:[^*]*?[^*\s])?)\*/g;

function pushSegment(out: Segment[], t: string, b: boolean, i: boolean) {
  if (!t) return;
  const last = out[out.length - 1];
  if (last && !!last.b === b && !!last.i === i) {
    last.t += t;
    return;
  }
  const segment: Segment = { t };
  if (b) segment.b = true;
  if (i) segment.i = true;
  out.push(segment);
}

function parseInto(out: Segment[], text: string, bold: boolean) {
  let pos = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;
    // Übrig gebliebene, unpaarige „**" werden entfernt, damit sie nie sichtbar sind.
    pushSegment(out, text.slice(pos, start).replace(/\*\*/g, ''), bold, false);
    if (match[1] !== undefined) {
      if (bold) pushSegment(out, match[1], true, false);
      else parseInto(out, match[1], true);
    } else {
      pushSegment(out, match[2], bold, true);
    }
    pos = start + match[0].length;
  }
  pushSegment(out, text.slice(pos).replace(/\*\*/g, ''), bold, false);
}

/**
 * Wandelt einfache Markdown-Markierungen (`**fett**`, `*kursiv*`) in Segmente um.
 * Benachbarte Segmente mit gleicher Formatierung werden zusammengefasst.
 */
export function parseInline(text: string): Segment[] {
  const out: Segment[] = [];
  parseInto(out, text ?? '', false);
  return out;
}

/** Einfacher String → Blöcke: Leerzeilen trennen Absätze. */
export function textToBlocks(text: string): Block[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'p' as const, segments: parseInline(p) }));
}
