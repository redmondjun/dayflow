import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { toEditableTaskForm } from '../utils/taskForm';
import { isSameLocalDay, sortByStartTime } from '../utils/time';
import { TaskFormView, type TaskFormSubmit } from '../views/TaskFormView';

type CreateProps = NativeStackScreenProps<RootStackParamList, 'CreateTask'>;
type EditProps = NativeStackScreenProps<RootStackParamList, 'EditTask'>;
type Props = CreateProps | EditProps;

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
  const editingId = props.route.name === 'EditTask' ? props.route.params.taskId : undefined;
  const { tasks, addTask, updateTask, deleteTask, error, clearError, loading } = useTaskStore();
  const existing = tasks.find((task) => task.id === editingId);
  const initialTask = toEditableTaskForm(existing);
  const mode = initialTask ? 'edit' : 'create';
  const onCancel = () => props.navigation.goBack();
  const onComplete = () => props.navigation.goBack();
  const actualAdjacentTasks = getAdjacentTasks(tasks, existing);
  const previousTask = actualAdjacentTasks.previousTask;
  const nextTask = actualAdjacentTasks.nextTask;
  const dayLabel = getDayLabel(existing);

  const save = async ({ title, startTime, endTime, status }: TaskFormSubmit) => {
    if (editingId) {
      await updateTask(editingId, { title, startTime, endTime, status });
    } else {
      await addTask({ title, startTime, endTime });
    }
    if (!useTaskStore.getState().error) onComplete();
  };

  const confirmDelete = () => {
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
      loading={loading}
      error={error}
      onDismissError={clearError}
      onCancel={onCancel}
      onSave={save}
      onDelete={mode === 'edit' ? confirmDelete : undefined}
    />
  );
}
