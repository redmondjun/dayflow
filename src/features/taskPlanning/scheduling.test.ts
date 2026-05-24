import { describe, expect, it } from '@jest/globals';
import type { Task } from '../../types/task';
import { schedulingContextForDay } from './planningDay';
import { findNextAvailableSlot, validateManualTaskTimes } from './scheduling';
import { addLocalDays } from '../../utils/time';

function makeLocalTask(
  day: Date,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
): Task {
  const start = new Date(day);
  start.setHours(startHour, startMin, 0, 0);
  const end = new Date(day);
  end.setHours(endHour, endMin, 0, 0);

  return {
    id: `${startHour}:${startMin}-${endHour}:${endMin}`,
    title: 'Existing task',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: 'scheduled',
    aiGenerated: false,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  };
}

function ctx(referenceNow: Date, planningDay = referenceNow) {
  return schedulingContextForDay(planningDay, referenceNow);
}

describe('findNextAvailableSlot', () => {
  it('starts after now when there are no existing tasks', () => {
    const referenceNow = new Date(2026, 4, 23, 9, 7, 0, 0);

    const slot = findNextAvailableSlot({ context: ctx(referenceNow), durationMinutes: 60 });

    expect(slot.startTime).toBe('09:10');
    expect(slot.endTime).toBe('10:10');
  });

  it('avoids overlap with existing tasks', () => {
    const referenceNow = new Date(2026, 4, 23, 9, 0, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 9, 0, 10, 0)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
    });

    expect(slot.startTime).toBe('10:05');
    expect(slot.endTime).toBe('11:05');
  });

  it('starts after now when an upcoming task is later in the day', () => {
    const referenceNow = new Date(2026, 4, 23, 12, 12, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 13, 55, 14, 55)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
    });

    expect(slot.startTime).toBe('12:15');
    expect(slot.endTime).toBe('13:15');
  });

  it('skips an in-progress task and starts after it ends', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 12, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 13, 55, 14, 55)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
    });

    expect(slot.startTime).toBe('15:00');
    expect(slot.endTime).toBe('16:00');
  });

  it('does not default into a 1:55 PM - 2:55 PM block while that task is in progress', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 12, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 13, 55, 14, 55)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
    });

    expect(slot.startTime).not.toBe('14:15');
    expect(slot.endTime).not.toBe('15:15');
    expect(slot.startTime).toBe('15:00');
    expect(slot.endTime).toBe('16:00');
  });

  it('uses preferredStart when the schedule is empty', () => {
    const referenceNow = new Date(2026, 4, 23, 8, 7, 0, 0);

    const slot = findNextAvailableSlot({
      context: ctx(referenceNow),
      durationMinutes: 60,
      preferredStart: '09:00',
    });

    expect(slot.startTime).toBe('09:00');
    expect(slot.endTime).toBe('10:00');
  });

  it('bumps preferredStart to now when it is already past', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 12, 0, 0);

    const slot = findNextAvailableSlot({
      context: ctx(referenceNow),
      durationMinutes: 60,
      preferredStart: '09:00',
    });

    expect(slot.startTime).toBe('14:15');
    expect(slot.endTime).toBe('15:15');
  });

  it('uses preferredStart as a floor even when other tasks exist later in the day', () => {
    const referenceNow = new Date(2026, 4, 23, 6, 0, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 14, 0, 15, 0)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
      preferredStart: '07:00',
    });

    expect(slot.startTime).toBe('07:00');
    expect(slot.endTime).toBe('08:00');
  });

  it('respects preferredStart before an existing morning task', () => {
    const referenceNow = new Date(2026, 4, 23, 8, 0, 0, 0);
    const existingTasks = [makeLocalTask(referenceNow, 9, 0, 10, 0)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow),
      durationMinutes: 60,
      preferredStart: '09:00',
    });

    expect(slot.startTime).toBe('10:05');
    expect(slot.endTime).toBe('11:05');
  });

  it('starts at preferredStart on a future day without bumping to referenceNow', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 0, 0, 0);
    const planningDay = addLocalDays(referenceNow, 3);

    const slot = findNextAvailableSlot({
      context: ctx(referenceNow, planningDay),
      durationMinutes: 60,
      preferredStart: '07:00',
    });

    expect(slot.startTime).toBe('07:00');
    expect(slot.endTime).toBe('08:00');
  });

  it('only conflicts against tasks on the planning day', () => {
    const referenceNow = new Date(2026, 4, 23, 10, 0, 0, 0);
    const tomorrow = addLocalDays(referenceNow, 1);
    const existingTasks = [makeLocalTask(referenceNow, 9, 0, 10, 0)];

    const slot = findNextAvailableSlot({
      existingTasks,
      context: ctx(referenceNow, tomorrow),
      durationMinutes: 60,
      preferredStart: '09:00',
    });

    expect(slot.startTime).toBe('09:00');
    expect(slot.endTime).toBe('10:00');
  });
});

describe('validateManualTaskTimes', () => {
  const referenceNow = new Date(2026, 4, 23, 12, 0, 0, 0);

  it('requires end time to be after start time', () => {
    expect(validateManualTaskTimes('13:00', '12:30', ctx(referenceNow)).error).toBe(
      'End time must be later than start time.',
    );
  });

  it('warns when the full task is in the past', () => {
    const result = validateManualTaskTimes('09:00', '10:00', ctx(referenceNow));

    expect(result.error).toBeNull();
    expect(result.willMarkCompleted).toBe(true);
    expect(result.pastNotice).toContain('saved as completed');
  });

  it('rejects times that overlap an existing scheduled task', () => {
    const existingTasks = [makeLocalTask(referenceNow, 13, 0, 14, 0)];

    const result = validateManualTaskTimes('13:30', '14:30', ctx(referenceNow), {
      existingTasks,
      plannerRows: [],
    });

    expect(result.error).toBe('This time overlaps with another scheduled task.');
  });

  it('rejects times that overlap another planner row', () => {
    const plannerRows = [
      {
        id: 'row-1',
        title: 'Morning workout',
        startTime: '09:00',
        endTime: '10:00',
        isDraft: false,
      },
    ];

    const result = validateManualTaskTimes('09:30', '10:30', ctx(referenceNow), {
      plannerRows,
      excludeRowId: 'row-2',
    });

    expect(result.error).toBe('This time overlaps with another scheduled task.');
  });

  it('allows editing a row without conflicting with itself', () => {
    const plannerRows = [
      {
        id: 'row-1',
        title: 'Morning workout',
        startTime: '09:00',
        endTime: '10:00',
        isDraft: false,
      },
    ];

    const result = validateManualTaskTimes('09:00', '10:00', ctx(referenceNow), {
      plannerRows,
      excludeRowId: 'row-1',
    });

    expect(result.error).toBeNull();
  });

  it('skips past notices for future planning days', () => {
    const tomorrow = addLocalDays(referenceNow, 1);
    const result = validateManualTaskTimes('09:00', '10:00', ctx(referenceNow, tomorrow));

    expect(result.error).toBeNull();
    expect(result.willMarkCompleted).toBe(false);
    expect(result.pastNotice).toBeNull();
  });

  it('validates future-day tasks without tomorrow-only shortcuts', () => {
    const futureDay = addLocalDays(referenceNow, 3);
    const result = validateManualTaskTimes('09:00', '10:00', ctx(referenceNow, futureDay));

    expect(result.error).toBeNull();
    expect(result.willMarkCompleted).toBe(false);
  });
});
