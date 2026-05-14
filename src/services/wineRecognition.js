// TODO: echte Claude Vision API hier einbauen
//
// Wenn der echte API-Aufruf eingebaut wird, soll diese Funktion
// 1:1 austauschbar bleiben. Signatur:
//   recognizeWineLabel(imageBase64: string) => Promise<Wine>
//
// Beispiel-Aufruf später:
//   const res = await fetch('https://api.anthropic.com/v1/messages', { ... });
//   return parseClaudeResponse(res);

const MOCK_WINES = [
  {
    name: 'Château Margaux',
    producer: 'Château Margaux',
    year: 2016,
    type: 'Rotwein',
    region: 'Bordeaux, Frankreich',
    grape: 'Cabernet Sauvignon, Merlot',
    alcohol: 13.5,
    rating: 98,
    price: 749.0,
    confidence: 96,
    tastingNotes: {
      tannins: 0.85,
      acidity: 0.6,
      fruit: 0.75,
      body: 0.9,
    },
    description:
      'Ein legendärer Bordeaux mit eleganter Struktur. Aromen von schwarzer Johannisbeere, Zedernholz und feinen Veilchennoten. Lange, samtige Finale.',
  },
  {
    name: 'Sancerre Blanc',
    producer: 'Domaine Vacheron',
    year: 2022,
    type: 'Weißwein',
    region: 'Loire, Frankreich',
    grape: 'Sauvignon Blanc',
    alcohol: 12.5,
    rating: 92,
    price: 32.5,
    confidence: 91,
    tastingNotes: {
      tannins: 0.05,
      acidity: 0.88,
      fruit: 0.7,
      body: 0.45,
    },
    description:
      'Frisch und mineralisch mit Aromen von Stachelbeere, Zitrusfrüchten und einem Hauch von Feuerstein. Klassischer Loire-Charakter mit präziser Säure.',
  },
  {
    name: 'Whispering Angel',
    producer: 'Château d’Esclans',
    year: 2023,
    type: 'Rosé',
    region: 'Provence, Frankreich',
    grape: 'Grenache, Cinsault, Rolle',
    alcohol: 13.0,
    rating: 89,
    price: 24.9,
    confidence: 88,
    tastingNotes: {
      tannins: 0.12,
      acidity: 0.7,
      fruit: 0.78,
      body: 0.42,
    },
    description:
      'Blassrosa mit zarten Aromen von roter Johannisbeere, weißem Pfirsich und Blütenblättern. Trocken, ausgewogen und beschwingt – die Inkarnation eines Provence-Rosé.',
  },
  {
    name: 'Cuvée Brut Réserve',
    producer: 'Louis Roederer',
    year: 2019,
    type: 'Champagner',
    region: 'Champagne, Frankreich',
    grape: 'Chardonnay, Pinot Noir, Pinot Meunier',
    alcohol: 12.0,
    rating: 94,
    price: 89.0,
    confidence: 93,
    tastingNotes: {
      tannins: 0.0,
      acidity: 0.92,
      fruit: 0.65,
      body: 0.55,
    },
    description:
      'Feinperlig und elegant. Brioche, Mandel und reife Birne ergänzen sich zu einem cremigen, lang anhaltenden Mousseux. Aristokratische Frische.',
  },
  {
    name: 'Late Bottled Vintage Port',
    producer: 'Graham’s',
    year: 2017,
    type: 'Port',
    region: 'Douro, Portugal',
    grape: 'Touriga Nacional, Touriga Franca',
    alcohol: 20.0,
    rating: 93,
    price: 28.0,
    confidence: 90,
    tastingNotes: {
      tannins: 0.7,
      acidity: 0.5,
      fruit: 0.95,
      body: 0.95,
    },
    description:
      'Dichtes Bouquet aus Brombeere, Pflaume und dunkler Schokolade. Voller Körper, üppige Süße und eine warme, würzige Finale mit Lakritz-Anklängen.',
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function recognizeWineLabel(imageBase64) {
  // TODO: echte Claude Vision API hier einbauen
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'x-api-key': process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  //     'anthropic-version': '2023-06-01',
  //     'content-type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-sonnet-4-6',
  //     max_tokens: 1024,
  //     messages: [{
  //       role: 'user',
  //       content: [
  //         { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
  //         { type: 'text', text: 'Analysiere dieses Wein-Etikett und gib JSON zurück mit ...' },
  //       ],
  //     }],
  //   }),
  // });
  // return parseClaudeResponse(await response.json());

  await delay(2000);
  const pick = MOCK_WINES[Math.floor(Math.random() * MOCK_WINES.length)];
  return { ...pick };
}

export const __mockWines = MOCK_WINES;
