import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsScreen } from './SettingsScreen';

function mockIcon(label: string) {
  const Icon = () => <Text>{label}</Text>;
  Icon.displayName = label;
  return Icon;
}

jest.mock('../assets/icons/eye-closed.svg', () => mockIcon('eye-closed'));
jest.mock('../assets/icons/eye-open.svg', () => mockIcon('eye-open'));
jest.mock('../assets/icons/trash.svg', () => mockIcon('trash'));

const mockClearOnboarding = jest.fn<() => Promise<boolean>>();

jest.mock('../hooks/useSettingsState', () => ({
  useSettingsState: () => ({
    aiFeaturesEnabled: true,
    aiSuggestionEnabled: true,
    currentApiKey: '',
    message: null,
    removeCurrentProviderKey: jest.fn(),
    saveCurrentProviderKey: jest.fn(),
    savedCurrentApiKey: null,
    savingCurrentKey: false,
    selectedProvider: 'openai',
    setAiFeaturesEnabled: jest.fn(),
    setAiSuggestionEnabled: jest.fn(),
    setCurrentApiKey: jest.fn(),
    setMessage: jest.fn(),
    setSelectedProvider: jest.fn(),
    clearOnboarding: mockClearOnboarding,
    deleteDemoDayTasks: jest.fn(),
    demoDate: '',
    demoNowOverride: null,
    demoTime: '',
    deletingDemoTasks: false,
    resetDemoTime: jest.fn(),
    saveDemoTime: jest.fn(),
    setDemoDate: jest.fn(),
    setDemoTime: jest.fn(),
    toggleWeeklyPreview: jest.fn(),
    weeklyPreviewEnabled: false,
  }),
}));

function renderSettingsScreen() {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
  } as unknown as NativeStackNavigationProp<RootStackParamList, 'Settings'>;

  const route = {
    key: 'Settings-test',
    name: 'Settings',
  } as const;

  return {
    navigation,
    ...render(
      <PaperProvider>
        <SettingsScreen navigation={navigation} route={route} />
      </PaperProvider>,
    ),
  };
}

describe('SettingsScreen reset onboarding', () => {
  beforeEach(() => {
    Reflect.set(globalThis, '__DEV__', true);
    mockClearOnboarding.mockReset();
    mockClearOnboarding.mockResolvedValue(true);
  });

  it('clears onboarding and resets navigation to fresh setup flow', async () => {
    const { navigation } = renderSettingsScreen();

    fireEvent.press(screen.getByTestId('settings-reset-onboarding-button'));

    await waitFor(() => expect(mockClearOnboarding).toHaveBeenCalledTimes(1));
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Onboarding' }],
    });
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
