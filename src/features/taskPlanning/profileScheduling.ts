import type { OnboardingCommitmentAnswer } from '../onboarding';
import type { OnboardingProfile } from '../../services/onboardingProfile';
import { fromWheelTime, parseTimeInput, formatInputTime } from '../../utils/time';
import type { SchedulingContext } from './planningDay';
import { formatPlanningDayLabel, isFuturePlanningDay } from './planningDay';
import { getTaskPlanningDefaultsFromProfile } from './profileDefaults';
import {
  getEffectiveDayProfile,
  getPlanningDayKind,
  isWorkDay,
  normalizeProfileWithDefaults,
} from './profileDayContext';

export type ScheduleTimeWindow = {
  start: string;
  end: string;
  label: string;
};

export type FreeTimeBudget = {
  minMinutes: number;
  maxMinutes: number;
  label: string;
};

export type ScheduleGenerationContext = {
  planningDayLabel: string;
  dayTypeLabel?: string;
  earliestStart: string;
  latestEnd?: string;
  focusWindow?: ScheduleTimeWindow;
  commitmentWindows?: ScheduleTimeWindow[];
  freeTimeBudget?: FreeTimeBudget;
  scheduleGoal?: string;
  userProfile?: string | null;
};

const FOCUS_WINDOWS: Record<string, ScheduleTimeWindow> = {
  Morning: { start: '06:00', end: '11:00', label: 'Morning' },
  Afternoon: { start: '12:00', end: '17:00', label: 'Afternoon' },
  Evening: { start: '17:00', end: '21:00', label: 'Evening' },
  'Late night': { start: '21:00', end: '23:30', label: 'Late night' },
};

const COMMITMENT_PRESETS: Record<string, ScheduleTimeWindow> = {
  'Morning (6AM - 12PM)': { start: '06:00', end: '12:00', label: 'Morning commitments' },
  'Afternoon (12PM - 6PM)': { start: '12:00', end: '18:00', label: 'Afternoon commitments' },
  'Evening (6PM - 10PM)': { start: '18:00', end: '22:00', label: 'Evening commitments' },
};

const FREE_TIME_BUDGETS: Record<string, FreeTimeBudget> = {
  'Less than 1 hour': { minMinutes: 45, maxMinutes: 60, label: 'Less than 1 hour' },
  '1-2 hours': { minMinutes: 60, maxMinutes: 120, label: '1-2 hours' },
  '2-3 hours': { minMinutes: 120, maxMinutes: 180, label: '2-3 hours' },
  '3-4 hours': { minMinutes: 180, maxMinutes: 240, label: '3-4 hours' },
  '4+ hours': { minMinutes: 240, maxMinutes: 360, label: '4+ hours' },
};

function parseProfileClock(value: unknown, planningDay: Date): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = parseTimeInput(fromWheelTime(value.trim()), planningDay);
  return parsed ? formatInputTime(parsed) : null;
}

function isCommitmentAnswer(value: unknown): value is OnboardingCommitmentAnswer {
  return typeof value === 'object' && value !== null && 'option' in value;
}

function getFocusWindowForValue(focus: unknown): ScheduleTimeWindow | undefined {
  if (typeof focus !== 'string' || !focus.trim()) return undefined;
  return FOCUS_WINDOWS[focus.trim()];
}

function getWorkWindow(
  profile: OnboardingProfile,
  planningDay: Date,
): ScheduleTimeWindow | undefined {
  const start = parseProfileClock(profile.work, planningDay);
  const end = parseProfileClock(profile['work-end'], planningDay);
  if (!start || !end) return undefined;
  return { start, end, label: 'Work' };
}

function getExtraCommitmentWindows(
  profile: OnboardingProfile,
  planningDay: Date,
): ScheduleTimeWindow[] {
  if (profile['commitment-presence'] === 'No') return [];

  const commitment = profile['commitment-time'];
  if (!isCommitmentAnswer(commitment) || !commitment.option.trim()) return [];
  if (commitment.option === "I don't have fixed commitments") return [];

  if (commitment.option === 'Custom') {
    const start = parseProfileClock(commitment.startTime, planningDay);
    const end = parseProfileClock(commitment.endTime, planningDay);
    if (!start || !end) return [];
    return [{ start, end, label: 'Fixed commitments' }];
  }

  const preset = COMMITMENT_PRESETS[commitment.option.trim()];
  return preset ? [preset] : [];
}

function getCommitmentWindows(
  profile: OnboardingProfile,
  planningDay: Date,
): ScheduleTimeWindow[] | undefined {
  if (!isWorkDay(profile, planningDay)) return undefined;

  const windows: ScheduleTimeWindow[] = [];
  const workWindow = getWorkWindow(profile, planningDay);
  if (workWindow) windows.push(workWindow);
  windows.push(...getExtraCommitmentWindows(profile, planningDay));

  return windows.length > 0 ? windows : undefined;
}

function getFocusWindow(
  profile: OnboardingProfile,
  planningDay: Date,
): ScheduleTimeWindow | undefined {
  const effective = getEffectiveDayProfile(profile, planningDay);
  return getFocusWindowForValue(effective.focus);
}

function getFreeTimeBudget(
  profile: OnboardingProfile,
  planningDay: Date,
): FreeTimeBudget | undefined {
  const effective = getEffectiveDayProfile(profile, planningDay);
  const freeTime = effective.freeTime;
  if (typeof freeTime !== 'string' || !freeTime.trim()) return undefined;
  return FREE_TIME_BUDGETS[freeTime.trim()];
}

function getScheduleGoal(profile: OnboardingProfile | null): string | undefined {
  const goal = profile?.goal;
  if (typeof goal !== 'string' || !goal.trim()) return undefined;
  return goal.trim();
}

function clockToMinutes(clock: string): number {
  const [hoursText, minutesText] = clock.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function getProfileSchedulingContext(
  profile: OnboardingProfile | null,
  context: SchedulingContext,
  userProfile?: string | null,
): ScheduleGenerationContext {
  const normalizedProfile = normalizeProfileWithDefaults(profile);
  const { planningDay, referenceNow } = context;
  const planningDefaults = getTaskPlanningDefaultsFromProfile(normalizedProfile, context);
  const latestEnd = parseProfileClock(normalizedProfile?.sleep, planningDay) ?? undefined;
  const focusWindow = normalizedProfile
    ? getFocusWindow(normalizedProfile, planningDay)
    : undefined;
  const clampedFocusWindow =
    focusWindow && latestEnd && clockToMinutes(focusWindow.end) > clockToMinutes(latestEnd)
      ? { ...focusWindow, end: latestEnd }
      : focusWindow;
  const dayKind = getPlanningDayKind(planningDay, normalizedProfile);

  const planningDayLabel = isFuturePlanningDay(planningDay, referenceNow)
    ? `Tomorrow, ${formatPlanningDayLabel(planningDay)}`
    : `Today, ${formatPlanningDayLabel(planningDay)}`;

  return {
    planningDayLabel,
    dayTypeLabel: dayKind.dayTypeLabel,
    earliestStart: planningDefaults.preferredStart,
    latestEnd,
    focusWindow: clampedFocusWindow,
    commitmentWindows: normalizedProfile
      ? getCommitmentWindows(normalizedProfile, planningDay)
      : undefined,
    freeTimeBudget: normalizedProfile
      ? getFreeTimeBudget(normalizedProfile, planningDay)
      : undefined,
    scheduleGoal: getScheduleGoal(normalizedProfile),
    userProfile,
  };
}
