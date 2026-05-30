import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput as RNTextInput } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TaskDescriptionField,
  TaskDurationNotice,
  TaskFormHeader,
  TaskQuickAddSection,
  TaskFormSectionsProvider,
  TaskStatusSection,
  TaskTimeFields,
} from '../components/TaskFormSections';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { getRoundedStartTime } from '../features/taskPlanning';
import { syncManualRowTimes } from '../features/taskPlanning/manualTime';
import { validateManualTaskTimes } from '../features/taskPlanning/scheduling';
import {
  findRememberedEstimatedDuration,
  findRememberedTaskDescription,
} from '../features/taskPlanning/taskTitleMemory';
import { schedulingContextForDay } from '../features/taskPlanning/planningDay';
import { colors } from '../theme/colors';
import type { ManualTimeInputMode, Task, TaskStatus } from '../types/task';
import { clampDuration } from '../utils/scheduling';
import {
  addMinutes,
  durationBetween,
  formatDuration,
  formatInputTime,
  formatWheelTimeRange,
  fromWheelTime,
  parseTimeInput,
  toWheelTime,
} from '../utils/time';

export type TaskFormSubmit = {
  title: string;
  start: string;
  end: string;
  status: TaskStatus;
  startTime: string;
  endTime: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
};

type Props = {
  mode: 'create' | 'edit';
  initialTask?: Pick<
    Task,
    'title' | 'startTime' | 'endTime' | 'status' | 'description' | 'estimatedDurationMinutes'
  >;
  existingTasks?: Task[];
  loading: boolean;
  error: string | null;
  onDismissError?: () => void;
  onCancel: () => void;
  onSave: (values: TaskFormSubmit) => void | Promise<void>;
  onDelete?: () => void;
};

function getDefaultTimes() {
  const startIso = parseTimeInput(getRoundedStartTime()) ?? new Date().toISOString();
  return {
    start: new Date(startIso),
    end: new Date(addMinutes(startIso, 45)),
  };
}

function initialDurationMinutes(initialTask?: Props['initialTask']): number {
  if (initialTask?.estimatedDurationMinutes != null) {
    return clampDuration(initialTask.estimatedDurationMinutes);
  }
  if (initialTask?.startTime && initialTask?.endTime) {
    return clampDuration(durationBetween(initialTask.startTime, initialTask.endTime));
  }
  return 45;
}

export function TaskFormView({
  mode,
  initialTask,
  existingTasks = [],
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
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [start, setStart] = useState(
    startTime ? formatInputTime(startTime) : formatInputTime(defaults.start),
  );
  const [end, setEnd] = useState(
    endTime ? formatInputTime(endTime) : formatInputTime(defaults.end),
  );
  const [durationMinutes, setDurationMinutes] = useState(initialDurationMinutes(initialTask));
  const [timeInputMode, setTimeInputMode] = useState<ManualTimeInputMode>('duration');
  const [status, setStatus] = useState<TaskStatus>(initialStatus ?? 'scheduled');
  const [isTimePickerInteracting, setIsTimePickerInteracting] = useState(false);
  const titleInputRef = useRef<RNTextInput>(null);
  const startParseBaseDate = startTime ? new Date(startTime) : defaults.start;
  const endParseBaseDate = endTime ? new Date(endTime) : defaults.end;
  const schedulingContext = schedulingContextForDay(startParseBaseDate, new Date());

  useEffect(() => {
    const nextDefaults = getDefaultTimes();
    setTitle(initialTitle ?? '');
    setDescription(initialTask?.description ?? '');
    setStart(startTime ? formatInputTime(startTime) : formatInputTime(nextDefaults.start));
    setEnd(endTime ? formatInputTime(endTime) : formatInputTime(nextDefaults.end));
    setDurationMinutes(initialDurationMinutes(initialTask));
    setTimeInputMode('duration');
    setStatus(initialStatus ?? 'scheduled');
  }, [initialTask, initialTitle, startTime, endTime, initialStatus]);

  const syncedTimes = useMemo(
    () =>
      syncManualRowTimes(
        { startTime: start, endTime: end, durationMinutes, timeInputMode },
        schedulingContext.planningDay,
      ),
    [durationMinutes, end, schedulingContext.planningDay, start, timeInputMode],
  );

  const parsedStart = parseTimeInput(syncedTimes.startTime, startParseBaseDate);
  const parsedEnd = parseTimeInput(syncedTimes.endTime, endParseBaseDate);
  const durationLabel = formatDuration(syncedTimes.durationMinutes);

  const validation = useMemo(() => {
    if (!title.trim()) return 'Title is required.';
    if (!parsedStart || !parsedEnd) return 'Use 24-hour time like 09:30.';
    if (new Date(parsedEnd).getTime() <= new Date(parsedStart).getTime()) {
      return 'End time must be after start time.';
    }
    const crossesMidnight = endParseBaseDate.getTime() !== startParseBaseDate.getTime();
    if (crossesMidnight) return null;
    return validateManualTaskTimes(syncedTimes.startTime, syncedTimes.endTime, schedulingContext, {
      existingTasks,
    }).error;
  }, [
    title,
    parsedStart,
    parsedEnd,
    syncedTimes.startTime,
    syncedTimes.endTime,
    endParseBaseDate,
    startParseBaseDate,
    existingTasks,
    schedulingContext,
  ]);

  const canSave = !validation && title.trim().length > 0 && !loading;

  const applyTitleMemory = (nextTitle: string) => {
    if (!description.trim()) {
      const rememberedDescription = findRememberedTaskDescription(existingTasks, nextTitle);
      if (rememberedDescription) setDescription(rememberedDescription);
    }
    const rememberedDuration = findRememberedEstimatedDuration(existingTasks, nextTitle);
    if (rememberedDuration != null) {
      setDurationMinutes(rememberedDuration);
    }
  };

  const handleSave = () => {
    if (!parsedStart || !parsedEnd || validation) return;

    void onSave({
      title,
      start: syncedTimes.startTime,
      end: syncedTimes.endTime,
      status,
      startTime: parsedStart,
      endTime: parsedEnd,
      description: description.trim() || null,
      estimatedDurationMinutes: syncedTimes.durationMinutes,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerClassName="pb-40 pt-4"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isTimePickerInteracting}
      >
        <TaskFormSectionsProvider
          value={{
            mode,
            title,
            description,
            status,
            validation,
            durationLabel,
            timeRangeLabel: formatWheelTimeRange(syncedTimes.startTime, syncedTimes.endTime),
            start: toWheelTime(syncedTimes.startTime),
            end: toWheelTime(syncedTimes.endTime),
            durationMinutes: syncedTimes.durationMinutes,
            timeInputMode,
            syncedEndTime: parsedEnd ?? syncedTimes.endTime,
            titleInputRef,
            onCancel,
            onDelete,
            onChangeTitle: (value) => {
              setTitle(value);
            },
            onTitleBlur: () => applyTitleMemory(title),
            onChangeDescription: setDescription,
            onClearTitle: () => setTitle(''),
            onSelectQuickAdd: (value) => {
              setTitle(value);
              applyTitleMemory(value);
            },
            onChangeStatus: setStatus,
            onChangeStart: (value) => setStart(fromWheelTime(value)),
            onChangeEnd: (value) => {
              setEnd(fromWheelTime(value));
              setTimeInputMode('end');
            },
            onChangeDuration: (value) => {
              setDurationMinutes(clampDuration(value));
              setTimeInputMode('duration');
            },
            onChangeTimeInputMode: setTimeInputMode,
            onTimeInteractionStart: () => {
              titleInputRef.current?.blur();
              setIsTimePickerInteracting(true);
            },
            onTimeInteractionEnd: () => setIsTimePickerInteracting(false),
          }}
        >
          <TaskFormHeader />
          <TaskTimeFields />
          {mode === 'edit' ? <TaskDescriptionField /> : null}
          <TaskDurationNotice />
          <TaskQuickAddSection />
          {mode === 'edit' ? <TaskStatusSection /> : null}
        </TaskFormSectionsProvider>
      </ScrollView>

      <StickyBottomBar className="px-4 pb-6 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor={colors.white}
          disabled={!canSave}
          loading={loading}
          onPress={handleSave}
          style={{ borderRadius: 999 }}
          contentStyle={{ height: 54 }}
        >
          Confirm schedule
        </Button>
      </StickyBottomBar>

      <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}
