// Reine Logik für Streak-Hinweise: Vergleich des neuen Stands mit dem lokal gemerkten.

export type StreakSnapshot = {
  current_streak: number;
  longest_streak: number;
  last_active_date: string; // YYYY-MM-DD (Kalendertag, Europe/Berlin laut academy_touch)
};

export type StreakEvent = 'freeze_used' | 'reset' | 'record';

export function streakSnapshotKey(userId: string): string {
  return `academy_streak_snapshot_v1:${userId}`;
}

/** Kalendertag als UTC-Mitternacht in ms; nur das Datum zählt, nicht die Uhrzeit. */
function dayNumber(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

/** Abstand in Kalendertagen von `from` nach `to`, `null` bei ungültigem Datum. */
export function daysBetween(from: string, to: string): number | null {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === null || b === null ? null : Math.round(b - a);
}

export function detectStreakEvent(prev: StreakSnapshot | null, next: StreakSnapshot): StreakEvent | null {
  if (!prev) return null;
  const gap = daysBetween(prev.last_active_date, next.last_active_date);
  if (gap === null || gap <= 0) return null;
  if (gap === 2 && next.current_streak === prev.current_streak + 1) return 'freeze_used';
  if (gap > 2 && prev.current_streak > 1 && next.current_streak === 1) return 'reset';
  if (next.current_streak === next.longest_streak && next.longest_streak > prev.longest_streak) return 'record';
  return null;
}

export function streakEventText(event: StreakEvent, next: StreakSnapshot): string {
  switch (event) {
    case 'freeze_used':
      return 'Dein Freeze hat deinen Streak gerettet.';
    case 'reset':
      return 'Dein Streak wurde zurückgesetzt. Heute startest du neu.';
    case 'record':
      return `Neuer Rekord: ${next.current_streak} ${next.current_streak === 1 ? 'Tag' : 'Tage'}!`;
  }
}

export function serializeSnapshot(s: StreakSnapshot): string {
  return JSON.stringify({
    current_streak: s.current_streak,
    longest_streak: s.longest_streak,
    last_active_date: s.last_active_date,
  });
}

export function parseSnapshot(raw: string | null | undefined): StreakSnapshot | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Record<string, unknown> | null;
    if (
      d &&
      typeof d.current_streak === 'number' &&
      typeof d.longest_streak === 'number' &&
      typeof d.last_active_date === 'string' &&
      dayNumber(d.last_active_date) !== null
    ) {
      return {
        current_streak: d.current_streak,
        longest_streak: d.longest_streak,
        last_active_date: d.last_active_date,
      };
    }
  } catch {
    // kaputtes JSON → wie kein Vorstand
  }
  return null;
}
