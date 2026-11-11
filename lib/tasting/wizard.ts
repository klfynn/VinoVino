// Hilfen für den Verkostungs-Assistenten (reine Funktionen, ohne Nebenwirkungen).
import { DEFAULT_KATEGORIE, weinartToKategorie } from './catalog';
import { isStoredWineRef, isWineRef } from './wineRef';
import { TASTING_LEVELS, TASTING_STEPS, TastingLevel, TastingStep, WeinKategorie, WineRef } from './types';

// ── Wer darf verkosten? ───────────────────────────────────────────────────────

export type TastingAvailability = 'ok' | 'anmelden' | 'voruebergehend';

export const HINWEIS_ANMELDEN = 'Melde dich an, um zu verkosten.';
export const HINWEIS_VORUEBERGEHEND =
  'Dieser Wein ist nur vorübergehend gespeichert und kann noch nicht verkostet werden.';

/**
 * Verkosten geht nur angemeldet und nur bei Weinen, die in Supabase liegen (echte UUID).
 * Weine im Arbeitsspeicher („Nur vorübergehend“) haben keine Zeile, auf die eine Verkostung zeigen kann.
 */
export function tastingAvailability(input: {
  signedIn: boolean;
  persisted: boolean;
  ref: WineRef | null | undefined;
}): TastingAvailability {
  if (!input.signedIn) return 'anmelden';
  if (!input.persisted || !isStoredWineRef(input.ref)) return 'voruebergehend';
  return 'ok';
}

export function availabilityHint(a: TastingAvailability): string | null {
  if (a === 'anmelden') return HINWEIS_ANMELDEN;
  if (a === 'voruebergehend') return HINWEIS_VORUEBERGEHEND;
  return null;
}

// ── Routenparameter ───────────────────────────────────────────────────────────

type Param = string | string[] | undefined;
const first = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v) || undefined;

export type TastingRouteParams = {
  ref: WineRef | null;
  level: TastingLevel | null;
  focus: TastingStep | null;
  lessonId: string | null;
};

/**
 * Liest die Parameter der Route `/tasting/[id]`: `kind` und `id` (WineRef), optional `level`,
 * `focus` und `lesson` (für Teil C). Unbekannte Werte werden verworfen. `isLesson` prüft, ob es
 * die Lektion gibt (wird übergeben, damit diese Funktion ohne Akademie-Inhalte testbar bleibt).
 */
export function parseTastingParams(
  params: Record<string, Param>,
  isLesson: (id: string) => boolean = () => true,
): TastingRouteParams {
  const kind = first(params.kind) ?? 'market';
  const id = first(params.id);
  const candidate = { kind, id };
  const ref = isWineRef(candidate) ? { kind: candidate.kind, id: candidate.id } : null;
  const level = first(params.level);
  const focus = first(params.focus);
  const lesson = first(params.lesson);
  return {
    ref,
    level: level && (TASTING_LEVELS as readonly string[]).includes(level) ? (level as TastingLevel) : null,
    focus: focus && (TASTING_STEPS as readonly string[]).includes(focus) ? (focus as TastingStep) : null,
    lessonId: lesson && isLesson(lesson) ? lesson : null,
  };
}

// ── Zuletzt gewählte Stufe ────────────────────────────────────────────────────

/** Schlüssel in AsyncStorage für die zuletzt gewählte Stufe eines Nutzers. */
export function tastingLevelKey(userId: string | null | undefined): string {
  return `tasting_level_v1:${userId || 'anon'}`;
}

export function parseStoredLevel(raw: string | null | undefined): TastingLevel | null {
  return raw && (TASTING_LEVELS as readonly string[]).includes(raw) ? (raw as TastingLevel) : null;
}

/** Vorauswahl auf dem Startbildschirm: Routenparameter vor gespeicherter Stufe vor „einfach“. */
export function initialLevel(fromRoute: TastingLevel | null, stored: TastingLevel | null): TastingLevel {
  return fromRoute ?? stored ?? 'einfach';
}

// ── Angaben zum Wein ──────────────────────────────────────────────────────────

type WeinEintrag = {
  wine: { type: string; vintage?: number | null };
  custom?: { weinart: string | null; jahrgang: string | null; boden?: string | null } | null;
};

/**
 * Weinkategorie eines Weinkeller-Eintrags: bei eigenen Weinen aus `custom_wines.weinart`
 * (damit zum Beispiel Orangewein erkannt wird), sonst aus dem Anzeige-Typ des Weins.
 */
export function kategorieForEntry(entry: WeinEintrag | null | undefined): WeinKategorie {
  if (!entry) return DEFAULT_KATEGORIE;
  const weinart = entry.custom?.weinart || entry.wine.type;
  return weinartToKategorie(weinart);
}

/** Weinart und Jahrgang für den Kopf des Assistenten, zum Beispiel „Rotwein · 2019“. */
export function wineInfoLine(entry: WeinEintrag | null | undefined): string {
  if (!entry) return '';
  const weinart = entry.custom?.weinart || entry.wine.type;
  const jahrgang = entry.custom ? entry.custom.jahrgang : entry.wine.vintage ? String(entry.wine.vintage) : null;
  return [weinart, jahrgang].filter(Boolean).join(' · ');
}

// ── Sterne im Fazit ───────────────────────────────────────────────────────────

/**
 * Sterne, die beim Speichern über den Weinkeller geschrieben werden müssen, oder `null`,
 * wenn sich nichts geändert hat oder kein gültiger Wert gewählt ist.
 */
export function ratingToSave(vorher: number | null | undefined, nachher: number | null | undefined): number | null {
  if (!Number.isInteger(nachher) || (nachher as number) < 1 || (nachher as number) > 5) return null;
  return nachher === vorher ? null : (nachher as number);
}
