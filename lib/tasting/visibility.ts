// Was erscheint im Verkostungsbogen bei welcher Weinkategorie und Stufe? (reine Funktionen)
//
// Skalen, Farben, Randfarben, Aromen und Fehlnoten kommen aus den Katalogen über die Funktionen in
// `catalog.ts`; deren Feld `stufe` bzw. `ab_stufe` entscheidet. Für Felder ohne Katalogeintrag
// (Klarheit, Zustand, Trinkreife …) legt `FELD_AB_STUFE` hier die Mindeststufe fest.
import {
  getAromaStufen,
  getFarben,
  getFehler,
  getRandFarben,
  getSkalen,
  isLevelIncluded,
  isWeinKategorie,
  DEFAULT_KATEGORIE,
} from './catalog';
import { sanitizeTastingData } from './validate';
import {
  Aroma,
  AromaStufeKatalog,
  Farbe,
  Skala,
  TASTING_LEVELS,
  TASTING_STEPS,
  TastingData,
  TastingLevel,
  TastingStep,
  WeinKategorie,
} from './types';

/** Felder des Bogens, die keine Skala sind. */
export type TastingFeld =
  | 'klarheit'
  | 'farbe'
  | 'rand'
  | 'zustand'
  | 'aromen'
  | 'fehler'
  | 'aromen_gaumen'
  | 'eindruecke'
  | 'klima_eindruck'
  | 'boden_tipp'
  | 'trinkreife'
  | 'lagerpotenzial'
  | 'notiz'
  | 'sterne';

/** Zu welchem Schritt ein Feld gehört und ab welcher Stufe es erscheint. */
export const FELD_AB_STUFE: Record<TastingFeld, { step: TastingStep; ab: TastingLevel }> = {
  klarheit: { step: 'sehen', ab: 'einfach' },
  farbe: { step: 'sehen', ab: 'einfach' },
  rand: { step: 'sehen', ab: 'profi' },
  zustand: { step: 'riechen', ab: 'einfach' },
  aromen: { step: 'riechen', ab: 'einfach' },
  fehler: { step: 'riechen', ab: 'profi' },
  aromen_gaumen: { step: 'schmecken', ab: 'erweitert' },
  eindruecke: { step: 'terroir', ab: 'erweitert' },
  klima_eindruck: { step: 'terroir', ab: 'erweitert' },
  boden_tipp: { step: 'terroir', ab: 'profi' },
  trinkreife: { step: 'fazit', ab: 'einfach' },
  lagerpotenzial: { step: 'fazit', ab: 'erweitert' },
  notiz: { step: 'fazit', ab: 'einfach' },
  sterne: { step: 'fazit', ab: 'einfach' },
};

const FELD_REIHENFOLGE = Object.keys(FELD_AB_STUFE) as TastingFeld[];

/** Ab dieser Stufe gibt es den Schritt Terroir. Im Modus Einfach entfällt er. */
export const TERROIR_AB_STUFE: TastingLevel = 'erweitert';

const normLevel = (level: TastingLevel): TastingLevel =>
  (TASTING_LEVELS as readonly string[]).includes(level) ? level : 'einfach';
const normKategorie = (k: WeinKategorie): WeinKategorie => (isWeinKategorie(k) ? k : DEFAULT_KATEGORIE);

// ── Schritte ──────────────────────────────────────────────────────────────────

/** Schritte in der gewählten Stufe, in fester Reihenfolge. */
export function visibleSteps(level: TastingLevel): TastingStep[] {
  const l = normLevel(level);
  return TASTING_STEPS.filter((s) => s !== 'terroir' || isLevelIncluded(TERROIR_AB_STUFE, l));
}

export function isStepVisible(step: TastingStep, level: TastingLevel): boolean {
  return visibleSteps(level).includes(step);
}

/** Nächster sichtbarer Schritt oder `null` am Ende. */
export function nextStep(current: TastingStep, level: TastingLevel): TastingStep | null {
  const steps = visibleSteps(level);
  const i = steps.indexOf(current);
  if (i < 0) return steps[0] ?? null;
  return steps[i + 1] ?? null;
}

/** Vorheriger sichtbarer Schritt oder `null` am Anfang. */
export function previousStep(current: TastingStep, level: TastingLevel): TastingStep | null {
  const steps = visibleSteps(level);
  const i = steps.indexOf(current);
  if (i <= 0) return null;
  return steps[i - 1];
}

/** Startschritt: ein gespeicherter Schritt, wenn er in der Stufe sichtbar ist, sonst der erste. */
export function resumeStep(step: TastingStep | null | undefined, level: TastingLevel): TastingStep {
  const steps = visibleSteps(level);
  return step && steps.includes(step) ? step : steps[0];
}

// ── Felder je Schritt ─────────────────────────────────────────────────────────

/** Nicht-Skalen-Felder eines Schritts, die in der Stufe erscheinen. */
export function visibleFields(step: TastingStep, level: TastingLevel): TastingFeld[] {
  const l = normLevel(level);
  if (!isStepVisible(step, l)) return [];
  return FELD_REIHENFOLGE.filter((f) => FELD_AB_STUFE[f].step === step && isLevelIncluded(FELD_AB_STUFE[f].ab, l));
}

export function isFieldVisible(feld: TastingFeld, level: TastingLevel): boolean {
  return visibleFields(FELD_AB_STUFE[feld].step, level).includes(feld);
}

/** Reihenfolge der Skalen innerhalb eines Schritts (nicht im Katalog festgelegt). */
const SKALEN_REIHENFOLGE = [
  'farbintensitaet', 'viskositaet', 'perlage',
  'intensitaet_nase',
  'suesse', 'saeure', 'tannin', 'koerper', 'alkohol', 'abgang', 'balance', 'mousse',
  'qualitaet',
];

/** Schritt, zu dem eine Skala gehört (aus dem Pfad im Feld `feld`, zum Beispiel „schmecken.suesse“). */
export function skalaStep(skala: Skala): TastingStep | null {
  const step = skala.feld.split('.')[0];
  return (TASTING_STEPS as readonly string[]).includes(step) ? (step as TastingStep) : null;
}

/** Schlüssel einer Skala in ihrem Abschnitt, zum Beispiel „suesse“ für „schmecken.suesse“. */
export function skalaKey(skala: Skala): string {
  return skala.feld.split('.')[1] ?? skala.id;
}

/** Skalen eines Schritts für Kategorie und Stufe (Filter aus `catalog.ts`), in fester Reihenfolge. */
export function stepSkalen(step: TastingStep, kategorie: WeinKategorie, level: TastingLevel): Skala[] {
  const l = normLevel(level);
  if (!isStepVisible(step, l)) return [];
  const rang = (s: Skala) => {
    const i = SKALEN_REIHENFOLGE.indexOf(s.id);
    return i < 0 ? SKALEN_REIHENFOLGE.length : i;
  };
  return getSkalen(normKategorie(kategorie), l)
    .filter((s) => skalaStep(s) === step)
    .sort((a, b) => rang(a) - rang(b));
}

/** Farbfelder für den Schritt Sehen (alle Stufen). */
export function visibleFarben(kategorie: WeinKategorie): Farbe[] {
  return getFarben(normKategorie(kategorie));
}

/** Randfarben (nur Profi und nur, wenn die Kategorie welche hat). */
export function visibleRandFarben(kategorie: WeinKategorie, level: TastingLevel): Farbe[] {
  return getRandFarben(normKategorie(kategorie), normLevel(level));
}

/**
 * Aroma-Stufen für Nase und Gaumen. Im Modus Einfach nur Primäraromen, auch wenn der Katalog
 * Sekundäraromen schon ab Einfach erlaubt (bewusst kurz gehalten).
 */
export function visibleAromaStufen(kategorie: WeinKategorie, level: TastingLevel): AromaStufeKatalog[] {
  const l = normLevel(level);
  const stufen = getAromaStufen(normKategorie(kategorie), l);
  return l === 'einfach' ? stufen.filter((s) => s.id === 'primaer') : stufen;
}

/** Fehlnoten (nur Profi und nur, wenn der Zustand der Nase „auffällig“ ist). */
export function visibleFehler(level: TastingLevel, zustand: string | null | undefined): Aroma[] {
  return zustand === 'auffaellig' ? getFehler(normLevel(level)) : [];
}

// ── Inhalt prüfen ─────────────────────────────────────────────────────────────

const hatWert = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

/** true, wenn im Bogen irgendetwas eingetragen ist (nach Bereinigung). */
export function hasAnyInput(data: TastingData | null | undefined): boolean {
  return Object.keys(sanitizeTastingData(data)).length > 0;
}

/**
 * Entfernt alles, was bei Kategorie und Stufe nicht angezeigt wird (zum Beispiel Tannin bei
 * Weißwein, Fehlnoten bei sauberer Nase oder Terroir im Modus Einfach). Ergebnis ist bereinigt.
 */
export function pruneTastingData(data: TastingData | null | undefined, kategorie: WeinKategorie, level: TastingLevel): TastingData {
  const clean = sanitizeTastingData(data);
  const l = normLevel(level);
  const kat = normKategorie(kategorie);
  const out: Record<string, Record<string, unknown>> = {};

  const skalenKeys = (step: TastingStep) => new Set(stepSkalen(step, kat, l).map(skalaKey));
  const felder = (step: TastingStep) => new Set<string>(visibleFields(step, l));

  for (const step of TASTING_STEPS) {
    const abschnitt = (clean as Record<string, Record<string, unknown> | undefined>)[step];
    if (!abschnitt || !isStepVisible(step, l)) continue;
    const erlaubt = new Set<string>([...skalenKeys(step), ...felder(step)]);
    // In data heißt die Skala „Intensität“ im Abschnitt riechen/sehen einfach „intensitaet“.
    const kept: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(abschnitt)) {
      if (erlaubt.has(key)) kept[key] = value;
    }
    out[step] = kept;
  }

  // Farbe und Randfarbe müssen zur Kategorie passen.
  if (out.sehen) {
    if (out.sehen.farbe && !visibleFarben(kat).some((f) => f.id === out.sehen.farbe)) delete out.sehen.farbe;
    if (out.sehen.rand && !visibleRandFarben(kat, l).some((f) => f.id === out.sehen.rand)) delete out.sehen.rand;
  }
  // Fehlnoten nur bei auffälliger Nase; Aromen nur aus sichtbaren Stufen.
  if (out.riechen) {
    if (out.riechen.zustand !== 'auffaellig') delete out.riechen.fehler;
    const aromen = out.riechen.aromen as Record<string, string[]> | undefined;
    if (aromen) {
      const sichtbar = new Set<string>(visibleAromaStufen(kat, l).map((s) => s.id));
      out.riechen.aromen = {
        primaer: sichtbar.has('primaer') ? aromen.primaer : [],
        sekundaer: sichtbar.has('sekundaer') ? aromen.sekundaer : [],
        tertiaer: sichtbar.has('tertiaer') ? aromen.tertiaer : [],
      };
    }
  }
  return sanitizeTastingData(out);
}

/** true, wenn in einem Schritt mindestens ein sichtbares Feld ausgefüllt ist (für die Fortschrittsanzeige). */
export function isStepFilled(
  step: TastingStep,
  data: TastingData | null | undefined,
  kategorie: WeinKategorie,
  level: TastingLevel,
): boolean {
  if (!isStepVisible(step, level)) return false;
  const pruned = pruneTastingData(data, kategorie, level) as Record<string, Record<string, unknown> | undefined>;
  const abschnitt = pruned[step];
  return !!abschnitt && Object.values(abschnitt).some(hatWert);
}

/** Ausgefüllte Schritte in der Reihenfolge des Bogens. */
export function filledSteps(data: TastingData | null | undefined, kategorie: WeinKategorie, level: TastingLevel): TastingStep[] {
  return visibleSteps(level).filter((s) => isStepFilled(s, data, kategorie, level));
}
