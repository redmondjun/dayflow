import { createContext, useContext } from 'react';
import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { DurationWheelPicker } from './aiSchedule/DurationWheelPicker';
import {
  ManualTimeDerivedLabel,
  ManualTimeInputModeToggle,
} from './aiSchedule/ManualTimeInputModeToggle';
import { TaskRowRemoveButton } from './aiSchedule/TaskRowRemoveButton';
import { PlannerHeader, QuickAddChip } from './LightScreenPrimitives';
import { TimeWheelPicker } from './TimeWheelPicker';
import { colors } from '../theme/colors';
import { plannerQuickAdd } from '../features/taskPlanning';
import type { ManualTimeInputMode, TaskStatus } from '../types/task';
import { formatDisplayTime } from '../utils/time';

type TaskFormSectionsContextValue = {
  mode: 'create' | 'edit';
  title: string;
  description: string;
  status: TaskStatus;
  validation: string | null;
  durationLabel: string;
  timeRangeLabel: string;
  start: string;
  end: string;
  durationMinutes: number;
  timeInputMode: ManualTimeInputMode;
  syncedEndTime: string;
  titleInputRef: React.RefObject<RNTextInput | null>;
  onCancel: () => void;
  onDelete?: () => void;
  onChangeTitle: (value: string) => void;
  onTitleBlur: () => void;
  onChangeDescription: (value: string) => void;
  onClearTitle: () => void;
  onSelectQuickAdd: (value: string) => void;
  onChangeStatus: (value: TaskStatus) => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeDuration: (minutes: number) => void;
  onChangeTimeInputMode: (mode: ManualTimeInputMode) => void;
  onTimeInteractionStart: () => void;
  onTimeInteractionEnd: () => void;
};

const TaskFormSectionsContext = createContext<TaskFormSectionsContextValue | null>(null);

function useTaskFormSectionsContext() {
  const value = useContext(TaskFormSectionsContext);
  if (!value) {
    throw new Error('Task form sections context is missing.');
  }
  return value;
}

export function TaskFormSectionsProvider({
  value,
  children,
}: {
  value: TaskFormSectionsContextValue;
  children: React.ReactNode;
}) {
  return (
    <TaskFormSectionsContext.Provider value={value}>{children}</TaskFormSectionsContext.Provider>
  );
}

export function TaskFormHeader() {
  const { onCancel } = useTaskFormSectionsContext();

  return (
    <PlannerHeader
      title="Plan your day"
      subtitle="Add your tasks and set a time for each."
      action={
        <Button mode="text" compact textColor={colors.warm} onPress={onCancel}>
          Close
        </Button>
      }
    />
  );
}

export function TaskTimeFields() {
  const {
    mode,
    title,
    onChangeTitle,
    onTitleBlur,
    titleInputRef,
    timeRangeLabel,
    start,
    end,
    durationMinutes,
    durationLabel,
    timeInputMode,
    syncedEndTime,
    onChangeStart,
    onChangeEnd,
    onChangeDuration,
    onChangeTimeInputMode,
    onTimeInteractionStart,
    onTimeInteractionEnd,
    onDelete,
    onClearTitle,
  } = useTaskFormSectionsContext();

  return (
    <View className="px-6 pt-10">
      <View className="overflow-hidden rounded-2xl border border-warm3 bg-paper">
        <View className="flex-row items-center gap-2 border-b border-warm3 px-[18px] py-4">
          <View className="h-[5px] w-[5px] rounded-full bg-ink opacity-35" />
          <RNTextInput
            ref={titleInputRef}
            value={title}
            onChangeText={onChangeTitle}
            onBlur={onTitleBlur}
            placeholder={mode === 'edit' ? 'Task name' : 'Add a task'}
            placeholderTextColor={colors.warm}
            className="flex-1 text-[32px] font-bold tracking-[-0.96px] text-ink"
          />
          <View className="rounded-full bg-[rgba(35,36,34,0.07)] px-[10px] py-[5px]">
            <Text className="text-[10px] tracking-[-0.1px] text-ink">{timeRangeLabel}</Text>
          </View>
          {mode === 'edit' && onDelete ? (
            <TaskRowRemoveButton testID="task-form-delete-button" onPress={onDelete} size="lg" />
          ) : (
            <Pressable
              testID="task-form-clear-title-button"
              onPress={onClearTitle}
              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-warm4"
            >
              <Text className="text-[14px] font-semibold text-warm">x</Text>
            </Pressable>
          )}
        </View>

        <View className="px-5 py-[10px]">
          <Text className="pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
            Start
          </Text>
          <TimeWheelPicker
            value={start}
            onChange={onChangeStart}
            containerClassName="self-stretch"
            onInteractionStart={onTimeInteractionStart}
            onInteractionEnd={onTimeInteractionEnd}
          />

          <ManualTimeInputModeToggle mode={timeInputMode} onChange={onChangeTimeInputMode} />

          {timeInputMode === 'duration' ? (
            <>
              <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                Duration
              </Text>
              <DurationWheelPicker
                testID="task-form-duration-input"
                value={durationMinutes}
                onChange={onChangeDuration}
                onInteractionStart={onTimeInteractionStart}
                onInteractionEnd={onTimeInteractionEnd}
              />
              <ManualTimeDerivedLabel
                label={`Ends ${formatDisplayTime(syncedEndTime)} · ${durationLabel}`}
              />
            </>
          ) : (
            <>
              <View className="mt-[10px] h-px bg-warm3" />
              <Text className="pb-1 pt-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                End
              </Text>
              <TimeWheelPicker
                value={end}
                onChange={onChangeEnd}
                containerClassName="self-stretch"
                onInteractionStart={onTimeInteractionStart}
                onInteractionEnd={onTimeInteractionEnd}
              />
              <ManualTimeDerivedLabel label={`Duration ${durationLabel}`} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

export function TaskDescriptionField() {
  const { description, onChangeDescription } = useTaskFormSectionsContext();

  return (
    <View className="px-6 pt-6">
      <Text className="pb-2 text-[11px] font-medium uppercase tracking-[-0.11px] text-warm2">
        Description
      </Text>
      <RNTextInput
        testID="task-form-description-input"
        value={description}
        onChangeText={onChangeDescription}
        placeholder="Add details (optional)"
        placeholderTextColor={colors.warm}
        multiline
        style={{ textAlignVertical: 'top' }}
        className="min-h-[72px] rounded-2xl border border-warm3 bg-paper px-4 py-3 text-[13px] tracking-[-0.13px] text-ink"
      />
    </View>
  );
}

export function TaskDurationNotice() {
  const { validation, durationLabel } = useTaskFormSectionsContext();

  return (
    <>
      {validation ? (
        <Text className="px-6 pt-3 text-sm text-danger">{validation}</Text>
      ) : (
        <Text className="px-6 pt-3 text-sm text-warm">Duration: {durationLabel}</Text>
      )}
    </>
  );
}

export function TaskQuickAddSection() {
  const { title, onSelectQuickAdd } = useTaskFormSectionsContext();

  return (
    <View className="px-6 pt-10">
      <Text className="pb-[14px] text-[11px] font-medium uppercase tracking-[-0.11px] text-warm2">
        Quick add
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {plannerQuickAdd.map((label) => (
          <QuickAddChip
            key={label}
            label={label}
            emphasized={title.trim() !== label}
            onPress={() => onSelectQuickAdd(label)}
          />
        ))}
      </View>
    </View>
  );
}

export function TaskStatusSection() {
  const { status, onChangeStatus } = useTaskFormSectionsContext();

  return (
    <View className="px-6 pt-8">
      <Text className="pb-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-warm2">
        State
      </Text>
      <View className="flex-row rounded-full bg-warm4 p-1">
        {(['scheduled', 'skipped', 'completed'] as const).map((option) => (
          <Button
            key={option}
            mode={status === option ? 'contained' : 'text'}
            onPress={() => onChangeStatus(option)}
            buttonColor={status === option ? colors.paper : 'transparent'}
            textColor={status === option ? colors.ink : colors.warm}
            style={{ flex: 1, borderRadius: 999 }}
          >
            {option === 'scheduled' ? 'Active' : option}
          </Button>
        ))}
      </View>
    </View>
  );
}
