// Prüfskript des Verkostungsbogens: Kataloge, Validierung, Entwurf, Assistent (Teil B),
// Verbindung zur Akademie (Teil C) und Blindverkostung (Teil D1).
// Ausführen mit: npm run check:tasting
import { TIERS } from '../content/academy';
import lektionenJson from '../content/tasting/lektionen.json';
import { getLektion, getTierOfLektion, lektionLabel } from '../content/academy/helpers';
import { isTierUnlocked } from '../lib/academy/unlock';
import { wines as TESTWEINE } from '../data/wines';
import {
  BLIND_HINWEIS_ZU_WENIG,
  BLIND_NAME,
  blindSteps,
  blindSummaryText,
  blindTipps,
  blindTruthFromEntry,
  BlindKandidat,
  buildBlindSaveData,
  cleanJahrgangInput,
  comparableFields,
  BLIND_ERKLAERUNG_SELBST,
  BLIND_ERKLAERUNG_ZUFALL,
  canShowHostReveal,
  ergebnisText,
  HOST_REVEAL_FRAGE,
  hostRevealInfo,
  isBlindEligible,
  isBlindTippFilled,
  katalogNamen,
  matchLand,
  matchRebsorten,
  normalizeText,
  parseBlindParam,
  pickRandomBlindWine,
  resumeWizardStep,
  scoreBlindGuess,
  searchCatalog,
  selectBlindWines,
  stepAfter,
  stepBefore,
  wizardSteps,
} from '../lib/tasting/blind';
import {
  countTastingsByLesson,
  draftLessonContext,
  GESPERRT_HINWEIS,
  hasTastingButton,
  isBlindLessonTask,
  isTastableWine,
  LESSON_TASKS,
  LessonInfo,
  lessonLinkText,
  lessonTaskFor,
  LessonTaskMap,
  lessonTastingParams,
  PICKER_HINWEIS_ANMELDEN,
  PICKER_HINWEIS_LEER,
  practiceCountLabel,
  resolveLessonLink,
  resolveLessonParams,
  selectTastableWines,
  startStepFor,
  validateLessonTasks,
  winePickerState,
} from '../lib/tasting/lessonLinks';
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
  isLandId,
  isRebsorteId,
  LAENDER,
  REBSORTEN,
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
  blindDraftPrefix,
  isDraftValid,
  newestBlindDraft,
  parseDraft,
  serializeDraft,
  TASTING_DRAFT_MAX_AGE_MS,
  TastingDraft,
  tastingDraftKey,
} from '../lib/tasting/draft';
import {
  LAGERPOTENZIAL_WERTE,
  BlindWahrheit,
  KatalogEintrag,
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
eq('Mousse und Perlage ab Stufe erweitert (Schaumwein)', ['mousse', 'perlage'].map((id) => getSkalen('schaum', 'erweitert').some((s) => s.id === id)), [true, true]);
eq('Mousse und Perlage nicht in Stufe einfach (Schaumwein)', ['mousse', 'perlage'].map((id) => getSkalen('schaum', 'einfach').some((s) => s.id === id)), [false, false]);
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
// Teil D1: Regions-Tipp höchstens 80 Zeichen (vorher 100, es gab noch keine gespeicherten Tipps).
eq('sanitize: Blind-Tipp gekürzt', sanitizeTastingData({ blind: { region_tipp: 'y'.repeat(150) } }).blind?.region_tipp?.length, 80);
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
  // Lektion 15 (Schaumwein) verweist auf die Stufe Erweitert: dort müssen beide Felder erscheinen.
  for (const l of ALLE_STUFEN) {
    const erwartet = k === 'schaum' && l !== 'einfach';
    eq(`Perlage im Schritt Sehen (${k}, ${l})`, skalenIds('sehen', k, l).includes('perlage'), erwartet);
    eq(`Mousse im Schritt Schmecken (${k}, ${l})`, skalenIds('schmecken', k, l).includes('mousse'), erwartet);
  }
}
// Pruning: Perlage und Mousse bleiben bei Schaumwein in Erweitert erhalten, in Einfach nicht.
{
  const d = { sehen: { perlage: 4 }, schmecken: { mousse: 3 } } as TastingData;
  const erw = pruneTastingData(d, 'schaum', 'erweitert') as TastingData;
  eq('Pruning Erweitert behält Perlage und Mousse (Schaumwein)', [erw.sehen?.perlage, erw.schmecken?.mousse], [4, 3]);
  const einf = pruneTastingData(d, 'schaum', 'einfach') as TastingData;
  eq('Pruning Einfach entfernt Perlage und Mousse (Schaumwein)', [einf.sehen?.perlage, einf.schmecken?.mousse], [undefined, undefined]);
  const rot = pruneTastingData(d, 'rot', 'erweitert') as TastingData;
  eq('Pruning entfernt Perlage und Mousse bei Rotwein', [rot.sehen?.perlage, rot.schmecken?.mousse], [undefined, undefined]);
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

// ── Teil C: Zuordnung Lektion → Schwerpunkt und Stufe ─────────────────────────

eq('lektionen.json ist gültig', validateLessonTasks(lektionenJson, lektionIds), []);
check('lektionen.json hat Einträge', Object.keys(LESSON_TASKS).length > 0);
for (const [id, task] of Object.entries(LESSON_TASKS)) {
  check(`lektionen.json ${id}: Lektion existiert`, lektionIds.has(id), id);
  check(`lektionen.json ${id}: Schwerpunkt gültig`, (TASTING_STEPS as readonly string[]).includes(task.focus), task.focus);
  check(`lektionen.json ${id}: Stufe gültig`, (TASTING_LEVELS as readonly string[]).includes(task.level), task.level);
  check(`lektionen.json ${id}: Hinweis ist ein Satz`, /^[^\n]{10,200}[.!?]$/.test(task.hinweis), task.hinweis);
  // Der Schwerpunkt muss in der vorgesehenen Stufe sichtbar sein, sonst öffnet der Assistent woanders.
  eq(`lektionen.json ${id}: Schwerpunkt in der Stufe sichtbar`, startStepFor(task.focus, visibleSteps(task.level)), task.focus);
  // Stufe nach Akademie-Tier: 1 → einfach, 2 → erweitert, 3 und 4 → profi (Bonus nach Inhalt).
  const tier = getTierOfLektion(id)?.tier ?? null;
  if (tier !== null) {
    const erwartet: TastingLevel = tier === 1 ? 'einfach' : tier === 2 ? 'erweitert' : 'profi';
    eq(`lektionen.json ${id}: Stufe passt zu Tier ${tier}`, task.level, erwartet);
  }
}
// Jede Lektion: Button genau dann, wenn es einen Eintrag gibt.
for (const id of lektionIds) {
  eq(`Button-Logik ${id}`, hasTastingButton(id), Object.prototype.hasOwnProperty.call(lektionenJson, id));
}
// Lektionen ohne Verkostungsbezug bekommen keinen Button.
const OHNE_VERKOSTUNG = ['l16', 'l21', 'l29', 'l38', 'l42', 'l43', 'l44', 'bonus-1', 'bonus-2'];
for (const id of OHNE_VERKOSTUNG) {
  check(`${id} existiert`, lektionIds.has(id));
  eq(`${id}: kein Button`, hasTastingButton(id), false);
  eq(`${id}: kein Eintrag`, lessonTaskFor(id), null);
}
eq('Button: unbekannte Lektion', hasTastingButton('l999'), false);
eq('Button: kein Text', hasTastingButton(42), false);
eq('Button: geerbte Objekt-Eigenschaft', hasTastingButton('toString'), false);
eq('lessonTaskFor l03', lessonTaskFor('l03')?.focus, 'schmecken');
eq('lessonTaskFor l12', lessonTaskFor('l12')?.focus, 'terroir');
eq('lessonTaskFor l28', lessonTaskFor('l28'), { ...LESSON_TASKS.l28 });

const IDS = new Set(['l01', 'l02']);
eq('validateLessonTasks: kein Objekt', validateLessonTasks([], IDS), ['Die Zuordnung ist kein Objekt.']);
eq('validateLessonTasks: gültig', validateLessonTasks({ l01: { focus: 'sehen', level: 'einfach', hinweis: 'Ein Satz.' } }, IDS), []);
eq(
  'validateLessonTasks: Fehler',
  validateLessonTasks({ l99: { focus: 'hoeren', level: 'meister', hinweis: '', extra: 1 }, l02: 'x' }, IDS),
  [
    'l99: unbekannte Lektions-ID',
    'l99: ungültiger Schwerpunkt hoeren',
    'l99: ungültige Stufe meister',
    'l99: Hinweis fehlt',
    'l99: unbekannte Felder extra',
    'l02: Eintrag ist kein Objekt',
  ],
);

// ── Teil C: „Mehr dazu“ ───────────────────────────────────────────────────────

// Freischalt-Logik als Parameter: ohne abgeschlossene Lektionen sind nur Tier 1 und Bonus frei.
const infoFor = (id: string): LessonInfo | undefined => {
  const l = getLektion(id);
  return l ? { id: l.id, label: lektionLabel(l), titel: l.titel } : undefined;
};
const unlockedWith = (done: Set<string>) => (id: string) => {
  const t = getTierOfLektion(id);
  return !!t && isTierUnlocked(t, done);
};
const nichts = { getLesson: infoFor, isUnlocked: unlockedWith(new Set()) };
const l03 = getLektion('l03');
const l28 = getLektion('l28');
eq('Verweis: null', resolveLessonLink(null, nichts), { kind: 'kein' });
eq('Verweis: leer', resolveLessonLink('', nichts), { kind: 'kein' });
eq('Verweis: kein Text', resolveLessonLink(3, nichts), { kind: 'kein' });
eq('Verweis: unbekannte Lektion', resolveLessonLink('l999', nichts), { kind: 'kein' });
eq('Verweis: Tier 1 frei', resolveLessonLink('l03', nichts), { kind: 'oeffnen', lesson: { id: 'l03', label: 'Lektion 3', titel: l03?.titel } });
eq('Verweis: Tier 3 gesperrt', resolveLessonLink('l28', nichts).kind, 'gesperrt');
eq('Verweis: Bonus frei', resolveLessonLink('bonus-1', nichts).kind, 'oeffnen');
const tier1und2 = new Set(
  TIERS.filter((t) => t.tier === 1 || t.tier === 2).flatMap((t) => t.lektionen.map((l) => l.id)),
);
eq('Verweis: Tier 3 nach Tier 1 und 2 frei', resolveLessonLink('l28', { getLesson: infoFor, isUnlocked: unlockedWith(tier1und2) }).kind, 'oeffnen');
eq('Verweis: Tier 4 bleibt gesperrt', resolveLessonLink('l39', { getLesson: infoFor, isUnlocked: unlockedWith(tier1und2) }).kind, 'gesperrt');
eq('Verweis: Freischaltung wird übergeben', resolveLessonLink('l03', { getLesson: infoFor, isUnlocked: () => false }).kind, 'gesperrt');
eq('Text: öffnen', lessonLinkText(resolveLessonLink('l03', nichts)), { zeile: `Mehr dazu: Lektion 3 – ${l03?.titel}`, hinweis: null });
eq('Text: gesperrt', lessonLinkText(resolveLessonLink('l28', nichts)), { zeile: `Lektion 28 – ${l28?.titel} (noch gesperrt)`, hinweis: GESPERRT_HINWEIS });
eq('Text: kein Verweis', lessonLinkText({ kind: 'kein' }), null);
eq('Text: Bonus', lessonLinkText(resolveLessonLink('bonus-2', nichts))?.zeile.startsWith('Mehr dazu: Bonus 2 – '), true);
// Jeder Katalog-Verweis lässt sich auflösen (existiert oder ist null).
for (const [name, lektion] of verweise) {
  check(`${name}: Verweis auflösbar`, lektion === null || resolveLessonLink(lektion, nichts).kind !== 'kein', lektion);
}

// ── Teil C: Weinauswahl ───────────────────────────────────────────────────────

const OTHER = '11111111-2222-4333-8444-555555555555';
const keller = [
  { id: 'a', ref: REF_M, persisted: true },
  { id: 'b', ref: { kind: 'market', id: 'w1' } as WineRef, persisted: false },
  { id: 'c', ref: REF_C, persisted: true },
  { id: 'd', ref: { kind: 'custom', id: OTHER } as WineRef, persisted: false },
  { id: 'e', ref: { kind: 'custom', id: 'lokal-1' } as WineRef, persisted: true },
];
eq('Weinauswahl: nur verkostbare', selectTastableWines(keller, true).map((e) => e.id), ['a', 'c']);
eq('Weinauswahl: ohne Anmeldung leer', selectTastableWines(keller, false), []);
eq('Weinauswahl: leerer Weinkeller', selectTastableWines([], true), []);
eq('isTastableWine: gespeichert', isTastableWine(keller[0], true), true);
eq('isTastableWine: nur vorübergehend', isTastableWine(keller[1], true), false);
eq('isTastableWine: abgemeldet', isTastableWine(keller[0], false), false);
eq('Weinauswahl-Zustand: abgemeldet', winePickerState(false, 3), 'anmelden');
eq('Weinauswahl-Zustand: leer', winePickerState(true, 0), 'leer');
eq('Weinauswahl-Zustand: Auswahl', winePickerState(true, 2), 'auswahl');
eq('Hinweis leer', PICKER_HINWEIS_LEER, 'Dafür brauchst du einen Wein in deinem Weinkeller.');
eq('Hinweis anmelden', PICKER_HINWEIS_ANMELDEN, 'Melde dich an, um zu verkosten.');
eq('Route aus der Praxisaufgabe', lessonTastingParams(REF_C, 'l03', LESSON_TASKS.l03), {
  id: CUSTOM, kind: 'custom', lesson: 'l03', focus: 'schmecken', level: 'einfach', from: 'lektion',
});
eq('Route wird vom Assistenten gelesen', parseTastingParams(lessonTastingParams(REF_M, 'l12', LESSON_TASKS.l12), (id) => lektionIds.has(id)), {
  ref: REF_M, level: 'erweitert', focus: 'terroir', lessonId: 'l12',
});

// ── Teil C: Zählung je Lektion ────────────────────────────────────────────────

eq('Zählung: leer', countTastingsByLesson([]), {});
eq(
  'Zählung: je Lektion',
  countTastingsByLesson([
    { lessonId: 'l03' }, { lessonId: 'l12' }, { lessonId: 'l03' }, { lessonId: null }, {}, { lessonId: '' },
  ]),
  { l03: 2, l12: 1 },
);
eq('Zeile: 0', practiceCountLabel(0), 'Noch nicht gemacht.');
eq('Zeile: 1', practiceCountLabel(1), 'Du hast diese Aufgabe schon 1-mal gemacht.');
eq('Zeile: 2', practiceCountLabel(2), 'Du hast diese Aufgabe schon 2-mal gemacht.');
eq('Zeile: ungültig', practiceCountLabel(Number.NaN), 'Noch nicht gemacht.');
eq('Zeile: negativ', practiceCountLabel(-3), 'Noch nicht gemacht.');

// ── Teil C: Parameter des Assistenten ─────────────────────────────────────────

const istLektion = (id: string) => lektionIds.has(id);
eq('Parameter C: vollständig', resolveLessonParams({ lesson: 'l03', focus: 'riechen', level: 'profi' }, { isLesson: istLektion }), {
  lessonId: 'l03', focus: 'riechen', level: 'profi',
});
eq('Parameter C: Rückfall auf Zuordnung', resolveLessonParams({ lesson: 'l12' }, { isLesson: istLektion }), {
  lessonId: 'l12', focus: 'terroir', level: 'erweitert',
});
eq('Parameter C: ungültige Werte → Zuordnung', resolveLessonParams({ lesson: 'l12', focus: 'hoeren', level: 'meister' }, { isLesson: istLektion }), {
  lessonId: 'l12', focus: 'terroir', level: 'erweitert',
});
eq('Parameter C: unbekannte Lektion ignoriert', resolveLessonParams({ lesson: 'l999', focus: 'sehen' }, { isLesson: istLektion }), {
  lessonId: null, focus: 'sehen', level: null,
});
eq('Parameter C: Lektion ohne Zuordnung', resolveLessonParams({ lesson: 'l16' }, { isLesson: istLektion }), {
  lessonId: 'l16', focus: null, level: null,
});
eq('Parameter C: leer', resolveLessonParams({}, { isLesson: istLektion }), { lessonId: null, focus: null, level: null });
eq('Parameter C: Listen', resolveLessonParams({ lesson: ['l03'], focus: ['fazit'] }, { isLesson: istLektion }), {
  lessonId: 'l03', focus: 'fazit', level: 'einfach',
});
eq('Parameter C: eigene Zuordnung', resolveLessonParams({ lesson: 'l01' }, { isLesson: istLektion, tasks: { l01: { focus: 'sehen', level: 'profi', hinweis: 'x.' } } as LessonTaskMap }), {
  lessonId: 'l01', focus: 'sehen', level: 'profi',
});
eq('Startschritt: Schwerpunkt', startStepFor('schmecken', visibleSteps('einfach')), 'schmecken');
eq('Startschritt: ohne Schwerpunkt', startStepFor(null, visibleSteps('einfach')), 'sehen');
eq('Startschritt: Schwerpunkt in Stufe unsichtbar', startStepFor('terroir', visibleSteps('einfach')), 'sehen');
eq('Startschritt: Terroir ab erweitert', startStepFor('terroir', visibleSteps('erweitert')), 'terroir');
eq('Startschritt: keine Schritte', startStepFor('fazit', []), 'sehen');
eq('Entwurf: Lektion bleibt', draftLessonContext({ lessonId: 'l03', focus: 'schmecken' }, istLektion), { lessonId: 'l03', focus: 'schmecken' });
eq('Entwurf: unbekannte Lektion fällt weg', draftLessonContext({ lessonId: 'l999', focus: 'hoeren' as TastingStep }, istLektion), { lessonId: null, focus: null });
eq('Entwurf: ohne Lektion', draftLessonContext({}, istLektion), { lessonId: null, focus: null });

// ── Teil D1: Kataloge für die Tipp-Auswahl ────────────────────────────────────

checkIds('Rebsorten', REBSORTEN.map((r) => r.id));
checkIds('Länder', LAENDER.map((l) => l.id));
check('Rebsorten: etwa 60 Einträge', REBSORTEN.length >= 55, REBSORTEN.length);
check('Länder: etwa 25 Einträge', LAENDER.length >= 25, LAENDER.length);
for (const r of REBSORTEN) {
  check(`Rebsorte ${r.id}: Farbe rot oder weiss`, r.farbe === 'rot' || r.farbe === 'weiss', r.farbe);
  check(`Rebsorte ${r.id}: Bezeichnung`, typeof r.label === 'string' && r.label.trim().length > 0);
  check(`Rebsorte ${r.id}: aliases ist eine Liste von Texten`, Array.isArray(r.aliases) && r.aliases.every((a) => typeof a === 'string' && a.trim().length > 0));
}
for (const l of LAENDER) {
  check(`Land ${l.id}: Bezeichnung`, typeof l.label === 'string' && l.label.trim().length > 0);
  check(`Land ${l.id}: aliases ist eine Liste von Texten`, Array.isArray(l.aliases) && l.aliases.every((a) => typeof a === 'string' && a.trim().length > 0));
}
// Keine Schreibweise (Bezeichnung oder Alias) darf bei zwei verschiedenen Einträgen vorkommen.
function aliasKollisionen(items: readonly KatalogEintrag[]): string[] {
  const owner = new Map<string, string>();
  const kollisionen: string[] = [];
  for (const e of items) {
    for (const n of katalogNamen(e)) {
      const vorher = owner.get(n);
      if (vorher && vorher !== e.id) kollisionen.push(`${n}: ${vorher} / ${e.id}`);
      else owner.set(n, e.id);
    }
  }
  return kollisionen;
}
eq('Rebsorten: Aliase eindeutig zwischen Einträgen', aliasKollisionen(REBSORTEN), []);
eq('Länder: Aliase eindeutig zwischen Einträgen', aliasKollisionen(LAENDER), []);
// Jede Rebsorte und jedes Herkunftsland aus den Testdaten wird erkannt.
for (const w of TESTWEINE) {
  for (const teil of w.grape.split(',')) {
    eq(`Testdaten ${w.id}: Rebsorte „${teil.trim()}“ erkannt`, matchRebsorten(teil).length, 1);
  }
  check(`Testdaten ${w.id}: Land „${w.country}“ erkannt`, matchLand(w.country) !== null, w.country);
}
// Paare aus der Aufgabe landen bei derselben ID.
const PAARE: [string, string[]][] = [
  ['spaetburgunder', ['Spätburgunder', 'Pinot Noir']],
  ['grauburgunder', ['Grauburgunder', 'Pinot Gris', 'Pinot Grigio']],
  ['weissburgunder', ['Weißburgunder', 'Pinot Blanc']],
  ['lemberger', ['Lemberger', 'Blaufränkisch']],
  ['trollinger', ['Trollinger', 'Vernatsch']],
  ['mueller_thurgau', ['Müller-Thurgau', 'Rivaner']],
  ['syrah', ['Syrah', 'Shiraz']],
  ['grenache', ['Grenache', 'Garnacha']],
  ['zinfandel', ['Zinfandel', 'Primitivo']],
];
for (const [id, namen] of PAARE) {
  for (const n of namen) eq(`Rebsorte „${n}“ → ${id}`, matchRebsorten(n), [id]);
}
for (const n of [
  'Silvaner', 'Riesling', 'Chardonnay', 'Sauvignon Blanc', 'Cabernet Sauvignon', 'Merlot', 'Tempranillo',
  'Sangiovese', 'Nebbiolo', 'Malbec', 'Pinotage', 'Gewürztraminer', 'Chenin Blanc', 'Grüner Veltliner',
  'Albariño', 'Glera', 'Furmint',
]) {
  eq(`Rebsorte „${n}“ erkannt`, matchRebsorten(n).length, 1);
}
for (const n of [
  'Deutschland', 'Österreich', 'Schweiz', 'Frankreich', 'Italien', 'Spanien', 'Portugal', 'Ungarn',
  'Griechenland', 'USA', 'Argentinien', 'Chile', 'Südafrika', 'Australien', 'Neuseeland',
]) {
  check(`Land „${n}“ erkannt`, matchLand(n) !== null, n);
}
eq('Land: Germany', matchLand('Germany'), 'deutschland');
eq('Land: Italia', matchLand('Italia'), 'italien');
eq('Abschnitt blind heißt im Assistenten „Tipp“', ABSCHNITTE.find((a) => a.id === 'blind')?.label, 'Tipp');

// ── Teil D1: normalizeText, matchRebsorten, matchLand, Suche ──────────────────

eq('normalize: Bindestrich und Umlaut', normalizeText('Müller-Thurgau'), 'mueller thurgau');
eq('normalize: Mittelpunkt', normalizeText('Xarel·lo'), 'xarel lo');
eq('normalize: Akzente', normalizeText('Côtes du Rhône'), 'cotes du rhone');
eq('normalize: Leerzeichen', normalizeText('  Grüner   Veltliner '), 'gruener veltliner');
eq('normalize: ß', normalizeText('Straße'), 'strasse');
eq('normalize: Großbuchstaben mit Umlaut', normalizeText('ÄÖÜ'), 'aeoeue');
eq('normalize: Emoji entfällt', normalizeText('🍷 Wein'), 'wein');
eq('normalize: leer', normalizeText(''), '');
eq('normalize: kein Text', normalizeText(42), '');
eq('normalize: null', normalizeText(null), '');

eq('Rebsorten: Cuvée-Text', matchRebsorten('Cuvée aus Merlot und Cabernet Sauvignon'), ['merlot', 'cabernet_sauvignon']);
eq('Rebsorten: Schrägstrich, Doppelte entfallen', matchRebsorten('Pinot Noir / Spätburgunder'), ['spaetburgunder']);
eq('Rebsorten: Komma', matchRebsorten('Grenache, Syrah, Mourvèdre'), ['grenache', 'syrah', 'mourvedre']);
eq('Rebsorten: Plus und Und-Zeichen', matchRebsorten('Merlot + Cabernet Franc & Petit Verdot'), ['merlot', 'cabernet_franc', 'petit_verdot']);
eq('Rebsorten: „und“', matchRebsorten('Riesling und Silvaner'), ['riesling', 'silvaner']);
eq('Rebsorten: Cabernet Sauvignon ist kein Sauvignon Blanc', matchRebsorten('Cabernet Sauvignon'), ['cabernet_sauvignon']);
eq('Rebsorten: Sauvignon Blanc', matchRebsorten('Sauvignon Blanc'), ['sauvignon_blanc']);
eq('Rebsorten: Welschriesling ist kein Riesling', matchRebsorten('Welschriesling'), ['welschriesling']);
eq('Rebsorten: Kleinschreibung', matchRebsorten('pinot grigio'), ['grauburgunder']);
eq('Rebsorten: Alias Tinta Roriz', matchRebsorten('Touriga Nacional, Tinta Roriz'), ['touriga_nacional', 'tempranillo']);
eq('Rebsorten: Mittelpunkt', matchRebsorten('Xarel·lo, Macabeo, Parellada'), ['xarello', 'macabeo', 'parellada']);
eq('Rebsorten: Unbekanntes ignoriert', matchRebsorten('Phantasietraube'), []);
eq('Rebsorten: Unbekanntes neben Bekanntem', matchRebsorten('Phantasie, Merlot'), ['merlot']);
eq('Rebsorten: Cabernet allein ist nichts', matchRebsorten('Cabernet / Sauvignon Blanc'), ['sauvignon_blanc']);
eq('Rebsorten: leerer Text', matchRebsorten(''), []);
eq('Rebsorten: null', matchRebsorten(null), []);
eq('Rebsorten: Zahl', matchRebsorten(42), []);
eq('Rebsorten: Liste', matchRebsorten(['Merlot']), []);

eq('Land: Frankreich', matchLand('Frankreich'), 'frankreich');
eq('Land: mit Region', matchLand('Österreich, Wachau'), 'oesterreich');
eq('Land: Kleinschreibung', matchLand('germany'), 'deutschland');
eq('Land: „Vin de France“ ist nicht Deutschland', matchLand('Vin de France'), 'frankreich');
eq('Land: ohne Umlaut', matchLand('Sudafrika'), 'suedafrika');
eq('Land: zweiteilig', matchLand('New Zealand'), 'neuseeland');
eq('Land: unbekannt', matchLand('Atlantis'), null);
eq('Land: leer', matchLand(''), null);
eq('Land: undefined', matchLand(undefined), null);
eq('Land: Objekt', matchLand({ x: 1 }), null);

eq('Suche: Alias Pinot Noir', searchCatalog(REBSORTEN, 'pinot noir')[0]?.id, 'spaetburgunder');
check('Suche: mitten im Namen', searchCatalog(REBSORTEN, 'grigio').some((r) => r.id === 'grauburgunder'));
eq('Suche: ohne Text die ersten Einträge', searchCatalog(LAENDER, '').map((l) => l.id), LAENDER.slice(0, 8).map((l) => l.id));
eq('Suche: Begrenzung', searchCatalog(REBSORTEN, 'a', 3).length, 3);
eq('Suche: nichts gefunden', searchCatalog(REBSORTEN, 'xyzq'), []);
eq('Suche: Land über Alias', searchCatalog(LAENDER, 'Italia')[0]?.id, 'italien');
eq('Suche: kein Text', searchCatalog(LAENDER, 42 as unknown as string, 2).length, 2);

// ── Teil D1: Eignung und Zufallsauswahl ───────────────────────────────────────

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';
const marktWein = (id: string, over: Partial<BlindKandidat['wine']> = {}): BlindKandidat => ({
  ref: marketRef(id),
  persisted: true,
  wine: { type: 'Rotwein', vintage: 2018, country: 'Frankreich', region: 'Bordeaux', grape: 'Cabernet Sauvignon, Merlot', ...over },
});
const eigenerWein = (id: string, custom: NonNullable<BlindKandidat['custom']>): BlindKandidat => ({
  ref: customRef(id),
  persisted: true,
  wine: { type: 'Rotwein', vintage: 0, country: '', region: '', grape: '' },
  custom: { weinart: null, jahrgang: null, herkunft: null, region: null, rebsorte: null, ...custom },
});
check('Eignung: Marktplatzwein mit Angaben', isBlindEligible(marktWein(U1)));
check('Eignung: lokale ID (keine UUID)', !isBlindEligible({ ...marktWein(U1), ref: marketRef('w1') }));
check('Eignung: nur vorübergehend', !isBlindEligible({ ...marktWein(U1), persisted: false }));
check('Eignung: Marktplatzwein nur mit Weinart', !isBlindEligible(marktWein(U1, { vintage: 0, country: '', region: '', grape: '' })));
check('Eignung: eigener Wein nur mit Namen', !isBlindEligible(eigenerWein(U2, {})));
check('Eignung: eigener Wein nur mit Weinart', !isBlindEligible(eigenerWein(U2, { weinart: 'Weißwein' })));
check('Eignung: Weinart und Jahrgang NV reicht nicht', !isBlindEligible(eigenerWein(U2, { weinart: 'Schaumwein', jahrgang: 'NV' })));
check('Eignung: Weinart und Jahrgang', isBlindEligible(eigenerWein(U2, { weinart: 'Weißwein', jahrgang: '2020' })));
check('Eignung: Rebsorte und Land', isBlindEligible(eigenerWein(U2, { rebsorte: 'Riesling', herkunft: 'Deutschland' })));
check('Eignung: unbekannte Rebsorte und unbekanntes Land zählen nicht', !isBlindEligible(eigenerWein(U2, { rebsorte: 'Phantasie', herkunft: 'Atlantis' })));
check('Eignung: Region und unbekanntes Land', !isBlindEligible(eigenerWein(U2, { region: 'Mosel', herkunft: 'Atlantis' })));
check('Eignung: null', !isBlindEligible(null));
check('Eignung: Unsinn', !isBlindEligible({ ref: 'x', persisted: 'ja' } as unknown as BlindKandidat));
eq('Vergleichbare Felder: Marktplatzwein', comparableFields(blindTruthFromEntry(marktWein(U1))), ['weinart', 'land', 'region', 'rebsorte', 'jahrgang']);
eq('Vergleichbare Felder: leer', comparableFields(null), []);
check('Hinweis bei zu wenigen Angaben', BLIND_HINWEIS_ZU_WENIG.includes('mindestens zwei Angaben'));
eq('Name im Blind-Modus', BLIND_NAME, 'Blindwein');

const geeignetA = marktWein(U1);
const ungeeignet = eigenerWein(U2, {});
const geeignetC = eigenerWein(U3, { rebsorte: 'Riesling', herkunft: 'Deutschland', jahrgang: '2020' });
const pool = [geeignetA, ungeeignet, geeignetC];
eq('Auswahl: nur geeignete', selectBlindWines(pool).map((w) => w.ref.id), [U1, U3]);
eq('Zufall: rng 0 → erster', pickRandomBlindWine(pool, () => 0)?.ref.id, U1);
eq('Zufall: rng 0.99 → letzter', pickRandomBlindWine(pool, () => 0.99)?.ref.id, U3);
eq('Zufall: rng 0.5 → zweiter geeigneter', pickRandomBlindWine(pool, () => 0.5)?.ref.id, U3);
eq('Zufall: rng über 1 wird begrenzt', pickRandomBlindWine(pool, () => 1.5)?.ref.id, U3);
eq('Zufall: negatives rng wird begrenzt', pickRandomBlindWine(pool, () => -1)?.ref.id, U1);
eq('Zufall: rng NaN', pickRandomBlindWine(pool, () => Number.NaN)?.ref.id, U1);
eq('Zufall: rng wirft', pickRandomBlindWine(pool, () => { throw new Error('x'); })?.ref.id, U1);
eq('Zufall: leere Liste', pickRandomBlindWine([], () => 0), null);
eq('Zufall: kein geeigneter Wein', pickRandomBlindWine([ungeeignet], () => 0), null);
eq('Zufall: null', pickRandomBlindWine(null, () => 0), null);

eq('Wahrheit: Marktplatzwein', blindTruthFromEntry(marktWein(U1)), {
  weinart: 'Rotwein', land: 'frankreich', region: 'Bordeaux', rebsorten: ['cabernet_sauvignon', 'merlot'], jahrgang: '2018',
});
eq('Wahrheit: eigener Wein nimmt custom_wines', blindTruthFromEntry(eigenerWein(U3, { weinart: 'Weißwein', rebsorte: 'Riesling', herkunft: 'Deutschland', region: 'Mosel', jahrgang: '2020' })), {
  weinart: 'Weißwein', land: 'deutschland', region: 'Mosel', rebsorten: ['riesling'], jahrgang: '2020',
});
eq('Wahrheit: eigener Wein ohne Weinart (nicht der Ersatz-Typ Rotwein)', blindTruthFromEntry(eigenerWein(U3, { jahrgang: 'NV' })), { jahrgang: 'NV' });
eq('Wahrheit: Jahrgang 0 entfällt', blindTruthFromEntry(marktWein(U1, { vintage: 0 })).jahrgang, undefined);
eq('Wahrheit: null', blindTruthFromEntry(null), {});

// ── Teil D1: Auswertung der Tipps ─────────────────────────────────────────────

const WAHR: BlindWahrheit = { weinart: 'Rotwein', land: 'frankreich', region: 'Bordeaux', rebsorten: ['cabernet_sauvignon', 'merlot'], jahrgang: '2018' };
const ergebnisse = (a: ReturnType<typeof scoreBlindGuess>) => Object.fromEntries(a.felder.map((f) => [f.feld, f.ergebnis]));
const feld = (a: ReturnType<typeof scoreBlindGuess>, f: string) => a.felder.find((x) => x.feld === f);

const alleRichtig = scoreBlindGuess(
  { weinart_tipp: 'Rotwein', land_tipp: 'frankreich', region_tipp: 'bordeaux', rebsorten_tipp: ['merlot', 'cabernet_sauvignon'], jahrgang_tipp: '2018' },
  WAHR,
);
eq('Auswertung: alles richtig', ergebnisse(alleRichtig), { weinart: 'richtig', land: 'richtig', region: 'richtig', rebsorte: 'richtig', jahrgang: 'richtig' });
eq('Auswertung: Zählung alles richtig', [alleRichtig.richtig, alleRichtig.bewertet], [5, 5]);
eq('Auswertung: Reihenfolge der Felder', alleRichtig.felder.map((f) => f.feld), ['weinart', 'land', 'region', 'rebsorte', 'jahrgang']);
eq('Auswertung: Anzeige Land', [feld(alleRichtig, 'land')?.tipp, feld(alleRichtig, 'land')?.wirklich], ['Frankreich', 'Frankreich']);
eq('Auswertung: Anzeige Rebsorten', feld(alleRichtig, 'rebsorte')?.wirklich, 'Cabernet Sauvignon, Merlot');

const nichtsGetippt = scoreBlindGuess({}, WAHR);
eq('Auswertung: nichts getippt', ergebnisse(nichtsGetippt), { weinart: 'nicht_getippt', land: 'nicht_getippt', region: 'nicht_getippt', rebsorte: 'nicht_getippt', jahrgang: 'nicht_getippt' });
eq('Auswertung: nichts getippt, Zählung', [nichtsGetippt.richtig, nichtsGetippt.bewertet], [0, 0]);
const ohneDaten = scoreBlindGuess({ weinart_tipp: 'Rotwein', land_tipp: 'italien', region_tipp: 'Toskana', rebsorten_tipp: ['sangiovese'], jahrgang_tipp: '2019' }, {});
eq('Auswertung: Wein ohne Angaben', ergebnisse(ohneDaten), { weinart: 'nicht_bewertbar', land: 'nicht_bewertbar', region: 'nicht_bewertbar', rebsorte: 'nicht_bewertbar', jahrgang: 'nicht_bewertbar' });
eq('Auswertung: nicht bewertbar zählt nicht', ohneDaten.bewertet, 0);

// Weinart
eq('Weinart: falsch', feld(scoreBlindGuess({ weinart_tipp: 'Weißwein' }, WAHR), 'weinart')?.ergebnis, 'falsch');
eq('Weinart: gleiche Kategorie (Rosé / Roséwein)', feld(scoreBlindGuess({ weinart_tipp: 'Rosé' }, { weinart: 'Roséwein' }), 'weinart')?.ergebnis, 'richtig');
eq('Weinart: Dessert- und Likörwein / Süßwein', feld(scoreBlindGuess({ weinart_tipp: 'Dessert- und Likörwein' }, { weinart: 'Süßwein' }), 'weinart')?.ergebnis, 'richtig');
eq('Weinart: unbekannte Weinart beim Wein', feld(scoreBlindGuess({ weinart_tipp: 'Rotwein' }, { weinart: 'Hauswein' }), 'weinart')?.ergebnis, 'nicht_bewertbar');
eq('Weinart: ungültiger Tipp gilt als nicht getippt', feld(scoreBlindGuess({ weinart_tipp: 'Bier' }, WAHR), 'weinart')?.ergebnis, 'nicht_getippt');
// Land
eq('Land: falsch', feld(scoreBlindGuess({ land_tipp: 'italien' }, WAHR), 'land')?.ergebnis, 'falsch');
eq('Land: unbekannte ID gilt als nicht getippt', feld(scoreBlindGuess({ land_tipp: 'atlantis' }, WAHR), 'land')?.ergebnis, 'nicht_getippt');
eq('Land: Wein ohne Land', feld(scoreBlindGuess({ land_tipp: 'italien' }, { region: 'x' }), 'land')?.ergebnis, 'nicht_bewertbar');
// Region
eq('Region: enthält den anderen', feld(scoreBlindGuess({ region_tipp: 'Bordeaux Supérieur' }, WAHR), 'region')?.ergebnis, 'richtig');
eq('Region: Tipp in der Angabe enthalten', feld(scoreBlindGuess({ region_tipp: 'Mosel' }, { region: 'Mosel-Saar-Ruwer' }), 'region')?.ergebnis, 'richtig');
eq('Region: Akzente und Großschreibung', feld(scoreBlindGuess({ region_tipp: 'PENEDES' }, { region: 'Penedès' }), 'region')?.ergebnis, 'richtig');
eq('Region: falsch', feld(scoreBlindGuess({ region_tipp: 'Burgund' }, WAHR), 'region')?.ergebnis, 'falsch');
eq('Region: Wortteil zählt nicht', feld(scoreBlindGuess({ region_tipp: 'Bor' }, WAHR), 'region')?.ergebnis, 'falsch');
eq('Region: ein Zeichen zählt nicht', feld(scoreBlindGuess({ region_tipp: 'a' }, { region: 'A Coruña' }), 'region')?.ergebnis, 'falsch');
eq('Region: nur Leerzeichen gilt als nicht getippt', feld(scoreBlindGuess({ region_tipp: '   ' }, WAHR), 'region')?.ergebnis, 'nicht_getippt');
eq('Region: Wein ohne Region', feld(scoreBlindGuess({ region_tipp: 'Bordeaux' }, { land: 'frankreich' }), 'region')?.ergebnis, 'nicht_bewertbar');
// Rebsorte
eq('Rebsorte: Teilmenge = knapp', feld(scoreBlindGuess({ rebsorten_tipp: ['merlot'] }, WAHR), 'rebsorte')?.ergebnis, 'knapp');
eq('Rebsorte: Überschneidung mit falscher = knapp', feld(scoreBlindGuess({ rebsorten_tipp: ['merlot', 'syrah'] }, WAHR), 'rebsorte')?.ergebnis, 'knapp');
eq('Rebsorte: einzelne Rebsorte richtig', feld(scoreBlindGuess({ rebsorten_tipp: ['riesling'] }, { rebsorten: ['riesling'] }), 'rebsorte')?.ergebnis, 'richtig');
eq('Rebsorte: Obermenge = knapp', feld(scoreBlindGuess({ rebsorten_tipp: ['riesling', 'silvaner'] }, { rebsorten: ['riesling'] }), 'rebsorte')?.ergebnis, 'knapp');
eq('Rebsorte: falsch', feld(scoreBlindGuess({ rebsorten_tipp: ['riesling'] }, WAHR), 'rebsorte')?.ergebnis, 'falsch');
eq('Rebsorte: unbekannte IDs gelten als nicht getippt', feld(scoreBlindGuess({ rebsorten_tipp: ['phantasie'] }, WAHR), 'rebsorte')?.ergebnis, 'nicht_getippt');
eq('Rebsorte: Wein ohne erkannte Rebsorte', feld(scoreBlindGuess({ rebsorten_tipp: ['merlot'] }, { rebsorten: [] }), 'rebsorte')?.ergebnis, 'nicht_bewertbar');
// Jahrgang
const j2017 = feld(scoreBlindGuess({ jahrgang_tipp: '2017' }, WAHR), 'jahrgang');
eq('Jahrgang: ein Jahr = knapp', [j2017?.ergebnis, j2017?.differenzJahre], ['knapp', 1]);
const j2015 = feld(scoreBlindGuess({ jahrgang_tipp: '2015' }, WAHR), 'jahrgang');
eq('Jahrgang: drei Jahre = falsch mit Differenz', [j2015?.ergebnis, j2015?.differenzJahre], ['falsch', 3]);
eq('Jahrgang: ein Jahr später = knapp', feld(scoreBlindGuess({ jahrgang_tipp: '2019' }, WAHR), 'jahrgang')?.ergebnis, 'knapp');
const jNV = feld(scoreBlindGuess({ jahrgang_tipp: '2018' }, { jahrgang: 'NV' }), 'jahrgang');
eq('Jahrgang: NV = nicht bewertbar, Anzeige bleibt', [jNV?.ergebnis, jNV?.wirklich], ['nicht_bewertbar', 'NV']);
eq('Jahrgang: zweistelliger Tipp gilt als nicht getippt', feld(scoreBlindGuess({ jahrgang_tipp: '18' }, WAHR), 'jahrgang')?.ergebnis, 'nicht_getippt');
eq('Jahrgang: richtig hat keine Differenz', feld(alleRichtig, 'jahrgang')?.differenzJahre, undefined);

// Zusammenfassung und Texte
const gemischt = scoreBlindGuess({ weinart_tipp: 'Rotwein', land_tipp: 'frankreich', region_tipp: 'Bordeaux', jahrgang_tipp: '2015' }, WAHR);
eq('Zusammenfassung: 3 von 4', [gemischt.richtig, gemischt.bewertet], [3, 4]);
eq('Zusammenfassung: Text', blindSummaryText(gemischt), '3 von 4 getippten Feldern richtig.');
eq('Zusammenfassung: Einzahl', blindSummaryText({ richtig: 1, bewertet: 1 }), '1 von 1 getippten Feld richtig.');
eq('Zusammenfassung: knapp zählt nicht als richtig', blindSummaryText(scoreBlindGuess({ jahrgang_tipp: '2017' }, WAHR)), '0 von 1 getippten Feld richtig.');
eq('Zusammenfassung: nichts bewertbar', blindSummaryText(nichtsGetippt), 'Kein bewertbares Feld getippt.');
eq('Text: Jahrgang daneben', ergebnisText({ ergebnis: 'falsch', differenzJahre: 2 }), '2 Jahre daneben');
eq('Text: Jahrgang knapp', ergebnisText({ ergebnis: 'knapp', differenzJahre: 1 }), 'Knapp daneben (1 Jahr)');
eq('Text: Rebsorte knapp', ergebnisText({ ergebnis: 'knapp' }), 'Knapp daneben');
eq('Text: daneben', ergebnisText({ ergebnis: 'falsch' }), 'Daneben');
eq('Text: richtig', ergebnisText({ ergebnis: 'richtig' }), 'Richtig');
eq('Text: nicht getippt', ergebnisText({ ergebnis: 'nicht_getippt' }), 'Nicht getippt');
eq('Text: nicht bewertbar', ergebnisText({ ergebnis: 'nicht_bewertbar' }), 'Nicht bewertbar');
// Robust gegen Unsinn
eq('Auswertung: null', scoreBlindGuess(null, null).felder.map((f) => f.ergebnis), ['nicht_bewertbar', 'nicht_bewertbar', 'nicht_bewertbar', 'nicht_bewertbar', 'nicht_bewertbar']);
let wirft = false;
try {
  scoreBlindGuess(42 as unknown as object, 'x' as unknown as BlindWahrheit);
  scoreBlindGuess({ rebsorten_tipp: 'merlot' as unknown as string[], jahrgang_tipp: 2018 as unknown as string }, { rebsorten: 'merlot' as unknown as string[] });
} catch {
  wirft = true;
}
check('Auswertung: wirft nie', !wirft);

// ── Teil D1: Datenmodell data.blind ───────────────────────────────────────────

const blindVoll: TastingData = {
  // Reihenfolge wie nach der Bereinigung, damit der Vergleich als Text klappt.
  blind: {
    region_tipp: 'Bordeaux',
    jahrgang_tipp: '2018',
    weinart_tipp: 'Rotwein',
    land_tipp: 'frankreich',
    rebsorten_tipp: ['merlot', 'cabernet_sauvignon'],
    wahrheit: WAHR,
  },
};
check('Blind: vollständig gültig', isValidTastingData(blindVoll));
check('Blind: alte Felder ohne die neuen bleiben gültig', isValidTastingData({ blind: { rebsorte_tipp: 'Merlot', region_tipp: 'Bordeaux', jahrgang_tipp: '2018' } }));
check('Blind: leeres Objekt gültig', isValidTastingData({ blind: {} }));
check('Blind: Wahrheit mit NV gültig', isValidTastingData({ blind: { wahrheit: { jahrgang: 'NV' } } }));
check('Blind: Region genau 80 Zeichen', isValidTastingData({ blind: { region_tipp: 'r'.repeat(80) } }));
const blindKaputt: [string, unknown][] = [
  ['Region 81 Zeichen', { blind: { region_tipp: 'r'.repeat(81) } }],
  ['4 Rebsorten', { blind: { rebsorten_tipp: ['merlot', 'syrah', 'riesling', 'malbec'] } }],
  ['unbekannte Rebsorte', { blind: { rebsorten_tipp: ['phantasie'] } }],
  ['Rebsorten als Text', { blind: { rebsorten_tipp: 'merlot' } }],
  ['unbekanntes Land', { blind: { land_tipp: 'atlantis' } }],
  ['Land als Bezeichnung statt ID', { blind: { land_tipp: 'Frankreich' } }],
  ['unbekannte Weinart', { blind: { weinart_tipp: 'Bier' } }],
  ['Jahrgang zweistellig', { blind: { jahrgang_tipp: '18' } }],
  ['Jahrgang NV als Tipp', { blind: { jahrgang_tipp: 'NV' } }],
  ['Jahrgang als Zahl', { blind: { jahrgang_tipp: 2018 } }],
  ['Jahrgang 3018', { blind: { jahrgang_tipp: '3018' } }],
  ['Wahrheit kein Objekt', { blind: { wahrheit: 'Bordeaux' } }],
  ['Wahrheit unbekanntes Land', { blind: { wahrheit: { land: 'atlantis' } } }],
  ['Wahrheit unbekannte Rebsorte', { blind: { wahrheit: { rebsorten: ['phantasie'] } } }],
  ['Wahrheit Region zu lang', { blind: { wahrheit: { region: 'r'.repeat(81) } } }],
  ['Blind ist eine Liste', { blind: [] }],
];
for (const [name, d] of blindKaputt) check(`Blind ungültig: ${name}`, !isValidTastingData(d), d);

eq('Blind sanitize: höchstens 3 Rebsorten', sanitizeTastingData({ blind: { rebsorten_tipp: ['merlot', 'syrah', 'riesling', 'malbec'] } }).blind?.rebsorten_tipp, ['merlot', 'syrah', 'riesling']);
eq('Blind sanitize: unbekannte und doppelte IDs entfernt', sanitizeTastingData({ blind: { rebsorten_tipp: ['phantasie', 'merlot', 'merlot', 42] } }).blind?.rebsorten_tipp, ['merlot']);
eq('Blind sanitize: nur unbekannte Rebsorten → Feld entfällt', sanitizeTastingData({ blind: { rebsorten_tipp: ['phantasie'] } }), {});
eq('Blind sanitize: Region auf 80 gekürzt', sanitizeTastingData({ blind: { region_tipp: 'r'.repeat(81) } }).blind?.region_tipp?.length, 80);
eq('Blind sanitize: Jahrgang getrimmt', sanitizeTastingData({ blind: { jahrgang_tipp: ' 2018 ' } }).blind?.jahrgang_tipp, '2018');
eq('Blind sanitize: Jahrgang NV entfällt', sanitizeTastingData({ blind: { jahrgang_tipp: 'NV' } }), {});
eq('Blind sanitize: unbekannte Weinart entfällt', sanitizeTastingData({ blind: { weinart_tipp: 'Bier', land_tipp: 'atlantis' } }), {});
eq('Blind sanitize: Wahrheit bereinigt', sanitizeTastingData({ blind: { wahrheit: { land: 'atlantis', rebsorten: ['phantasie', 'riesling'], jahrgang: ' NV ', extra: 1 } } }).blind?.wahrheit, {
  rebsorten: ['riesling'], jahrgang: 'NV',
});
eq('Blind sanitize: vollständig bleibt gleich', sanitizeTastingData(blindVoll), blindVoll);
eq('Blind sanitize: Rebsorten der Wahrheit begrenzt', sanitizeTastingData({ blind: { wahrheit: { rebsorten: REBSORTEN.map((r) => r.id) } } }).blind?.wahrheit?.rebsorten?.length, 20);
for (const [name, d] of blindKaputt) check(`Blind sanitize → isValid: ${name}`, isValidTastingData(sanitizeTastingData(d)));
check('Blind sanitize ist idempotent', JSON.stringify(sanitizeTastingData(sanitizeTastingData(blindVoll))) === JSON.stringify(sanitizeTastingData(blindVoll)));
check('Kataloge: isRebsorteId / isLandId', isRebsorteId('merlot') && !isRebsorteId('Merlot') && isLandId('italien') && !isLandId('Italien'));
const maximalBlind = sanitizeTastingData({
  ...maximal,
  blind: {
    rebsorte_tipp: '"'.repeat(100),
    weinart_tipp: 'Dessert- und Likörwein',
    land_tipp: 'suedafrika',
    region_tipp: '🍷'.repeat(80),
    rebsorten_tipp: REBSORTEN.slice(-3).map((r) => r.id),
    jahrgang_tipp: '2019',
    wahrheit: { weinart: '\\'.repeat(80), land: 'neuseeland', region: '"'.repeat(80), rebsorten: REBSORTEN.slice(0, 20).map((r) => r.id), jahrgang: '🍷'.repeat(80) },
  },
});
const bytesBlind = utf8Bytes(JSON.stringify(maximalBlind));
check('Größe: maximaler Bogen mit Blindverkostung unter 20 000 Byte', bytesBlind <= 20000, bytesBlind);

// ── Teil D1: Entwurf im Blind-Modus ───────────────────────────────────────────

const BREF = marketRef(U1);
const JETZT = Date.parse('2026-11-17T12:00:00Z');
eq('Blind-Schlüssel', tastingDraftKey('nutzer', BREF, true), `tasting_draft_v1:nutzer:blind:market:${U1}`);
eq('Normaler Schlüssel unverändert', tastingDraftKey('nutzer', BREF), `tasting_draft_v1:nutzer:market:${U1}`);
eq('Blind-Präfix ohne Anmeldung', blindDraftPrefix(null), 'tasting_draft_v1:anon:blind:');
const blindEntwurf: TastingDraft = {
  ref: BREF,
  level: 'profi',
  step: 'tipp',
  blind: true,
  lessonId: 'l32',
  focus: 'sehen',
  data: { sehen: { klarheit: 'klar' }, blind: { land_tipp: 'italien', rebsorten_tipp: ['sangiovese'] } },
  savedAt: JETZT - 1000,
};
const blindRoundtrip = parseDraft(serializeDraft(blindEntwurf));
eq('Blind-Entwurf: Roundtrip', [blindRoundtrip?.blind, blindRoundtrip?.step, blindRoundtrip?.data.blind], [true, 'tipp', { land_tipp: 'italien', rebsorten_tipp: ['sangiovese'] }]);
check('Blind-Entwurf: gültig im Blind-Modus', isDraftValid(blindRoundtrip, BREF, JETZT, true));
check('Blind-Entwurf: ungültig im normalen Modus', !isDraftValid(blindRoundtrip, BREF, JETZT, false));
const normalerEntwurf = parseDraft(serializeDraft({ ...blindEntwurf, blind: false, step: 'sehen' }));
check('Normaler Entwurf: ungültig im Blind-Modus', !isDraftValid(normalerEntwurf, BREF, JETZT, true));
eq('Normaler Entwurf: Schritt Tipp wird verworfen', parseDraft(JSON.stringify({ ...JSON.parse(serializeDraft({ ...blindEntwurf, blind: false })), step: 'tipp' })), null);
check('Normaler Entwurf: ohne Feld blind', !('blind' in JSON.parse(serializeDraft({ ...blindEntwurf, blind: false, step: 'sehen' }))));
const eintraege: [string, string | null][] = [
  [tastingDraftKey('nutzer', BREF, true), serializeDraft(blindEntwurf)],
  [tastingDraftKey('nutzer', marketRef(U3), true), serializeDraft({ ...blindEntwurf, ref: marketRef(U3), savedAt: JETZT - 500 })],
  [tastingDraftKey('anderer', marketRef(U2), true), serializeDraft({ ...blindEntwurf, ref: marketRef(U2), savedAt: JETZT - 10 })],
  [tastingDraftKey('nutzer', marketRef(U2)), serializeDraft({ ...blindEntwurf, ref: marketRef(U2), blind: false, step: 'sehen', savedAt: JETZT - 10 })],
  [`${blindDraftPrefix('nutzer')}kaputt`, '{kein json'],
  [tastingDraftKey('nutzer', marketRef(U2), true), serializeDraft({ ...blindEntwurf, ref: BREF, savedAt: JETZT - 5 })],
];
eq('Blind-Entwurf finden: neuester passender', newestBlindDraft(eintraege, 'nutzer', JETZT)?.ref.id, U3);
eq('Blind-Entwurf finden: Wein nicht mehr verfügbar', newestBlindDraft(eintraege, 'nutzer', JETZT, (r) => r.id !== U3)?.ref.id, U1);
eq('Blind-Entwurf finden: nichts verfügbar', newestBlindDraft(eintraege, 'nutzer', JETZT, () => false), null);
eq('Blind-Entwurf finden: abgelaufen', newestBlindDraft(eintraege, 'nutzer', JETZT + TASTING_DRAFT_MAX_AGE_MS + 10_000), null);
eq('Blind-Entwurf finden: anderer Nutzer', newestBlindDraft(eintraege, 'dritter', JETZT), null);
eq('Blind-Entwurf finden: null', newestBlindDraft(null, 'nutzer', JETZT), null);

// ── Teil D1: Schritte, Parameter, Speichern ───────────────────────────────────

eq('Blind-Schritte Einfach', blindSteps('einfach'), ['sehen', 'riechen', 'schmecken', 'tipp', 'fazit']);
eq('Blind-Schritte Erweitert', blindSteps('erweitert'), ['sehen', 'riechen', 'schmecken', 'terroir', 'tipp', 'fazit']);
eq('Blind-Schritte Profi', blindSteps('profi'), ['sehen', 'riechen', 'schmecken', 'terroir', 'tipp', 'fazit']);
for (const l of TASTING_LEVELS) eq(`Normale Schritte unverändert (${l})`, wizardSteps(l, false), visibleSteps(l));
eq('Nach Terroir kommt Tipp', stepAfter(blindSteps('profi'), 'terroir'), 'tipp');
eq('Nach Tipp kommt Fazit', stepAfter(blindSteps('profi'), 'tipp'), 'fazit');
eq('Fazit ist der letzte Schritt', stepAfter(blindSteps('profi'), 'fazit'), null);
eq('Vor Tipp: Schmecken in Einfach', stepBefore(blindSteps('einfach'), 'tipp'), 'schmecken');
eq('Vor dem ersten Schritt nichts', stepBefore(blindSteps('einfach'), 'sehen'), null);
eq('Fortsetzen bei Tipp', resumeWizardStep('tipp', blindSteps('einfach')), 'tipp');
eq('Fortsetzen: Tipp im normalen Modus → erster Schritt', resumeWizardStep('tipp', wizardSteps('einfach', false)), 'sehen');
eq('Fortsetzen: Unsinn → erster Schritt', resumeWizardStep(42, blindSteps('profi')), 'sehen');
eq('Parameter blind=1', parseBlindParam('1'), true);
eq('Parameter blind als Liste', parseBlindParam(['1', '0']), true);
for (const v of ['0', 'true', 'ja', '', ' 1', undefined, null]) eq(`Parameter blind=${String(v)} ignoriert`, parseBlindParam(v as string | undefined), false);
eq('Jahrgangs-Eingabe: nur Ziffern', cleanJahrgangInput('20a19x'), '2019');
eq('Jahrgangs-Eingabe: höchstens vier', cleanJahrgangInput('201999'), '2019');
eq('Jahrgangs-Eingabe: kein Text', cleanJahrgangInput(null), '');
check('Tipp ausgefüllt', isBlindTippFilled({ land_tipp: 'italien' }));
check('Tipp leer', !isBlindTippFilled({ wahrheit: WAHR, rebsorte_tipp: 'x' }));
check('Tipp: Unsinn', !isBlindTippFilled('x'));
eq('Nur Tipps, ohne Wahrheit und altes Feld', blindTipps({ ...blindVoll.blind, rebsorte_tipp: 'alt' }), {
  weinart_tipp: 'Rotwein', land_tipp: 'frankreich', region_tipp: 'Bordeaux', rebsorten_tipp: ['merlot', 'cabernet_sauvignon'], jahrgang_tipp: '2018',
});
const zuSpeichern = buildBlindSaveData(
  {
    schmecken: { tannin: 4, saeure: 3 },
    fazit: { qualitaet: 4 },
    blind: { land_tipp: 'deutschland', rebsorte_tipp: 'alt', wahrheit: { land: 'italien' } },
  },
  'weiss',
  'profi',
  { weinart: 'Weißwein', land: 'deutschland', rebsorten: ['riesling'], jahrgang: '2020' },
);
eq('Speichern: Tannin bei Weißwein entfällt, Tipps und neue Wahrheit dabei', zuSpeichern, {
  schmecken: { saeure: 3 },
  fazit: { qualitaet: 4 },
  blind: { land_tipp: 'deutschland', wahrheit: { weinart: 'Weißwein', land: 'deutschland', rebsorten: ['riesling'], jahrgang: '2020' } },
});
check('Speichern: Ergebnis ist gültig', isValidTastingData(zuSpeichern));
eq('Speichern: ohne Tipps nur die Wahrheit', buildBlindSaveData({}, 'rot', 'einfach', { jahrgang: '2019' }), { blind: { wahrheit: { jahrgang: '2019' } } });
eq('Speichern: Unsinn', buildBlindSaveData(null, 'rot', 'einfach', null), {});

// ── Teil D1: Lektion zur Blindverkostung ──────────────────────────────────────

check('l32 ist die Lektion zur Blindverkostung', (getLektion('l32')?.titel ?? '').includes('Blindverkostung'), getLektion('l32')?.titel);
eq('l32: blind in lektionen.json', LESSON_TASKS.l32?.blind, true);
eq('l32: Stufe Profi', LESSON_TASKS.l32?.level, 'profi');
check('l32: Button „Blindverkostung starten“', isBlindLessonTask(LESSON_TASKS.l32));
eq('Nur l32 ist eine Blindverkostung', Object.entries(LESSON_TASKS).filter(([, t]) => isBlindLessonTask(t)).map(([id]) => id), ['l32']);
for (const [id, wert] of Object.entries(lektionenJson as Record<string, Record<string, unknown>>)) {
  check(`lektionen.json ${id}: blind fehlt oder ist true`, wert.blind === undefined || wert.blind === true, wert.blind);
}
eq('validateLessonTasks: blind true erlaubt', validateLessonTasks({ l01: { focus: 'sehen', level: 'einfach', hinweis: 'Ein Satz.', blind: true } }, new Set(['l01'])), []);
eq('validateLessonTasks: blind false nicht erlaubt', validateLessonTasks({ l01: { focus: 'sehen', level: 'einfach', hinweis: 'Ein Satz.', blind: false } }, new Set(['l01'])), ['l01: blind darf nur true sein']);
eq('validateLessonTasks: blind als Text nicht erlaubt', validateLessonTasks({ l01: { focus: 'sehen', level: 'einfach', hinweis: 'Ein Satz.', blind: 'ja' } }, new Set(['l01'])), ['l01: blind darf nur true sein']);
eq('Praxisaufgabe l32: Parameter mit blind=1', lessonTastingParams(BREF, 'l32', LESSON_TASKS.l32), {
  id: U1, kind: 'market', lesson: 'l32', focus: 'sehen', level: 'profi', from: 'lektion', blind: '1',
});
check('Praxisaufgabe l03: ohne blind', !('blind' in lessonTastingParams(BREF, 'l03', LESSON_TASKS.l03)));
check('isBlindLessonTask: null', !isBlindLessonTask(null));

// ── Gastgeber-Weg bei „Zufällig auswählen“ ────────────────────────────────────

check('Gastgeber: Startbildschirm der Blindverkostung', canShowHostReveal({ blind: true, phase: 'start' }));
check('Gastgeber: Entwurf auf dem Startbildschirm (Frage nach „Weitermachen“)', canShowHostReveal({ blind: true, phase: 'frage' }));
check('Gastgeber: nach Beginn des ersten Schritts nicht', !canShowHostReveal({ blind: true, phase: 'bogen' }));
check('Gastgeber: nach dem Speichern nicht', !canShowHostReveal({ blind: true, phase: 'fertig' }));
check('Gastgeber: vor dem Laden nicht', !canShowHostReveal({ blind: true, phase: null }));
check('Gastgeber: normale Verkostung nicht', !canShowHostReveal({ blind: false, phase: 'start' }));
check('Gastgeber: blind als Text zählt nicht', !canShowHostReveal({ blind: '1', phase: 'start' }));
check('Gastgeber: null', !canShowHostReveal(null));
check('Gastgeber: Unsinn', !canShowHostReveal('start' as unknown as { phase: string }));
eq('Gastgeber: Marktplatzwein zeigt Name und Jahrgang, kein Weingut',
  hostRevealInfo({ wine: { name: 'Château X', vintage: 2018, winery: 'Merlot · Bordeaux · 2018' } as { name: string; vintage: number } }),
  { name: 'Château X', weingut: null, jahrgang: '2018' });
eq('Gastgeber: eigener Wein mit Weingut', hostRevealInfo({ wine: { name: 'Mein Riesling', vintage: 0 }, custom: { weingut: ' Weingut Muster ', jahrgang: 'NV' } }), {
  name: 'Mein Riesling', weingut: 'Weingut Muster', jahrgang: 'NV',
});
eq('Gastgeber: eigener Wein ohne Weingut und Jahrgang', hostRevealInfo({ wine: { name: 'X', vintage: 0 }, custom: { weingut: '', jahrgang: null } }), {
  name: 'X', weingut: null, jahrgang: null,
});
eq('Gastgeber: nur drei Angaben (keine Rebsorte, Region, Herkunft)', Object.keys(hostRevealInfo(eigenerWein(U3, { weinart: 'Weißwein', rebsorte: 'Riesling', herkunft: 'Deutschland', region: 'Mosel', jahrgang: '2020' }))).sort(), ['jahrgang', 'name', 'weingut']);
eq('Gastgeber: null', hostRevealInfo(null), { name: '', weingut: null, jahrgang: null });
eq('Gastgeber: Rückfrage', HOST_REVEAL_FRAGE, 'Das verrät den Wein. Zeige ihn nur dem Gastgeber.');
eq('Gastgeber: Erklärung Zufällig', BLIND_ERKLAERUNG_ZUFALL, 'Zufällig: Die App wählt einen Wein. Ein Gastgeber kann ihn einsehen und einschenken.');
eq('Gastgeber: Erklärung Selbst wählen', BLIND_ERKLAERUNG_SELBST, 'Selbst wählen: Du oder dein Gastgeber wählt die Flasche. Du siehst dann die Namen.');

// ── Ergebnis ──────────────────────────────────────────────────────────────────

console.log(`Verkostungs-Prüfung: ${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  throw new Error(`${failures.length} Prüfungen fehlgeschlagen`);
}
