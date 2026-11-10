// Speicher-Funktionen für Verkostungen (Tabelle public.tasting_notes).
// Jede Funktion liefert { ok: true, data } oder { ok: false, error } mit deutscher Meldung und wirft nie.
// Ohne Anmeldung liefern Listen eine leere Liste, Schreibzugriffe eine verständliche Fehlermeldung.
import { supabase } from '../lib/supabase';
import { getLektion } from '../content/academy/helpers';
import { sanitizeTastingData } from '../lib/tasting/validate';
import {
  NOT_SIGNED_IN_MESSAGE,
  tastingErrorMessage,
  WINE_NOT_IN_DB_MESSAGE,
} from '../lib/tasting/errors';
import {
  TASTING_LEVELS,
  TASTING_SCHEMA_VERSION,
  TASTING_STEPS,
  TastingLevel,
  TastingNote,
  TastingNoteInput,
  TastingNotePatch,
  TastingResult,
  TastingStep,
} from '../lib/tasting/types';

const TABLE = 'tasting_notes';
const COLUMNS =
  'id, user_id, wine_id, purchased_wine_id, tasted_at, level, focus, lesson_id, blind, schema_version, data, created_at, updated_at';

export const RECENT_DEFAULT_LIMIT = 20;
export const RECENT_MAX_LIMIT = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** IDs in `wines`/`purchased_wines`/`tasting_notes` sind UUIDs. Lokale Weine (z. B. „manual_…“) nicht. */
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

type Row = {
  id: string;
  user_id: string;
  wine_id: string;
  purchased_wine_id: string | null;
  tasted_at: string;
  level: string;
  focus: string | null;
  lesson_id: string | null;
  blind: boolean;
  schema_version: number;
  data: unknown;
  created_at: string;
  updated_at: string;
};

const ok = <T>(data: T): TastingResult<T> => ({ ok: true, data });
const fail = <T>(error: string): TastingResult<T> => ({ ok: false, error });

function mapRow(row: Row): TastingNote {
  return {
    id: row.id,
    userId: row.user_id,
    wineId: row.wine_id,
    purchasedWineId: row.purchased_wine_id,
    tastedAt: row.tasted_at,
    level: (TASTING_LEVELS as readonly string[]).includes(row.level) ? (row.level as TastingLevel) : 'einfach',
    focus: (TASTING_STEPS as readonly string[]).includes(row.focus ?? '') ? (row.focus as TastingStep) : null,
    lessonId: row.lesson_id,
    blind: !!row.blind,
    schemaVersion: row.schema_version,
    // Beim Lesen bereinigen, damit die Oberfläche nie mit unbekannten IDs rechnen muss.
    data: sanitizeTastingData(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** ID des angemeldeten Nutzers aus der lokalen Sitzung, sonst `null`. */
async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Prüft die Metadaten einer Eingabe; liefert eine Fehlermeldung oder `null`. */
function checkMeta(input: TastingNotePatch): string | null {
  if (input.level !== undefined && !(TASTING_LEVELS as readonly string[]).includes(input.level)) {
    return 'Unbekannte Stufe. Erlaubt sind einfach, erweitert und profi.';
  }
  if (input.focus != null && !(TASTING_STEPS as readonly string[]).includes(input.focus)) {
    return 'Unbekannter Schwerpunkt der Verkostung.';
  }
  if (input.lessonId != null && !getLektion(input.lessonId)) {
    return 'Die angegebene Akademie-Lektion gibt es nicht.';
  }
  if (input.purchasedWineId != null && !isUuid(input.purchasedWineId)) {
    return 'Dieser Weinkeller-Eintrag ist nicht in der Datenbank gespeichert.';
  }
  if (input.tastedAt !== undefined && Number.isNaN(Date.parse(input.tastedAt))) {
    return 'Ungültiger Zeitpunkt der Verkostung.';
  }
  if (input.blind !== undefined && typeof input.blind !== 'boolean') {
    return 'Ungültige Angabe zur Blindverkostung.';
  }
  return null;
}

// ── Lesen ─────────────────────────────────────────────────────────────────────

/** Alle Verkostungen des angemeldeten Nutzers zu einem Wein, neueste zuerst. */
export async function listTastingNotes(wineId: string): Promise<TastingResult<TastingNote[]>> {
  const userId = await currentUserId();
  if (!userId || !isUuid(wineId)) return ok([]);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('wine_id', wineId)
      .order('tasted_at', { ascending: false });
    if (error) throw error;
    return ok(((data ?? []) as Row[]).map(mapRow));
  } catch (err) {
    console.error('[VinoVino] Verkostungen konnten nicht geladen werden:', err);
    return fail(tastingErrorMessage(err, 'Deine Verkostungen konnten nicht geladen werden.'));
  }
}

/** Die letzten Verkostungen des angemeldeten Nutzers über alle Weine. */
export async function listRecentTastingNotes(
  limit: number = RECENT_DEFAULT_LIMIT,
): Promise<TastingResult<TastingNote[]>> {
  const userId = await currentUserId();
  if (!userId) return ok([]);
  const n = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), RECENT_MAX_LIMIT) : RECENT_DEFAULT_LIMIT;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('tasted_at', { ascending: false })
      .limit(n);
    if (error) throw error;
    return ok(((data ?? []) as Row[]).map(mapRow));
  } catch (err) {
    console.error('[VinoVino] Letzte Verkostungen konnten nicht geladen werden:', err);
    return fail(tastingErrorMessage(err, 'Deine letzten Verkostungen konnten nicht geladen werden.'));
  }
}

/** Die neueste Verkostung zu einem Wein oder `null`. */
export async function getLatestTastingNote(wineId: string): Promise<TastingResult<TastingNote | null>> {
  const userId = await currentUserId();
  if (!userId || !isUuid(wineId)) return ok(null);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(COLUMNS)
      .eq('user_id', userId)
      .eq('wine_id', wineId)
      .order('tasted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return ok(data ? mapRow(data as Row) : null);
  } catch (err) {
    console.error('[VinoVino] Letzte Verkostung konnte nicht geladen werden:', err);
    return fail(tastingErrorMessage(err, 'Deine letzte Verkostung konnte nicht geladen werden.'));
  }
}

// ── Schreiben ─────────────────────────────────────────────────────────────────

/** Legt eine neue Verkostung an. Mehrere Verkostungen je Wein sind erlaubt. */
export async function saveTastingNote(input: TastingNoteInput): Promise<TastingResult<TastingNote>> {
  const userId = await currentUserId();
  if (!userId) return fail(NOT_SIGNED_IN_MESSAGE);
  if (!input || !isUuid(input.wineId)) return fail(WINE_NOT_IN_DB_MESSAGE);
  if (input.level === undefined) return fail('Bitte wähle eine Stufe für die Verkostung.');
  const metaError = checkMeta(input);
  if (metaError) return fail(metaError);

  const row: Record<string, unknown> = {
    user_id: userId,
    wine_id: input.wineId,
    purchased_wine_id: input.purchasedWineId ?? null,
    level: input.level,
    focus: input.focus ?? null,
    lesson_id: input.lessonId ?? null,
    blind: input.blind ?? false,
    schema_version: TASTING_SCHEMA_VERSION,
    data: sanitizeTastingData(input.data),
  };
  if (input.tastedAt) row.tasted_at = new Date(input.tastedAt).toISOString();

  try {
    const { data, error } = await supabase.from(TABLE).insert(row).select(COLUMNS).single();
    if (error) throw error;
    return ok(mapRow(data as Row));
  } catch (err) {
    console.error('[VinoVino] Verkostung konnte nicht gespeichert werden:', err);
    return fail(tastingErrorMessage(err, 'Deine Verkostung konnte nicht gespeichert werden.'));
  }
}

/** Ändert eine bestehende Verkostung. Nur übergebene Felder werden geändert. */
export async function updateTastingNote(
  id: string,
  patch: TastingNotePatch,
): Promise<TastingResult<TastingNote>> {
  const userId = await currentUserId();
  if (!userId) return fail(NOT_SIGNED_IN_MESSAGE);
  if (!isUuid(id)) return fail('Diese Verkostung wurde nicht gefunden.');
  if (!patch || typeof patch !== 'object') return fail('Es wurden keine Änderungen übergeben.');
  const metaError = checkMeta(patch);
  if (metaError) return fail(metaError);

  const changes: Record<string, unknown> = {};
  if (patch.level !== undefined) changes.level = patch.level;
  if (patch.focus !== undefined) changes.focus = patch.focus;
  if (patch.lessonId !== undefined) changes.lesson_id = patch.lessonId;
  if (patch.purchasedWineId !== undefined) changes.purchased_wine_id = patch.purchasedWineId;
  if (patch.blind !== undefined) changes.blind = patch.blind;
  if (patch.tastedAt !== undefined) changes.tasted_at = new Date(patch.tastedAt).toISOString();
  if (patch.data !== undefined) {
    changes.data = sanitizeTastingData(patch.data);
    changes.schema_version = TASTING_SCHEMA_VERSION;
  }
  if (Object.keys(changes).length === 0) return fail('Es wurden keine Änderungen übergeben.');

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update(changes)
      .eq('id', id)
      .eq('user_id', userId)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fail('Diese Verkostung wurde nicht gefunden.');
    return ok(mapRow(data as Row));
  } catch (err) {
    console.error('[VinoVino] Verkostung konnte nicht geändert werden:', err);
    return fail(tastingErrorMessage(err, 'Deine Verkostung konnte nicht geändert werden.'));
  }
}

/** Löscht eine Verkostung des angemeldeten Nutzers. */
export async function deleteTastingNote(id: string): Promise<TastingResult<null>> {
  const userId = await currentUserId();
  if (!userId) return fail(NOT_SIGNED_IN_MESSAGE);
  if (!isUuid(id)) return fail('Diese Verkostung wurde nicht gefunden.');
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) return fail('Diese Verkostung wurde nicht gefunden.');
    return ok(null);
  } catch (err) {
    console.error('[VinoVino] Verkostung konnte nicht gelöscht werden:', err);
    return fail(tastingErrorMessage(err, 'Deine Verkostung konnte nicht gelöscht werden.'));
  }
}
