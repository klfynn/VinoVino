import { useCallback } from 'react';
import { getLektion, getTierOfLektion, lektionLabel } from '../../content/academy/helpers';
import { isTierUnlocked } from '../academy/unlock';
import { useAcademyProgress } from '../academy/useAcademyProgress';
import { LessonInfo, LessonLink, resolveLessonLink } from './lessonLinks';

/** Anzeige-Daten einer Lektion für „Mehr dazu“ und den Kasten „Aufgabe aus Lektion …“. */
export function lessonInfo(id: string): LessonInfo | undefined {
  const lektion = getLektion(id);
  return lektion ? { id: lektion.id, label: lektionLabel(lektion), titel: lektion.titel } : undefined;
}

/**
 * Löst Katalog-Verweise im Assistenten auf. Die Freischalt-Logik (`isTierUnlocked`) und der
 * Akademie-Fortschritt werden nur gelesen. Solange der Fortschritt lädt oder nicht geladen werden
 * kann, gelten nur Tier 1 und Bonus als frei (wie in der Lektionsansicht).
 */
export function useLessonLinks() {
  const { completedIds } = useAcademyProgress();

  const isUnlocked = useCallback(
    (id: string) => {
      const tier = getTierOfLektion(id);
      return !!tier && isTierUnlocked(tier, completedIds);
    },
    [completedIds],
  );

  const linkFor = useCallback(
    (lektion: unknown): LessonLink => resolveLessonLink(lektion, { getLesson: lessonInfo, isUnlocked }),
    [isUnlocked],
  );

  return { linkFor, isUnlocked };
}
