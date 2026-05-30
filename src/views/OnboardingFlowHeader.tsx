import { Pressable, Text, View } from 'react-native';
import { OnboardingProgress } from '../components/OnboardingStepContent';

type Props = {
  progressLabel: string;
  questionNumber: number;
  stepIndex: number;
  title: string;
  totalSteps: number;
  onBack: () => void;
  canExit?: boolean;
};

export function OnboardingFlowHeader({
  progressLabel,
  questionNumber,
  stepIndex,
  title,
  totalSteps,
  onBack,
  canExit = false,
}: Props) {
  const showBack = stepIndex > 0 || canExit;

  return (
    <>
      <View className="flex-row items-center gap-3 px-6">
        <Pressable
          onPress={onBack}
          disabled={!showBack}
          testID="onboarding-back-button"
          className={`h-[34px] w-[34px] items-center justify-center rounded-full ${
            showBack ? 'bg-warm3' : 'opacity-0'
          }`}
        >
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
        <View className="flex-1">
          <OnboardingProgress total={totalSteps} activeIndex={stepIndex} />
        </View>
        <Text className="text-[12px] font-medium tracking-[0.1px] text-warm">{progressLabel}</Text>
      </View>

      <View className="px-6 pt-11">
        <Text className="text-[11px] font-medium uppercase tracking-[1.8px] text-warm">
          Question {questionNumber}
        </Text>
        <Text className="mt-3 text-[30px] font-bold leading-[38px] tracking-[-0.9px] text-ink">
          {title}
        </Text>
      </View>
    </>
  );
}
