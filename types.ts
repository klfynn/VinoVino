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

export interface Address {
  street: string;
  zip: string;
  city: string;
  country: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: Address;
  createdAt: string;
}

export type Weinart = 'Rot' | 'Weiß' | 'Rosé' | 'Schaumwein' | 'Port';
export type Geschmack = 'Trocken' | 'Halbtrocken' | 'Lieblich';
export type Anlass = 'Dinner' | 'Geschenk' | 'Party' | 'Apéritif' | 'Zum Kochen';

export interface Range {
  min: number;
  max: number;
}

export interface FilterState {
  weinart: Weinart[];
  geschmack: Geschmack[];
  herkunft: string[];
  rebsorte: string[];
  jahrgang: Range;
  preis: Range;
  anlass: Anlass[];
  bio: boolean;
  bewertungMin: number;
}
