import type { OnboardingProfile } from '../../services/onboardingProfile';
import { isFuturePlanningDay, type SchedulingContext } from './planningDay';
import {
  fromWheelTime,
  parseTimeInput,
  formatInputTime,
  roundUpToFiveMinutes,
} from '../../utils/time';
import { getEffectiveDayProfile, normalizeProfileWithDefaults } from './profileDayContext';

export type TaskPlanningDefaults = {
  preferredStart: string;
  durationMinutes: number;
};

const FALLBACK_START = '09:00';
const FALLBACK_DURATION_MINUTES = 60;

function parseProfileTime(value: unknown, planningDay: Date): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = parseTimeInput(fromWheelTime(value.trim()), planningDay);
  return parsed ? new Date(parsed) : null;
}

function getProfileAnchorTime(profile: OnboardingProfile | null, planningDay: Date): Date {
  const effective = getEffectiveDayProfile(profile, planningDay);
  const wakeTime = parseProfileTime(effective.wake, planningDay);
  if (wakeTime) return wakeTime;

  const workTime = parseProfileTime(effective.workStart, planningDay);
  if (workTime) return workTime;

  const fallback = parseTimeInput(FALLBACK_START, planningDay);
  return fallback ? new Date(fallback) : roundUpToFiveMinutes(planningDay);
}

export function getTaskPlanningDefaultsFromProfile(
  profile: OnboardingProfile | null,
  context: SchedulingContext,
): TaskPlanningDefaults {
  const normalizedProfile = normalizeProfileWithDefaults(profile);
  const { planningDay, referenceNow } = context;
  const anchor = getProfileAnchorTime(normalizedProfile, planningDay);

  if (isFuturePlanningDay(planningDay, referenceNow)) {
    return {
      preferredStart: formatInputTime(anchor),
      durationMinutes: FALLBACK_DURATION_MINUTES,
    };
  }

  const roundedNow = roundUpToFiveMinutes(referenceNow);
  const candidateStart = anchor.getTime() < roundedNow.getTime() ? roundedNow : anchor;

  return {
    preferredStart: formatInputTime(candidateStart),
    durationMinutes: FALLBACK_DURATION_MINUTES,
  };
}
