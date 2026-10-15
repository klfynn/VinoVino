import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../supabase';
import { useAuth } from '../../context/AuthContext';

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  freeze_available: boolean;
};

/**
 * Ruft bei jedem Fokus des Akademie-Screens genau einmal `academy_touch` auf.
 * Ein Tag zählt als aktiv, sobald die Akademie geöffnet wird.
 * Fehler blockieren die Seite nicht – `currentStreak` ist dann `null` (Anzeige „–").
 */
export function useAcademyStreak() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false);
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;

      (async () => {
        try {
          const { data, error: rpcError } = await supabase.rpc('academy_touch');
          if (rpcError) throw rpcError;
          const row = (Array.isArray(data) ? data[0] : data) as StreakRow | null;
          if (!row) throw new Error('Leere Antwort von academy_touch');
          setStreak(row);
          setError(false);
        } catch (err) {
          console.warn('[VinoVino] Streak konnte nicht aktualisiert werden:', err);
          setError(true);
        } finally {
          inFlight.current = false;
          setLoading(false);
        }
      })();
    }, [userId]),
  );

  return {
    currentStreak: error ? null : streak?.current_streak ?? null,
    longestStreak: error ? null : streak?.longest_streak ?? null,
    freezeAvailable: !error && !!streak?.freeze_available,
    loading,
    error,
  };
}
