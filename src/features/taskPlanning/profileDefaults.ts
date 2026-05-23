import type { OnboardingProfile } from '../../services/onboardingProfile';
import { fromWheelTime, parseTimeInput, formatInputTime } from '../../utils/time';

export type TaskPlanningDefaults = {
  preferredStart: string;
  durationMinutes: number;
};

const FALLBACK_START = '09:00';
const FALLBACK_DURATION_MINUTES = 60;

function roundUpToFiveMinutes(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5);
  return next;
}

function parseProfileTime(value: unknown, now: Date): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = parseTimeInput(fromWheelTime(value.trim()), now);
  return parsed ? new Date(parsed) : null;
}

function getProfileAnchorTime(profile: OnboardingProfile | null, now: Date): Date {
  const wakeTime = parseProfileTime(profile?.wake, now);
  if (wakeTime) return wakeTime;

  const workTime = parseProfileTime(profile?.work, now);
  if (workTime) return workTime;

  const fallback = parseTimeInput(FALLBACK_START, now);
  return fallback ? new Date(fallback) : roundUpToFiveMinutes(now);
}

export function getTaskPlanningDefaultsFromProfile(
  profile: OnboardingProfile | null,
  now = new Date(),
): TaskPlanningDefaults {
  const anchor = getProfileAnchorTime(profile, now);
  const roundedNow = roundUpToFiveMinutes(now);
  const candidateStart = anchor.getTime() < roundedNow.getTime() ? roundedNow : anchor;

  return {
    preferredStart: formatInputTime(candidateStart),
    durationMinutes: FALLBACK_DURATION_MINUTES,
  };
}
