// Zusammenführen von Marktplatzweinen (purchased_wines + wines + reviews), eigenen Weinen
// (custom_wines) und lokalen Einträgen (Arbeitsspeicher) zu einer Weinkeller-Liste.
// Reine Funktionen, ohne Nebenwirkungen.
import type { Wine } from '../../types';
import { customRef, isUuid, marketRef, wineRefKey } from '../tasting/wineRef';
import {
  CELLAR_PLACEHOLDER_IMAGE,
  CELLAR_SOURCES,
  CellarSource,
  CellarWine,
  CustomWine,
  PurchaseRow,
  ReviewRow,
} from './types';
import { weinartToWineType } from './weinart';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const toDate = (v: string | null | undefined): Date => {
  const t = v ? Date.parse(v) : NaN;
  return new Date(Number.isNaN(t) ? 0 : t);
};

// ── Datenbankzeilen lesen ─────────────────────────────────────────────────────

/**
 * Liest eine Zeile aus `purchased_wines`. Weil der Aufbau der Tabelle nicht im Repository liegt,
 * wird defensiv gelesen: ohne gültige wine_id (UUID) ergibt das `null`, fehlende Menge = 1.
 */
export function normalizePurchaseRow(raw: unknown): PurchaseRow | null {
  if (!isObj(raw) || !isUuid(raw.wine_id)) return null;
  const q = num(raw.quantity);
  return {
    id: raw.id === undefined || raw.id === null ? null : String(raw.id),
    wineId: raw.wine_id,
    quantity: q !== null && q >= 0 ? Math.floor(q) : 1,
    purchasedAt: str(raw.purchased_at) ?? str(raw.created_at),
    source: str(raw.source),
    notiz: str(raw.notiz),
  };
}

/**
 * Liest eine Zeile aus `reviews` (eigene Sterne). Ohne gültige wine_id → `null`.
 * Ein Text in `review_text` wird ignoriert, auch wenn dort etwas steht: Bewertungen sind für alle
 * sichtbar, die private Notiz kommt aus `purchased_wines.notiz`.
 */
export function normalizeReviewRow(raw: unknown): ReviewRow | null {
  if (!isObj(raw) || !isUuid(raw.wine_id)) return null;
  const r = num(raw.rating);
  return {
    wineId: raw.wine_id,
    rating: r !== null && Number.isInteger(r) && r >= 1 && r <= 5 ? r : null,
    date: str(raw.updated_at) ?? str(raw.created_at),
  };
}

/**
 * Private Notiz eines Marktplatzweins aus seinen Kaufzeilen: die neueste Zeile, die eine Notiz hat.
 * (Beim Speichern wird die Notiz in alle Kaufzeilen des Weins geschrieben; neue Käufe haben noch keine.)
 */
export function purchaseNotiz(rows: PurchaseRow[]): string | null {
  for (const row of sortPurchasesNewestFirst(rows)) if (row.notiz) return row.notiz;
  return null;
}

/** Liest eine Zeile aus `custom_wines`. Ohne ID oder Namen → `null`. */
export function normalizeCustomWineRow(raw: unknown): CustomWine | null {
  if (!isObj(raw) || !str(raw.id) || !str(raw.name)) return null;
  const q = num(raw.quantity);
  const r = num(raw.rating);
  const preis = num(raw.preis);
  return {
    id: String(raw.id),
    userId: str(raw.user_id) ?? '',
    name: String(raw.name),
    weingut: str(raw.weingut),
    weinart: str(raw.weinart),
    jahrgang: str(raw.jahrgang),
    herkunft: str(raw.herkunft),
    region: str(raw.region),
    rebsorte: str(raw.rebsorte),
    preis: preis !== null && preis >= 0 ? preis : null,
    flaschengroesse: str(raw.flaschengroesse),
    quantity: q !== null && q >= 0 ? Math.floor(q) : 0,
    boden: str(raw.boden),
    source: raw.source === 'scan' ? 'scan' : 'manual',
    rating: r !== null && Number.isInteger(r) && r >= 1 && r <= 5 ? r : null,
    notiz: str(raw.notiz),
    bildUrl: str(raw.bild_url),
    createdAt: str(raw.created_at) ?? '',
    updatedAt: str(raw.updated_at) ?? '',
  };
}

// ── Anzeige-Objekte ───────────────────────────────────────────────────────────

/** Macht aus einem eigenen Wein ein `Wine`-Objekt für die bestehenden Karten. */
export function customWineToWine(cw: CustomWine): Wine {
  const jahr = cw.jahrgang && /^\d{4}$/.test(cw.jahrgang) ? Number(cw.jahrgang) : 0;
  return {
    id: cw.id,
    name: cw.name,
    winery: cw.weingut ?? '',
    vintage: jahr,
    type: weinartToWineType(cw.weinart),
    region: cw.region ?? '',
    country: cw.herkunft ?? '',
    grape: cw.rebsorte ?? '',
    taste: [],
    description: '',
    rating: 0,
    price: cw.preis ?? 0,
    // Fotos für eigene Weine kommen später; bis dahin derselbe Platzhalter wie bisher.
    image: CELLAR_PLACEHOLDER_IMAGE,
  };
}

/** Platzhalter, wenn ein gekaufter Wein nicht mehr im Katalog steht (gelöscht oder nicht lesbar). */
export function missingMarketWine(wineId: string): Wine {
  return {
    id: wineId,
    name: 'Wein nicht mehr im Katalog',
    winery: '',
    vintage: 0,
    type: 'Rotwein',
    region: '',
    country: '',
    grape: '',
    taste: [],
    description: '',
    rating: 0,
    price: 0,
    image: CELLAR_PLACEHOLDER_IMAGE,
  };
}

/** Untertitel einer Karte: Weingut und Jahrgang (eigene Weine) bzw. wie bisher (Marktplatz). */
export function cellarSubtitle(entry: CellarWine): string {
  if (entry.ref.kind === 'custom') {
    return [entry.custom?.weingut, entry.custom?.jahrgang].filter(Boolean).join(' · ');
  }
  return [entry.wine.winery, entry.wine.vintage || null].filter(Boolean).join(' · ');
}

const toCellarSource = (v: string | null | undefined): CellarSource =>
  v && (CELLAR_SOURCES as readonly string[]).includes(v) ? (v as CellarSource) : 'purchase';

// ── Zusammenführen ────────────────────────────────────────────────────────────

export type MergeInput = {
  purchases: PurchaseRow[];
  /** Weindaten aus `wines`, nach ID */
  marketWines: Record<string, Wine>;
  reviews: ReviewRow[];
  customWines: CustomWine[];
  /** Nur im Arbeitsspeicher: Weine ohne UUID (lokale Testdaten, Scanner) oder ohne Anmeldung */
  localEntries: CellarWine[];
  /** Nur im Arbeitsspeicher: eigene Weine ohne Anmeldung */
  localCustomWines: CustomWine[];
};

/** Reihenfolge: zuletzt hinzugefügt zuerst, bei Gleichstand nach Name, dann nach Schlüssel. */
export function compareCellarWines(a: CellarWine, b: CellarWine): number {
  const t = b.addedAt.getTime() - a.addedAt.getTime();
  if (t !== 0) return t;
  const n = a.wine.name.localeCompare(b.wine.name, 'de');
  if (n !== 0) return n;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function customEntry(cw: CustomWine, persisted: boolean): CellarWine {
  return {
    id: wineRefKey(customRef(cw.id)),
    ref: customRef(cw.id),
    wine: customWineToWine(cw),
    quantity: cw.quantity,
    addedAt: toDate(cw.createdAt),
    source: cw.source === 'scan' ? 'scanner' : 'manual',
    rating: cw.rating ?? undefined,
    notes: cw.notiz ?? undefined,
    ratedAt: cw.rating != null ? cw.updatedAt || undefined : undefined,
    persisted,
    custom: cw,
  };
}

/**
 * Führt alle Quellen zu einer Liste zusammen. Mehrere Kaufzeilen desselben Weins werden zu einem
 * Eintrag zusammengefasst (Mengen addiert). Jeder Eintrag hat eine eindeutige WineRef; lokale
 * Einträge, deren WineRef schon aus der Datenbank kommt, werden weggelassen.
 */
export function mergeCellar(input: MergeInput): CellarWine[] {
  const reviews = new Map<string, ReviewRow>();
  for (const r of input.reviews) if (r.rating !== null) reviews.set(r.wineId, r);

  // Kaufzeilen je Wein bündeln (Reihenfolge der ersten Kaufzeile bleibt erhalten).
  const byWine = new Map<string, PurchaseRow[]>();
  for (const p of input.purchases) {
    if (!isUuid(p.wineId)) continue;
    const list = byWine.get(p.wineId) ?? [];
    list.push(p);
    byWine.set(p.wineId, list);
  }

  const result: CellarWine[] = [];
  const seen = new Set<string>();
  const add = (entry: CellarWine) => {
    const key = wineRefKey(entry.ref);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(entry);
  };

  for (const [wineId, rows] of byWine) {
    const sorted = sortPurchasesNewestFirst(rows);
    const latest = sorted[0];
    const review = reviews.get(wineId);
    add({
      id: wineRefKey(marketRef(wineId)),
      ref: marketRef(wineId),
      wine: input.marketWines[wineId] ?? missingMarketWine(wineId),
      quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
      addedAt: toDate(latest.purchasedAt),
      source: toCellarSource(latest.source),
      purchaseDate: latest.purchasedAt ? toDate(latest.purchasedAt) : undefined,
      rating: review?.rating ?? undefined,
      notes: purchaseNotiz(rows) ?? undefined,
      ratedAt: review?.date ?? undefined,
      persisted: true,
      purchases: sorted,
    });
  }

  for (const cw of input.customWines) add(customEntry(cw, true));
  for (const cw of input.localCustomWines) add(customEntry(cw, false));
  for (const entry of input.localEntries) add({ ...entry, persisted: false });

  return result.sort(compareCellarWines);
}

// ── Mengen von Marktplatzweinen ändern ────────────────────────────────────────

export function sortPurchasesNewestFirst(rows: PurchaseRow[]): PurchaseRow[] {
  return [...rows].sort((a, b) => {
    const t = toDate(b.purchasedAt).getTime() - toDate(a.purchasedAt).getTime();
    if (t !== 0) return t;
    return (b.id ?? '').localeCompare(a.id ?? '');
  });
}

export type QuantityPlan = { updates: { id: string; quantity: number }[]; deletes: string[] };

/**
 * Plant, wie die Kaufzeilen eines Marktplatzweins geändert werden, damit die Summe `newQty` ergibt.
 * Mehr Flaschen: die neueste Zeile wird erhöht. Weniger: von der neuesten Zeile an wird abgezogen;
 * Zeilen, die auf 0 fallen, werden gelöscht. `newQty` ≤ 0 löscht alle Zeilen (Eintrag entfernt).
 * Liefert `null`, wenn eine Zeile keine ID hat oder die Eingabe ungültig ist.
 */
export function planQuantityChange(rows: PurchaseRow[], newQty: number): QuantityPlan | null {
  if (!Number.isFinite(newQty) || rows.length === 0) return null;
  if (rows.some((r) => !r.id)) return null;
  const target = Math.max(0, Math.floor(newQty));
  const sorted = sortPurchasesNewestFirst(rows);
  if (target === 0) return { updates: [], deletes: sorted.map((r) => r.id as string) };

  const total = sorted.reduce((sum, r) => sum + r.quantity, 0);
  if (target === total) return { updates: [], deletes: [] };
  if (target > total) {
    return { updates: [{ id: sorted[0].id as string, quantity: sorted[0].quantity + (target - total) }], deletes: [] };
  }
  let rest = total - target;
  const plan: QuantityPlan = { updates: [], deletes: [] };
  for (const row of sorted) {
    if (rest <= 0) break;
    const take = Math.min(row.quantity, rest);
    rest -= take;
    if (row.quantity - take <= 0) plan.deletes.push(row.id as string);
    else plan.updates.push({ id: row.id as string, quantity: row.quantity - take });
  }
  return plan;
}

/** true, wenn ein Wein in `purchased_wines` geschrieben werden kann (echte UUID aus `wines`). */
export function canPersistMarketWine(wineId: unknown): boolean {
  return isUuid(wineId);
}
