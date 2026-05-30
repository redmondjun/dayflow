import { describe, expect, it } from '@jest/globals';
import type { Task } from '../../types/task';
import {
  findRememberedEstimatedDuration,
  findRememberedTaskDescription,
  normalizeTaskTitle,
} from './taskTitleMemory';

function makeTask(partial: Partial<Task> & Pick<Task, 'title'>): Task {
  return {
    id: '1',
    startTime: '2026-01-01T09:00:00.000Z',
    endTime: '2026-01-01T10:00:00.000Z',
    status: 'scheduled',
    aiGenerated: false,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...partial,
    title: partial.title,
  };
}

describe('taskTitleMemory', () => {
  it('normalizes titles case-insensitively', () => {
    expect(normalizeTaskTitle('  Gym  ')).toBe('gym');
  });

  it('returns latest description for matching title', () => {
    const tasks = [
      makeTask({
        title: 'Gym',
        description: 'Old note',
        updatedAt: '2026-01-01T08:00:00.000Z',
      }),
      makeTask({
        title: ' gym ',
        description: 'Leg day',
        updatedAt: '2026-01-02T08:00:00.000Z',
      }),
    ];

    expect(findRememberedTaskDescription(tasks, 'GYM')).toBe('Leg day');
  });

  it('returns latest estimated duration for matching title', () => {
    const tasks = [
      makeTask({
        title: 'LeetCode',
        estimatedDurationMinutes: 30,
        updatedAt: '2026-01-01T08:00:00.000Z',
      }),
      makeTask({
        title: 'leetcode',
        estimatedDurationMinutes: 25,
        updatedAt: '2026-01-03T08:00:00.000Z',
      }),
    ];

    expect(findRememberedEstimatedDuration(tasks, 'LeetCode')).toBe(25);
  });

  it('returns null for empty title', () => {
    expect(findRememberedTaskDescription([], '   ')).toBeNull();
  });
});
