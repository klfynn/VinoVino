// Filter für den Swipe-Stapel und die Trefferzahl im Filterbildschirm. Reine Funktionen ohne React.
// Ein Jahrgangs- oder Preisbereich, der dem Standard entspricht, gilt als „kein Filter“: Dann bleiben
// auch Weine ohne Jahrgang (vintage = 0), ohne Preis (price = 0) und über der Preisgrenze sichtbar.
import type { Wine } from '../types';

export type Weinart = 'Rotwein' | 'Weißwein' | 'Rosé' | 'Schaumwein' | 'Dessert- und Likörwein';
export type Geschmack = 'Trocken' | 'Halbtrocken' | 'Lieblich';
export type Anlass =
  | 'Romantisches Dinner'
  | 'Grillabend'
  | 'Geburtstag'
  | 'Feierabend'
  | 'Festliche Anlässe'
  | 'Picknick';
export type BioNaturVeganOption = 'Bio' | 'Natur' | 'Vegan' | 'Vegetarisch';

export interface Bereich {
  min: number;
  max: number;
}

export interface FilterState {
  weinart: Weinart[];
  geschmack: Geschmack[];
  herkunft: string[];
  region: string[];
  rebsorte: string[];
  jahrgang: Bereich;
  preis: Bereich;
  anlass: Anlass[];
  bioNaturVegan: BioNaturVeganOption[];
  passtZu: string[];
  bewertungMin: number;
}

/** Obergrenze für den Jahrgang: das Kalenderjahr des übergebenen Datums. */
export function jahrgangsObergrenze(datum: Date = new Date()): number {
  return datum.getFullYear();
}

/**
 * Grenzen der Regler im Filterbildschirm; der volle Bereich ist zugleich der Standard.
 * Das aktuelle Jahr wird einmal beim Laden der App berechnet und von Standard, Regler und
 * Zähler aktiver Filter gemeinsam benutzt.
 */
export const JAHRGANG_MIN = 1990;
export const JAHRGANG_MAX = jahrgangsObergrenze();
export const PREIS_MIN = 5;
export const PREIS_MAX = 500;

export const DEFAULT_FILTER: FilterState = {
  weinart: [],
  geschmack: [],
  herkunft: [],
  region: [],
  rebsorte: [],
  jahrgang: { min: JAHRGANG_MIN, max: JAHRGANG_MAX },
  preis: { min: PREIS_MIN, max: PREIS_MAX },
  anlass: [],
  bioNaturVegan: [],
  passtZu: [],
  bewertungMin: 1,
};

const WEINART_MAP: Record<Weinart, string> = {
  Rotwein: 'Rotwein',
  Weißwein: 'Weißwein',
  Rosé: 'Roséwein',
  Schaumwein: 'Schaumwein',
  'Dessert- und Likörwein': 'Süßwein',
};

const NEUE_WELT = ['USA', 'Australien', 'Neuseeland', 'Chile', 'Argentinien', 'Südafrika'];
const STAR_MIN = [0, 0, 85, 88, 90, 95];

/** Eingeschränkt ist ein Bereich, wenn er enger ist als der Standard (wie beim Zähler aktiver Filter). */
function istEingeschraenkt(bereich: Bereich, standard: Bereich): boolean {
  return bereich.min > standard.min || bereich.max < standard.max;
}

export function isJahrgangFilterAktiv(jahrgang: Bereich, standard: Bereich = DEFAULT_FILTER.jahrgang): boolean {
  return istEingeschraenkt(jahrgang, standard);
}

export function isPreisFilterAktiv(preis: Bereich, standard: Bereich = DEFAULT_FILTER.preis): boolean {
  return istEingeschraenkt(preis, standard);
}

/** Anzahl aktiver Filter für das Filtersymbol und „Zurücksetzen“. */
export function countActiveFilters(f: FilterState, standard: FilterState = DEFAULT_FILTER): number {
  let count = 0;
  if (f.weinart.length > 0) count++;
  if (f.geschmack.length > 0) count++;
  if (f.herkunft.length > 0) count++;
  if (f.region.length > 0) count++;
  if (f.rebsorte.length > 0) count++;
  if (isJahrgangFilterAktiv(f.jahrgang, standard.jahrgang)) count++;
  if (isPreisFilterAktiv(f.preis, standard.preis)) count++;
  if (f.anlass.length > 0) count++;
  if (f.bioNaturVegan.length > 0) count++;
  if (f.passtZu.length > 0) count++;
  if (f.bewertungMin > 1) count++;
  return count;
}

export type FilterbarerWein = Pick<
  Wine,
  'type' | 'taste' | 'country' | 'region' | 'grape' | 'vintage' | 'price' | 'anlass' | 'bioNaturVegan' | 'passtZu' | 'rating'
>;

/** Passt der Wein zu den Filtern? */
export function wineMatchesFilter(
  w: FilterbarerWein,
  f: FilterState,
  standard: FilterState = DEFAULT_FILTER,
): boolean {
  if (f.weinart.length > 0) {
    const mapped = f.weinart.map((wa) => WEINART_MAP[wa]);
    if (!mapped.includes(w.type)) return false;
  }
  if (f.geschmack.length > 0) {
    const mapped = f.geschmack.map((g) => g.toLowerCase());
    if (!mapped.some((g) => w.taste.includes(g))) return false;
  }
  if (f.herkunft.length > 0) {
    const matches = f.herkunft.some((h) =>
      h === 'Neue Welt' ? NEUE_WELT.includes(w.country) : w.country === h,
    );
    if (!matches) return false;
  }
  if (f.region.length > 0) {
    if (!f.region.some((r) => w.region === r)) return false;
  }
  if (f.rebsorte.length > 0) {
    if (!f.rebsorte.some((r) => w.grape.includes(r))) return false;
  }
  if (isJahrgangFilterAktiv(f.jahrgang, standard.jahrgang)) {
    if (w.vintage < f.jahrgang.min || w.vintage > f.jahrgang.max) return false;
  }
  if (isPreisFilterAktiv(f.preis, standard.preis)) {
    if (w.price < f.preis.min || w.price > f.preis.max) return false;
  }
  if (f.anlass.length > 0) {
    if (!f.anlass.some((a) => w.anlass?.includes(a))) return false;
  }
  if (f.bioNaturVegan.length > 0) {
    if (!f.bioNaturVegan.some((b) => w.bioNaturVegan?.includes(b))) return false;
  }
  if (f.passtZu.length > 0) {
    if (!f.passtZu.some((p) => w.passtZu?.includes(p))) return false;
  }
  if (w.rating < STAR_MIN[f.bewertungMin]) return false;
  return true;
}

export function filterWines<T extends FilterbarerWein>(
  wines: readonly T[],
  f: FilterState,
  standard: FilterState = DEFAULT_FILTER,
): T[] {
  return wines.filter((w) => wineMatchesFilter(w, f, standard));
}
