import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { mapRow } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Wine } from '../types';

export interface CellarWine {
  id: string;
  wine: Wine;
  quantity: number;
  addedAt: Date;
  source: 'purchase' | 'manual' | 'scanner';
  purchaseDate?: Date;
  rating?: number;
  notes?: string;
}

interface CellarContextValue {
  cellarWines: CellarWine[];
  cellarLoading: boolean;
  cellarError: string | null;
  addToCellar: (wine: Wine, quantity: number, source: CellarWine['source']) => Promise<void>;
  removeFromCellar: (wineId: string) => Promise<void>;
  updateQuantity: (wineId: string, quantity: number) => Promise<void>;
}

const CellarContext = createContext<CellarContextValue | undefined>(undefined);

function mapCellarRow(row: Record<string, unknown>): CellarWine | null {
  const wineData = row.wines as Record<string, unknown> | null;
  if (!wineData) return null;
  return {
    id: String(row.id),
    wine: mapRow(wineData),
    quantity: Number(row.quantity) || 1,
    addedAt: new Date(String(row.added_at)),
    source: (row.source as CellarWine['source']) ?? 'manual',
    purchaseDate: row.purchase_date ? new Date(String(row.purchase_date)) : undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export function CellarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [cellarWines, setCellarWines] = useState<CellarWine[]>([]);
  const [cellarLoading, setCellarLoading] = useState(false);
  const [cellarError, setCellarError] = useState<string | null>(null);

  const loadCellar = useCallback(async (uid: string) => {
    setCellarLoading(true);
    setCellarError(null);
    const { data, error } = await supabase
      .from('purchased_wines')
      .select('id, wine_id, quantity, source, added_at, purchase_date, rating, notes, wines(*)')
      .eq('user_id', uid)
      .order('added_at', { ascending: false });
    setCellarLoading(false);
    if (error) {
      setCellarError('Weinkeller konnte nicht geladen werden. Bitte versuche es erneut.');
      return;
    }
    const wines: CellarWine[] = (data ?? [])
      .map((row) => mapCellarRow(row as Record<string, unknown>))
      .filter((cw): cw is CellarWine => cw !== null);
    setCellarWines(wines);
  }, []);

  useEffect(() => {
    if (userId) {
      loadCellar(userId);
    } else {
      setCellarWines([]);
      setCellarError(null);
    }
  }, [userId, loadCellar]);

  const addToCellar = useCallback(
    async (wine: Wine, quantity: number, source: CellarWine['source']) => {
      const isLocalWine = wine.id.startsWith('manual_') || wine.id.startsWith('scanner_');
      const existing = cellarWines.find((cw) => cw.wine.id === wine.id);

      if (existing) {
        const newQty = existing.quantity + quantity;
        setCellarWines((prev) =>
          prev.map((cw) => (cw.wine.id === wine.id ? { ...cw, quantity: newQty } : cw)),
        );
        if (!isLocalWine && userId) {
          const { error } = await supabase
            .from('purchased_wines')
            .update({ quantity: newQty })
            .eq('id', existing.id);
          if (error) {
            setCellarWines((prev) =>
              prev.map((cw) => (cw.wine.id === wine.id ? existing : cw)),
            );
          }
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const newEntry: CellarWine = {
          id: tempId,
          wine,
          quantity,
          addedAt: new Date(),
          source,
          purchaseDate: source === 'purchase' ? new Date() : undefined,
        };
        setCellarWines((prev) => [newEntry, ...prev]);
        if (!isLocalWine && userId) {
          const { data, error } = await supabase
            .from('purchased_wines')
            .insert({
              user_id: userId,
              wine_id: wine.id,
              quantity,
              source,
              added_at: new Date().toISOString(),
              purchase_date: source === 'purchase' ? new Date().toISOString() : null,
            })
            .select('id')
            .single();
          if (error) {
            setCellarWines((prev) => prev.filter((cw) => cw.id !== tempId));
          } else if (data) {
            setCellarWines((prev) =>
              prev.map((cw) => (cw.id === tempId ? { ...cw, id: String(data.id) } : cw)),
            );
          }
        }
      }
    },
    [userId, cellarWines],
  );

  const removeFromCellar = useCallback(
    async (wineId: string) => {
      const removed = cellarWines.find((cw) => cw.wine.id === wineId);
      setCellarWines((prev) => prev.filter((cw) => cw.wine.id !== wineId));
      if (removed && userId && !removed.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('purchased_wines')
          .delete()
          .eq('id', removed.id);
        if (error) {
          setCellarWines((prev) => [removed, ...prev]);
        }
      }
    },
    [userId, cellarWines],
  );

  const updateQuantity = useCallback(
    async (wineId: string, quantity: number) => {
      const prev = cellarWines.find((cw) => cw.wine.id === wineId);
      if (quantity <= 0) {
        setCellarWines((c) => c.filter((cw) => cw.wine.id !== wineId));
        if (prev && userId && !prev.id.startsWith('temp_')) {
          const { error } = await supabase.from('purchased_wines').delete().eq('id', prev.id);
          if (error && prev) setCellarWines((c) => [prev, ...c]);
        }
      } else {
        setCellarWines((c) =>
          c.map((cw) => (cw.wine.id === wineId ? { ...cw, quantity } : cw)),
        );
        if (prev && userId && !prev.id.startsWith('temp_')) {
          const { error } = await supabase
            .from('purchased_wines')
            .update({ quantity })
            .eq('id', prev.id);
          if (error && prev) {
            setCellarWines((c) =>
              c.map((cw) => (cw.wine.id === wineId ? { ...cw, quantity: prev.quantity } : cw)),
            );
          }
        }
      }
    },
    [userId, cellarWines],
  );

  const value = useMemo<CellarContextValue>(
    () => ({ cellarWines, cellarLoading, cellarError, addToCellar, removeFromCellar, updateQuantity }),
    [cellarWines, cellarLoading, cellarError, addToCellar, removeFromCellar, updateQuantity],
  );

  return <CellarContext.Provider value={value}>{children}</CellarContext.Provider>;
}

export function useCellar() {
  const ctx = useContext(CellarContext);
  if (!ctx) throw new Error('useCellar must be used within CellarProvider');
  return ctx;
}
