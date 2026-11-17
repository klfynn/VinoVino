// Reine Logik für den lokalen Zwischenstand eines Verkostungsbogens (ohne Nebenwirkungen).
// Gespeichert wird in AsyncStorage über den Hook `useTastingDraft`.
import { isValidTastingData, sanitizeTastingData } from './validate';
import { isWineRef, sameWineRef, wineRefKey } from './wineRef';
import { TASTING_LEVELS, TASTING_STEPS, TastingData, TastingLevel, TastingStep, WineRef } from './types';

/** Zwischenstand eines laufenden Bogens für genau einen Wein (Marktplatz- oder eigener Wein). */
export type TastingDraft = {
  ref: WineRef;
  level: TastingLevel;
  /** Schritt, bei dem fortgesetzt wird (im Blind-Modus auch „tipp“) */
  step?: TastingStep | 'tipp';
  /** Blindverkostung (Teil D1); fehlt bei älteren Entwürfen und bedeutet dann `false` */
  blind?: boolean;
  purchasedWineId?: string | null;
  lessonId?: string | null;
  focus?: TastingStep | null;
  data: TastingData;
  savedAt: number;
};

export const TASTING_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Schlüssel in AsyncStorage: `tasting_draft_v1:<userId|anon>:<kind>:<id>`.
 * Entwürfe nach dem alten Schema (`tasting_draft_v1:<userId|anon>:<wineId>`) werden nicht mehr
 * gelesen; es gab noch keine Oberfläche, die welche erzeugt hätte.
 */
export function tastingDraftKey(userId: string | null | undefined, ref: WineRef, blind = false): string {
  return blind ? `${blindDraftPrefix(userId)}${wineRefKey(ref)}` : `tasting_draft_v1:${userId || 'anon'}:${wineRefKey(ref)}`;
}

/**
 * Blindverkostungen haben einen eigenen Schlüssel (`tasting_draft_v1:<userId|anon>:blind:<kind>:<id>`),
 * damit ein normaler Entwurf desselben Weins nie mit einer Blindverkostung vermischt wird und die
 * Weinauswahl angefangene Blindverkostungen finden kann, ohne Namen zu zeigen.
 */
export function blindDraftPrefix(userId: string | null | undefined): string {
  return `tasting_draft_v1:${userId || 'anon'}:blind:`;
}

export function serializeDraft(draft: TastingDraft): string {
  return JSON.stringify({
    ref: { kind: draft.ref.kind, id: draft.ref.id },
    level: draft.level,
    step: draft.step,
    purchasedWineId: draft.purchasedWineId ?? null,
    lessonId: draft.lessonId ?? null,
    focus: draft.focus ?? null,
    // Nur bei Blindverkostungen gesetzt; normale Entwürfe bleiben wie bisher.
    ...(draft.blind === true ? { blind: true } : {}),
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
  // Alte Entwürfe hatten statt `ref` ein `wineId` und werden hier bewusst verworfen.
  if (!isWineRef(o.ref)) return null;
  if (!isOneOf(TASTING_LEVELS, o.level)) return null;
  if (typeof o.savedAt !== 'number') return null;
  if (typeof o.data !== 'object' || o.data === null || Array.isArray(o.data)) return null;
  const blind = o.blind === true;
  // „tipp“ gibt es nur im Blind-Modus.
  if (o.step !== undefined && o.step !== null && !isOneOf(TASTING_STEPS, o.step) && !(blind && o.step === 'tipp')) {
    return null;
  }
  if (o.focus !== undefined && o.focus !== null && !isOneOf(TASTING_STEPS, o.focus)) return null;
  if (!optionalString(o.purchasedWineId) || !optionalString(o.lessonId)) return null;
  return {
    ref: { kind: o.ref.kind, id: o.ref.id },
    level: o.level,
    step: (o.step ?? undefined) as TastingStep | 'tipp' | undefined,
    ...(blind ? { blind: true } : {}),
    purchasedWineId: (o.purchasedWineId ?? null) as string | null,
    lessonId: (o.lessonId ?? null) as string | null,
    focus: (o.focus ?? null) as TastingStep | null,
    data: o.data as TastingData,
    savedAt: o.savedAt,
  };
}

/**
 * Ein Entwurf ist gültig, wenn er zum Wein und zum Modus (normal oder blind) gehört, höchstens 7 Tage alt ist,
 * nicht aus der Zukunft stammt und sein Bogen die Prüfung `isValidTastingData` besteht.
 */
export function isDraftValid(
  draft: TastingDraft | null,
  ref: WineRef,
  now: number = Date.now(),
  blind = false,
): draft is TastingDraft {
  if (!draft || !sameWineRef(draft.ref, ref)) return false;
  // Ein Entwurf gehört entweder zur normalen Verkostung oder zur Blindverkostung.
  if ((draft.blind === true) !== blind) return false;
  if (!Number.isFinite(draft.savedAt) || draft.savedAt > now || now - draft.savedAt > TASTING_DRAFT_MAX_AGE_MS) {
    return false;
  }
  if (!isOneOf(TASTING_LEVELS, draft.level)) return false;
  return isValidTastingData(draft.data);
}

/**
 * Die neueste gültige angefangene Blindverkostung aus gespeicherten Einträgen (Schlüssel, Text),
 * zum Beispiel aus `AsyncStorage.multiGet`. Nur Schlüssel dieses Nutzers mit dem Blind-Präfix zählen,
 * der Schlüssel muss zum Wein im Entwurf passen. `isAvailable` prüft, ob der Wein noch verkostet werden kann.
 */
export function newestBlindDraft(
  entries: readonly (readonly [string, string | null])[] | null | undefined,
  userId: string | null | undefined,
  now: number = Date.now(),
  isAvailable: (ref: WineRef) => boolean = () => true,
): TastingDraft | null {
  if (!Array.isArray(entries)) return null;
  const prefix = blindDraftPrefix(userId);
  let best: TastingDraft | null = null;
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const [key, raw] = entry;
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue;
    const draft = parseDraft(raw);
    if (!draft || key !== tastingDraftKey(userId, draft.ref, true)) continue;
    if (!isDraftValid(draft, draft.ref, now, true) || !isAvailable(draft.ref)) continue;
    if (!best || draft.savedAt > best.savedAt) best = draft;
  }
  return best;
}
