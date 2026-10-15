// Statisch gebündelte Lerninhalte der Wein-Akademie.
// Metro braucht statische Pfade, deshalb wird jede Datei einzeln importiert.
import tier1 from './tier1-novize.json';
import tier2 from './tier2-entdecker.json';
import tier3 from './tier3-kenner.json';
import tier4 from './tier4-sommelier.json';
import bonus from './bonus.json';

export type Segment = { t: string; b?: boolean; i?: boolean };
export type Block =
  | { type: 'p'; segments: Segment[] }
  | { type: 'ul'; items: Segment[][] };
export type Slide = { nr: number; titel: string; text: string; blocks: Block[] };
export type QuizFrage = { frage: string; optionen: string[]; richtig: number; erklaerung: string };
export type Lektion = {
  id: string; // "l01" ... "l45", "bonus-1", "bonus-2"
  nummer: number;
  bonus: boolean;
  optional: boolean; // true bei Lektion 9 und 21
  titel: string;
  lernziel: string;
  slides: Slide[];
  quiz: QuizFrage[];
  praxisaufgabe: string;
};
export type Tier = {
  tier: number | null; // null beim Bonus
  key: string;
  name: string;
  beschreibung: string;
  freigeschaltet_von_anfang: boolean; // true bei Tier 1 und Bonus
  lektionen: Lektion[];
};

// Reihenfolge: Tier 1 bis 4, danach Bonus
export const TIERS: Tier[] = [tier1, tier2, tier3, tier4, bonus] as unknown as Tier[];
