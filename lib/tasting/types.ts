// Typen für den Verkostungsbogen (Teil A: Fundament).
// Katalog-IDs werden in `tasting_notes.data` gespeichert und dürfen nie umbenannt werden.

// ── Grundbegriffe ─────────────────────────────────────────────────────────────

/** Wert auf einer Skala von 1 bis 5. */
export type Skalenwert = 1 | 2 | 3 | 4 | 5;

/** Gewählte Stufe des Bogens. Reihenfolge: einfach < erweitert < profi. */
export type TastingLevel = 'einfach' | 'erweitert' | 'profi';
export const TASTING_LEVELS: readonly TastingLevel[] = ['einfach', 'erweitert', 'profi'];

/** Weinkategorie für Farben und Skalen. `unbekannt` ist die neutrale Standardkategorie. */
export type WeinKategorie = 'weiss' | 'rose' | 'rot' | 'schaum' | 'orange' | 'suess' | 'unbekannt';
export const WEIN_KATEGORIEN: readonly WeinKategorie[] = [
  'weiss',
  'rose',
  'rot',
  'schaum',
  'orange',
  'suess',
  'unbekannt',
];

/** Schritte des Bogens; auch als Schwerpunkt (`focus`) einer Verkostung nutzbar. */
export type TastingStep = 'sehen' | 'riechen' | 'schmecken' | 'terroir' | 'fazit';
export const TASTING_STEPS: readonly TastingStep[] = ['sehen', 'riechen', 'schmecken', 'terroir', 'fazit'];

export type AromaStufe = 'primaer' | 'sekundaer' | 'tertiaer';
export const AROMA_STUFEN: readonly AromaStufe[] = ['primaer', 'sekundaer', 'tertiaer'];

export type Klarheit = 'klar' | 'trueb';
export type NasenZustand = 'sauber' | 'auffaellig';
export type Trinkreife = 'zu_jung' | 'trinkbar' | 'optimal' | 'ueber_hoehepunkt';
export type Lagerpotenzial = 'kurz' | 'mittel' | 'lang';

export const KLARHEIT_WERTE: readonly Klarheit[] = ['klar', 'trueb'];
export const NASEN_ZUSTAENDE: readonly NasenZustand[] = ['sauber', 'auffaellig'];
export const TRINKREIFE_WERTE: readonly Trinkreife[] = ['zu_jung', 'trinkbar', 'optimal', 'ueber_hoehepunkt'];
export const LAGERPOTENZIAL_WERTE: readonly Lagerpotenzial[] = ['kurz', 'mittel', 'lang'];

/** Maximale Länge der Verkostungsnotiz (Zeichen). */
export const NOTIZ_MAX_LENGTH = 1000;
/** Maximale Länge der Tipps bei der Blindverkostung (Zeichen). */
export const TIPP_MAX_LENGTH = 100;

// ── Aufbau von `tasting_notes.data` (Schema-Version 1) ───────────────────────

export const TASTING_SCHEMA_VERSION = 1;

export type TastingSehen = {
  klarheit?: Klarheit;
  intensitaet?: Skalenwert;
  /** ID aus farben.json */
  farbe?: string;
  /** ID einer Randfarbe aus farben.json (nur Profi) */
  rand?: string;
  viskositaet?: Skalenwert;
  /** nur Schaumwein */
  perlage?: Skalenwert;
};

export type TastingAromen = {
  primaer: string[];
  sekundaer: string[];
  tertiaer: string[];
};

export type TastingRiechen = {
  intensitaet?: Skalenwert;
  zustand?: NasenZustand;
  aromen?: TastingAromen;
  /** IDs aus der Fehlerliste in aromen.json (nur Profi) */
  fehler?: string[];
};

export type TastingSchmecken = {
  suesse?: Skalenwert;
  saeure?: Skalenwert;
  tannin?: Skalenwert;
  koerper?: Skalenwert;
  alkohol?: Skalenwert;
  abgang?: Skalenwert;
  balance?: Skalenwert;
  /** nur Schaumwein */
  mousse?: Skalenwert;
  /** Aroma-IDs, die am Gaumen wahrgenommen werden (alle Stufen) */
  aromen_gaumen?: string[];
};

export type TastingTerroir = {
  eindruecke?: string[];
  boden_tipp?: string | null;
  klima_eindruck?: string | null;
};

export type TastingFazit = {
  qualitaet?: Skalenwert;
  trinkreife?: Trinkreife;
  lagerpotenzial?: Lagerpotenzial;
  /** Verkostungsnotiz dieses Termins, max. 1000 Zeichen. Ersetzt reviews.review_text nicht. */
  notiz?: string;
};

/** Nur vorgemerkt für Teil D (Blindverkostung). */
export type TastingBlind = {
  rebsorte_tipp?: string;
  region_tipp?: string;
  jahrgang_tipp?: string;
};

/** Der eigentliche Bogen. Alle Felder sind optional. */
export type TastingData = {
  sehen?: TastingSehen;
  riechen?: TastingRiechen;
  schmecken?: TastingSchmecken;
  terroir?: TastingTerroir;
  fazit?: TastingFazit;
  blind?: TastingBlind;
};

/** Werte für die spätere Profil-Anzeige im Weinkeller (`null` = nicht bewertet). */
export type TastingProfile = {
  suesse: Skalenwert | null;
  saeure: Skalenwert | null;
  tannin: Skalenwert | null;
  koerper: Skalenwert | null;
  alkohol: Skalenwert | null;
  abgang: Skalenwert | null;
};

// ── Datensatz in Supabase ─────────────────────────────────────────────────────

/** Eine gespeicherte Verkostung (Zeile aus `public.tasting_notes`, in camelCase). */
export type TastingNote = {
  id: string;
  userId: string;
  wineId: string;
  purchasedWineId: string | null;
  tastedAt: string;
  level: TastingLevel;
  focus: TastingStep | null;
  lessonId: string | null;
  blind: boolean;
  schemaVersion: number;
  data: TastingData;
  createdAt: string;
  updatedAt: string;
};

/** Eingabe für eine neue Verkostung. */
export type TastingNoteInput = {
  wineId: string;
  level: TastingLevel;
  data: TastingData;
  purchasedWineId?: string | null;
  focus?: TastingStep | null;
  lessonId?: string | null;
  blind?: boolean;
  /** ISO-Zeitpunkt; ohne Angabe setzt die Datenbank `now()`. */
  tastedAt?: string;
};

/** Änderbare Felder einer bestehenden Verkostung. */
export type TastingNotePatch = Partial<Omit<TastingNoteInput, 'wineId'>>;

/** Ergebnis einer Speicher-Funktion: entweder Daten oder eine deutsche Fehlermeldung. */
export type TastingResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Kataloge ──────────────────────────────────────────────────────────────────

export type LektionsId = string | null;

export type Aroma = { id: string; label: string };

export type AromaFamilie = {
  id: string;
  label: string;
  lektion: LektionsId;
  /** Ohne Angabe: für alle Kategorien. */
  kategorien?: WeinKategorie[];
  aromen: Aroma[];
};

export type AromaStufeKatalog = {
  id: AromaStufe;
  label: string;
  beschreibung: string;
  ab_stufe: TastingLevel;
  familien: AromaFamilie[];
};

export type FehlerKatalog = {
  id: 'fehler';
  label: string;
  beschreibung: string;
  ab_stufe: TastingLevel;
  lektion: LektionsId;
  aromen: Aroma[];
};

export type AromenKatalog = {
  stufen: AromaStufeKatalog[];
  fehler: FehlerKatalog;
};

export type Farbe = { id: string; label: string; hex: string };

export type FarbKategorie = {
  label: string;
  lektion: LektionsId;
  /** Übernimmt die Farben dieser Kategorien (zum Beispiel Schaumwein: Weiß und Rosé). */
  wie?: WeinKategorie[];
  farben: Farbe[];
  rand: Farbe[];
};

export type FarbenKatalog = {
  lektion: LektionsId;
  kategorien: Record<WeinKategorie, FarbKategorie>;
};

export type Skala = {
  id: string;
  /** Pfad im Bogen, zum Beispiel "schmecken.suesse" */
  feld: string;
  label: string;
  erklaerung: string;
  /** Genau fünf Ankertexte für die Werte 1 bis 5 */
  anker: string[];
  kategorien: WeinKategorie[];
  stufe: TastingLevel;
  lektion: LektionsId;
};

export type SkalenKatalog = { skalen: Skala[] };

export type TerroirOption = { id: string; label: string; erklaerung?: string; verbunden_mit?: string };

export type TerroirGruppe = {
  label: string;
  auswahl: 'einfach' | 'mehrfach';
  optional?: boolean;
  lektion: LektionsId;
  optionen: TerroirOption[];
};

export type TerroirKatalog = {
  lektion: LektionsId;
  hinweis: string;
  eindruecke: TerroirGruppe;
  boeden: TerroirGruppe;
  klima_eindruck: TerroirGruppe;
};

export type Abschnitt = {
  id: TastingStep | 'blind';
  label: string;
  beschreibung: string;
  lektion: LektionsId;
};

export type AbschnitteKatalog = { abschnitte: Abschnitt[] };
