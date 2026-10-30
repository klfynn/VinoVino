import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { QuizFrage } from '../../content/academy';
import { draftKey, isDraftValid, parseDraft, QuizDraft, serializeDraft } from './quizDraft';

/**
 * Lokaler Zwischenstand eines Quiz (AsyncStorage). Ungültige oder abgelaufene
 * Entwürfe werden beim Laden gelöscht. Jeder Speicherfehler wird still geschluckt –
 * das Quiz läuft dann einfach ohne Zwischenspeicher.
 */
export function useQuizDraft(lessonId: string, fragen: QuizFrage[]) {
  const { user } = useAuth();
  const key = draftKey(user?.id, lessonId);

  const [draft, setDraft] = useState<QuizDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Schreib- und Löschvorgänge nacheinander ausführen, damit ein spätes Speichern
  // ein vorheriges Löschen nicht überholt.
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((op: () => Promise<void>) => {
    queue.current = queue.current.then(async () => {
      try {
        await op();
      } catch (err) {
        console.warn('[VinoVino] Quiz-Zwischenstand: Speicherzugriff fehlgeschlagen:', err);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      let next: QuizDraft | null = null;
      try {
        const raw = await AsyncStorage.getItem(key);
        const parsed = parseDraft(raw);
        if (isDraftValid(parsed, lessonId, fragen)) next = parsed;
        else if (raw !== null) enqueue(() => AsyncStorage.removeItem(key));
      } catch (err) {
        console.warn('[VinoVino] Quiz-Zwischenstand konnte nicht gelesen werden:', err);
      }
      if (active) {
        setDraft(next);
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [key, lessonId, fragen, enqueue]);

  const save = useCallback(
    (answers: (number | null)[]) => {
      const next: QuizDraft = { lessonId, answers, savedAt: Date.now() };
      setDraft(next);
      enqueue(() => AsyncStorage.setItem(key, serializeDraft(next)));
    },
    [key, lessonId, enqueue],
  );

  const clear = useCallback(() => {
    setDraft(null);
    enqueue(() => AsyncStorage.removeItem(key));
  }, [key, enqueue]);

  return { draft, loaded, save, clear };
}
