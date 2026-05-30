import type { OnboardingProfile } from '../../services/onboardingProfile';
import type { OnboardingAnswer } from '../onboarding';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const LONG_WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export const WEEKDAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DEFAULT_WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export const DEFAULT_WORK_DAYS_VALUE = DEFAULT_WORK_DAYS.join(',');
export const WEEKEND_RHYTHM_SAME = 'Same as weekdays';
export const WEEKEND_RHYTHM_DIFFERENT = 'Different on weekends';

export type EffectiveDayProfile = {
  wake: unknown;
  focus: unknown;
  freeTime: unknown;
  workStart: unknown;
  workEnd: unknown;
  isWorkDay: boolean;
  isWeekend: boolean;
  usesWeekendOverrides: boolean;
};

export type PlanningDayKind = {
  dayLabel: (typeof WEEKDAY_LABELS)[number];
  dayTypeLabel: string;
  isWorkDay: boolean;
  isWeekend: boolean;
};

export function parseWorkDays(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean);
  }
  return [...DEFAULT_WORK_DAYS];
}

export function serializeWorkDays(days: string[]): string {
  return days.join(',');
}

export function isWeekendDay(planningDay: Date): boolean {
  const day = planningDay.getDay();
  return day === 0 || day === 6;
}

export function usesDifferentWeekendProfile(profile: OnboardingProfile | null): boolean {
  return profile?.['weekend-rhythm'] === WEEKEND_RHYTHM_DIFFERENT;
}

export function isWorkDay(profile: OnboardingProfile | null, planningDay: Date): boolean {
  const workDays = parseWorkDays(profile?.['work-days']);
  const dayLabel = WEEKDAY_LABELS[planningDay.getDay()];
  return workDays.includes(dayLabel);
}

export function getEffectiveDayProfile(
  profile: OnboardingProfile | null,
  planningDay: Date,
): EffectiveDayProfile {
  const weekendOverrides = usesDifferentWeekendProfile(profile) && isWeekendDay(planningDay);

  return {
    wake: weekendOverrides ? (profile?.['weekend-wake'] ?? profile?.wake) : profile?.wake,
    focus: weekendOverrides ? (profile?.['weekend-focus'] ?? profile?.focus) : profile?.focus,
    freeTime: weekendOverrides
      ? (profile?.['weekend-free-time'] ?? profile?.['free-time'])
      : profile?.['free-time'],
    workStart: profile?.work,
    workEnd: profile?.['work-end'],
    isWorkDay: isWorkDay(profile, planningDay),
    isWeekend: isWeekendDay(planningDay),
    usesWeekendOverrides: weekendOverrides,
  };
}

export function getPlanningDayKind(
  planningDay: Date,
  profile: OnboardingProfile | null,
): PlanningDayKind {
  const dayLabel = WEEKDAY_LABELS[planningDay.getDay()];
  const workDay = isWorkDay(profile, planningDay);
  const weekend = isWeekendDay(planningDay);
  const longWeekday = LONG_WEEKDAY_LABELS[planningDay.getDay()];

  const typeDescription = workDay
    ? 'work day'
    : weekend
      ? 'weekend — no work commitments'
      : 'day off — no work commitments';

  return {
    dayLabel,
    dayTypeLabel: `${longWeekday} (${typeDescription})`,
    isWorkDay: workDay,
    isWeekend: weekend,
  };
}

export function normalizeProfileWithDefaults(
  profile: OnboardingProfile | null,
): OnboardingProfile | null {
  if (!profile) return null;

  return {
    ...profile,
    'work-days':
      typeof profile['work-days'] === 'string' ? profile['work-days'] : DEFAULT_WORK_DAYS_VALUE,
    'weekend-rhythm':
      typeof profile['weekend-rhythm'] === 'string'
        ? profile['weekend-rhythm']
        : WEEKEND_RHYTHM_SAME,
  };
}

export function getProfileAnswerString(answer: OnboardingAnswer | undefined): string | null {
  return typeof answer === 'string' && answer.trim() ? answer.trim() : null;
}
