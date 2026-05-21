import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, TextInput as RNTextInput, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { Task, TaskStatus } from '../types/task';
import { formatDisplayTime } from '../utils/time';

type Props = {
  mode: 'create' | 'edit';
  title: string;
  start: string;
  end: string;
  status: TaskStatus;
  durationLabel: string;
  dayLabel?: string;
  previousTask?: Task;
  nextTask?: Task;
  validation: string | null;
  loading: boolean;
  error: string | null;
  onDismissError: () => void;
  onChangeTitle: (value: string) => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeStatus: (value: TaskStatus) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

const wheelItemHeight = 34;
const wheelHeight = 182;
const hourOptions = Array.from({ length: 9 }, (_, index) => String(index + 3));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const meridiemOptions = ['AM', 'PM'];
const quickAdd = ['Morning walk', 'Read 30 min', 'Lunch break', 'Review notes', 'Planning'];

function parseTimeValue(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(value ?? '');
  return {
    hour: match?.[1] ?? '7',
    minute: match?.[2] ?? '00',
    meridiem: (match?.[3] ?? 'AM').toUpperCase(),
  };
}

function toWheelTime(value: string) {
  const [hoursText = '0', minutesText = '0'] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '7:00 AM';
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

function fromWheelTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return '07:00';
  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  const hours24 = meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTimeRange(start: string, end: string) {
  return `${toWheelTime(start)} - ${toWheelTime(end)}`;
}

function formatEditTime(value: string) {
  return toWheelTime(value).toLowerCase();
}

function formatTaskTimeRange(task: Task) {
  return `${formatDisplayTime(task.startTime).toLowerCase()} - ${formatDisplayTime(
    task.endTime,
  ).toLowerCase()}`;
}

function WheelColumn({
  options,
  selectedValue,
  onChange,
  width,
  align = 'center',
}: {
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  width: number;
  align?: 'left' | 'center' | 'right';
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(selectedValue));

  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * wheelItemHeight,
      animated: false,
    });
  }, [selectedIndex]);

  return (
    <View style={{ width, height: wheelHeight }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={wheelItemHeight}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ paddingVertical: (wheelHeight - wheelItemHeight) / 2 }}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.y / wheelItemHeight);
          onChange(options[Math.max(0, Math.min(options.length - 1, nextIndex))]);
        }}
      >
        {options.map((item, index) => {
          const selected = index === selectedIndex;
          const alignClass =
            align === 'right' ? 'items-end' : align === 'left' ? 'items-start' : 'items-center';
          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              style={{ height: wheelItemHeight, paddingHorizontal: 8 }}
              className={`${alignClass} justify-center`}
            >
              <Text
                className={`tracking-[-0.2px] ${
                  selected
                    ? 'text-[24px] font-medium text-ink'
                    : 'text-[18px] font-normal text-ink opacity-30'
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimeWheelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseTimeValue(value);

  return (
    <View className="relative items-center self-stretch" style={{ height: wheelHeight }}>
      <View
        className="absolute left-0 right-0 rounded-[10px] bg-[rgba(35,36,34,0.04)]"
        style={{ top: (wheelHeight - 36) / 2, height: 36 }}
      />
      <View className="absolute left-0 right-0 flex-row items-center justify-center">
        <WheelColumn
          options={hourOptions}
          selectedValue={parsed.hour}
          width={84}
          align="right"
          onChange={(hour) => onChange(`${hour}:${parsed.minute} ${parsed.meridiem}`)}
        />
        <WheelColumn
          options={minuteOptions}
          selectedValue={parsed.minute}
          width={86}
          onChange={(minute) => onChange(`${parsed.hour}:${minute} ${parsed.meridiem}`)}
        />
        <WheelColumn
          options={meridiemOptions}
          selectedValue={parsed.meridiem}
          width={92}
          align="left"
          onChange={(meridiem) => onChange(`${parsed.hour}:${parsed.minute} ${meridiem}`)}
        />
      </View>
    </View>
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

function EditTimelineRow({
  label,
  title,
  time,
  active = false,
}: {
  label: string;
  title?: string;
  time?: string;
  active?: boolean;
}) {
  return (
    <View className="min-h-[72px] flex-row items-center">
      <View className="w-[52px] items-center">
        <View
          className={`h-[13px] w-[13px] rounded-full ${
            active ? 'bg-ink' : 'border-[2px] border-warm bg-paper'
          }`}
        />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-medium uppercase tracking-[1.8px] text-warm">
          {label}
        </Text>
        <Text
          className={`mt-0.5 ${
            active
              ? 'text-[17px] font-bold tracking-[0.17px] text-ink'
              : 'text-[13px] font-medium tracking-[0.13px] text-warm'
          }`}
        >
          {title}
        </Text>
      </View>
      {time ? (
        <Text className={`text-[12px] ${active ? 'font-bold text-ink' : 'text-warm'}`}>{time}</Text>
      ) : null}
    </View>
  );
}

export function TaskFormView({
  mode,
  title,
  start,
  end,
  status,
  durationLabel,
  dayLabel,
  previousTask,
  nextTask,
  validation,
  loading,
  error,
  onDismissError,
  onChangeTitle,
  onChangeStart,
  onChangeEnd,
  onChangeStatus,
  onCancel,
  onSave,
}: Props) {
  const canSave = !validation && title.trim().length > 0 && !loading;
  const titleInputRef = useRef<RNTextInput>(null);
  const previousTitle = previousTask?.title ?? 'No previous task';
  const nextTitle = nextTask?.title ?? 'No next task';

  if (mode === 'edit') {
    return (
      <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
        <ScrollView contentContainerClassName="pb-24 pt-4">
          <View className="flex-row items-center justify-between px-6">
            <Button
              mode="text"
              compact
              textColor={colors.ink2}
              onPress={onCancel}
              labelStyle={{ fontSize: 15, fontWeight: '500', letterSpacing: 0.075 }}
            >
              Cancel
            </Button>
            <Text className="text-[11px] font-bold uppercase tracking-[2.42px] text-ink">
              Edit Task
            </Text>
            <Button
              mode="text"
              compact
              disabled={!canSave}
              textColor={colors.warm2}
              onPress={onSave}
              labelStyle={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.075 }}
            >
              Save
            </Button>
          </View>

          <View className="px-6 pt-8">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.98px] text-warm">
              Task
            </Text>
            <RNTextInput
              ref={titleInputRef}
              value={title}
              onChangeText={onChangeTitle}
              placeholder="Task name"
              placeholderTextColor={colors.warm}
              className="mt-3 border-b border-warm3 pb-5 text-[27px] font-bold tracking-[-0.6px] text-black"
            />
          </View>

          <View className="px-6 pt-7">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.98px] text-warm">
              Schedule
            </Text>
            <View className="mt-5 min-h-[142px] flex-row">
              <View className="relative w-[52px] items-center">
                <View className="absolute top-[4px] h-[13px] w-[13px] rounded-full bg-ink" />
                <View className="absolute top-[17px] h-[108px] w-[1.5px] bg-warm2" />
                <View className="absolute top-[125px] h-[13px] w-[13px] rounded-full border-[2px] border-warm bg-paper" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium uppercase tracking-[1.76px] text-warm">
                  Start
                </Text>
                <Text className="mt-3 border-b-2 border-accent pb-3 text-[24px] font-bold tracking-[-0.5px] text-black">
                  {formatEditTime(start)}
                </Text>
                <Text className="mt-7 text-[11px] font-medium uppercase tracking-[1.76px] text-warm">
                  End
                </Text>
                <Text className="mt-3 text-[24px] font-bold tracking-[-0.5px] text-black">
                  {formatEditTime(end)}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-6 pt-9">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.98px] text-warm">
              State
            </Text>
            <View className="mt-4 flex-row rounded-full bg-warm3 p-1">
              {(['scheduled', 'skipped', 'completed'] as const).map((option) => {
                const selected = status === option;
                const label =
                  option === 'scheduled' ? 'Active' : option[0].toUpperCase() + option.slice(1);

                return (
                  <Pressable
                    key={option}
                    onPress={() => onChangeStatus(option)}
                    className={`h-[38px] flex-1 items-center justify-center rounded-full ${
                      selected ? 'bg-paper' : ''
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-medium tracking-[-0.065px] ${
                        selected ? 'text-accent' : 'text-ink2'
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="px-6 pt-8">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.98px] text-warm">
                In your day
              </Text>
              {dayLabel ? (
                <Text className="text-[11px] font-semibold tracking-[0.44px] text-warm2">
                  {dayLabel}
                </Text>
              ) : null}
            </View>
            <View className="relative mt-6 min-h-[216px]">
              <View className="absolute left-[25px] top-[36px] h-[144px] w-[1.5px] bg-warm2" />
              <EditTimelineRow
                label="Previous"
                title={previousTitle}
                time={previousTask ? formatTaskTimeRange(previousTask) : ''}
              />
              <EditTimelineRow
                label="Current"
                title={title}
                time={`${formatEditTime(start)} - ${formatEditTime(end)}`}
                active
              />
              <EditTimelineRow
                label="Next"
                title={nextTitle}
                time={nextTask ? formatDisplayTime(nextTask.startTime).toLowerCase() : ''}
              />
            </View>
          </View>
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 bg-paper px-6 pb-7 pt-3">
          <Button
            mode="contained"
            buttonColor="rgba(35, 36, 34, 0.32)"
            textColor={colors.white}
            disabled={!canSave}
            loading={loading}
            onPress={onSave}
            style={{ borderRadius: 999 }}
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16, fontWeight: '700' }}
          >
            Save changes
          </Button>
        </View>

        <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={4000}>
          {error}
        </Snackbar>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="pb-40 pt-4">
        <View className="px-6 pt-7">
          <View className="flex-row items-center justify-between">
            <StepDots />
            <Button mode="text" compact textColor={colors.warm} onPress={onCancel}>
              Close
            </Button>
          </View>

          <Text className="pt-4 text-[34px] font-bold tracking-[-1.36px] text-ink">
            Plan your day
          </Text>
          <Text className="pt-2 text-[15px] tracking-[-0.15px] text-warm">
            Add your tasks and set a time for each.
          </Text>
        </View>

        <View className="px-6 pt-10">
          <View className="overflow-hidden rounded-2xl border border-warm3 bg-paper">
            <View className="flex-row items-center gap-2 border-b border-warm3 px-[18px] py-4">
              <View className="h-[5px] w-[5px] rounded-full bg-ink opacity-35" />
              <RNTextInput
                ref={titleInputRef}
                value={title}
                onChangeText={onChangeTitle}
                placeholder="Add a task"
                placeholderTextColor={colors.warm}
                className="flex-1 text-[32px] font-bold tracking-[-0.96px] text-ink"
              />
              <View className="rounded-full bg-[rgba(35,36,34,0.07)] px-[10px] py-[5px]">
                <Text className="text-[10px] tracking-[-0.1px] text-ink">
                  {formatTimeRange(start, end)}
                </Text>
              </View>
              <Pressable onPress={() => onChangeTitle('')}>
                <Text className="text-[12px] text-warm">x</Text>
              </Pressable>
            </View>

            <View className="px-5 py-[10px]">
              <Text className="pb-1 text-[11px] font-medium uppercase tracking-[-0.11px] text-ink">
                Start
              </Text>
              <TimeWheelPicker
                value={toWheelTime(start)}
                onChange={(value) => onChangeStart(fromWheelTime(value))}
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
                value={toWheelTime(end)}
                onChange={(value) => onChangeEnd(fromWheelTime(value))}
              />
            </View>
          </View>
        </View>

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
                onPress={() => onChangeTitle(label)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-paper px-4 pb-6 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor={colors.white}
          disabled={!canSave}
          loading={loading}
          onPress={onSave}
          style={{ borderRadius: 999 }}
          contentStyle={{ height: 54 }}
        >
          Confirm schedule
        </Button>
      </View>

      <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}
