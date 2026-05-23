import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrentTaskCard } from '../components/CurrentTaskCard';
import { TimeWheelPicker } from '../components/TimeWheelPicker';
import { TaskTimelineRow } from '../components/TaskTimelineRow';
import { makeActiveDayTasks, makeCompletedHeavyTasks } from '../dev-preview/mockData';
import { useTaskStore } from '../store/taskStore';
import { colors } from '../theme/colors';
import type { Task } from '../types/task';
import {
  formatDisplayDate,
  formatInputTime,
  fromWheelTime,
  getCurrentTask,
  getUpcomingTasks,
  parseTimeInput,
  toWheelTime,
} from '../utils/time';

type RouteProps = {
  onEditTask?: (taskId: string) => void;
  onCreateTask: () => void;
  onOpenAiSchedule: () => void;
  onOpenSettings?: () => void;
};

type PreviewProps = {
  scenarioId: 'home-empty' | 'home-active' | 'home-completed';
  onBack: () => void;
  previewTasks?: Task[];
  previewNow?: Date;
  initialEditingTaskId?: string;
};

type Props = RouteProps | PreviewProps;

function isPreviewProps(props: Props): props is PreviewProps {
  return 'scenarioId' in props;
}

function buildPreviewTasks(scenarioId: PreviewProps['scenarioId']): Task[] {
  const previewTaskMap: Record<PreviewProps['scenarioId'], Task[]> = {
    'home-empty': [],
    'home-active': makeActiveDayTasks(),
    'home-completed': makeCompletedHeavyTasks(),
  };
  return previewTaskMap[scenarioId];
}

function updatePreviewTaskStatus(
  setPreviewTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  taskId: string,
  status: Task['status'],
) {
  setPreviewTasks((tasks) =>
    tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
  );
}

function updateTaskSchedule(task: Task, title: string, start: string, end: string): Task {
  return {
    ...task,
    title,
    startTime: parseTimeInput(start, new Date(task.startTime)) ?? task.startTime,
    endTime: parseTimeInput(end, new Date(task.endTime)) ?? task.endTime,
  };
}

function TaskScheduleEditorSheet({
  task,
  saving,
  onClose,
  onSave,
}: {
  task: Task;
  saving: boolean;
  onClose: () => void;
  onSave: (title: string, start: string, end: string) => Promise<void> | void;
}) {
  const initialStart = useMemo(() => formatInputTime(task.startTime), [task.startTime]);
  const initialEnd = useMemo(() => formatInputTime(task.endTime), [task.endTime]);
  const [title, setTitle] = useState(task.title);
  const [startWheel, setStartWheel] = useState(toWheelTime(initialStart));
  const [endWheel, setEndWheel] = useState(toWheelTime(initialEnd));
  const trimmedTitle = title.trim();
  const start = fromWheelTime(startWheel);
  const end = fromWheelTime(endWheel);
  const isValid =
    trimmedTitle.length > 0 &&
    Boolean(parseTimeInput(start, new Date(task.startTime))) &&
    Boolean(parseTimeInput(end, new Date(task.endTime))) &&
    start < end;
  const changed = trimmedTitle !== task.title || start !== initialStart || end !== initialEnd;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-[rgba(35,36,34,0.38)]">
        <Pressable className="absolute inset-0" onPress={onClose} testID="task-edit-backdrop" />
        <View className="rounded-t-[24px] bg-paper pb-6 pt-5">
          <View className="mx-auto h-1 w-9 rounded-full bg-warm3" />
          <View className="flex-row items-start justify-between px-5 pt-5">
            <View className="min-w-0 flex-1 pr-5">
              <Text className="text-[19px] font-bold tracking-[-0.4px] text-ink">Edit Task</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Task name"
                placeholderTextColor={colors.warm}
                className="mt-6 text-[29px] font-bold tracking-[-1px] text-ink"
                testID="task-editor-title-input"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close task editor"
              className="h-14 w-14 items-center justify-center rounded-full bg-warm3"
              onPress={onClose}
              testID="close-task-editor"
            >
              <Text className="text-[22px] font-bold text-warm">x</Text>
            </Pressable>
          </View>

          <View className="mt-5 border-t border-warm3 px-9 pt-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-warm">
              Start
            </Text>
            <TimeWheelPicker
              value={startWheel}
              onChange={setStartWheel}
              width={320}
              wheelHeight={116}
              wheelItemHeight={34}
              highlightHeight={36}
              textSize={24}
            />
          </View>

          <View className="mt-1 border-t border-warm3 px-9 pt-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-warm">
              End
            </Text>
            <TimeWheelPicker
              value={endWheel}
              onChange={setEndWheel}
              width={320}
              wheelHeight={116}
              wheelItemHeight={34}
              highlightHeight={36}
              textSize={24}
            />
          </View>

          <View className="px-5 pt-6">
            <Button
              mode="contained"
              disabled={saving}
              loading={saving}
              buttonColor="#232422"
              textColor={colors.white}
              onPress={() => {
                if (isValid && changed) onSave(trimmedTitle, start, end);
              }}
              style={{ borderRadius: 999 }}
              contentStyle={{ height: 52 }}
              labelStyle={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.15 }}
            >
              Add task
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function HomeScreenView(props: Props) {
  const isPreview = isPreviewProps(props);
  const previewScenarioId = isPreview ? props.scenarioId : null;
  const previewNow = isPreview ? props.previewNow : undefined;
  const previewTasksOverride = isPreview ? props.previewTasks : undefined;
  const initialEditingTaskId = isPreview ? props.initialEditingTaskId : undefined;
  const [tick, setTick] = useState(() => (previewNow ?? new Date()).getTime());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(initialEditingTaskId ?? null);
  const [savingTaskEdit, setSavingTaskEdit] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<Task[]>(
    previewScenarioId ? (previewTasksOverride ?? buildPreviewTasks(previewScenarioId)) : [],
  );
  const {
    loading,
    error,
    clearError,
    reloadTasks,
    todayTasks,
    currentTask,
    upcomingTasks,
    updateTask,
    markCompleted,
    markSkipped,
  } = useTaskStore();

  useEffect(() => {
    if (previewNow) return undefined;
    const id = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, [previewNow]);

  useEffect(() => {
    if (previewNow) setTick(previewNow.getTime());
  }, [previewNow]);

  useEffect(() => {
    if (previewScenarioId) {
      setPreviewTasks(previewTasksOverride ?? buildPreviewTasks(previewScenarioId));
    }
  }, [previewScenarioId, previewTasksOverride]);

  const now = new Date(tick);
  const date = formatDisplayDate(now);
  const tasks = isPreview ? previewTasks : todayTasks();
  const current = isPreview ? getCurrentTask(tasks, now) : currentTask();
  const next = isPreview ? getUpcomingTasks(tasks, now)[0] : upcomingTasks()[0];
  const editingTask = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : undefined;

  const openTaskEditor = (taskId: string) => {
    setEditingTaskId(taskId);
  };

  const closeTaskEditor = () => {
    if (savingTaskEdit) return;
    setEditingTaskId(null);
  };

  const saveTaskSchedule = async (title: string, start: string, end: string) => {
    if (!editingTask || savingTaskEdit) return;
    setSavingTaskEdit(true);
    try {
      if (isPreview) {
        setPreviewTasks((existingTasks) =>
          existingTasks.map((task) =>
            task.id === editingTask.id ? updateTaskSchedule(task, title, start, end) : task,
          ),
        );
      } else {
        await updateTask(editingTask.id, {
          title,
          startTime:
            parseTimeInput(start, new Date(editingTask.startTime)) ?? editingTask.startTime,
          endTime: parseTimeInput(end, new Date(editingTask.endTime)) ?? editingTask.endTime,
        });
      }
      setEditingTaskId(null);
    } finally {
      setSavingTaskEdit(false);
    }
  };

  const mode = isPreview
    ? {
        onHeaderPress: props.onBack,
        refreshControl: undefined,
        onCurrentComplete: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'completed')
          : undefined,
        onCurrentSkip: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'skipped')
          : undefined,
        onTaskPress: openTaskEditor,
        onPrimaryAction: props.onBack,
        onSecondaryAction: props.onBack,
        showHeaderAction: false,
        showError: false,
      }
    : {
        onHeaderPress: props.onOpenSettings,
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={reloadTasks} tintColor={colors.ink} />
        ),
        onCurrentComplete: current ? () => markCompleted(current.id) : undefined,
        onCurrentSkip: current ? () => markSkipped(current.id) : undefined,
        onTaskPress: openTaskEditor,
        onPrimaryAction: props.onCreateTask,
        onSecondaryAction: props.onOpenAiSchedule,
        showHeaderAction: true,
        showError: true,
      };
  const {
    onCurrentComplete,
    onCurrentSkip,
    onHeaderPress,
    onPrimaryAction,
    onSecondaryAction,
    onTaskPress,
    refreshControl,
    showHeaderAction,
    showError,
  } = mode;

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerClassName="pb-28 pt-3" refreshControl={refreshControl}>
        <View className="flex-row items-start justify-between gap-4 px-4 pb-7">
          <View>
            <Text className="text-[11px] font-normal uppercase text-warm">{date.weekday}</Text>
            <Text className="mt-1.5 text-4xl font-bold tracking-[-1.4px] text-ink">
              {date.dayMonth}
            </Text>
          </View>
          {showHeaderAction && onHeaderPress ? (
            <Button mode="text" compact onPress={onHeaderPress} textColor={colors.warm}>
              Settings
            </Button>
          ) : null}
        </View>

        <CurrentTaskCard
          task={current}
          nextTask={next}
          onComplete={onCurrentComplete}
          onSkip={onCurrentSkip}
        />

        <View className="mt-7 flex-row items-baseline justify-between px-4 pb-1.5">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink">Today</Text>
          <Text className="text-xs font-medium text-warm2">{tasks.length} tasks</Text>
        </View>

        {tasks.length === 0 ? (
          <View className="px-6 py-8">
            <Text className="text-base font-medium text-ink">No tasks yet.</Text>
            <Text className="mt-2 text-sm leading-6 text-warm">
              Create a task manually or generate a schedule from a rough plan.
            </Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <TaskTimelineRow
              key={task.id}
              task={task}
              isCurrent={task.id === current?.id}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              onPress={onTaskPress ? () => onTaskPress(task.id) : undefined}
              testID={`task-timeline-row-${task.id}`}
            />
          ))
        )}

        <View className="flex-row items-center gap-2 px-6 py-8">
          <View className="h-px flex-1 bg-warm3" />
          <Text className="text-xs font-medium uppercase tracking-[2px] text-warm2">
            End of day
          </Text>
          <View className="h-px flex-1 bg-warm3" />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 bg-paper px-5 pb-7 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.ink}
          textColor={colors.white}
          onPress={onPrimaryAction}
          style={{ borderRadius: 999 }}
        >
          Create Task
        </Button>
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor={colors.ink}
          onPress={onSecondaryAction}
          style={{ borderRadius: 999 }}
        >
          Generate Schedule with AI
        </Button>
      </View>

      {showError ? (
        <Snackbar visible={Boolean(error)} onDismiss={clearError} duration={4000}>
          {error}
        </Snackbar>
      ) : null}

      {editingTask ? (
        <TaskScheduleEditorSheet
          key={editingTask.id}
          task={editingTask}
          saving={savingTaskEdit}
          onClose={closeTaskEditor}
          onSave={saveTaskSchedule}
        />
      ) : null}
    </SafeAreaView>
  );
}
