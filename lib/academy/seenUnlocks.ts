// Merker, für welche Tiers der Freischalt-Moment schon gezeigt wurde.
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * `overlay`: Tiers, für die die Überlagerung nach dem Freischalten gezeigt wurde.
 * `pulse`:   Tiers, deren Karte auf der Startseite danach einmal pulsiert hat.
 */
export type SeenUnlocks = { overlay: string[]; pulse: string[] };

const EMPTY: SeenUnlocks = { overlay: [], pulse: [] };

export function seenUnlocksKey(userId: string | null | undefined): string {
  return `academy_seen_unlocks_v1:${userId || 'anon'}`;
}

export function parseSeenUnlocks(raw: string | null | undefined): SeenUnlocks {
  if (!raw) return EMPTY;
  try {
    const d = JSON.parse(raw) as Record<string, unknown> | null;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return d && typeof d === 'object' ? { overlay: list(d.overlay), pulse: list(d.pulse) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Liest den Merker. Bei Fehlern gilt: noch nichts gesehen. */
export async function loadSeenUnlocks(userId: string | null | undefined): Promise<SeenUnlocks> {
  try {
    return parseSeenUnlocks(await AsyncStorage.getItem(seenUnlocksKey(userId)));
  } catch (err) {
    console.warn('[VinoVino] Freischalt-Merker konnte nicht gelesen werden:', err);
    return EMPTY;
  }
}

/** Ergänzt Tier-Keys in einer Liste des Merkers. Fehler werden still ignoriert. */
export async function markUnlocksSeen(
  userId: string | null | undefined,
  kind: keyof SeenUnlocks,
  tierKeys: string[],
): Promise<void> {
  if (tierKeys.length === 0) return;
  try {
    const key = seenUnlocksKey(userId);
    const current = parseSeenUnlocks(await AsyncStorage.getItem(key));
    const next = { ...current, [kind]: Array.from(new Set([...current[kind], ...tierKeys])) };
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch (err) {
    console.warn('[VinoVino] Freischalt-Merker konnte nicht gespeichert werden:', err);
  }
}
