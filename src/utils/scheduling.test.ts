import { describe, expect, it } from '@jest/globals';
import type { TaskInputRow } from '../types/task';
import { schedulingContextForDay } from '../features/taskPlanning/planningDay';
import { buildHybridPreview } from './scheduling';
import { addLocalDays, formatInputTime } from './time';

function row(
  title: string,
  options: { aiScheduled?: boolean; startTime?: string; endTime?: string } = {},
): TaskInputRow {
  return {
    id: title.toLowerCase().replace(/\s+/g, '-'),
    title,
    startTime: options.startTime ?? '',
    endTime: options.endTime ?? '',
    aiScheduled: options.aiScheduled,
  };
}

function toClock(time: string) {
  return formatInputTime(time);
}

describe('buildHybridPreview', () => {
  const referenceNow = new Date(2026, 4, 23, 8, 0, 0, 0);
  const context = schedulingContextForDay(referenceNow, referenceNow);

  it('slots AI tasks around a pinned lunch break', () => {
    const rows: TaskInputRow[] = [
      row('Morning walk', { aiScheduled: true }),
      row('Lunch', { startTime: '12:00', endTime: '13:00' }),
      row('Deep work', { aiScheduled: true }),
    ];

    const preview = buildHybridPreview(
      rows,
      [
        { title: 'Morning walk', durationMinutes: 30, startTime: '08:00' },
        { title: 'Deep work', durationMinutes: 90, startTime: '12:30' },
      ],
      { context, preferredStart: '08:00' },
    );

    expect(preview).toHaveLength(3);

    const walk = preview[0];
    const lunch = preview[1];
    const deepWork = preview[2];

    expect(walk.title).toBe('Morning walk');
    expect(walk.aiGenerated).toBe(true);
    expect(toClock(walk.endTime) <= '12:00').toBe(true);

    expect(lunch.title).toBe('Lunch');
    expect(lunch.aiGenerated).toBe(false);
    expect(toClock(lunch.startTime)).toBe('12:00');
    expect(toClock(lunch.endTime)).toBe('13:00');

    expect(deepWork.title).toBe('Deep work');
    expect(deepWork.aiGenerated).toBe(true);
    expect(toClock(deepWork.startTime) >= '13:05').toBe(true);
  });

  it('returns manual-only preview without AI durations', () => {
    const rows: TaskInputRow[] = [row('Lunch', { startTime: '12:00', endTime: '13:00' })];

    const preview = buildHybridPreview(rows, [], { context });

    expect(preview).toHaveLength(1);
    expect(preview[0].aiGenerated).toBe(false);
    expect(toClock(preview[0].startTime)).toBe('12:00');
  });

  it('sorts preview tasks by start time ascending', () => {
    const rows: TaskInputRow[] = [
      row('Afternoon review', { startTime: '15:00', endTime: '16:00' }),
      row('Morning standup', { startTime: '09:00', endTime: '09:30' }),
      row('Lunch', { startTime: '12:00', endTime: '13:00' }),
    ];

    const preview = buildHybridPreview(rows, [], { context });

    expect(preview.map((task) => task.title)).toEqual([
      'Morning standup',
      'Lunch',
      'Afternoon review',
    ]);
  });

  it('anchors preview tasks to a future planning day', () => {
    const tomorrow = addLocalDays(referenceNow, 1);
    const futureContext = schedulingContextForDay(tomorrow, referenceNow);
    const rows: TaskInputRow[] = [row('Morning walk', { startTime: '07:00', endTime: '08:00' })];

    const preview = buildHybridPreview(rows, [], { context: futureContext });

    expect(new Date(preview[0].startTime).getDate()).toBe(24);
    expect(toClock(preview[0].startTime)).toBe('07:00');
  });

  it('uses AI start times instead of input order for scrambled tasks', () => {
    const earlyContext = schedulingContextForDay(referenceNow, new Date(2026, 4, 23, 6, 0, 0, 0));
    const rows: TaskInputRow[] = [
      row('Sleep', { aiScheduled: true }),
      row('Dinner', { aiScheduled: true }),
      row('Breakfast', { aiScheduled: true }),
      row('Work', { aiScheduled: true }),
    ];

    const preview = buildHybridPreview(
      rows,
      [
        { title: 'Breakfast', durationMinutes: 30, startTime: '07:30' },
        { title: 'Work', durationMinutes: 240, startTime: '09:00' },
        { title: 'Dinner', durationMinutes: 45, startTime: '19:00' },
        { title: 'Sleep', durationMinutes: 30, startTime: '22:30' },
      ],
      { context: earlyContext, preferredStart: '07:00' },
    );

    expect(preview.map((task) => task.title)).toEqual(['Breakfast', 'Work', 'Dinner', 'Sleep']);
    expect(toClock(preview[0].startTime)).toBe('07:30');
    expect(toClock(preview[3].startTime)).toBe('22:30');
  });
});
