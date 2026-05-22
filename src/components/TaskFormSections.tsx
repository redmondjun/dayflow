import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { TimeWheelPicker } from './TimeWheelPicker';
import { colors } from '../theme/colors';
import type { TaskStatus } from '../types/task';

const quickAdd = ['Morning walk', 'Read 30 min', 'Lunch break', 'Review notes', 'Planning'];

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

export function TaskFormHeader({ onCancel }: { onCancel: () => void }) {
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

export function TaskTimeFields({
  mode,
  title,
  onChangeTitle,
  titleInputRef,
  timeRangeLabel,
  start,
  end,
  onChangeStart,
  onChangeEnd,
  onDelete,
  onClearTitle,
}: {
  mode: 'create' | 'edit';
  title: string;
  onChangeTitle: (value: string) => void;
  titleInputRef: React.RefObject<RNTextInput | null>;
  timeRangeLabel: string;
  start: string;
  end: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onDelete?: () => void;
  onClearTitle: () => void;
}) {
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
          />
        </View>

        <View className="px-5">
          <View className="h-px bg-warm3" />
        </View>

        <View className="px-5 py-[10px]">
          <Text className="pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
            End
          </Text>
          <TimeWheelPicker value={end} onChange={onChangeEnd} containerClassName="self-stretch" />
        </View>
      </View>
    </View>
  );
}

export function TaskDurationNotice({
  validation,
  durationLabel,
}: {
  validation: string | null;
  durationLabel: string;
}) {
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

export function TaskQuickAddSection({
  title,
  onSelect,
}: {
  title: string;
  onSelect: (value: string) => void;
}) {
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
            onPress={() => onSelect(label)}
          />
        ))}
      </View>
    </View>
  );
}

export function TaskStatusSection({
  status,
  onChangeStatus,
}: {
  status: TaskStatus;
  onChangeStatus: (value: TaskStatus) => void;
}) {
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
