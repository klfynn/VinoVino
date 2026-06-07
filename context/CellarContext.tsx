import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
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
  addToCellar: (wine: Wine, quantity: number, source: CellarWine['source']) => void;
  removeFromCellar: (wineId: string) => void;
  updateQuantity: (wineId: string, quantity: number) => void;
}

const CellarContext = createContext<CellarContextValue | undefined>(undefined);

export function CellarProvider({ children }: { children: React.ReactNode }) {
  const [cellarWines, setCellarWines] = useState<CellarWine[]>([]);

  const addToCellar = useCallback(
    (wine: Wine, quantity: number, source: CellarWine['source']) => {
      setCellarWines((prev) => {
        const existing = prev.find((cw) => cw.wine.id === wine.id);
        if (existing) {
          return prev.map((cw) =>
            cw.wine.id === wine.id ? { ...cw, quantity: cw.quantity + quantity } : cw,
          );
        }
        return [
          ...prev,
          {
            id: `${wine.id}_${Date.now()}`,
            wine,
            quantity,
            addedAt: new Date(),
            source,
            purchaseDate: source === 'purchase' ? new Date() : undefined,
          },
        ];
      });
    },
    [],
  );

  const removeFromCellar = useCallback((wineId: string) => {
    setCellarWines((prev) => prev.filter((cw) => cw.wine.id !== wineId));
  }, []);

  const updateQuantity = useCallback((wineId: string, quantity: number) => {
    if (quantity <= 0) {
      setCellarWines((prev) => prev.filter((cw) => cw.wine.id !== wineId));
    } else {
      setCellarWines((prev) =>
        prev.map((cw) => (cw.wine.id === wineId ? { ...cw, quantity } : cw)),
      );
    }
  }, []);

  const value = useMemo<CellarContextValue>(
    () => ({ cellarWines, addToCellar, removeFromCellar, updateQuantity }),
    [cellarWines, addToCellar, removeFromCellar, updateQuantity],
  );

  return <CellarContext.Provider value={value}>{children}</CellarContext.Provider>;
}

export function useCellar() {
  const ctx = useContext(CellarContext);
  if (!ctx) throw new Error('useCellar must be used within CellarProvider');
  return ctx;
}
