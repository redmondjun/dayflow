import { describe, expect, it } from '@jest/globals';
import { isValidScheduleStartTime, validateGeneratedTasks } from './validators';

describe('validateGeneratedTasks', () => {
  it('accepts tasks with valid start times', () => {
    const tasks = validateGeneratedTasks({
      tasks: [{ title: 'Deep work', durationMinutes: 90, startTime: '18:00' }],
    });

    expect(tasks).toEqual([{ title: 'Deep work', durationMinutes: 90, startTime: '18:00' }]);
  });

  it('rejects invalid start times', () => {
    expect(() =>
      validateGeneratedTasks({
        tasks: [{ title: 'Deep work', durationMinutes: 90, startTime: '25:00' }],
      }),
    ).toThrow('AI response included an invalid start time.');
  });

  it('rejects missing start times', () => {
    expect(() =>
      validateGeneratedTasks({
        tasks: [{ title: 'Deep work', durationMinutes: 90 }],
      }),
    ).toThrow('AI response included an invalid start time.');
  });
});

describe('isValidScheduleStartTime', () => {
  it('accepts 24-hour clock values', () => {
    expect(isValidScheduleStartTime('07:30')).toBe(true);
    expect(isValidScheduleStartTime('23:59')).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isValidScheduleStartTime('7:3')).toBe(false);
    expect(isValidScheduleStartTime('noon')).toBe(false);
  });
});
