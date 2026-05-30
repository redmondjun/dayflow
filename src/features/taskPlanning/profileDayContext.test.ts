import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_WORK_DAYS_VALUE,
  getEffectiveDayProfile,
  getPlanningDayKind,
  isWorkDay,
  normalizeProfileWithDefaults,
  parseWorkDays,
  WEEKEND_RHYTHM_DIFFERENT,
} from './profileDayContext';
import type { OnboardingProfile } from '../../services/onboardingProfile';

describe('profileDayContext', () => {
  const saturday = new Date(2026, 4, 23, 10, 0, 0, 0);
  const monday = new Date(2026, 4, 25, 10, 0, 0, 0);

  it('parses stored work days', () => {
    expect(parseWorkDays('Mon,Wed,Fri')).toEqual(['Mon', 'Wed', 'Fri']);
    expect(parseWorkDays('')).toEqual([]);
    expect(parseWorkDays(undefined)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  });

  it('treats no selected work days as non-work days', () => {
    const profile: OnboardingProfile = {
      'work-days': '',
    };

    expect(isWorkDay(profile, monday)).toBe(false);
    expect(isWorkDay(profile, saturday)).toBe(false);
  });

  it('defaults missing profile fields for migration', () => {
    expect(normalizeProfileWithDefaults({ wake: '7:00 AM' })).toEqual({
      wake: '7:00 AM',
      'work-days': DEFAULT_WORK_DAYS_VALUE,
      'weekend-rhythm': 'Same as weekdays',
    });
  });

  it('treats Saturday as a non-work day when work days are Mon-Fri', () => {
    const profile: OnboardingProfile = {
      'work-days': DEFAULT_WORK_DAYS_VALUE,
    };

    expect(isWorkDay(profile, saturday)).toBe(false);
    expect(isWorkDay(profile, monday)).toBe(true);
  });

  it('uses weekend overrides on Saturday when configured', () => {
    const profile: OnboardingProfile = {
      wake: '7:00 AM',
      focus: 'Evening',
      'free-time': '1-2 hours',
      'weekend-rhythm': WEEKEND_RHYTHM_DIFFERENT,
      'weekend-wake': '9:00 AM',
      'weekend-focus': 'Morning',
      'weekend-free-time': '3-4 hours',
    };

    expect(getEffectiveDayProfile(profile, saturday)).toEqual(
      expect.objectContaining({
        wake: '9:00 AM',
        focus: 'Morning',
        freeTime: '3-4 hours',
        isWorkDay: false,
        isWeekend: true,
        usesWeekendOverrides: true,
      }),
    );
  });

  it('describes weekend days without work commitments', () => {
    const profile: OnboardingProfile = {
      'work-days': DEFAULT_WORK_DAYS_VALUE,
    };

    expect(getPlanningDayKind(saturday, profile).dayTypeLabel).toBe(
      'Saturday (weekend — no work commitments)',
    );
  });
});
