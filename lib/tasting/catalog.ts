// Zugriff auf die gebündelten Kataloge des Verkostungsbogens (reine Funktionen).
// Metro braucht statische Pfade, deshalb wird jede Datei einzeln importiert.
import aromenJson from '../../content/tasting/aromen.json';
import farbenJson from '../../content/tasting/farben.json';
import skalenJson from '../../content/tasting/skalen.json';
import terroirJson from '../../content/tasting/terroir.json';
import abschnitteJson from '../../content/tasting/abschnitte.json';
import {
  AbschnitteKatalog,
  Aroma,
  AromaFamilie,
  AromaStufe,
  AromaStufeKatalog,
  AromenKatalog,
  Farbe,
  FarbenKatalog,
  Skala,
  SkalenKatalog,
  TastingLevel,
  TerroirKatalog,
  WeinKategorie,
  WEIN_KATEGORIEN,
} from './types';

export const AROMEN = aromenJson as unknown as AromenKatalog;
export const FARBEN = farbenJson as unknown as FarbenKatalog;
export const SKALEN = (skalenJson as unknown as SkalenKatalog).skalen;
export const TERROIR = terroirJson as unknown as TerroirKatalog;
export const ABSCHNITTE = (abschnitteJson as unknown as AbschnitteKatalog).abschnitte;

/** Neutrale Standardkategorie, wenn die Weinart fehlt oder unbekannt ist. */
export const DEFAULT_KATEGORIE: WeinKategorie = 'unbekannt';

// ── Stufen ────────────────────────────────────────────────────────────────────

const LEVEL_RANG: Record<TastingLevel, number> = { einfach: 0, erweitert: 1, profi: 2 };

/** true, wenn ein Inhalt mit Mindeststufe `ab` in der gewählten Stufe sichtbar ist. */
export function isLevelIncluded(ab: TastingLevel, gewaehlt: TastingLevel): boolean {
  return (LEVEL_RANG[ab] ?? 0) <= (LEVEL_RANG[gewaehlt] ?? 0);
}

// ── Weinart → Kategorie ───────────────────────────────────────────────────────

/**
 * Bekannte Werte von `wines.weinart` (so schreibt sie das Händlerportal) und Auswahl für
 * eigene Weine. Jeder Wert ist unten einer Kategorie zugeordnet (siehe Prüfskript).
 */
export const WEINART_WERTE = ['Rotwein', 'Weißwein', 'Rosé', 'Schaumwein', 'Dessert- und Likörwein'] as const;
export type WeinartWert = (typeof WEINART_WERTE)[number];

export function isWeinartWert(v: unknown): v is WeinartWert {
  return typeof v === 'string' && (WEINART_WERTE as readonly string[]).includes(v);
}

/** Kleinschreibung, Umlaute und Akzente vereinheitlicht, Satzzeichen zu Leerzeichen. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Reihenfolge ist wichtig: spezifische Begriffe zuerst (zum Beispiel „Rosé-Sekt“ ist Schaumwein,
// „Dessert- und Likörwein“ ist süß, obwohl es auf „wein“ endet).
const KATEGORIE_REGELN: { kategorie: WeinKategorie; begriffe: string[] }[] = [
  {
    kategorie: 'schaum',
    begriffe: [
      'schaumwein', 'sekt', 'champagner', 'champagne', 'cremant', 'prosecco', 'cava',
      'perlwein', 'spumante', 'franciacorta', 'pet nat', 'petnat', 'sparkling', 'frizzante',
    ],
  },
  {
    kategorie: 'suess',
    begriffe: [
      'suesswein', 'dessertwein', 'dessert', 'likoerwein', 'portwein', 'port', 'sherry',
      'madeira', 'marsala', 'eiswein', 'beerenauslese', 'trockenbeerenauslese', 'sauternes',
      'tokaji', 'tokajer', 'vin santo', 'passito', 'strohwein', 'edelsuess', 'aufgespritet',
    ],
  },
  { kategorie: 'orange', begriffe: ['orange wine', 'orangewein', 'orange', 'maischevergoren'] },
  { kategorie: 'rose', begriffe: ['rosewein', 'rose', 'rosato', 'rosado', 'weissherbst', 'blush'] },
  { kategorie: 'weiss', begriffe: ['weisswein', 'weiss', 'white', 'blanc', 'bianco'] },
  { kategorie: 'rot', begriffe: ['rotwein', 'rot', 'red', 'rouge', 'rosso', 'tinto'] },
];

/**
 * Leitet aus `wines.weinart` (oder dem App-Typ `Wine.type`) die Weinkategorie ab.
 * Bekannte Werte: „Rotwein“, „Weißwein“, „Rosé“, „Roséwein“, „Schaumwein“, „Süßwein“,
 * „Dessert- und Likörwein“; dazu robuste Erkennung von Begriffen wie „Champagner“ oder „Port“.
 * Unbekannte, leere oder falsch typisierte Werte ergeben `unbekannt`. Wirft nie.
 */
export function weinartToKategorie(weinart: unknown): WeinKategorie {
  if (typeof weinart !== 'string') return DEFAULT_KATEGORIE;
  const text = normalize(weinart);
  if (!text) return DEFAULT_KATEGORIE;
  const woerter = new Set(text.split(' '));
  for (const regel of KATEGORIE_REGELN) {
    for (const begriff of regel.begriffe) {
      // Mehrwortbegriffe als Teilstring, Einzelwörter als ganzes Wort (damit „Portugal“ nicht „Port“ ist).
      if (begriff.includes(' ') ? text.includes(begriff) : woerter.has(begriff)) return regel.kategorie;
    }
  }
  return DEFAULT_KATEGORIE;
}

export function isWeinKategorie(value: unknown): value is WeinKategorie {
  return typeof value === 'string' && (WEIN_KATEGORIEN as readonly string[]).includes(value);
}

// ── Skalen ────────────────────────────────────────────────────────────────────

/** Skalen, die für eine Weinkategorie in der gewählten Stufe angezeigt werden. */
export function getSkalen(kategorie: WeinKategorie, level: TastingLevel): Skala[] {
  const kat = isWeinKategorie(kategorie) ? kategorie : DEFAULT_KATEGORIE;
  return SKALEN.filter((s) => s.kategorien.includes(kat) && isLevelIncluded(s.stufe, level));
}

export function getSkala(id: string): Skala | undefined {
  return SKALEN.find((s) => s.id === id);
}

// ── Farben ────────────────────────────────────────────────────────────────────

function collectFarben(kategorie: WeinKategorie, feld: 'farben' | 'rand'): Farbe[] {
  const kat = FARBEN.kategorien[isWeinKategorie(kategorie) ? kategorie : DEFAULT_KATEGORIE];
  if (!kat) return [];
  const geerbt = (kat.wie ?? []).flatMap((k) => FARBEN.kategorien[k]?.[feld] ?? []);
  // Doppelte IDs (wenn mehrere Kategorien dieselbe Farbe erben) nur einmal liefern.
  const seen = new Set<string>();
  return [...kat[feld], ...geerbt].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/** Farbstufen von hell nach dunkel für eine Kategorie. */
export function getFarben(kategorie: WeinKategorie): Farbe[] {
  return collectFarben(kategorie, 'farben');
}

/** Randfarben (nur Profi); in niedrigeren Stufen eine leere Liste. */
export function getRandFarben(kategorie: WeinKategorie, level: TastingLevel): Farbe[] {
  return level === 'profi' ? collectFarben(kategorie, 'rand') : [];
}

// ── Aromen ────────────────────────────────────────────────────────────────────

/** Aroma-Stufen mit den Familien, die zur Kategorie und gewählten Stufe passen. */
export function getAromaStufen(kategorie: WeinKategorie, level: TastingLevel): AromaStufeKatalog[] {
  const kat = isWeinKategorie(kategorie) ? kategorie : DEFAULT_KATEGORIE;
  return AROMEN.stufen
    .filter((s) => isLevelIncluded(s.ab_stufe, level))
    .map((s) => ({
      ...s,
      familien: s.familien.filter((f: AromaFamilie) => !f.kategorien || f.kategorien.includes(kat)),
    }))
    .filter((s) => s.familien.length > 0);
}

/** Fehlnoten; nur in der Stufe Profi, sonst eine leere Liste. */
export function getFehler(level: TastingLevel): Aroma[] {
  return isLevelIncluded(AROMEN.fehler.ab_stufe, level) ? AROMEN.fehler.aromen : [];
}

// ── Nachschlagen von IDs (für die Prüfung gespeicherter Daten) ────────────────

const AROMA_IDS_JE_STUFE: Record<AromaStufe, Set<string>> = {
  primaer: new Set(),
  sekundaer: new Set(),
  tertiaer: new Set(),
};
for (const s of AROMEN.stufen) {
  for (const f of s.familien) for (const a of f.aromen) AROMA_IDS_JE_STUFE[s.id]?.add(a.id);
}

const ALLE_AROMA_IDS = new Set<string>(
  Object.values(AROMA_IDS_JE_STUFE).flatMap((set) => Array.from(set)),
);
const FEHLER_IDS = new Set(AROMEN.fehler.aromen.map((a) => a.id));
const FARB_IDS = new Set(Object.values(FARBEN.kategorien).flatMap((k) => k.farben.map((f) => f.id)));
const RAND_IDS = new Set(Object.values(FARBEN.kategorien).flatMap((k) => k.rand.map((f) => f.id)));
const EINDRUCK_IDS = new Set(TERROIR.eindruecke.optionen.map((o) => o.id));
const BODEN_IDS = new Set(TERROIR.boeden.optionen.map((o) => o.id));
const KLIMA_IDS = new Set(TERROIR.klima_eindruck.optionen.map((o) => o.id));

export const isAromaId = (stufe: AromaStufe, id: string) => AROMA_IDS_JE_STUFE[stufe]?.has(id) ?? false;
export const isAnyAromaId = (id: string) => ALLE_AROMA_IDS.has(id);
export const isFehlerId = (id: string) => FEHLER_IDS.has(id);
export const isFarbId = (id: string) => FARB_IDS.has(id);
export const isRandId = (id: string) => RAND_IDS.has(id);
export const isEindruckId = (id: string) => EINDRUCK_IDS.has(id);
export const isBodenId = (id: string) => BODEN_IDS.has(id);
export const isKlimaId = (id: string) => KLIMA_IDS.has(id);

/** Label zu einer beliebigen Aroma- oder Fehler-ID (für spätere Anzeigen). */
export function aromaLabel(id: string): string | undefined {
  for (const s of AROMEN.stufen) {
    for (const f of s.familien) {
      const a = f.aromen.find((x) => x.id === id);
      if (a) return a.label;
    }
  }
  return AROMEN.fehler.aromen.find((a) => a.id === id)?.label;
}
