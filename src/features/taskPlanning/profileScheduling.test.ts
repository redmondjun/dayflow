import { describe, expect, it } from '@jest/globals';
import { getProfileSchedulingContext } from './profileScheduling';
import { schedulingContextForDay } from './planningDay';
import type { OnboardingProfile } from '../../services/onboardingProfile';
import { WEEKEND_RHYTHM_DIFFERENT } from './profileDayContext';

describe('getProfileSchedulingContext', () => {
  const weekday = new Date(2026, 4, 25, 8, 0, 0, 0);
  const saturday = new Date(2026, 4, 23, 8, 0, 0, 0);
  const weekdayContext = schedulingContextForDay(weekday, weekday);
  const saturdayContext = schedulingContextForDay(saturday, saturday);

  it('maps focus Evening to an evening window', () => {
    const profile: OnboardingProfile = {
      wake: '7:00 AM',
      sleep: '11:00 PM',
      focus: 'Evening',
    };

    const scheduleContext = getProfileSchedulingContext(profile, weekdayContext, null);

    expect(scheduleContext.focusWindow).toEqual({
      start: '17:00',
      end: '21:00',
      label: 'Evening',
    });
  });

  it('maps free-time to a minute budget', () => {
    const profile: OnboardingProfile = {
      'free-time': '1-2 hours',
    };

    const scheduleContext = getProfileSchedulingContext(profile, weekdayContext, null);

    expect(scheduleContext.freeTimeBudget).toEqual({
      minMinutes: 60,
      maxMinutes: 120,
      label: '1-2 hours',
    });
  });

  it('includes work and extra commitment windows on work days', () => {
    const profile: OnboardingProfile = {
      work: '9:00 AM',
      'work-end': '5:00 PM',
      'work-days': 'Mon,Tue,Wed,Thu,Fri',
      'commitment-presence': 'Yes',
      'commitment-time': { option: 'Morning (6AM - 12PM)' },
    };

    const scheduleContext = getProfileSchedulingContext(profile, weekdayContext, null);

    expect(scheduleContext.commitmentWindows).toEqual([
      { start: '09:00', end: '17:00', label: 'Work' },
      { start: '06:00', end: '12:00', label: 'Morning commitments' },
    ]);
  });

  it('skips commitment windows on non-work weekend days', () => {
    const profile: OnboardingProfile = {
      work: '9:00 AM',
      'work-end': '5:00 PM',
      'work-days': 'Mon,Tue,Wed,Thu,Fri',
      'commitment-presence': 'Yes',
      'commitment-time': { option: 'Afternoon (12PM - 6PM)' },
      focus: 'Evening',
    };

    const scheduleContext = getProfileSchedulingContext(profile, saturdayContext, null);

    expect(scheduleContext.commitmentWindows).toBeUndefined();
    expect(scheduleContext.dayTypeLabel).toBe('Saturday (weekend — no work commitments)');
  });

  it('uses weekend focus and free-time overrides when configured', () => {
    const profile: OnboardingProfile = {
      focus: 'Evening',
      'free-time': '1-2 hours',
      'weekend-rhythm': WEEKEND_RHYTHM_DIFFERENT,
      'weekend-focus': 'Morning',
      'weekend-free-time': '3-4 hours',
    };

    const scheduleContext = getProfileSchedulingContext(profile, saturdayContext, null);

    expect(scheduleContext.focusWindow).toEqual({
      start: '06:00',
      end: '11:00',
      label: 'Morning',
    });
    expect(scheduleContext.freeTimeBudget).toEqual({
      minMinutes: 180,
      maxMinutes: 240,
      label: '3-4 hours',
    });
  });

  it('skips commitment windows when user has no fixed commitments on work days', () => {
    const profile: OnboardingProfile = {
      'commitment-presence': 'No',
      'commitment-time': { option: 'Morning (6AM - 12PM)' },
      work: '9:00 AM',
      'work-end': '5:00 PM',
      'work-days': 'Mon,Tue,Wed,Thu,Fri',
    };

    const scheduleContext = getProfileSchedulingContext(profile, weekdayContext, null);

    expect(scheduleContext.commitmentWindows).toEqual([
      { start: '09:00', end: '17:00', label: 'Work' },
    ]);
  });
});
