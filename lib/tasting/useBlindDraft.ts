import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { blindDraftPrefix, newestBlindDraft, TastingDraft } from './draft';
import { WineRef } from './types';

/**
 * Sucht die neueste angefangene Blindverkostung des Nutzers (AsyncStorage), damit die Weinauswahl
 * „Weitermachen“ anbieten kann, ohne den Namen des Weins zu zeigen. `isAvailable` prüft, ob der Wein
 * noch im Weinkeller liegt und verkostet werden kann. Lesefehler werden protokolliert, nicht angezeigt.
 */
export function useBlindDraft(isAvailable: (ref: WineRef) => boolean) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [draft, setDraft] = useState<TastingDraft | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDraft(null);
      return;
    }
    try {
      const prefix = blindDraftPrefix(userId);
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
      const entries = keys.length > 0 ? await AsyncStorage.multiGet(keys) : [];
      setDraft(newestBlindDraft(entries, userId, Date.now(), isAvailable));
    } catch (err) {
      console.warn('[VinoVino] Angefangene Blindverkostung konnte nicht gelesen werden:', err);
      setDraft(null);
    }
  }, [userId, isAvailable]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { draft, refresh };
}
