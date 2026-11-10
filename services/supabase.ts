import { supabase } from '../lib/supabase';
import { weinartToWineType } from '../lib/cellar/weinart';
import { Wine } from '../types';

// Die Zuordnung von wines.weinart zum Anzeige-Typ steht in lib/cellar/weinart.ts.
// Dort sind auch „Rosé“ und „Dessert- und Likörwein“ enthalten, die bisher als Rotwein erschienen.

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
    type: weinartToWineType(row.weinart),
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

  return data.flatMap((row) => {
    try {
      return [mapRow(row)];
    } catch (err) {
      const id = row?.id ?? '(unbekannt)';
      const name = row?.name ?? '(kein Name)';
      console.error(
        `[VinoVino] mapRow fehlgeschlagen für Wein "${name}" (ID: ${id}):`,
        err,
      );
      return [];
    }
  });
}
