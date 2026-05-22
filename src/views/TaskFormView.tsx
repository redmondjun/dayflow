import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TaskDurationNotice,
  TaskFormHeader,
  TaskQuickAddSection,
  TaskStatusSection,
  TaskTimeFields,
} from '../components/TaskFormSections';
import { colors } from '../theme/colors';
import type { Task, TaskStatus } from '../types/task';
import {
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
};

type Props = {
  mode: 'create' | 'edit';
  initialTask?: Pick<Task, 'title' | 'startTime' | 'endTime' | 'status'>;
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

export function TaskFormView({
  mode,
  initialTask,
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
  const titleInputRef = useRef<RNTextInput>(null);
  const startParseBaseDate = startTime ? new Date(startTime) : defaults.start;
  const endParseBaseDate = endTime ? new Date(endTime) : defaults.end;

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

  const canSave = !validation && title.trim().length > 0 && !loading;

  const handleSave = () => {
    if (!parsedStart || !parsedEnd || validation) return;

    void onSave({
      title,
      start,
      end,
      status,
      startTime: parsedStart,
      endTime: parsedEnd,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="pb-40 pt-4">
        <TaskFormHeader onCancel={onCancel} />
        <TaskTimeFields
          mode={mode}
          title={title}
          onChangeTitle={setTitle}
          titleInputRef={titleInputRef}
          timeRangeLabel={formatWheelTimeRange(start, end)}
          start={toWheelTime(start)}
          end={toWheelTime(end)}
          onChangeStart={(value) => setStart(fromWheelTime(value))}
          onChangeEnd={(value) => setEnd(fromWheelTime(value))}
          onDelete={onDelete}
          onClearTitle={() => setTitle('')}
        />
        <TaskDurationNotice validation={validation} durationLabel={durationLabel} />
        <TaskQuickAddSection title={title} onSelect={setTitle} />
        {mode === 'edit' ? <TaskStatusSection status={status} onChangeStatus={setStatus} /> : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-paper px-4 pb-6 pt-3">
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
      </View>

      <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}
