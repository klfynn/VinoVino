import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Wine } from '../types';
import { useAuth } from './AuthContext';
import {
  addPurchase,
  loadCellar,
  removeMarketWine,
  saveMarketReview,
  setMarketQuantity,
} from '../services/cellar';
import {
  createCustomWine as createCustomWineDb,
  deleteCustomWine,
  setCustomWineQuantity,
  setCustomWineRating,
  updateCustomWine as updateCustomWineDb,
} from '../services/customWines';
import { canPersistMarketWine, mergeCellar } from '../lib/cellar/merge';
import { validateCustomWineInput, validateRating } from '../lib/cellar/validate';
import { INVALID_INPUT_MESSAGE, NOT_FOUND_MESSAGE } from '../lib/cellar/errors';
import { marketRef, wineRefKey } from '../lib/tasting/wineRef';
import type {
  CellarResult,
  CellarSource,
  CellarWine,
  CustomWine,
  PurchaseRow,
  ReviewRow,
} from '../lib/cellar/types';

// Typ weiterhin von hier exportiert, damit bestehende Importe funktionieren.
export type { CellarWine } from '../lib/cellar/types';

/**
 * „Mein Weinkeller“.
 * - Angemeldet: Marktplatzweine liegen in purchased_wines (Sterne/Notiz in reviews), eigene Weine in
 *   custom_wines. Beides wird beim Anmelden und beim Öffnen des Weinkellers geladen.
 * - Weine ohne echte UUID (lokale Testdaten aus data/wines.ts, Scanner-Ergebnisse) und alles ohne
 *   Anmeldung bleiben wie bisher nur im Arbeitsspeicher (`persisted: false`).
 */
interface CellarContextValue {
  cellarWines: CellarWine[];
  /** true, solange der Weinkeller zum ersten Mal geladen wird */
  loading: boolean;
  /** Fehlermeldung des letzten Ladens (Teile, die geladen werden konnten, werden trotzdem angezeigt) */
  loadError: string | null;
  /** true, wenn ein Nutzer angemeldet ist und der Weinkeller dauerhaft gespeichert wird */
  isPersistent: boolean;
  reload: () => Promise<void>;
  /** Wird von Checkout, Scanner und Katalogauswahl benutzt. Meldet Fehler selbst per Hinweisfenster. */
  addToCellar: (wine: Wine, quantity: number, source: CellarSource) => Promise<CellarResult<null>>;
  removeEntry: (entry: CellarWine) => Promise<CellarResult<null>>;
  setQuantity: (entry: CellarWine, quantity: number) => Promise<CellarResult<null>>;
  setRating: (entry: CellarWine, rating: number, note: string) => Promise<CellarResult<null>>;
  createCustomWine: (input: unknown) => Promise<CellarResult<CellarWine>>;
  updateCustomWine: (entry: CellarWine, input: unknown) => Promise<CellarResult<null>>;
  /** Eintrag zu einem Marktplatzwein (z. B. für die eigene Bewertung in der Detailansicht) */
  findMarketEntry: (wineId: string) => CellarWine | undefined;
}

const CellarContext = createContext<CellarContextValue | undefined>(undefined);

const ok = <T,>(data: T): CellarResult<T> => ({ ok: true, data });
const fail = <T,>(error: string): CellarResult<T> => ({ ok: false, error });

type Remote = {
  purchases: PurchaseRow[];
  marketWines: Record<string, Wine>;
  reviews: ReviewRow[];
  customWines: CustomWine[];
};
const EMPTY_REMOTE: Remote = { purchases: [], marketWines: {}, reviews: [], customWines: [] };

/** Bereinigte Formularwerte als eigener Wein im Arbeitsspeicher (ohne Anmeldung). */
function localCustomWine(values: ReturnType<typeof validateCustomWineInput>['values'], base?: CustomWine): CustomWine {
  const now = new Date().toISOString();
  return {
    id: base?.id ?? `lokal-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    userId: '',
    source: 'manual',
    rating: base?.rating ?? null,
    notiz: base?.notiz ?? null,
    bildUrl: null,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
    ...values,
  };
}

export function CellarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [remote, setRemote] = useState<Remote>(EMPTY_REMOTE);
  const [localEntries, setLocalEntries] = useState<CellarWine[]>([]);
  const [localCustomWines, setLocalCustomWines] = useState<CustomWine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  // Verhindert, dass eine ältere, langsame Antwort eine neuere überschreibt.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    if (!userId) {
      setLoading(false);
      return;
    }
    // Spinner nur beim ersten Laden für diesen Nutzer; spätere Aktualisierungen laufen still.
    if (loadedFor.current !== userId) setLoading(true);
    const result = await loadCellar(userId);
    if (current !== requestId.current) return;
    setRemote((prev) => ({
      // Teile, die nicht geladen werden konnten, behalten ihren bisherigen Stand.
      purchases: result.failed.purchases ? prev.purchases : result.purchases,
      marketWines: { ...prev.marketWines, ...result.marketWines },
      reviews: result.failed.reviews ? prev.reviews : result.reviews,
      customWines: result.failed.customWines ? prev.customWines : result.customWines,
    }));
    setLoadError(result.errors[0] ?? null);
    loadedFor.current = userId;
    setLoading(false);
  }, [userId]);

  // Beim Anmelden laden, beim Abmelden alles leeren. Lokale Einträge aus der Zeit ohne Anmeldung
  // bleiben nach dem Anmelden sichtbar (weiter nur im Arbeitsspeicher); bei einem direkten
  // Kontowechsel werden sie verworfen.
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    const wechsel = previousUser.current !== null && previousUser.current !== userId;
    previousUser.current = userId;
    setRemote(EMPTY_REMOTE);
    setLoadError(null);
    loadedFor.current = null;
    if (userId) {
      if (wechsel) {
        setLocalEntries([]);
        setLocalCustomWines([]);
      }
      reload();
    } else {
      requestId.current += 1;
      setLocalEntries([]);
      setLocalCustomWines([]);
      setLoading(false);
    }
  }, [userId, reload]);

  const cellarWines = useMemo(
    () => mergeCellar({ ...remote, localEntries, localCustomWines }),
    [remote, localEntries, localCustomWines],
  );

  // ── Hinzufügen (Checkout, Scanner, Katalog) ──────────────────────────────────

  const addLocal = useCallback((wine: Wine, quantity: number, source: CellarSource) => {
    setLocalEntries((prev) => {
      const existing = prev.find((cw) => cw.wine.id === wine.id);
      if (existing) {
        return prev.map((cw) => (cw.wine.id === wine.id ? { ...cw, quantity: cw.quantity + quantity } : cw));
      }
      return [
        ...prev,
        {
          id: `lokal:${wineRefKey(marketRef(wine.id))}`,
          ref: marketRef(wine.id),
          wine,
          quantity,
          addedAt: new Date(),
          source,
          purchaseDate: source === 'purchase' ? new Date() : undefined,
          persisted: false,
        },
      ];
    });
  }, []);

  const addToCellar = useCallback(
    async (wine: Wine, quantity: number, source: CellarSource): Promise<CellarResult<null>> => {
      // Ohne Anmeldung oder ohne echte UUID (lokale Testdaten, Scanner): wie bisher im Arbeitsspeicher.
      if (!userId || !canPersistMarketWine(wine.id)) {
        addLocal(wine, quantity, source);
        return ok(null);
      }
      const result = await addPurchase(userId, wine.id, quantity, source);
      if (!result.ok) {
        Alert.alert('Weinkeller', `„${wine.name}“: ${result.error}`);
        return fail(result.error);
      }
      setRemote((prev) => ({
        ...prev,
        purchases: [...prev.purchases.filter((p) => !p.id || p.id !== result.data.id), result.data],
        marketWines: { ...prev.marketWines, [wine.id]: prev.marketWines[wine.id] ?? wine },
      }));
      return ok(null);
    },
    [userId, addLocal],
  );

  // ── Entfernen ────────────────────────────────────────────────────────────────

  const removeEntry = useCallback(
    async (entry: CellarWine): Promise<CellarResult<null>> => {
      if (!entry.persisted) {
        if (entry.ref.kind === 'custom') setLocalCustomWines((prev) => prev.filter((w) => w.id !== entry.ref.id));
        else setLocalEntries((prev) => prev.filter((cw) => cw.id !== entry.id));
        return ok(null);
      }
      if (!userId) return fail(NOT_FOUND_MESSAGE);
      if (entry.ref.kind === 'custom') {
        const result = await deleteCustomWine(entry.ref.id);
        if (!result.ok) return result;
        setRemote((prev) => ({ ...prev, customWines: prev.customWines.filter((w) => w.id !== entry.ref.id) }));
        return ok(null);
      }
      const result = await removeMarketWine(userId, entry.ref.id);
      if (!result.ok) return result;
      setRemote((prev) => ({ ...prev, purchases: prev.purchases.filter((p) => p.wineId !== entry.ref.id) }));
      return ok(null);
    },
    [userId],
  );

  // ── Flaschenzahl ─────────────────────────────────────────────────────────────

  const setQuantity = useCallback(
    async (entry: CellarWine, quantity: number): Promise<CellarResult<null>> => {
      if (!Number.isInteger(quantity) || quantity < 0) return fail(INVALID_INPUT_MESSAGE);
      if (entry.ref.kind === 'custom') {
        // Eigene Weine bleiben auch mit 0 Flaschen erhalten (sonst wären ihre Verkostungen weg).
        if (!entry.persisted) {
          setLocalCustomWines((prev) => prev.map((w) => (w.id === entry.ref.id ? { ...w, quantity } : w)));
          return ok(null);
        }
        const result = await setCustomWineQuantity(entry.ref.id, quantity);
        if (!result.ok) return result;
        setRemote((prev) => ({
          ...prev,
          customWines: prev.customWines.map((w) => (w.id === result.data.id ? result.data : w)),
        }));
        return ok(null);
      }
      if (!entry.persisted) {
        // Wie bisher: 0 entfernt den Eintrag.
        setLocalEntries((prev) =>
          quantity <= 0 ? prev.filter((cw) => cw.id !== entry.id) : prev.map((cw) => (cw.id === entry.id ? { ...cw, quantity } : cw)),
        );
        return ok(null);
      }
      if (!userId) return fail(NOT_FOUND_MESSAGE);
      const rows = remote.purchases.filter((p) => p.wineId === entry.ref.id);
      const result = await setMarketQuantity(userId, rows, quantity);
      if (!result.ok) return result;
      setRemote((prev) => ({
        ...prev,
        purchases: [...prev.purchases.filter((p) => p.wineId !== entry.ref.id), ...result.data],
      }));
      return ok(null);
    },
    [userId, remote.purchases],
  );

  // ── Sterne und Notiz ─────────────────────────────────────────────────────────

  const setRating = useCallback(
    async (entry: CellarWine, rating: number, note: string): Promise<CellarResult<null>> => {
      const invalid = validateRating(rating, note);
      if (invalid) return fail(invalid);
      const notiz = note.trim();
      if (!entry.persisted) {
        if (entry.ref.kind === 'custom') {
          setLocalCustomWines((prev) =>
            prev.map((w) => (w.id === entry.ref.id ? { ...w, rating, notiz: notiz || null, updatedAt: new Date().toISOString() } : w)),
          );
        } else {
          setLocalEntries((prev) =>
            prev.map((cw) => (cw.id === entry.id ? { ...cw, rating, notes: notiz || undefined, ratedAt: new Date().toISOString() } : cw)),
          );
        }
        return ok(null);
      }
      if (!userId) return fail(NOT_FOUND_MESSAGE);
      if (entry.ref.kind === 'custom') {
        const result = await setCustomWineRating(entry.ref.id, rating, notiz);
        if (!result.ok) return result;
        setRemote((prev) => ({
          ...prev,
          customWines: prev.customWines.map((w) => (w.id === result.data.id ? result.data : w)),
        }));
        return ok(null);
      }
      const result = await saveMarketReview(userId, entry.ref.id, rating, notiz);
      if (!result.ok) return result;
      setRemote((prev) => ({
        ...prev,
        reviews: [...prev.reviews.filter((r) => r.wineId !== entry.ref.id), result.data],
      }));
      return ok(null);
    },
    [userId],
  );

  // ── Eigene Weine ─────────────────────────────────────────────────────────────

  const createCustomWine = useCallback(
    async (input: unknown): Promise<CellarResult<CellarWine>> => {
      const check = validateCustomWineInput(input);
      if (!check.ok) return fail(INVALID_INPUT_MESSAGE);
      let wine: CustomWine;
      if (!userId) {
        wine = localCustomWine(check.values);
        setLocalCustomWines((prev) => [wine, ...prev]);
      } else {
        const result = await createCustomWineDb(userId, check.values);
        if (!result.ok) return result;
        wine = result.data;
        setRemote((prev) => ({ ...prev, customWines: [wine, ...prev.customWines.filter((w) => w.id !== wine.id)] }));
      }
      const entry = mergeCellar({
        ...EMPTY_REMOTE,
        customWines: userId ? [wine] : [],
        localCustomWines: userId ? [] : [wine],
        localEntries: [],
      })[0];
      return ok(entry);
    },
    [userId],
  );

  const updateCustomWine = useCallback(
    async (entry: CellarWine, input: unknown): Promise<CellarResult<null>> => {
      if (entry.ref.kind !== 'custom' || !entry.custom) return fail(NOT_FOUND_MESSAGE);
      const check = validateCustomWineInput(input);
      if (!check.ok) return fail(INVALID_INPUT_MESSAGE);
      if (!entry.persisted) {
        const base = entry.custom;
        setLocalCustomWines((prev) => prev.map((w) => (w.id === base.id ? localCustomWine(check.values, base) : w)));
        return ok(null);
      }
      const result = await updateCustomWineDb(entry.ref.id, check.values);
      if (!result.ok) return result;
      setRemote((prev) => ({
        ...prev,
        customWines: prev.customWines.map((w) => (w.id === result.data.id ? result.data : w)),
      }));
      return ok(null);
    },
    [],
  );

  const findMarketEntry = useCallback(
    (wineId: string) => cellarWines.find((cw) => cw.ref.kind === 'market' && cw.ref.id === wineId),
    [cellarWines],
  );

  const value = useMemo<CellarContextValue>(
    () => ({
      cellarWines,
      loading,
      loadError,
      isPersistent: !!userId,
      reload,
      addToCellar,
      removeEntry,
      setQuantity,
      setRating,
      createCustomWine,
      updateCustomWine,
      findMarketEntry,
    }),
    [
      cellarWines, loading, loadError, userId, reload, addToCellar, removeEntry,
      setQuantity, setRating, createCustomWine, updateCustomWine, findMarketEntry,
    ],
  );

  return <CellarContext.Provider value={value}>{children}</CellarContext.Provider>;
}

export function useCellar() {
  const ctx = useContext(CellarContext);
  if (!ctx) throw new Error('useCellar must be used within CellarProvider');
  return ctx;
}
