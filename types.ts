export type WineType = 'Rotwein' | 'Weißwein' | 'Roséwein' | 'Schaumwein' | 'Süßwein';

export interface Review {
  id: string;
  userName: string;
  rating: number; // 1–5
  comment: string;
  date: string; // ISO date string
}

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
  anlass?: string[];
  passtZu?: string[];
  bioNaturVegan?: string[];
  /** Flaschengröße aus wines (erster nicht leerer Wert); fehlt sie, zeigt die Detailansicht „0,75 l“. */
  flaschengroesse?: string;
  /**
   * Ursprüngliche Weinart aus der Datenbank (Text oder `null`), ohne den Rückfall auf „Rotwein“
   * in `type`. Nur für die Blindverkostung; die Anzeige nutzt weiter `type`.
   */
  weinartRoh?: string | null;
  reviews?: Review[];
  averageRating?: number;
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
