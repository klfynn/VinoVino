import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../../../theme';
import { useAuth } from '../../../../context/AuthContext';
import { Lektion, Slide, Tier } from '../../../../content/academy';
import { getLektion, getTierOfLektion, lektionLabel, nextLektion } from '../../../../content/academy/helpers';
import { isTierUnlocked } from '../../../../lib/academy/unlock';
import { useAcademyProgress } from '../../../../lib/academy/useAcademyProgress';
import { ergebnisText, newlyUnlockedTiers, QuizErgebnis, scoreQuiz } from '../../../../lib/academy/lesson';
import { CloseButton, ErrorState, LoadingState, PrimaryButton, ProgressBar } from '../../../../components/academy/AcademyUI';
import RichText, { InlineText } from '../../../../components/academy/RichText';
import UnlockModal from '../../../../components/academy/UnlockModal';
import { useQuizDraft } from '../../../../lib/academy/useQuizDraft';
import { resumeIndex } from '../../../../lib/academy/quizDraft';
import { loadSeenUnlocks, markUnlocksSeen } from '../../../../lib/academy/seenUnlocks';

type Phase = 'slides' | 'quiz' | 'ergebnis';
type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'anonym';
type Page = { kind: 'slide'; slide: Slide } | { kind: 'intro' };
type Progress = ReturnType<typeof useAcademyProgress>;

const SAVE_ERROR_MESSAGE = 'Dein Fortschritt konnte nicht gespeichert werden. Bitte prüfe deine Verbindung.';

// ── Gemeinsame Bausteine ──────────────────────────────────────────────────────

function Header({
  lektion,
  completed,
  done,
  total,
  onClose,
}: {
  lektion?: Lektion;
  completed?: boolean;
  done: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <CloseButton onPress={onClose} />
        {lektion && (
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              <Text style={styles.headerLabel}>{lektionLabel(lektion)}</Text>
              {'  ·  '}
              {lektion.titel}
            </Text>
            {completed && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.like}
                accessibilityLabel="Abgeschlossen"
              />
            )}
          </View>
        )}
      </View>
      <ProgressBar done={done} total={total} style={styles.headerProgress} />
    </View>
  );
}

function Notice({ icon, text, onBack }: { icon: keyof typeof Ionicons.glyphMap; text: string; onBack: () => void }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={36} color={colors.accentMuted} />
      <Text style={styles.noticeText}>{text}</Text>
      <PrimaryButton label="Zurück" variant="outline" onPress={onBack} />
    </View>
  );
}

// ── Phase 1: Slide-Karussell ──────────────────────────────────────────────────

function SlideCard({
  page,
  index,
  size,
  scrollX,
  lektion,
  bestScore,
  resumeAt,
  onStartQuiz,
  onResumeQuiz,
}: {
  page: Page;
  index: number;
  size: { width: number; height: number };
  scrollX: Animated.Value;
  lektion: Lektion;
  bestScore: number | null;
  resumeAt: number | null;
  onStartQuiz: () => void;
  onResumeQuiz: () => void;
}) {
  const inputRange = [(index - 1) * size.width, index * size.width, (index + 1) * size.width];
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' });
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' });

  return (
    <View style={[styles.page, size]}>
      <Animated.View style={[styles.slideCard, { opacity, transform: [{ scale }] }]}>
        {page.kind === 'slide' ? (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slideContent}
          >
            {index === 0 && (
              <View style={styles.lernziel}>
                <Text style={styles.lernzielLabel}>Lernziel</Text>
                <RichText text={lektion.lernziel} variant="small" />
              </View>
            )}
            <Text style={styles.slideTitle}>{page.slide.titel}</Text>
            <View style={styles.divider} />
            <RichText blocks={page.slide.blocks} />
          </ScrollView>
        ) : (
          <View style={styles.introContent}>
            <Ionicons name="wine-outline" size={40} color={colors.accent} />
            <Text style={styles.introTitle}>Bereit für das Quiz?</Text>
            <View style={styles.divider} />
            <Text style={styles.introText}>
              {lektion.quiz.length} Fragen
            </Text>
            {bestScore !== null && (
              <Text style={styles.introBest}>
                Bestwert: {bestScore} / {lektion.quiz.length}
              </Text>
            )}
            {resumeAt !== null ? (
              <>
                <PrimaryButton
                  label={`Quiz fortsetzen (Frage ${resumeAt} von ${lektion.quiz.length})`}
                  onPress={onResumeQuiz}
                  style={styles.introButton}
                />
                <PrimaryButton label="Neu beginnen" variant="ghost" onPress={onStartQuiz} style={styles.introSecondary} />
              </>
            ) : (
              <PrimaryButton label="Quiz starten" onPress={onStartQuiz} style={styles.introButton} />
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function SlidesPhase({
  lektion,
  index,
  onIndexChange,
  bestScore,
  resumeAt,
  onStartQuiz,
  onResumeQuiz,
}: {
  lektion: Lektion;
  index: number;
  onIndexChange: (index: number) => void;
  bestScore: number | null;
  resumeAt: number | null;
  onStartQuiz: () => void;
  onResumeQuiz: () => void;
}) {
  const pages = useMemo<Page[]>(
    () => [...lektion.slides.map((slide) => ({ kind: 'slide' as const, slide })), { kind: 'intro' as const }],
    [lektion],
  );
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const listRef = useRef<FlatList<Page>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastIndex = pages.length - 1;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // Nach einer Größenänderung (z. B. Drehen) auf der aktuellen Seite bleiben.
  useEffect(() => {
    if (!size) return;
    listRef.current?.scrollToOffset({ offset: index * size.width, animated: false });
    scrollX.setValue(index * size.width);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const onScroll = useMemo(
    () =>
      Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true },
      ),
    [scrollX],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!size) return;
      const next = Math.round(e.nativeEvent.contentOffset.x / size.width);
      onIndexChange(Math.max(0, Math.min(lastIndex, next)));
    },
    [size, lastIndex, onIndexChange],
  );

  const goTo = useCallback(
    (target: number) => {
      if (!size) return;
      const clamped = Math.max(0, Math.min(lastIndex, target));
      listRef.current?.scrollToOffset({ offset: clamped * size.width, animated: true });
      onIndexChange(clamped);
    },
    [size, lastIndex, onIndexChange],
  );

  const onIntro = index === lastIndex;

  return (
    <View style={styles.flex}>
      <View style={styles.flex} onLayout={onLayout}>
        {size && (
          <Animated.FlatList
            ref={listRef}
            data={pages}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, i) => ({ length: size.width, offset: size.width * i, index: i })}
            initialScrollIndex={index}
            windowSize={3}
            renderItem={({ item, index: i }) => (
              <SlideCard
                page={item}
                index={i}
                size={size}
                scrollX={scrollX}
                lektion={lektion}
                bestScore={bestScore}
                resumeAt={resumeAt}
                onStartQuiz={onStartQuiz}
                onResumeQuiz={onResumeQuiz}
              />
            )}
          />
        )}
      </View>

      <View style={styles.slideFooter}>
        <PrimaryButton
          label="Zurück"
          variant="ghost"
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          style={styles.footerButton}
        />
        <Text style={styles.counter} accessibilityLiveRegion="polite">
          {onIntro ? 'Quiz' : `${index + 1} / ${lektion.slides.length}`}
        </Text>
        {onIntro ? (
          <View style={styles.footerButton} />
        ) : (
          <PrimaryButton label="Weiter" variant="outline" onPress={() => goTo(index + 1)} style={styles.footerButton} />
        )}
      </View>
    </View>
  );
}

// ── Phase 2: Quiz ─────────────────────────────────────────────────────────────

function QuizPhase({
  lektion,
  index,
  answer,
  onAnswer,
  onNext,
}: {
  lektion: Lektion;
  index: number;
  answer: number | null;
  onAnswer: (option: number) => void;
  onNext: () => void;
}) {
  const frage = lektion.quiz[index];
  const answered = answer !== null;
  const isLast = index === lektion.quiz.length - 1;
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    reveal.setValue(0);
    if (answered) Animated.timing(reveal, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [answered, index, reveal]);

  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <ScrollView key={index} contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.quizLabel}>
        Frage {index + 1} von {lektion.quiz.length}
      </Text>
      <InlineText text={frage.frage} style={styles.question} />

      <View style={styles.options}>
        {frage.optionen.map((option, i) => {
          const isCorrect = i === frage.richtig;
          const isChosen = i === answer;
          const state = !answered ? 'idle' : isCorrect ? 'correct' : isChosen ? 'wrong' : 'muted';
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              disabled={answered}
              onPress={() => onAnswer(i)}
              accessibilityRole="button"
              accessibilityState={{ disabled: answered, selected: isChosen }}
              accessibilityLabel={`Antwort ${String.fromCharCode(65 + i)}: ${option}${
                state === 'correct' ? ', richtig' : state === 'wrong' ? ', falsch' : ''
              }`}
              style={[
                styles.option,
                state === 'correct' && styles.optionCorrect,
                state === 'wrong' && styles.optionWrong,
                state === 'muted' && styles.optionMuted,
              ]}
            >
              <View
                style={[
                  styles.optionLetter,
                  state === 'correct' && { borderColor: colors.like },
                  state === 'wrong' && { borderColor: colors.skip },
                ]}
              >
                <Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <InlineText text={option} style={styles.optionText} />
              {state === 'correct' && <Ionicons name="checkmark-circle" size={22} color={colors.like} />}
              {state === 'wrong' && <Ionicons name="close-circle" size={22} color={colors.skip} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {answered && (
        <Animated.View style={{ opacity: reveal, transform: [{ translateY }] }}>
          <View style={styles.explanation}>
            <Text style={[styles.explanationLabel, { color: answer === frage.richtig ? colors.like : colors.skip }]}>
              {answer === frage.richtig ? 'Richtig' : 'Nicht ganz'}
            </Text>
            <RichText text={frage.erklaerung} variant="small" />
          </View>
          <PrimaryButton label={isLast ? 'Ergebnis ansehen' : 'Weiter'} onPress={onNext} style={styles.quizNext} />
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ── Phase 3: Ergebnis ─────────────────────────────────────────────────────────

function ResultPhase({
  lektion,
  ergebnis,
  saveState,
  bestScore,
  unlocked,
  next,
  onRetrySave,
  onLogin,
  onRepeat,
  onNext,
  onOverview,
}: {
  lektion: Lektion;
  ergebnis: QuizErgebnis;
  saveState: SaveState;
  bestScore: number | null;
  unlocked: Tier[];
  next: Lektion | undefined;
  onRetrySave: () => void;
  onLogin: () => void;
  onRepeat: () => void;
  onNext: () => void;
  onOverview: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.quizLabel}>Ergebnis</Text>
      <Text style={styles.resultScore}>
        {ergebnis.richtig} von {ergebnis.gesamt} richtig
      </Text>
      <Text style={styles.resultMessage}>{ergebnisText(ergebnis)}</Text>

      <View style={styles.saveArea}>
        {saveState === 'saving' && (
          <View style={styles.saveRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.saveText}>Fortschritt wird gespeichert …</Text>
          </View>
        )}
        {saveState === 'saved' && (
          <View style={styles.saveRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.like} />
            <Text style={styles.saveText}>
              Fortschritt gespeichert{bestScore !== null ? ` · Bestwert ${bestScore} / ${lektion.quiz.length}` : ''}
            </Text>
          </View>
        )}
        {saveState === 'error' && (
          <View style={styles.saveError}>
            <View style={styles.saveRow}>
              <Ionicons name="cloud-offline-outline" size={18} color={colors.skip} />
              <Text style={styles.saveErrorText}>{SAVE_ERROR_MESSAGE}</Text>
            </View>
            <PrimaryButton label="Erneut speichern" variant="outline" onPress={onRetrySave} style={styles.saveButton} />
          </View>
        )}
        {saveState === 'anonym' && (
          <View style={styles.saveError}>
            <Text style={styles.saveText}>Melde dich an, um deinen Fortschritt zu speichern</Text>
            <PrimaryButton label="Anmelden" variant="outline" onPress={onLogin} style={styles.saveButton} />
          </View>
        )}
      </View>

      {unlocked.map((tier) => (
        <View key={tier.key} style={styles.unlockRow}>
          <Ionicons name="lock-open-outline" size={16} color={colors.accent} />
          <Text style={styles.unlockText}>Neues Tier freigeschaltet: {tier.name}</Text>
        </View>
      ))}

      <View style={styles.practice}>
        <Text style={styles.practiceTitle}>🍷 Praxisaufgabe</Text>
        <RichText text={lektion.praxisaufgabe} />
      </View>

      <View style={styles.resultButtons}>
        {next && <PrimaryButton label="Nächste Lektion" onPress={onNext} />}
        <PrimaryButton label="Quiz wiederholen" variant="outline" onPress={onRepeat} />
        <PrimaryButton label="Zur Übersicht" variant={next ? 'ghost' : 'filled'} onPress={onOverview} />
      </View>
    </ScrollView>
  );
}

// ── Ablauf einer freigeschalteten Lektion ─────────────────────────────────────

function LessonFlow({
  lektion,
  tier,
  progress,
  goToOverview,
}: {
  lektion: Lektion;
  tier: Tier;
  progress: Progress;
  goToOverview: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;
  const { completedIds, scores, markCompleted } = progress;
  const { draft, save: saveDraft, clear: clearDraft } = useQuizDraft(lektion.id, lektion.quiz);
  const fragenCount = lektion.quiz.length;

  const [phase, setPhase] = useState<Phase>('slides');
  const [slideIndex, setSlideIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => lektion.quiz.map(() => null));
  const [ergebnis, setErgebnis] = useState<QuizErgebnis | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [unlocked, setUnlocked] = useState<Tier[]>([]);
  const [unlockModal, setUnlockModal] = useState<Tier | null>(null);
  const saving = useRef(false);
  // Spiegel der Antworten für synchrone Prüfungen (Doppeltipp) und den Zwischenspeicher.
  const answersRef = useRef(answers);

  const setAllAnswers = useCallback((next: (number | null)[]) => {
    answersRef.current = next;
    setAnswers(next);
  }, []);

  const completed = completedIds.has(lektion.id);
  const bestScore = completed ? scores[lektion.id] ?? 0 : null;
  const next = useMemo(() => nextLektion(lektion.id), [lektion.id]);

  // Verlassen mitten im Quiz (X, Zurück-Geste, Android-Zurück) nur nach Bestätigung.
  // Der Zwischenstand liegt bereits lokal; die Datenbank wird hier nicht verändert.
  usePreventRemove(phase === 'quiz', ({ repeat }) => {
    Alert.alert('Quiz pausieren?', 'Dein Zwischenstand bleibt gespeichert.', [
      { text: 'Weiter üben', style: 'cancel' },
      {
        text: 'Pausieren',
        onPress: () => {
          setPhase('slides');
          repeat();
        },
      },
    ]);
  });

  const enterQuiz = useCallback(
    (initial: (number | null)[], index: number) => {
      setAllAnswers(initial);
      setQuizIndex(index);
      setErgebnis(null);
      setUnlocked([]);
      setSaveState('idle');
      setPhase('quiz');
    },
    [setAllAnswers],
  );

  // Neuer Durchlauf ab Frage 1 („Quiz starten", „Neu beginnen", „Quiz wiederholen").
  const startQuiz = useCallback(() => {
    clearDraft();
    enterQuiz(lektion.quiz.map(() => null), 0);
  }, [lektion, clearDraft, enterQuiz]);

  // Fortsetzen ab der ersten unbeantworteten Frage; bisherige Antworten zählen mit.
  const resumeQuiz = useCallback(() => {
    if (!draft) return startQuiz();
    enterQuiz([...draft.answers], resumeIndex(draft.answers));
  }, [draft, startQuiz, enterQuiz]);

  const save = useCallback(
    async (score: number) => {
      if (saving.current) return;
      if (!isAuthenticated) {
        setSaveState('anonym');
        return;
      }
      saving.current = true;
      setSaveState('saving');
      const before = completedIds;
      const result = await markCompleted(lektion.id, score);
      saving.current = false;
      if (result.ok) {
        const fresh = newlyUnlockedTiers(before, new Set([...before, lektion.id]));
        setUnlocked(fresh);
        setSaveState('saved');
        if (fresh.length > 0) {
          // Überlagerung nur einmal je Tier; danach genügt die Textzeile.
          const seen = await loadSeenUnlocks(userId);
          const first = fresh.find((t) => !seen.overlay.includes(t.key));
          if (first) {
            setUnlockModal(first);
            markUnlocksSeen(userId, 'overlay', [first.key]);
          }
        }
      } else {
        setSaveState('error');
      }
    },
    [isAuthenticated, completedIds, markCompleted, lektion.id, userId],
  );

  const answer = useCallback(
    (option: number) => {
      const current = answersRef.current;
      if (current[quizIndex] !== null) return; // gesperrt nach der ersten Auswahl
      const copy = [...current];
      copy[quizIndex] = option;
      setAllAnswers(copy);
      saveDraft(copy);
    },
    [quizIndex, setAllAnswers, saveDraft],
  );

  const nextQuestion = useCallback(() => {
    if (quizIndex < fragenCount - 1) {
      setQuizIndex(quizIndex + 1);
      return;
    }
    const result = scoreQuiz(lektion.quiz, answersRef.current);
    clearDraft();
    setErgebnis(result);
    setPhase('ergebnis');
    save(result.richtig);
  }, [quizIndex, fragenCount, lektion.quiz, clearDraft, save]);

  const handleClose = useCallback(() => {
    // Im Quiz greift usePreventRemove und fragt nach.
    goToOverview();
  }, [goToOverview]);

  const headerProgress =
    phase === 'slides'
      ? { done: Math.min(slideIndex + 1, lektion.slides.length), total: lektion.slides.length }
      : phase === 'quiz'
        ? { done: quizIndex + 1, total: fragenCount }
        : { done: 1, total: 1 };

  return (
    <>
      <Header lektion={lektion} completed={completed} {...headerProgress} onClose={handleClose} />

      {phase === 'slides' && (
        <SlidesPhase
          lektion={lektion}
          index={slideIndex}
          onIndexChange={setSlideIndex}
          bestScore={bestScore}
          resumeAt={draft ? resumeIndex(draft.answers) + 1 : null}
          onStartQuiz={startQuiz}
          onResumeQuiz={resumeQuiz}
        />
      )}

      {phase === 'quiz' && (
        <QuizPhase
          lektion={lektion}
          index={quizIndex}
          answer={answers[quizIndex] ?? null}
          onAnswer={answer}
          onNext={nextQuestion}
        />
      )}

      {phase === 'ergebnis' && ergebnis && (
        <ResultPhase
          lektion={lektion}
          ergebnis={ergebnis}
          saveState={saveState}
          bestScore={bestScore}
          unlocked={unlocked}
          next={next && isTierUnlocked(tier, completedIds) ? next : undefined}
          onRetrySave={() => save(ergebnis.richtig)}
          onLogin={() => router.push('/login')}
          onRepeat={startQuiz}
          onNext={() => next && router.replace({ pathname: '/academy/lesson/[id]', params: { id: next.id } })}
          onOverview={goToOverview}
        />
      )}

      <UnlockModal
        tier={unlockModal}
        onClose={() => setUnlockModal(null)}
        onOpenTier={(t) => {
          setUnlockModal(null);
          router.replace({ pathname: '/academy/tier/[key]', params: { key: t.key } });
        }}
      />
    </>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

function LessonScreenContent({ id }: { id: string | undefined }) {
  const router = useRouter();
  const lektion = id ? getLektion(id) : undefined;
  const tier = id ? getTierOfLektion(id) : undefined;
  const progress = useAcademyProgress();

  const goToOverview = useCallback(() => {
    if (router.canGoBack()) router.back();
    else if (tier) router.replace({ pathname: '/academy/tier/[key]', params: { key: tier.key } });
    else router.replace('/academy');
  }, [router, tier]);

  if (!lektion || !tier) {
    return (
      <>
        <Header done={0} total={1} onClose={goToOverview} />
        <Notice icon="help-circle-outline" text="Lektion nicht gefunden" onBack={goToOverview} />
      </>
    );
  }

  // Tier 1 und Bonus sind immer frei – dafür muss der Fortschritt nicht geladen sein.
  const alwaysOpen = isTierUnlocked(tier, new Set());
  if (!alwaysOpen && progress.loading) {
    return (
      <>
        <Header lektion={lektion} done={0} total={1} onClose={goToOverview} />
        <LoadingState />
      </>
    );
  }
  if (!alwaysOpen && progress.error) {
    return (
      <>
        <Header lektion={lektion} done={0} total={1} onClose={goToOverview} />
        <ErrorState message={progress.error} onRetry={progress.refresh} />
      </>
    );
  }
  if (!isTierUnlocked(tier, progress.completedIds)) {
    return (
      <>
        <Header done={0} total={1} onClose={goToOverview} />
        <Notice
          icon="lock-closed-outline"
          text={`Schließe zuerst alle Pflichtlektionen von Tier ${(tier.tier ?? 1) - 1} ab`}
          onBack={goToOverview}
        />
      </>
    );
  }

  return <LessonFlow lektion={lektion} tier={tier} progress={progress} goToOverview={goToOverview} />;
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* key: Beim Wechsel zur nächsten Lektion startet der Ablauf frisch. */}
      <LessonScreenContent key={id} id={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Kopfzeile
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontStyle: 'italic',
  },
  headerLabel: {
    color: colors.accent,
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerProgress: {
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },

  // Hinweise (nicht gefunden / gesperrt)
  notice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  noticeText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },

  // Slides
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  slideCard: {
    flex: 1,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  slideContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  lernziel: {
    paddingBottom: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lernzielLabel: {
    color: colors.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs + 2,
  },
  slideTitle: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '300',
    fontStyle: 'italic',
    lineHeight: 31,
  },
  divider: {
    width: 36,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: spacing.md,
  },
  introContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  introTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '300',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  introText: {
    color: colors.textMuted,
    fontSize: 15,
    letterSpacing: 1,
  },
  introBest: {
    color: colors.accent,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  introButton: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  introSecondary: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  slideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  footerButton: {
    minWidth: 104,
  },
  counter: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 1.5,
  },

  // Quiz
  quizContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quizLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  question: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '300',
    lineHeight: 31,
    marginTop: spacing.md,
  },
  options: {
    marginTop: spacing.lg,
    gap: spacing.sm + 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionCorrect: {
    borderColor: colors.like,
    backgroundColor: 'rgba(126, 207, 160, 0.12)',
  },
  optionWrong: {
    borderColor: colors.skip,
    backgroundColor: 'rgba(192, 96, 122, 0.14)',
  },
  optionMuted: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  explanation: {
    marginTop: spacing.lg,
    padding: spacing.md + 2,
    borderRadius: radii.md,
    backgroundColor: colors.cardElevated,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs + 2,
  },
  quizNext: {
    marginTop: spacing.lg,
  },

  // Ergebnis
  resultContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  resultScore: {
    color: colors.accent,
    fontSize: 36,
    fontWeight: '300',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  resultMessage: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  saveArea: {
    marginTop: spacing.md,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saveText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },
  saveError: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  saveErrorText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  saveButton: {
    marginTop: spacing.md,
    minHeight: 42,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  unlockText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  practice: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  practiceTitle: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  resultButtons: {
    marginTop: spacing.xl,
    gap: spacing.sm + 4,
  },
});
