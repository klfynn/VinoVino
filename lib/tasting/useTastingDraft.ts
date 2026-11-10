import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { isDraftValid, parseDraft, serializeDraft, TastingDraft, tastingDraftKey } from './draft';

/**
 * Lokaler Zwischenstand eines Verkostungsbogens (AsyncStorage), nach dem Muster von useQuizDraft.
 * Ungültige oder abgelaufene Entwürfe werden beim Laden gelöscht. Speicherfehler werden
 * protokolliert; der Bogen läuft dann einfach ohne Zwischenspeicher weiter.
 */
export function useTastingDraft(wineId: string) {
  const { user } = useAuth();
  const key = tastingDraftKey(user?.id, wineId);

  const [draft, setDraft] = useState<TastingDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Schreib- und Löschvorgänge nacheinander ausführen, damit ein spätes Speichern
  // ein vorheriges Löschen nicht überholt.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((op: () => Promise<void>) => {
    queue.current = queue.current.then(async () => {
      try {
        await op();
      } catch (err) {
        console.warn('[VinoVino] Verkostungs-Zwischenstand: Speicherzugriff fehlgeschlagen:', err);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      let next: TastingDraft | null = null;
      try {
        const raw = await AsyncStorage.getItem(key);
        const parsed = parseDraft(raw);
        if (isDraftValid(parsed, wineId)) next = parsed;
        else if (raw !== null) enqueue(() => AsyncStorage.removeItem(key));
      } catch (err) {
        console.warn('[VinoVino] Verkostungs-Zwischenstand konnte nicht gelesen werden:', err);
      }
      if (active) {
        setDraft(next);
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [key, wineId, enqueue]);

  const save = useCallback(
    (next: Omit<TastingDraft, 'wineId' | 'savedAt'>) => {
      const full: TastingDraft = { ...next, wineId, savedAt: Date.now() };
      setDraft(full);
      enqueue(() => AsyncStorage.setItem(key, serializeDraft(full)));
    },
    [key, wineId, enqueue],
  );

  const clear = useCallback(() => {
    setDraft(null);
    enqueue(() => AsyncStorage.removeItem(key));
  }, [key, enqueue]);

  return { draft, loaded, save, clear };
}
