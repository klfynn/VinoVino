// Reine Quiz- und Ergebnislogik der Lektionsansicht (ohne Nebenwirkungen).
import { TIERS, QuizFrage, Tier } from '../../content/academy';
import { isTierUnlocked } from './unlock';

export type QuizErgebnis = { richtig: number; gesamt: number };

/** Zählt richtige Antworten. `antworten[i]` ist der gewählte Options-Index oder `null`. */
export function scoreQuiz(fragen: QuizFrage[], antworten: (number | null | undefined)[]): QuizErgebnis {
  const richtig = fragen.reduce((sum, frage, i) => (antworten[i] === frage.richtig ? sum + 1 : sum), 0);
  return { richtig, gesamt: fragen.length };
}

/** Kurzer, freundlicher Text zum Ergebnis – ohne Beschämen, ohne Sperre. */
export function ergebnisText({ richtig, gesamt }: QuizErgebnis): string {
  if (gesamt > 0 && richtig === gesamt) return 'Ausgezeichnet!';
  if (gesamt > 0 && richtig / gesamt >= 0.6) return 'Gut gemacht.';
  return 'Dran bleiben, du kannst die Lektion jederzeit wiederholen.';
}

/** Tiers, die vorher gesperrt waren und mit den neuen abgeschlossenen Lektionen frei sind. */
export function newlyUnlockedTiers(before: Set<string>, after: Set<string>, tiers: Tier[] = TIERS): Tier[] {
  return tiers.filter((t) => !isTierUnlocked(t, before, tiers) && isTierUnlocked(t, after, tiers));
}
