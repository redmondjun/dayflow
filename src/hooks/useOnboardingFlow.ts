import { useRef, useState } from 'react';
import { canAdvanceOnboardingStep } from '../components/OnboardingStepContent';
import {
  defaultOnboardingAnswers,
  getVisibleOnboardingSteps,
  onboardingSteps,
  type OnboardingAnswer,
} from '../features/onboarding';

type Params = {
  initialAnswers?: Record<string, OnboardingAnswer>;
  onExit?: () => void;
  onSubmit: (answers: Record<string, OnboardingAnswer>) => Promise<void> | void;
};

export function useOnboardingFlow({
  initialAnswers = defaultOnboardingAnswers,
  onExit,
  onSubmit,
}: Params) {
  const [currentStepId, setCurrentStepId] = useState(onboardingSteps[0].id);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, OnboardingAnswer>>(initialAnswers);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [screenScrollEnabled, setScreenScrollEnabled] = useState(true);
  const savingRef = useRef(false);
  const scrollLockCountRef = useRef(0);

  const steps = getVisibleOnboardingSteps(answers);
  const stepIndex = Math.max(
    0,
    steps.findIndex((item) => item.id === currentStepId),
  );
  const step = steps[stepIndex] ?? steps[0];
  const selectedValue = answers[step.id];

  const lockScreenScroll = () => {
    scrollLockCountRef.current += 1;
    if (scrollLockCountRef.current === 1) setScreenScrollEnabled(false);
  };

  const unlockScreenScroll = () => {
    scrollLockCountRef.current = Math.max(0, scrollLockCountRef.current - 1);
    if (scrollLockCountRef.current === 0) setScreenScrollEnabled(true);
  };

  const goBack = () => {
    setSaveError(null);
    const previousStep = steps[stepIndex - 1];
    if (!previousStep) {
      onExit?.();
      return;
    }
    setCurrentStepId(previousStep.id);
  };

  const goNext = async () => {
    const nextStep = steps[stepIndex + 1];
    if (nextStep) {
      setSaveError(null);
      setCurrentStepId(nextStep.id);
      return;
    }

    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      setSaveError(null);
      await onSubmit(answers);
      setCompleted(true);
    } catch {
      setSaveError("Couldn't save your onboarding profile. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const updateAnswer = (value: OnboardingAnswer) => {
    setSaveError(null);
    setAnswers((current) => ({
      ...current,
      [step.id]: value,
    }));
  };

  return {
    canNext: canAdvanceOnboardingStep(step, selectedValue),
    completed,
    currentQuestionNumber: stepIndex + 1,
    goBack,
    goNext,
    lockScreenScroll,
    progressLabel: `${stepIndex + 1}/${steps.length}`,
    saveError,
    saving,
    screenScrollEnabled,
    selectedValue,
    step,
    stepIndex,
    steps,
    unlockScreenScroll,
    updateAnswer,
  };
}
