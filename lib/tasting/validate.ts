// Prüfen und Bereinigen von `tasting_notes.data` (reine Funktionen, ohne Nebenwirkungen).
import {
  isAnyAromaId,
  isAromaId,
  isBodenId,
  isEindruckId,
  isFarbId,
  isFehlerId,
  isKlimaId,
  isRandId,
} from './catalog';
import {
  AROMA_STUFEN,
  KLARHEIT_WERTE,
  LAGERPOTENZIAL_WERTE,
  NASEN_ZUSTAENDE,
  NOTIZ_MAX_LENGTH,
  Skalenwert,
  TastingAromen,
  TastingBlind,
  TastingData,
  TastingFazit,
  TastingProfile,
  TastingRiechen,
  TastingSchmecken,
  TastingSehen,
  TastingTerroir,
  TIPP_MAX_LENGTH,
  TRINKREIFE_WERTE,
} from './types';

/** Obergrenze je Liste, damit `data` deutlich unter der Datenbankgrenze (20 000 Byte) bleibt. */
export const MAX_LIST_LENGTH = 60;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSkalenwert = (v: unknown): v is Skalenwert => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
const isOneOf = <T extends string>(werte: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (werte as readonly string[]).includes(v);
/** Länge in Zeichen (Unicode-Codepoints), damit Emojis nicht doppelt zählen. */
const charLength = (s: string) => Array.from(s).length;
const truncate = (s: string, max: number) => Array.from(s).slice(0, max).join('');

// ── Prüfung ───────────────────────────────────────────────────────────────────

/** Wenn `key` vorhanden ist (und nicht `undefined`), muss `test` zutreffen. */
function optional(o: Obj, key: string, test: (v: unknown) => boolean): boolean {
  return o[key] === undefined || test(o[key]);
}

function idList(v: unknown, isId: (id: string) => boolean): boolean {
  return (
    Array.isArray(v) &&
    v.length <= MAX_LIST_LENGTH &&
    v.every((id) => typeof id === 'string' && isId(id))
  );
}

function validSehen(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    optional(v, 'klarheit', (x) => isOneOf(KLARHEIT_WERTE, x)) &&
    optional(v, 'intensitaet', isSkalenwert) &&
    optional(v, 'farbe', (x) => typeof x === 'string' && isFarbId(x)) &&
    optional(v, 'rand', (x) => typeof x === 'string' && isRandId(x)) &&
    optional(v, 'viskositaet', isSkalenwert) &&
    optional(v, 'perlage', isSkalenwert)
  );
}

function validAromen(v: unknown): boolean {
  if (!isObj(v)) return false;
  // Alle drei Listen müssen vorhanden sein (leer ist erlaubt), damit Teil B sie direkt nutzen kann.
  return AROMA_STUFEN.every((stufe) => idList(v[stufe], (id) => isAromaId(stufe, id)));
}

function validRiechen(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    optional(v, 'intensitaet', isSkalenwert) &&
    optional(v, 'zustand', (x) => isOneOf(NASEN_ZUSTAENDE, x)) &&
    optional(v, 'aromen', validAromen) &&
    optional(v, 'fehler', (x) => idList(x, isFehlerId))
  );
}

const SCHMECKEN_SKALEN = ['suesse', 'saeure', 'tannin', 'koerper', 'alkohol', 'abgang', 'balance', 'mousse'] as const;

function validSchmecken(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    SCHMECKEN_SKALEN.every((k) => optional(v, k, isSkalenwert)) &&
    optional(v, 'aromen_gaumen', (x) => idList(x, isAnyAromaId))
  );
}

function validTerroir(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    optional(v, 'eindruecke', (x) => idList(x, isEindruckId)) &&
    optional(v, 'boden_tipp', (x) => x === null || (typeof x === 'string' && isBodenId(x))) &&
    optional(v, 'klima_eindruck', (x) => x === null || (typeof x === 'string' && isKlimaId(x)))
  );
}

function validFazit(v: unknown): boolean {
  if (!isObj(v)) return false;
  return (
    optional(v, 'qualitaet', isSkalenwert) &&
    optional(v, 'trinkreife', (x) => isOneOf(TRINKREIFE_WERTE, x)) &&
    optional(v, 'lagerpotenzial', (x) => isOneOf(LAGERPOTENZIAL_WERTE, x)) &&
    optional(v, 'notiz', (x) => typeof x === 'string' && charLength(x) <= NOTIZ_MAX_LENGTH)
  );
}

const BLIND_FELDER = ['rebsorte_tipp', 'region_tipp', 'jahrgang_tipp'] as const;

function validBlind(v: unknown): boolean {
  if (!isObj(v)) return false;
  return BLIND_FELDER.every((k) =>
    optional(v, k, (x) => typeof x === 'string' && charLength(x) <= TIPP_MAX_LENGTH),
  );
}

/**
 * Prüft Typen, Wertebereiche und dass alle IDs im Katalog existieren.
 * Unbekannte Felder werden toleriert (für spätere Schema-Erweiterungen).
 */
export function isValidTastingData(data: unknown): data is TastingData {
  if (!isObj(data)) return false;
  return (
    optional(data, 'sehen', validSehen) &&
    optional(data, 'riechen', validRiechen) &&
    optional(data, 'schmecken', validSchmecken) &&
    optional(data, 'terroir', validTerroir) &&
    optional(data, 'fazit', validFazit) &&
    optional(data, 'blind', validBlind)
  );
}

// ── Bereinigung ───────────────────────────────────────────────────────────────

/** Übernimmt nur gültige, eindeutige IDs (Reihenfolge bleibt), höchstens MAX_LIST_LENGTH. */
function cleanIds(v: unknown, isId: (id: string) => boolean): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const id of v) {
    if (typeof id === 'string' && isId(id) && !out.includes(id)) out.push(id);
    if (out.length >= MAX_LIST_LENGTH) break;
  }
  return out;
}

/** Entfernt Felder mit `undefined`; liefert `undefined`, wenn nichts übrig bleibt. */
function compact<T extends object>(o: T): T | undefined {
  const entries = Object.entries(o).filter(([, v]) => v !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
}

const pickSkala = (v: unknown): Skalenwert | undefined => (isSkalenwert(v) ? v : undefined);
const pickOneOf = <T extends string>(werte: readonly T[], v: unknown): T | undefined =>
  isOneOf(werte, v) ? v : undefined;
const pickId = (v: unknown, isId: (id: string) => boolean): string | undefined =>
  typeof v === 'string' && isId(v) ? v : undefined;
/** Für Felder, die ausdrücklich `null` erlauben: gültige ID, `null` oder weglassen. */
const pickNullableId = (v: unknown, isId: (id: string) => boolean): string | null | undefined =>
  v === null ? null : pickId(v, isId);
const nonEmpty = (list: string[]) => (list.length > 0 ? list : undefined);

// Steuerzeichen außer Zeilenumbruch und Tab entfernen; das Nullzeichen lehnt Postgres in jsonb ab.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = truncate(v.replace(CONTROL_CHARS, '').trim(), max).trim();
  return t.length > 0 ? t : undefined;
}

function sanitizeSehen(v: unknown): TastingSehen | undefined {
  if (!isObj(v)) return undefined;
  return compact<TastingSehen>({
    klarheit: pickOneOf(KLARHEIT_WERTE, v.klarheit),
    intensitaet: pickSkala(v.intensitaet),
    farbe: pickId(v.farbe, isFarbId),
    rand: pickId(v.rand, isRandId),
    viskositaet: pickSkala(v.viskositaet),
    perlage: pickSkala(v.perlage),
  });
}

function sanitizeAromen(v: unknown): TastingAromen | undefined {
  if (!isObj(v)) return undefined;
  const aromen: TastingAromen = {
    primaer: cleanIds(v.primaer, (id) => isAromaId('primaer', id)),
    sekundaer: cleanIds(v.sekundaer, (id) => isAromaId('sekundaer', id)),
    tertiaer: cleanIds(v.tertiaer, (id) => isAromaId('tertiaer', id)),
  };
  const leer = aromen.primaer.length + aromen.sekundaer.length + aromen.tertiaer.length === 0;
  return leer ? undefined : aromen;
}

function sanitizeRiechen(v: unknown): TastingRiechen | undefined {
  if (!isObj(v)) return undefined;
  return compact<TastingRiechen>({
    intensitaet: pickSkala(v.intensitaet),
    zustand: pickOneOf(NASEN_ZUSTAENDE, v.zustand),
    aromen: sanitizeAromen(v.aromen),
    fehler: nonEmpty(cleanIds(v.fehler, isFehlerId)),
  });
}

function sanitizeSchmecken(v: unknown): TastingSchmecken | undefined {
  if (!isObj(v)) return undefined;
  const out: TastingSchmecken = {};
  for (const k of SCHMECKEN_SKALEN) out[k] = pickSkala(v[k]);
  out.aromen_gaumen = nonEmpty(cleanIds(v.aromen_gaumen, isAnyAromaId));
  return compact(out);
}

function sanitizeTerroir(v: unknown): TastingTerroir | undefined {
  if (!isObj(v)) return undefined;
  return compact<TastingTerroir>({
    eindruecke: nonEmpty(cleanIds(v.eindruecke, isEindruckId)),
    boden_tipp: pickNullableId(v.boden_tipp, isBodenId),
    klima_eindruck: pickNullableId(v.klima_eindruck, isKlimaId),
  });
}

function sanitizeFazit(v: unknown): TastingFazit | undefined {
  if (!isObj(v)) return undefined;
  return compact<TastingFazit>({
    qualitaet: pickSkala(v.qualitaet),
    trinkreife: pickOneOf(TRINKREIFE_WERTE, v.trinkreife),
    lagerpotenzial: pickOneOf(LAGERPOTENZIAL_WERTE, v.lagerpotenzial),
    notiz: cleanText(v.notiz, NOTIZ_MAX_LENGTH),
  });
}

function sanitizeBlind(v: unknown): TastingBlind | undefined {
  if (!isObj(v)) return undefined;
  return compact<TastingBlind>({
    rebsorte_tipp: cleanText(v.rebsorte_tipp, TIPP_MAX_LENGTH),
    region_tipp: cleanText(v.region_tipp, TIPP_MAX_LENGTH),
    jahrgang_tipp: cleanText(v.jahrgang_tipp, TIPP_MAX_LENGTH),
  });
}

/**
 * Liefert einen sauberen Bogen: unbekannte Felder und ungültige Werte fallen weg,
 * Listen werden entdoppelt, die Notiz wird getrimmt und auf 1000 Zeichen gekürzt,
 * leere Abschnitte entfallen. Das Ergebnis besteht immer `isValidTastingData`.
 * Wirft nie; bei unbrauchbarer Eingabe kommt `{}` zurück.
 */
export function sanitizeTastingData(data: unknown): TastingData {
  if (!isObj(data)) return {};
  return (
    compact<TastingData>({
      sehen: sanitizeSehen(data.sehen),
      riechen: sanitizeRiechen(data.riechen),
      schmecken: sanitizeSchmecken(data.schmecken),
      terroir: sanitizeTerroir(data.terroir),
      fazit: sanitizeFazit(data.fazit),
      blind: sanitizeBlind(data.blind),
    }) ?? {}
  );
}

// ── Profil ────────────────────────────────────────────────────────────────────

/** Werte für die spätere Profil-Anzeige; fehlende oder ungültige Werte sind `null`. */
export function profileFromTasting(data: unknown): TastingProfile {
  const s = isObj(data) && isObj(data.schmecken) ? data.schmecken : {};
  const wert = (k: keyof TastingProfile) => (isSkalenwert(s[k]) ? (s[k] as Skalenwert) : null);
  return {
    suesse: wert('suesse'),
    saeure: wert('saeure'),
    tannin: wert('tannin'),
    koerper: wert('koerper'),
    alkohol: wert('alkohol'),
    abgang: wert('abgang'),
  };
}
