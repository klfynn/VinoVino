// Reine Logik für den lokalen Zwischenstand eines Verkostungsbogens (ohne Nebenwirkungen).
// Gespeichert wird in AsyncStorage über den Hook `useTastingDraft`.
import { isValidTastingData, sanitizeTastingData } from './validate';
import { TASTING_LEVELS, TASTING_STEPS, TastingData, TastingLevel, TastingStep } from './types';

/** Zwischenstand eines laufenden Bogens für genau einen Wein. */
export type TastingDraft = {
  wineId: string;
  level: TastingLevel;
  /** Schritt, bei dem fortgesetzt wird */
  step?: TastingStep;
  purchasedWineId?: string | null;
  lessonId?: string | null;
  focus?: TastingStep | null;
  data: TastingData;
  savedAt: number;
};

export const TASTING_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function tastingDraftKey(userId: string | null | undefined, wineId: string): string {
  return `tasting_draft_v1:${userId || 'anon'}:${wineId}`;
}

export function serializeDraft(draft: TastingDraft): string {
  return JSON.stringify({
    wineId: draft.wineId,
    level: draft.level,
    step: draft.step,
    purchasedWineId: draft.purchasedWineId ?? null,
    lessonId: draft.lessonId ?? null,
    focus: draft.focus ?? null,
    data: sanitizeTastingData(draft.data),
    savedAt: draft.savedAt,
  });
}

const isOneOf = <T extends string>(werte: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (werte as readonly string[]).includes(v);
const optionalString = (v: unknown) => v === undefined || v === null || typeof v === 'string';

/**
 * Liest den gespeicherten Text ein. Kaputtes JSON oder eine falsche Grundstruktur ergeben `null`.
 * `data` wird dabei nicht verändert; ob es gültig ist, entscheidet `isDraftValid`.
 */
export function parseDraft(raw: string | null | undefined): TastingDraft | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.wineId !== 'string' || !o.wineId) return null;
  if (!isOneOf(TASTING_LEVELS, o.level)) return null;
  if (typeof o.savedAt !== 'number') return null;
  if (typeof o.data !== 'object' || o.data === null || Array.isArray(o.data)) return null;
  if (o.step !== undefined && o.step !== null && !isOneOf(TASTING_STEPS, o.step)) return null;
  if (o.focus !== undefined && o.focus !== null && !isOneOf(TASTING_STEPS, o.focus)) return null;
  if (!optionalString(o.purchasedWineId) || !optionalString(o.lessonId)) return null;
  return {
    wineId: o.wineId,
    level: o.level,
    step: (o.step ?? undefined) as TastingStep | undefined,
    purchasedWineId: (o.purchasedWineId ?? null) as string | null,
    lessonId: (o.lessonId ?? null) as string | null,
    focus: (o.focus ?? null) as TastingStep | null,
    data: o.data as TastingData,
    savedAt: o.savedAt,
  };
}

/**
 * Ein Entwurf ist gültig, wenn er zum Wein gehört, höchstens 7 Tage alt ist,
 * nicht aus der Zukunft stammt und sein Bogen die Prüfung `isValidTastingData` besteht.
 */
export function isDraftValid(
  draft: TastingDraft | null,
  wineId: string,
  now: number = Date.now(),
): draft is TastingDraft {
  if (!draft || draft.wineId !== wineId) return false;
  if (!Number.isFinite(draft.savedAt) || draft.savedAt > now || now - draft.savedAt > TASTING_DRAFT_MAX_AGE_MS) {
    return false;
  }
  if (!isOneOf(TASTING_LEVELS, draft.level)) return false;
  return isValidTastingData(draft.data);
}
