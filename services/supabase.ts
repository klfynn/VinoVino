import { Wine, WineType } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const WEINART_MAP: Record<string, WineType> = {
  Rotwein: 'Rotwein',
  Weißwein: 'Weißwein',
  Roséwein: 'Roséwein',
  Schaumwein: 'Schaumwein',
  Süßwein: 'Süßwein',
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function mapRow(row: Record<string, unknown>): Wine {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    winery: String(row.merchant_id ?? ''),
    vintage: Number(row.jahrgang) || 0,
    type: WEINART_MAP[String(row.weinart)] ?? 'Rotwein',
    region: String(row.region ?? ''),
    country: String(row.herkunft ?? ''),
    grape: String(row.rebsorte ?? ''),
    taste: toArray(row.geschmack),
    description: String(row.beschreibung ?? ''),
    rating: 0,
    price: Number(row.preis) || 0,
    image: String(row.bild_url ?? ''),
    anlass: toArray(row.anlass),
    passtZu: toArray(row.passt_zu),
    bioNaturVegan: toArray(row.eigenschaften),
  };
}

export async function fetchActiveWines(): Promise<Wine[]> {
  const url = `${SUPABASE_URL}/rest/v1/wines?status=eq.active&select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  const rows: Record<string, unknown>[] = await response.json();
  return rows.map(mapRow);
}
