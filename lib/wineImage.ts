// Reine Funktionen für die Weinbild-Darstellung (`components/WineImage.tsx`):
// Ist eine Bildadresse ladbar? Welche Farbe hat die Flaschen-Silhouette je Weinart?
// Welche Maße gelten für die Größen-Voreinstellungen? Ohne React Native, damit das Prüfskript
// (npm run check:cellar) sie direkt testen kann.
import { weinartToKategorie } from './tasting/catalog';
import type { WeinKategorie } from './tasting/types';

// ── Bildadresse ───────────────────────────────────────────────────────────────

// https://, danach ein Hostname mit mindestens einem Punkt, danach optional Pfad, Suche oder Anker.
// Keine Leerzeichen erlaubt.
const HTTPS_URI = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+(:\d{1,5})?([/?#][^\s]*)?$/i;

/**
 * Gibt die bereinigte Adresse zurück, wenn sie geladen werden darf, sonst `null`.
 * Nur `https://`-Adressen gelten. Leer, `null`, `undefined`, nur Leerzeichen, `http://`
 * oder Text ohne Schema ergeben `null` (das heißt: „kein Bild“, der Platzhalter erscheint). Wirft nie.
 */
export function normalizeWineImageUri(uri: unknown): string | null {
  if (typeof uri !== 'string') return null;
  const text = uri.trim();
  if (!text || !HTTPS_URI.test(text)) return null;
  return text;
}

/** true, wenn die Adresse geladen werden darf (siehe `normalizeWineImageUri`). */
export function isLoadableWineImageUri(uri: unknown): boolean {
  return normalizeWineImageUri(uri) !== null;
}

// ── Platzhalterfarbe ──────────────────────────────────────────────────────────

/** Farbe der Flaschen-Silhouette je Weinkategorie (auf der hellen Fläche gut sichtbar). */
export const WINE_TINTS: Record<WeinKategorie, string> = {
  rot: '#7a1f2e',
  weiss: '#d8c35a',
  rose: '#e09aa8',
  schaum: '#a3b07e',
  orange: '#d68a3c',
  suess: '#b07a2a',
  // Unbekannte oder fehlende Weinart: neutral grau, nicht als Rotwein getönt.
  unbekannt: '#a9a39b',
};

/** Farbe der Silhouette für eine Weinart (Text aus der Datenbank oder `Wine.type`). Wirft nie. */
export function wineImageTint(weinart: unknown): string {
  return WINE_TINTS[weinartToKategorie(weinart)] ?? WINE_TINTS.unbekannt;
}

/**
 * Die Weinart, nach der der Platzhalter getönt wird. Bevorzugt die ursprüngliche Angabe aus der
 * Datenbank (`weinartRoh`, ohne den Rückfall auf „Rotwein“), damit Weine ohne Weinart neutral
 * bleiben. Fehlt das Feld ganz (zum Beispiel beim Scanner), gilt der Anzeige-Typ `type`.
 */
export function wineImageWeinart(wine: { type?: unknown; weinartRoh?: string | null }): unknown {
  return wine.weinartRoh !== undefined ? wine.weinartRoh : wine.type;
}

// ── Barrierefreiheit ──────────────────────────────────────────────────────────

export const WINE_IMAGE_LABEL_LEER = 'Kein Bild vorhanden';

/** „Flasche <Name>“ bei einem Bild, sonst „Kein Bild vorhanden“. */
export function wineImageLabel(name: unknown, hatBild: boolean): string {
  if (!hatBild) return WINE_IMAGE_LABEL_LEER;
  const n = typeof name === 'string' ? name.trim() : '';
  return n ? `Flasche ${n}` : 'Flasche';
}

// ── Größen-Voreinstellungen ───────────────────────────────────────────────────

export type WineImageSize = 'karte' | 'detail' | 'liste' | 'klein';
export const WINE_IMAGE_SIZE_NAMES: readonly WineImageSize[] = ['karte', 'detail', 'liste', 'klein'];

export type WineImagePreset = {
  /** Breite durch Höhe, wenn die Fläche nicht die Elternfläche füllt (< 1 heißt Hochformat). */
  aspectRatio: number;
  /** Eckenradius, wenn die Fläche nicht die Elternfläche füllt (beim Füllen schneidet die Karte zu). */
  radius: number;
  /** Anteil der Fläche, den Flasche oder Silhouette einnehmen (0,80 bis 0,85). */
  fuellgrad: number;
  /**
   * Abstand in Pixeln von unten, der für überlagerte Inhalte (Verlauf, Name, Preis) frei bleibt.
   * Die Flasche wird im Bereich darüber zentriert.
   */
  freiUnten: number;
};

/**
 * Zentrale Maße je Ort. Karte und Detail eher hoch, Liste und Klein quadratisch.
 * Die Radien entsprechen `radii` aus `theme.ts` (lg 22, sm 8).
 */
export const WINE_IMAGE_PRESETS: Record<WineImageSize, WineImagePreset> = {
  // Swipe-Karte: füllt die Karte; unten liegen Verlauf, Name, Weingut und Preis.
  karte: { aspectRatio: 3 / 4, radius: 22, fuellgrad: 0.82, freiUnten: 190 },
  // Detailansicht (Shop, Scanner, Weinkeller): oben eine Bildfläche mit Verlauf nach unten.
  detail: { aspectRatio: 3 / 4, radius: 22, fuellgrad: 0.84, freiUnten: 90 },
  // Listenkarten (Merkliste, Weinkeller, Warenkorb, Rezept-Empfehlung).
  liste: { aspectRatio: 1, radius: 14, fuellgrad: 0.84, freiUnten: 0 },
  // Kleine Vorschau im Auswahlfenster.
  klein: { aspectRatio: 1, radius: 8, fuellgrad: 0.84, freiUnten: 0 },
};

/** Voreinstellung für einen Namen; unbekannte Namen ergeben `liste`. */
export function wineImagePreset(size: unknown): WineImagePreset {
  return typeof size === 'string' && (WINE_IMAGE_SIZE_NAMES as readonly string[]).includes(size)
    ? WINE_IMAGE_PRESETS[size as WineImageSize]
    : WINE_IMAGE_PRESETS.liste;
}

/** true, wenn alle Maße einer Voreinstellung gültig sind (für das Prüfskript). */
export function isValidWineImagePreset(p: WineImagePreset): boolean {
  return (
    Number.isFinite(p.aspectRatio) && p.aspectRatio > 0 && p.aspectRatio <= 1 &&
    Number.isFinite(p.radius) && p.radius >= 0 &&
    Number.isFinite(p.fuellgrad) && p.fuellgrad >= 0.8 && p.fuellgrad <= 0.85 &&
    Number.isFinite(p.freiUnten) && p.freiUnten >= 0
  );
}

/** Rand rundherum in Prozent der Fläche, damit die Flasche den Füllgrad erreicht. */
export function wineImageInsetPercent(fuellgrad: number): `${number}%` {
  const f = Number.isFinite(fuellgrad) ? Math.min(Math.max(fuellgrad, 0.5), 1) : 0.84;
  return `${Math.round(((1 - f) / 2) * 1000) / 10}%`;
}

/**
 * Schriftgröße des Silhouetten-Icons für einen Bereich (Breite × Höhe in Pixeln).
 * Die Flasche im Icon ist etwa so hoch wie das Icon und knapp halb so breit.
 */
export function silhouetteIconSize(breite: number, hoehe: number): number {
  if (!(breite > 0) || !(hoehe > 0)) return 0;
  return Math.max(12, Math.floor(Math.min(hoehe, breite * 2.2)));
}
