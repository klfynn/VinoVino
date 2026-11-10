// Prüfskript für „Mein Weinkeller“: Eingaben eigener Weine, Zusammenführen, Sortierung,
// Weine ohne UUID, Mengenänderung, Weinart-Zuordnung und private Notiz (nie in reviews.review_text).
// Ausführen mit: npm run check:cellar
import {
  canPersistMarketWine,
  cellarSubtitle,
  compareCellarWines,
  customWineToWine,
  mergeCellar,
  MergeInput,
  normalizeCustomWineRow,
  normalizePurchaseRow,
  normalizeReviewRow,
  planQuantityChange,
  purchaseNotiz,
} from '../lib/cellar/merge';
import { buildPurchaseNotizPayload, buildReviewPayload } from '../lib/cellar/payload';
import {
  JAHRGANG_MIN,
  normalizeCustomWine,
  PREIS_MAX,
  QUANTITY_MAX,
  validateCustomWineInput,
  validateNotiz,
  validateRating,
} from '../lib/cellar/validate';
import { weinartToWineType } from '../lib/cellar/weinart';
import {
  cellarErrorMessage,
  CUSTOM_WINES_MISSING_MESSAGE,
  LOAD_NETWORK_MESSAGE,
  PURCHASE_NOTIZ_MISSING_MESSAGE,
  SAVE_NETWORK_MESSAGE,
} from '../lib/cellar/errors';
import { CELLAR_PLACEHOLDER_IMAGE, CellarWine, CustomWine, PurchaseRow } from '../lib/cellar/types';
import { TERROIR, WEINART_WERTE, weinartToKategorie } from '../lib/tasting/catalog';
import { wineRefKey } from '../lib/tasting/wineRef';
import type { Wine } from '../types';

let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed += 1;
  else failures.push(detail === undefined ? name : `${name}: ${JSON.stringify(detail)}`);
}

function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, a === e ? undefined : { erwartet: expected, erhalten: actual });
}

const NOW = new Date(Date.UTC(2026, 10, 10, 12, 0, 0));
const U = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const W1 = '11111111-1111-4111-8111-111111111111';
const W2 = '22222222-2222-4222-8222-222222222222';
const C1 = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const C2 = 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2';

// ── validateCustomWineInput / normalizeCustomWine ─────────────────────────────

const gueltig = {
  name: '  Barolo   Riserva ',
  weingut: 'Tenuta San Lorenzo',
  weinart: 'Rotwein',
  jahrgang: '2017',
  herkunft: 'Italien',
  region: 'Piemont',
  rebsorte: 'Nebbiolo',
  quantity: '3',
  preis: '24,90',
  boden: 'kalkstein',
};
{
  const r = validateCustomWineInput(gueltig, NOW);
  check('gültig: ok', r.ok, r.errors);
  eq('gültig: keine Fehler', r.errors, {});
  eq('gültig: bereinigte Werte', r.values, {
    name: 'Barolo Riserva',
    weingut: 'Tenuta San Lorenzo',
    weinart: 'Rotwein',
    jahrgang: '2017',
    herkunft: 'Italien',
    region: 'Piemont',
    rebsorte: 'Nebbiolo',
    quantity: 3,
    preis: 24.9,
    boden: 'kalkstein',
    flaschengroesse: null,
  });
}

// Nur Pflichtfeld
{
  const r = validateCustomWineInput({ name: 'Hauswein' }, NOW);
  check('nur Name: ok', r.ok, r.errors);
  eq('nur Name: Standardwerte', r.values, {
    name: 'Hauswein', weingut: null, weinart: null, jahrgang: null, herkunft: null, region: null,
    rebsorte: null, quantity: 1, preis: null, boden: null, flaschengroesse: null,
  });
}

// Leere Eingaben
for (const [label, input] of [
  ['leeres Objekt', {}],
  ['leerer Name', { name: '' }],
  ['nur Leerzeichen', { name: '   \n\t ' }],
  ['null', null],
  ['undefined', undefined],
  ['Zahl', 42],
  ['Text', 'Riesling'],
  ['Array', ['Riesling']],
] as [string, unknown][]) {
  const r = validateCustomWineInput(input, NOW);
  check(`leer/kaputt (${label}): nicht ok`, !r.ok);
  check(`leer/kaputt (${label}): Fehler am Feld name`, typeof r.errors.name === 'string', r.errors);
}
eq('normalize: null ergibt leere Werte', normalizeCustomWine(null), {
  name: '', weingut: null, weinart: null, jahrgang: null, herkunft: null, region: null,
  rebsorte: null, quantity: 1, preis: null, boden: null, flaschengroesse: null,
});
eq('normalize: leere Texte werden null', normalizeCustomWine({ name: 'x', weingut: '  ', region: '' }).weingut, null);
eq('normalize: falscher Typ wird null', normalizeCustomWine({ name: 'x', weingut: { a: 1 } }).weingut, null);
eq('normalize: Zahl als Name wird Text', normalizeCustomWine({ name: 1999 }).name, '1999');

// Überlange Eingaben
{
  const r = validateCustomWineInput({ name: 'x'.repeat(121), weingut: 'y'.repeat(121), region: 'r'.repeat(121), rebsorte: 'z'.repeat(121), herkunft: 'h'.repeat(121) }, NOW);
  check('überlang: nicht ok', !r.ok);
  eq('überlang: Felder mit Fehlern', Object.keys(r.errors).sort(), ['herkunft', 'name', 'rebsorte', 'region', 'weingut']);
  check('überlang: genau 120 Zeichen ist erlaubt', validateCustomWineInput({ name: 'x'.repeat(120) }, NOW).ok);
  check('überlang: 120 Emojis sind erlaubt (Zeichen, nicht Bytes)', validateCustomWineInput({ name: '🍷'.repeat(120) }, NOW).ok);
  check('überlang: 121 Emojis nicht', !validateCustomWineInput({ name: '🍷'.repeat(121) }, NOW).ok);
  check('überlang: Jahrgang 21 Zeichen', typeof validateCustomWineInput({ name: 'x', jahrgang: '1'.repeat(21) }, NOW).errors.jahrgang === 'string');
  check('überlang: Flaschengröße', typeof validateCustomWineInput({ name: 'x', flaschengroesse: '0'.repeat(21) }, NOW).errors.flaschengroesse === 'string');
}

// Jahrgang
for (const [eingabe, erwartet] of [['NV', 'NV'], ['nv', 'NV'], ['n.v.', 'NV'], [' 2019 ', '2019'], [2019, '2019']] as [unknown, string][]) {
  const r = validateCustomWineInput({ name: 'x', jahrgang: eingabe }, NOW);
  check(`Jahrgang ${JSON.stringify(eingabe)}: ok`, r.ok, r.errors);
  eq(`Jahrgang ${JSON.stringify(eingabe)}: Wert`, r.values.jahrgang, erwartet);
}
for (const eingabe of ['19', '20199', 'abc', '1799', '2028', '2019a', '-2019']) {
  check(`Jahrgang „${eingabe}“: Fehler`, typeof validateCustomWineInput({ name: 'x', jahrgang: eingabe }, NOW).errors.jahrgang === 'string');
}
check(`Jahrgang ${JAHRGANG_MIN}: ok`, validateCustomWineInput({ name: 'x', jahrgang: String(JAHRGANG_MIN) }, NOW).ok);
check('Jahrgang nächstes Jahr: ok', validateCustomWineInput({ name: 'x', jahrgang: '2027' }, NOW).ok);

// Anzahl
for (const [eingabe, erwartet] of [['', 1], [' ', 1], ['0', 0], ['12', 12], [5, 5], [String(QUANTITY_MAX), QUANTITY_MAX]] as [unknown, number][]) {
  const r = validateCustomWineInput({ name: 'x', quantity: eingabe }, NOW);
  check(`Anzahl ${JSON.stringify(eingabe)}: ok`, r.ok, r.errors);
  eq(`Anzahl ${JSON.stringify(eingabe)}: Wert`, r.values.quantity, erwartet);
}
for (const eingabe of ['-1', '1,5', '2.5', 'drei', String(QUANTITY_MAX + 1), NaN, Infinity, {}, true]) {
  check(`Anzahl ${JSON.stringify(String(eingabe))}: Fehler`, typeof validateCustomWineInput({ name: 'x', quantity: eingabe }, NOW).errors.quantity === 'string');
}

// Preis
for (const [eingabe, erwartet] of [
  ['', null], ['12', 12], ['12,5', 12.5], ['12.50', 12.5], ['0', 0], ['1.234,50', 1234.5], ['€ 9,99', 9.99], ['9,999', 10], [7.5, 7.5],
] as [unknown, number | null][]) {
  const r = validateCustomWineInput({ name: 'x', preis: eingabe }, NOW);
  check(`Preis ${JSON.stringify(eingabe)}: ok`, r.ok, r.errors);
  eq(`Preis ${JSON.stringify(eingabe)}: Wert`, r.values.preis, erwartet);
}
for (const eingabe of ['-1', 'zwölf', '12,50 €x', '1,2,3', String(PREIS_MAX + 1), -0.01, NaN]) {
  check(`Preis ${JSON.stringify(String(eingabe))}: Fehler`, typeof validateCustomWineInput({ name: 'x', preis: eingabe }, NOW).errors.preis === 'string');
}

// Weinart und Boden
for (const w of WEINART_WERTE) check(`Weinart „${w}“: ok`, validateCustomWineInput({ name: 'x', weinart: w }, NOW).ok);
check('Weinart unbekannt: Fehler', typeof validateCustomWineInput({ name: 'x', weinart: 'Bier' }, NOW).errors.weinart === 'string');
for (const o of TERROIR.boeden.optionen) check(`Boden „${o.id}“: ok`, validateCustomWineInput({ name: 'x', boden: o.id }, NOW).ok);
eq('Boden „weiß nicht“ wird null', normalizeCustomWine({ name: 'x', boden: 'weiss_nicht' }).boden, null);
check('Boden unbekannt: Fehler', typeof validateCustomWineInput({ name: 'x', boden: 'mondstaub' }, NOW).errors.boden === 'string');

// Sterne
eq('Sterne 1..5 gültig', [1, 2, 3, 4, 5].map((r) => validateRating(r, '')), [null, null, null, null, null]);
for (const r of [0, 6, 2.5, '3', null, NaN]) check(`Sterne ${JSON.stringify(r)}: Fehler`, validateRating(r, '') !== null);
check('Notiz 1000 Zeichen: ok', validateRating(4, 'x'.repeat(1000)) === null);
check('Notiz 1001 Zeichen: Fehler', validateRating(4, 'x'.repeat(1001)) !== null);
check('Notiz falscher Typ: Fehler', validateRating(4, 7) !== null);

// ── Datenbankzeilen lesen ─────────────────────────────────────────────────────

eq('Kaufzeile: vollständig', normalizePurchaseRow({ id: 'p1', wine_id: W1, quantity: 2, purchased_at: '2026-01-01T00:00:00Z', source: 'purchase' }), {
  id: 'p1', wineId: W1, quantity: 2, purchasedAt: '2026-01-01T00:00:00Z', source: 'purchase', notiz: null,
});
eq('Kaufzeile: mit privater Notiz', normalizePurchaseRow({ id: 'p1', wine_id: W1, quantity: 1, notiz: 'Zum Geburtstag öffnen' })?.notiz, 'Zum Geburtstag öffnen');
eq('Kaufzeile: ohne Menge = 1, created_at statt purchased_at', normalizePurchaseRow({ id: 7, wine_id: W1, created_at: '2026-02-01' }), {
  id: '7', wineId: W1, quantity: 1, purchasedAt: '2026-02-01', source: null, notiz: null,
});
eq('Kaufzeile: wine_id ohne UUID wird verworfen', normalizePurchaseRow({ id: 'p', wine_id: 'w1', quantity: 1 }), null);
eq('Kaufzeile: kaputt', normalizePurchaseRow('x'), null);
eq('Bewertung: gültig, review_text wird ignoriert', normalizeReviewRow({ wine_id: W1, rating: 4, review_text: 'gut', created_at: 'd' }), { wineId: W1, rating: 4, date: 'd' });
check('Bewertung: kein Textfeld im Ergebnis', !Object.keys(normalizeReviewRow({ wine_id: W1, rating: 4, review_text: 'gut' }) ?? {}).some((k) => /text/i.test(k)));
eq('Bewertung: Sterne ungültig', normalizeReviewRow({ wine_id: W1, rating: 9 })?.rating, null);
eq('eigener Wein: ohne Name verworfen', normalizeCustomWineRow({ id: C1, name: '' }), null);
eq('eigener Wein: Preis als Text (numeric)', normalizeCustomWineRow({ id: C1, name: 'x', preis: '12.50' })?.preis, 12.5);

// ── Zusammenführen ────────────────────────────────────────────────────────────

const wine = (id: string, name: string, type: Wine['type'] = 'Rotwein'): Wine => ({
  id, name, winery: '', vintage: 2020, type, region: '', country: '', grape: '', taste: [], description: '', rating: 0, price: 10, image: 'x',
});
const custom = (id: string, name: string, createdAt: string, over: Partial<CustomWine> = {}): CustomWine => ({
  id, userId: U, name, weingut: null, weinart: null, jahrgang: null, herkunft: null, region: null, rebsorte: null,
  preis: null, flaschengroesse: null, quantity: 1, boden: null, source: 'manual', rating: null, notiz: null,
  bildUrl: null, createdAt, updatedAt: createdAt, ...over,
});
const purchase = (id: string | null, wineId: string, quantity: number, purchasedAt: string, notiz: string | null = null): PurchaseRow => ({
  id, wineId, quantity, purchasedAt, source: 'purchase', notiz,
});
const local = (id: string, name: string, addedAt: string): CellarWine => ({
  id: `lokal:market:${id}`, ref: { kind: 'market', id }, wine: wine(id, name), quantity: 1, addedAt: new Date(addedAt), source: 'manual', persisted: false,
});

const input: MergeInput = {
  purchases: [
    purchase('p1', W1, 2, '2026-01-01T10:00:00Z', 'privat'),
    purchase('p2', W1, 1, '2026-03-01T10:00:00Z'),
    purchase('p3', W2, 1, '2026-02-01T10:00:00Z'),
  ],
  marketWines: { [W1]: wine(W1, 'Riesling', 'Weißwein') },
  reviews: [{ wineId: W1, rating: 5, date: '2026-03-02' }, { wineId: W2, rating: null, date: null }],
  customWines: [
    custom(C1, 'Hauswein', '2026-04-01T10:00:00Z', { weinart: 'Rosé', jahrgang: 'NV', weingut: 'Gut A', rating: 3, notiz: 'ok' }),
    custom(C2, 'Dessert', '2026-02-15T10:00:00Z', { weinart: 'Dessert- und Likörwein', quantity: 0 }),
  ],
  localEntries: [local('w1', 'Barolo (Testdaten)', '2026-05-01T10:00:00Z'), local(W1, 'Doppelt lokal', '2026-06-01T10:00:00Z')],
  localCustomWines: [custom('lokal-1', 'Ohne Anmeldung', '2026-01-15T10:00:00Z')],
};
const merged = mergeCellar(input);
const keys = merged.map((e) => wineRefKey(e.ref));

eq('merge: Anzahl Einträge (W1 einmal, lokales Duplikat entfällt)', merged.length, 6);
eq('merge: WineRefs eindeutig', new Set(keys).size, keys.length);
eq('merge: Listen-Schlüssel eindeutig', new Set(merged.map((e) => e.id)).size, merged.length);
eq('merge: Sortierung neueste zuerst', merged.map((e) => e.wine.name), [
  'Barolo (Testdaten)', 'Hauswein', 'Riesling', 'Dessert', 'Wein nicht mehr im Katalog', 'Ohne Anmeldung',
]);
const riesling = merged.find((e) => e.ref.id === W1);
eq('merge: Kaufzeilen addiert', riesling?.quantity, 3);
eq('merge: Datum = neuester Kauf', riesling?.addedAt.toISOString(), '2026-03-01T10:00:00.000Z');
eq('merge: Sterne aus reviews, Notiz aus purchased_wines', [riesling?.rating, riesling?.notes], [5, 'privat']);
eq('merge: Marktplatz gespeichert', [riesling?.persisted, riesling?.ref.kind], [true, 'market']);
eq('merge: Kaufzeilen neueste zuerst', riesling?.purchases?.map((p) => p.id), ['p2', 'p1']);
const fehlt = merged.find((e) => e.ref.id === W2);
eq('merge: fehlende Weindaten ergeben Platzhalter', [fehlt?.wine.name, fehlt?.wine.image], ['Wein nicht mehr im Katalog', CELLAR_PLACEHOLDER_IMAGE]);
eq('merge: Bewertung ohne Sterne wird ignoriert', fehlt?.rating, undefined);
const haus = merged.find((e) => e.ref.id === C1);
eq('merge: eigener Wein', [haus?.ref.kind, haus?.persisted, haus?.source, haus?.rating, haus?.notes], ['custom', true, 'manual', 3, 'ok']);
eq('merge: eigener Wein Rosé wird Roséwein', haus?.wine.type, 'Roséwein');
eq('merge: eigener Wein Platzhalterbild', haus?.wine.image, CELLAR_PLACEHOLDER_IMAGE);
eq('merge: Untertitel eigener Wein', haus ? cellarSubtitle(haus) : null, 'Gut A · NV');
eq('merge: eigener Wein mit 0 Flaschen bleibt', merged.find((e) => e.ref.id === C2)?.quantity, 0);
eq('merge: Dessertwein wird Süßwein', merged.find((e) => e.ref.id === C2)?.wine.type, 'Süßwein');
const testdaten = merged.find((e) => e.ref.id === 'w1');
eq('merge: Wein ohne UUID bleibt lokal', [testdaten?.persisted, testdaten?.ref.kind], [false, 'market']);
eq('merge: lokaler eigener Wein', merged.find((e) => e.ref.id === 'lokal-1')?.persisted, false);
eq('merge: leer', mergeCellar({ purchases: [], marketWines: {}, reviews: [], customWines: [], localEntries: [], localCustomWines: [] }), []);
eq('merge: Kaufzeile mit ungültiger wine_id wird übersprungen',
  mergeCellar({ ...input, purchases: [purchase('x', 'w1', 1, '2026-01-01')], customWines: [], localEntries: [], localCustomWines: [] }).length, 0);
{
  // Gleiche ID als Marktplatz- und eigener Wein: zwei verschiedene WineRefs
  const same = mergeCellar({
    purchases: [purchase('p', C1, 1, '2026-01-01')], marketWines: {}, reviews: [],
    customWines: [custom(C1, 'x', '2026-01-02')], localEntries: [], localCustomWines: [],
  });
  eq('merge: gleiche UUID als Marktplatz und eigener Wein bleiben getrennt', same.map((e) => wineRefKey(e.ref)).sort(), [`custom:${C1}`, `market:${C1}`]);
}
{
  // Sortierung bei gleichem Datum: nach Name
  const a = local('a', 'Zweigelt', '2026-01-01T00:00:00Z');
  const b = local('b', 'Äpfelwein', '2026-01-01T00:00:00Z');
  eq('sort: gleiches Datum nach Name (deutsch)', [a, b].sort(compareCellarWines).map((e) => e.wine.name), ['Äpfelwein', 'Zweigelt']);
}

// ── Weine ohne UUID ───────────────────────────────────────────────────────────

check('UUID: Marktplatzwein speicherbar', canPersistMarketWine(W1));
for (const id of ['w1', 'w12', 'scan-1700000000000', 'manual_1700000000000', '', null, undefined, 42]) {
  check(`UUID: ${JSON.stringify(id)} nicht speicherbar`, !canPersistMarketWine(id));
}

// ── Mengen von Marktplatzweinen ───────────────────────────────────────────────

const rows = [purchase('p1', W1, 2, '2026-01-01'), purchase('p2', W1, 3, '2026-03-01')];
eq('Menge: gleich bleibt gleich', planQuantityChange(rows, 5), { updates: [], deletes: [] });
eq('Menge: mehr erhöht neueste Zeile', planQuantityChange(rows, 7), { updates: [{ id: 'p2', quantity: 5 }], deletes: [] });
eq('Menge: weniger zieht von neuester ab', planQuantityChange(rows, 4), { updates: [{ id: 'p2', quantity: 2 }], deletes: [] });
eq('Menge: neueste fällt weg', planQuantityChange(rows, 2), { updates: [], deletes: ['p2'] });
eq('Menge: über Zeilen hinweg', planQuantityChange(rows, 1), { updates: [{ id: 'p1', quantity: 1 }], deletes: ['p2'] });
eq('Menge: 0 entfernt alles', planQuantityChange(rows, 0), { updates: [], deletes: ['p2', 'p1'] });
eq('Menge: negativ wie 0', planQuantityChange(rows, -3), { updates: [], deletes: ['p2', 'p1'] });
eq('Menge: Zeile ohne ID', planQuantityChange([purchase(null, W1, 1, '2026-01-01')], 3), null);
eq('Menge: keine Zeilen', planQuantityChange([], 3), null);
eq('Menge: NaN', planQuantityChange(rows, NaN), null);

// ── Weinart-Zuordnung ─────────────────────────────────────────────────────────

const WEINART_TYP: [unknown, Wine['type']][] = [
  ['Rotwein', 'Rotwein'],
  ['Weißwein', 'Weißwein'],
  ['Rosé', 'Roséwein'],
  ['Roséwein', 'Roséwein'],
  ['Schaumwein', 'Schaumwein'],
  ['Dessert- und Likörwein', 'Süßwein'],
  ['Süßwein', 'Süßwein'],
  [' Rosé ', 'Roséwein'],
  ['rose', 'Roséwein'],
  ['Champagner', 'Schaumwein'],
  ['Portwein', 'Süßwein'],
  ['Orangewein', 'Weißwein'],
  ['', 'Rotwein'],
  [null, 'Rotwein'],
  [undefined, 'Rotwein'],
  [42, 'Rotwein'],
  ['Bier', 'Rotwein'],
];
for (const [w, typ] of WEINART_TYP) eq(`weinartToWineType(${JSON.stringify(w)})`, weinartToWineType(w), typ);
check('Rosé nicht mehr Rotwein', weinartToWineType('Rosé') !== 'Rotwein');
check('Dessert- und Likörwein nicht mehr Rotwein', weinartToWineType('Dessert- und Likörwein') !== 'Rotwein');
for (const w of WEINART_WERTE) {
  // Anzeige-Typ und Verkostungs-Kategorie passen zusammen
  const typ = weinartToWineType(w);
  const kat = weinartToKategorie(w);
  eq(`Anzeige-Typ passt zur Kategorie (${w})`, weinartToKategorie(typ), kat);
  eq(`eigener Wein ${w}: Typ`, customWineToWine(custom(C1, 'x', '2026-01-01', { weinart: w })).type, typ);
}

// ── Private Notiz: Speicher-Payloads ──────────────────────────────────────────

const reviewPayload = buildReviewPayload(U, W1, 4);
eq('Payload reviews: genau user_id, wine_id, rating', reviewPayload, { user_id: U, wine_id: W1, rating: 4 });
check('Payload reviews: kein Feld review_text', reviewPayload !== null && !('review_text' in reviewPayload));
check('Payload reviews: keine Notiz in irgendeinem Feld', !Object.keys(reviewPayload ?? {}).some((k) => /text|notiz|note|comment/i.test(k)));
eq('Payload reviews: Felder sortiert', Object.keys(reviewPayload ?? {}).sort(), ['rating', 'user_id', 'wine_id']);
for (const r of [null, undefined, 0, 6, 2.5, '4', NaN]) {
  eq(`Payload reviews: ohne gültige Sterne (${JSON.stringify(r)}) kein Eintrag`, buildReviewPayload(U, W1, r), null);
}
eq('Payload reviews: wine_id ohne UUID', buildReviewPayload(U, 'w1', 4), null);
eq('Payload reviews: ohne Nutzer', buildReviewPayload('', W1, 4), null);

eq('Payload purchased_wines: Notiz landet in notiz', buildPurchaseNotizPayload('  Zum Geburtstag öffnen  '), { notiz: 'Zum Geburtstag öffnen' });
eq('Payload purchased_wines: nur das Feld notiz', Object.keys(buildPurchaseNotizPayload('x') ?? {}), ['notiz']);
eq('Payload purchased_wines: leere Notiz → null', buildPurchaseNotizPayload('   '), { notiz: null });
eq('Payload purchased_wines: keine Notiz → null', buildPurchaseNotizPayload(undefined), { notiz: null });
eq('Payload purchased_wines: 1000 Zeichen ok', buildPurchaseNotizPayload('🍷'.repeat(1000))?.notiz?.length, 2000);
eq('Payload purchased_wines: 1000 Zeichen plus Leerzeichen ok', buildPurchaseNotizPayload(` ${'x'.repeat(1000)} `)?.notiz?.length, 1000);
eq('Payload purchased_wines: 1001 Zeichen abgelehnt', buildPurchaseNotizPayload('x'.repeat(1001)), null);
eq('Payload purchased_wines: falscher Typ abgelehnt', buildPurchaseNotizPayload(42), null);
// Notiz ohne Sterne: Notiz wird gespeichert, aber es entsteht kein reviews-Eintrag.
eq('Notiz ohne Sterne: purchased_wines ja, reviews nein', [buildPurchaseNotizPayload('nur Notiz'), buildReviewPayload(U, W1, null)], [{ notiz: 'nur Notiz' }, null]);

check('validateNotiz: leer ok', validateNotiz('') === null && validateNotiz(null) === null);
check('validateNotiz: 1001 Zeichen Fehler', validateNotiz('x'.repeat(1001)) !== null);

eq('purchaseNotiz: neueste Zeile mit Notiz', purchaseNotiz([
  purchase('a', W1, 1, '2026-01-01', 'alt'),
  purchase('b', W1, 1, '2026-03-01', null),
  purchase('c', W1, 1, '2026-02-01', 'neu'),
]), 'neu');
eq('purchaseNotiz: keine Notiz', purchaseNotiz([purchase('a', W1, 1, '2026-01-01')]), null);
eq('purchaseNotiz: keine Zeilen', purchaseNotiz([]), null);
const ohneSterne = mergeCellar({
  purchases: [purchase('p9', W2, 1, '2026-01-01', 'nur Notiz')],
  marketWines: {}, reviews: [], customWines: [], localEntries: [], localCustomWines: [],
})[0];
eq('merge: Notiz ohne Sterne wird angezeigt', [ohneSterne?.rating, ohneSterne?.notes], [undefined, 'nur Notiz']);

// ── Fehlermeldungen ───────────────────────────────────────────────────────────

eq('Fehler: Network request failed (Supabase pausiert)', cellarErrorMessage(new TypeError('Network request failed')), SAVE_NETWORK_MESSAGE);
eq('Fehler: Netzwerk beim Laden', cellarErrorMessage({ message: 'TypeError: Network request failed' }, 'load'), LOAD_NETWORK_MESSAGE);
eq('Fehler: Tabelle custom_wines fehlt', cellarErrorMessage({ code: 'PGRST205', message: "Could not find the table 'public.custom_wines'" }), CUSTOM_WINES_MISSING_MESSAGE);
eq('Fehler: Spalte notiz fehlt (Migration nicht ausgeführt)', cellarErrorMessage({ code: 'PGRST204', message: "Could not find the 'notiz' column of 'purchased_wines' in the schema cache" }), PURCHASE_NOTIZ_MISSING_MESSAGE);
check('Fehler: RLS', cellarErrorMessage({ code: '42501', message: 'new row violates row-level security policy' }).includes('Berechtigung'));
check('Fehler: Check-Constraint', cellarErrorMessage({ code: '23514', message: 'violates check constraint' }).includes('ungültig'));
check('Fehler: unbekannt ergibt deutsche Meldung', cellarErrorMessage(new Error('boom')).startsWith('Konnte nicht gespeichert'));

// ── Ergebnis ──────────────────────────────────────────────────────────────────

console.log(`Weinkeller-Prüfung: ${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  throw new Error(`${failures.length} Prüfungen fehlgeschlagen`);
}
