// Neuladen der Weinliste im Swipe-Stapel, ohne dass die aktuelle Karte springt. Reine Funktionen.

/** Mindestabstand zwischen zwei Ladevorgängen beim Zurückkehren auf den Tab. */
export const NEULADEN_ABSTAND_MS = 60_000;

/** Soll beim Zurückkehren auf den Tab neu geladen werden? Ohne bisheriges Laden: nein (das übernimmt der Start). */
export function sollNeuLaden(
  letztesLaden: number | null,
  jetzt: number,
  abstand: number = NEULADEN_ABSTAND_MS,
): boolean {
  if (letztesLaden === null) return false;
  return jetzt - letztesLaden >= abstand;
}

export type NeuladenErgebnis<T> = { ok: true; wines: readonly T[] } | { ok: false };

/**
 * Führt die bisherige Liste mit der neu geladenen zusammen:
 * - Weine, die es weiter gibt, behalten ihre Reihenfolge (mit den neuen Daten).
 * - Neue Weine kommen hinten dazu, in der Reihenfolge der neuen Liste.
 * - Verschwundene Weine (zum Beispiel inaktiv gesetzt) werden entfernt.
 * Schlägt das Laden fehl, bleibt die bisherige Liste unverändert (dasselbe Array).
 */
export function mergeWineLists<T extends { id: string }>(alt: T[], ergebnis: NeuladenErgebnis<T>): T[] {
  if (!ergebnis.ok) return alt;
  const neuNachId = new Map<string, T>();
  for (const w of ergebnis.wines) if (!neuNachId.has(w.id)) neuNachId.set(w.id, w);
  const altIds = new Set(alt.map((w) => w.id));
  const behalten = alt.filter((w) => neuNachId.has(w.id)).map((w) => neuNachId.get(w.id) as T);
  const dazu = [...neuNachId.values()].filter((w) => !altIds.has(w.id));
  return [...behalten, ...dazu];
}

/**
 * Neue Position im sichtbaren Stapel nach dem Zusammenführen.
 * Gibt es die aktuelle Karte (gleiche id) weiter, bleibt sie die aktuelle Karte. Sonst rückt die
 * nächste noch vorhandene Karte nach. Stand der Stapel schon am Ende, zeigt er danach die neu
 * hinzugekommenen Weine.
 */
export function folgeIndex<T extends { id: string }>(
  altSichtbar: readonly T[],
  neuSichtbar: readonly T[],
  altIndex: number,
): number {
  const aktuelle = altSichtbar[altIndex];
  if (aktuelle) {
    const i = neuSichtbar.findIndex((w) => w.id === aktuelle.id);
    if (i >= 0) return i;
  }
  const neuIds = new Set(neuSichtbar.map((w) => w.id));
  const bis = Math.max(0, Math.min(altIndex, altSichtbar.length));
  return altSichtbar.slice(0, bis).filter((w) => neuIds.has(w.id)).length;
}
