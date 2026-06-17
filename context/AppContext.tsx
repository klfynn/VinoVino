import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Wine, CartItem, PurchasedWine, Review } from '../types';

interface AppContextValue {
  watchlist: Wine[];
  cart: CartItem[];
  purchasedWines: PurchasedWine[];
  myReviews: Record<string, Review>; // keyed by wine.id
  addToWatchlist: (wine: Wine) => void;
  removeFromWatchlist: (id: string) => void;
  addToCart: (wine: Wine, quantity: number) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  cartTotal: number;
  cartCount: number;
  addToPurchased: (wine: Wine) => void;
  updatePurchasedRating: (id: string, rating: number | null, note: string) => void;
  submitReview: (wineId: string, review: Review) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Wine[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchasedWines, setPurchasedWines] = useState<PurchasedWine[]>([]);
  const [myReviews, setMyReviews] = useState<Record<string, Review>>({});

  const addToWatchlist = useCallback((wine: Wine) => {
    setWatchlist((prev) => (prev.find((w) => w.id === wine.id) ? prev : [...prev, wine]));
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const addToCart = useCallback((wine: Wine, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.wine.id === wine.id);
      if (existing) {
        return prev.map((item) =>
          item.wine.id === wine.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...prev, { wine, quantity }];
    });
  }, []);

  const updateCartQuantity = useCallback((id: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.wine.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.wine.id !== id));
  }, []);

  const addToPurchased = useCallback((wine: Wine) => {
    setPurchasedWines((prev) => {
      if (prev.find((p) => p.wine.id === wine.id)) return prev;
      return [{ wine, purchasedAt: new Date(), myRating: null, myNote: '' }, ...prev];
    });
  }, []);

  const updatePurchasedRating = useCallback((id: string, rating: number | null, note: string) => {
    setPurchasedWines((prev) =>
      prev.map((p) => (p.wine.id === id ? { ...p, myRating: rating, myNote: note } : p)),
    );
  }, []);

  const submitReview = useCallback((wineId: string, review: Review) => {
    setMyReviews((prev) => ({ ...prev, [wineId]: review }));
  }, []);

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
      cart,
      purchasedWines,
      myReviews,
      addToWatchlist,
      removeFromWatchlist,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      cartTotal,
      cartCount,
      addToPurchased,
      updatePurchasedRating,
      submitReview,
    }),
    [
      watchlist,
      cart,
      purchasedWines,
      myReviews,
      addToWatchlist,
      removeFromWatchlist,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      cartTotal,
      cartCount,
      addToPurchased,
      updatePurchasedRating,
      submitReview,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
