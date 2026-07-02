import { supabase } from '../lib/supabase';
import { Wine, WineType } from '../types';

const WEINART_MAP: Record<string, WineType> = {
  Rotwein: 'Rotwein',
  Weißwein: 'Weißwein',
  Roséwein: 'Roséwein',
  Schaumwein: 'Schaumwein',
  Süßwein: 'Süßwein',
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim())
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

export function mapRow(row: Record<string, unknown>): Wine {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    winery: [row.rebsorte, row.region, Number(row.jahrgang) || null]
      .filter(Boolean)
      .join(' · '),
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
  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .eq('status', 'active');

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map(mapRow);
}
