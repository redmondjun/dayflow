import * as SecureStore from 'expo-secure-store';
import type { OnboardingAnswer, OnboardingCommitmentAnswer } from '../features/onboarding';
import { parseWorkDays } from '../features/taskPlanning/profileDayContext';

const ONBOARDING_PROFILE_KEY = 'dayflow.onboardingProfile';

export type OnboardingProfile = Record<string, OnboardingAnswer>;

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
  const rawValue = await SecureStore.getItemAsync(ONBOARDING_PROFILE_KEY);
  if (!rawValue) return null;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as OnboardingProfile;
  } catch {
    return null;
  }
}

export async function saveOnboardingProfile(profile: OnboardingProfile): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_PROFILE_KEY, JSON.stringify(profile));
}

export async function clearOnboardingProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(ONBOARDING_PROFILE_KEY);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await getOnboardingProfile()) !== null;
}

export function formatOnboardingProfileForPrompt(profile: OnboardingProfile | null): string | null {
  if (!profile) return null;

  const workDays = parseWorkDays(profile['work-days']);

  const lines = [
    formatStringAnswer('Name', profile.name),
    formatStringAnswer('Wake-up time', profile.wake),
    formatStringAnswer('Bedtime', profile.sleep),
    formatStringAnswer('Work start time', profile.work),
    formatStringAnswer('Work end time', profile['work-end']),
    workDays.length > 0 ? `Work days: ${workDays.join(', ')}` : null,
    formatStringAnswer('Weekend schedule', profile['weekend-rhythm']),
    formatStringAnswer('Weekend wake-up time', profile['weekend-wake']),
    formatStringAnswer('Weekend focus best', profile['weekend-focus']),
    formatStringAnswer('Weekend free time', profile['weekend-free-time']),
    formatStringAnswer('Has fixed commitments', profile['commitment-presence']),
    formatCommitmentAnswer(profile['commitment-time']),
    formatStringAnswer('Focus best', profile.focus),
    formatStringAnswer('Free time per day', profile['free-time']),
    formatStringAnswer('Schedule goal', profile.goal),
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : null;
}

function formatStringAnswer(label: string, answer: OnboardingAnswer | undefined): string | null {
  if (typeof answer !== 'string' || !answer.trim()) return null;
  return `${label}: ${answer.trim()}`;
}

function formatCommitmentAnswer(answer: OnboardingAnswer | undefined): string | null {
  if (!isCommitmentAnswer(answer) || !answer.option.trim()) return null;

  if (answer.option === 'Custom') {
    const start = answer.startTime?.trim();
    const end = answer.endTime?.trim();
    if (start && end) return `Fixed commitments: Custom, ${start} - ${end}`;
  }

  return `Fixed commitments: ${answer.option.trim()}`;
}

function isCommitmentAnswer(
  answer: OnboardingAnswer | undefined,
): answer is OnboardingCommitmentAnswer {
  return typeof answer === 'object' && answer !== null && 'option' in answer;
}
