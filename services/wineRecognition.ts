import { Wine } from '../types';

const MOCK_WINES: Wine[] = [
  {
    id: 'scan-1',
    name: 'Château Margaux',
    winery: 'Château Margaux',
    vintage: 2018,
    type: 'Rotwein',
    region: 'Margaux',
    country: 'Frankreich',
    grape: 'Cabernet Sauvignon',
    taste: ['Vollmundig', 'Tanninreich', 'Komplex', 'Würzig'],
    description:
      'Ein eleganter Bordeaux mit Aromen von schwarzen Früchten, Zedernholz und feinen Gewürzen. Der lange, seidige Abgang hinterlässt einen bleibenden Eindruck.',
    rating: 97,
    price: 89.99,
    image: 'https://images.vivino.com/thumbs/ApnIiXjcGMD-LMfF69-JkA_pb_x300.png',
  },
  {
    id: 'scan-2',
    name: 'Antinori Tignanello',
    winery: 'Antinori',
    vintage: 2019,
    type: 'Rotwein',
    region: 'Toskana',
    country: 'Italien',
    grape: 'Sangiovese',
    taste: ['Fruchtig', 'Würzig', 'Samtig'],
    description:
      'Einer der berühmtesten Super-Tuscans mit intensiven Aromen von Kirschen, Tabak und dunkler Schokolade. Volle Struktur und wunderschöne Balance.',
    rating: 95,
    price: 64.9,
    image: 'https://images.vivino.com/thumbs/TI7-c0qROhJWABkMgLOldQ_pb_x300.png',
  },
  {
    id: 'scan-3',
    name: 'Cloudy Bay Sauvignon Blanc',
    winery: 'Cloudy Bay',
    vintage: 2022,
    type: 'Weißwein',
    region: 'Marlborough',
    country: 'Neuseeland',
    grape: 'Sauvignon Blanc',
    taste: ['Frisch', 'Zitrusartig', 'Mineralisch'],
    description:
      'Frisch und lebendig mit intensiven Aromen von Stachelbeere, Grapefruit und einem Hauch von frischem Gras. Langer, knackiger Abgang.',
    rating: 91,
    price: 24.99,
    image: 'https://images.vivino.com/thumbs/U7-PZ4dQhG8b1fLOHRbqzg_pb_x300.png',
  },
  {
    id: 'scan-4',
    name: 'Opus One',
    winery: 'Opus One Winery',
    vintage: 2017,
    type: 'Rotwein',
    region: 'Napa Valley',
    country: 'USA',
    grape: 'Cabernet Sauvignon',
    taste: ['Intensiv', 'Komplex', 'Samtig', 'Langanhaltend'],
    description:
      'Das legendäre Gemeinschaftsprojekt von Robert Mondavi und Baron Philippe de Rothschild. Schwarze Kirsche, Pflaume und Cassis mit Noten von Vanille und Röstaromen.',
    rating: 96,
    price: 299.0,
    image: 'https://images.vivino.com/thumbs/M4x3K3-bREwS7SvVxGtO8Q_pb_x300.png',
  },
];

export async function recognizeWineLabel(base64: string): Promise<Wine> {
  await new Promise<void>((resolve) => setTimeout(resolve, 2200));
  const idx = Math.floor(Math.random() * MOCK_WINES.length);
  return { ...MOCK_WINES[idx] };
}
