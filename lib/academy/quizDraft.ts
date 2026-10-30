// Reine Logik für den lokalen Quiz-Zwischenstand (ohne Nebenwirkungen).
import { QuizFrage } from '../../content/academy';

/**
 * Zwischenstand eines laufenden Quiz. `answers` hat genau eine Stelle je Frage:
 * gewählter Options-Index oder `null` (noch nicht beantwortet).
 */
export type QuizDraft = {
  lessonId: string;
  answers: (number | null)[];
  savedAt: number;
};

export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function draftKey(userId: string | null | undefined, lessonId: string): string {
  return `academy_quiz_draft_v1:${userId || 'anon'}:${lessonId}`;
}

export function serializeDraft(draft: QuizDraft): string {
  return JSON.stringify({ lessonId: draft.lessonId, answers: draft.answers, savedAt: draft.savedAt });
}

/** Liest den gespeicherten Text ein. Kaputtes JSON oder falsche Struktur ergeben `null`. */
export function parseDraft(raw: string | null | undefined): QuizDraft | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { lessonId, answers, savedAt } = data as Record<string, unknown>;
  if (typeof lessonId !== 'string' || !Array.isArray(answers) || typeof savedAt !== 'number') return null;
  if (!answers.every((a) => a === null || typeof a === 'number')) return null;
  return { lessonId, answers: answers as (number | null)[], savedAt };
}

/**
 * Ein Entwurf ist gültig, wenn er zur Lektion gehört, höchstens 7 Tage alt ist,
 * genau eine Stelle je Quizfrage hat, jede Antwort ein gültiger Options-Index ist
 * und die beantworteten Fragen lückenlos von vorne kommen (mindestens eine).
 */
export function isDraftValid(
  draft: QuizDraft | null,
  lessonId: string,
  fragen: QuizFrage[],
  now: number = Date.now(),
): draft is QuizDraft {
  if (!draft || draft.lessonId !== lessonId) return false;
  if (!Number.isFinite(draft.savedAt) || draft.savedAt > now || now - draft.savedAt > DRAFT_MAX_AGE_MS) return false;
  if (draft.answers.length !== fragen.length) return false;
  const valid = draft.answers.every(
    (a, i) => a === null || (Number.isInteger(a) && a >= 0 && a < fragen[i].optionen.length),
  );
  if (!valid) return false;
  const answered = answeredCount(draft.answers);
  return answered > 0 && draft.answers.slice(answered).every((a) => a === null);
}

/** Anzahl der von vorne lückenlos beantworteten Fragen. */
export function answeredCount(answers: (number | null)[]): number {
  const firstOpen = answers.findIndex((a) => a === null);
  return firstOpen === -1 ? answers.length : firstOpen;
}

/** Index der Frage, mit der fortgesetzt wird: erste unbeantwortete, sonst die letzte. */
export function resumeIndex(answers: (number | null)[]): number {
  return Math.min(answeredCount(answers), Math.max(0, answers.length - 1));
}
