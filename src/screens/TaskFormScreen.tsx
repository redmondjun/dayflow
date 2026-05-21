import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Task } from '../types/task';
import type { RootStackParamList } from '../navigation/types';
import { useTaskStore } from '../store/taskStore';
import { addMinutes } from '../utils/time';
import { TaskFormView, type TaskFormSubmit } from '../views/TaskFormView';
import { buildMockTask } from '../dev-preview/mockData';

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
  const start = new Date();
  return buildMockTask('Study React', start.toISOString(), addMinutes(start, 45), 'scheduled');
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

export function TaskFormScreen(props: Props) {
  const isRoute = isRouteProps(props);
  const isPreview = !isRoute;
  const editingId =
    isRoute && props.route.name === 'EditTask' ? props.route.params.taskId : undefined;
  const { tasks, addTask, updateTask, deleteTask, error, clearError, loading } = useTaskStore();
  const existing = tasks.find((task) => task.id === editingId);
  const initialTask = toInitialTask(
    existing ?? (!isRoute ? buildPreviewTask(props.scenarioId) : null),
  );
  const mode = initialTask ? 'edit' : 'create';
  const onCancel = isRoute ? () => props.navigation.goBack() : props.onCancel;
  const onComplete = isRoute ? () => props.navigation.goBack() : props.onCancel;

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
      loading={isPreview ? false : loading}
      error={isPreview ? null : error}
      onDismissError={isPreview ? undefined : clearError}
      onCancel={onCancel}
      onSave={save}
      onDelete={mode === 'edit' ? confirmDelete : undefined}
    />
  );
}
