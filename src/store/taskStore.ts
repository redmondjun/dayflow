import { create } from 'zustand';
import type { GeneratedTaskPreview, NewTaskInput, Task, TaskStatus } from '../types/task';
import {
  bulkCreateTasks,
  createTask,
  deleteTask as deleteTaskFromDb,
  deleteTasksForDay as deleteTasksForDayFromDb,
  initDb,
  loadTasks,
  updateTask as updateTaskInDb,
  updateTaskNotificationId,
  updateTaskStatus,
} from '../services/db';
import {
  cancelTaskNotification,
  requestNotificationPermission,
  rescheduleFutureNotifications,
  scheduleTaskNotification,
} from '../services/notifications';
import {
  getCurrentTask,
  getTodayTasks,
  getUpcomingTasks,
  sortByStartTime,
  sortGeneratedTasksByStartTime,
} from '../utils/time';

type TaskStore = {
  tasks: Task[];
  previewTasks: GeneratedTaskPreview[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  reloadTasks: () => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  addTasks: (inputs: NewTaskInput[]) => Promise<void>;
  updateTask: (
    taskId: string,
    input: Partial<NewTaskInput> & { status?: TaskStatus },
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteTasksForDay: (day: Date) => Promise<number>;
  markCompleted: (taskId: string) => Promise<void>;
  markSkipped: (taskId: string) => Promise<void>;
  setPreviewTasks: (tasks: GeneratedTaskPreview[]) => void;
  updatePreviewTask: (taskId: string, patch: Partial<GeneratedTaskPreview>) => void;
  clearPreviewTasks: () => void;
  confirmPreviewTasks: () => Promise<void>;
  clearError: () => void;
  todayTasks: (now?: Date) => Task[];
  currentTask: (now?: Date) => Task | undefined;
  upcomingTasks: (now?: Date) => Task[];
};

async function refresh(set: (state: Partial<TaskStore>) => void): Promise<Task[]> {
  const tasks = await loadTasks();
  set({ tasks: sortByStartTime(tasks), loading: false, error: null });
  return tasks;
}

async function runStoreAction(
  set: (state: Partial<TaskStore>) => void,
  action: () => Promise<void>,
): Promise<void> {
  set({ loading: true, error: null });
  try {
    await action();
    const tasks = await loadTasks();
    set({ tasks: sortByStartTime(tasks), loading: false, error: null });
  } catch (error) {
    set({
      loading: false,
      error: error instanceof Error ? error.message : 'Something went wrong.',
    });
  }
}

async function cancelAndClearNotification(taskId: string, notificationId?: string | null) {
  await cancelTaskNotification(notificationId);
  if (notificationId) {
    await updateTaskNotificationId(taskId, null);
  }
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  previewTasks: [],
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      await initDb();
      await requestNotificationPermission();
      const tasks = await loadTasks();
      await rescheduleFutureNotifications(getUpcomingTasks(tasks));
      const reloaded = await loadTasks();
      set({ tasks: sortByStartTime(reloaded), initialized: true, loading: false, error: null });
    } catch (error) {
      set({
        initialized: true,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize DayFlow.',
      });
    }
  },

  reloadTasks: async () => {
    set({ loading: true, error: null });
    try {
      await refresh(set);
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load tasks.',
      });
    }
  },

  addTask: async (input) => {
    await runStoreAction(set, async () => {
      const task = await createTask(input);
      await scheduleTaskNotification(task);
    });
  },

  addTasks: async (inputs) => {
    await runStoreAction(set, async () => {
      const tasks = await bulkCreateTasks(inputs);
      for (const task of tasks) {
        await scheduleTaskNotification(task);
      }
    });
  },

  updateTask: async (taskId, input) => {
    await runStoreAction(set, async () => {
      const existing = get().tasks.find((task) => task.id === taskId);
      await cancelAndClearNotification(taskId, existing?.notificationId);

      const updated = await updateTaskInDb(taskId, { ...input, notificationId: null });
      await scheduleTaskNotification(updated);
    });
  },

  deleteTask: async (taskId) => {
    await runStoreAction(set, async () => {
      const existing = get().tasks.find((task) => task.id === taskId);
      await cancelTaskNotification(existing?.notificationId);
      await deleteTaskFromDb(taskId);
    });
  },

  deleteTasksForDay: async (day) => {
    let deletedCount = 0;
    await runStoreAction(set, async () => {
      const deleted = await deleteTasksForDayFromDb(day);
      deletedCount = deleted.length;
      for (const task of deleted) {
        await cancelTaskNotification(task.notificationId);
      }
    });
    return deletedCount;
  },

  markCompleted: async (taskId) => {
    await runStoreAction(set, async () => {
      const existing = get().tasks.find((task) => task.id === taskId);
      await cancelAndClearNotification(taskId, existing?.notificationId);
      await updateTaskStatus(taskId, 'completed');
    });
  },

  markSkipped: async (taskId) => {
    await runStoreAction(set, async () => {
      const existing = get().tasks.find((task) => task.id === taskId);
      await cancelAndClearNotification(taskId, existing?.notificationId);
      await updateTaskStatus(taskId, 'skipped');
    });
  },

  setPreviewTasks: (tasks) => set({ previewTasks: tasks, error: null }),

  updatePreviewTask: (taskId, patch) => {
    set({
      previewTasks: get().previewTasks.map((task) =>
        task.id === taskId ? { ...task, ...patch } : task,
      ),
    });
  },

  clearPreviewTasks: () => set({ previewTasks: [] }),

  confirmPreviewTasks: async () => {
    await runStoreAction(set, async () => {
      const previewTasks = sortGeneratedTasksByStartTime(get().previewTasks);
      const tasks = await bulkCreateTasks(
        previewTasks.map((task) => ({
          title: task.title,
          startTime: task.startTime,
          endTime: task.endTime,
          aiGenerated: task.aiGenerated ?? false,
        })),
      );
      for (const task of tasks) {
        await scheduleTaskNotification(task);
      }
      set({ previewTasks: [] });
    });
  },

  clearError: () => set({ error: null }),

  todayTasks: (now) => getTodayTasks(get().tasks, now),
  currentTask: (now) => getCurrentTask(get().todayTasks(now), now),
  upcomingTasks: (now) => getUpcomingTasks(get().todayTasks(now), now),
}));
