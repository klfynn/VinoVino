import { Wine, WineType } from '../types';

const WINE_TYPE_MAP: Record<string, WineType> = {
  Rotwein: 'Rotwein',
  Weißwein: 'Weißwein',
  Rosé: 'Roséwein',
  Roséwein: 'Roséwein',
  Schaumwein: 'Schaumwein',
  'Dessert- und Likörwein': 'Süßwein',
  Süßwein: 'Süßwein',
};

const PLACEHOLDER_IMAGE =
  'https://images.vivino.com/thumbs/TI7-c0qROhJWABkMgLOldQ_pb_x300.png';

export async function recognizeWineLabel(base64: string): Promise<Wine> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API-Schlüssel nicht konfiguriert');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Analysiere dieses Weinetikett und gib NUR ein JSON-Objekt zurück (keine Markdown-Backticks, kein Fließtext) mit folgenden Feldern: name, weinart (einer von: Rotwein, Weißwein, Rosé, Schaumwein, Dessert- und Likörwein), jahrgang, herkunft, region, rebsorte, geschmack (einer von: Trocken, Halbtrocken, Lieblich, Süß falls erkennbar, sonst leer). Falls ein Feld nicht erkennbar ist, setze es auf einen leeren String.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('Claude API Fehler:', response.status, await response.text());
    throw new Error(`API-Fehler: ${response.status}`);
  }

  const data = await response.json();
  const rawText: string = data?.content?.[0]?.text ?? '';

  // Defensively strip markdown code fences if present
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('JSON-Parse-Fehler:', e, 'Rohtext:', rawText);
    throw new Error('Ungültige API-Antwort');
  }

  const wineType: WineType = WINE_TYPE_MAP[parsed.weinart] ?? 'Rotwein';
  const vintageNum = parseInt(parsed.jahrgang, 10);

  const wine: Wine = {
    id: `scan-${Date.now()}`,
    name: parsed.name || 'Unbekannter Wein',
    winery: parsed.name || 'Unbekannt',
    vintage: Number.isFinite(vintageNum) ? vintageNum : new Date().getFullYear(),
    type: wineType,
    region: parsed.region || '',
    country: parsed.herkunft || '',
    grape: parsed.rebsorte || '',
    taste: parsed.geschmack ? [parsed.geschmack] : [],
    description: '',
    rating: 0,
    price: 0,
    image: PLACEHOLDER_IMAGE,
  };

  return wine;
}
