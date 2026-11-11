// Prüfskript des Verkostungsbogens: Kataloge, Validierung, Entwurf und Assistent (Teil B).
// Ausführen mit: npm run check:tasting
import { TIERS } from '../content/academy';
import {
  ABSCHNITTE,
  AROMEN,
  DEFAULT_KATEGORIE,
  FARBEN,
  getAromaStufen,
  getFarben,
  getFehler,
  getRandFarben,
  getSkalen,
  SKALEN,
  TERROIR,
  isWeinartWert,
  WEINART_WERTE,
  weinartToKategorie,
} from '../lib/tasting/catalog';
import {
  isValidTastingData,
  MAX_LIST_LENGTH,
  profileFromTasting,
  sanitizeTastingData,
} from '../lib/tasting/validate';
import {
  isDraftValid,
  parseDraft,
  serializeDraft,
  TASTING_DRAFT_MAX_AGE_MS,
  TastingDraft,
  tastingDraftKey,
} from '../lib/tasting/draft';
import {
  LAGERPOTENZIAL_WERTE,
  NOTIZ_MAX_LENGTH,
  TASTING_LEVELS,
  TASTING_STEPS,
  TastingData,
  TastingLevel,
  TastingNote,
  TastingStep,
  TRINKREIFE_WERTE,
  WEIN_KATEGORIEN,
  WeinKategorie,
  WineRef,
} from '../lib/tasting/types';
import {
  filledSteps,
  hasAnyInput,
  isFieldVisible,
  isStepFilled,
  nextStep,
  previousStep,
  pruneTastingData,
  resumeStep,
  stepSkalen,
  TastingFeld,
  visibleAromaStufen,
  visibleFarben,
  visibleFehler,
  visibleFields,
  visibleRandFarben,
  visibleSteps,
} from '../lib/tasting/visibility';
import {
  aromaPreview,
  formatTastingDate,
  groupTastingsByRef,
  kategorieHatSkala,
  LAGERPOTENZIAL_LABELS,
  latestTasting,
  LEVEL_BESCHREIBUNG,
  levelLabel,
  profileRows,
  restLabel,
  selectedAromaIds,
  sortTastingsDesc,
  summarySentence,
  tastingCountLabel,
  tastingsFor,
  toggleId,
  TRINKREIFE_LABELS,
} from '../lib/tasting/summary';
import { bodenLabel, bodenVergleichText, BODEN_HINWEIS, compareBoden } from '../lib/tasting/terroirCompare';
import {
  availabilityHint,
  initialLevel,
  kategorieForEntry,
  wineInfoLine,
  parseStoredLevel,
  parseTastingParams,
  ratingToSave,
  tastingAvailability,
  tastingLevelKey,
} from '../lib/tasting/wizard';
import {
  bodenVorbelegung,
  customRef,
  isStoredWineRef,
  isWineRef,
  marketRef,
  sameWineRef,
  wineRefColumns,
  wineRefFromColumns,
  wineRefKey,
} from '../lib/tasting/wineRef';

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

// ── Katalog-IDs: Schema und Eindeutigkeit ─────────────────────────────────────

const ID_RE = /^[a-z]+(_[a-z]+)*$/;

function checkIds(name: string, ids: string[]) {
  for (const id of ids) check(`${name}: ID „${id}“ folgt dem Schema`, ID_RE.test(id), id);
  const doppelt = ids.filter((id, i) => ids.indexOf(id) !== i);
  check(`${name}: IDs eindeutig`, doppelt.length === 0, doppelt);
}

const aromaIds = AROMEN.stufen.flatMap((s) => s.familien.flatMap((f) => f.aromen.map((a) => a.id)));
const fehlerIds = AROMEN.fehler.aromen.map((a) => a.id);
const familienIds = AROMEN.stufen.flatMap((s) => s.familien.map((f) => f.id));
checkIds('Aromen (inkl. Fehlnoten)', [...aromaIds, ...fehlerIds]);
checkIds('Aromafamilien und Stufen', [...familienIds, ...AROMEN.stufen.map((s) => s.id), AROMEN.fehler.id]);

const farbKategorien = Object.values(FARBEN.kategorien);
checkIds('Farben', farbKategorien.flatMap((k) => k.farben.map((f) => f.id)));
checkIds('Randfarben', farbKategorien.flatMap((k) => k.rand.map((f) => f.id)));
checkIds('Skalen', SKALEN.map((s) => s.id));
checkIds('Terroir-Eindrücke', TERROIR.eindruecke.optionen.map((o) => o.id));
checkIds('Böden', TERROIR.boeden.optionen.map((o) => o.id));
checkIds('Klimaeindruck', TERROIR.klima_eindruck.optionen.map((o) => o.id));
checkIds('Abschnitte', ABSCHNITTE.map((a) => a.id));

// Mindestinhalt laut Aufgabe
eq('Aromen: drei Stufen', AROMEN.stufen.map((s) => s.id), ['primaer', 'sekundaer', 'tertiaer']);
eq('Aromen: 10 Primärfamilien', AROMEN.stufen[0].familien.length, 10);
eq('Aromen: 3 Sekundärfamilien', AROMEN.stufen[1].familien.length, 3);
eq('Aromen: 4 Tertiärfamilien', AROMEN.stufen[2].familien.length, 4);
eq('Fehlnoten: 7 Einträge', fehlerIds.length, 7);
eq('Fehlnoten: nur Profi', AROMEN.fehler.ab_stufe, 'profi');
eq('Böden: 11 Einträge inkl. „weiß nicht“', TERROIR.boeden.optionen.length, 11);
check('Böden: „weiß nicht“ vorhanden', TERROIR.boeden.optionen.some((o) => o.id === 'weiss_nicht'));
eq('Terroir-Eindrücke: 9 Einträge', TERROIR.eindruecke.optionen.length, 9);
eq('Klimaeindruck: 4 Einträge', TERROIR.klima_eindruck.optionen.map((o) => o.id), ['kuehl', 'gemaessigt', 'warm', 'heiss']);
for (const b of TERROIR.boeden.optionen) {
  check(`Boden ${b.id}: vorsichtige Formulierung`, !!b.verbunden_mit && !/\b(macht|verursacht|bewirkt)\b/i.test(b.verbunden_mit), b.verbunden_mit);
}
for (const f of farbKategorien) {
  for (const farbe of [...f.farben, ...f.rand]) {
    check(`Farbe ${farbe.id}: Hex-Wert`, /^#[0-9A-Fa-f]{6}$/.test(farbe.hex), farbe.hex);
  }
}
eq('Farben: alle Kategorien vorhanden', Object.keys(FARBEN.kategorien).sort(), [...WEIN_KATEGORIEN].sort());
for (const k of WEIN_KATEGORIEN) check(`Farben: Kategorie ${k} hat Farben`, getFarben(k).length > 0, k);
eq('Farben: Rotwein von hell nach dunkel', getFarben('rot').map((f) => f.label), [
  'purpurviolett', 'rubinrot', 'granatrot', 'ziegelrot', 'bräunlich',
]);
eq(
  'Farben: Schaumwein = Weißwein + Rosé',
  getFarben('schaum').map((f) => f.id),
  [...getFarben('weiss'), ...getFarben('rose')].map((f) => f.id),
);
eq('Randfarben: nicht in Stufe einfach', getRandFarben('rot', 'einfach'), []);
eq('Randfarben: Rotwein in Profi', getRandFarben('rot', 'profi').map((f) => f.id), [
  'rand_purpur', 'rand_rubin', 'rand_orange', 'rand_braun',
]);

// ── Lektionsverweise ──────────────────────────────────────────────────────────

const lektionIds = new Set(TIERS.flatMap((t) => t.lektionen.map((l) => l.id)));
const verweise: [string, unknown][] = [
  ...AROMEN.stufen.flatMap((s) => s.familien.map((f) => [`Aromafamilie ${f.id}`, f.lektion] as [string, unknown])),
  ['Fehlnoten', AROMEN.fehler.lektion],
  ['Farben', FARBEN.lektion],
  ...Object.entries(FARBEN.kategorien).map(([k, v]) => [`Farbkategorie ${k}`, v.lektion] as [string, unknown]),
  ...SKALEN.map((s) => [`Skala ${s.id}`, s.lektion] as [string, unknown]),
  ['Terroir', TERROIR.lektion],
  ['Terroir-Eindrücke', TERROIR.eindruecke.lektion],
  ['Böden', TERROIR.boeden.lektion],
  ['Klimaeindruck', TERROIR.klima_eindruck.lektion],
  ...ABSCHNITTE.map((a) => [`Abschnitt ${a.id}`, a.lektion] as [string, unknown]),
];
for (const [name, lektion] of verweise) {
  check(
    `${name}: lektion existiert oder ist null`,
    lektion === null || (typeof lektion === 'string' && lektionIds.has(lektion)),
    lektion,
  );
}
check('Jede Aromafamilie hat ein Feld lektion', AROMEN.stufen.every((s) => s.familien.every((f) => 'lektion' in f)));

// ── Weinart → Kategorie ───────────────────────────────────────────────────────

const weinarten: [unknown, WeinKategorie][] = [
  // Werte aus dem Code (FilterContext, wineRecognition, services/supabase.ts, data/wines.ts)
  ['Rotwein', 'rot'],
  ['Weißwein', 'weiss'],
  ['Rosé', 'rose'],
  ['Roséwein', 'rose'],
  ['Schaumwein', 'schaum'],
  ['Süßwein', 'suess'],
  ['Dessert- und Likörwein', 'suess'],
  // Weitere Schreibweisen und Begriffe
  ['rotwein', 'rot'],
  ['  Weisswein ', 'weiss'],
  ['Rose', 'rose'],
  ['Weißherbst', 'rose'],
  ['Champagner', 'schaum'],
  ['Sekt', 'schaum'],
  ['Crémant', 'schaum'],
  ['Prosecco', 'schaum'],
  ['Rosé-Sekt', 'schaum'],
  ['Port', 'suess'],
  ['Portwein', 'suess'],
  ['Sherry', 'suess'],
  ['Eiswein', 'suess'],
  ['Orange Wine', 'orange'],
  ['Orangewein', 'orange'],
  // Unbekannt → Standardkategorie, ohne zu werfen
  ['Portugal', DEFAULT_KATEGORIE],
  ['Cidre', DEFAULT_KATEGORIE],
  ['', DEFAULT_KATEGORIE],
  ['   ', DEFAULT_KATEGORIE],
  [null, DEFAULT_KATEGORIE],
  [undefined, DEFAULT_KATEGORIE],
  [42, DEFAULT_KATEGORIE],
  [{ weinart: 'Rotwein' }, DEFAULT_KATEGORIE],
];
for (const [weinart, erwartet] of weinarten) {
  let ergebnis: WeinKategorie | string;
  try {
    ergebnis = weinartToKategorie(weinart);
  } catch (err) {
    ergebnis = `geworfen: ${String(err)}`;
  }
  eq(`weinartToKategorie(${JSON.stringify(weinart) ?? 'undefined'})`, ergebnis, erwartet);
}
eq('Standardkategorie ist neutral', DEFAULT_KATEGORIE, 'unbekannt');

// ── Skalen ────────────────────────────────────────────────────────────────────

for (const s of SKALEN) {
  eq(`Skala ${s.id}: genau 5 Ankertexte`, s.anker.length, 5);
  check(`Skala ${s.id}: Erklärung vorhanden`, s.erklaerung.trim().length > 0);
  check(`Skala ${s.id}: gültige Stufe`, (TASTING_LEVELS as readonly string[]).includes(s.stufe), s.stufe);
  check(`Skala ${s.id}: gültige Kategorien`, s.kategorien.length > 0 && s.kategorien.every((k) => WEIN_KATEGORIEN.includes(k)), s.kategorien);
}
const tannin = SKALEN.find((s) => s.id === 'tannin');
eq('Tannin: Kategorien nur rot und orange', tannin ? [...tannin.kategorien].sort() : null, ['orange', 'rot']);
for (const k of WEIN_KATEGORIEN) {
  const hatTannin = getSkalen(k, 'profi').some((s) => s.id === 'tannin');
  eq(`Tannin erscheint bei ${k}`, hatTannin, k === 'rot' || k === 'orange');
}
eq('Skalen einfach (rot)', getSkalen('rot', 'einfach').map((s) => s.id), ['suesse', 'saeure', 'koerper']);
eq('Skalen erweitert (rot)', getSkalen('rot', 'erweitert').map((s) => s.id), [
  'suesse', 'saeure', 'koerper', 'tannin', 'alkohol', 'abgang', 'intensitaet_nase', 'qualitaet',
]);
eq('Skalen erweitert (weiss) ohne Tannin', getSkalen('weiss', 'erweitert').some((s) => s.id === 'tannin'), false);
check('Mousse und Perlage nur bei Schaumwein (Profi)', getSkalen('schaum', 'profi').some((s) => s.id === 'mousse') && getSkalen('schaum', 'profi').some((s) => s.id === 'perlage') && !getSkalen('rot', 'profi').some((s) => s.id === 'mousse'));
eq('Mousse nicht in Stufe erweitert', getSkalen('schaum', 'erweitert').some((s) => s.id === 'mousse'), false);
eq('Balance erst in Profi', [getSkalen('weiss', 'erweitert').some((s) => s.id === 'balance'), getSkalen('weiss', 'profi').some((s) => s.id === 'balance')], [false, true]);

// ── Aromen filtern ────────────────────────────────────────────────────────────

eq('Aromen einfach: Primär und Sekundär', getAromaStufen('weiss', 'einfach').map((s) => s.id), ['primaer', 'sekundaer']);
eq('Aromen erweitert: alle drei Stufen', getAromaStufen('rot', 'erweitert').map((s) => s.id), ['primaer', 'sekundaer', 'tertiaer']);
eq('Aromen: keine schwarzen Beeren bei Weißwein', getAromaStufen('weiss', 'profi')[0].familien.some((f) => f.id === 'schwarze_beeren'), false);
eq('Aromen: alle Familien bei unbekannt', getAromaStufen('unbekannt', 'profi').reduce((n, s) => n + s.familien.length, 0), familienIds.length);
eq('Fehlnoten: nicht in erweitert', getFehler('erweitert'), []);
eq('Fehlnoten: in Profi', getFehler('profi').length, 7);

// ── isValidTastingData und sanitizeTastingData ────────────────────────────────

const gueltig: TastingData = {
  sehen: { klarheit: 'klar', intensitaet: 3, farbe: 'rot_rubinrot', rand: 'rand_purpur', viskositaet: 2 },
  riechen: {
    intensitaet: 4,
    zustand: 'sauber',
    aromen: { primaer: ['cassis', 'brombeere'], sekundaer: ['vanille'], tertiaer: ['leder'] },
    fehler: [],
  },
  schmecken: { suesse: 1, saeure: 3, tannin: 4, koerper: 4, alkohol: 4, abgang: 5, balance: 4, aromen_gaumen: ['cassis', 'kaffee'] },
  terroir: { eindruecke: ['warm_reif', 'erdig'], boden_tipp: 'kies', klima_eindruck: 'warm' },
  fazit: { qualitaet: 4, trinkreife: 'trinkbar', lagerpotenzial: 'lang', notiz: 'Dichter Bordeaux, braucht Luft.' },
  blind: { rebsorte_tipp: 'Cabernet Sauvignon', region_tipp: 'Bordeaux', jahrgang_tipp: '2018' },
};

check('isValid: vollständiger Bogen', isValidTastingData(gueltig));
check('isValid: leeres Objekt', isValidTastingData({}));
check('isValid: unbekannte Felder werden toleriert', isValidTastingData({ ...gueltig, zukunft: { x: 1 }, sehen: { ...gueltig.sehen, neu: true } }));
check('isValid: boden_tipp null', isValidTastingData({ terroir: { boden_tipp: null, klima_eindruck: null } }));
check('isValid: Schaumwein mit Mousse und Perlage', isValidTastingData({ sehen: { perlage: 5 }, schmecken: { mousse: 4 } }));
check('isValid: Notiz genau 1000 Zeichen', isValidTastingData({ fazit: { notiz: 'a'.repeat(NOTIZ_MAX_LENGTH) } }));
check('isValid: 1000 Emojis zählen als 1000 Zeichen', isValidTastingData({ fazit: { notiz: '🍷'.repeat(NOTIZ_MAX_LENGTH) } }));

const kaputt: [string, unknown][] = [
  ['null', null],
  ['undefined', undefined],
  ['Zahl', 42],
  ['Text', 'Bogen'],
  ['Array', []],
  ['Abschnitt kein Objekt', { sehen: 'klar' }],
  ['Abschnitt ist Array', { schmecken: [1, 2] }],
  ['Skalenwert 0', { schmecken: { suesse: 0 } }],
  ['Skalenwert 6', { schmecken: { saeure: 6 } }],
  ['Skalenwert 2.5', { schmecken: { koerper: 2.5 } }],
  ['Skalenwert als Text', { schmecken: { tannin: '3' } }],
  ['Skalenwert NaN', { sehen: { intensitaet: NaN } }],
  ['Klarheit unbekannt', { sehen: { klarheit: 'milchig' } }],
  ['Farbe unbekannt', { sehen: { farbe: 'neongruen' } }],
  ['Rand-ID als Farbe', { sehen: { farbe: 'rand_purpur' } }],
  ['Aroma in falscher Stufe', { riechen: { aromen: { primaer: ['vanille'], sekundaer: [], tertiaer: [] } } }],
  ['Aroma unbekannt', { riechen: { aromen: { primaer: ['gummibaerchen'], sekundaer: [], tertiaer: [] } } }],
  ['Aromen ohne Liste', { riechen: { aromen: { primaer: ['zitrone'] } } }],
  ['Aromen als Text', { riechen: { aromen: 'zitrone' } }],
  ['Fehlnote unbekannt', { riechen: { fehler: ['zitrone'] } }],
  ['Fehlnote als Gaumenaroma', { schmecken: { aromen_gaumen: ['korkton'] } }],
  ['Zustand unbekannt', { riechen: { zustand: 'gut' } }],
  ['Eindruck unbekannt', { terroir: { eindruecke: ['magisch'] } }],
  ['Boden unbekannt', { terroir: { boden_tipp: 'beton' } }],
  ['Klima unbekannt', { terroir: { klima_eindruck: 'tropisch' } }],
  ['Trinkreife unbekannt', { fazit: { trinkreife: 'bald' } }],
  ['Lagerpotenzial unbekannt', { fazit: { lagerpotenzial: 'ewig' } }],
  ['Notiz keine Zeichenkette', { fazit: { notiz: 123 } }],
  ['Blind-Tipp keine Zeichenkette', { blind: { jahrgang_tipp: 2018 } }],
  ['Liste zu lang', { terroir: { eindruecke: Array(MAX_LIST_LENGTH + 1).fill('erdig') } }],
];
for (const [name, data] of kaputt) check(`isValid: kaputt (${name})`, !isValidTastingData(data), data);

const zuLangeNotiz = 'x'.repeat(NOTIZ_MAX_LENGTH + 500);
check('isValid: überlange Notiz', !isValidTastingData({ fazit: { notiz: zuLangeNotiz } }));
check('isValid: überlanger Blind-Tipp', !isValidTastingData({ blind: { region_tipp: 'y'.repeat(101) } }));

// sanitize
eq('sanitize: gültiger Bogen bleibt (ohne Fremdfelder)', sanitizeTastingData(gueltig), {
  ...gueltig,
  riechen: { ...gueltig.riechen, fehler: undefined },
});
for (const [name, data] of [['null', null], ['Zahl', 42], ['Text', 'x'], ['Array', [1]], ['undefined', undefined]] as [string, unknown][]) {
  eq(`sanitize: ${name} → {}`, sanitizeTastingData(data), {});
}
eq('sanitize: leeres Objekt', sanitizeTastingData({}), {});
eq('sanitize: unbekannte Felder entfernt', sanitizeTastingData({ zukunft: 1, sehen: { klarheit: 'klar', neu: true } }), {
  sehen: { klarheit: 'klar' },
});
eq(
  'sanitize: ungültige Werte entfernt, gültige bleiben',
  sanitizeTastingData({
    schmecken: { suesse: 0, saeure: 3, tannin: '4', koerper: 2.5, aromen_gaumen: ['cassis', 'quatsch', 'cassis', 7] },
    sehen: { farbe: 'neongruen' },
    terroir: { boden_tipp: 'beton', klima_eindruck: null, eindruecke: ['erdig', 'magisch'] },
  }),
  { schmecken: { saeure: 3, aromen_gaumen: ['cassis'] }, terroir: { eindruecke: ['erdig'], klima_eindruck: null } },
);
eq(
  'sanitize: Aromen falscher Stufe entfernt, Listen ergänzt',
  sanitizeTastingData({ riechen: { aromen: { primaer: ['zitrone', 'vanille'], tertiaer: ['petrol'] } } }),
  { riechen: { aromen: { primaer: ['zitrone'], sekundaer: [], tertiaer: ['petrol'] } } },
);
eq('sanitize: leere Aromen entfallen', sanitizeTastingData({ riechen: { aromen: { primaer: [], sekundaer: [], tertiaer: [] } } }), {});
const gekuerzt = sanitizeTastingData({ fazit: { notiz: `  ${zuLangeNotiz}  ` } });
eq('sanitize: Notiz auf 1000 Zeichen gekürzt', gekuerzt.fazit?.notiz?.length, NOTIZ_MAX_LENGTH);
eq('sanitize: Emoji-Notiz nicht zerschnitten', Array.from(sanitizeTastingData({ fazit: { notiz: '🍷'.repeat(1200) } }).fazit?.notiz ?? '').length, NOTIZ_MAX_LENGTH);
eq('sanitize: Notiz nur Leerzeichen entfällt', sanitizeTastingData({ fazit: { notiz: '   ' } }), {});
eq('sanitize: Steuerzeichen entfernt', sanitizeTastingData({ fazit: { notiz: 'a\u0000b\nc' } }).fazit?.notiz, 'ab\nc');
eq('sanitize: Blind-Tipp gekürzt', sanitizeTastingData({ blind: { region_tipp: 'y'.repeat(150) } }).blind?.region_tipp?.length, 100);
const langeListe = sanitizeTastingData({ schmecken: { aromen_gaumen: aromaIds } });
eq('sanitize: Liste auf Höchstlänge begrenzt', langeListe.schmecken?.aromen_gaumen?.length, Math.min(aromaIds.length, MAX_LIST_LENGTH));

const stichproben: unknown[] = [gueltig, {}, null, 42, ...kaputt.map(([, d]) => d), { fazit: { notiz: zuLangeNotiz } }, { schmecken: { aromen_gaumen: aromaIds } }];
stichproben.forEach((d, i) => check(`sanitize → isValid (Stichprobe ${i + 1})`, isValidTastingData(sanitizeTastingData(d))));
check('sanitize ist idempotent', JSON.stringify(sanitizeTastingData(sanitizeTastingData(gueltig))) === JSON.stringify(sanitizeTastingData(gueltig)));

// Größte mögliche Bögen bleiben unter der Datenbankgrenze (20 000 Byte)
const maximal = sanitizeTastingData({
  sehen: { klarheit: 'trueb', intensitaet: 5, farbe: 'weiss_blassgruen_gelb', rand: 'rand_wasserhell', viskositaet: 5, perlage: 5 },
  riechen: {
    intensitaet: 5,
    zustand: 'auffaellig',
    aromen: {
      primaer: AROMEN.stufen[0].familien.flatMap((f) => f.aromen.map((a) => a.id)),
      sekundaer: AROMEN.stufen[1].familien.flatMap((f) => f.aromen.map((a) => a.id)),
      tertiaer: AROMEN.stufen[2].familien.flatMap((f) => f.aromen.map((a) => a.id)),
    },
    fehler: fehlerIds,
  },
  schmecken: { suesse: 5, saeure: 5, tannin: 5, koerper: 5, alkohol: 5, abgang: 5, balance: 5, mousse: 5, aromen_gaumen: aromaIds },
  terroir: { eindruecke: TERROIR.eindruecke.optionen.map((o) => o.id), boden_tipp: 'vulkangestein', klima_eindruck: 'gemaessigt' },
  fazit: { qualitaet: 5, trinkreife: 'ueber_hoehepunkt', lagerpotenzial: 'mittel', notiz: '"\\'.repeat(600) },
  blind: { rebsorte_tipp: '"'.repeat(100), region_tipp: '🍷'.repeat(100), jahrgang_tipp: '\\'.repeat(100) },
});
const utf8Bytes = (text: string) =>
  Array.from(text).reduce((n, ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return n + (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
  }, 0);
const bytes = utf8Bytes(JSON.stringify(maximal));
check('Größe: maximaler Bogen unter 20 000 Byte', bytes <= 20000, bytes);

// profileFromTasting
eq('profile: vollständiger Bogen', profileFromTasting(gueltig), { suesse: 1, saeure: 3, tannin: 4, koerper: 4, alkohol: 4, abgang: 5 });
eq('profile: leer', profileFromTasting({}), { suesse: null, saeure: null, tannin: null, koerper: null, alkohol: null, abgang: null });
eq('profile: kaputt', profileFromTasting('x'), { suesse: null, saeure: null, tannin: null, koerper: null, alkohol: null, abgang: null });
eq('profile: ungültige Werte werden null', profileFromTasting({ schmecken: { suesse: 9, saeure: '2', koerper: 3 } }), {
  suesse: null, saeure: null, tannin: null, koerper: 3, alkohol: null, abgang: null,
});

// ── Entwurf (AsyncStorage) ────────────────────────────────────────────────────

const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const WINE = '3f2b6c1e-8a4d-4f7a-9c2e-1b5d7e9f0a12';
const CUSTOM = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const REF_M: WineRef = { kind: 'market', id: WINE };
const REF_C: WineRef = { kind: 'custom', id: CUSTOM };
const draft = (over: Partial<TastingDraft> = {}): TastingDraft => ({
  ref: REF_M,
  level: 'erweitert',
  step: 'riechen',
  purchasedWineId: null,
  lessonId: 'l18',
  focus: null,
  data: { sehen: { klarheit: 'klar', farbe: 'weiss_zitronengelb' }, riechen: { intensitaet: 3 } },
  savedAt: NOW - 60_000,
  ...over,
});
const roundTrip = (d: TastingDraft) => parseDraft(serializeDraft(d));

eq('draftKey: mit Nutzer', tastingDraftKey('u-1', REF_M), `tasting_draft_v1:u-1:market:${WINE}`);
eq('draftKey: ohne Nutzer', tastingDraftKey(null, REF_M), `tasting_draft_v1:anon:market:${WINE}`);
eq('draftKey: leerer Nutzer', tastingDraftKey('', { kind: 'market', id: 'w1' }), 'tasting_draft_v1:anon:market:w1');
eq('draftKey: eigener Wein', tastingDraftKey('u-1', REF_C), `tasting_draft_v1:u-1:custom:${CUSTOM}`);
check(
  'draftKey: Marktplatz- und eigener Wein mit gleicher ID haben verschiedene Schlüssel',
  tastingDraftKey('u-1', { kind: 'market', id: CUSTOM }) !== tastingDraftKey('u-1', REF_C),
);
check('draftKey: altes Schema wird nicht mehr erzeugt', tastingDraftKey('u-1', REF_M) !== `tasting_draft_v1:u-1:${WINE}`);
eq('parseDraft: Roundtrip', roundTrip(draft()), draft());
eq('parseDraft: Roundtrip eigener Wein', roundTrip(draft({ ref: REF_C })), draft({ ref: REF_C }));
check('isDraftValid: gültig', isDraftValid(roundTrip(draft()), REF_M, NOW));
check('isDraftValid: eigener Wein gültig', isDraftValid(roundTrip(draft({ ref: REF_C })), REF_C, NOW));
check('isDraftValid: leerer Bogen ist gültig', isDraftValid(draft({ data: {} }), REF_M, NOW));
check('isDraftValid: genau 7 Tage alt ist noch gültig', isDraftValid(draft({ savedAt: NOW - TASTING_DRAFT_MAX_AGE_MS }), REF_M, NOW));
check('isDraftValid: abgelaufen (älter als 7 Tage)', !isDraftValid(draft({ savedAt: NOW - TASTING_DRAFT_MAX_AGE_MS - 1 }), REF_M, NOW));
check('isDraftValid: Zeitpunkt in der Zukunft', !isDraftValid(draft({ savedAt: NOW + 60_000 }), REF_M, NOW));
check('isDraftValid: anderer Wein', !isDraftValid(draft(), { kind: 'market', id: 'anderer-wein' }, NOW));
check('isDraftValid: gleiche ID, andere Art', !isDraftValid(draft(), { kind: 'custom', id: WINE }, NOW));
check('isDraftValid: null', !isDraftValid(null, REF_M, NOW));
check('isDraftValid: ungültiger Bogen', !isDraftValid(draft({ data: { schmecken: { suesse: 9 } } as unknown as TastingData }), REF_M, NOW));
check('isDraftValid: Zeitpunkt NaN', !isDraftValid(draft({ savedAt: NaN }), REF_M, NOW));
eq(
  'serializeDraft: bereinigt den Bogen',
  roundTrip(draft({ data: { schmecken: { suesse: 9, saeure: 2 }, fremd: 1 } as unknown as TastingData }))?.data,
  { schmecken: { saeure: 2 } },
);
eq('parseDraft: leer', parseDraft(null), null);
eq('parseDraft: Leerstring', parseDraft(''), null);
eq('parseDraft: kaputtes JSON', parseDraft('{"ref":{"kind":"market","id":"w1"},"level":"einfach",'), null);
eq('parseDraft: kein Objekt', parseDraft('42'), null);
eq('parseDraft: Array', parseDraft('[]'), null);
eq('parseDraft: unbekannte Stufe', parseDraft(JSON.stringify({ ...draft(), level: 'meister' })), null);
eq('parseDraft: fehlender Zeitpunkt', parseDraft(JSON.stringify({ ...draft(), savedAt: undefined })), null);
eq('parseDraft: data kein Objekt', parseDraft(JSON.stringify({ ...draft(), data: 'x' })), null);
eq('parseDraft: unbekannter Schritt', parseDraft(JSON.stringify({ ...draft(), step: 'tanzen' })), null);
eq('parseDraft: ref fehlt', parseDraft(JSON.stringify({ ...draft(), ref: undefined })), null);
eq('parseDraft: ref mit leerer ID', parseDraft(JSON.stringify({ ...draft(), ref: { kind: 'market', id: '' } })), null);
eq('parseDraft: ref mit unbekannter Art', parseDraft(JSON.stringify({ ...draft(), ref: { kind: 'shop', id: WINE } })), null);
eq('parseDraft: lessonId falscher Typ', parseDraft(JSON.stringify({ ...draft(), lessonId: 3 })), null);
{
  // Entwurf nach altem Schema (mit wineId statt ref) wird ignoriert.
  const { ref: _ref, ...ohneRef } = draft();
  eq('parseDraft: alter Entwurf mit wineId wird ignoriert', parseDraft(JSON.stringify({ ...ohneRef, wineId: WINE })), null);
}

// ── WineRef ───────────────────────────────────────────────────────────────────

eq('wineRefColumns: Marktplatz', wineRefColumns(REF_M), { wine_id: WINE, custom_wine_id: null });
eq('wineRefColumns: eigener Wein', wineRefColumns(REF_C), { wine_id: null, custom_wine_id: CUSTOM });
for (const ref of [REF_M, REF_C, marketRef('x'), customRef('y')]) {
  const cols = wineRefColumns(ref);
  const gesetzt = [cols.wine_id, cols.custom_wine_id].filter((v) => v !== null).length;
  eq(`wineRefColumns: nie beide IDs (${ref.kind})`, gesetzt, 1);
}
eq('wineRefFromColumns: Marktplatz', wineRefFromColumns({ wine_id: WINE, custom_wine_id: null }), REF_M);
eq('wineRefFromColumns: eigener Wein', wineRefFromColumns({ wine_id: null, custom_wine_id: CUSTOM }), REF_C);
eq('wineRefFromColumns: beide gesetzt ergibt null', wineRefFromColumns({ wine_id: WINE, custom_wine_id: CUSTOM }), null);
eq('wineRefFromColumns: keine gesetzt ergibt null', wineRefFromColumns({ wine_id: null, custom_wine_id: null }), null);
eq('wineRefFromColumns: alte Zeile ohne Spalte custom_wine_id', wineRefFromColumns({ wine_id: WINE }), REF_M);
eq('wineRefFromColumns: Roundtrip', wineRefFromColumns(wineRefColumns(REF_C)), REF_C);
check('isWineRef: gültig', isWineRef(REF_M) && isWineRef(REF_C));
check('isWineRef: lokaler Wein ist formal gültig', isWineRef({ kind: 'market', id: 'w1' }));
check('isWineRef: falsche Art', !isWineRef({ kind: 'shop', id: WINE }));
check('isWineRef: leere ID', !isWineRef({ kind: 'custom', id: '' }));
check('isWineRef: Doppelpunkt in ID', !isWineRef({ kind: 'custom', id: 'a:b' }));
check('isWineRef: null/Text/Array', !isWineRef(null) && !isWineRef('market:x') && !isWineRef([]));
check('isStoredWineRef: UUID', isStoredWineRef(REF_M) && isStoredWineRef(REF_C));
check('isStoredWineRef: lokale Testdaten (w1) nicht', !isStoredWineRef({ kind: 'market', id: 'w1' }));
check('isStoredWineRef: Scanner-ID nicht', !isStoredWineRef({ kind: 'market', id: 'scan-1700000000000' }));
check('sameWineRef: gleich', sameWineRef(REF_M, { kind: 'market', id: WINE }));
check('sameWineRef: andere Art', !sameWineRef(REF_M, { kind: 'custom', id: WINE }));
check('sameWineRef: null', !sameWineRef(REF_M, null));
eq('wineRefKey', wineRefKey(REF_C), `custom:${CUSTOM}`);

// Bodentyp als Vorbelegung für den Terroir-Schritt (eigene Weine)
eq('bodenVorbelegung: bekannter Boden', bodenVorbelegung({ boden: 'schiefer' }), 'schiefer');
eq('bodenVorbelegung: weiß nicht', bodenVorbelegung({ boden: 'weiss_nicht' }), null);
eq('bodenVorbelegung: unbekannter Boden', bodenVorbelegung({ boden: 'mondstaub' }), null);
eq('bodenVorbelegung: leer', bodenVorbelegung({ boden: null }), null);
eq('bodenVorbelegung: kein Wein', bodenVorbelegung(null), null);
eq('bodenVorbelegung: falscher Typ', bodenVorbelegung({ boden: 3 }), null);

// Weinart-Liste für eigene Weine: jede Weinart hat eine Kategorie und passende Skalen/Farben
const WEINART_ERWARTET: Record<string, WeinKategorie> = {
  Rotwein: 'rot',
  Weißwein: 'weiss',
  Rosé: 'rose',
  Schaumwein: 'schaum',
  'Dessert- und Likörwein': 'suess',
};
eq('WEINART_WERTE: Werte wie im Händlerportal', [...WEINART_WERTE], Object.keys(WEINART_ERWARTET));
for (const w of WEINART_WERTE) {
  eq(`weinartToKategorie (eigener Wein): ${w}`, weinartToKategorie(w), WEINART_ERWARTET[w]);
  check(`Skalen für eigenen Wein (${w})`, getSkalen(weinartToKategorie(w), 'einfach').length > 0);
  check(`Farben für eigenen Wein (${w})`, getFarben(weinartToKategorie(w)).length > 0);
  check(`isWeinartWert: ${w}`, isWeinartWert(w));
}
check('isWeinartWert: Roséwein ist kein Portalwert', !isWeinartWert('Roséwein'));

// ── Teil B: Sichtbarkeit im Assistenten ───────────────────────────────────────

const skalenIds = (step: TastingStep, k: WeinKategorie, l: TastingLevel) => stepSkalen(step, k, l).map((s) => s.id);
const ALLE_STUFEN: TastingLevel[] = ['einfach', 'erweitert', 'profi'];

// Tannin nur bei Rot und Orange (in jeder Stufe, in der Tannin überhaupt vorkommt)
for (const k of WEIN_KATEGORIEN) {
  const hatTannin = skalenIds('schmecken', k, 'profi').includes('tannin');
  eq(`Tannin nur bei Rot und Orange (${k})`, hatTannin, k === 'rot' || k === 'orange');
  check(`Kein Tannin im Modus Einfach (${k})`, !skalenIds('schmecken', k, 'einfach').includes('tannin'));
}
check('Tannin bei Rotwein ab Erweitert', skalenIds('schmecken', 'rot', 'erweitert').includes('tannin'));
// Perlage und Mousse nur bei Schaumwein
for (const k of WEIN_KATEGORIEN) {
  eq(`Perlage nur bei Schaumwein (${k})`, skalenIds('sehen', k, 'profi').includes('perlage'), k === 'schaum');
  eq(`Mousse nur bei Schaumwein (${k})`, skalenIds('schmecken', k, 'profi').includes('mousse'), k === 'schaum');
}
// Stufe Einfach zeigt keine Profi- (und keine Erweitert-) Felder
for (const k of WEIN_KATEGORIEN) {
  for (const step of TASTING_STEPS) {
    const fremde = stepSkalen(step, k, 'einfach').filter((s) => s.stufe !== 'einfach');
    eq(`Einfach: nur Skalen mit stufe einfach (${k}, ${step})`, fremde.map((s) => s.id), []);
    const erw = stepSkalen(step, k, 'erweitert').filter((s) => s.stufe === 'profi');
    eq(`Erweitert: keine Profi-Skalen (${k}, ${step})`, erw.map((s) => s.id), []);
  }
  eq(`Einfach: keine Randfarben (${k})`, visibleRandFarben(k, 'einfach'), []);
  eq(`Erweitert: keine Randfarben (${k})`, visibleRandFarben(k, 'erweitert'), []);
  eq(`Einfach: nur Primäraromen (${k})`, visibleAromaStufen(k, 'einfach').map((s) => s.id), ['primaer']);
  check(`Farben für jede Kategorie (${k})`, visibleFarben(k).length > 0);
}
for (const f of ['rand', 'fehler', 'boden_tipp', 'aromen_gaumen', 'lagerpotenzial', 'eindruecke'] as TastingFeld[]) {
  check(`Einfach: Feld ${f} nicht sichtbar`, !isFieldVisible(f, 'einfach'));
}
for (const f of ['rand', 'fehler', 'boden_tipp'] as TastingFeld[]) {
  check(`Erweitert: Profi-Feld ${f} nicht sichtbar`, !isFieldVisible(f, 'erweitert'));
  check(`Profi: Feld ${f} sichtbar`, isFieldVisible(f, 'profi'));
}
check('Randfarben bei Rotwein im Profil', visibleRandFarben('rot', 'profi').length > 0);
check('Balance nur im Profil', !skalenIds('schmecken', 'weiss', 'erweitert').includes('balance') && skalenIds('schmecken', 'weiss', 'profi').includes('balance'));
eq('Fehlnoten nur bei auffälliger Nase', visibleFehler('profi', 'sauber'), []);
check('Fehlnoten im Profil bei auffälliger Nase', visibleFehler('profi', 'auffaellig').length > 0);
eq('Keine Fehlnoten unter Profi', visibleFehler('erweitert', 'auffaellig'), []);
check('Tertiäraromen ab Erweitert', visibleAromaStufen('rot', 'erweitert').some((s) => s.id === 'tertiaer'));
check('Aromen am Gaumen erst ab Erweitert', !isFieldVisible('aromen_gaumen', 'einfach') && isFieldVisible('aromen_gaumen', 'erweitert'));
// Reihenfolge der Schmecken-Skalen wie im Bogen
eq('Reihenfolge Schmecken (Rot, Profi)', skalenIds('schmecken', 'rot', 'profi'), ['suesse', 'saeure', 'tannin', 'koerper', 'alkohol', 'abgang', 'balance']);
eq('Reihenfolge Schmecken (Weiß, Einfach)', skalenIds('schmecken', 'weiss', 'einfach'), ['suesse', 'saeure', 'koerper']);

// Schritte: Terroir entfällt bei Einfach
eq('Schritte Einfach ohne Terroir', visibleSteps('einfach'), ['sehen', 'riechen', 'schmecken', 'fazit']);
eq('Schritte Erweitert', visibleSteps('erweitert'), ['sehen', 'riechen', 'schmecken', 'terroir', 'fazit']);
eq('Schritte Profi', visibleSteps('profi'), ['sehen', 'riechen', 'schmecken', 'terroir', 'fazit']);
eq('Einfach: Terroir hat keine Felder', visibleFields('terroir', 'einfach'), []);
eq('Einfach: Terroir hat keine Skalen', stepSkalen('terroir', 'rot', 'einfach'), []);
eq('Einfach: nach Schmecken kommt Fazit', nextStep('schmecken', 'einfach'), 'fazit');
eq('Erweitert: nach Schmecken kommt Terroir', nextStep('schmecken', 'erweitert'), 'terroir');
eq('Einfach: vor Fazit kommt Schmecken', previousStep('fazit', 'einfach'), 'schmecken');
eq('Nach Fazit kommt nichts', nextStep('fazit', 'profi'), null);
eq('Vor Sehen kommt nichts', previousStep('sehen', 'profi'), null);
eq('resumeStep: Terroir bei Einfach wird zu Sehen', resumeStep('terroir', 'einfach'), 'sehen');
eq('resumeStep: gespeicherter Schritt', resumeStep('schmecken', 'profi'), 'schmecken');
eq('resumeStep: ohne Schritt', resumeStep(undefined, 'erweitert'), 'sehen');

// Ausgefüllte Schritte und Bereinigung nach Sichtbarkeit
const BOGEN_ROT: TastingData = {
  sehen: { klarheit: 'klar', farbe: 'rot_rubinrot', rand: 'rand_purpur', viskositaet: 3 },
  riechen: { zustand: 'sauber', fehler: ['korkton'], aromen: { primaer: ['sauerkirsche'], sekundaer: [], tertiaer: ['leder'] } },
  schmecken: { suesse: 1, saeure: 4, tannin: 4, koerper: 3, alkohol: 3, abgang: 4, balance: 4, aromen_gaumen: ['sauerkirsche'] },
  terroir: { eindruecke: ['erdig'], boden_tipp: 'schiefer', klima_eindruck: 'warm' },
  fazit: { qualitaet: 4, trinkreife: 'trinkbar', lagerpotenzial: 'mittel', notiz: 'Schön' },
};
const ohneFehler = AROMEN.fehler.aromen.some((a) => a.id === 'korkton');
check('Testdaten: Fehlnote korkton existiert', ohneFehler);
check('Testdaten: Bogen gültig', isValidTastingData(BOGEN_ROT));
const prunedEinfach = pruneTastingData(BOGEN_ROT, 'rot', 'einfach');
eq('prune Einfach: kein Terroir', prunedEinfach.terroir, undefined);
eq('prune Einfach: kein Rand, keine Viskosität', prunedEinfach.sehen, { klarheit: 'klar', farbe: 'rot_rubinrot' });
eq('prune Einfach: nur Süße, Säure, Körper', prunedEinfach.schmecken, { suesse: 1, saeure: 4, koerper: 3 });
eq('prune Einfach: keine Fehlnoten, keine Tertiäraromen', prunedEinfach.riechen, { zustand: 'sauber', aromen: { primaer: ['sauerkirsche'], sekundaer: [], tertiaer: [] } });
eq('prune Einfach: Fazit ohne Qualität und Lagerpotenzial', prunedEinfach.fazit, { trinkreife: 'trinkbar', notiz: 'Schön' });
const prunedProfi = pruneTastingData(BOGEN_ROT, 'rot', 'profi');
eq('prune Profi: Fehlnoten fallen bei sauberer Nase weg', prunedProfi.riechen?.fehler, undefined);
eq('prune Profi: Terroir bleibt', prunedProfi.terroir, BOGEN_ROT.terroir);
eq('prune Profi: Tannin bleibt bei Rot', prunedProfi.schmecken?.tannin, 4);
eq('prune Weißwein: kein Tannin, keine Rotweinfarbe', [pruneTastingData(BOGEN_ROT, 'weiss', 'profi').schmecken?.tannin, pruneTastingData(BOGEN_ROT, 'weiss', 'profi').sehen?.farbe], [undefined, undefined]);
eq('prune: auffällige Nase behält Fehlnoten im Profil', pruneTastingData({ riechen: { zustand: 'auffaellig', fehler: ['korkton'] } }, 'rot', 'profi').riechen?.fehler, ['korkton']);
eq('filledSteps Einfach', filledSteps(BOGEN_ROT, 'rot', 'einfach'), ['sehen', 'riechen', 'schmecken', 'fazit']);
eq('filledSteps Profi', filledSteps(BOGEN_ROT, 'rot', 'profi'), ['sehen', 'riechen', 'schmecken', 'terroir', 'fazit']);
check('isStepFilled: Terroir bei Einfach nie', !isStepFilled('terroir', BOGEN_ROT, 'rot', 'einfach'));
check('isStepFilled: nur unsichtbare Werte zählen nicht', !isStepFilled('sehen', { sehen: { viskositaet: 3 } }, 'rot', 'einfach'));
check('isStepFilled: leere Aromenlisten zählen nicht', !isStepFilled('riechen', { riechen: { aromen: { primaer: [], sekundaer: [], tertiaer: [] } } }, 'rot', 'profi'));

// Leere Daten
eq('leer: filledSteps', filledSteps({}, 'rot', 'profi'), []);
eq('leer: filledSteps null', filledSteps(null, 'rot', 'profi'), []);
check('leer: hasAnyInput {}', !hasAnyInput({}));
check('leer: hasAnyInput null', !hasAnyInput(null));
check('leer: hasAnyInput leere Abschnitte', !hasAnyInput({ sehen: {}, fazit: { notiz: '   ' } }));
check('hasAnyInput: ein Wert', hasAnyInput({ fazit: { trinkreife: 'optimal' } }));
eq('leer: pruneTastingData', pruneTastingData({}, 'rot', 'einfach'), {});
eq('leer: pruneTastingData null', pruneTastingData(null, 'unbekannt', 'profi'), {});
eq('leer: profileRows', profileRows({}, 'rot'), []);
eq('leer: summarySentence', summarySentence({}, 'rot'), 'Ohne Angaben');
eq('leer: selectedAromaIds', selectedAromaIds(undefined), []);
eq('leer: aromaPreview', aromaPreview([]), { labels: [], rest: 0 });
eq('leer: groupTastingsByRef', groupTastingsByRef([]).size, 0);
eq('leer: groupTastingsByRef null', groupTastingsByRef(null).size, 0);
eq('leer: latestTasting', latestTasting([]), null);
eq('leer: tastingCountLabel 0', tastingCountLabel(0), '');

// ── Teil B: Zusammenfassung und Profil ────────────────────────────────────────

eq('profileRows Rot: Reihenfolge mit Tannin', profileRows(BOGEN_ROT, 'rot').map((r) => [r.id, r.value]), [
  ['suesse', 1], ['saeure', 4], ['tannin', 4], ['koerper', 3], ['alkohol', 3], ['abgang', 4],
]);
check('profileRows Weiß: kein Tannin, auch wenn ein Wert da wäre', !profileRows(BOGEN_ROT, 'weiss').some((r) => r.id === 'tannin'));
eq('profileRows: Ankertext', profileRows({ schmecken: { saeure: 5 } }, 'weiss')[0]?.anker, 'sehr frisch und spitz');
eq('summarySentence: erste drei Werte', summarySentence({ schmecken: { saeure: 4, koerper: 3 } }, 'weiss'), 'Säure 4, Körper 3');
eq('summarySentence: nur Aromen', summarySentence({ riechen: { aromen: { primaer: ['sauerkirsche', 'zitrone'], sekundaer: [], tertiaer: [] } } }, 'rot'), '2 Aromen notiert');
eq('summarySentence: nur Fazit', summarySentence({ fazit: { trinkreife: 'optimal' } }, 'rot'), 'Eindrücke notiert');
eq('selectedAromaIds: Nase und Gaumen ohne Doppelte', selectedAromaIds(BOGEN_ROT), ['sauerkirsche', 'leder']);
const vieleAromen = AROMEN.stufen[0].familien.flatMap((f) => f.aromen.map((a) => a.id)).slice(0, 9);
const preview = aromaPreview(vieleAromen);
eq('aromaPreview: sechs Bezeichnungen', preview.labels.length, 6);
eq('aromaPreview: Rest', preview.rest, 3);
eq('restLabel', restLabel(3), '+ 3 weitere');
eq('restLabel 0', restLabel(0), '');
eq('toggleId: hinzufügen', toggleId(['a'], 'b'), ['a', 'b']);
eq('toggleId: entfernen', toggleId(['a', 'b'], 'a'), ['b']);
eq('toggleId: leer', toggleId(undefined, 'a'), ['a']);
eq('tastingCountLabel 1', tastingCountLabel(1), '1 Verkostung');
eq('tastingCountLabel 3', tastingCountLabel(3), '3 Verkostungen');
eq('formatTastingDate', formatTastingDate('2026-11-11T12:00:00Z'), '11.11.2026');
eq('formatTastingDate ungültig', formatTastingDate('kaputt'), '');
eq('levelLabel', TASTING_LEVELS.map(levelLabel), ['Einfach', 'Erweitert', 'Profi']);
for (const l of ALLE_STUFEN) check(`LEVEL_BESCHREIBUNG vorhanden (${l})`, LEVEL_BESCHREIBUNG[l].length > 0);
for (const t of TRINKREIFE_WERTE) check(`TRINKREIFE_LABELS vorhanden (${t})`, !!TRINKREIFE_LABELS[t]);
for (const t of LAGERPOTENZIAL_WERTE) check(`LAGERPOTENZIAL_LABELS vorhanden (${t})`, !!LAGERPOTENZIAL_LABELS[t]);
check('kategorieHatSkala: Tannin bei Orange', kategorieHatSkala('orange', 'tannin'));
check('kategorieHatSkala: kein Tannin bei Rosé', !kategorieHatSkala('rose', 'tannin'));

// ── Teil B: Gruppierung und Sortierung ────────────────────────────────────────

function note(id: string, ref: WineRef, tastedAt: string, createdAt = tastedAt): TastingNote {
  return {
    id, userId: 'u', ref,
    wineId: ref.kind === 'market' ? ref.id : null,
    customWineId: ref.kind === 'custom' ? ref.id : null,
    purchasedWineId: null, tastedAt, level: 'einfach', focus: null, lessonId: null, blind: false,
    schemaVersion: 1, data: {}, createdAt, updatedAt: createdAt,
  };
}
const N1 = note('n1', REF_C, '2026-11-01T10:00:00Z');
const N2 = note('n2', REF_C, '2026-11-05T10:00:00Z');
const N3 = note('n3', REF_M, '2026-11-03T10:00:00Z');
const N4 = note('n4', REF_C, '2026-11-05T10:00:00Z', '2026-11-05T11:00:00Z');
const gruppen = groupTastingsByRef([N1, N3, N2, N4]);
eq('Gruppierung: zwei Weine', gruppen.size, 2);
eq('Gruppierung: eigener Wein neueste zuerst (Gleichstand nach Anlage)', tastingsFor(gruppen, REF_C).map((n) => n.id), ['n4', 'n2', 'n1']);
eq('Gruppierung: Marktplatzwein', tastingsFor(gruppen, REF_M).map((n) => n.id), ['n3']);
eq('Gruppierung: Wein ohne Verkostung', tastingsFor(gruppen, customRef('00000000-0000-4000-8000-000000000999')), []);
check('Gruppierung: gleiche ID in anderer Art getrennt', tastingsFor(gruppen, { kind: 'market', id: CUSTOM }).length === 0);
eq('latestTasting', latestTasting([N1, N3, N2])?.id, 'n2');
eq('sortTastingsDesc ändert die Eingabe nicht', [N1, N2].map((n) => n.id), ['n1', 'n2']);
eq('sortTastingsDesc', sortTastingsDesc([N1, N3, N2]).map((n) => n.id), ['n2', 'n3', 'n1']);
eq('sortTastingsDesc: gleiche Zeiten stabil nach ID', sortTastingsDesc([note('a', REF_M, '2026-01-01T00:00:00Z'), note('b', REF_M, '2026-01-01T00:00:00Z')]).map((n) => n.id), ['b', 'a']);

// ── Teil B: Bodenvergleich ────────────────────────────────────────────────────

eq('Boden: gleich', compareBoden('schiefer', 'schiefer'), { art: 'gleich', eintrag: 'Schiefer' });
eq('Boden: gleich Text', bodenVergleichText(compareBoden('schiefer', 'schiefer')), 'Dein Tipp stimmt mit dem Eintrag überein.');
eq('Boden: verschieden', compareBoden('kalkstein', 'schiefer'), { art: 'verschieden', eintrag: 'Schiefer', tipp: 'Kalkstein' });
eq('Boden: verschieden Text', bodenVergleichText(compareBoden('kalkstein', 'schiefer')), 'Im Eintrag dieses Weins steht: Schiefer. Dein Tipp: Kalkstein.');
eq('Boden: kein Tipp', compareBoden(null, 'schiefer'), { art: 'kein_tipp' });
eq('Boden: leerer Tipp', compareBoden('', 'schiefer'), { art: 'kein_tipp' });
eq('Boden: unbekannter Tipp', compareBoden('mondstaub', 'schiefer'), { art: 'kein_tipp' });
eq('Boden: kein Eintrag', compareBoden('schiefer', null), { art: 'kein_eintrag' });
eq('Boden: Eintrag weiß nicht', compareBoden('schiefer', 'weiss_nicht'), { art: 'kein_eintrag' });
eq('Boden: unbekannter Eintrag', compareBoden('schiefer', 'mondstaub'), { art: 'kein_eintrag' });
eq('Boden: beides fehlt', compareBoden(undefined, undefined), { art: 'kein_tipp' });
eq('Boden: Tipp weiß nicht', bodenVergleichText(compareBoden('weiss_nicht', 'kies')), 'Im Eintrag dieses Weins steht: Kies.');
eq('Boden: kein Text ohne Eintrag', bodenVergleichText(compareBoden('schiefer', null)), null);
eq('Boden: kein Text ohne Tipp', bodenVergleichText(compareBoden(null, 'schiefer')), null);
eq('bodenLabel', bodenLabel('vulkangestein'), 'Basalt/Vulkangestein');
// Vorsichtige Formulierungen: nie „verursacht“ oder „macht den Geschmack“
const terroirTexte = [BODEN_HINWEIS, TERROIR.hinweis, ...TERROIR.boeden.optionen.map((o) => o.verbunden_mit ?? '')].join(' ').toLowerCase();
for (const verboten of ['verursacht', 'sorgt für', 'führt zu', 'bewirkt']) {
  check(`Terroir-Texte ohne „${verboten}“`, !terroirTexte.includes(verboten));
}

// ── Teil B: Assistent (Parameter, Verfügbarkeit, Stufe, Sterne) ───────────────

eq('Verfügbarkeit: angemeldet und gespeichert', tastingAvailability({ signedIn: true, persisted: true, ref: REF_C }), 'ok');
eq('Verfügbarkeit: abgemeldet', tastingAvailability({ signedIn: false, persisted: true, ref: REF_C }), 'anmelden');
eq('Verfügbarkeit: nur vorübergehend', tastingAvailability({ signedIn: true, persisted: false, ref: REF_C }), 'voruebergehend');
eq('Verfügbarkeit: lokale ID', tastingAvailability({ signedIn: true, persisted: true, ref: { kind: 'market', id: 'w1' } }), 'voruebergehend');
eq('Hinweis anmelden', availabilityHint('anmelden'), 'Melde dich an, um zu verkosten.');
eq('Hinweis ok', availabilityHint('ok'), null);
eq('Parameter: vollständig', parseTastingParams({ kind: 'custom', id: CUSTOM, level: 'profi', focus: 'riechen', lesson: 'l03' }), {
  ref: REF_C, level: 'profi', focus: 'riechen', lessonId: 'l03',
});
eq('Parameter: ohne Art ist Marktplatz', parseTastingParams({ id: WINE }).ref, REF_M);
eq('Parameter: unbekannte Werte verworfen', parseTastingParams({ kind: 'custom', id: CUSTOM, level: 'meister', focus: 'hoeren', lesson: 'l999' }, (id) => id === 'l03'), {
  ref: REF_C, level: null, focus: null, lessonId: null,
});
eq('Parameter: falsche Art', parseTastingParams({ kind: 'shop', id: WINE }).ref, null);
eq('Parameter: Liste', parseTastingParams({ kind: ['custom'], id: [CUSTOM] }).ref, REF_C);
eq('Parameter: leer', parseTastingParams({}), { ref: null, level: null, focus: null, lessonId: null });
eq('tastingLevelKey', tastingLevelKey('u1'), 'tasting_level_v1:u1');
eq('parseStoredLevel: gültig', parseStoredLevel('erweitert'), 'erweitert');
eq('parseStoredLevel: ungültig', parseStoredLevel('meister'), null);
eq('parseStoredLevel: null', parseStoredLevel(null), null);
eq('initialLevel: Route vor Speicher', initialLevel('profi', 'einfach'), 'profi');
eq('initialLevel: Speicher', initialLevel(null, 'erweitert'), 'erweitert');
eq('initialLevel: Standard', initialLevel(null, null), 'einfach');
eq('kategorieForEntry: eigener Orangewein', kategorieForEntry({ wine: { type: 'Weißwein' }, custom: { weinart: 'Orange Wine', jahrgang: null } }), 'orange');
eq('kategorieForEntry: eigener Wein ohne Weinart', kategorieForEntry({ wine: { type: 'Rotwein' }, custom: { weinart: null, jahrgang: null } }), 'rot');
eq('kategorieForEntry: Marktplatz Roséwein', kategorieForEntry({ wine: { type: 'Roséwein' } }), 'rose');
eq('kategorieForEntry: Marktplatz Schaumwein', kategorieForEntry({ wine: { type: 'Schaumwein' } }), 'schaum');
eq('kategorieForEntry: leer', kategorieForEntry(null), 'unbekannt');
eq('wineInfoLine: Marktplatz', wineInfoLine({ wine: { type: 'Rotwein', vintage: 2019 } }), 'Rotwein · 2019');
eq('wineInfoLine: eigener Wein ohne Jahrgang', wineInfoLine({ wine: { type: 'Rotwein', vintage: 0 }, custom: { weinart: 'Rotwein', jahrgang: null } }), 'Rotwein');
eq('wineInfoLine: eigener Wein NV', wineInfoLine({ wine: { type: 'Schaumwein', vintage: 0 }, custom: { weinart: 'Schaumwein', jahrgang: 'NV' } }), 'Schaumwein · NV');
eq('ratingToSave: unverändert', ratingToSave(4, 4), null);
eq('ratingToSave: geändert', ratingToSave(3, 5), 5);
eq('ratingToSave: neu', ratingToSave(undefined, 2), 2);
eq('ratingToSave: keine Wahl', ratingToSave(3, null), null);
eq('ratingToSave: ungültig', ratingToSave(3, 7), null);

// ── Ergebnis ──────────────────────────────────────────────────────────────────

console.log(`Verkostungs-Prüfung: ${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  throw new Error(`${failures.length} Prüfungen fehlgeschlagen`);
}
