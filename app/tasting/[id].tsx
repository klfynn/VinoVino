// Verkostungsbogen als Assistent: Sehen → Riechen → Schmecken → Terroir → Fazit.
// Route: /tasting/[id]?kind=market|custom&level=…&focus=…&lesson=…&from=lektion&blind=1
// `lesson`, `focus` und `level` setzt die Praxisaufgabe einer Lektion (Teil C), `from=lektion`
// sagt, dass der Assistent aus der Lektion geöffnet wurde (für „Zurück zur Lektion“).
// `blind=1` (Teil D1): Blindverkostung. Name und Angaben des Weins sind ausgeblendet („Blindwein“),
// nach Terroir kommt der Schritt Tipp, im Fazit gibt es keine Sterne, „Auflösen“ speichert und
// zeigt danach die Auflösung. Andere Werte von `blind` werden ignoriert.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useCellar } from '../../context/CellarContext';
import { getLektion } from '../../content/academy/helpers';
import { CloseButton, LoadingState, PrimaryButton } from '../../components/academy/AcademyUI';
import { AromaPicker } from '../../components/tasting/AromaPicker';
import { LessonTaskBox } from '../../components/tasting/LessonTaskBox';
import { TastingResultView } from '../../components/tasting/TastingResultView';
import { BlindResolution, CatalogPicker } from '../../components/tasting/BlindUI';
import {
  Chip,
  ColorSwatches,
  FieldLabel,
  HintBox,
  InfoSheet,
  OptionRow,
  ScaleInput,
  StarInput,
  StepProgress,
  TOUCH,
} from '../../components/tasting/TastingUI';
import { ABSCHNITTE, AROMEN, LAENDER, REBSORTEN, TERROIR } from '../../lib/tasting/catalog';
import {
  BLIND_NAME,
  BLIND_TIPP_EINLEITUNG,
  blindTruthFromEntry,
  buildBlindSaveData,
  cleanJahrgangInput,
  isBlindTippFilled,
  parseBlindParam,
  resumeWizardStep,
  stepAfter,
  stepBefore,
  WEINART_TIPP_WERTE,
  WizardStep,
  wizardSteps,
} from '../../lib/tasting/blind';
import { draftLessonContext, resolveLessonParams, startStepFor } from '../../lib/tasting/lessonLinks';
import { lessonInfo, useLessonLinks } from '../../lib/tasting/useLessonLinks';
import { useTastingDraft } from '../../lib/tasting/useTastingDraft';
import { saveTastingNote } from '../../services/tastingNotes';
import { isUuid, sameWineRef } from '../../lib/tasting/wineRef';
import {
  filledSteps,
  hasAnyInput,
  isFieldVisible,
  pruneTastingData,
  skalaKey,
  stepSkalen,
  visibleAromaStufen,
  visibleFarben,
  visibleFehler,
  visibleRandFarben,
  visibleSteps,
} from '../../lib/tasting/visibility';
import {
  formatTastingDate,
  KLARHEIT_LABELS,
  LAGERPOTENZIAL_LABELS,
  LEVEL_BESCHREIBUNG,
  LEVEL_LABELS,
  levelLabel,
  toggleId,
  TRINKREIFE_LABELS,
  ZUSTAND_LABELS,
} from '../../lib/tasting/summary';
import { bodenVergleichText, BODEN_HINWEIS, compareBoden } from '../../lib/tasting/terroirCompare';
import {
  availabilityHint,
  initialLevel,
  kategorieForEntry,
  parseStoredLevel,
  parseTastingParams,
  ratingToSave,
  tastingAvailability,
  tastingLevelKey,
  wineInfoLine,
} from '../../lib/tasting/wizard';
import {
  AromaFamilie,
  AromaStufe,
  AromaStufeKatalog,
  Klarheit,
  Lagerpotenzial,
  NasenZustand,
  NOTIZ_MAX_LENGTH,
  REBSORTEN_TIPP_MAX,
  REGION_TIPP_MAX_LENGTH,
  Skala,
  Skalenwert,
  TASTING_LEVELS,
  TastingAromen,
  TastingBlind,
  TastingData,
  TastingLevel,
  TastingNote,
  TastingStep,
  Trinkreife,
  WineRef,
} from '../../lib/tasting/types';

type Phase = 'frage' | 'start' | 'bogen' | 'fertig';

// Der Schritt Tipp der Blindverkostung nutzt den Abschnitt „blind“ aus abschnitte.json.
const STEP_LABELS: Record<string, string> = Object.fromEntries(
  ABSCHNITTE.map((a) => [a.id === 'blind' ? 'tipp' : a.id, a.label]),
);
const STEP_TEXTE: Record<string, string> = Object.fromEntries(
  ABSCHNITTE.map((a) => [a.id === 'blind' ? 'tipp' : a.id, a.beschreibung]),
);
const DRAFT_DEBOUNCE_MS = 500;
// Platzhalter, damit der Entwurfs-Hook auch ohne gültige Route aufgerufen werden kann.
const KEIN_WEIN: WineRef = { kind: 'market', id: 'kein-wein' };
const LEERE_AROMEN: TastingAromen = { primaer: [], sekundaer: [], tertiaer: [] };

type Section = Record<string, unknown>;
type Help = { title: string; text: string; anker?: string[]; lektion?: unknown };
type LessonContext = { lessonId: string | null; focus: TastingStep | null };

const isLesson = (id: string) => !!getLektion(id);

export default function TastingWizardScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const params = useMemo(
    () => parseTastingParams(rawParams as Record<string, string | string[] | undefined>, isLesson),
    // Die Werte sind Strings; ein neues Objekt mit gleichem Inhalt soll nichts neu berechnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawParams)],
  );
  // Teil C: Lektionsbezug mit Rückfall auf die Zuordnung in lektionen.json (ungültige Werte werden ignoriert).
  const lessonParams = useMemo(
    () => resolveLessonParams(rawParams as Record<string, string | string[] | undefined>, { isLesson }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(rawParams)],
  );
  const fromLesson = (Array.isArray(rawParams.from) ? rawParams.from[0] : rawParams.from) === 'lektion';
  // Teil D1: Blind-Modus nur bei `blind=1`.
  const blind = parseBlindParam(rawParams.blind as string | string[] | undefined);
  const { linkFor } = useLessonLinks();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { cellarWines, loading: cellarLoading, setRating } = useCellar();
  const entry = useMemo(
    () => (params.ref ? cellarWines.find((cw) => sameWineRef(cw.ref, params.ref)) : undefined),
    [cellarWines, params.ref],
  );
  const ref = params.ref ?? KEIN_WEIN;
  const kategorie = kategorieForEntry(entry);
  const availability = tastingAvailability({ signedIn: !!userId, persisted: !!entry?.persisted, ref: params.ref });
  const bodenEintrag = entry?.custom?.boden ?? null;

  // Blindverkostungen haben einen eigenen Zwischenstand (siehe tastingDraftKey).
  const draft = useTastingDraft(ref, blind);

  const [phase, setPhase] = useState<Phase | null>(null);
  const [level, setLevel] = useState<TastingLevel>(lessonParams.level ?? 'einfach');
  // Lektion und Schwerpunkt dieser Verkostung: aus der Route, bei „Weitermachen“ aus dem Entwurf.
  const [lessonCtx, setLessonCtx] = useState<LessonContext>({
    lessonId: lessonParams.lessonId,
    focus: lessonParams.focus,
  });
  const [step, setStep] = useState<WizardStep>('sehen');
  const [data, setData] = useState<TastingData>({});
  const [stars, setStars] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ note: TastingNote; starsError: string | null } | null>(null);
  // Sterne in der Auflösung der Blindverkostung (gespeichert über den Weinkeller)
  const [afterStars, setAfterStars] = useState<{ value: number; saving: boolean; error: string | null; ok: boolean }>({
    value: 0,
    saving: false,
    error: null,
    ok: false,
  });
  const [help, setHelp] = useState<Help | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);

  // ── Start: Entwurf oder Stufenwahl ───────────────────────────────────────────

  const decided = useRef(false);
  // Verhindert, dass die gespeicherte Stufe eine Auswahl (oder einen fortgesetzten Entwurf) überschreibt.
  const levelTouched = useRef(false);
  useEffect(() => {
    if (decided.current || !draft.loaded) return;
    decided.current = true;
    setPhase(draft.draft ? 'frage' : 'start');
    // Zuletzt gewählte Stufe vorauswählen (Routenparameter hat Vorrang). Gilt auch für „Neu beginnen“.
    (async () => {
      let stored: TastingLevel | null = null;
      try {
        stored = parseStoredLevel(await AsyncStorage.getItem(tastingLevelKey(userId)));
      } catch (err) {
        console.warn('[VinoVino] Zuletzt gewählte Stufe konnte nicht gelesen werden:', err);
      }
      if (!levelTouched.current) setLevel(initialLevel(lessonParams.level, stored));
    })();
  }, [draft.loaded, draft.draft, userId, lessonParams.level]);

  // Sterne mit der vorhandenen Bewertung vorbelegen.
  const initialStars = entry?.rating ?? 0;
  const starsTouched = useRef(false);
  useEffect(() => {
    if (!starsTouched.current) setStars(initialStars);
  }, [initialStars]);

  // ── Zwischenstand (entprellt) ────────────────────────────────────────────────

  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ level, step, data, lessonCtx });
  latest.current = { level, step, data, lessonCtx };
  const purchasedWineId =
    entry?.ref.kind === 'market' ? entry.purchases?.find((p) => isUuid(p.id))?.id ?? null : null;

  const writeDraft = useCallback(() => {
    const { level: l, step: s, data: d, lessonCtx: lc } = latest.current;
    if (!hasAnyInput(d)) return;
    draft.save({ level: l, step: s, data: d, purchasedWineId, lessonId: lc.lessonId, focus: lc.focus });
  }, [draft, purchasedWineId]);

  const flush = useCallback(() => {
    if (pending.current) {
      clearTimeout(pending.current);
      pending.current = null;
      writeDraft();
    }
  }, [writeDraft]);

  useEffect(() => {
    if (phase !== 'bogen') return;
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = null;
      writeDraft();
    }, DRAFT_DEBOUNCE_MS);
    // writeDraft absichtlich nicht als Abhängigkeit: nur echte Eingaben lösen das Speichern aus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, step, level, phase]);

  // Beim Verlassen des Bildschirms ausstehendes Speichern sofort ausführen.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);

  // ── Schließen mit Bestätigung ───────────────────────────────────────────────

  const inputPresent = hasAnyInput(data);
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(phase === 'bogen' && inputPresent && !saving && !leaving, ({ repeat }) => {
    Alert.alert('Verkostung schließen?', 'Der Zwischenstand bleibt erhalten.', [
      { text: 'Weiter verkosten', style: 'cancel' },
      {
        text: 'Schließen',
        onPress: () => {
          flush();
          setLeaving(true);
          repeat();
        },
      },
    ]);
  });

  const goToWine = useCallback(() => {
    if (router.canGoBack()) router.back();
    // Im Blind-Modus nie auf die Detailseite springen, das würde den Wein verraten.
    else if (params.ref && !blind) router.replace({ pathname: '/cellar/[id]', params: { id: params.ref.id, kind: params.ref.kind } });
    else router.replace('/(tabs)/watchlist');
  }, [router, params.ref, blind]);

  // Lektion auf den Stapel legen (nicht den Assistenten ersetzen). Der Assistent bleibt darunter
  // geöffnet; zusätzlich wird der Zwischenstand sofort gespeichert.
  const openLesson = useCallback(
    (lessonId: string) => {
      setHelp(null);
      flush();
      router.push({ pathname: '/lektion/[id]', params: { id: lessonId } });
    },
    [router, flush],
  );

  // Abschluss: zurück in die Lektion, aus der die Verkostung gestartet wurde.
  const backToLesson = () => {
    const id = lessonCtx.lessonId;
    if (!id) return;
    if (fromLesson && id === lessonParams.lessonId && router.canGoBack()) router.back();
    else router.replace({ pathname: '/lektion/[id]', params: { id } });
  };

  // Abschluss: „Zum Wein“. Aus einer Lektion heraus läge darunter die Lektion, nicht der Wein;
  // bei der Blindverkostung die Weinkeller-Liste.
  const openWine = () => {
    if ((fromLesson || blind) && params.ref) {
      router.replace({ pathname: '/cellar/[id]', params: { id: params.ref.id, kind: params.ref.kind } });
    } else {
      goToWine();
    }
  };

  // ── Aktionen ─────────────────────────────────────────────────────────────────

  const resumeDraft = () => {
    const d = draft.draft;
    if (!d) return;
    levelTouched.current = true;
    setLevel(d.level);
    // Lektion und Schwerpunkt des Entwurfs bleiben erhalten (auch wenn die Route etwas anderes sagt).
    setLessonCtx(draftLessonContext(d, isLesson));
    setData(d.data);
    setStep(resumeWizardStep(d.step, wizardSteps(d.level, blind)));
    setPhase('bogen');
  };

  const discardDraft = () => {
    draft.clear();
    setData({});
    setLessonCtx({ lessonId: lessonParams.lessonId, focus: lessonParams.focus });
    setPhase('start');
  };

  const begin = () => {
    (async () => {
      try {
        await AsyncStorage.setItem(tastingLevelKey(userId), level);
      } catch (err) {
        console.warn('[VinoVino] Stufe konnte nicht gemerkt werden:', err);
      }
    })();
    // Mit Schwerpunkt aus einer Praxisaufgabe direkt bei diesem Schritt beginnen.
    setStep(startStepFor(lessonCtx.focus, visibleSteps(level)));
    setPhase('bogen');
  };

  const goStep = (next: WizardStep | null) => {
    if (!next) return;
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const save = async () => {
    if (!params.ref || !entry || saving) return;
    setSaving(true);
    setSaveError(null);
    flush();
    const result = await saveTastingNote({
      ref: params.ref,
      level,
      // Blindverkostung: Tipps und Momentaufnahme der tatsächlichen Angaben (`wahrheit`) dazu.
      data: blind
        ? buildBlindSaveData(data, kategorie, level, blindTruthFromEntry(entry))
        : pruneTastingData(data, kategorie, level),
      purchasedWineId,
      focus: lessonCtx.focus,
      lessonId: lessonCtx.lessonId,
      blind,
    });
    if (!result.ok) {
      // Entwurf bleibt erhalten; der Nutzer kann es erneut versuchen.
      writeDraft();
      setSaveError(result.error);
      setSaving(false);
      return;
    }
    draft.clear();
    let starsError: string | null = null;
    // Im Blind-Modus gibt es im Fazit keine Sterne; bewertet wird erst in der Auflösung.
    const neueSterne = blind ? null : ratingToSave(entry.rating, stars);
    if (neueSterne !== null) {
      // Über den Weinkeller speichern, damit Sterne und private Notiz zusammen bleiben.
      const r = await setRating(entry, neueSterne, entry.notes ?? '');
      if (!r.ok) starsError = r.error;
    }
    setSaved({ note: result.data, starsError });
    setAfterStars({ value: entry.rating ?? 0, saving: false, error: null, ok: false });
    setSaving(false);
    setPhase('fertig');
  };

  // ── Daten ändern ─────────────────────────────────────────────────────────────

  // Sterne nach der Auflösung: über die bestehende Weinkeller-Funktion.
  const rateAfterReveal = async (n: number) => {
    if (!entry || afterStars.saving) return;
    setAfterStars((a) => ({ ...a, value: n, saving: true, error: null, ok: false }));
    const r = await setRating(entry, n, entry.notes ?? '');
    setAfterStars((a) => ({ ...a, saving: false, error: r.ok ? null : r.error, ok: r.ok }));
  };

  const sectionOf = (s: TastingStep): Section => ((data as Record<string, Section | undefined>)[s] ?? {}) as Section;
  const setField = (s: TastingStep, key: string, value: unknown) =>
    setData((d) => {
      const current = ((d as Record<string, Section | undefined>)[s] ?? {}) as Section;
      return { ...d, [s]: { ...current, [key]: value } } as TastingData;
    });

  const tipps: TastingBlind = data.blind ?? {};
  const setTipp = <K extends keyof TastingBlind>(key: K, value: TastingBlind[K] | undefined) =>
    setData((d) => ({ ...d, blind: { ...(d.blind ?? {}), [key]: value } }));

  const naseAromen: TastingAromen = { ...LEERE_AROMEN, ...(data.riechen?.aromen ?? {}) };
  const toggleNase = (stufe: AromaStufe, id: string) =>
    setField('riechen', 'aromen', { ...naseAromen, [stufe]: toggleId(naseAromen[stufe], id) });
  const gaumen = data.schmecken?.aromen_gaumen ?? [];
  const familyHelp = (stufe: AromaStufeKatalog, familie: AromaFamilie) =>
    setHelp({
      title: familie.label,
      text: `${stufe.beschreibung} Typisch für diese Familie: ${familie.aromen.map((a) => a.label).join(', ')}.`,
      lektion: familie.lektion,
    });

  // ── Darstellung ──────────────────────────────────────────────────────────────

  if (!params.ref) {
    return <Notice text="Dieser Wein wurde nicht gefunden." onBack={goToWine} />;
  }
  if (!entry) {
    if (cellarLoading) return <Screen><LoadingState /></Screen>;
    return <Notice text="Dieser Wein ist nicht (mehr) in deinem Weinkeller." onBack={goToWine} />;
  }
  if (availability !== 'ok' && phase !== 'fertig') {
    return <Notice text={availabilityHint(availability) ?? ''} onBack={goToWine} />;
  }
  if (phase === null) return <Screen><LoadingState /></Screen>;

  const taskLesson = lessonCtx.lessonId ? getLektion(lessonCtx.lessonId) : undefined;
  const taskBox = taskLesson ? (
    <LessonTaskBox
      label={lessonInfo(taskLesson.id)?.label ?? taskLesson.titel}
      praxisaufgabe={taskLesson.praxisaufgabe}
      onOpenLesson={() => openLesson(taskLesson.id)}
    />
  ) : null;

  // Im Blind-Modus steht überall „Blindwein“ statt des Namens, ohne Weinart und Jahrgang.
  const wineTitle = blind ? BLIND_NAME : entry.wine.name;
  const header = (
    <View style={styles.wineHead}>
      <Text style={styles.eyebrow}>{blind ? 'BLINDVERKOSTUNG' : 'VERKOSTUNG'}</Text>
      <Text style={styles.wineName} numberOfLines={2}>{wineTitle}</Text>
      {!blind && wineInfoLine(entry) ? <Text style={styles.wineInfo}>{wineInfoLine(entry)}</Text> : null}
      {blind ? <Text style={styles.wineInfo}>Name und Angaben siehst du erst bei der Auflösung.</Text> : null}
    </View>
  );

  // Frage nach dem Entwurf
  if (phase === 'frage' && draft.draft) {
    return (
      <Screen onClose={goToWine}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          <View style={styles.card}>
            <Ionicons name="time-outline" size={28} color={colors.accent} />
            <Text style={styles.questionTitle}>
              {blind ? 'Du hast eine angefangene Blindverkostung.' : 'Du hast eine angefangene Verkostung.'}
            </Text>
            <Text style={[styles.mutedText, styles.center]}>
              Stufe {levelLabel(draft.draft.level)}, zuletzt bearbeitet am{' '}
              {formatTastingDate(new Date(draft.draft.savedAt).toISOString())}.
            </Text>
            <PrimaryButton label="Weitermachen" onPress={resumeDraft} style={styles.fullButton} />
            <PrimaryButton label="Neu beginnen" variant="outline" onPress={discardDraft} style={styles.fullButtonSecondary} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // Startbildschirm mit Stufenwahl
  if (phase === 'start' || phase === 'frage') {
    return (
      <Screen onClose={goToWine}>
        <ScrollView contentContainerStyle={styles.content}>
          {header}
          {taskBox}
          <Text style={styles.sectionTitle}>WÄHLE DEINE STUFE</Text>
          <View style={styles.levelList} accessibilityRole="radiogroup" accessibilityLabel="Stufe">
            {TASTING_LEVELS.map((l) => {
              const selected = l === level;
              return (
                <TouchableOpacity
                  key={l}
                  style={[styles.levelCard, selected && styles.levelCardSelected]}
                  onPress={() => {
                    levelTouched.current = true;
                    setLevel(l);
                  }}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Stufe ${LEVEL_LABELS[l]}: ${LEVEL_BESCHREIBUNG[l]}`}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.accent : colors.textMuted}
                  />
                  <View style={styles.levelText}>
                    <Text style={[styles.levelTitle, selected && { color: colors.accent }]}>{LEVEL_LABELS[l]}</Text>
                    <Text style={styles.mutedText}>{LEVEL_BESCHREIBUNG[l]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.footHint}>Jeder Schritt ist freiwillig. Du kannst alles überspringen.</Text>
          <PrimaryButton label={blind ? 'Blindverkostung beginnen' : 'Verkostung beginnen'} onPress={begin} style={styles.fullButton} />
        </ScrollView>
      </Screen>
    );
  }

  // Auflösung der Blindverkostung (erst nach erfolgreichem Speichern)
  if (phase === 'fertig' && saved && blind) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <BlindResolution
            wineName={entry.wine.name}
            blind={saved.note.data.blind}
            bodenTipp={saved.note.data.terroir?.boden_tipp ?? null}
            bodenEintrag={bodenEintrag}
          />
          <TastingResultView data={saved.note.data} kategorie={kategorie} bodenEintrag={bodenEintrag} ohneBodenVergleich />
          <View style={[styles.starCard, styles.gapTop]}>
            <FieldLabel label="Wie bewertest du den Wein jetzt, wo du ihn kennst?" />
            <StarInput value={afterStars.value} onChange={rateAfterReveal} />
            {afterStars.saving ? <ActivityIndicator color={colors.accent} style={styles.gapTopSmall} /> : null}
            {afterStars.ok ? (
              <View style={styles.gapTopSmall}>
                <HintBox tone="success" text="Deine Sterne sind im Weinkeller gespeichert." />
              </View>
            ) : null}
            {afterStars.error ? (
              <View style={styles.gapTopSmall}>
                <HintBox tone="error" text={`Die Sterne wurden nicht gespeichert: ${afterStars.error}`} />
              </View>
            ) : null}
            <Text style={styles.fieldHintBelow}>Freiwillig. Die Sterne werden als deine Bewertung im Weinkeller gespeichert.</Text>
          </View>
          <PrimaryButton label="Zum Wein" onPress={openWine} style={styles.fullButton} />
          {lessonCtx.lessonId && (
            <PrimaryButton
              label="Zurück zur Lektion"
              variant="outline"
              onPress={backToLesson}
              style={styles.fullButtonSecondary}
            />
          )}
        </ScrollView>
      </Screen>
    );
  }

  // Abschluss
  if (phase === 'fertig' && saved) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.doneHead}>
            <Ionicons name="checkmark-circle" size={48} color={colors.like} />
            <Text style={styles.doneTitle}>Verkostung gespeichert</Text>
            <Text style={styles.mutedText}>
              {entry.wine.name} · {levelLabel(saved.note.level)} · {formatTastingDate(saved.note.tastedAt)}
            </Text>
          </View>
          {saved.starsError && (
            <View style={styles.gapBottom}>
              <HintBox tone="error" text={`Die Sterne wurden nicht gespeichert: ${saved.starsError}`} />
            </View>
          )}
          <TastingResultView data={saved.note.data} kategorie={kategorie} bodenEintrag={bodenEintrag} />
          <PrimaryButton label="Zum Wein" onPress={openWine} style={styles.fullButton} />
          {lessonCtx.lessonId && (
            <PrimaryButton
              label="Zurück zur Lektion"
              variant="outline"
              onPress={backToLesson}
              style={styles.fullButtonSecondary}
            />
          )}
        </ScrollView>
      </Screen>
    );
  }

  // ── Bogen ────────────────────────────────────────────────────────────────────

  const steps = wizardSteps(level, blind);
  const filled: WizardStep[] = [
    ...filledSteps(data, kategorie, level),
    ...(blind && isBlindTippFilled(data.blind) ? (['tipp'] as WizardStep[]) : []),
  ];
  const isLast = stepAfter(steps, step) === null;
  const prev = stepBefore(steps, step);

  const renderSkalen = (s: TastingStep, nur?: string[]) =>
    stepSkalen(s, kategorie, level)
      .filter((sk) => !nur || nur.includes(sk.id))
      .map((sk: Skala) => (
        <ScaleInput
          key={sk.id}
          skala={sk}
          value={sectionOf(s)[skalaKey(sk)] as Skalenwert | undefined}
          onChange={(v) => setField(s, skalaKey(sk), v)}
          onHelp={() => setHelp({ title: sk.label, text: sk.erklaerung, anker: sk.anker, lektion: sk.lektion })}
        />
      ));

  let body: React.ReactNode = null;
  if (step === 'sehen') {
    const rand = visibleRandFarben(kategorie, level);
    body = (
      <>
        <View style={styles.field}>
          <FieldLabel label="Klarheit" />
          <OptionRow<Klarheit>
            groupLabel="Klarheit"
            options={[
              { id: 'klar', label: KLARHEIT_LABELS.klar },
              { id: 'trueb', label: KLARHEIT_LABELS.trueb },
            ]}
            value={data.sehen?.klarheit}
            onChange={(v) => setField('sehen', 'klarheit', v)}
          />
        </View>
        <View style={styles.field}>
          <FieldLabel label="Farbe" />
          <ColorSwatches
            groupLabel="Farbe"
            farben={visibleFarben(kategorie)}
            value={data.sehen?.farbe}
            onChange={(v) => setField('sehen', 'farbe', v)}
          />
        </View>
        {renderSkalen('sehen', ['farbintensitaet'])}
        {rand.length > 0 && (
          <View style={styles.field}>
            <FieldLabel label="Randfarbe" />
            <Text style={styles.fieldHint}>Neige das Glas und schau auf den äußeren Rand des Weins.</Text>
            <ColorSwatches
              groupLabel="Randfarbe"
              farben={rand}
              value={data.sehen?.rand}
              onChange={(v) => setField('sehen', 'rand', v)}
            />
          </View>
        )}
        {renderSkalen('sehen', ['viskositaet', 'perlage'])}
      </>
    );
  } else if (step === 'riechen') {
    const fehler = visibleFehler(level, data.riechen?.zustand);
    body = (
      <>
        {renderSkalen('riechen')}
        <View style={styles.field}>
          <FieldLabel label="Zustand" />
          <OptionRow<NasenZustand>
            groupLabel="Zustand der Nase"
            options={[
              { id: 'sauber', label: ZUSTAND_LABELS.sauber },
              { id: 'auffaellig', label: ZUSTAND_LABELS.auffaellig },
            ]}
            value={data.riechen?.zustand}
            onChange={(v) => setField('riechen', 'zustand', v)}
          />
          {fehler.length > 0 && (
            <View style={styles.subBlock}>
              <FieldLabel
                label={AROMEN.fehler.label}
                onHelp={() =>
                  setHelp({
                    title: AROMEN.fehler.label,
                    text: AROMEN.fehler.beschreibung,
                    anker: AROMEN.fehler.aromen.map((a) => a.label),
                    lektion: AROMEN.fehler.lektion,
                  })
                }
              />
              <Text style={styles.fieldHint}>Was fällt dir auf? Mehrfachauswahl möglich.</Text>
              <View style={styles.chipWrap}>
                {fehler.map((f) => {
                  const selected = (data.riechen?.fehler ?? []).includes(f.id);
                  return (
                    <Chip
                      key={f.id}
                      label={f.label}
                      selected={selected}
                      onPress={() => setField('riechen', 'fehler', toggleId(data.riechen?.fehler, f.id))}
                      accessibilityLabel={`Fehlnote ${f.label}${selected ? ', gewählt' : ''}`}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>
        {isFieldVisible('aromen', level) && (
          <View style={styles.field}>
            <FieldLabel label="Aromen" />
            <AromaPicker
              stufen={visibleAromaStufen(kategorie, level)}
              selectedIds={[...naseAromen.primaer, ...naseAromen.sekundaer, ...naseAromen.tertiaer]}
              isSelected={(stufe, id) => naseAromen[stufe].includes(id)}
              onToggle={toggleNase}
              onFamilyHelp={familyHelp}
            />
          </View>
        )}
      </>
    );
  } else if (step === 'schmecken') {
    body = (
      <>
        {renderSkalen('schmecken')}
        {isFieldVisible('aromen_gaumen', level) && (
          <View style={styles.field}>
            <FieldLabel label="Aromen am Gaumen" />
            <AromaPicker
              stufen={visibleAromaStufen(kategorie, level)}
              selectedIds={gaumen}
              isSelected={(_, id) => gaumen.includes(id)}
              onToggle={(_, id) => setField('schmecken', 'aromen_gaumen', toggleId(gaumen, id))}
              emptyHint="Welche Aromen schmeckst du im Mund? Öffne eine Familie und tippe an."
              onFamilyHelp={familyHelp}
            />
          </View>
        )}
      </>
    );
  } else if (step === 'terroir') {
    const eindruecke = data.terroir?.eindruecke ?? [];
    const klima = TERROIR.klima_eindruck.optionen.find((o) => o.id === data.terroir?.klima_eindruck);
    const tipp = data.terroir?.boden_tipp ?? null;
    const tippOption = TERROIR.boeden.optionen.find((o) => o.id === tipp);
    // Im Blind-Modus kein Vergleich mit dem Eintrag (der würde den Wein verraten); er folgt in der Auflösung.
    const vergleich = blind ? null : bodenVergleichText(compareBoden(tipp, bodenEintrag));
    body = (
      <>
        {isFieldVisible('eindruecke', level) && (
          <View style={styles.field}>
            <FieldLabel
              label={TERROIR.eindruecke.label}
              onHelp={() =>
                setHelp({
                  title: TERROIR.eindruecke.label,
                  text: 'Herkunftseindrücke beschreiben, was der Wein über Boden, Klima und Lage verraten könnte. Wähle alles, was dir auffällt.',
                  lektion: TERROIR.eindruecke.lektion,
                })
              }
            />
            <Text style={styles.fieldHint}>Mehrfachauswahl möglich.</Text>
            <View style={styles.optionList}>
              {TERROIR.eindruecke.optionen.map((o) => {
                const selected = eindruecke.includes(o.id);
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.optionItem, selected && styles.optionItemSelected]}
                    onPress={() => setField('terroir', 'eindruecke', toggleId(eindruecke, o.id))}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${o.label}: ${o.erklaerung ?? ''}`}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? colors.accent : colors.textMuted}
                    />
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, selected && { color: colors.accent }]}>{o.label}</Text>
                      {o.erklaerung ? <Text style={styles.optionHelp}>{o.erklaerung}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        {isFieldVisible('klima_eindruck', level) && (
          <View style={styles.field}>
            <FieldLabel
              label={TERROIR.klima_eindruck.label}
              onHelp={() =>
                setHelp({
                  title: TERROIR.klima_eindruck.label,
                  text: 'Säure, Reife der Frucht und Alkohol geben Hinweise darauf, ob die Trauben in einem kühlen oder warmen Klima gewachsen sind.',
                  anker: TERROIR.klima_eindruck.optionen.map((o) => `${o.label}: ${o.erklaerung ?? ''}`),
                  lektion: TERROIR.klima_eindruck.lektion,
                })
              }
            />
            <OptionRow<string>
              groupLabel="Klimaeindruck"
              options={TERROIR.klima_eindruck.optionen.map((o) => ({ id: o.id, label: o.label }))}
              value={data.terroir?.klima_eindruck ?? undefined}
              onChange={(v) => setField('terroir', 'klima_eindruck', v ?? null)}
            />
            {klima?.erklaerung ? <Text style={styles.fieldHintBelow}>{klima.erklaerung}</Text> : null}
          </View>
        )}
        {isFieldVisible('boden_tipp', level) && (
          <View style={styles.field}>
            <FieldLabel
              label={TERROIR.boeden.label}
              onHelp={() => setHelp({ title: TERROIR.boeden.label, text: TERROIR.hinweis, lektion: TERROIR.boeden.lektion })}
            />
            <Text style={styles.fieldHint}>Auf welchen Boden tippst du? Einfachauswahl, freiwillig.</Text>
            <OptionRow<string>
              groupLabel="Dein Tipp zum Boden"
              options={TERROIR.boeden.optionen.map((o) => ({ id: o.id, label: o.label }))}
              value={tipp ?? undefined}
              onChange={(v) => setField('terroir', 'boden_tipp', v ?? null)}
            />
            {tippOption?.verbunden_mit ? <Text style={styles.fieldHintBelow}>{tippOption.verbunden_mit}</Text> : null}
            {vergleich ? (
              <View style={styles.subBlock}>
                <HintBox text={vergleich} icon="git-compare-outline" />
              </View>
            ) : null}
            <Text style={styles.disclaimer}>{BODEN_HINWEIS}</Text>
          </View>
        )}
      </>
    );
  } else if (step === 'tipp') {
    const jahrgang = tipps.jahrgang_tipp ?? '';
    body = (
      <>
        <View style={styles.field}>
          <FieldLabel label="Weinart" />
          <OptionRow<string>
            groupLabel="Weinart"
            options={WEINART_TIPP_WERTE.map((w) => ({ id: w, label: w }))}
            value={tipps.weinart_tipp}
            onChange={(v) => setTipp('weinart_tipp', v)}
          />
        </View>
        <View style={styles.field}>
          <FieldLabel label="Land" />
          <CatalogPicker
            items={LAENDER}
            selected={tipps.land_tipp ? [tipps.land_tipp] : []}
            max={1}
            onChange={(ids) => setTipp('land_tipp', ids[0])}
            placeholder="Land suchen, zum Beispiel Italien"
            groupLabel="Land"
          />
        </View>
        <View style={styles.field}>
          <FieldLabel label="Region" />
          <TextInput
            style={styles.input}
            value={tipps.region_tipp ?? ''}
            onChangeText={(t) => setTipp('region_tipp', t)}
            placeholder="Zum Beispiel Mosel oder Rioja"
            placeholderTextColor={colors.textMuted}
            maxLength={REGION_TIPP_MAX_LENGTH}
            autoCorrect={false}
            accessibilityLabel="Dein Tipp zur Region"
          />
        </View>
        <View style={styles.field}>
          <FieldLabel label="Rebsorte" />
          <Text style={styles.fieldHint}>Bis zu {REBSORTEN_TIPP_MAX}. Auch andere Namen werden gefunden, zum Beispiel Pinot Noir.</Text>
          <CatalogPicker
            items={REBSORTEN}
            selected={tipps.rebsorten_tipp ?? []}
            max={REBSORTEN_TIPP_MAX}
            onChange={(ids) => setTipp('rebsorten_tipp', ids)}
            placeholder="Rebsorte suchen"
            groupLabel="Rebsorte"
          />
        </View>
        <View style={styles.field}>
          <FieldLabel label="Jahrgang" />
          <TextInput
            style={[styles.input, styles.inputShort]}
            value={jahrgang}
            onChangeText={(t) => setTipp('jahrgang_tipp', cleanJahrgangInput(t))}
            placeholder="z. B. 2019"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Dein Tipp zum Jahrgang, vierstellig"
          />
          {jahrgang.length > 0 && jahrgang.length < 4 ? (
            <Text style={styles.fieldHintBelow}>Bitte vierstellig, zum Beispiel 2019.</Text>
          ) : null}
        </View>
      </>
    );
  } else if (step === 'fazit') {
    const notiz = data.fazit?.notiz ?? '';
    body = (
      <>
        {renderSkalen('fazit')}
        <View style={styles.field}>
          <FieldLabel label="Trinkreife" />
          <OptionRow<Trinkreife>
            groupLabel="Trinkreife"
            options={(Object.keys(TRINKREIFE_LABELS) as Trinkreife[]).map((t) => ({ id: t, label: TRINKREIFE_LABELS[t] }))}
            value={data.fazit?.trinkreife}
            onChange={(v) => setField('fazit', 'trinkreife', v)}
          />
        </View>
        {isFieldVisible('lagerpotenzial', level) && (
          <View style={styles.field}>
            <FieldLabel label="Lagerpotenzial" />
            <OptionRow<Lagerpotenzial>
              groupLabel="Lagerpotenzial"
              options={(Object.keys(LAGERPOTENZIAL_LABELS) as Lagerpotenzial[]).map((t) => ({ id: t, label: LAGERPOTENZIAL_LABELS[t] }))}
              value={data.fazit?.lagerpotenzial}
              onChange={(v) => setField('fazit', 'lagerpotenzial', v)}
            />
          </View>
        )}
        <View style={styles.field}>
          <FieldLabel label="Notiz" />
          <TextInput
            style={styles.notiz}
            value={notiz}
            onChangeText={(t) => setField('fazit', 'notiz', t)}
            placeholder="Was ist dir besonders aufgefallen?"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={NOTIZ_MAX_LENGTH}
            textAlignVertical="top"
            accessibilityLabel="Notiz zur Verkostung"
          />
          <View style={styles.notizFoot}>
            <View style={styles.privateHint}>
              <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
              <Text style={styles.privateHintText}>Nur für dich sichtbar.</Text>
            </View>
            <Text style={styles.privateHintText}>{Array.from(notiz).length}/{NOTIZ_MAX_LENGTH}</Text>
          </View>
        </View>
        {/* Blindverkostung: keine Sterne im Fazit, das würde ohne Kenntnis des Weins bewerten. */}
        {!blind && (
          <View style={styles.field}>
            <FieldLabel label="Gesamtnote" />
            <StarInput
              value={stars}
              onChange={(n) => {
                starsTouched.current = true;
                setStars(n);
              }}
            />
            <Text style={styles.fieldHintBelow}>Die Sterne werden als deine Bewertung im Weinkeller gespeichert.</Text>
          </View>
        )}
        {saveError && (
          <View style={styles.field}>
            <HintBox tone="error" text={`${saveError} Dein Zwischenstand bleibt erhalten.`} />
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <CloseButton onPress={goToWine} />
            <Text style={styles.topTitle} numberOfLines={1}>
              {wineTitle}
              <Text style={styles.topLevel}>{'  ·  '}{levelLabel(level).toUpperCase()}</Text>
            </Text>
          </View>
          <View style={styles.progressWrap}>
            <StepProgress steps={steps} labels={STEP_LABELS} current={step} filled={filled} focus={lessonCtx.focus} />
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {taskBox}
          <Text style={styles.stepTitle}>{STEP_LABELS[step]}</Text>
          <Text style={styles.stepText}>{STEP_TEXTE[step]}</Text>
          <View style={styles.divider} />
          {body}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label="Zurück"
            variant="outline"
            onPress={() => goStep(prev)}
            disabled={!prev || saving}
            style={styles.footerButton}
          />
          {isLast ? (
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={save}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={
                blind
                  ? saveError ? 'Erneut auflösen' : 'Auflösen: Verkostung speichern und Wein zeigen'
                  : saveError ? 'Erneut speichern' : 'Verkostung speichern'
              }
            >
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {blind ? (saveError ? 'Erneut auflösen' : 'Auflösen') : saveError ? 'Erneut speichern' : 'Speichern'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <PrimaryButton
              label={filled.includes(step) ? 'Weiter' : 'Überspringen'}
              onPress={() => goStep(stepAfter(steps, step))}
              style={styles.footerButton}
            />
          )}
        </View>
      </KeyboardAvoidingView>

      <InfoSheet
        visible={!!help}
        title={help?.title ?? ''}
        text={help?.text ?? ''}
        anker={help?.anker}
        lessonLink={help ? linkFor(help.lektion) : undefined}
        onOpenLesson={openLesson}
        onClose={() => setHelp(null)}
      />
    </SafeAreaView>
  );
}

// ── Rahmen und Hinweise ───────────────────────────────────────────────────────

function Screen({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {onClose && (
        <View style={styles.topBar}>
          <View style={styles.topRow}>
            <CloseButton onPress={onClose} />
          </View>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

function Notice({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.notice}>
        <Ionicons name="wine-outline" size={36} color={colors.accentMuted} />
        <Text style={styles.noticeText}>{text}</Text>
        <PrimaryButton label="Zurück" variant="outline" onPress={onBack} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },

  topBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: TOUCH },
  topTitle: { flex: 1, color: colors.text, fontSize: 15, fontStyle: 'italic' },
  topLevel: { color: colors.accent, fontSize: 11, fontStyle: 'normal', fontWeight: '700', letterSpacing: 2 },
  progressWrap: { marginTop: spacing.md, marginHorizontal: spacing.xs },

  wineHead: { marginBottom: spacing.lg },
  eyebrow: { color: colors.accent, letterSpacing: 3, fontSize: 11, fontWeight: '700' },
  wineName: { color: colors.text, fontSize: 26, fontWeight: '700', marginTop: spacing.sm, lineHeight: 32 },
  wineInfo: { color: colors.textMuted, fontStyle: 'italic', fontSize: 15, marginTop: 4 },

  sectionTitle: { color: colors.accent, fontSize: 12, letterSpacing: 3, fontWeight: '700', marginBottom: spacing.sm },
  levelList: { gap: spacing.sm },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  levelCardSelected: { borderColor: colors.accent },
  levelText: { flex: 1 },
  levelTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  footHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md, textAlign: 'center' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  questionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  mutedText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'left' },
  center: { textAlign: 'center' },
  fullButton: { marginTop: spacing.lg, alignSelf: 'stretch' },
  fullButtonSecondary: { marginTop: spacing.sm, alignSelf: 'stretch' },

  doneHead: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  doneTitle: { color: colors.accent, fontSize: 20, fontWeight: '700' },
  gapBottom: { marginBottom: spacing.md },
  gapTop: { marginTop: spacing.md },
  gapTopSmall: { marginTop: spacing.sm },
  starCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    minHeight: TOUCH,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputShort: { width: 140 },

  stepTitle: { color: colors.accent, fontSize: 24, fontWeight: '300', fontStyle: 'italic', lineHeight: 31 },
  stepText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  divider: { width: 36, height: 1, backgroundColor: colors.accent, marginVertical: spacing.md },

  field: { marginBottom: spacing.lg },
  fieldHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: spacing.sm },
  fieldHintBelow: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm, fontStyle: 'italic' },
  disclaimer: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  subBlock: { marginTop: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  optionList: { gap: spacing.sm },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionItemSelected: { borderColor: colors.accent },
  optionText: { flex: 1 },
  optionLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  optionHelp: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },

  notiz: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 100,
  },
  notizFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  privateHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateHintText: { color: colors.textMuted, fontSize: 12 },

  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerButton: { flex: 1 },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: colors.background, fontSize: 15, fontWeight: '600', letterSpacing: 1 },

  notice: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  noticeText: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
});
