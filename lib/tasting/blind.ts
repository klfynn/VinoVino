// Blindverkostung (Teil D1): reine Funktionen ohne Nebenwirkungen.
// Erkennen von Rebsorten und Ländern in freiem Text, Auswahl eines geeigneten Weins,
// Schritte des Assistenten im Blind-Modus und die Auswertung der Tipps.
// Alle Funktionen sind robust gegen leere, fehlende und seltsame Eingaben und werfen nie.
import { LAENDER, landLabel, REBSORTEN, rebsorteLabel, weinartToKategorie, WEINART_WERTE } from './catalog';
import { sanitizeTastingData } from './validate';
import { pruneTastingData, visibleSteps } from './visibility';
import { isStoredWineRef } from './wineRef';
import {
  BlindWahrheit,
  KatalogEintrag,
  TastingBlind,
  TastingData,
  TastingLevel,
  TastingStep,
  WeinKategorie,
  WineRef,
} from './types';

// ── Texte ─────────────────────────────────────────────────────────────────────

/** Steht im Blind-Modus überall statt des Weinnamens. */
export const BLIND_NAME = 'Blindwein';
export const BLIND_TIPP_EINLEITUNG = 'Was glaubst du, welcher Wein das ist? Lass leer, was du nicht weißt.';
export const BLIND_HINWEIS_ZU_WENIG =
  'Für eine Blindverkostung braucht ein Wein mindestens zwei Angaben, zum Beispiel Rebsorte, Herkunft oder Jahrgang.';
/** Weinarten für den Tipp: dieselben Werte wie im Händlerportal und bei eigenen Weinen. */
export const WEINART_TIPP_WERTE: readonly string[] = WEINART_WERTE;

// ── Text vereinheitlichen ─────────────────────────────────────────────────────

/**
 * Klein geschrieben, Umlaute als ae/oe/ue, ß als ss, Akzente entfernt, alle anderen Zeichen
 * (Satzzeichen, Bindestriche, Mittelpunkt) zu einem Leerzeichen; mehrfache Leerzeichen zusammengefasst.
 * Beispiel: „Xarel·lo“ → „xarel lo“, „Müller-Thurgau“ → „mueller thurgau“. Nicht-Text ergibt „“.
 */
export function normalizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
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

const tokens = (s: unknown): string[] => {
  const n = normalizeText(s);
  return n ? n.split(' ') : [];
};

// ── Katalog-Index ─────────────────────────────────────────────────────────────

/** Alle Schreibweisen eines Eintrags: Bezeichnung, Bezeichnung ohne Klammerzusatz, Aliase. */
export function katalogNamen(e: KatalogEintrag): string[] {
  const ohneKlammer = e.label.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const namen = [e.label, ohneKlammer, ...(Array.isArray(e.aliases) ? e.aliases : [])]
    .map(normalizeText)
    .filter((n) => n.length > 0);
  return namen.filter((n, i) => namen.indexOf(n) === i);
}

type IndexEintrag = { id: string; tokens: string[] };

function buildIndex(items: readonly KatalogEintrag[]): IndexEintrag[] {
  // Längere Schreibweisen zuerst, damit „Cabernet Sauvignon“ vor einem kürzeren Treffer gewinnt.
  return items
    .flatMap((e) => katalogNamen(e).map((n) => ({ id: e.id, tokens: n.split(' ') })))
    .sort((a, b) => b.tokens.length - a.tokens.length);
}

const REBSORTEN_INDEX = buildIndex(REBSORTEN);
const LAENDER_INDEX = buildIndex(LAENDER);

/** Längster Treffer, der bei Position `i` beginnt, oder `null`. */
function matchAt(words: string[], i: number, index: IndexEintrag[]): IndexEintrag | null {
  for (const e of index) {
    if (i + e.tokens.length > words.length) continue;
    if (e.tokens.every((t, k) => words[i + k] === t)) return e;
  }
  return null;
}

/** Alle Treffer von links nach rechts, ohne Überlappung (der längste gewinnt). */
function findAll(text: unknown, index: IndexEintrag[]): string[] {
  const words = tokens(text);
  const found: string[] = [];
  let i = 0;
  while (i < words.length) {
    const m = matchAt(words, i, index);
    if (m) {
      if (!found.includes(m.id)) found.push(m.id);
      i += m.tokens.length;
    } else {
      i += 1;
    }
  }
  return found;
}

// Trennzeichen zwischen Rebsorten: / , + & ; | sowie „und“ / „and“ als eigenes Wort.
const REBSORTEN_TRENNER = /[/,+&;|]|\s(?:und|and)\s/i;

/**
 * Rebsorten-IDs aus freiem Text, zum Beispiel „Cuvée aus Merlot und Cabernet Sauvignon“ →
 * [merlot, cabernet_sauvignon] oder „Pinot Noir / Spätburgunder“ → [spaetburgunder].
 * Reihenfolge wie im Text, ohne Doppelte. Unbekanntes wird ignoriert.
 */
export function matchRebsorten(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const out: string[] = [];
  for (const teil of text.split(REBSORTEN_TRENNER)) {
    for (const id of findAll(teil, REBSORTEN_INDEX)) if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Land-ID aus `herkunft` (zum Beispiel „Frankreich“, „Italia“, „Österreich, Wachau“) oder `null`. */
export function matchLand(text: unknown): string | null {
  return findAll(text, LAENDER_INDEX)[0] ?? null;
}

/**
 * Suche im Katalog für die Tipp-Auswahl: findet Bezeichnung und Aliase (auch mitten im Wort).
 * Treffer am Anfang zuerst, dann am Wortanfang, dann irgendwo. Ohne Suchtext die ersten Einträge.
 */
export function searchCatalog<T extends KatalogEintrag>(items: readonly T[], query: unknown, limit = 8): T[] {
  const max = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
  const q = normalizeText(query);
  if (!q) return items.slice(0, max);
  const scored: { item: T; score: number; i: number }[] = [];
  items.forEach((item, i) => {
    let best = Infinity;
    for (const n of katalogNamen(item)) {
      if (n.startsWith(q)) best = Math.min(best, 0);
      else if (n.split(' ').some((w) => w.startsWith(q))) best = Math.min(best, 1);
      else if (n.replace(/ /g, '').includes(q.replace(/ /g, ''))) best = Math.min(best, 2);
    }
    if (best < Infinity) scored.push({ item, score: best, i });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, max)
    .map((s) => s.item);
}

// ── Wahrheit eines Weins und Eignung ──────────────────────────────────────────

/** Was die Blindverkostung über einen Weinkeller-Eintrag wissen muss. */
export type BlindKandidat = {
  ref: WineRef;
  persisted: boolean;
  wine: { type?: string | null; vintage?: number | null; country?: string | null; region?: string | null; grape?: string | null };
  custom?: {
    weinart?: string | null;
    jahrgang?: string | null;
    herkunft?: string | null;
    region?: string | null;
    rebsorte?: string | null;
  } | null;
};

const textOf = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Momentaufnahme der tatsächlichen Angaben eines Weins. Eigene Weine nehmen die Felder aus
 * `custom_wines`, Marktplatzweine die Felder des Weins (Weinart = Anzeige-Typ). Bereinigt.
 */
export function blindTruthFromEntry(entry: BlindKandidat | null | undefined): BlindWahrheit {
  if (!isObj(entry) || !isObj(entry.wine)) return {};
  const w = entry.wine;
  const c = isObj(entry.custom) ? entry.custom : null;
  const vintage = typeof w.vintage === 'number' && Number.isInteger(w.vintage) && w.vintage > 0 ? String(w.vintage) : undefined;
  const roh: BlindWahrheit = {
    weinart: c ? textOf(c.weinart) : textOf(w.type),
    land: matchLand(c ? c.herkunft : w.country) ?? undefined,
    region: textOf(c ? c.region : w.region),
    rebsorten: matchRebsorten(c ? c.rebsorte : w.grape),
    jahrgang: c ? textOf(c.jahrgang) : vintage,
  };
  return sanitizeTastingData({ blind: { wahrheit: roh } }).blind?.wahrheit ?? {};
}

const isJahr = (v: unknown): v is string => typeof v === 'string' && /^\d{4}$/.test(v.trim());

/** Felder der Wahrheit, die sich vergleichen lassen (Rebsorte und Land nur, wenn erkannt). */
export function comparableFields(truth: BlindWahrheit | null | undefined): BlindFeld[] {
  const t = isObj(truth) ? truth : {};
  const felder: BlindFeld[] = [];
  if (weinartToKategorie(t.weinart) !== 'unbekannt') felder.push('weinart');
  if (typeof t.land === 'string' && t.land) felder.push('land');
  if (textOf(t.region)) felder.push('region');
  if (Array.isArray(t.rebsorten) && t.rebsorten.length > 0) felder.push('rebsorte');
  if (isJahr(t.jahrgang)) felder.push('jahrgang');
  return felder;
}

/**
 * Geeignet für die Blindverkostung: verkostbar (in Supabase gespeichert, echte WineRef wie in Teil B)
 * und mindestens zwei vergleichbare Angaben aus Weinart, Land, Region, Rebsorte und Jahrgang.
 */
export function isBlindEligible(wine: BlindKandidat | null | undefined): boolean {
  if (!isObj(wine) || wine.persisted !== true || !isStoredWineRef(wine.ref)) return false;
  return comparableFields(blindTruthFromEntry(wine)).length >= 2;
}

/** Nur geeignete Weine, Reihenfolge bleibt. */
export function selectBlindWines<T extends BlindKandidat>(wines: readonly T[] | null | undefined): T[] {
  return Array.isArray(wines) ? wines.filter((w) => isBlindEligible(w)) : [];
}

/**
 * Zufälliger geeigneter Wein; `rng` liefert eine Zahl in [0, 1) (zum Beispiel `Math.random`).
 * Werte außerhalb werden begrenzt. Ohne geeigneten Wein `null`.
 */
export function pickRandomBlindWine<T extends BlindKandidat>(
  wines: readonly T[] | null | undefined,
  rng: () => number,
): T | null {
  const geeignet = selectBlindWines(wines);
  if (geeignet.length === 0) return null;
  let r = 0;
  try {
    r = typeof rng === 'function' ? Number(rng()) : 0;
  } catch {
    r = 0;
  }
  if (!Number.isFinite(r)) r = 0;
  const i = Math.min(geeignet.length - 1, Math.max(0, Math.floor(r * geeignet.length)));
  return geeignet[i];
}

// ── Auswertung ────────────────────────────────────────────────────────────────

export type BlindFeld = 'weinart' | 'land' | 'region' | 'rebsorte' | 'jahrgang';
export const BLIND_FELDER: readonly BlindFeld[] = ['weinart', 'land', 'region', 'rebsorte', 'jahrgang'];
export const BLIND_FELD_LABELS: Record<BlindFeld, string> = {
  weinart: 'Weinart',
  land: 'Land',
  region: 'Region',
  rebsorte: 'Rebsorte',
  jahrgang: 'Jahrgang',
};

export type BlindErgebnis = 'richtig' | 'knapp' | 'falsch' | 'nicht_getippt' | 'nicht_bewertbar';

export type BlindFeldAuswertung = {
  feld: BlindFeld;
  ergebnis: BlindErgebnis;
  /** Dein Tipp zum Anzeigen, `null` = nicht getippt */
  tipp: string | null;
  /** Tatsächlicher Wert zum Anzeigen, `null` = keine Angabe */
  wirklich: string | null;
  /** Nur Jahrgang: Abstand in Jahren (bei knapp und falsch) */
  differenzJahre?: number;
};

export type BlindAuswertung = {
  felder: BlindFeldAuswertung[];
  /** Anzahl richtiger Felder */
  richtig: number;
  /** Anzahl getippter und bewertbarer Felder (richtig, knapp oder falsch) */
  bewertet: number;
};

/** Die Tipps, wie sie in `data.blind` stehen (ohne Momentaufnahme). */
export type BlindTipps = Pick<TastingBlind, 'weinart_tipp' | 'land_tipp' | 'region_tipp' | 'rebsorten_tipp' | 'jahrgang_tipp'>;

const labels = (ids: string[] | undefined, label: (id: string) => string | undefined) =>
  ids && ids.length > 0 ? ids.map((id) => label(id) ?? id).join(', ') : null;

/**
 * Vergleicht die Tipps mit der Momentaufnahme. Beide werden vorher bereinigt (unbekannte IDs,
 * ungültige Jahreszahlen und überlange Texte fallen weg). Ohne Angabe beim Wein ist ein Feld
 * `nicht_bewertbar`, ohne Tipp `nicht_getippt`.
 */
export function scoreBlindGuess(guess: BlindTipps | null | undefined, truth: BlindWahrheit | null | undefined): BlindAuswertung {
  const g = sanitizeTastingData({ blind: isObj(guess) ? { ...guess, wahrheit: undefined } : {} }).blind ?? {};
  const t = sanitizeTastingData({ blind: { wahrheit: isObj(truth) ? truth : {} } }).blind?.wahrheit ?? {};
  const felder: BlindFeldAuswertung[] = [];

  // Weinart: gleiche Kategorie
  {
    const tk = weinartToKategorie(t.weinart);
    const gk: WeinKategorie = weinartToKategorie(g.weinart_tipp);
    const ergebnis: BlindErgebnis =
      tk === 'unbekannt' ? 'nicht_bewertbar' : !g.weinart_tipp ? 'nicht_getippt' : gk === tk ? 'richtig' : 'falsch';
    felder.push({ feld: 'weinart', ergebnis, tipp: g.weinart_tipp ?? null, wirklich: t.weinart ?? null });
  }
  // Land: gleiche ID
  {
    const ergebnis: BlindErgebnis = !t.land ? 'nicht_bewertbar' : !g.land_tipp ? 'nicht_getippt' : g.land_tipp === t.land ? 'richtig' : 'falsch';
    felder.push({
      feld: 'land',
      ergebnis,
      tipp: g.land_tipp ? landLabel(g.land_tipp) ?? g.land_tipp : null,
      wirklich: t.land ? landLabel(t.land) ?? t.land : null,
    });
  }
  // Region: gleicher Text oder einer enthält den anderen (mindestens drei Zeichen)
  {
    const tn = normalizeText(t.region);
    const gn = normalizeText(g.region_tipp);
    const enthaelt = (a: string, b: string) => b.length >= 3 && ` ${a} `.includes(` ${b} `);
    const ergebnis: BlindErgebnis = !tn
      ? 'nicht_bewertbar'
      : !gn
        ? 'nicht_getippt'
        : gn === tn || enthaelt(tn, gn) || enthaelt(gn, tn)
          ? 'richtig'
          : 'falsch';
    felder.push({ feld: 'region', ergebnis, tipp: g.region_tipp ?? null, wirklich: t.region ?? null });
  }
  // Rebsorte: gleiche Menge = richtig, Überschneidung = knapp
  {
    const ts = t.rebsorten ?? [];
    const gs = g.rebsorten_tipp ?? [];
    const gemeinsam = gs.filter((id) => ts.includes(id)).length;
    const gleich = gemeinsam === gs.length && gemeinsam === ts.length;
    const ergebnis: BlindErgebnis =
      ts.length === 0 ? 'nicht_bewertbar' : gs.length === 0 ? 'nicht_getippt' : gleich ? 'richtig' : gemeinsam > 0 ? 'knapp' : 'falsch';
    felder.push({ feld: 'rebsorte', ergebnis, tipp: labels(gs, rebsorteLabel), wirklich: labels(ts, rebsorteLabel) });
  }
  // Jahrgang: gleiches Jahr = richtig, ein Jahr Abstand = knapp
  {
    const tj = isJahr(t.jahrgang) ? Number(t.jahrgang) : null;
    const gj = g.jahrgang_tipp ? Number(g.jahrgang_tipp) : null;
    const eintrag: BlindFeldAuswertung = { feld: 'jahrgang', ergebnis: 'nicht_bewertbar', tipp: g.jahrgang_tipp ?? null, wirklich: t.jahrgang ?? null };
    if (tj !== null) {
      if (gj === null) eintrag.ergebnis = 'nicht_getippt';
      else {
        const d = Math.abs(gj - tj);
        eintrag.ergebnis = d === 0 ? 'richtig' : d === 1 ? 'knapp' : 'falsch';
        if (d > 0) eintrag.differenzJahre = d;
      }
    }
    felder.push(eintrag);
  }

  const bewertet = felder.filter((f) => f.ergebnis === 'richtig' || f.ergebnis === 'knapp' || f.ergebnis === 'falsch').length;
  const richtig = felder.filter((f) => f.ergebnis === 'richtig').length;
  return { felder, richtig, bewertet };
}

export const ERGEBNIS_LABELS: Record<BlindErgebnis, string> = {
  richtig: 'Richtig',
  knapp: 'Knapp daneben',
  falsch: 'Daneben',
  nicht_getippt: 'Nicht getippt',
  nicht_bewertbar: 'Nicht bewertbar',
};

/** Ergebnis als Text, beim Jahrgang mit Abstand („2 Jahre daneben“, „Knapp daneben (1 Jahr)“). */
export function ergebnisText(a: Pick<BlindFeldAuswertung, 'ergebnis' | 'differenzJahre'>): string {
  const d = a.differenzJahre;
  if (typeof d === 'number' && d > 0) {
    if (a.ergebnis === 'knapp') return `${ERGEBNIS_LABELS.knapp} (1 Jahr)`;
    if (a.ergebnis === 'falsch') return `${d} Jahre daneben`;
  }
  return ERGEBNIS_LABELS[a.ergebnis] ?? ERGEBNIS_LABELS.nicht_bewertbar;
}

/** „3 von 4 getippten Feldern richtig.“ */
export function blindSummaryText(a: Pick<BlindAuswertung, 'richtig' | 'bewertet'>): string {
  if (!a || !Number.isFinite(a.bewertet) || a.bewertet <= 0) return 'Kein bewertbares Feld getippt.';
  return `${a.richtig} von ${a.bewertet} getippten ${a.bewertet === 1 ? 'Feld' : 'Feldern'} richtig.`;
}

// ── Schritte im Blind-Modus ───────────────────────────────────────────────────

/** Schritt des Assistenten: die fünf Abschnitte des Bogens und im Blind-Modus der Tipp. */
export type WizardStep = TastingStep | 'tipp';

/** Sehen → Riechen → Schmecken → Terroir (ab Erweitert) → Tipp → Fazit. */
export function blindSteps(level: TastingLevel): WizardStep[] {
  const steps: WizardStep[] = [...visibleSteps(level)];
  const i = steps.indexOf('fazit');
  steps.splice(i < 0 ? steps.length : i, 0, 'tipp');
  return steps;
}

/** Schritte des Assistenten je nach Modus. */
export function wizardSteps(level: TastingLevel, blind: boolean): WizardStep[] {
  return blind ? blindSteps(level) : visibleSteps(level);
}

export function stepAfter(steps: readonly WizardStep[], current: WizardStep): WizardStep | null {
  const i = steps.indexOf(current);
  if (i < 0) return steps[0] ?? null;
  return steps[i + 1] ?? null;
}

export function stepBefore(steps: readonly WizardStep[], current: WizardStep): WizardStep | null {
  const i = steps.indexOf(current);
  return i <= 0 ? null : steps[i - 1];
}

/** Startschritt beim Fortsetzen: der gespeicherte Schritt, wenn er vorkommt, sonst der erste. */
export function resumeWizardStep(step: unknown, steps: readonly WizardStep[]): WizardStep {
  return typeof step === 'string' && (steps as readonly string[]).includes(step) ? (step as WizardStep) : steps[0] ?? 'sehen';
}

/** Nur die Tipps aus `data.blind` (bereinigt, ohne Momentaufnahme und ohne das alte Feld rebsorte_tipp). */
export function blindTipps(blind: unknown): BlindTipps {
  const b = sanitizeTastingData({ blind: isObj(blind) ? blind : {} }).blind ?? {};
  const out: BlindTipps = {};
  if (b.weinart_tipp) out.weinart_tipp = b.weinart_tipp;
  if (b.land_tipp) out.land_tipp = b.land_tipp;
  if (b.region_tipp) out.region_tipp = b.region_tipp;
  if (b.rebsorten_tipp) out.rebsorten_tipp = b.rebsorten_tipp;
  if (b.jahrgang_tipp) out.jahrgang_tipp = b.jahrgang_tipp;
  return out;
}

/** true, wenn im Schritt Tipp mindestens ein Feld ausgefüllt ist. */
export function isBlindTippFilled(blind: unknown): boolean {
  return Object.keys(blindTipps(blind)).length > 0;
}

/**
 * Daten zum Speichern einer Blindverkostung: der Bogen wie gewohnt bereinigt (nur, was bei
 * Kategorie und Stufe sichtbar war), dazu die Tipps und die Momentaufnahme `wahrheit`.
 */
export function buildBlindSaveData(
  data: TastingData | null | undefined,
  kategorie: WeinKategorie,
  level: TastingLevel,
  truth: BlindWahrheit | null | undefined,
): TastingData {
  const bogen = pruneTastingData(data, kategorie, level);
  const tipps = blindTipps(isObj(data) ? data.blind : undefined);
  return sanitizeTastingData({ ...bogen, blind: { ...tipps, wahrheit: isObj(truth) ? truth : undefined } });
}

/** Jahrgangs-Eingabe: nur Ziffern, höchstens vier. */
export function cleanJahrgangInput(text: unknown): string {
  return typeof text === 'string' ? text.replace(/\D+/g, '').slice(0, 4) : '';
}

// ── Gastgeber-Weg ─────────────────────────────────────────────────────────────

export const BLIND_ERKLAERUNG_ZUFALL = 'Zufällig: Die App wählt einen Wein. Ein Gastgeber kann ihn einsehen und einschenken.';
export const BLIND_ERKLAERUNG_SELBST = 'Selbst wählen: Du oder dein Gastgeber wählt die Flasche. Du siehst dann die Namen.';
export const HOST_REVEAL_BUTTON = 'Für den Gastgeber: Wein anzeigen';
export const HOST_REVEAL_FRAGE = 'Das verrät den Wein. Zeige ihn nur dem Gastgeber.';

/**
 * Der Button für den Gastgeber erscheint nur im Blind-Modus und nur vor dem ersten Schritt:
 * auf dem Startbildschirm (`start`) und bei der Frage nach einem Entwurf (`frage`, Rückkehr über
 * „Weitermachen“). Sobald der Assistent läuft (`bogen`) oder fertig ist, nicht mehr.
 */
export function canShowHostReveal(state: { blind?: unknown; phase?: unknown } | null | undefined): boolean {
  if (!isObj(state) || state.blind !== true) return false;
  return state.phase === 'start' || state.phase === 'frage';
}

/** Was der Gastgeber sieht: nur Name, Weingut (falls vorhanden) und Jahrgang. */
export type HostRevealInfo = { name: string; weingut: string | null; jahrgang: string | null };

/**
 * Angaben für das Fenster des Gastgebers. Bewusst keine Rebsorte, Region oder Herkunft, damit die
 * Auflösung später nicht verdorben wird. Das Weingut gibt es nur bei eigenen Weinen (bei
 * Marktplatzweinen enthält `winery` Rebsorte und Region und wird deshalb nicht gezeigt).
 */
export function hostRevealInfo(
  entry: { wine?: { name?: unknown; vintage?: unknown } | null; custom?: { weingut?: unknown; jahrgang?: unknown } | null } | null | undefined,
): HostRevealInfo {
  const w = isObj(entry) && isObj(entry.wine) ? entry.wine : {};
  const c = isObj(entry) && isObj(entry.custom) ? entry.custom : null;
  const vintage = typeof w.vintage === 'number' && Number.isInteger(w.vintage) && w.vintage > 0 ? String(w.vintage) : null;
  return {
    name: textOf(w.name) ?? '',
    weingut: c ? textOf(c.weingut) ?? null : null,
    jahrgang: c ? textOf(c.jahrgang) ?? null : vintage,
  };
}

// ── Routenparameter ───────────────────────────────────────────────────────────

/** `blind=1` schaltet den Blind-Modus ein; jeder andere Wert wird ignoriert. */
export function parseBlindParam(v: string | string[] | undefined | null): boolean {
  const first = Array.isArray(v) ? v[0] : v;
  return first === '1';
}
