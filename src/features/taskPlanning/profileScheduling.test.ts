import { describe, expect, it } from '@jest/globals';
import { getProfileSchedulingContext } from './profileScheduling';
import { schedulingContextForDay } from './planningDay';
import type { OnboardingProfile } from '../../services/onboardingProfile';

describe('getProfileSchedulingContext', () => {
  const referenceNow = new Date(2026, 4, 23, 8, 0, 0, 0);
  const context = schedulingContextForDay(referenceNow, referenceNow);

  it('maps focus Evening to an evening window', () => {
    const profile: OnboardingProfile = {
      wake: '7:00 AM',
      sleep: '11:00 PM',
      focus: 'Evening',
    };

    const scheduleContext = getProfileSchedulingContext(profile, context, null);

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

    const scheduleContext = getProfileSchedulingContext(profile, context, null);

    expect(scheduleContext.freeTimeBudget).toEqual({
      minMinutes: 60,
      maxMinutes: 120,
      label: '1-2 hours',
    });
  });

  it('includes preset commitment windows when commitments exist', () => {
    const profile: OnboardingProfile = {
      'commitment-presence': 'Yes',
      'commitment-time': { option: 'Morning (6AM - 12PM)' },
    };

    const scheduleContext = getProfileSchedulingContext(profile, context, null);

    expect(scheduleContext.commitmentWindows).toEqual([
      { start: '06:00', end: '12:00', label: 'Morning commitments' },
    ]);
  });

  it('skips commitment windows when user has no fixed commitments', () => {
    const profile: OnboardingProfile = {
      'commitment-presence': 'No',
      'commitment-time': { option: 'Morning (6AM - 12PM)' },
    };

    const scheduleContext = getProfileSchedulingContext(profile, context, null);

    expect(scheduleContext.commitmentWindows).toBeUndefined();
  });
});
