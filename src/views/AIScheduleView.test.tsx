import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AIScheduleScreen } from '../screens/AIScheduleScreen';
import { getGeminiApiKey, getOpenAIApiKey } from '../services/apiKey';
import { generateGeminiScheduleFromText } from '../services/gemini';
import { getOnboardingProfile } from '../services/onboardingProfile';
import { generateScheduleFromText } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import { useIsFocused } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('../services/apiKey', () => ({
  getGeminiApiKey: jest.fn(),
  getOpenAIApiKey: jest.fn(),
}));

jest.mock('../services/gemini', () => ({
  generateGeminiScheduleFromText: jest.fn(),
}));

jest.mock('../services/openai', () => ({
  generateScheduleFromText: jest.fn(),
}));

jest.mock('../services/onboardingProfile', () => ({
  formatOnboardingProfileForPrompt: jest.fn(() => null),
  getOnboardingProfile: jest.fn(),
}));

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

function createStoreState() {
  return {
    previewTasks: [],
    setPreviewTasks: jest.fn(),
    updatePreviewTask: jest.fn(),
    clearPreviewTasks: jest.fn(),
    confirmPreviewTasks: jest.fn(),
    error: null,
    clearError: jest.fn(),
    loading: false,
  };
}

function renderAIScheduleScreen(
  overrideProps: Partial<React.ComponentProps<typeof AIScheduleScreen>> = {},
) {
  const props: React.ComponentProps<typeof AIScheduleScreen> = {
    onCancel: jest.fn(),
    onOpenSettings: jest.fn(),
    ...overrideProps,
  };

  return render(
    <PaperProvider>
      <AIScheduleScreen {...props} />
    </PaperProvider>,
  );
}

function renderAIScheduleRouteScreen() {
  return render(
    <PaperProvider>
      <AIScheduleScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
        route={{ key: 'ai-key', name: 'AISchedule' } as never}
      />
    </PaperProvider>,
  );
}

describe('AIScheduleScreen', () => {
  const getOpenAIApiKeyMock = jest.mocked(getOpenAIApiKey);
  const getGeminiApiKeyMock = jest.mocked(getGeminiApiKey);
  const getOnboardingProfileMock = jest.mocked(getOnboardingProfile);
  const generateGeminiScheduleFromTextMock = jest.mocked(generateGeminiScheduleFromText);
  const generateScheduleFromTextMock = jest.mocked(generateScheduleFromText);
  const useTaskStoreMock = jest.mocked(useTaskStore);
  const useIsFocusedMock = jest.mocked(useIsFocused);

  beforeEach(() => {
    getOpenAIApiKeyMock.mockReset();
    getGeminiApiKeyMock.mockReset();
    getGeminiApiKeyMock.mockResolvedValue(null);
    getOnboardingProfileMock.mockReset();
    generateGeminiScheduleFromTextMock.mockReset();
    generateScheduleFromTextMock.mockReset();
    useTaskStoreMock.mockReset();
    useIsFocusedMock.mockReset();
    useIsFocusedMock.mockImplementation(() => true);
    getOnboardingProfileMock.mockResolvedValue(null);
    useTaskStoreMock.mockReturnValue(createStoreState());
  });

  it('renders the step-based task list UI', () => {
    renderAIScheduleScreen({ scenarioId: 'ai-empty-list' });

    expect(screen.getByText('Step 1')).toBeOnTheScreen();
    expect(screen.getByText('List what you need to do')).toBeOnTheScreen();
    expect(screen.getByText('Step 2')).toBeOnTheScreen();
    expect(screen.getByText('Choose the start of your day')).toBeOnTheScreen();
    expect(screen.getByText('Step 3')).toBeOnTheScreen();
  });

  it('fires add and remove task row actions through local state', () => {
    renderAIScheduleScreen({ scenarioId: 'ai-preview' });

    expect(screen.getAllByText('Remove')).toHaveLength(3);

    fireEvent.press(screen.getByText('Add Another Task'));
    expect(screen.getAllByText('Remove')).toHaveLength(4);

    fireEvent.press(screen.getAllByText('Remove')[0]);
    expect(screen.getAllByText('Remove')).toHaveLength(3);
  });

  it('shows blocked generation messaging', () => {
    renderAIScheduleScreen({ scenarioId: 'ai-no-key' });

    expect(screen.getByText('Generation is blocked')).toBeOnTheScreen();
    expect(
      screen.getAllByText('Add an OpenAI or Gemini API key in Settings first.').length,
    ).toBeGreaterThan(0);
  });

  it('shows ready generation messaging when preview data is valid', () => {
    renderAIScheduleScreen({ scenarioId: 'ai-preview' });

    expect(screen.getByText('Ready to generate')).toBeOnTheScreen();
    expect(screen.getByText('Ready to generate a schedule.')).toBeOnTheScreen();
  });

  it('shows the settings CTA when no API key is present', () => {
    const onOpenSettings = jest.fn();
    renderAIScheduleScreen({ scenarioId: 'ai-no-key', onOpenSettings });

    expect(screen.getByText('AI generation is disabled.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Open Settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('uses the latest stored key when generating to avoid stale state', async () => {
    const storeState = createStoreState();
    useTaskStoreMock.mockReturnValue(storeState);
    getOpenAIApiKeyMock.mockResolvedValueOnce('sk-old').mockResolvedValueOnce('sk-new');
    generateScheduleFromTextMock.mockResolvedValueOnce([
      { title: 'Study React', durationMinutes: 45 },
    ]);

    renderAIScheduleRouteScreen();

    await waitFor(() => expect(getOpenAIApiKeyMock).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getAllByTestId('text-input-outlined')[0], '  Study React  ');

    await act(async () => {
      fireEvent.press(screen.getByText('Generate Schedule'));
    });

    await waitFor(() =>
      expect(generateScheduleFromTextMock).toHaveBeenCalledWith('sk-new', ['Study React'], null),
    );
    expect(storeState.setPreviewTasks).toHaveBeenCalledTimes(1);
  });

  it('generates a schedule with Gemini when only a Gemini key is saved', async () => {
    const storeState = createStoreState();
    useTaskStoreMock.mockReturnValue(storeState);
    getOpenAIApiKeyMock.mockResolvedValue(null);
    getGeminiApiKeyMock.mockResolvedValue('gemini-live');
    generateGeminiScheduleFromTextMock.mockResolvedValueOnce([
      { title: 'Study React', durationMinutes: 45 },
    ]);

    renderAIScheduleRouteScreen();

    await waitFor(() => expect(getGeminiApiKeyMock).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getAllByTestId('text-input-outlined')[0], '  Study React  ');

    await act(async () => {
      fireEvent.press(screen.getByText('Generate Schedule'));
    });

    await waitFor(() =>
      expect(generateGeminiScheduleFromTextMock).toHaveBeenCalledWith(
        'gemini-live',
        ['Study React'],
        null,
      ),
    );
    expect(generateScheduleFromTextMock).not.toHaveBeenCalled();
    expect(storeState.setPreviewTasks).toHaveBeenCalledTimes(1);
  });

  it('does not depend on the AI Features toggle when generating schedules', async () => {
    const storeState = createStoreState();
    useTaskStoreMock.mockReturnValue(storeState);
    getOpenAIApiKeyMock.mockResolvedValue('sk-live');
    generateScheduleFromTextMock.mockResolvedValueOnce([
      { title: 'Study React', durationMinutes: 45 },
    ]);

    renderAIScheduleRouteScreen();

    await waitFor(() => expect(getOpenAIApiKeyMock).toHaveBeenCalledTimes(1));

    fireEvent.changeText(screen.getAllByTestId('text-input-outlined')[0], 'Study React');

    await act(async () => {
      fireEvent.press(screen.getByText('Generate Schedule'));
    });

    await waitFor(() =>
      expect(generateScheduleFromTextMock).toHaveBeenCalledWith('sk-live', ['Study React'], null),
    );
    expect(screen.queryByText('Turn on AI Features in Settings first.')).not.toBeOnTheScreen();
    expect(storeState.setPreviewTasks).toHaveBeenCalledTimes(1);
  });
});
