import { useMemo } from 'react';
import { HomeScreenView } from '../views/HomeScreenView';
import { buildMockTask } from './mockData';

type Props = {
  onCancel: () => void;
};

export function TaskEditPreviewScreen({ onCancel }: Props) {
  const previewNow = useMemo(() => new Date(2026, 3, 28, 12, 0), []);
  const { editTask, previewTasks } = useMemo(() => {
    const editableTask = buildMockTask(
      'Morning routine',
      new Date(2026, 3, 28, 19, 0).toISOString(),
      new Date(2026, 3, 28, 19, 0).toISOString(),
      'scheduled',
    );
    return {
      editTask: editableTask,
      previewTasks: [
        buildMockTask(
          'Coffee & walk',
          new Date(2026, 3, 28, 10, 30).toISOString(),
          new Date(2026, 3, 28, 11, 0).toISOString(),
          'completed',
        ),
        buildMockTask(
          'Design review',
          new Date(2026, 3, 28, 11, 30).toISOString(),
          new Date(2026, 3, 28, 12, 45).toISOString(),
          'scheduled',
        ),
        editableTask,
      ],
    };
  }, []);

  return (
    <HomeScreenView
      scenarioId="home-active"
      onBack={onCancel}
      previewTasks={previewTasks}
      previewNow={previewNow}
      initialEditingTaskId={editTask.id}
    />
  );
}
