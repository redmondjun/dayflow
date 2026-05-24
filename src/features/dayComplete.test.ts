import { describe, expect, it } from '@jest/globals';
import { resolveDayCompleteCandidate } from './dayComplete';
import type { Task } from '../types/task';

function makeTask(
  title: string,
  startHour: number,
  endHour: number,
  status: Task['status'],
  day = 23,
): Task {
  const start = new Date(2026, 4, day, startHour, 0, 0, 0);
  const end = new Date(2026, 4, day, endHour, 0, 0, 0);

  return {
    id: `${title}-${day}-${startHour}`,
    title,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status,
    aiGenerated: false,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  };
}

describe('resolveDayCompleteCandidate', () => {
  it('returns today when all tasks for the current day are finished', () => {
    const now = new Date(2026, 4, 23, 18, 0, 0, 0);
    const tasks = [
      makeTask('Morning walk', 7, 8, 'completed'),
      makeTask('Deep work', 9, 11, 'skipped'),
    ];

    const candidate = resolveDayCompleteCandidate(tasks, now);

    expect(candidate?.dayKey).toBe('2026-05-23');
    expect(candidate?.tasks.map((task) => task.title)).toEqual(['Morning walk', 'Deep work']);
  });

  it('returns yesterday when the clock has moved into the next day', () => {
    const now = new Date(2026, 4, 24, 1, 0, 0, 0);
    const tasks = [makeTask('Morning walk', 7, 8, 'completed', 23)];

    const candidate = resolveDayCompleteCandidate(tasks, now);

    expect(candidate?.dayKey).toBe('2026-05-23');
    expect(candidate?.tasks).toHaveLength(1);
  });

  it('does not return yesterday when tasks are still scheduled', () => {
    const now = new Date(2026, 4, 24, 1, 0, 0, 0);
    const tasks = [makeTask('Morning walk', 7, 8, 'scheduled', 23)];

    expect(resolveDayCompleteCandidate(tasks, now)).toBeNull();
  });

  it('does not return a candidate when the day has no tasks', () => {
    const now = new Date(2026, 4, 24, 1, 0, 0, 0);

    expect(resolveDayCompleteCandidate([], now)).toBeNull();
  });
});
