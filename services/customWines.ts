// Speicher-Funktionen für eigene Weine (Tabelle public.custom_wines).
// Jede Funktion liefert { ok: true, data } oder { ok: false, error } mit deutscher Meldung und wirft nie.
// Jeder Nutzer sieht und ändert nur seine eigenen Weine (RLS in der Datenbank).
import { supabase } from '../lib/supabase';
import { cellarErrorMessage, INVALID_INPUT_MESSAGE, NOT_FOUND_MESSAGE } from '../lib/cellar/errors';
import { normalizeCustomWineRow } from '../lib/cellar/merge';
import { CellarResult, CustomWine, CustomWineValues } from '../lib/cellar/types';
import { validateCustomWineInput, validateRating } from '../lib/cellar/validate';
import { isUuid } from '../lib/tasting/wineRef';

const TABLE = 'custom_wines';
const COLUMNS =
  'id, user_id, name, weingut, weinart, jahrgang, herkunft, region, rebsorte, preis, flaschengroesse, quantity, boden, source, rating, notiz, bild_url, created_at, updated_at';

const ok = <T>(data: T): CellarResult<T> => ({ ok: true, data });
const fail = <T>(error: string): CellarResult<T> => ({ ok: false, error });

function toWine(row: unknown): CustomWine {
  const wine = normalizeCustomWineRow(row);
  if (!wine) throw new Error('Unerwartete Antwort der Datenbank');
  return wine;
}

/** Spalten für insert/update aus bereinigten Werten. */
function toColumns(v: CustomWineValues): Record<string, unknown> {
  return {
    name: v.name,
    weingut: v.weingut,
    weinart: v.weinart,
    jahrgang: v.jahrgang,
    herkunft: v.herkunft,
    region: v.region,
    rebsorte: v.rebsorte,
    quantity: v.quantity,
    preis: v.preis,
    boden: v.boden,
    flaschengroesse: v.flaschengroesse,
  };
}

/** Alle eigenen Weine eines Nutzers, neueste zuerst. */
export async function listCustomWines(userId: string): Promise<CellarResult<CustomWine[]>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok((data ?? []).map(normalizeCustomWineRow).filter((w): w is CustomWine => w !== null));
  } catch (err) {
    console.error('[VinoVino] Eigene Weine konnten nicht geladen werden:', err);
    return fail(cellarErrorMessage(err, 'load'));
  }
}

/** Legt einen eigenen Wein an. Die Eingaben werden vorher geprüft. */
export async function createCustomWine(userId: string, input: unknown): Promise<CellarResult<CustomWine>> {
  const check = validateCustomWineInput(input);
  if (!check.ok) return fail(INVALID_INPUT_MESSAGE);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...toColumns(check.values), user_id: userId, source: 'manual' })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return ok(toWine(data));
  } catch (err) {
    console.error('[VinoVino] Eigener Wein konnte nicht gespeichert werden:', err);
    return fail(cellarErrorMessage(err));
  }
}

async function patchCustomWine(id: string, changes: Record<string, unknown>): Promise<CellarResult<CustomWine>> {
  if (!isUuid(id)) return fail(NOT_FOUND_MESSAGE);
  try {
    const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select(COLUMNS).maybeSingle();
    if (error) throw error;
    if (!data) return fail(NOT_FOUND_MESSAGE);
    return ok(toWine(data));
  } catch (err) {
    console.error('[VinoVino] Eigener Wein konnte nicht geändert werden:', err);
    return fail(cellarErrorMessage(err));
  }
}

/** Ändert alle Formularfelder eines eigenen Weins. */
export async function updateCustomWine(id: string, input: unknown): Promise<CellarResult<CustomWine>> {
  const check = validateCustomWineInput(input);
  if (!check.ok) return fail(INVALID_INPUT_MESSAGE);
  return patchCustomWine(id, toColumns(check.values));
}

/** Ändert nur die Anzahl Flaschen (0 ist erlaubt: der Wein bleibt mit seinen Verkostungen erhalten). */
export async function setCustomWineQuantity(id: string, quantity: number): Promise<CellarResult<CustomWine>> {
  if (!Number.isInteger(quantity) || quantity < 0) return fail(INVALID_INPUT_MESSAGE);
  return patchCustomWine(id, { quantity });
}

/** Speichert Sterne und Notiz eines eigenen Weins. */
export async function setCustomWineRating(
  id: string,
  rating: number,
  notiz: string,
): Promise<CellarResult<CustomWine>> {
  if (validateRating(rating, notiz)) return fail(INVALID_INPUT_MESSAGE);
  return patchCustomWine(id, { rating, notiz: notiz.trim() ? notiz.trim() : null });
}

/** Löscht einen eigenen Wein. Seine Verkostungen löscht die Datenbank mit (on delete cascade). */
export async function deleteCustomWine(id: string): Promise<CellarResult<null>> {
  if (!isUuid(id)) return fail(NOT_FOUND_MESSAGE);
  try {
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) return fail(NOT_FOUND_MESSAGE);
    return ok(null);
  } catch (err) {
    console.error('[VinoVino] Eigener Wein konnte nicht gelöscht werden:', err);
    return fail(cellarErrorMessage(err));
  }
}
