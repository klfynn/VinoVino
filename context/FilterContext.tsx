import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Anlass, FilterState, Geschmack, Weinart, Wine } from '../types';

export const JAHRGANG_BOUNDS = { min: 1990, max: 2024 } as const;
export const PREIS_BOUNDS = { min: 5, max: 500 } as const;

const DEFAULT_FILTERS: FilterState = {
  weinart: [],
  geschmack: [],
  herkunft: [],
  rebsorte: [],
  jahrgang: { min: JAHRGANG_BOUNDS.min, max: JAHRGANG_BOUNDS.max },
  preis: { min: PREIS_BOUNDS.min, max: PREIS_BOUNDS.max },
  anlass: [],
  bio: false,
  bewertungMin: 0,
};

const WEINART_TO_TYPE: Record<Weinart, string> = {
  Rot: 'Rotwein',
  Weiß: 'Weißwein',
  Rosé: 'Roséwein',
  Schaumwein: 'Schaumwein',
  Port: 'Süßwein',
};

interface FilterContextValue extends FilterState {
  setWeinart: (v: Weinart[]) => void;
  toggleWeinart: (v: Weinart) => void;
  setGeschmack: (v: Geschmack[]) => void;
  toggleGeschmack: (v: Geschmack) => void;
  setHerkunft: (v: string[]) => void;
  toggleHerkunft: (v: string) => void;
  setRebsorte: (v: string[]) => void;
  setJahrgang: (range: { min: number; max: number }) => void;
  setPreis: (range: { min: number; max: number }) => void;
  setAnlass: (v: Anlass[]) => void;
  toggleAnlass: (v: Anlass) => void;
  setBio: (v: boolean) => void;
  setBewertungMin: (v: number) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  applyFilters: (wines: Wine[]) => Wine[];
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

function toggleIn<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FilterState>(DEFAULT_FILTERS);

  const toggleWeinart = useCallback(
    (v: Weinart) => setState((s) => ({ ...s, weinart: toggleIn(s.weinart, v) })),
    [],
  );
  const toggleGeschmack = useCallback(
    (v: Geschmack) => setState((s) => ({ ...s, geschmack: toggleIn(s.geschmack, v) })),
    [],
  );
  const toggleHerkunft = useCallback(
    (v: string) => setState((s) => ({ ...s, herkunft: toggleIn(s.herkunft, v) })),
    [],
  );
  const toggleAnlass = useCallback(
    (v: Anlass) => setState((s) => ({ ...s, anlass: toggleIn(s.anlass, v) })),
    [],
  );

  const setWeinart = useCallback((v: Weinart[]) => setState((s) => ({ ...s, weinart: v })), []);
  const setGeschmack = useCallback(
    (v: Geschmack[]) => setState((s) => ({ ...s, geschmack: v })),
    [],
  );
  const setHerkunft = useCallback((v: string[]) => setState((s) => ({ ...s, herkunft: v })), []);
  const setRebsorte = useCallback((v: string[]) => setState((s) => ({ ...s, rebsorte: v })), []);
  const setJahrgang = useCallback(
    (range: { min: number; max: number }) => setState((s) => ({ ...s, jahrgang: range })),
    [],
  );
  const setPreis = useCallback(
    (range: { min: number; max: number }) => setState((s) => ({ ...s, preis: range })),
    [],
  );
  const setAnlass = useCallback((v: Anlass[]) => setState((s) => ({ ...s, anlass: v })), []);
  const setBio = useCallback((v: boolean) => setState((s) => ({ ...s, bio: v })), []);
  const setBewertungMin = useCallback(
    (v: number) => setState((s) => ({ ...s, bewertungMin: v })),
    [],
  );
  const resetFilters = useCallback(() => setState(DEFAULT_FILTERS), []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (state.weinart.length) n++;
    if (state.geschmack.length) n++;
    if (state.herkunft.length) n++;
    if (state.rebsorte.length) n++;
    if (state.anlass.length) n++;
    if (state.bio) n++;
    if (state.bewertungMin > 0) n++;
    if (
      state.jahrgang.min !== JAHRGANG_BOUNDS.min ||
      state.jahrgang.max !== JAHRGANG_BOUNDS.max
    )
      n++;
    if (state.preis.min !== PREIS_BOUNDS.min || state.preis.max !== PREIS_BOUNDS.max) n++;
    return n;
  }, [state]);

  // TODO: Replace with server-side query (Supabase/Firebase) once API is wired up.
  const applyFilters = useCallback(
    (wines: Wine[]) =>
      wines.filter((w) => {
        if (state.weinart.length) {
          const types = state.weinart.map((art) => WEINART_TO_TYPE[art]);
          if (!types.includes(w.type)) return false;
        }
        if (state.geschmack.length) {
          const wineTastes = w.taste.map((t) => t.toLowerCase());
          const wanted = state.geschmack.map((g) => g.toLowerCase());
          if (!wanted.some((g) => wineTastes.includes(g))) return false;
        }
        if (state.herkunft.length && !state.herkunft.includes(w.country)) return false;
        if (
          state.rebsorte.length &&
          !state.rebsorte.some((r) => w.grape.toLowerCase().includes(r.toLowerCase()))
        )
          return false;
        if (w.vintage < state.jahrgang.min || w.vintage > state.jahrgang.max) return false;
        if (w.price < state.preis.min || w.price > state.preis.max) return false;
        // bio/anlass are not yet on Wine — TODO: extend Wine type and data.
        if (state.bewertungMin > 0 && w.rating / 20 < state.bewertungMin) return false;
        return true;
      }),
    [state],
  );

  const value = useMemo<FilterContextValue>(
    () => ({
      ...state,
      setWeinart,
      toggleWeinart,
      setGeschmack,
      toggleGeschmack,
      setHerkunft,
      toggleHerkunft,
      setRebsorte,
      setJahrgang,
      setPreis,
      setAnlass,
      toggleAnlass,
      setBio,
      setBewertungMin,
      resetFilters,
      activeFilterCount,
      applyFilters,
    }),
    [
      state,
      setWeinart,
      toggleWeinart,
      setGeschmack,
      toggleGeschmack,
      setHerkunft,
      toggleHerkunft,
      setRebsorte,
      setJahrgang,
      setPreis,
      setAnlass,
      toggleAnlass,
      setBio,
      setBewertungMin,
      resetFilters,
      activeFilterCount,
      applyFilters,
    ],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
