import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildMockTask } from '../dev-preview/mockData';
import type { RootStackParamList } from '../navigation/types';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { isSameLocalDay, sortByStartTime } from '../utils/time';
import { TaskFormView, type TaskFormSubmit } from '../views/TaskFormView';

type CreateProps = NativeStackScreenProps<RootStackParamList, 'CreateTask'>;
type EditProps = NativeStackScreenProps<RootStackParamList, 'EditTask'>;
type RouteProps = CreateProps | EditProps;
type PreviewProps = {
  scenarioId: 'task-create' | 'task-edit';
  onCancel: () => void;
};

type Props = RouteProps | PreviewProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

function buildPreviewTask(scenarioId: PreviewProps['scenarioId']) {
  if (scenarioId !== 'task-edit') return null;
  return buildMockTask(
    'Design review',
    new Date(2026, 3, 28, 11, 30).toISOString(),
    new Date(2026, 3, 28, 12, 45).toISOString(),
    'scheduled',
  );
}

function buildPreviewPreviousTask(existing: Task | null) {
  if (!existing) return undefined;
  return buildMockTask(
    'Coffee & walk',
    new Date(2026, 3, 28, 10, 30).toISOString(),
    new Date(2026, 3, 28, 11, 0).toISOString(),
    'completed',
  );
}

function buildPreviewNextTask(existing: Task | null) {
  if (!existing) return undefined;
  return buildMockTask(
    'Lunch',
    new Date(2026, 3, 28, 13, 0).toISOString(),
    new Date(2026, 3, 28, 13, 45).toISOString(),
    'scheduled',
  );
}

function toInitialTask(task: Task | null | undefined) {
  if (!task) return undefined;
  return {
    title: task.title,
    startTime: task.startTime,
    endTime: task.endTime,
    status: task.status,
  };
}

function getAdjacentTasks(tasks: Task[], existing: Task | null | undefined) {
  if (!existing) return { previousTask: undefined, nextTask: undefined };

  const dayTasks = sortByStartTime(
    tasks.filter((task) => isSameLocalDay(new Date(task.startTime), new Date(existing.startTime))),
  );
  const editingIndex = dayTasks.findIndex((task) => task.id === existing.id);

  return {
    previousTask: editingIndex > 0 ? dayTasks[editingIndex - 1] : undefined,
    nextTask: editingIndex >= 0 ? dayTasks[editingIndex + 1] : undefined,
  };
}

function getDayLabel(task: Task | null | undefined) {
  if (!task) return undefined;
  return new Date(task.startTime)
    .toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', ' ·');
}

export function TaskFormScreen(props: Props) {
  const isRoute = isRouteProps(props);
  const isPreview = !isRoute;
  const editingId =
    isRoute && props.route.name === 'EditTask' ? props.route.params.taskId : undefined;
  const { tasks, addTask, updateTask, deleteTask, error, clearError, loading } = useTaskStore();
  const previewTask = isPreview ? buildPreviewTask(props.scenarioId) : null;
  const existing = tasks.find((task) => task.id === editingId) ?? previewTask;
  const initialTask = toInitialTask(existing);
  const mode = initialTask ? 'edit' : 'create';
  const onCancel = isRoute ? () => props.navigation.goBack() : props.onCancel;
  const onComplete = isRoute ? () => props.navigation.goBack() : props.onCancel;
  const actualAdjacentTasks = getAdjacentTasks(tasks, existing);
  const previousTask = isPreview
    ? buildPreviewPreviousTask(previewTask)
    : actualAdjacentTasks.previousTask;
  const nextTask = isPreview ? buildPreviewNextTask(previewTask) : actualAdjacentTasks.nextTask;
  const dayLabel = isPreview && previewTask ? 'Tue · Apr 28' : getDayLabel(existing);

  const save = async ({ title, startTime, endTime, status }: TaskFormSubmit) => {
    if (isPreview) {
      onComplete();
      return;
    }
    if (editingId) {
      await updateTask(editingId, { title, startTime, endTime, status });
    } else {
      await addTask({ title, startTime, endTime });
    }
    if (!useTaskStore.getState().error) onComplete();
  };

  const confirmDelete = () => {
    if (isPreview) {
      onComplete();
      return;
    }
    if (!editingId) return;
    Alert.alert('Delete this task?', "This can't be undone.", [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(editingId);
          if (!useTaskStore.getState().error) onComplete();
        },
      },
    ]);
  };

  return (
    <TaskFormView
      mode={mode}
      initialTask={initialTask}
      dayLabel={dayLabel}
      previousTask={previousTask}
      nextTask={nextTask}
      loading={isPreview ? false : loading}
      error={isPreview ? null : error}
      onDismissError={isPreview ? undefined : clearError}
      onCancel={onCancel}
      onSave={save}
      onDelete={mode === 'edit' ? confirmDelete : undefined}
    />
  );
}
