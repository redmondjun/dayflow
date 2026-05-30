import { Switch, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { TimeWheelPicker } from '../TimeWheelPicker';
import { DurationWheelPicker } from './DurationWheelPicker';
import { ManualTimeDerivedLabel, ManualTimeInputModeToggle } from './ManualTimeInputModeToggle';
import { useAIScheduleTaskInput } from './context';
import { TaskTimeDropdownActions } from './TaskTimeDropdownActions';
import { colors } from '../../theme/colors';
import { formatDuration, fromWheelTime, toWheelTime } from '../../utils/time';

type Props = {
  onConfirmAdd: () => void;
};

export function TaskTimePanel({ onConfirmAdd }: Props) {
  const {
    aiAvailable,
    selectedRowAiScheduled,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTaskDuration,
    selectedTimeInputMode,
    selectedTimeValidation,
    selectedTaskDescription,
    selectedTaskEstimatedDuration,
    onToggleRowAiScheduled,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onChangeSelectedDuration,
    onChangeSelectedTimeInputMode,
    onChangeDescription,
    onChangeEstimatedDuration,
    onCancelTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
    isSubmitting,
  } = useAIScheduleTaskInput();

  const hasTimeError = Boolean(!selectedRowAiScheduled && selectedTimeValidation?.error);
  const { width: windowWidth } = useWindowDimensions();
  const pickerWidth = Math.min(305, windowWidth - 88);
  const derivedEndLabel =
    selectedTaskStart && selectedTaskEnd
      ? `Ends ${toWheelTime(selectedTaskEnd)} · ${formatDuration(selectedTaskDuration)}`
      : '';
  const derivedDurationLabel =
    selectedTaskStart && selectedTaskEnd ? `Duration ${formatDuration(selectedTaskDuration)}` : '';

  return (
    <View
      className={`border-t border-warm3 px-5 py-[10px] ${isSubmitting ? 'opacity-45' : ''}`}
      pointerEvents={isSubmitting ? 'none' : 'auto'}
    >
      <Text className="pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
        Description
      </Text>
      <TextInput
        testID="ai-schedule-description-input"
        value={selectedTaskDescription ?? ''}
        onChangeText={onChangeDescription}
        placeholder="Add details (optional)"
        placeholderTextColor={colors.warm}
        multiline
        style={{ textAlignVertical: 'top' }}
        className="min-h-[56px] rounded-2xl border border-warm3 bg-white px-4 py-3 text-[13px] tracking-[-0.13px] text-ink"
      />

      {aiAvailable ? (
        <>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-medium tracking-[-0.11px] text-ink">
              AI Scheduling
            </Text>
            <Switch
              testID="ai-schedule-toggle"
              value={selectedRowAiScheduled}
              onValueChange={onToggleRowAiScheduled}
              trackColor={{ false: '#D8D3CB', true: '#01C21B' }}
              thumbColor={colors.white}
              ios_backgroundColor="#D8D3CB"
            />
          </View>

          {selectedRowAiScheduled ? (
            <View className="mt-3 rounded-2xl border border-warm3 bg-[rgba(35,36,34,0.02)] px-4 py-3">
              <Text className="text-[11px] leading-[18px] tracking-[-0.11px] text-warm">
                Based on your preferences and routine, AI will automatically assign the optimal time
                slot for this task.
              </Text>
              <Text className="mt-3 pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                Estimated duration (optional)
              </Text>
              <DurationWheelPicker
                testID="ai-schedule-estimated-duration-input"
                value={selectedTaskEstimatedDuration}
                optional
                onChange={(minutes) => onChangeEstimatedDuration(minutes > 0 ? minutes : 0)}
                width={pickerWidth}
                onInteractionStart={onTimeInteractionStart}
                onInteractionEnd={onTimeInteractionEnd}
              />
              <Text className="mt-2 text-[11px] leading-[18px] tracking-[-0.11px] text-warm">
                AI may shorten this if your day does not have enough free time.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {!selectedRowAiScheduled ? (
        <>
          <Text
            className={`pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink ${aiAvailable ? 'pt-3' : 'pt-0'}`}
          >
            Start
          </Text>
          <TimeWheelPicker
            value={toWheelTime(selectedTaskStart)}
            onChange={(value) => onChangeSelectedStart(fromWheelTime(value))}
            width={pickerWidth}
            onInteractionStart={onTimeInteractionStart}
            onInteractionEnd={onTimeInteractionEnd}
          />

          <ManualTimeInputModeToggle
            mode={selectedTimeInputMode}
            onChange={onChangeSelectedTimeInputMode}
          />

          {selectedTimeInputMode === 'duration' ? (
            <>
              <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                Duration
              </Text>
              <DurationWheelPicker
                testID="ai-schedule-duration-input"
                value={selectedTaskDuration}
                onChange={onChangeSelectedDuration}
                width={pickerWidth}
                onInteractionStart={onTimeInteractionStart}
                onInteractionEnd={onTimeInteractionEnd}
              />
              {derivedEndLabel ? <ManualTimeDerivedLabel label={derivedEndLabel} /> : null}
            </>
          ) : (
            <>
              <View className="mt-[10px] h-px bg-warm3" />
              <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                End
              </Text>
              <TimeWheelPicker
                value={toWheelTime(selectedTaskEnd)}
                onChange={(value) => onChangeSelectedEnd(fromWheelTime(value))}
                width={pickerWidth}
                onInteractionStart={onTimeInteractionStart}
                onInteractionEnd={onTimeInteractionEnd}
              />
              {derivedDurationLabel ? (
                <ManualTimeDerivedLabel label={derivedDurationLabel} />
              ) : null}
            </>
          )}

          {selectedTimeValidation?.error ? (
            <Text
              testID="ai-schedule-time-error"
              className="mt-3 text-[12px] leading-[18px] tracking-[-0.12px]"
              style={{ color: colors.danger }}
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
      ) : null}

      <TaskTimeDropdownActions
        onCancel={onCancelTaskTimeEdit}
        onAdd={onConfirmAdd}
        addDisabled={hasTimeError}
        disabled={isSubmitting}
      />
    </View>
  );
}
