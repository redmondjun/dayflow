import { describe, expect, it } from '@jest/globals';
import { schedulingContextForDay } from './planningDay';
import { getTaskPlanningDefaultsFromProfile } from './profileDefaults';
import { addLocalDays } from '../../utils/time';

describe('getTaskPlanningDefaultsFromProfile', () => {
  it('uses wake time when it is still in the future', () => {
    const referenceNow = new Date(2026, 4, 23, 6, 7, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      { work: '9:00 AM', wake: '7:00 AM', 'free-time': '1-2 hours' },
      schedulingContextForDay(referenceNow, referenceNow),
    );

    expect(defaults).toEqual({
      preferredStart: '07:00',
      durationMinutes: 60,
    });
  });

  it('prefers wake time over work time when both are set', () => {
    const referenceNow = new Date(2026, 4, 23, 6, 30, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      { work: '9:00 AM', wake: '7:00 AM' },
      schedulingContextForDay(referenceNow, referenceNow),
    );

    expect(defaults.preferredStart).toBe('07:00');
  });

  it('bumps to the next five-minute slot when wake time is already past', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 12, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      { work: '9:00 AM', wake: '7:00 AM', 'free-time': '2-3 hours' },
      schedulingContextForDay(referenceNow, referenceNow),
    );

    expect(defaults).toEqual({
      preferredStart: '14:15',
      durationMinutes: 60,
    });
  });

  it('falls back to work time when wake is missing', () => {
    const referenceNow = new Date(2026, 4, 23, 8, 0, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      { work: '9:00 AM' },
      schedulingContextForDay(referenceNow, referenceNow),
    );

    expect(defaults.preferredStart).toBe('09:00');
    expect(defaults.durationMinutes).toBe(60);
  });

  it('uses 9:00 AM when profile is missing', () => {
    const referenceNow = new Date(2026, 4, 23, 8, 0, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      null,
      schedulingContextForDay(referenceNow, referenceNow),
    );

    expect(defaults).toEqual({
      preferredStart: '09:00',
      durationMinutes: 60,
    });
  });

  it('uses weekend wake time on Saturday when weekend overrides are enabled', () => {
    const saturday = new Date(2026, 4, 23, 14, 12, 0, 0);

    const defaults = getTaskPlanningDefaultsFromProfile(
      {
        work: '9:00 AM',
        wake: '7:00 AM',
        'weekend-rhythm': 'Different on weekends',
        'weekend-wake': '9:00 AM',
      },
      schedulingContextForDay(saturday, saturday),
    );

    expect(defaults.preferredStart).toBe('14:15');
  });

  it('uses wake time only for future planning days', () => {
    const referenceNow = new Date(2026, 4, 23, 14, 12, 0, 0);
    const tomorrow = addLocalDays(referenceNow, 1);

    const defaults = getTaskPlanningDefaultsFromProfile(
      { work: '9:00 AM', wake: '7:00 AM' },
      schedulingContextForDay(tomorrow, referenceNow),
    );

    expect(defaults.preferredStart).toBe('07:00');
  });
});
