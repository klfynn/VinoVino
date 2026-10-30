import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { useAuth } from '../../context/AuthContext';
import {
  detectStreakEvent,
  parseSnapshot,
  serializeSnapshot,
  StreakEvent,
  StreakSnapshot,
  streakSnapshotKey,
} from './streakEvents';

type StreakRow = {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  freeze_available: boolean;
  freeze_last_granted_week: string | null;
};

/** Ereignis seit dem letzten bekannten Stand; `id` ändert sich mit jedem Öffnen. */
export type StreakNotice = { id: number; event: StreakEvent; streak: StreakSnapshot };

async function readSnapshot(userId: string): Promise<StreakSnapshot | null> {
  try {
    return parseSnapshot(await AsyncStorage.getItem(streakSnapshotKey(userId)));
  } catch (err) {
    console.warn('[VinoVino] Streak-Stand konnte nicht gelesen werden:', err);
    return null;
  }
}

async function writeSnapshot(userId: string, snapshot: StreakSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(streakSnapshotKey(userId), serializeSnapshot(snapshot));
  } catch (err) {
    console.warn('[VinoVino] Streak-Stand konnte nicht gespeichert werden:', err);
  }
}

/**
 * Ruft bei jedem Fokus des Akademie-Screens genau einmal `academy_touch` auf.
 * Ein Tag zählt als aktiv, sobald die Akademie geöffnet wird.
 * Fehler blockieren die Seite nicht – `currentStreak` ist dann `null` (Anzeige „–").
 * Nach jedem erfolgreichen Aufruf wird der Stand lokal gemerkt; der Vergleich mit dem
 * vorherigen Stand ergibt höchstens einen Hinweis pro Öffnen (`notice`).
 */
export function useAcademyStreak() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previous, setPrevious] = useState<StreakSnapshot | null>(null);
  const [notice, setNotice] = useState<StreakNotice | null>(null);
  const inFlight = useRef(false);
  const noticeId = useRef(0);

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

          const next: StreakSnapshot = {
            current_streak: row.current_streak,
            longest_streak: row.longest_streak,
            last_active_date: String(row.last_active_date ?? ''),
          };
          const prev = await readSnapshot(userId);
          setPrevious(prev);
          const event = detectStreakEvent(prev, next);
          if (event) {
            noticeId.current += 1;
            setNotice({ id: noticeId.current, event, streak: next });
          }
          // Nur vollständige Stände (gültiges Datum) merken.
          if (parseSnapshot(serializeSnapshot(next))) await writeSnapshot(userId, next);
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
    lastActiveDate: error ? null : streak?.last_active_date ?? null,
    previous,
    notice: error ? null : notice,
    loading,
    error,
  };
}
