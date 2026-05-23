import { Switch, Text, View } from 'react-native';
import { TimeWheelPicker } from '../TimeWheelPicker';
import { useAIScheduleTaskInput } from './context';
import { TaskTimeDropdownActions } from './TaskTimeDropdownActions';
import { colors } from '../../theme/colors';
import { fromWheelTime, toWheelTime } from '../../utils/time';

type Props = {
  onConfirmAdd: () => void;
};

export function TaskTimePanel({ onConfirmAdd }: Props) {
  const {
    aiEnabled,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTimeValidation,
    onToggleAiEnabled,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onCancelTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
  } = useAIScheduleTaskInput();

  const hasTimeError = Boolean(!aiEnabled && selectedTimeValidation?.error);

  return (
    <View className="border-t border-warm3 px-5 py-[10px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] font-medium tracking-[-0.11px] text-ink">AI Scheduling</Text>
        <Switch
          testID="ai-schedule-toggle"
          value={aiEnabled}
          onValueChange={onToggleAiEnabled}
          trackColor={{ false: '#D8D3CB', true: '#01C21B' }}
          thumbColor={colors.white}
          ios_backgroundColor="#D8D3CB"
        />
      </View>

      {aiEnabled ? (
        <View className="mt-3 rounded-2xl border border-warm3 bg-[rgba(35,36,34,0.02)] px-4 py-3">
          <Text className="text-[11px] leading-[18px] tracking-[-0.11px] text-warm">
            Based on your preferences and routine, AI will automatically assign the optimal time
            slot for this workout.
          </Text>
        </View>
      ) : (
        <>
          <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
            Start
          </Text>
          <TimeWheelPicker
            value={toWheelTime(selectedTaskStart)}
            onChange={(value) => onChangeSelectedStart(fromWheelTime(value))}
            width={305}
            onInteractionStart={onTimeInteractionStart}
            onInteractionEnd={onTimeInteractionEnd}
          />

          <View className="mt-[10px] h-px bg-warm3" />

          <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
            End
          </Text>
          <TimeWheelPicker
            value={toWheelTime(selectedTaskEnd)}
            onChange={(value) => onChangeSelectedEnd(fromWheelTime(value))}
            width={305}
            onInteractionStart={onTimeInteractionStart}
            onInteractionEnd={onTimeInteractionEnd}
          />

          {selectedTimeValidation?.error ? (
            <Text
              testID="ai-schedule-time-error"
              className="mt-3 text-[12px] leading-[18px] tracking-[-0.12px] text-[#B42318]"
            >
              {selectedTimeValidation.error}
            </Text>
          ) : null}

          {selectedTimeValidation?.pastNotice ? (
            <Text
              testID="ai-schedule-time-past-notice"
              className="mt-3 text-[12px] leading-[18px] tracking-[-0.12px] text-warm"
            >
              {selectedTimeValidation.pastNotice}
            </Text>
          ) : null}
        </>
      )}

      <TaskTimeDropdownActions
        onCancel={onCancelTaskTimeEdit}
        onAdd={onConfirmAdd}
        addDisabled={hasTimeError}
      />
    </View>
  );
}
