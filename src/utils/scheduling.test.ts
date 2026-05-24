import { describe, expect, it } from '@jest/globals';
import type { TaskInputRow } from '../types/task';
import { buildHybridPreview } from './scheduling';
import { formatInputTime } from './time';

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
  const now = new Date(2026, 4, 23, 8, 0, 0, 0);

  it('slots AI tasks around a pinned lunch break', () => {
    const rows: TaskInputRow[] = [
      row('Morning walk', { aiScheduled: true }),
      row('Lunch', { startTime: '12:00', endTime: '13:00' }),
      row('Deep work', { aiScheduled: true }),
    ];

    const preview = buildHybridPreview(
      rows,
      [
        { title: 'Morning walk', durationMinutes: 30 },
        { title: 'Deep work', durationMinutes: 90 },
      ],
      { now, preferredStart: '08:00' },
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

    const preview = buildHybridPreview(rows, [], { now });

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

    const preview = buildHybridPreview(rows, [], { now });

    expect(preview.map((task) => task.title)).toEqual([
      'Morning standup',
      'Lunch',
      'Afternoon review',
    ]);
  });
});
