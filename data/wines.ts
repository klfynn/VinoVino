import { Wine } from '../types';

export const wines: Wine[] = [
  {
    id: 'w1',
    name: 'Barolo Riserva',
    winery: 'Tenuta San Lorenzo',
    vintage: 2017,
    type: 'Rotwein',
    region: 'Piemont',
    country: 'Italien',
    grape: 'Nebbiolo',
    taste: ['trocken', 'tanninreich', 'kräftig', 'komplex'],
    description:
      'Ein majestätischer Barolo mit Aromen von dunklen Kirschen, Trüffel, Rosenblüten und Leder. Lange am Gaumen mit samtigen Tanninen und einem eleganten, würzigen Abgang. Idealer Begleiter zu geschmortem Rindfleisch und gereiftem Käse.',
    rating: 95,
    price: 79.9,
    image:
      'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'w2',
    name: 'Château Margaux Pavillon',
    winery: 'Château Margaux',
    vintage: 2019,
    type: 'Rotwein',
    region: 'Bordeaux',
    country: 'Frankreich',
    grape: 'Cabernet Sauvignon, Merlot',
    taste: ['trocken', 'elegant', 'fruchtig', 'mineralisch'],
    description:
      'Eine raffinierte Cuvée mit feiner Eleganz. Noten von schwarzer Johannisbeere, Zedernholz, Veilchen und einem Hauch von Graphit. Seidige Textur und ein langer, harmonischer Nachklang.',
    rating: 93,
    price: 145.0,
    image:
      'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'w3',
    name: 'Riesling Großes Gewächs',
    winery: 'Weingut Dr. Loosen',
    vintage: 2021,
    type: 'Weißwein',
    region: 'Mosel',
    country: 'Deutschland',
    grape: 'Riesling',
    taste: ['trocken', 'fruchtig', 'mineralisch', 'frisch'],
    description:
      'Ein puristischer Mosel-Riesling mit lebendiger Säure, Aromen von Aprikose, Pfirsich und Schiefer. Klare Mineralität und ein langer, salziger Abgang. Perfekt zu Meeresfrüchten und asiatischer Küche.',
    rating: 94,
    price: 42.5,
    image:
      'https://images.unsplash.com/photo-1474722883778-792e7990302f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'w4',
    name: 'Brunello di Montalcino',
    winery: 'Castello Banfi',
    vintage: 2018,
    type: 'Rotwein',
    region: 'Toskana',
    country: 'Italien',
    grape: 'Sangiovese',
    taste: ['trocken', 'kräftig', 'würzig', 'fruchtig'],
    description:
      'Ein klassischer Brunello mit intensiven Aromen von Sauerkirsche, Tabak, getrockneten Kräutern und Vanille. Strukturierte Tannine und eine lebendige Säure ergeben einen langen, eleganten Abgang.',
    rating: 92,
    price: 64.0,
    image:
      'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'w5',
    name: 'Cuvée Sir Winston Churchill',
    winery: 'Pol Roger',
    vintage: 2015,
    type: 'Schaumwein',
    region: 'Champagne',
    country: 'Frankreich',
    grape: 'Pinot Noir, Chardonnay',
    taste: ['trocken', 'elegant', 'cremig', 'feinperlig'],
    description:
      'Ein Prestige-Cuvée Champagner mit feinster Perlage. Aromen von Brioche, gerösteten Mandeln, Zitrusfrüchten und weißen Blüten. Cremige Textur und ein endloser, mineralischer Abgang.',
    rating: 97,
    price: 289.0,
    image:
      'https://images.unsplash.com/photo-1592486058517-36236ba24827?auto=format&fit=crop&w=800&q=80',
  },
];
