import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompletionState, PillActionButton } from '../components/LightScreenPrimitives';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { OnboardingStepContent } from '../components/OnboardingStepContent';
import { defaultOnboardingAnswers, type OnboardingAnswer } from '../features/onboarding';
import { OnboardingFlowHeader } from './OnboardingFlowHeader';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';

type Props = {
  initialAnswers?: Record<string, OnboardingAnswer>;
  onExit?: () => void;
  onFinish: () => void;
  onSubmit: (answers: Record<string, OnboardingAnswer>) => Promise<void> | void;
};

export function OnboardingFlowView({
  initialAnswers = defaultOnboardingAnswers,
  onExit,
  onFinish,
  onSubmit,
}: Props) {
  const {
    canNext,
    completed,
    currentQuestionNumber,
    goBack,
    goNext,
    lockScreenScroll,
    progressLabel,
    saveError,
    saving,
    screenScrollEnabled,
    selectedValue,
    step,
    stepIndex,
    steps,
    unlockScreenScroll,
    updateAnswer,
  } = useOnboardingFlow({ initialAnswers, onExit, onSubmit });

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

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']} testID="onboarding-root">
      <ScrollView
        scrollEnabled={screenScrollEnabled}
        nestedScrollEnabled
        contentContainerClassName="flex-grow pb-28 pt-20"
      >
        <OnboardingFlowHeader
          progressLabel={progressLabel}
          questionNumber={currentQuestionNumber}
          stepIndex={stepIndex}
          title={step.question}
          totalSteps={steps.length}
          onBack={goBack}
          canExit={Boolean(onExit)}
        />

        <OnboardingStepContent
          step={step}
          selectedValue={selectedValue}
          onInteractionStart={lockScreenScroll}
          onInteractionEnd={unlockScreenScroll}
          onChange={updateAnswer}
        />
      </ScrollView>

      <StickyBottomBar className="px-6 pb-7 pt-5">
        {saveError ? (
          <Text className="mb-3 text-center text-sm text-danger">{saveError}</Text>
        ) : null}
        <PillActionButton
          label="Next"
          disabled={!canNext || saving}
          loading={saving}
          buttonColor={canNext ? '#01B224' : '#E8E3D7'}
          textColor={canNext ? undefined : '#8A857A'}
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
          onPress={goNext}
        />
      </StickyBottomBar>
    </SafeAreaView>
  );
}
