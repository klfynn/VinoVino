import { TIERS, Tier, Lektion } from './index';

const LEKTION_INDEX: Map<string, { lektion: Lektion; tier: Tier }> = new Map(
  TIERS.flatMap((tier) => tier.lektionen.map((lektion) => [lektion.id, { lektion, tier }] as const)),
);

export function getTier(key: string): Tier | undefined {
  return TIERS.find((t) => t.key === key);
}

export function getLektion(id: string): Lektion | undefined {
  return LEKTION_INDEX.get(id)?.lektion;
}

/** Tier, zu dem eine Lektion gehört. */
export function getTierOfLektion(id: string): Tier | undefined {
  return LEKTION_INDEX.get(id)?.tier;
}

/** Nächste Lektion im selben Tier (Reihenfolge der Datei), sonst `undefined`. */
export function nextLektion(id: string): Lektion | undefined {
  const tier = getTierOfLektion(id);
  if (!tier) return undefined;
  const index = tier.lektionen.findIndex((l) => l.id === id);
  return index >= 0 ? tier.lektionen[index + 1] : undefined;
}

/** Alle Lektionen eines Tiers mit `optional === false`. */
export function pflichtLektionen(tier: Tier): Lektion[] {
  return tier.lektionen.filter((l) => l.optional === false);
}

/** Anzeige-Nummer: „Lektion 3" bzw. „Bonus 1". */
export function lektionLabel(lektion: Lektion): string {
  return lektion.bonus ? `Bonus ${lektion.nummer}` : `Lektion ${lektion.nummer}`;
}

/** Anzeige-Label eines Tiers: „Tier 2" bzw. „Bonus". */
export function tierLabel(tier: Tier): string {
  return tier.tier === null ? 'Bonus' : `Tier ${tier.tier}`;
}
