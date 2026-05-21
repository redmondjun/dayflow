import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompletionState, PillActionButton } from '../components/LightScreenPrimitives';
import {
  canAdvanceOnboardingStep,
  OnboardingProgress,
  OnboardingStepContent,
} from '../components/OnboardingStepContent';
import {
  defaultOnboardingAnswers,
  getVisibleOnboardingSteps,
  onboardingSteps,
  type OnboardingAnswer,
} from '../features/onboarding';
import type { RootStackParamList } from '../navigation/types';
import { getOnboardingProfile, saveOnboardingProfile } from '../services/onboardingProfile';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type EmbeddedProps = {
  onExit: () => void;
};

type Props = RouteProps | EmbeddedProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

export function OnboardingScreen(props: Props) {
  const isRoute = isRouteProps(props);
  const editMode = isRoute && props.route.params?.mode === 'edit';
  const onExit = isRoute ? undefined : props.onExit;
  const onFinish = isRoute ? () => props.navigation.navigate('Home') : props.onExit;
  const [currentStepId, setCurrentStepId] = useState(onboardingSteps[0].id);
  const [completed, setCompleted] = useState(false);
  const [answers, setAnswers] =
    useState<Record<string, OnboardingAnswer>>(defaultOnboardingAnswers);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [screenScrollEnabled, setScreenScrollEnabled] = useState(true);
  const savingRef = useRef(false);
  const scrollLockCountRef = useRef(0);

  useEffect(() => {
    if (!editMode) {
      setLoadingProfile(false);
      return;
    }

    let mounted = true;
    setLoadingProfile(true);
    getOnboardingProfile()
      .then((profile) => {
        if (!mounted || !profile) return;
        setAnswers({ ...defaultOnboardingAnswers, ...profile });
      })
      .catch(() => {
        if (mounted) setAnswers(defaultOnboardingAnswers);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [editMode]);

  if (loadingProfile) return null;

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
      await saveOnboardingProfile(answers);
      setCompleted(true);
    } catch {
      setSaveError("Couldn't save your onboarding profile. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (completed) {
    return (
      <CompletionState
        title="All set!"
        body="We'll build your perfect daily schedule around your rhythm."
        actionLabel="Get Started"
        onAction={onFinish}
      />
    );
  }

  const progressLabel = `${stepIndex + 1}/${steps.length}`;
  const canNext = canAdvanceOnboardingStep(step, selectedValue);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']} testID="onboarding-root">
      <ScrollView
        scrollEnabled={screenScrollEnabled}
        nestedScrollEnabled
        contentContainerClassName="flex-grow pb-28 pt-20"
      >
        <View className="flex-row items-center gap-3 px-6">
          <Pressable
            onPress={goBack}
            disabled={stepIndex === 0}
            testID="onboarding-back-button"
            className={`h-[34px] w-[34px] items-center justify-center rounded-full ${
              stepIndex === 0 ? 'opacity-0' : 'bg-warm3'
            }`}
          >
            <Text className="text-2xl text-ink">‹</Text>
          </Pressable>
          <View className="flex-1">
            <OnboardingProgress total={steps.length} activeIndex={stepIndex} />
          </View>
          <Text className="text-[12px] font-medium tracking-[0.1px] text-warm">
            {progressLabel}
          </Text>
        </View>

        <View className="px-6 pt-11">
          <Text className="text-[11px] font-medium uppercase tracking-[1.8px] text-warm">
            Question {stepIndex + 1}
          </Text>
          <Text className="mt-3 text-[30px] font-bold leading-[38px] tracking-[-0.9px] text-ink">
            {step.question}
          </Text>
        </View>

        <OnboardingStepContent
          step={step}
          selectedValue={selectedValue}
          onInteractionStart={lockScreenScroll}
          onInteractionEnd={unlockScreenScroll}
          onChange={(value) => {
            setSaveError(null);
            setAnswers((current) => ({
              ...current,
              [step.id]: value,
            }));
          }}
        />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-paper px-6 pb-7 pt-5">
        {saveError ? <Text className="mb-3 text-center text-sm text-danger">{saveError}</Text> : null}
        <PillActionButton
          label="Next"
          disabled={!canNext || saving}
          loading={saving}
          buttonColor={canNext ? '#01B224' : '#E8E3D7'}
          textColor={canNext ? undefined : '#8A857A'}
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
          onPress={goNext}
        />
      </View>
    </SafeAreaView>
  );
}
