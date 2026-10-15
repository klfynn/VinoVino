// Reine Freischalt- und Fortschrittslogik der Akademie (ohne Nebenwirkungen).
import { TIERS, Tier } from '../../content/academy';
import { pflichtLektionen } from '../../content/academy/helpers';

export type Progress = { done: number; total: number };

/**
 * Tier 1 und Bonus sind immer freigeschaltet.
 * Tier N (N ≥ 2) ist freigeschaltet, wenn alle Pflichtlektionen von Tier N−1
 * abgeschlossen sind. Optionale Lektionen (9 und 21) zählen dafür nicht.
 */
export function isTierUnlocked(tier: Tier, completedIds: Set<string>, tiers: Tier[] = TIERS): boolean {
  if (tier.tier === null || tier.tier <= 1 || tier.freigeschaltet_von_anfang) return true;
  const previous = tiers.find((t) => t.tier === (tier.tier as number) - 1);
  if (!previous) return false;
  return pflichtLektionen(previous).every((l) => completedIds.has(l.id));
}

/** Fortschritt über alle Lektionen des Tiers (inkl. freiwilliger). */
export function tierProgress(tier: Tier, completedIds: Set<string>): Progress {
  return {
    done: tier.lektionen.filter((l) => completedIds.has(l.id)).length,
    total: tier.lektionen.length,
  };
}

/** Fortschritt über die Pflichtlektionen des Tiers. */
export function requiredProgress(tier: Tier, completedIds: Set<string>): Progress {
  const pflicht = pflichtLektionen(tier);
  return {
    done: pflicht.filter((l) => completedIds.has(l.id)).length,
    total: pflicht.length,
  };
}

/** Tier gilt als abgeschlossen, wenn alle Pflichtlektionen erledigt sind. */
export function isTierComplete(tier: Tier, completedIds: Set<string>): boolean {
  const { done, total } = requiredProgress(tier, completedIds);
  return total > 0 && done === total;
}

/**
 * Index des Tiers, auf das das Karussell beim ersten Öffnen springt:
 * das höchste freigeschaltete, noch nicht abgeschlossene Tier (1–4).
 * Sind alle Tiers abgeschlossen, wird der Bonus gewählt.
 */
export function initialTierIndex(completedIds: Set<string>, tiers: Tier[] = TIERS): number {
  let best = -1;
  tiers.forEach((t, i) => {
    if (t.tier === null) return;
    if (isTierUnlocked(t, completedIds, tiers) && !isTierComplete(t, completedIds)) best = i;
  });
  if (best >= 0) return best;
  const bonusIndex = tiers.findIndex((t) => t.tier === null);
  return bonusIndex >= 0 ? bonusIndex : 0;
}
