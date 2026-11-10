// Typen für „Mein Weinkeller“ (Teil A2).
// Ein Weinkeller-Eintrag ist entweder ein Marktplatzwein (purchased_wines + wines) oder ein
// eigener, von Hand angelegter Wein (custom_wines). Beide tragen eine WineRef.
import type { Wine } from '../../types';
import type { WineRef } from '../tasting/types';

/** Platzhalterbild für Weine ohne Bild (wie bisher bei der freien Eingabe). */
export const CELLAR_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=800&q=80';

/** Herkunft eines Eintrags in der App (wie bisher im CellarContext). */
export type CellarSource = 'purchase' | 'manual' | 'scanner';
export const CELLAR_SOURCES: readonly CellarSource[] = ['purchase', 'manual', 'scanner'];

/** Herkunft eines eigenen Weins in `custom_wines.source`. `scan` ist für später vorgesehen. */
export type CustomWineSource = 'manual' | 'scan';

/** Eine Zeile aus `public.custom_wines` (camelCase). */
export type CustomWine = {
  id: string;
  userId: string;
  name: string;
  weingut: string | null;
  weinart: string | null;
  jahrgang: string | null;
  herkunft: string | null;
  region: string | null;
  rebsorte: string | null;
  preis: number | null;
  flaschengroesse: string | null;
  quantity: number;
  boden: string | null;
  source: CustomWineSource;
  rating: number | null;
  notiz: string | null;
  bildUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Rohwerte aus dem Formular „Eigenen Wein anlegen“ (Texte, wie eingetippt). */
export type CustomWineInput = {
  name?: unknown;
  weingut?: unknown;
  weinart?: unknown;
  jahrgang?: unknown;
  herkunft?: unknown;
  region?: unknown;
  rebsorte?: unknown;
  quantity?: unknown;
  preis?: unknown;
  boden?: unknown;
  flaschengroesse?: unknown;
};

/** Bereinigte Werte, bereit zum Speichern in `custom_wines`. */
export type CustomWineValues = {
  name: string;
  weingut: string | null;
  weinart: string | null;
  jahrgang: string | null;
  herkunft: string | null;
  region: string | null;
  rebsorte: string | null;
  quantity: number;
  preis: number | null;
  boden: string | null;
  flaschengroesse: string | null;
};

export type CustomWineField = keyof CustomWineValues;
export type CustomWineErrors = Partial<Record<CustomWineField, string>>;

/** Normalisierte Zeile aus `public.purchased_wines` (Spalten sind nur teilweise bekannt). */
export type PurchaseRow = {
  id: string | null;
  wineId: string;
  quantity: number;
  purchasedAt: string | null;
  source: string | null;
};

/** Normalisierte Zeile aus `public.reviews` (eigene Bewertung je Wein). */
export type ReviewRow = {
  wineId: string;
  rating: number | null;
  text: string | null;
  date: string | null;
};

/** Ein Eintrag im Weinkeller, wie ihn die Oberfläche anzeigt. */
export interface CellarWine {
  /** Eindeutiger Listen-Schlüssel, z. B. „market:<wine_id>“ oder „custom:<id>“ */
  id: string;
  /** Verweis für den Verkostungsbogen */
  ref: WineRef;
  wine: Wine;
  quantity: number;
  addedAt: Date;
  source: CellarSource;
  purchaseDate?: Date;
  rating?: number;
  notes?: string;
  ratedAt?: string;
  /** true, wenn der Eintrag in Supabase liegt; false = nur im Arbeitsspeicher */
  persisted: boolean;
  /** Bei eigenen Weinen die vollständigen Daten (zum Bearbeiten) */
  custom?: CustomWine;
  /** Bei gespeicherten Marktplatzweinen die zugehörigen Zeilen aus purchased_wines */
  purchases?: PurchaseRow[];
}

/** Ergebnis einer Weinkeller-Funktion: Daten oder eine deutsche Fehlermeldung. */
export type CellarResult<T> = { ok: true; data: T } | { ok: false; error: string };
