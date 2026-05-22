import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
  hasCompletedOnboarding,
  saveOnboardingProfile,
} from './onboardingProfile';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('onboardingProfile service', () => {
  const getItemAsyncMock = jest.mocked(SecureStore.getItemAsync);
  const setItemAsyncMock = jest.mocked(SecureStore.setItemAsync);

  beforeEach(() => {
    getItemAsyncMock.mockReset();
    setItemAsyncMock.mockReset();
  });

  it('saves and reads the onboarding profile', async () => {
    const profile = {
      name: 'Chris',
      wake: '7:00 AM',
      work: '7:00 AM',
    };
    getItemAsyncMock.mockResolvedValueOnce(JSON.stringify(profile));

    await saveOnboardingProfile(profile);

    expect(setItemAsyncMock).toHaveBeenCalledWith(
      'dayflow.onboardingProfile',
      JSON.stringify(profile),
    );
    await expect(getOnboardingProfile()).resolves.toEqual(profile);
  });

  it('treats missing or invalid data as incomplete onboarding', async () => {
    getItemAsyncMock.mockResolvedValueOnce(null).mockResolvedValueOnce('{broken');

    await expect(hasCompletedOnboarding()).resolves.toBe(false);
    await expect(getOnboardingProfile()).resolves.toBeNull();
  });

  it('keeps an explicitly saved 8:00 AM work-start time', async () => {
    getItemAsyncMock.mockResolvedValueOnce(
      JSON.stringify({
        wake: '7:00 AM',
        work: '8:00 AM',
      }),
    );

    await expect(getOnboardingProfile()).resolves.toEqual({
      wake: '7:00 AM',
      work: '8:00 AM',
    });
  });

  it('keeps an explicitly saved 9:00 AM custom commitment end time', async () => {
    getItemAsyncMock.mockResolvedValueOnce(
      JSON.stringify({
        wake: '7:00 AM',
        work: '7:00 AM',
        'commitment-time': {
          option: 'Custom',
          startTime: '7:00 AM',
          endTime: '9:00 AM',
        },
      }),
    );

    await expect(getOnboardingProfile()).resolves.toEqual({
      wake: '7:00 AM',
      work: '7:00 AM',
      'commitment-time': {
        option: 'Custom',
        startTime: '7:00 AM',
        endTime: '9:00 AM',
      },
    });
  });

  it('formats profile answers for the AI prompt', () => {
    expect(
      formatOnboardingProfileForPrompt({
        name: 'Chris',
        wake: '7:00 AM',
        work: '9:00 AM',
        'commitment-presence': 'Yes',
        'commitment-time': { option: 'Custom', startTime: '1:00 PM', endTime: '3:00 PM' },
        focus: 'Morning',
        'free-time': '1-2 hours',
        goal: 'Study',
      }),
    ).toBe(
      [
        '- Name: Chris',
        '- Wake-up time: 7:00 AM',
        '- Work start time: 9:00 AM',
        '- Has fixed commitments: Yes',
        '- Fixed commitments: Custom, 1:00 PM - 3:00 PM',
        '- Focus best: Morning',
        '- Free time per day: 1-2 hours',
        '- Schedule goal: Study',
      ].join('\n'),
    );
  });
});
