// Speicher-Payloads für Sterne und Notiz eines Marktplatzweins (reine Funktionen, ohne Nebenwirkungen).
//
// Weinkeller-Notizen sind privat. Deshalb gilt:
// - Die Sterne kommen in `reviews` (nur user_id, wine_id, rating).
// - Die Notiz kommt ausschließlich in `purchased_wines.notiz` (Policies „nur eigene Zeilen“).
// - `reviews.review_text` wird von der App nie geschrieben; die Spalte ist für eine spätere,
//   bewusst öffentliche Shop-Bewertung reserviert. Für `reviews` gilt „Alle sehen alle Bewertungen“.
import { isUuid } from '../tasting/wineRef';
import { validateNotiz } from './validate';

/** Zeile für `reviews`: genau diese drei Felder, nichts anderes. */
export type ReviewPayload = { user_id: string; wine_id: string; rating: number };

/** Änderung für `purchased_wines`: nur die private Notiz. */
export type PurchaseNotizPayload = { notiz: string | null };

const isRating = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

/**
 * Baut die Zeile für `reviews`. Ohne gültige Sterne (null, 0, ungültig) gibt es keine Zeile (`null`):
 * Dann wird auch kein `reviews`-Eintrag angelegt, selbst wenn eine Notiz gespeichert wird.
 */
export function buildReviewPayload(userId: string, wineId: string, rating: unknown): ReviewPayload | null {
  if (!userId || !isUuid(wineId) || !isRating(rating)) return null;
  return { user_id: userId, wine_id: wineId, rating };
}

/**
 * Baut die Änderung für `purchased_wines`: Notiz getrimmt, leer → null.
 * Ungültige Notiz (falscher Typ, über 1000 Zeichen) → `null` (es wird nichts gespeichert).
 */
export function buildPurchaseNotizPayload(notiz: unknown): PurchaseNotizPayload | null {
  if (notiz !== null && notiz !== undefined && typeof notiz !== 'string') return null;
  const t = typeof notiz === 'string' ? notiz.trim() : '';
  if (validateNotiz(t)) return null;
  return { notiz: t ? t : null };
}
