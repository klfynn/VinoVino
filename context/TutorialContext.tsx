import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TUTORIAL_SEEN_KEY = '@vinovino_tutorial_seen';

const TOTAL_COACH_MARKS = 5;

interface TutorialContextValue {
  coachMarkStep: number | null;
  startCoachMarks: () => void;
  nextCoachMark: () => void;
  finishCoachMarks: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [coachMarkStep, setCoachMarkStep] = useState<number | null>(null);

  const startCoachMarks = useCallback(() => {
    setCoachMarkStep(0);
  }, []);

  const nextCoachMark = useCallback(() => {
    setCoachMarkStep((prev) => {
      if (prev === null || prev >= TOTAL_COACH_MARKS - 1) return null;
      return prev + 1;
    });
  }, []);

  const finishCoachMarks = useCallback(async () => {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    setCoachMarkStep(null);
  }, []);

  const value = useMemo<TutorialContextValue>(
    () => ({ coachMarkStep, startCoachMarks, nextCoachMark, finishCoachMarks }),
    [coachMarkStep, startCoachMarks, nextCoachMark, finishCoachMarks],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
