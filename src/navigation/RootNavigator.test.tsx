import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text as MockText } from 'react-native';
import { RootNavigator } from './RootNavigator';
import { hasCompletedOnboarding } from '../services/onboardingProfile';

let latestInitialRouteName: string | undefined;

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({
      children,
      initialRouteName,
    }: {
      children: ReactNode;
      initialRouteName?: string;
    }) => {
      latestInitialRouteName = initialRouteName;
      return <>{children}</>;
    },
    Screen: ({ name }: { name: string }) => <MockText>{name}</MockText>,
  }),
}));

jest.mock('../services/onboardingProfile', () => ({
  hasCompletedOnboarding: jest.fn(),
}));

jest.mock('../screens/HomeScreen', () => ({
  HomeScreen: () => null,
}));
jest.mock('../screens/TaskFormScreen', () => ({
  TaskFormScreen: () => null,
}));
jest.mock('../screens/AIScheduleScreen', () => ({
  AIScheduleScreen: () => null,
}));
jest.mock('../screens/OnboardingScreen', () => ({
  OnboardingScreen: () => null,
}));
jest.mock('../screens/WeeklyInsightScreen', () => ({
  WeeklyInsightScreen: () => null,
}));
jest.mock('../screens/SettingsScreen', () => ({
  SettingsScreen: () => null,
}));

describe('RootNavigator', () => {
  const hasCompletedOnboardingMock = jest.mocked(hasCompletedOnboarding);

  beforeEach(() => {
    latestInitialRouteName = undefined;
    hasCompletedOnboardingMock.mockReset();
  });

  it('starts onboarding when the user has no saved onboarding profile', async () => {
    hasCompletedOnboardingMock.mockResolvedValueOnce(false);

    render(<RootNavigator />);

    await waitFor(() => expect(latestInitialRouteName).toBe('Onboarding'));
  });

  it('starts home when onboarding has already been completed', async () => {
    hasCompletedOnboardingMock.mockResolvedValueOnce(true);

    render(<RootNavigator />);

    await waitFor(() => expect(latestInitialRouteName).toBe('Home'));
  });
});
