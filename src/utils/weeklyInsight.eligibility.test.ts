import { describe, expect, it } from '@jest/globals';
import type { Task } from '../types/task';
import { hasRecentCompletedOrSkippedTasks, getTasksInLastSevenDays } from './weeklyInsight';

function makeTask(daysAgo: number, status: Task['status']): Task {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  return {
    id: `task-${daysAgo}-${status}`,
    title: 'Task',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status,
    aiGenerated: false,
    createdAt: start.toISOString(),
    updatedAt: end.toISOString(),
  };
}

describe('weekly insight eligibility helpers', () => {
  const now = new Date('2026-05-23T12:00:00.000Z');

  it('filters tasks to the last seven days', () => {
    const tasks = [makeTask(3, 'completed'), makeTask(10, 'completed')];
    expect(getTasksInLastSevenDays(tasks, now)).toHaveLength(1);
  });

  it('detects recent completed or skipped tasks', () => {
    const tasks = [makeTask(2, 'completed'), makeTask(1, 'scheduled')];
    expect(hasRecentCompletedOrSkippedTasks(tasks, now)).toBe(true);
  });

  it('returns false when only scheduled tasks exist in the window', () => {
    const tasks = [makeTask(2, 'scheduled')];
    expect(hasRecentCompletedOrSkippedTasks(tasks, now)).toBe(false);
  });
});
