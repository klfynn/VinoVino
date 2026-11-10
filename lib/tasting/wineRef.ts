// Reine Funktionen rund um den Weinbezug einer Verkostung (WineRef).
// Eine Verkostung gehört entweder zu einem Marktplatzwein (wine_id) oder zu einem eigenen Wein
// (custom_wine_id). Diese Datei sorgt dafür, dass nie beide Spalten gleichzeitig gesetzt werden.
import { isBodenId } from './catalog';
import { WINE_REF_KINDS, WineRef, WineRefKind } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** IDs in `wines`, `custom_wines`, `purchased_wines` und `tasting_notes` sind UUIDs. Lokale Weine (z. B. „w1“, „scan-…“) nicht. */
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export function isWineRefKind(v: unknown): v is WineRefKind {
  return typeof v === 'string' && (WINE_REF_KINDS as readonly string[]).includes(v);
}

/** Formal gültiger Verweis (Art bekannt, ID nicht leer). Ob die ID in der Datenbank liegt, prüft `isStoredWineRef`. */
export function isWineRef(v: unknown): v is WineRef {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return isWineRefKind(o.kind) && typeof o.id === 'string' && o.id.length > 0 && !o.id.includes(':');
}

/** true, wenn der Verweis auf eine Zeile in der Datenbank zeigen kann (ID ist eine UUID). */
export function isStoredWineRef(v: unknown): v is WineRef {
  return isWineRef(v) && isUuid(v.id);
}

export function marketRef(id: string): WineRef {
  return { kind: 'market', id };
}

export function customRef(id: string): WineRef {
  return { kind: 'custom', id };
}

export function sameWineRef(a: WineRef | null | undefined, b: WineRef | null | undefined): boolean {
  return !!a && !!b && a.kind === b.kind && a.id === b.id;
}

/** Eindeutiger Text für Listen-Schlüssel und Entwurfsschlüssel, z. B. „custom:1234…“. */
export function wineRefKey(ref: WineRef): string {
  return `${ref.kind}:${ref.id}`;
}

/**
 * Spalten für `tasting_notes` zu einem Verweis. Es ist immer genau eine Spalte gesetzt,
 * die andere ist ausdrücklich `null` (passend zum Check-Constraint in der Datenbank).
 */
export function wineRefColumns(ref: WineRef): { wine_id: string | null; custom_wine_id: string | null } {
  return ref.kind === 'custom'
    ? { wine_id: null, custom_wine_id: ref.id }
    : { wine_id: ref.id, custom_wine_id: null };
}

/**
 * Leitet den Verweis aus einer Datenbankzeile ab. Ist keine oder sind beide Spalten gesetzt
 * (darf laut Constraint nicht vorkommen), ergibt das `null`.
 */
export function wineRefFromColumns(row: { wine_id?: unknown; custom_wine_id?: unknown }): WineRef | null {
  const wine = typeof row.wine_id === 'string' && row.wine_id ? row.wine_id : null;
  const custom = typeof row.custom_wine_id === 'string' && row.custom_wine_id ? row.custom_wine_id : null;
  if (wine && !custom) return marketRef(wine);
  if (custom && !wine) return customRef(custom);
  return null;
}

/**
 * Vorbelegung für den Terroir-Schritt bei eigenen Weinen: der eingetragene Bodentyp,
 * wenn er im Katalog bekannt ist. „weiß nicht“, leere und unbekannte Werte ergeben `null`.
 */
export function bodenVorbelegung(wine: { boden?: unknown } | null | undefined): string | null {
  const boden = wine?.boden;
  if (typeof boden !== 'string' || boden === 'weiss_nicht' || !isBodenId(boden)) return null;
  return boden;
}
