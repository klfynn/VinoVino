import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  countActiveFilters,
  DEFAULT_FILTER,
  type FilterState,
} from '../lib/filter';

// Typen und Standardwerte stehen in lib/filter.ts (reine Funktionen, im Prüfskript getestet).
export type { Weinart, Geschmack, Anlass, BioNaturVeganOption, FilterState } from '../lib/filter';
export { DEFAULT_FILTER } from '../lib/filter';

interface FilterContextValue extends FilterState {
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTER), []);

  // Ein Jahrgangs- oder Preisbereich zählt nur als aktiv, wenn er enger ist als der Standard.
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

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
