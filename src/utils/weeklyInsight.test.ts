import { describe, expect, it } from '@jest/globals';
import type { Task } from '../types/task';
import { buildWeeklyInsightSummary } from './weeklyInsight';

function makeTask(id: string, startTime: Date): Task {
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);

  return {
    id,
    title: `Task ${id}`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: 'completed',
    aiGenerated: false,
    createdAt: startTime.toISOString(),
    updatedAt: endTime.toISOString(),
  };
}

describe('buildWeeklyInsightSummary', () => {
  const now = new Date(2026, 4, 21, 18, 0);

  it('uses morning in the headline when morning is the peak period', () => {
    const summary = buildWeeklyInsightSummary(
      [
        makeTask('morning-1', new Date(2026, 4, 20, 10, 0)),
        makeTask('morning-2', new Date(2026, 4, 20, 11, 0)),
        makeTask('afternoon-1', new Date(2026, 4, 20, 14, 0)),
      ],
      now,
    );

    expect(summary.headline).toBe('You are most productive in the morning');
    expect(summary.peakHourLabel).toBe('10 AM');
  });

  it('uses afternoon in the headline when afternoon is the peak period', () => {
    const summary = buildWeeklyInsightSummary(
      [
        makeTask('morning-1', new Date(2026, 4, 20, 10, 0)),
        makeTask('afternoon-1', new Date(2026, 4, 20, 14, 0)),
        makeTask('afternoon-2', new Date(2026, 4, 20, 15, 0)),
      ],
      now,
    );

    expect(summary.headline).toBe('You are most productive in the afternoon');
    expect(summary.peakHourLabel).toBe('2 PM');
  });

  it('uses evening in the headline when evening is the peak period', () => {
    const summary = buildWeeklyInsightSummary(
      [
        makeTask('afternoon-1', new Date(2026, 4, 20, 14, 0)),
        makeTask('evening-1', new Date(2026, 4, 20, 18, 0)),
        makeTask('evening-2', new Date(2026, 4, 20, 19, 0)),
      ],
      now,
    );

    expect(summary.headline).toBe('You are most productive in the evening');
    expect(summary.peakHourLabel).toBe('6 PM');
  });

  it('leaves patterns and suggestions empty for AI-generated insight content', () => {
    const summary = buildWeeklyInsightSummary(
      [makeTask('morning-1', new Date(2026, 4, 20, 10, 0))],
      now,
    );

    expect(summary.patterns).toEqual([]);
    expect(summary.suggestions).toEqual([]);
  });
});
