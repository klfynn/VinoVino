// Prüfskript für „Mein Weinkeller“: Eingaben eigener Weine, Zusammenführen, Sortierung,
// Weine ohne UUID, Mengenänderung, Weinart-Zuordnung und private Notiz (nie in reviews.review_text).
// Außerdem: Weinbild-Darstellung (gültige Bildadresse, Platzhalterfarbe, Größen-Voreinstellungen).
// Außerdem: Swipe-Filter (Jahrgang und Preis nur, wenn eingeschränkt), Zähler aktiver Filter
// und Neuladen des Swipe-Stapels (aktuelle Karte bleibt, neue Weine hinten).
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
import {
  countActiveFilters,
  DEFAULT_FILTER,
  FilterbarerWein,
  FilterState,
  filterWines,
  isJahrgangFilterAktiv,
  isPreisFilterAktiv,
  JAHRGANG_MAX,
  jahrgangsObergrenze,
  wineMatchesFilter,
} from '../lib/filter';
import { folgeIndex, mergeWineLists, NEULADEN_ABSTAND_MS, sollNeuLaden } from '../lib/reload';
import {
  isLoadableWineImageUri,
  isValidWineImagePreset,
  normalizeWineImageUri,
  silhouetteIconSize,
  WINE_IMAGE_LABEL_LEER,
  WINE_IMAGE_PRESETS,
  WINE_IMAGE_SIZE_NAMES,
  WINE_TINTS,
  wineImageInsetPercent,
  wineImageLabel,
  wineImagePreset,
  wineImageTint,
  wineImageWeinart,
} from '../lib/wineImage';

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
eq('eigener Wein ohne Weinart: Anzeige wie bisher Rotwein', customWineToWine(custom(C1, 'x', '2026-01-01', { weinart: null })).type, 'Rotwein');
eq('eigener Wein ohne Weinart: ursprüngliche Angabe bleibt null', customWineToWine(custom(C1, 'x', '2026-01-01', { weinart: null })).weinartRoh, null);
eq('eigener Wein Rosé: ursprüngliche Angabe bleibt', customWineToWine(custom(C1, 'x', '2026-01-01', { weinart: 'Rosé' })).weinartRoh, 'Rosé');

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

// ── Weinbild: Bildadresse ─────────────────────────────────────────────────────

check('Bild: https-Adresse gültig', isLoadableWineImageUri('https://abc.supabase.co/storage/v1/object/public/test-bilder/flasche.png'));
check('Bild: https mit Suche gültig', isLoadableWineImageUri('https://example.com/a.png?w=300'));
eq('Bild: Leerzeichen am Rand werden entfernt', normalizeWineImageUri('  https://example.com/a.png  '), 'https://example.com/a.png');
for (const [name, wert] of [
  ['leer', ''],
  ['null', null],
  ['undefined', undefined],
  ['http://', 'http://example.com/a.png'],
  ['Text ohne Schema', 'test'],
  ['Domain ohne Schema', 'example.com/a.png'],
  ['nur Leerzeichen', '   '],
  ['nur https://', 'https://'],
  ['https ohne Punkt im Host', 'https://localhost/a.png'],
  ['Leerzeichen in der Adresse', 'https://example.com/a b.png'],
  ['data-Adresse', 'data:image/png;base64,AAAA'],
  ['Zahl', 42],
] as [string, unknown][]) {
  check(`Bild: ${name} ist kein Bild`, !isLoadableWineImageUri(wert), wert);
  eq(`Bild: ${name} ergibt null`, normalizeWineImageUri(wert), null);
}
check('Bild: Platzhalter im Weinkeller ist „kein Bild“', !isLoadableWineImageUri(CELLAR_PLACEHOLDER_IMAGE));

// ── Weinbild: Platzhalterfarbe je Weinart ─────────────────────────────────────

eq('Tönung: Rotwein', wineImageTint('Rotwein'), WINE_TINTS.rot);
eq('Tönung: Weißwein', wineImageTint('Weißwein'), WINE_TINTS.weiss);
eq('Tönung: Rosé', wineImageTint('Rosé'), WINE_TINTS.rose);
eq('Tönung: Roséwein', wineImageTint('Roséwein'), WINE_TINTS.rose);
eq('Tönung: Schaumwein', wineImageTint('Schaumwein'), WINE_TINTS.schaum);
eq('Tönung: Orange', wineImageTint('Orangewein'), WINE_TINTS.orange);
eq('Tönung: Süßwein', wineImageTint('Dessert- und Likörwein'), WINE_TINTS.suess);
eq('Tönung: unbekannt', wineImageTint('Obstwein'), WINE_TINTS.unbekannt);
eq('Tönung: leer', wineImageTint(''), WINE_TINTS.unbekannt);
eq('Tönung: null', wineImageTint(null), WINE_TINTS.unbekannt);
eq('Tönung: undefined', wineImageTint(undefined), WINE_TINTS.unbekannt);
check('Tönung: unbekannt ist nicht rot', WINE_TINTS.unbekannt !== WINE_TINTS.rot);
check('Tönung: alle Farben verschieden', new Set(Object.values(WINE_TINTS)).size === Object.keys(WINE_TINTS).length);
check('Tönung: alle Farben sind Hex-Werte', Object.values(WINE_TINTS).every((c) => /^#[0-9a-f]{6}$/i.test(c)));
eq('Tönung: Weinart ohne Angabe (weinartRoh null) bleibt neutral',
  wineImageTint(wineImageWeinart({ type: 'Rotwein', weinartRoh: null })), WINE_TINTS.unbekannt);
eq('Tönung: weinartRoh hat Vorrang vor type',
  wineImageWeinart({ type: 'Rotwein', weinartRoh: 'Rosé' }), 'Rosé');
eq('Tönung: ohne weinartRoh gilt type (Scanner)', wineImageWeinart({ type: 'Weißwein' }), 'Weißwein');

// ── Weinbild: Barrierefreiheit ────────────────────────────────────────────────

eq('Label: mit Bild', wineImageLabel('Barolo Riserva', true), 'Flasche Barolo Riserva');
eq('Label: ohne Bild', wineImageLabel('Barolo Riserva', false), WINE_IMAGE_LABEL_LEER);
eq('Label: ohne Namen', wineImageLabel('  ', true), 'Flasche');

// ── Weinbild: Größen-Voreinstellungen ─────────────────────────────────────────

eq('Größen: alle vier vorhanden', [...WINE_IMAGE_SIZE_NAMES].sort(), ['detail', 'karte', 'klein', 'liste']);
for (const name of WINE_IMAGE_SIZE_NAMES) {
  check(`Größen: ${name} gültig`, isValidWineImagePreset(WINE_IMAGE_PRESETS[name]), WINE_IMAGE_PRESETS[name]);
}
check('Größen: Karte und Detail Hochformat', WINE_IMAGE_PRESETS.karte.aspectRatio < 1 && WINE_IMAGE_PRESETS.detail.aspectRatio < 1);
check('Größen: Liste und Klein quadratisch', WINE_IMAGE_PRESETS.liste.aspectRatio === 1 && WINE_IMAGE_PRESETS.klein.aspectRatio === 1);
eq('Größen: unbekannter Name ergibt Liste', wineImagePreset('riesig'), WINE_IMAGE_PRESETS.liste);
check('Größen: ungültige Werte werden erkannt', !isValidWineImagePreset({ aspectRatio: 0, radius: -1, fuellgrad: 2, freiUnten: Number.NaN }));
eq('Größen: Rand bei 84 % Füllgrad', wineImageInsetPercent(0.84), '8%');
eq('Größen: Rand bei 82 % Füllgrad', wineImageInsetPercent(0.82), '9%');
eq('Silhouette: hoher Bereich', silhouetteIconSize(100, 300), 220);
eq('Silhouette: breiter Bereich', silhouetteIconSize(300, 100), 100);
eq('Silhouette: ohne Maße', silhouetteIconSize(0, 0), 0);

// ── Swipe-Filter: Jahrgang und Preis nur, wenn eingeschränkt ──────────────────

const fw = (teil: Partial<FilterbarerWein> = {}): FilterbarerWein => ({
  type: 'Roséwein',
  taste: ['trocken'],
  country: 'Deutschland',
  region: 'Pfalz',
  grape: 'Spätburgunder',
  vintage: 2022,
  price: 12,
  anlass: [],
  bioNaturVegan: [],
  passtZu: [],
  rating: 0,
  ...teil,
});
const mitFilter = (teil: Partial<FilterState>): FilterState => ({ ...DEFAULT_FILTER, ...teil });
const passt = (w: Partial<FilterbarerWein>, f: Partial<FilterState> = {}) => wineMatchesFilter(fw(w), mitFilter(f));

for (const v of [2025, 2026, 0, 1960]) {
  check(`Filter: Standardbereich, Jahrgang ${v} sichtbar`, passt({ vintage: v }));
}
for (const p of [0, 3, 700]) {
  check(`Filter: Standardbereich, Preis ${p} sichtbar`, passt({ price: p }));
}
check('Filter: Standardbereich, ohne Jahrgang und ohne Preis sichtbar', passt({ vintage: 0, price: 0 }));
check('Filter: Rosé Pfaffmann (Deutschland, Jahrgang 2025) ohne Filter sichtbar',
  passt({ type: 'Roséwein', country: 'Deutschland', vintage: 2025 }));

const J = { jahrgang: { min: 2000, max: 2020 } };
check('Filter: Jahrgang 2000–2020, 2019 sichtbar', passt({ vintage: 2019 }, J));
check('Filter: Jahrgang 2000–2020, 2025 unsichtbar', !passt({ vintage: 2025 }, J));
check('Filter: Jahrgang 2000–2020, 0 unsichtbar', !passt({ vintage: 0 }, J));
check('Filter: Jahrgang 2000–2020, Grenzen 2000 und 2020 sichtbar', passt({ vintage: 2000 }, J) && passt({ vintage: 2020 }, J));
check('Filter: nur Obergrenze eingeschränkt wirkt', !passt({ vintage: 2023 }, { jahrgang: { min: DEFAULT_FILTER.jahrgang.min, max: 2020 } }));
check('Filter: nur Untergrenze eingeschränkt wirkt', !passt({ vintage: 0 }, { jahrgang: { min: 1995, max: DEFAULT_FILTER.jahrgang.max } }));

const P = { preis: { min: 10, max: 50 } };
check('Filter: Preis 10–50, 30 sichtbar', passt({ price: 30 }, P));
check('Filter: Preis 10–50, 0 unsichtbar', !passt({ price: 0 }, P));
check('Filter: Preis 10–50, 80 unsichtbar', !passt({ price: 80 }, P));
check('Filter: nur Preis-Obergrenze 100, 700 unsichtbar', !passt({ price: 700 }, { preis: { min: DEFAULT_FILTER.preis.min, max: 100 } }));

const JP = { ...J, ...P };
check('Filter kombiniert: 2019 und 30 € sichtbar', passt({ vintage: 2019, price: 30 }, JP));
check('Filter kombiniert: 2019 und 80 € unsichtbar', !passt({ vintage: 2019, price: 80 }, JP));
check('Filter kombiniert: 2025 und 30 € unsichtbar', !passt({ vintage: 2025, price: 30 }, JP));
check('Filter kombiniert: Jahrgang eingeschränkt, Preis Standard, Preis 0 sichtbar', passt({ vintage: 2019, price: 0 }, J));
check('Filter kombiniert: Weinart Rosé und Jahrgang, passend', passt({ vintage: 2019 }, { ...J, weinart: ['Rosé'] }));
check('Filter kombiniert: Weinart Rotwein schließt Rosé aus', !passt({ vintage: 2019 }, { ...J, weinart: ['Rotwein'] }));

// Weinart, Herkunft, Rebsorte, Anlass und Bewertung wie bisher
check('Filter Weinart: Rosé passt zu Roséwein', passt({}, { weinart: ['Rosé'] }));
check('Filter Weinart: Dessert- und Likörwein passt zu Süßwein', passt({ type: 'Süßwein' }, { weinart: ['Dessert- und Likörwein'] }));
check('Filter Weinart: Rotwein passt nicht zu Roséwein', !passt({}, { weinart: ['Rotwein'] }));
check('Filter Weinart: mehrere Weinarten (oder)', passt({}, { weinart: ['Rotwein', 'Rosé'] }));
check('Filter Herkunft: Deutschland passt', passt({}, { herkunft: ['Deutschland'] }));
check('Filter Herkunft: Italien passt nicht', !passt({}, { herkunft: ['Italien'] }));
check('Filter Herkunft: Neue Welt mit Chile', passt({ country: 'Chile' }, { herkunft: ['Neue Welt'] }));
check('Filter Herkunft: Neue Welt ohne Deutschland', !passt({}, { herkunft: ['Neue Welt'] }));
check('Filter Herkunft: exakter Vergleich (Leerzeichen zählt)', !passt({ country: 'Deutschland ' }, { herkunft: ['Deutschland'] }));
check('Filter Rebsorte: Teiltext passt', passt({ grape: 'Spätburgunder, Dornfelder' }, { rebsorte: ['Dornfelder'] }));
check('Filter Rebsorte: fremde Rebsorte passt nicht', !passt({}, { rebsorte: ['Riesling'] }));
check('Filter Region: Pfalz passt', passt({}, { region: ['Pfalz'] }));
check('Filter Geschmack: Trocken passt zu „trocken“', passt({}, { geschmack: ['Trocken'] }));
check('Filter Anlass: ohne Anlass am Wein unsichtbar', !passt({}, { anlass: ['Grillabend'] }));
check('Filter Anlass: passender Anlass sichtbar', passt({ anlass: ['Grillabend'] }, { anlass: ['Grillabend'] }));
check('Filter Bewertung: Standard (1) lässt Bewertung 0 durch', passt({ rating: 0 }));
check('Filter Bewertung: 3 Sterne verlangt 88', !passt({ rating: 87 }, { bewertungMin: 3 }) && passt({ rating: 88 }, { bewertungMin: 3 }));

eq('Filter: filterWines behält Reihenfolge',
  filterWines([fw({ vintage: 2019 }), fw({ vintage: 2025 }), fw({ vintage: 2001 })], mitFilter(J)).map((w) => w.vintage),
  [2019, 2001]);

// Jahrgangs-Obergrenze folgt dem aktuellen Jahr
eq('Jahrgang: Obergrenze ist das aktuelle Jahr', JAHRGANG_MAX, new Date().getFullYear());
eq('Jahrgang: Standard nutzt dieselbe Obergrenze', DEFAULT_FILTER.jahrgang.max, JAHRGANG_MAX);
eq('Jahrgang: Obergrenze für ein festes Datum', jahrgangsObergrenze(new Date(2031, 5, 1)), 2031);
check('Jahrgang: Obergrenze nicht mehr 2024', JAHRGANG_MAX > 2024);
check('Jahrgang: eingeschränkt auf alten Standard 2024 wirkt jetzt als Filter',
  isJahrgangFilterAktiv({ min: DEFAULT_FILTER.jahrgang.min, max: 2024 }));
check('Jahrgang: Wein aus dem aktuellen Jahr bei Standard sichtbar', passt({ vintage: JAHRGANG_MAX }));

// Zähler aktiver Filter passt zur Filterwirkung
eq('Aktive Filter: Standard', countActiveFilters(DEFAULT_FILTER), 0);
eq('Aktive Filter: Jahrgang eingeschränkt', countActiveFilters(mitFilter(J)), 1);
eq('Aktive Filter: Preis eingeschränkt', countActiveFilters(mitFilter(P)), 1);
eq('Aktive Filter: Jahrgang, Preis und Weinart', countActiveFilters(mitFilter({ ...JP, weinart: ['Rosé'] })), 3);
check('Aktive Filter: Standardbereich Jahrgang ist kein Filter', !isJahrgangFilterAktiv(DEFAULT_FILTER.jahrgang));
check('Aktive Filter: Standardbereich Preis ist kein Filter', !isPreisFilterAktiv(DEFAULT_FILTER.preis));
for (const f of [DEFAULT_FILTER, mitFilter(J), mitFilter(P), mitFilter(JP)]) {
  eq(`Aktive Filter: Zähler stimmt mit Wirkung überein (${JSON.stringify([f.jahrgang, f.preis])})`,
    isJahrgangFilterAktiv(f.jahrgang) || isPreisFilterAktiv(f.preis), countActiveFilters(f) > 0);
}

// ── Neuladen des Swipe-Stapels ───────────────────────────────────────────────

type RW = { id: string; name: string };
const rw = (id: string, name = id): RW => ({ id, name });
const ids = (l: readonly RW[]) => l.map((w) => w.id);
const ALT: RW[] = [rw('a'), rw('b'), rw('c'), rw('d')];

eq('Neuladen: unverändert', ids(mergeWineLists(ALT, { ok: true, wines: [rw('a'), rw('b'), rw('c'), rw('d')] })), ['a', 'b', 'c', 'd']);
eq('Neuladen: neuer Wein kommt hinten dazu', ids(mergeWineLists(ALT, { ok: true, wines: [rw('e'), rw('a'), rw('b'), rw('c'), rw('d')] })), ['a', 'b', 'c', 'd', 'e']);
eq('Neuladen: entfernter Wein ist weg', ids(mergeWineLists(ALT, { ok: true, wines: [rw('a'), rw('c'), rw('d')] })), ['a', 'c', 'd']);
eq('Neuladen: andere Reihenfolge der Datenbank ändert den Stapel nicht', ids(mergeWineLists(ALT, { ok: true, wines: [rw('d'), rw('c'), rw('b'), rw('a')] })), ['a', 'b', 'c', 'd']);
eq('Neuladen: geänderte Daten werden übernommen', mergeWineLists(ALT, { ok: true, wines: [rw('a'), rw('b', 'Neu'), rw('c'), rw('d')] })[1].name, 'Neu');
eq('Neuladen: leere neue Liste leert den Stapel', mergeWineLists(ALT, { ok: true, wines: [] }), []);
eq('Neuladen: leere alte Liste übernimmt die neue', ids(mergeWineLists<RW>([], { ok: true, wines: [rw('x'), rw('y')] })), ['x', 'y']);
check('Neuladen: Fehlerfall behält dieselbe Liste', mergeWineLists(ALT, { ok: false }) === ALT);
eq('Neuladen: doppelte id in der neuen Liste nur einmal', ids(mergeWineLists(ALT, { ok: true, wines: [rw('a'), rw('e'), rw('e')] })), ['a', 'e']);

eq('Position: aktuelle Karte bleibt (unverändert)', folgeIndex(ALT, ALT, 2), 2);
eq('Position: aktuelle Karte bleibt, wenn davor ein Wein entfernt wurde', folgeIndex(ALT, [rw('a'), rw('c'), rw('d')], 2), 1);
eq('Position: aktuelle Karte bleibt, wenn hinten ein Wein dazukommt', folgeIndex(ALT, [...ALT, rw('e')], 1), 1);
eq('Position: aktuelle Karte entfernt, nächste rückt nach', folgeIndex(ALT, [rw('a'), rw('b'), rw('d')], 2), 2);
eq('Position: aktuelle Karte entfernt, die davor auch', folgeIndex(ALT, [rw('a'), rw('d')], 2), 1);
eq('Position: Stapel am Ende zeigt neuen Wein', folgeIndex(ALT, [...ALT, rw('e')], 4), 4);
eq('Position: leere neue Liste', folgeIndex(ALT, [], 2), 0);
eq('Position: leere alte Liste', folgeIndex([], [rw('x')], 0), 0);
eq('Position: Fehlerfall (Liste unverändert)', folgeIndex(ALT, mergeWineLists(ALT, { ok: false }), 3), 3);

eq('Neuladen-Abstand: 60 Sekunden', NEULADEN_ABSTAND_MS, 60_000);
check('Neuladen-Abstand: ohne bisheriges Laden nicht', !sollNeuLaden(null, 1_000_000));
check('Neuladen-Abstand: nach 10 Sekunden nicht', !sollNeuLaden(1_000_000, 1_010_000));
check('Neuladen-Abstand: nach 59,9 Sekunden nicht', !sollNeuLaden(1_000_000, 1_059_900));
check('Neuladen-Abstand: nach 60 Sekunden ja', sollNeuLaden(1_000_000, 1_060_000));
check('Neuladen-Abstand: nach 5 Minuten ja', sollNeuLaden(1_000_000, 1_300_000));

// ── Ergebnis ──────────────────────────────────────────────────────────────────

console.log(`Weinkeller-Prüfung: ${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  throw new Error(`${failures.length} Prüfungen fehlgeschlagen`);
}
