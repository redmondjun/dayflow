import { buildMockTask } from './mockData';
import type { Task } from '../types/task';
import { toEditableTaskForm } from '../utils/taskForm';
import { TaskFormView, type TaskFormSubmit } from '../views/TaskFormView';

type Props = {
  scenarioId: 'task-create' | 'task-edit';
  onCancel: () => void;
};

function buildPreviewTask(scenarioId: Props['scenarioId']) {
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

export function TaskFormPreviewScreen({ scenarioId, onCancel }: Props) {
  const previewTask = buildPreviewTask(scenarioId);
  const initialTask = toEditableTaskForm(previewTask);
  const mode = initialTask ? 'edit' : 'create';

  const completePreview = async (_values?: TaskFormSubmit) => {
    onCancel();
  };

  return (
    <TaskFormView
      mode={mode}
      initialTask={initialTask}
      dayLabel={previewTask ? 'Tue · Apr 28' : undefined}
      previousTask={buildPreviewPreviousTask(previewTask)}
      nextTask={buildPreviewNextTask(previewTask)}
      loading={false}
      error={null}
      onCancel={onCancel}
      onSave={completePreview}
      onDelete={mode === 'edit' ? completePreview : undefined}
    />
  );
}
