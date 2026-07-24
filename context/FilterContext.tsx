import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Weinart = 'Rotwein' | 'Weißwein' | 'Rosé' | 'Schaumwein' | 'Dessert- und Likörwein';
export type Geschmack = 'Trocken' | 'Halbtrocken' | 'Lieblich';
export type Anlass =
  | 'Romantisches Dinner'
  | 'Grillabend'
  | 'Geburtstag'
  | 'Feierabend'
  | 'Festliche Anlässe'
  | 'Picknick';
export type BioNaturVeganOption = 'Bio' | 'Natur' | 'Vegan' | 'Vegetarisch';

export interface FilterState {
  weinart: Weinart[];
  geschmack: Geschmack[];
  herkunft: string[];
  region: string[];
  rebsorte: string[];
  jahrgang: { min: number; max: number };
  preis: { min: number; max: number };
  anlass: Anlass[];
  bioNaturVegan: BioNaturVeganOption[];
  passtZu: string[];
  bewertungMin: number;
}

interface FilterContextValue extends FilterState {
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

export const DEFAULT_FILTER: FilterState = {
  weinart: [],
  geschmack: [],
  herkunft: [],
  region: [],
  rebsorte: [],
  jahrgang: { min: 1990, max: 2024 },
  preis: { min: 5, max: 500 },
  anlass: [],
  bioNaturVegan: [],
  passtZu: [],
  bewertungMin: 0,
};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTER), []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.weinart.length > 0) count++;
    if (filters.geschmack.length > 0) count++;
    if (filters.herkunft.length > 0) count++;
    if (filters.region.length > 0) count++;
    if (filters.rebsorte.length > 0) count++;
    if (
      filters.jahrgang.min > DEFAULT_FILTER.jahrgang.min ||
      filters.jahrgang.max < DEFAULT_FILTER.jahrgang.max
    ) count++;
    if (
      filters.preis.min > DEFAULT_FILTER.preis.min ||
      filters.preis.max < DEFAULT_FILTER.preis.max
    ) count++;
    if (filters.anlass.length > 0) count++;
    if (filters.bioNaturVegan.length > 0) count++;
    if (filters.passtZu.length > 0) count++;
    if (filters.bewertungMin > 0) count++;
    return count;
  }, [filters]);

  const value = useMemo<FilterContextValue>(
    () => ({ ...filters, setFilter, resetFilters, activeFilterCount }),
    [filters, setFilter, resetFilters, activeFilterCount],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilter must be used within FilterProvider');
  return ctx;
}
