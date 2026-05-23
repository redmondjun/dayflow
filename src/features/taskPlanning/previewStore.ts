import type { Dispatch, SetStateAction } from 'react';
import type { GeneratedTaskPreview } from '../../types/task';

type PreviewStoreArgs = {
  isPreview: boolean;
  localPreviewTasks: GeneratedTaskPreview[];
  storePreviewTasks: GeneratedTaskPreview[];
  setLocalPreviewTasks: Dispatch<SetStateAction<GeneratedTaskPreview[]>>;
  setLocalError: Dispatch<SetStateAction<string | null>>;
  onComplete: () => void;
  setPreviewTasks: (tasks: GeneratedTaskPreview[]) => void;
  updatePreviewTask: (taskId: string, patch: Partial<GeneratedTaskPreview>) => void;
  clearPreviewTasks: () => void;
  confirmPreviewTasks: () => Promise<void>;
  clearError: () => void;
};

export function createTaskPlanningPreviewStore({
  isPreview,
  localPreviewTasks,
  storePreviewTasks,
  setLocalPreviewTasks,
  setLocalError,
  onComplete,
  setPreviewTasks,
  updatePreviewTask,
  clearPreviewTasks,
  confirmPreviewTasks,
  clearError,
}: PreviewStoreArgs) {
  if (isPreview) {
    return {
      tasks: localPreviewTasks,
      writeTasks: setLocalPreviewTasks,
      updateTitle: (taskId: string, title: string) =>
        setLocalPreviewTasks((tasks) =>
          tasks.map((task) => (task.id === taskId ? { ...task, title } : task)),
        ),
      updateDuration: (taskId: string, duration: number) =>
        setLocalPreviewTasks((tasks) =>
          tasks.map((task) => (task.id === taskId ? { ...task, durationMinutes: duration } : task)),
        ),
      clear: () => setLocalPreviewTasks([]),
      confirm: async () => onComplete(),
      dismissError: () => setLocalError(null),
    };
  }

  return {
    tasks: storePreviewTasks,
    writeTasks: setPreviewTasks,
    updateTitle: (taskId: string, title: string) => updatePreviewTask(taskId, { title }),
    updateDuration: (taskId: string, duration: number) =>
      updatePreviewTask(taskId, { durationMinutes: duration }),
    clear: clearPreviewTasks,
    confirm: async () => {
      await confirmPreviewTasks();
      onComplete();
    },
    dismissError: () => {
      setLocalError(null);
      clearError();
    },
  };
}
