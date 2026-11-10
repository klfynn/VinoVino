// Zuordnung von `weinart` (Datenbank) zum Anzeige-Typ der App (`Wine.type`). Reine Funktion.
import type { WineType } from '../../types';
import { weinartToKategorie } from '../tasting/catalog';
import type { WeinKategorie } from '../tasting/types';

// Exakte Werte zuerst: so schreibt sie das Händlerportal bzw. so hießen sie bisher in der App.
const EXAKT: Record<string, WineType> = {
  Rotwein: 'Rotwein',
  Weißwein: 'Weißwein',
  Rosé: 'Roséwein',
  Roséwein: 'Roséwein',
  Schaumwein: 'Schaumwein',
  'Dessert- und Likörwein': 'Süßwein',
  Süßwein: 'Süßwein',
};

// Für alle anderen Schreibweisen dieselbe Erkennung wie im Verkostungsbogen.
const JE_KATEGORIE: Record<WeinKategorie, WineType> = {
  rot: 'Rotwein',
  weiss: 'Weißwein',
  rose: 'Roséwein',
  schaum: 'Schaumwein',
  suess: 'Süßwein',
  // Für Orangewein gibt es in der App (noch) keinen eigenen Typ; er steht dem Weißwein am nächsten.
  orange: 'Weißwein',
  // Bisheriges Verhalten: Unbekanntes erscheint als Rotwein.
  unbekannt: 'Rotwein',
};

/**
 * Leitet den Anzeige-Typ ab. „Rosé“ wird zu „Roséwein“, „Dessert- und Likörwein“ zu „Süßwein“
 * (diese beiden Werte wurden bisher fälschlich als Rotwein angezeigt). Wirft nie.
 */
export function weinartToWineType(weinart: unknown): WineType {
  if (typeof weinart === 'string') {
    const exakt = EXAKT[weinart.trim()];
    if (exakt) return exakt;
  }
  return JE_KATEGORIE[weinartToKategorie(weinart)] ?? 'Rotwein';
}
