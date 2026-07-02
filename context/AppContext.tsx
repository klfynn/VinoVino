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
import { Wine, CartItem, PurchasedWine, Review } from '../types';

interface AppContextValue {
  // Watchlist
  watchlist: Wine[];
  watchlistLoading: boolean;
  watchlistError: string | null;
  addToWatchlist: (wine: Wine) => Promise<void>;
  removeFromWatchlist: (id: string) => Promise<void>;

  // Cart
  cart: CartItem[];
  cartLoading: boolean;
  cartError: string | null;
  addToCart: (wine: Wine, quantity: number) => Promise<void>;
  updateCartQuantity: (id: string, quantity: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  cartTotal: number;
  cartCount: number;

  // Purchased / reviews (local only — connected in a later step)
  purchasedWines: PurchasedWine[];
  myReviews: Record<string, Review>;
  addToPurchased: (wine: Wine) => void;
  updatePurchasedRating: (id: string, rating: number | null, note: string) => void;
  submitReview: (wineId: string, review: Review) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // ── Watchlist ──────────────────────────────────────────────────────────────

  const [watchlist, setWatchlist] = useState<Wine[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const loadWatchlist = useCallback(async (uid: string) => {
    setWatchlistLoading(true);
    setWatchlistError(null);
    const { data, error } = await supabase
      .from('wishlist')
      .select('wine_id, wines(*)')
      .eq('user_id', uid);
    setWatchlistLoading(false);
    if (error) {
      setWatchlistError('Merkliste konnte nicht geladen werden. Bitte versuche es erneut.');
      return;
    }
    const wines: Wine[] = (data ?? [])
      .map((row) => {
        const wineData = (row.wines as unknown) as Record<string, unknown> | null;
        return wineData ? mapRow(wineData) : null;
      })
      .filter((w): w is Wine => w !== null);
    setWatchlist(wines);
  }, []);

  // ── Cart ───────────────────────────────────────────────────────────────────

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const loadCart = useCallback(async (uid: string) => {
    setCartLoading(true);
    setCartError(null);
    const { data, error } = await supabase
      .from('cart_items')
      .select('wine_id, quantity, wines(*)')
      .eq('user_id', uid);
    setCartLoading(false);
    if (error) {
      setCartError('Warenkorb konnte nicht geladen werden. Bitte versuche es erneut.');
      return;
    }
    const items: CartItem[] = (data ?? [])
      .map((row) => {
        const wineData = (row.wines as unknown) as Record<string, unknown> | null;
        if (!wineData) return null;
        return { wine: mapRow(wineData), quantity: row.quantity as number };
      })
      .filter((item): item is CartItem => item !== null);
    setCart(items);
  }, []);

  // ── Reviews state (declared before useEffect so loadReviews is in scope) ──

  const [purchasedWines, setPurchasedWines] = useState<PurchasedWine[]>([]);
  const [myReviews, setMyReviews] = useState<Record<string, Review>>({});

  const loadReviews = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, wine_id, rating, comment, created_at')
      .eq('user_id', uid);
    if (error || !data) return;
    const map: Record<string, Review> = {};
    for (const row of data) {
      map[String(row.wine_id)] = {
        id: String(row.id),
        userName: '',
        rating: Number(row.rating),
        comment: String(row.comment ?? ''),
        date: String(row.created_at ?? '').slice(0, 10),
      };
    }
    setMyReviews(map);
  }, []);

  // ── Load on login / clear on logout ───────────────────────────────────────

  useEffect(() => {
    if (userId) {
      loadWatchlist(userId);
      loadCart(userId);
      loadReviews(userId);
    } else {
      setWatchlist([]);
      setCart([]);
      setMyReviews({});
      setWatchlistError(null);
      setCartError(null);
    }
  }, [userId, loadWatchlist, loadCart, loadReviews]);

  // ── Watchlist actions ──────────────────────────────────────────────────────

  const addToWatchlist = useCallback(async (wine: Wine) => {
    if (!userId) return;
    if (watchlist.find((w) => w.id === wine.id)) return;
    // Optimistic update
    setWatchlist((prev) => [...prev, wine]);
    const { error } = await supabase
      .from('wishlist')
      .insert({ user_id: userId, wine_id: wine.id });
    if (error) {
      // Roll back
      setWatchlist((prev) => prev.filter((w) => w.id !== wine.id));
    }
  }, [userId, watchlist]);

  const removeFromWatchlist = useCallback(async (id: string) => {
    if (!userId) return;
    const removed = watchlist.find((w) => w.id === id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('wine_id', id);
    if (error && removed) {
      setWatchlist((prev) => [...prev, removed]);
    }
  }, [userId, watchlist]);

  // ── Cart actions ───────────────────────────────────────────────────────────

  const addToCart = useCallback(async (wine: Wine, quantity: number) => {
    if (!userId) return;
    const existing = cart.find((item) => item.wine.id === wine.id);
    const newQty = (existing?.quantity ?? 0) + quantity;

    // Optimistic update
    setCart((prev) => {
      if (existing) {
        return prev.map((item) =>
          item.wine.id === wine.id ? { ...item, quantity: newQty } : item,
        );
      }
      return [...prev, { wine, quantity }];
    });

    const { error } = await supabase.from('cart_items').upsert(
      { user_id: userId, wine_id: wine.id, quantity: newQty },
      { onConflict: 'user_id,wine_id' },
    );
    if (error) {
      // Roll back
      if (existing) {
        setCart((prev) =>
          prev.map((item) =>
            item.wine.id === wine.id ? { ...item, quantity: existing.quantity } : item,
          ),
        );
      } else {
        setCart((prev) => prev.filter((item) => item.wine.id !== wine.id));
      }
    }
  }, [userId, cart]);

  const updateCartQuantity = useCallback(async (id: string, quantity: number) => {
    if (!userId) return;
    const prev = cart.find((item) => item.wine.id === id);

    if (quantity <= 0) {
      setCart((c) => c.filter((item) => item.wine.id !== id));
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('wine_id', id);
      if (error && prev) {
        setCart((c) => [...c, prev]);
      }
    } else {
      setCart((c) =>
        c.map((item) => (item.wine.id === id ? { ...item, quantity } : item)),
      );
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('wine_id', id);
      if (error && prev) {
        setCart((c) =>
          c.map((item) => (item.wine.id === id ? { ...item, quantity: prev.quantity } : item)),
        );
      }
    }
  }, [userId, cart]);

  const removeFromCart = useCallback(async (id: string) => {
    if (!userId) return;
    const removed = cart.find((item) => item.wine.id === id);
    setCart((c) => c.filter((item) => item.wine.id !== id));
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('wine_id', id);
    if (error && removed) {
      setCart((c) => [...c, removed]);
    }
  }, [userId, cart]);

  const addToPurchased = useCallback((_wine: Wine) => {}, []);

  const updatePurchasedRating = useCallback((id: string, rating: number | null, note: string) => {
    setPurchasedWines((prev) =>
      prev.map((p) => (p.wine.id === id ? { ...p, myRating: rating, myNote: note } : p)),
    );
  }, []);

  const submitReview = useCallback(
    async (wineId: string, review: Review) => {
      setMyReviews((prev) => ({ ...prev, [wineId]: review }));
      if (!userId) return;
      await supabase.from('reviews').upsert(
        {
          user_id: userId,
          wine_id: wineId,
          rating: review.rating,
          comment: review.comment,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,wine_id' },
      );
    },
    [userId],
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.wine.price * item.quantity, 0),
    [cart],
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      watchlist,
      watchlistLoading,
      watchlistError,
      addToWatchlist,
      removeFromWatchlist,
      cart,
      cartLoading,
      cartError,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      cartTotal,
      cartCount,
      purchasedWines,
      myReviews,
      addToPurchased,
      updatePurchasedRating,
      submitReview,
    }),
    [
      watchlist, watchlistLoading, watchlistError, addToWatchlist, removeFromWatchlist,
      cart, cartLoading, cartError, addToCart, updateCartQuantity, removeFromCart,
      cartTotal, cartCount, purchasedWines, myReviews,
      addToPurchased, updatePurchasedRating, submitReview,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
