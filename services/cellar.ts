// Speicher-Funktionen für Marktplatzweine im Weinkeller (Tabellen public.purchased_wines und public.reviews).
// Sterne liegen in reviews.rating, die private Notiz in purchased_wines.notiz (nie in reviews.review_text).
// Der genaue Aufbau beider Tabellen liegt nicht im Repository. Deshalb wird mit `select('*')` gelesen
// und defensiv ausgewertet; beim Schreiben werden nur die bekannten Spalten benutzt.
// Jede Funktion liefert { ok: true, data } oder { ok: false, error } mit deutscher Meldung und wirft nie.
import { supabase } from '../lib/supabase';
import { mapRow } from './supabase';
import { listCustomWines } from './customWines';
import { cellarErrorMessage, INVALID_INPUT_MESSAGE, NOT_FOUND_MESSAGE } from '../lib/cellar/errors';
import { normalizePurchaseRow, normalizeReviewRow, planQuantityChange } from '../lib/cellar/merge';
import { CellarResult, CellarSource, CustomWine, PurchaseRow, ReviewRow } from '../lib/cellar/types';
import { buildPurchaseNotizPayload, buildReviewPayload } from '../lib/cellar/payload';
import { isUuid } from '../lib/tasting/wineRef';
import type { Wine } from '../types';

const ok = <T>(data: T): CellarResult<T> => ({ ok: true, data });
const fail = <T>(error: string): CellarResult<T> => ({ ok: false, error });

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
}

// ── Laden ─────────────────────────────────────────────────────────────────────

export type CellarLoad = {
  purchases: PurchaseRow[];
  marketWines: Record<string, Wine>;
  reviews: ReviewRow[];
  customWines: CustomWine[];
  /** Fehlermeldungen einzelner Teile; was geladen werden konnte, wird trotzdem angezeigt. */
  errors: string[];
  /** true, wenn ein Teil nicht geladen werden konnte (dann bleiben die alten Daten dieses Teils stehen) */
  failed: { purchases: boolean; reviews: boolean; customWines: boolean };
};

/** Lädt Käufe, die zugehörigen Weine, eigene Bewertungen und eigene Weine eines Nutzers. */
export async function loadCellar(userId: string): Promise<CellarLoad> {
  const errors: string[] = [];
  const failed = { purchases: false, reviews: false, customWines: false };

  const [purchaseRes, reviewRes, customRes] = await Promise.all([
    supabase.from('purchased_wines').select('*').eq('user_id', userId).then(
      (r) => r,
      (err: unknown) => ({ data: null, error: err }),
    ),
    supabase.from('reviews').select('*').eq('user_id', userId).then(
      (r) => r,
      (err: unknown) => ({ data: null, error: err }),
    ),
    listCustomWines(userId),
  ]);

  let purchases: PurchaseRow[] = [];
  if (purchaseRes.error) {
    console.error('[VinoVino] Käufe konnten nicht geladen werden:', purchaseRes.error);
    errors.push(cellarErrorMessage(purchaseRes.error, 'load'));
    failed.purchases = true;
  } else {
    purchases = (purchaseRes.data ?? []).map(normalizePurchaseRow).filter((p): p is PurchaseRow => p !== null);
  }

  let reviews: ReviewRow[] = [];
  if (reviewRes.error) {
    console.error('[VinoVino] Bewertungen konnten nicht geladen werden:', reviewRes.error);
    errors.push(cellarErrorMessage(reviewRes.error, 'load'));
    failed.reviews = true;
  } else {
    reviews = (reviewRes.data ?? []).map(normalizeReviewRow).filter((r): r is ReviewRow => r !== null);
  }

  let customWines: CustomWine[] = [];
  if (customRes.ok) customWines = customRes.data;
  else {
    errors.push(customRes.error);
    failed.customWines = true;
  }

  // Weindaten getrennt laden: so ist kein Fremdschlüssel purchased_wines → wines nötig.
  const marketWines: Record<string, Wine> = {};
  const ids = Array.from(new Set(purchases.map((p) => p.wineId)));
  if (ids.length > 0) {
    try {
      const { data, error } = await supabase.from('wines').select('*').in('id', ids);
      if (error) throw error;
      for (const row of data ?? []) {
        try {
          const wine = mapRow(row as Record<string, unknown>);
          marketWines[wine.id] = wine;
        } catch (err) {
          console.error('[VinoVino] mapRow fehlgeschlagen im Weinkeller:', err);
        }
      }
    } catch (err) {
      console.error('[VinoVino] Weindaten für den Weinkeller konnten nicht geladen werden:', err);
      errors.push(cellarErrorMessage(err, 'load'));
    }
  }

  return { purchases, marketWines, reviews, customWines, errors: Array.from(new Set(errors)), failed };
}

// ── Käufe (purchased_wines) ───────────────────────────────────────────────────

/**
 * Trägt einen Kauf ein (nach dem Checkout). Nur für Weine mit echter UUID aus `wines`.
 * Weil die erlaubten Werte von `source` und die Spalten nicht sicher bekannt sind, wird bei einem
 * Check-Fehler (source) bzw. einer unbekannten Spalte ein zweiter, schlankerer Versuch gemacht.
 * Gibt es eine Eindeutigkeit auf (user_id, wine_id), wird stattdessen die Menge erhöht.
 */
export async function addPurchase(
  userId: string,
  wineId: string,
  quantity: number,
  source: CellarSource,
): Promise<CellarResult<PurchaseRow>> {
  if (!isUuid(wineId)) return fail(NOT_FOUND_MESSAGE);
  if (!Number.isInteger(quantity) || quantity < 1) return fail(INVALID_INPUT_MESSAGE);

  const voll = { user_id: userId, wine_id: wineId, quantity, source, purchased_at: new Date().toISOString() };
  const versuche: Record<string, unknown>[] = [
    voll,
    { user_id: userId, wine_id: wineId, quantity, purchased_at: voll.purchased_at },
    { user_id: userId, wine_id: wineId, quantity },
  ];

  let lastError: unknown = null;
  for (const row of versuche) {
    try {
      const { data, error } = await supabase.from('purchased_wines').insert(row).select('*').single();
      if (error) throw error;
      const parsed = normalizePurchaseRow(data);
      if (!parsed) throw new Error('Unerwartete Antwort der Datenbank');
      return ok(parsed);
    } catch (err) {
      lastError = err;
      const code = errorCode(err);
      if (code === '23505') return increasePurchase(userId, wineId, quantity);
      // Nur bei Check-Fehler (z. B. source) oder unbekannter Spalte mit dem nächsten Versuch weitermachen.
      if (code !== '23514' && code !== '42703' && code !== 'PGRST204') break;
    }
  }
  console.error('[VinoVino] Kauf konnte nicht im Weinkeller gespeichert werden:', lastError);
  return fail(cellarErrorMessage(lastError));
}

/** Erhöht die Menge der neuesten Kaufzeile (falls es pro Nutzer und Wein nur eine Zeile geben darf). */
async function increasePurchase(userId: string, wineId: string, quantity: number): Promise<CellarResult<PurchaseRow>> {
  try {
    const { data, error } = await supabase
      .from('purchased_wines')
      .select('*')
      .eq('user_id', userId)
      .eq('wine_id', wineId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const row = normalizePurchaseRow(data);
    if (!row || !row.id) return fail(NOT_FOUND_MESSAGE);
    const { data: updated, error: updateError } = await supabase
      .from('purchased_wines')
      .update({ quantity: row.quantity + quantity })
      .eq('id', row.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    const parsed = normalizePurchaseRow(updated);
    if (!parsed) throw new Error('Unerwartete Antwort der Datenbank');
    return ok(parsed);
  } catch (err) {
    console.error('[VinoVino] Menge im Weinkeller konnte nicht erhöht werden:', err);
    return fail(cellarErrorMessage(err));
  }
}

/**
 * Setzt die Flaschenzahl eines Marktplatzweins (Summe über seine Kaufzeilen).
 * 0 entfernt den Wein aus dem Weinkeller (wie bisher). Liefert die neuen Kaufzeilen.
 */
export async function setMarketQuantity(
  userId: string,
  rows: PurchaseRow[],
  newQty: number,
): Promise<CellarResult<PurchaseRow[]>> {
  const plan = planQuantityChange(rows, newQty);
  if (!plan) return fail('Die Menge kann für diesen Eintrag nicht geändert werden.');
  try {
    for (const u of plan.updates) {
      const { error } = await supabase
        .from('purchased_wines')
        .update({ quantity: u.quantity })
        .eq('id', u.id)
        .eq('user_id', userId);
      if (error) throw error;
    }
    if (plan.deletes.length > 0) {
      const { error } = await supabase
        .from('purchased_wines')
        .delete()
        .in('id', plan.deletes)
        .eq('user_id', userId);
      if (error) throw error;
    }
  } catch (err) {
    console.error('[VinoVino] Menge im Weinkeller konnte nicht geändert werden:', err);
    return fail(cellarErrorMessage(err));
  }
  const updated = new Map(plan.updates.map((u) => [u.id, u.quantity]));
  const deleted = new Set(plan.deletes);
  return ok(
    rows
      .filter((r) => !deleted.has(r.id as string))
      .map((r) => (updated.has(r.id as string) ? { ...r, quantity: updated.get(r.id as string) as number } : r)),
  );
}

/** Entfernt einen Marktplatzwein aus dem Weinkeller (alle Kaufzeilen). Bewertung und Verkostungen bleiben. */
export async function removeMarketWine(userId: string, wineId: string): Promise<CellarResult<null>> {
  if (!isUuid(wineId)) return fail(NOT_FOUND_MESSAGE);
  try {
    const { error } = await supabase.from('purchased_wines').delete().eq('user_id', userId).eq('wine_id', wineId);
    if (error) throw error;
    return ok(null);
  } catch (err) {
    console.error('[VinoVino] Wein konnte nicht aus dem Weinkeller entfernt werden:', err);
    return fail(cellarErrorMessage(err));
  }
}

// ── Sterne (reviews) und private Notiz (purchased_wines.notiz) ────────────────

export type MarketRatingSaved = {
  /** Die Kaufzeilen des Weins mit der neuen Notiz */
  purchases: PurchaseRow[];
  /** Die gespeicherte Bewertung oder `null`, wenn keine Sterne vergeben wurden */
  review: ReviewRow | null;
};

/**
 * Speichert Sterne und Notiz eines Marktplatzweins.
 * - Die Notiz ist privat und kommt ausschließlich in `purchased_wines.notiz` (alle Kaufzeilen des Weins).
 * - Die Sterne kommen in `reviews` (nur user_id, wine_id, rating). Ohne Sterne (`rating` = null)
 *   wird kein `reviews`-Eintrag angelegt. `review_text` wird nie geschrieben.
 * Ob es in `reviews` eine Eindeutigkeit auf (user_id, wine_id) gibt, ist nicht bekannt; deshalb wird
 * wie bisher zuerst aktualisiert und nur dann eingefügt, wenn es noch keine Bewertung gibt.
 */
export async function saveMarketRating(
  userId: string,
  wineId: string,
  rating: number | null,
  notiz: string,
): Promise<CellarResult<MarketRatingSaved>> {
  if (!isUuid(wineId)) return fail(NOT_FOUND_MESSAGE);
  const notizPayload = buildPurchaseNotizPayload(notiz);
  const reviewPayload = rating === null ? null : buildReviewPayload(userId, wineId, rating);
  if (!notizPayload || (rating !== null && !reviewPayload)) return fail(INVALID_INPUT_MESSAGE);

  let purchases: PurchaseRow[];
  try {
    const { data, error } = await supabase
      .from('purchased_wines')
      .update(notizPayload)
      .eq('user_id', userId)
      .eq('wine_id', wineId)
      .select('*');
    if (error) throw error;
    purchases = (data ?? []).map(normalizePurchaseRow).filter((p): p is PurchaseRow => p !== null);
    if (purchases.length === 0) return fail(NOT_FOUND_MESSAGE);
  } catch (err) {
    console.error('[VinoVino] Notiz konnte nicht gespeichert werden:', err);
    return fail(cellarErrorMessage(err));
  }

  if (!reviewPayload) return ok({ purchases, review: null });

  try {
    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({ rating: reviewPayload.rating })
      .eq('user_id', userId)
      .eq('wine_id', wineId)
      .select('*');
    if (updateError) throw updateError;
    let row: unknown = updated && updated.length > 0 ? updated[0] : null;
    if (!row) {
      const { data: inserted, error: insertError } = await supabase
        .from('reviews')
        .insert(reviewPayload)
        .select('*')
        .single();
      if (insertError) throw insertError;
      row = inserted;
    }
    const review = normalizeReviewRow(row) ?? { wineId, rating: reviewPayload.rating, date: new Date().toISOString() };
    return ok({ purchases, review });
  } catch (err) {
    console.error('[VinoVino] Bewertung konnte nicht gespeichert werden:', err);
    return fail(cellarErrorMessage(err));
  }
}
