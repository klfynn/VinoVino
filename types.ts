export type WineType = 'Rotwein' | 'Weißwein' | 'Roséwein' | 'Schaumwein' | 'Süßwein';

export interface Wine {
  id: string;
  name: string;
  winery: string;
  vintage: number;
  type: WineType;
  region: string;
  country: string;
  grape: string;
  taste: string[];
  description: string;
  rating: number;
  price: number;
  image: string;
}

export interface CartItem {
  wine: Wine;
  quantity: number;
}

export interface PurchasedWine {
  wine: Wine;
  purchasedAt: Date;
  myRating: number | null;
  myNote: string;
}
