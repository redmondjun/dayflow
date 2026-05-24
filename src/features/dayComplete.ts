import type { Task } from '../types/task';
import { getLocalDayKey, getTodayTasks, isSameLocalDay } from '../utils/time';

export type DayCompleteCandidate = {
  day: Date;
  dayKey: string;
  tasks: Task[];
};

function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return getTodayTasks(tasks, day);
}

function isDayWrappedUp(tasks: Task[]): boolean {
  if (tasks.length === 0) return false;
  return tasks.every((task) => task.status === 'completed' || task.status === 'skipped');
}

export function resolveDayCompleteCandidate(
  tasks: Task[],
  now = new Date(),
): DayCompleteCandidate | null {
  const todayTasks = getTasksForDay(tasks, now);
  if (isDayWrappedUp(todayTasks)) {
    return {
      day: now,
      dayKey: getLocalDayKey(now),
      tasks: todayTasks.filter((task) => task.status !== 'scheduled'),
    };
  }

  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  if (isSameLocalDay(previousDay, now)) return null;

  const previousDayTasks = getTasksForDay(tasks, previousDay);
  if (!isDayWrappedUp(previousDayTasks)) return null;

  return {
    day: previousDay,
    dayKey: getLocalDayKey(previousDay),
    tasks: previousDayTasks.filter((task) => task.status !== 'scheduled'),
  };
}
