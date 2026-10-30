// Prüfskript der Wein-Akademie: reine Funktionen und alle gebündelten Lektionen.
// Ausführen mit: npm run check:academy
import { TIERS, Segment, Tier } from '../content/academy';
import { getLektion, nextLektion, pflichtLektionen } from '../content/academy/helpers';
import { initialTierIndex, isTierUnlocked } from '../lib/academy/unlock';
import { ergebnisText, newlyUnlockedTiers, scoreQuiz } from '../lib/academy/lesson';
import { parseInline, textToBlocks } from '../lib/academy/richText';

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

// ── parseInline ───────────────────────────────────────────────────────────────

eq('parseInline: leer', parseInline(''), []);
eq('parseInline: nur Text', parseInline('Einfacher Satz.'), [{ t: 'Einfacher Satz.' }]);
eq('parseInline: fett', parseInline('Ein **fetter** Satz'), [
  { t: 'Ein ' },
  { t: 'fetter', b: true },
  { t: ' Satz' },
]);
eq('parseInline: kursiv', parseInline('Ein *kursiver* Satz'), [
  { t: 'Ein ' },
  { t: 'kursiver', i: true },
  { t: ' Satz' },
]);
eq('parseInline: mehrfach fett', parseInline('**A** und **B**'), [
  { t: 'A', b: true },
  { t: ' und ' },
  { t: 'B', b: true },
]);
eq('parseInline: kursiv in fett', parseInline('**fett *beides* fett**'), [
  { t: 'fett ', b: true },
  { t: 'beides', b: true, i: true },
  { t: ' fett', b: true },
]);
eq('parseInline: fett mit Doppelpunkt', parseInline('**Vorlauf:** giftig'), [
  { t: 'Vorlauf:', b: true },
  { t: ' giftig' },
]);
eq('parseInline: Rechenzeichen bleibt', parseInline('5 * 3 = 15'), [{ t: '5 * 3 = 15' }]);
eq('parseInline: unpaariges ** wird entfernt', parseInline('offen **ohne Ende'), [{ t: 'offen ohne Ende' }]);
eq('parseInline: Sonderzeichen', parseInline('**37,5 % vol.** Alkohol'), [
  { t: '37,5 % vol.', b: true },
  { t: ' Alkohol' },
]);
eq('textToBlocks: Absätze', textToBlocks('Eins\n\nZwei **fett**'), [
  { type: 'p', segments: [{ t: 'Eins' }] },
  { type: 'p', segments: [{ t: 'Zwei ' }, { t: 'fett', b: true }] },
]);

// ── scoreQuiz und Ergebnistext ────────────────────────────────────────────────

const beispiel = getLektion('l01')!.quiz;
const alleRichtig = beispiel.map((f) => f.richtig);
const alleFalsch = beispiel.map((f) => (f.richtig + 1) % f.optionen.length);
eq('scoreQuiz: alles richtig', scoreQuiz(beispiel, alleRichtig), { richtig: 5, gesamt: 5 });
eq('scoreQuiz: alles falsch', scoreQuiz(beispiel, alleFalsch), { richtig: 0, gesamt: 5 });
eq(
  'scoreQuiz: gemischt (3 von 5)',
  scoreQuiz(beispiel, [alleRichtig[0], alleFalsch[1], alleRichtig[2], alleFalsch[3], alleRichtig[4]]),
  { richtig: 3, gesamt: 5 },
);
eq('scoreQuiz: unbeantwortet zählt nicht', scoreQuiz(beispiel, [alleRichtig[0], null, undefined]), {
  richtig: 1,
  gesamt: 5,
});
eq(
  'scoreQuiz: künstliche Fragen',
  scoreQuiz(
    [
      { frage: 'A', optionen: ['x', 'y', 'z'], richtig: 1, erklaerung: '' },
      { frage: 'B', optionen: ['x', 'y', 'z'], richtig: 2, erklaerung: '' },
    ],
    [1, 0],
  ),
  { richtig: 1, gesamt: 2 },
);
eq('ergebnisText: 5/5', ergebnisText({ richtig: 5, gesamt: 5 }), 'Ausgezeichnet!');
eq('ergebnisText: 4/5', ergebnisText({ richtig: 4, gesamt: 5 }), 'Gut gemacht.');
eq('ergebnisText: 3/5', ergebnisText({ richtig: 3, gesamt: 5 }), 'Gut gemacht.');
eq(
  'ergebnisText: 2/5',
  ergebnisText({ richtig: 2, gesamt: 5 }),
  'Dran bleiben, du kannst die Lektion jederzeit wiederholen.',
);
eq(
  'ergebnisText: 0/5',
  ergebnisText({ richtig: 0, gesamt: 5 }),
  'Dran bleiben, du kannst die Lektion jederzeit wiederholen.',
);

// ── Freischalt-Logik aus Teil 1 (unverändert) ─────────────────────────────────

const [tier1, tier2, tier3, tier4, bonus] = TIERS;
const ids = (tier: Tier) => pflichtLektionen(tier).map((l) => l.id);
const none = new Set<string>();
const tier1Done = new Set(ids(tier1));
const tier1Fast = new Set(ids(tier1).slice(0, -1));

check('unlock: Tier 1 immer frei', isTierUnlocked(tier1, none));
check('unlock: Bonus immer frei', isTierUnlocked(bonus, none));
check('unlock: Tier 2 anfangs gesperrt', !isTierUnlocked(tier2, none));
check('unlock: Tier 2 gesperrt, wenn eine Pflichtlektion fehlt', !isTierUnlocked(tier2, tier1Fast));
check('unlock: Tier 2 frei nach L1–8 (ohne freiwillige L9)', isTierUnlocked(tier2, tier1Done));
check('unlock: L9 ist freiwillig', !ids(tier1).includes('l09') && tier1.lektionen.some((l) => l.id === 'l09'));
check('unlock: Tier 3 bleibt nach Tier 1 gesperrt', !isTierUnlocked(tier3, tier1Done));
check(
  'unlock: Tier 4 frei nach Pflicht von Tier 3',
  isTierUnlocked(tier4, new Set(ids(tier3))),
);
eq('unlock: Startindex ohne Fortschritt', initialTierIndex(none), 0);
eq('unlock: Startindex nach Tier 1', initialTierIndex(tier1Done), 1);
eq(
  'newlyUnlockedTiers: letzte Pflichtlektion schaltet Tier 2 frei',
  newlyUnlockedTiers(tier1Fast, tier1Done).map((t) => t.key),
  [tier2.key],
);
eq('newlyUnlockedTiers: Wiederholung schaltet nichts frei', newlyUnlockedTiers(tier1Done, tier1Done), []);
eq('nextLektion: l01 → l02', nextLektion('l01')?.id, 'l02');
eq('nextLektion: l08 → l09', nextLektion('l08')?.id, 'l09');
eq('nextLektion: letzte Lektion von Tier 1', nextLektion('l09'), undefined);
eq('nextLektion: bonus-1 → bonus-2', nextLektion('bonus-1')?.id, 'bonus-2');
eq('nextLektion: unbekannt', nextLektion('gibt-es-nicht'), undefined);

// ── Alle Lektionen aus den JSON-Dateien ───────────────────────────────────────

const visible = (segments: Segment[]) => segments.map((s) => s.t).join('');
const lektionen = TIERS.flatMap((t) => t.lektionen);
eq('Inhalte: 47 Lektionen', lektionen.length, 47);
eq('Inhalte: IDs eindeutig', new Set(lektionen.map((l) => l.id)).size, lektionen.length);

for (const l of lektionen) {
  const p = `Lektion ${l.id}`;
  check(`${p}: Titel`, !!l.titel?.trim());
  check(`${p}: Lernziel`, !!l.lernziel?.trim());
  check(
    `${p}: mindestens eine Slide mit blocks`,
    l.slides.length > 0 && l.slides.every((s) => Array.isArray(s.blocks) && s.blocks.length > 0),
  );
  for (const s of l.slides) {
    for (const b of s.blocks) {
      const segs = b.type === 'p' ? b.segments : b.type === 'ul' ? b.items.flat() : null;
      check(`${p} Slide ${s.nr}: gültiger Block`, segs !== null && segs.length > 0, b.type);
      if (segs) check(`${p} Slide ${s.nr}: kein rohes **`, !visible(segs).includes('**'));
    }
  }
  eq(`${p}: genau 5 Quizfragen`, l.quiz.length, 5);
  l.quiz.forEach((q, i) => {
    const qp = `${p} Frage ${i + 1}`;
    check(`${qp}: Fragetext`, !!q.frage?.trim());
    eq(`${qp}: 3 Optionen`, q.optionen.length, 3);
    check(`${qp}: gültiger richtig-Index`, Number.isInteger(q.richtig) && q.richtig >= 0 && q.richtig < q.optionen.length, q.richtig);
    check(`${qp}: Erklärung`, !!q.erklaerung?.trim());
  });
  check(`${p}: Praxisaufgabe`, !!l.praxisaufgabe?.trim());

  // Alle Strings, die durch parseInline laufen: danach darf kein Stern sichtbar sein.
  const inputs = [l.lernziel, l.praxisaufgabe, ...l.quiz.flatMap((q) => [q.frage, q.erklaerung, ...q.optionen])];
  for (const text of inputs) {
    const shown = textToBlocks(text)
      .map((b) => (b.type === 'p' ? visible(b.segments) : ''))
      .join('\n');
    check(`${p}: kein rohes ** oder * nach parseInline`, !shown.includes('*'), text.slice(0, 80));
  }
}

// ── Ergebnis ──────────────────────────────────────────────────────────────────

console.log(`Akademie-Prüfung: ${passed} bestanden, ${failures.length} fehlgeschlagen`);
if (failures.length > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  throw new Error(`${failures.length} Prüfungen fehlgeschlagen`);
}
