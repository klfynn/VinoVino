// Verbindung zwischen Akademie und Verkostungsbogen (Teil C), als reine Funktionen ohne Nebenwirkungen.
// - Katalog-Verweis (`lektion` in aromen.json, skalen.json, terroir.json): die erklärende Lektion,
//   erreichbar über „Mehr dazu“ in den Info-Sheets des Assistenten.
// - Zuordnung in lektionen.json: die übende Lektion, deren Praxisaufgabe eine Verkostung startet.
// Freischalt-Logik und Lektionsinhalte werden als Parameter übergeben und hier nur gelesen.
import lektionenJson from '../../content/tasting/lektionen.json';
import { tastingAvailability } from './wizard';
import { TASTING_LEVELS, TASTING_STEPS, TastingLevel, TastingStep, WineRef } from './types';

// ── Zuordnung Lektion → Schwerpunkt und Stufe ─────────────────────────────────

/** Eintrag in `content/tasting/lektionen.json`. */
export type LessonTask = {
  focus: TastingStep;
  level: TastingLevel;
  /** ein Satz, worauf beim Verkosten zu achten ist */
  hinweis: string;
};
export type LessonTaskMap = Record<string, LessonTask>;

export const LESSON_TASKS = lektionenJson as unknown as LessonTaskMap;

const isOneOf = <T extends string>(werte: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (werte as readonly string[]).includes(v);

/** Eintrag zu einer Lektion oder `null`, wenn die Praxisaufgabe keine Verkostung vorsieht. */
export function lessonTaskFor(lessonId: unknown, tasks: LessonTaskMap = LESSON_TASKS): LessonTask | null {
  if (typeof lessonId !== 'string' || !Object.prototype.hasOwnProperty.call(tasks, lessonId)) return null;
  return tasks[lessonId] ?? null;
}

/** true, wenn an der Praxisaufgabe der Button „Verkostung starten“ erscheint. */
export function hasTastingButton(lessonId: unknown, tasks: LessonTaskMap = LESSON_TASKS): boolean {
  return lessonTaskFor(lessonId, tasks) !== null;
}

/**
 * Prüft die Zuordnungsdatei. Liefert eine Liste deutscher Fehlermeldungen (leer = alles in Ordnung):
 * Schlüssel ist eine existierende Lektions-ID, `focus` und `level` haben gültige Werte, `hinweis` ist ein Satz.
 */
export function validateLessonTasks(raw: unknown, lessonIds: ReadonlySet<string>): string[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return ['Die Zuordnung ist kein Objekt.'];
  const fehler: string[] = [];
  for (const [id, wert] of Object.entries(raw as Record<string, unknown>)) {
    if (!lessonIds.has(id)) fehler.push(`${id}: unbekannte Lektions-ID`);
    if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) {
      fehler.push(`${id}: Eintrag ist kein Objekt`);
      continue;
    }
    const e = wert as Record<string, unknown>;
    if (!isOneOf(TASTING_STEPS, e.focus)) fehler.push(`${id}: ungültiger Schwerpunkt ${String(e.focus)}`);
    if (!isOneOf(TASTING_LEVELS, e.level)) fehler.push(`${id}: ungültige Stufe ${String(e.level)}`);
    if (typeof e.hinweis !== 'string' || e.hinweis.trim().length === 0) fehler.push(`${id}: Hinweis fehlt`);
    const extra = Object.keys(e).filter((k) => !['focus', 'level', 'hinweis'].includes(k));
    if (extra.length > 0) fehler.push(`${id}: unbekannte Felder ${extra.join(', ')}`);
  }
  return fehler;
}

// ── „Mehr dazu“: Katalog-Verweis auflösen ─────────────────────────────────────

/** Was die Info-Sheets über eine Lektion wissen müssen. */
export type LessonInfo = { id: string; label: string; titel: string };

export type LessonLink =
  | { kind: 'kein' }
  | { kind: 'oeffnen'; lesson: LessonInfo }
  | { kind: 'gesperrt'; lesson: LessonInfo };

/**
 * Löst das Feld `lektion` eines Katalogeintrags auf:
 * - `kein`: kein Verweis (`null`, leer, kein Text) oder die Lektion gibt es nicht
 * - `oeffnen`: die Stufe der Lektion ist freigeschaltet
 * - `gesperrt`: die Stufe ist noch gesperrt
 * `getLesson` und `isUnlocked` werden übergeben (Akademie-Inhalte und Freischalt-Logik werden nur gelesen).
 */
export function resolveLessonLink(
  lektion: unknown,
  deps: { getLesson: (id: string) => LessonInfo | undefined; isUnlocked: (id: string) => boolean },
): LessonLink {
  if (typeof lektion !== 'string' || lektion.length === 0) return { kind: 'kein' };
  const lesson = deps.getLesson(lektion);
  if (!lesson) return { kind: 'kein' };
  return deps.isUnlocked(lesson.id) ? { kind: 'oeffnen', lesson } : { kind: 'gesperrt', lesson };
}

export const GESPERRT_HINWEIS = 'Wird in der Akademie freigeschaltet.';

/** Text der Zeile unten im Info-Sheet, oder `null` ohne Verweis. */
export function lessonLinkText(link: LessonLink): { zeile: string; hinweis: string | null } | null {
  if (link.kind === 'kein') return null;
  const name = `${link.lesson.label} – ${link.lesson.titel}`;
  if (link.kind === 'oeffnen') return { zeile: `Mehr dazu: ${name}`, hinweis: null };
  return { zeile: `${name} (noch gesperrt)`, hinweis: GESPERRT_HINWEIS };
}

// ── Weinauswahl für die Praxisaufgabe ─────────────────────────────────────────

type WeinkellerEintrag = { ref: WineRef; persisted: boolean };

/** true, wenn der Wein verkostet werden kann (angemeldet, in Supabase gespeichert, echte WineRef). */
export function isTastableWine(entry: WeinkellerEintrag, signedIn: boolean): boolean {
  return tastingAvailability({ signedIn, persisted: entry.persisted, ref: entry.ref }) === 'ok';
}

/** Nur verkostbare Weine, Reihenfolge des Weinkellers bleibt erhalten. Ohne Anmeldung eine leere Liste. */
export function selectTastableWines<T extends WeinkellerEintrag>(entries: readonly T[], signedIn: boolean): T[] {
  if (!signedIn) return [];
  return entries.filter((e) => isTastableWine(e, true));
}

export type WinePickerState = 'anmelden' | 'leer' | 'auswahl';

export const PICKER_HINWEIS_ANMELDEN = 'Melde dich an, um zu verkosten.';
export const PICKER_HINWEIS_LEER = 'Dafür brauchst du einen Wein in deinem Weinkeller.';

/** Was die Weinauswahl zeigt: Hinweis zum Anmelden, Hinweis zum leeren Weinkeller oder die Liste. */
export function winePickerState(signedIn: boolean, tastableCount: number): WinePickerState {
  if (!signedIn) return 'anmelden';
  return tastableCount > 0 ? 'auswahl' : 'leer';
}

// ── Rückmeldung in der Lektion ────────────────────────────────────────────────

/** Zählt Verkostungen je `lessonId` (im Speicher, ohne Abfrage pro Lektion). Ohne Lektion wird nicht gezählt. */
export function countTastingsByLesson(notes: readonly { lessonId?: string | null }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const n of notes) {
    if (typeof n.lessonId !== 'string' || n.lessonId.length === 0) continue;
    counts[n.lessonId] = (counts[n.lessonId] ?? 0) + 1;
  }
  return counts;
}

/** Zeile an der Praxisaufgabe. */
export function practiceCountLabel(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return n === 0 ? 'Noch nicht gemacht.' : `Du hast diese Aufgabe schon ${n}-mal gemacht.`;
}

// ── Parameter des Assistenten ─────────────────────────────────────────────────

type Param = string | string[] | undefined | null;
const first = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined;

export type LessonParams = {
  lessonId: string | null;
  focus: TastingStep | null;
  level: TastingLevel | null;
};

/**
 * Löst `lesson`, `focus` und `level` der Route auf. Ungültige Werte werden ignoriert (nie ein Absturz):
 * - unbekannte Lektion → `lessonId: null`
 * - unbekannter Schwerpunkt oder unbekannte Stufe → Wert aus der Zuordnung der Lektion, sonst `null`
 *   (der Assistent nimmt dann seine Standardwerte: erster Schritt, zuletzt gewählte Stufe)
 */
export function resolveLessonParams(
  raw: { lesson?: Param; focus?: Param; level?: Param },
  opts: { isLesson: (id: string) => boolean; tasks?: LessonTaskMap },
): LessonParams {
  const lesson = first(raw.lesson);
  const lessonId = lesson && opts.isLesson(lesson) ? lesson : null;
  const task = lessonId ? lessonTaskFor(lessonId, opts.tasks ?? LESSON_TASKS) : null;
  const focus = first(raw.focus);
  const level = first(raw.level);
  return {
    lessonId,
    focus: isOneOf(TASTING_STEPS, focus) ? focus : task?.focus ?? null,
    level: isOneOf(TASTING_LEVELS, level) ? level : task?.level ?? null,
  };
}

/** Schritt nach „Verkostung beginnen“: der Schwerpunkt, wenn er in der Stufe sichtbar ist, sonst der erste Schritt. */
export function startStepFor(focus: TastingStep | null | undefined, steps: readonly TastingStep[]): TastingStep {
  if (focus && steps.includes(focus)) return focus;
  return steps[0] ?? 'sehen';
}

/** Lektionsbezug eines Entwurfs bei „Weitermachen“ (unbekannte Lektion oder Schwerpunkt fallen weg). */
export function draftLessonContext(
  draft: { lessonId?: string | null; focus?: TastingStep | null },
  isLesson: (id: string) => boolean,
): { lessonId: string | null; focus: TastingStep | null } {
  const lessonId = typeof draft.lessonId === 'string' && isLesson(draft.lessonId) ? draft.lessonId : null;
  return { lessonId, focus: isOneOf(TASTING_STEPS, draft.focus) ? draft.focus : null };
}

/** Routenparameter für den Assistenten aus einer Praxisaufgabe heraus. */
export function lessonTastingParams(
  ref: WineRef,
  lessonId: string,
  task: LessonTask,
): { id: string; kind: WineRef['kind']; lesson: string; focus: TastingStep; level: TastingLevel; from: 'lektion' } {
  return { id: ref.id, kind: ref.kind, lesson: lessonId, focus: task.focus, level: task.level, from: 'lektion' };
}
