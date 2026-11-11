// Texte, Profilwerte und Gruppierung von Verkostungen für die Anzeige (reine Funktionen).
import { aromaLabel, getSkala, isWeinKategorie, DEFAULT_KATEGORIE, SKALEN } from './catalog';
import { profileFromTasting, sanitizeTastingData } from './validate';
import { wineRefKey } from './wineRef';
import {
  Lagerpotenzial,
  Skalenwert,
  TastingData,
  TastingLevel,
  TastingNote,
  TastingProfile,
  Trinkreife,
  WeinKategorie,
  WineRef,
} from './types';

// ── Bezeichnungen ─────────────────────────────────────────────────────────────

export const LEVEL_LABELS: Record<TastingLevel, string> = {
  einfach: 'Einfach',
  erweitert: 'Erweitert',
  profi: 'Profi',
};

/** Ein Satz Erklärung je Stufe für den Startbildschirm. */
export const LEVEL_BESCHREIBUNG: Record<TastingLevel, string> = {
  einfach: 'Sehen, Riechen, Schmecken und Fazit in Kürze.',
  erweitert: 'Dazu Terroir und feinere Skalen wie Tannin, Alkohol und Abgang.',
  profi: 'Alle Felder inklusive Randfarbe, Fehlnoten und Balance.',
};

export const TRINKREIFE_LABELS: Record<Trinkreife, string> = {
  zu_jung: 'noch zu jung',
  trinkbar: 'trinkbar',
  optimal: 'auf dem Höhepunkt',
  ueber_hoehepunkt: 'über dem Höhepunkt',
};

export const LAGERPOTENZIAL_LABELS: Record<Lagerpotenzial, string> = {
  kurz: 'kurz (bald trinken)',
  mittel: 'mittel (einige Jahre)',
  lang: 'lang (viele Jahre)',
};

export const KLARHEIT_LABELS = { klar: 'klar', trueb: 'trüb' } as const;
export const ZUSTAND_LABELS = { sauber: 'sauber', auffaellig: 'auffällig' } as const;

export function levelLabel(level: TastingLevel): string {
  return LEVEL_LABELS[level] ?? LEVEL_LABELS.einfach;
}

/** „1 Verkostung“, „3 Verkostungen“; bei 0 ein leerer Text. */
export function tastingCountLabel(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return n === 1 ? '1 Verkostung' : `${Math.floor(n)} Verkostungen`;
}

/** Datum als „11.11.2026“ (lokale Zeit). Ungültige Werte ergeben einen leeren Text. */
export function formatTastingDate(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// ── Profil ────────────────────────────────────────────────────────────────────

export type ProfileRow = { id: keyof TastingProfile; label: string; value: Skalenwert; anker: string };

const PROFIL_REIHENFOLGE: (keyof TastingProfile)[] = ['suesse', 'saeure', 'tannin', 'koerper', 'alkohol', 'abgang'];

/** true, wenn die Kategorie die Skala kennt (zum Beispiel Tannin nur bei Rot und Orange). */
export function kategorieHatSkala(kategorie: WeinKategorie, skalaId: string): boolean {
  const kat = isWeinKategorie(kategorie) ? kategorie : DEFAULT_KATEGORIE;
  return SKALEN.some((s) => s.id === skalaId && s.kategorien.includes(kat));
}

/**
 * Balken für das Profil: Süße, Säure, Tannin (nur wenn die Kategorie es hat), Körper, Alkohol,
 * Abgang. Nur bewertete Werte erscheinen.
 */
export function profileRows(data: TastingData | null | undefined, kategorie: WeinKategorie): ProfileRow[] {
  const profil = profileFromTasting(data);
  const rows: ProfileRow[] = [];
  for (const id of PROFIL_REIHENFOLGE) {
    const value = profil[id];
    if (value === null || !kategorieHatSkala(kategorie, id)) continue;
    const skala = getSkala(id);
    rows.push({ id, label: skala?.label ?? id, value, anker: skala?.anker[value - 1] ?? '' });
  }
  return rows;
}

/** Kurzer Satz für den Verlauf, zum Beispiel „Säure 4, Körper 3“. */
export function summarySentence(data: TastingData | null | undefined, kategorie: WeinKategorie, max = 3): string {
  const rows = profileRows(data, kategorie);
  if (rows.length > 0) return rows.slice(0, max).map((r) => `${r.label} ${r.value}`).join(', ');
  const n = selectedAromaIds(data).length;
  if (n > 0) return n === 1 ? '1 Aroma notiert' : `${n} Aromen notiert`;
  const clean = sanitizeTastingData(data);
  return Object.keys(clean).length > 0 ? 'Eindrücke notiert' : 'Ohne Angaben';
}

// ── Aromen ────────────────────────────────────────────────────────────────────

/** Alle gewählten Aromen (Nase Primär, Sekundär, Tertiär, dann Gaumen), ohne Doppelte. */
export function selectedAromaIds(data: TastingData | null | undefined): string[] {
  const clean = sanitizeTastingData(data);
  const nase = clean.riechen?.aromen;
  const alle = [
    ...(nase?.primaer ?? []),
    ...(nase?.sekundaer ?? []),
    ...(nase?.tertiaer ?? []),
    ...(clean.schmecken?.aromen_gaumen ?? []),
  ];
  return alle.filter((id, i) => alle.indexOf(id) === i);
}

/** Die ersten `max` Aromen als Bezeichnungen und die Anzahl der übrigen („+ n weitere“). */
export function aromaPreview(ids: string[], max = 6): { labels: string[]; rest: number } {
  const labels = ids.slice(0, Math.max(0, max)).map((id) => aromaLabel(id) ?? id);
  return { labels, rest: Math.max(0, ids.length - labels.length) };
}

/** „+ 2 weitere“ bzw. leer. */
export function restLabel(rest: number): string {
  return rest > 0 ? `+ ${rest} weitere` : '';
}

/** Schaltet eine ID in einer Liste ein oder aus (Reihenfolge bleibt, keine Doppelten). */
export function toggleId(list: string[] | undefined, id: string): string[] {
  const current = list ?? [];
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
}

// ── Verkostungen gruppieren ───────────────────────────────────────────────────

/** Neueste zuerst: nach Verkostungszeitpunkt, dann Anlagezeitpunkt, dann ID (stabil). */
export function compareTastingsDesc(a: TastingNote, b: TastingNote): number {
  const t = (Date.parse(b.tastedAt) || 0) - (Date.parse(a.tastedAt) || 0);
  if (t !== 0) return t;
  const c = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  if (c !== 0) return c;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function sortTastingsDesc(notes: readonly TastingNote[] | null | undefined): TastingNote[] {
  return [...(notes ?? [])].sort(compareTastingsDesc);
}

/** Die letzte (neueste) Verkostung oder `null`. */
export function latestTasting(notes: readonly TastingNote[] | null | undefined): TastingNote | null {
  return sortTastingsDesc(notes)[0] ?? null;
}

/** Gruppiert Verkostungen nach Wein (Schlüssel aus `wineRefKey`), jede Gruppe neueste zuerst. */
export function groupTastingsByRef(notes: readonly TastingNote[] | null | undefined): Map<string, TastingNote[]> {
  const groups = new Map<string, TastingNote[]>();
  for (const note of sortTastingsDesc(notes)) {
    const key = wineRefKey(note.ref);
    const list = groups.get(key);
    if (list) list.push(note);
    else groups.set(key, [note]);
  }
  return groups;
}

/** Verkostungen eines Weins aus einer Gruppierung (neueste zuerst), sonst eine leere Liste. */
export function tastingsFor(groups: Map<string, TastingNote[]>, ref: WineRef): TastingNote[] {
  return groups.get(wineRefKey(ref)) ?? [];
}
