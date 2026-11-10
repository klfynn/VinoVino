// Deutsche Fehlermeldungen für „Mein Weinkeller“.
import { academyErrorMessage, NETWORK_ERROR_MESSAGE } from '../academy/errors';

export const SAVE_NETWORK_MESSAGE = 'Konnte nicht gespeichert werden. Bitte prüfe die Verbindung.';
export const LOAD_NETWORK_MESSAGE = 'Der Weinkeller konnte nicht geladen werden. Bitte prüfe die Verbindung.';
export const SAVE_FAILED_MESSAGE = 'Konnte nicht gespeichert werden. Bitte versuche es später erneut.';
export const LOAD_FAILED_MESSAGE = 'Der Weinkeller konnte nicht geladen werden. Bitte versuche es später erneut.';
export const NOT_SIGNED_IN_CELLAR_MESSAGE = 'Bitte melde dich an, damit dein Weinkeller dauerhaft gespeichert wird.';
export const CUSTOM_WINES_MISSING_MESSAGE =
  'Die eigenen Weine sind in der Datenbank noch nicht eingerichtet. Bitte die Migration „custom_wines“ in Supabase ausführen.';
export const PURCHASE_NOTIZ_MISSING_MESSAGE =
  'Die private Notiz ist in der Datenbank noch nicht eingerichtet. Bitte die Migration „purchased_wines_notiz“ in Supabase ausführen.';
export const NO_PERMISSION_CELLAR_MESSAGE =
  'Keine Berechtigung für den Weinkeller. Bitte melde dich erneut an. Falls das nicht hilft, fehlt die Migration „cellar_access“.';
export const INVALID_INPUT_MESSAGE = 'Einige Angaben sind ungültig und wurden nicht gespeichert.';
export const NOT_FOUND_MESSAGE = 'Dieser Eintrag wurde nicht gefunden. Bitte lade den Weinkeller neu.';

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  return String(err ?? '');
}

/** true bei Verbindungsproblemen (kein Netz, Supabase-Projekt pausiert: „Network request failed“). */
export function isNetworkError(err: unknown): boolean {
  return academyErrorMessage(err, '') === NETWORK_ERROR_MESSAGE;
}

/**
 * Übersetzt Fehler von Supabase/PostgREST in eine verständliche deutsche Meldung.
 * `art` bestimmt die Meldung bei Verbindungs- und unbekannten Fehlern.
 */
export function cellarErrorMessage(err: unknown, art: 'save' | 'load' = 'save'): string {
  const code = errorCode(err);
  const text = errorText(err).toLowerCase();
  if (isNetworkError(err)) return art === 'load' ? LOAD_NETWORK_MESSAGE : SAVE_NETWORK_MESSAGE;
  if ((code === '42P01' || code === 'PGRST205' || text.includes('does not exist')) && text.includes('custom_wines')) {
    return CUSTOM_WINES_MISSING_MESSAGE;
  }
  if ((code === '42703' || code === 'PGRST204' || text.includes('column')) && text.includes('notiz')) {
    return PURCHASE_NOTIZ_MISSING_MESSAGE;
  }
  if (code === '42501' || text.includes('row-level security') || text.includes('permission denied')) {
    return NO_PERMISSION_CELLAR_MESSAGE;
  }
  if (code === '23514' || code === '22P02' || code === '23502' || code === '22001') return INVALID_INPUT_MESSAGE;
  return art === 'load' ? LOAD_FAILED_MESSAGE : SAVE_FAILED_MESSAGE;
}
