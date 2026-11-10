// Deutsche Fehlermeldungen für den Verkostungsbogen.
import { academyErrorMessage, NETWORK_ERROR_MESSAGE } from '../academy/errors';

export const NOT_SIGNED_IN_MESSAGE = 'Bitte melde dich an, um Verkostungen zu speichern.';
export const TABLE_MISSING_MESSAGE =
  'Die Verkostungen sind in der Datenbank noch nicht eingerichtet. Bitte die Migration „tasting_notes“ in Supabase ausführen.';
export const NO_PERMISSION_MESSAGE =
  'Keine Berechtigung für diese Verkostung. Bitte melde dich erneut an.';
export const WINE_NOT_IN_DB_MESSAGE =
  'Dieser Wein ist nicht in der Datenbank gespeichert. Verkostungen gibt es für Weine aus dem Shop und für eigene Weine im Weinkeller.';
export const MIGRATION_CUSTOM_WINES_MESSAGE =
  'Die eigenen Weine sind in der Datenbank noch nicht eingerichtet. Bitte die Migration „custom_wines“ in Supabase ausführen.';
export const INVALID_DATA_MESSAGE = 'Die Verkostung enthält ungültige Werte und wurde nicht gespeichert.';

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err ?? '');
}

/**
 * Übersetzt Fehler von Supabase/PostgREST in eine verständliche deutsche Meldung.
 * Unbekannte Fehler ergeben `fallback`.
 */
export function tastingErrorMessage(err: unknown, fallback: string): string {
  const code = errorCode(err);
  const text = errorText(err).toLowerCase();
  // Tabelle fehlt (Migration nicht ausgeführt)
  if (code === '42P01' || code === 'PGRST205' || (text.includes('tasting_notes') && text.includes('does not exist'))) {
    return TABLE_MISSING_MESSAGE;
  }
  // Spalte custom_wine_id fehlt (Migration custom_wines nicht ausgeführt)
  if (code === '42703' || code === 'PGRST204' || text.includes('custom_wine_id')) {
    return MIGRATION_CUSTOM_WINES_MESSAGE;
  }
  // RLS oder fehlende Rechte
  if (code === '42501' || text.includes('row-level security') || text.includes('permission denied')) {
    return NO_PERMISSION_MESSAGE;
  }
  // Fremdschlüssel: Wein, eigener Wein oder Weinkeller-Eintrag existiert nicht
  if (code === '23503') return WINE_NOT_IN_DB_MESSAGE;
  // Check-Constraint (zum Beispiel Stufe oder Größe von data)
  if (code === '23514' || code === '22P02') return INVALID_DATA_MESSAGE;
  // Netzwerk (Supabase pausiert, keine Verbindung)
  const network = academyErrorMessage(err, '');
  if (network === NETWORK_ERROR_MESSAGE) return network;
  return fallback;
}
