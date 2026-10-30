import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../context/AuthContext';
import { academyErrorMessage } from './errors';

type ProgressRow = {
  lesson_id: string;
  best_score: number;
  attempts: number;
};

export function useAcademyProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    // Spinner nur beim ersten Laden; spätere Aktualisierungen laufen still.
    if (!hasLoaded.current) setLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('academy_progress')
        .select('lesson_id, best_score, attempts')
        .eq('user_id', userId);
      if (dbError) throw dbError;
      setRows((data ?? []) as ProgressRow[]);
      setError(null);
      hasLoaded.current = true;
    } catch (err) {
      console.error('[VinoVino] Akademie-Fortschritt konnte nicht geladen werden:', err);
      setError(academyErrorMessage(err, 'Dein Fortschritt konnte nicht geladen werden.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    hasLoaded.current = false;
    refresh();
  }, [refresh]);

  /**
   * Speichert eine abgeschlossene Lektion (Upsert auf user_id + lesson_id).
   * best_score = Maximum aus altem und neuem Wert, attempts + 1.
   * completed_at wird nur beim ersten Abschluss gesetzt und danach beibehalten.
   */
  const markCompleted = useCallback(
    async (lessonId: string, score: number): Promise<{ ok: boolean; error?: string }> => {
      if (!userId) return { ok: false, error: 'Bitte melde dich an, um deinen Fortschritt zu speichern.' };
      try {
        const { data: existing, error: readError } = await supabase
          .from('academy_progress')
          .select('lesson_id, best_score, attempts, completed_at')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        if (readError) throw readError;

        const prev = existing as (ProgressRow & { completed_at: string | null }) | null;
        const next = {
          user_id: userId,
          lesson_id: lessonId,
          best_score: Math.max(prev?.best_score ?? 0, score),
          attempts: prev ? prev.attempts + 1 : 1,
          completed_at: prev?.completed_at ?? new Date().toISOString(),
        };

        const { error: writeError } = await supabase
          .from('academy_progress')
          .upsert(next, { onConflict: 'user_id,lesson_id' });
        if (writeError) throw writeError;

        setRows((current) => [
          ...current.filter((r) => r.lesson_id !== lessonId),
          { lesson_id: lessonId, best_score: next.best_score, attempts: next.attempts },
        ]);
        return { ok: true };
      } catch (err) {
        console.error('[VinoVino] Akademie-Fortschritt konnte nicht gespeichert werden:', err);
        return { ok: false, error: academyErrorMessage(err, 'Dein Fortschritt konnte nicht gespeichert werden.') };
      }
    },
    [userId],
  );

  const completedIds = useMemo(() => new Set(rows.map((r) => r.lesson_id)), [rows]);
  const scores = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.lesson_id, r.best_score])) as Record<string, number>,
    [rows],
  );

  return { completedIds, scores, loading, error, refresh, markCompleted };
}
