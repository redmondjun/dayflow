import { createContext, useContext } from 'react';
import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { TimeWheelPicker } from './TimeWheelPicker';
import { colors } from '../theme/colors';
import type { TaskStatus } from '../types/task';

const quickAdd = ['Morning walk', 'Read 30 min', 'Lunch break', 'Review notes', 'Planning'];

type TaskFormSectionsContextValue = {
  mode: 'create' | 'edit';
  title: string;
  status: TaskStatus;
  validation: string | null;
  durationLabel: string;
  timeRangeLabel: string;
  start: string;
  end: string;
  titleInputRef: React.RefObject<RNTextInput | null>;
  onCancel: () => void;
  onDelete?: () => void;
  onChangeTitle: (value: string) => void;
  onClearTitle: () => void;
  onSelectQuickAdd: (value: string) => void;
  onChangeStatus: (value: TaskStatus) => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
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

function StepDots() {
  return (
    <View className="flex-row items-center gap-[5px]">
      <View className="h-[3px] w-[22px] rounded-full bg-ink" />
      <View className="h-[3px] w-[6px] rounded-full bg-ink2" />
      <View className="h-[3px] w-[6px] rounded-full bg-ink2" />
      <View className="h-[3px] w-[6px] rounded-full bg-ink2" />
    </View>
  );
}

function QuickAddChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-[14px] py-[7px] ${
        active ? 'border border-warm3 bg-paper' : 'bg-[rgba(35,36,34,0.05)]'
      }`}
    >
      <Text className={`text-[13px] tracking-[-0.13px] ${active ? 'text-warm' : 'text-warm2'}`}>
        {active ? `+  ${label}` : label}
      </Text>
    </Pressable>
  );
}

export function TaskFormHeader() {
  const { onCancel } = useTaskFormSectionsContext();

  return (
    <View className="px-6 pt-7">
      <View className="flex-row items-center justify-between">
        <StepDots />
        <Button mode="text" compact textColor={colors.warm} onPress={onCancel}>
          Close
        </Button>
      </View>

      <Text className="pt-4 text-[34px] font-bold tracking-[-1.36px] text-ink">Plan your day</Text>
      <Text className="pt-2 text-[15px] tracking-[-0.15px] text-warm">
        Add your tasks and set a time for each.
      </Text>
    </View>
  );
}

export function TaskTimeFields() {
  const {
    mode,
    title,
    onChangeTitle,
    titleInputRef,
    timeRangeLabel,
    start,
    end,
    onChangeStart,
    onChangeEnd,
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
            placeholder={mode === 'edit' ? 'Task name' : 'Add a task'}
            placeholderTextColor={colors.warm}
            className="flex-1 text-[32px] font-bold tracking-[-0.96px] text-ink"
          />
          <View className="rounded-full bg-[rgba(35,36,34,0.07)] px-[10px] py-[5px]">
            <Text className="text-[10px] tracking-[-0.1px] text-ink">{timeRangeLabel}</Text>
          </View>
          <Pressable onPress={mode === 'edit' ? onDelete : onClearTitle}>
            <Text className="text-[12px] text-warm">x</Text>
          </Pressable>
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
        </View>

        <View className="px-5">
          <View className="h-px bg-warm3" />
        </View>

        <View className="px-5 py-[10px]">
          <Text className="pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
            End
          </Text>
          <TimeWheelPicker
            value={end}
            onChange={onChangeEnd}
            containerClassName="self-stretch"
            onInteractionStart={onTimeInteractionStart}
            onInteractionEnd={onTimeInteractionEnd}
          />
        </View>
      </View>
    </View>
  );
}

export function TaskDurationNotice() {
  const { validation, durationLabel } = useTaskFormSectionsContext();

  return (
    <>
      <View className="flex-row items-center gap-[7px] px-6 pt-3">
        <View className="h-1 w-1 rounded-full bg-accent" />
        <Text className="text-[12px] tracking-[0.12px] text-ink2">
          No need to set time - we&apos;ll organize your day.
        </Text>
      </View>

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
        {quickAdd.map((label) => (
          <QuickAddChip
            key={label}
            label={label}
            active={title.trim() !== label}
            onPress={() => onSelectQuickAdd(label)}
          />
        ))}
      </View>
    </View>
  );
}

export function TaskStatusSection({
  status: statusProp,
  onChangeStatus: onChangeStatusProp,
  showLabel = true,
  containerClassName = 'px-6 pt-8',
}: {
  status?: TaskStatus;
  onChangeStatus?: (value: TaskStatus) => void;
  showLabel?: boolean;
  containerClassName?: string;
} = {}) {
  const context = useContext(TaskFormSectionsContext);
  const status = statusProp ?? context?.status;
  const onChangeStatus = onChangeStatusProp ?? context?.onChangeStatus;

  if (!status || !onChangeStatus) {
    throw new Error('Task status section context is missing.');
  }

  return (
    <View className={containerClassName}>
      {showLabel ? (
        <Text className="pb-3 text-[11px] font-medium uppercase tracking-[-0.11px] text-warm2">
          State
        </Text>
      ) : null}
      <View className="flex-row rounded-full bg-warm4 p-1">
        {(['scheduled', 'skipped', 'completed'] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => onChangeStatus(option)}
            className={`h-[38px] flex-1 items-center justify-center rounded-full ${
              status === option ? 'bg-paper' : 'bg-transparent'
            }`}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className={`text-[13px] font-medium tracking-[-0.065px] ${
                status === option ? 'text-ink' : 'text-warm'
              }`}
            >
              {option === 'scheduled' ? 'Active' : option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
