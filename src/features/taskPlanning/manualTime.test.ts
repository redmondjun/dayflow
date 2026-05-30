import { describe, expect, it } from '@jest/globals';
import { computeDurationFromStartAndEnd, syncManualRowTimes } from './manualTime';

describe('manualTime helpers', () => {
  const planningDay = new Date(2026, 4, 23, 0, 0, 0, 0);

  it('computes end from start and duration', () => {
    const synced = syncManualRowTimes(
      { startTime: '09:00', endTime: '', durationMinutes: 45, timeInputMode: 'duration' },
      planningDay,
    );
    expect(synced.endTime).toBe('09:45');
    expect(synced.durationMinutes).toBe(45);
  });

  it('computes duration from start and end in end mode', () => {
    const duration = computeDurationFromStartAndEnd('09:00', '10:30', planningDay);
    expect(duration).toBe(90);
  });

  it('preserves start when switching modes', () => {
    const fromDuration = syncManualRowTimes(
      { startTime: '09:00', endTime: '09:45', durationMinutes: 45, timeInputMode: 'duration' },
      planningDay,
    );
    const fromEnd = syncManualRowTimes({ ...fromDuration, timeInputMode: 'end' }, planningDay);
    expect(fromEnd.startTime).toBe('09:00');
    expect(fromEnd.durationMinutes).toBe(45);
  });
});
