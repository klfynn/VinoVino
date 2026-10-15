export const NETWORK_ERROR_MESSAGE =
  'Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.';

// Supabase-Free-Tier pausiert nach Inaktivität – das zeigt sich als
// „Network request failed". Solche Fehler werden auf eine deutsche Meldung gemappt.
export function academyErrorMessage(err: unknown, fallback: string): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err ?? '');
  const m = message.toLowerCase();
  if (
    m.includes('network request failed') ||
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('connection')
  ) {
    return NETWORK_ERROR_MESSAGE;
  }
  return fallback;
}
