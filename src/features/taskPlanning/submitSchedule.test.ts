import { describe, expect, it } from '@jest/globals';
import { schedulingContextForDay } from './planningDay';
import { validateManualTaskRows } from './submitSchedule';
import type { TaskInputRow } from '../../types/task';

function makeRow(overrides: Partial<TaskInputRow> = {}): TaskInputRow {
  return {
    id: 'row-1',
    title: 'Focus block',
    startTime: '10:00',
    endTime: '11:00',
    aiScheduled: false,
    isDraft: false,
    ...overrides,
  };
}

describe('validateManualTaskRows', () => {
  const referenceNow = new Date(2026, 4, 23, 9, 0, 0, 0);
  const context = schedulingContextForDay(referenceNow, referenceNow);

  it('returns parsed inputs for valid rows', () => {
    const result = validateManualTaskRows([makeRow()], { existingTasks: [], context });
    expect(result.error).toBeNull();
    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]?.title).toBe('Focus block');
  });

  it('returns an error when end time is before start time', () => {
    const result = validateManualTaskRows([makeRow({ startTime: '11:00', endTime: '10:00' })], {
      existingTasks: [],
      context,
    });
    expect(result.error).toBe('End time must be later than start time.');
    expect(result.inputs).toEqual([]);
  });
});
