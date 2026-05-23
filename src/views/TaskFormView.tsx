import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput as RNTextInput, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TaskDurationNotice,
  TaskFormHeader,
  TaskQuickAddSection,
  TaskFormSectionsProvider,
  TaskStatusSection,
  TaskTimeFields,
} from '../components/TaskFormSections';
import { colors } from '../theme/colors';
import type { Task, TaskStatus } from '../types/task';
import {
  formatDisplayTime,
  formatDuration,
  formatInputTime,
  formatWheelTimeRange,
  fromWheelTime,
  parseTimeInput,
  toWheelTime,
} from '../utils/time';
import type { EditableTaskForm } from '../navigation/types';

export type TaskFormSubmit = {
  title: string;
  start: string;
  end: string;
  status: TaskStatus;
  startTime: string;
  endTime: string;
};

type Props = {
  mode: 'create' | 'edit';
  initialTask?: EditableTaskForm;
  dayLabel?: string;
  previousTask?: Task;
  nextTask?: Task;
  loading: boolean;
  error: string | null;
  onDismissError?: () => void;
  onCancel: () => void;
  onSave: (values: TaskFormSubmit) => void | Promise<void>;
  onDelete?: () => void;
};

function getDefaultTimes() {
  const start = new Date();
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 45);
  return { start, end };
}

function formatEditTime(value: string) {
  return toWheelTime(value).toLowerCase();
}

function formatTaskTimeRange(task: Task) {
  return `${formatDisplayTime(task.startTime).toLowerCase()} - ${formatDisplayTime(
    task.endTime,
  ).toLowerCase()}`;
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
  initialTask,
  dayLabel,
  previousTask,
  nextTask,
  loading,
  error,
  onDismissError = () => {},
  onCancel,
  onSave,
  onDelete,
}: Props) {
  const { title: initialTitle, startTime, endTime, status: initialStatus } = initialTask || {};
  const defaults = getDefaultTimes();
  const [title, setTitle] = useState(initialTitle ?? '');
  const [start, setStart] = useState(
    startTime ? formatInputTime(startTime) : formatInputTime(defaults.start),
  );
  const [end, setEnd] = useState(
    endTime ? formatInputTime(endTime) : formatInputTime(defaults.end),
  );
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'scheduled');
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef<RNTextInput>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const startParseBaseDate = startTime ? new Date(startTime) : defaults.start;
  const endParseBaseDate = endTime ? new Date(endTime) : defaults.end;

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const nextDefaults = getDefaultTimes();
    setTitle(initialTitle ?? '');
    setStart(startTime ? formatInputTime(startTime) : formatInputTime(nextDefaults.start));
    setEnd(endTime ? formatInputTime(endTime) : formatInputTime(nextDefaults.end));
    setStatus(initialStatus ?? 'scheduled');
  }, [initialTitle, startTime, endTime, initialStatus]);

  const parsedStart = parseTimeInput(start, startParseBaseDate);
  const parsedEnd = parseTimeInput(end, endParseBaseDate);
  const duration =
    parsedStart && parsedEnd
      ? Math.round((new Date(parsedEnd).getTime() - new Date(parsedStart).getTime()) / 60000)
      : 0;
  const durationLabel = formatDuration(duration);

  const validation = useMemo(() => {
    if (!title.trim()) return 'Title is required.';
    if (!parsedStart || !parsedEnd) return 'Use 24-hour time like 09:30.';
    if (new Date(parsedEnd).getTime() <= new Date(parsedStart).getTime()) {
      return 'End time must be after start time.';
    }
    return null;
  }, [title, parsedStart, parsedEnd]);

  const hasChanges =
    mode === 'create' ||
    title !== (initialTitle ?? '') ||
    start !== (startTime ? formatInputTime(startTime) : '') ||
    end !== (endTime ? formatInputTime(endTime) : '') ||
    status !== (initialStatus ?? 'scheduled');
  const saving = loading || submitting;
  const canSave = !validation && title.trim().length > 0 && !saving && hasChanges;

  const finishSubmitting = () => {
    submittingRef.current = false;
    if (mountedRef.current) setSubmitting(false);
  };

  const handleSave = () => {
    if (!parsedStart || !parsedEnd || validation || saving || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    const result = onSave({
      title,
      start,
      end,
      status,
      startTime: parsedStart,
      endTime: parsedEnd,
    });

    if (result && typeof result.finally === 'function') {
      void result.finally(finishSubmitting);
      return;
    }

    finishSubmitting();
  };

  if (mode === 'edit') {
    const previousTitle = previousTask?.title ?? 'No previous task';
    const nextTitle = nextTask?.title ?? 'No next task';

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
              onPress={handleSave}
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
              onChangeText={setTitle}
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
            <TaskStatusSection
              status={status}
              onChangeStatus={setStatus}
              showLabel={false}
              containerClassName="pt-4"
            />
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
            buttonColor={canSave ? colors.accent : 'rgba(35, 36, 34, 0.32)'}
            textColor={colors.white}
            disabled={!canSave}
            loading={saving}
            onPress={handleSave}
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
        <TaskFormSectionsProvider
          value={{
            mode,
            title,
            status,
            validation,
            durationLabel,
            timeRangeLabel: formatWheelTimeRange(start, end),
            start: toWheelTime(start),
            end: toWheelTime(end),
            titleInputRef,
            onCancel,
            onDelete,
            onChangeTitle: setTitle,
            onClearTitle: () => setTitle(''),
            onSelectQuickAdd: setTitle,
            onChangeStatus: setStatus,
            onChangeStart: (value) => setStart(fromWheelTime(value)),
            onChangeEnd: (value) => setEnd(fromWheelTime(value)),
          }}
        >
          <TaskFormHeader />
          <TaskTimeFields />
          <TaskDurationNotice />
          <TaskQuickAddSection />
        </TaskFormSectionsProvider>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-paper px-4 pb-6 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor={colors.white}
          disabled={!canSave}
          loading={saving}
          onPress={handleSave}
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
