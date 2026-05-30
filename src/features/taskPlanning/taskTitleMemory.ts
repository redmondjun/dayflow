import type { Task } from '../../types/task';

export function normalizeTaskTitle(value: string): string {
  return value.trim().toLowerCase();
}

function findLatestMatchingTask(
  tasks: Task[],
  title: string,
  hasValue: (task: Task) => boolean,
): Task | null {
  const normalized = normalizeTaskTitle(title);
  if (!normalized) return null;

  let latest: Task | null = null;
  for (const task of tasks) {
    if (normalizeTaskTitle(task.title) !== normalized || !hasValue(task)) continue;
    if (!latest || new Date(task.updatedAt).getTime() > new Date(latest.updatedAt).getTime()) {
      latest = task;
    }
  }
  return latest;
}

export function findRememberedTaskDescription(tasks: Task[], title: string): string | null {
  const match = findLatestMatchingTask(
    tasks,
    title,
    (task) => typeof task.description === 'string' && task.description.trim().length > 0,
  );
  return match?.description?.trim() ?? null;
}

export function findRememberedEstimatedDuration(tasks: Task[], title: string): number | null {
  const match = findLatestMatchingTask(
    tasks,
    title,
    (task) =>
      typeof task.estimatedDurationMinutes === 'number' &&
      Number.isFinite(task.estimatedDurationMinutes) &&
      task.estimatedDurationMinutes > 0,
  );
  return match?.estimatedDurationMinutes ?? null;
}
