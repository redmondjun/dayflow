import { useEffect, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  type OnboardingAnswer,
  type OnboardingCommitmentAnswer,
  type OnboardingStep,
} from '../features/onboarding';
import { TimeWheelPicker } from './TimeWheelPicker';

const customCommitmentOption = 'Custom';

function isCommitmentAnswer(
  value: OnboardingAnswer | undefined,
): value is OnboardingCommitmentAnswer {
  return typeof value === 'object' && value !== null && 'option' in value;
}

export function canAdvanceOnboardingStep(
  step: OnboardingStep,
  selectedValue: OnboardingAnswer | undefined,
) {
  if (step.kind === 'text') {
    return typeof selectedValue === 'string' && Boolean(selectedValue.trim());
  }
  if (step.kind !== 'commitments') return Boolean(selectedValue);
  if (!isCommitmentAnswer(selectedValue)) return false;
  if (selectedValue.option !== customCommitmentOption) return Boolean(selectedValue.option);
  return Boolean(
    selectedValue.option && selectedValue.startTime?.trim() && selectedValue.endTime?.trim(),
  );
}

export function OnboardingProgress({ total, activeIndex }: { total: number; activeIndex: number }) {
  return (
    <View className="flex-row items-center justify-between">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`h-[3px] rounded-full ${index === activeIndex ? 'bg-ink' : 'bg-warm3'}`}
          style={{ width: 27 }}
        />
      ))}
    </View>
  );
}

function OnboardingOptionCard({
  option,
  selected,
  centered = false,
  onPress,
}: {
  option: string;
  selected: boolean;
  centered?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-5 ${
        centered
          ? `h-[59px] rounded-[20px] border border-warm3 ${selected ? 'bg-ink' : 'bg-paper'}`
          : `min-h-[53px] rounded-2xl ${selected ? 'bg-ink' : 'border border-warm3 bg-paper'}`
      }`}
    >
      <Text
        className={`${
          centered
            ? `w-full text-center text-[22px] font-bold leading-[31px] tracking-[-0.44px] ${selected ? 'text-white' : 'text-ink'}`
            : `text-base ${selected ? 'font-semibold text-white' : 'text-ink'}`
        }`}
      >
        {option}
      </Text>
      {!centered && selected ? <Text className="text-base font-bold text-accent">✓</Text> : null}
    </Pressable>
  );
}

type Props = {
  step: OnboardingStep;
  selectedValue: OnboardingAnswer | undefined;
  onChange: (value: OnboardingAnswer) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function OnboardingStepContent({
  step,
  selectedValue,
  onChange,
  onInteractionStart,
  onInteractionEnd,
}: Props) {
  const selectedValueRef = useRef(selectedValue);

  useEffect(() => {
    selectedValueRef.current = selectedValue;
  }, [selectedValue]);

  const selectValue = (value: OnboardingAnswer) => {
    selectedValueRef.current = value;
    onChange(value);
  };

  const updateCustomCommitmentTime = (field: 'startTime' | 'endTime', time: string) => {
    const currentValue = selectedValueRef.current;
    const currentCommitment =
      isCommitmentAnswer(currentValue) && currentValue.option === customCommitmentOption
        ? currentValue
        : { option: customCommitmentOption, startTime: '7:00 AM', endTime: '9:00 AM' };
    selectValue({ ...currentCommitment, [field]: time });
  };

  if (step.kind === 'text') {
    return (
      <View className="px-6 pt-20">
        <TextInput
          value={typeof selectedValue === 'string' ? selectedValue : ''}
          onChangeText={selectValue}
          placeholder="Your name"
          placeholderTextColor="#A39E91"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          testID="onboarding-name-input"
          className="py-1 text-[32px] font-semibold leading-[38px] tracking-[0.51px] text-[#A39E91]"
        />
        <View className="mt-4 h-[2px] bg-warm3" />
      </View>
    );
  }

  if (step.kind === 'time') {
    return (
      <View className="flex-1 items-center justify-center px-6 py-12">
        <TimeWheelPicker
          value={typeof selectedValue === 'string' ? selectedValue : undefined}
          onChange={selectValue}
          onInteractionStart={onInteractionStart}
          onInteractionEnd={onInteractionEnd}
          width={324}
        />
        <Text
          className="mt-7 text-center text-[14px] tracking-[0.1px] text-warm"
          testID="onboarding-time-helper"
        >
          {step.helperLabel}:{' '}
          <Text className="font-semibold text-ink2">
            {typeof selectedValue === 'string' ? selectedValue : ''}
          </Text>
        </Text>
      </View>
    );
  }

  if (step.kind === 'commitments') {
    return (
      <View className="gap-3 px-6 pt-8">
        {step.options?.map((option) => {
          const selectedOption = isCommitmentAnswer(selectedValue) ? selectedValue.option : '';
          const selected = selectedOption === option;
          return (
            <OnboardingOptionCard
              key={option}
              option={option}
              selected={selected}
              onPress={() =>
                selectValue(
                  option === customCommitmentOption
                    ? {
                        option,
                        startTime:
                          isCommitmentAnswer(selectedValue) && selectedValue.option === option
                            ? (selectedValue.startTime ?? '7:00 AM')
                            : '7:00 AM',
                        endTime:
                          isCommitmentAnswer(selectedValue) && selectedValue.option === option
                            ? (selectedValue.endTime ?? '9:00 AM')
                            : '9:00 AM',
                      }
                    : { option },
                )
              }
            />
          );
        })}

        {isCommitmentAnswer(selectedValue) && selectedValue.option === customCommitmentOption ? (
          <View className="mt-1 rounded-[20px] border border-warm3 bg-paper px-5 pb-4 pt-3">
            <Text className="pb-1 text-[11px] font-medium uppercase tracking-[1.43px] text-warm">
              Start
            </Text>
            <TimeWheelPicker
              value={selectedValue.startTime}
              onChange={(startTime) => updateCustomCommitmentTime('startTime', startTime)}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              width={324}
            />
            <View className="py-5">
              <View className="h-px bg-warm3" />
            </View>
            <Text className="pb-1 text-[11px] font-medium uppercase tracking-[1.43px] text-warm">
              End
            </Text>
            <TimeWheelPicker
              value={selectedValue.endTime}
              onChange={(endTime) => updateCustomCommitmentTime('endTime', endTime)}
              onInteractionStart={onInteractionStart}
              onInteractionEnd={onInteractionEnd}
              width={324}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-3 px-6 pt-8">
      {step.options?.map((option) => (
        <OnboardingOptionCard
          key={option}
          option={option}
          selected={option === selectedValue}
          centered={step.selectionStyle === 'centered'}
          onPress={() => selectValue(option)}
        />
      ))}
    </View>
  );
}
