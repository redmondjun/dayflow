import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { WeeklyInsightSummary } from '../types/insight';
import { colors } from '../theme/colors';
import {
  getActiveAiApiKey,
  getAiSuggestionEnabled,
  subscribeAiSettingsChanges,
} from '../services/apiKey';
import { generateGeminiWeeklyInsight } from '../services/gemini';
import { getOnboardingProfile } from '../services/onboardingProfile';
import { generateWeeklyInsight } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';
import { WeeklyInsightPreviewScreen } from '../dev-preview/WeeklyInsightPreviewScreen';
import { useDevDemoState } from '../services/devDemo';
import { WeeklyInsightScreen } from './WeeklyInsightScreen';

const mockAiSettingsListeners = new Set<() => void>();

jest.mock('../services/apiKey', () => ({
  getActiveAiApiKey: jest.fn(),
  getAiSuggestionEnabled: jest.fn(),
  subscribeAiSettingsChanges: jest.fn((listener: () => void) => {
    mockAiSettingsListeners.add(listener);
    return () => mockAiSettingsListeners.delete(listener);
  }),
}));

jest.mock('../services/onboardingProfile', () => ({
  formatOnboardingProfileForPrompt: jest.fn(() => '- Wake-up time: 7:00 AM'),
  getOnboardingProfile: jest.fn(),
}));

jest.mock('../services/openai', () => ({
  generateWeeklyInsight: jest.fn(),
}));

jest.mock('../services/gemini', () => ({
  generateGeminiWeeklyInsight: jest.fn(),
}));

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

jest.mock('../services/devDemo', () => ({
  getDemoAdjustedTasks: jest.fn((tasks) => tasks),
  getEffectiveNow: jest.fn((now = new Date()) => now),
  useDevDemoState: jest.fn(() => ({ nowOverride: null, weeklyPreviewEnabled: false })),
}));

jest.mock('../utils/weeklyInsight', () => ({
  ...jest.requireActual('../utils/weeklyInsight'),
  buildWeeklyInsightSummary: jest.fn(),
}));

const summary: WeeklyInsightSummary = {
  dateRange: 'Apr 21 - Apr 28',
  headline: 'You are most productive in the morning',
  basedOn: 'Based on your last 7 days',
  completionPercent: 76,
  skippedPercent: 24,
  peakHourLabel: '10 AM',
  timeChart: [
    { label: '8', value: 4 },
    { label: '10', value: 4 },
    { label: '12', value: 2 },
    { label: '2', value: 0 },
    { label: '4', value: 0 },
    { label: '6', value: 0 },
  ],
  patterns: [
    { label: 'After 4 PM', text: 'Completion rate drops sharply.' },
    { label: 'Long tasks', text: '90-min blocks often left unfinished.' },
  ],
  suggestions: [
    {
      text: 'Reserve deep work for the morning, before other meetings.',
      action: 'Apply to tomorrow',
    },
  ],
  reflection: 'Your schedule is improving compared to last week.',
};

const emptySummary: WeeklyInsightSummary = {
  ...summary,
  headline: 'Build a week of task history',
  basedOn: 'Complete tasks to unlock sharper patterns',
  completionPercent: 0,
  skippedPercent: 0,
  peakHourLabel: 'N/A',
  timeChart: summary.timeChart.map((item) => ({ ...item, value: 0 })),
  patterns: [],
  suggestions: [],
  reflection: 'A weekly pattern will appear here soon.',
};

const recentTaskStart = new Date();
recentTaskStart.setDate(recentTaskStart.getDate() - 1);
recentTaskStart.setHours(10, 0, 0, 0);
const recentTaskEnd = new Date(recentTaskStart);
recentTaskEnd.setHours(11, 0, 0, 0);

const completedTask = {
  id: 'task-1',
  title: 'Deep work',
  startTime: recentTaskStart.toISOString(),
  endTime: recentTaskEnd.toISOString(),
  status: 'completed' as const,
  aiGenerated: false,
  createdAt: recentTaskStart.toISOString(),
  updatedAt: recentTaskEnd.toISOString(),
};
const completedTasks = [completedTask];
const scheduledTasks = [{ ...completedTask, id: 'task-2', status: 'scheduled' as const }];

function renderWeeklyInsightScreen() {
  const navigation = {
    navigate: jest.fn(),
  };

  render(
    <PaperProvider>
      <WeeklyInsightScreen
        navigation={navigation as never}
        route={{ key: 'weekly-key', name: 'WeeklyInsight' } as never}
      />
    </PaperProvider>,
  );

  return { navigation };
}

function renderWeeklyInsightPreview(scenarioId: 'weekly-empty' | 'weekly-data') {
  const onOptimizeTomorrow = jest.fn();

  render(
    <PaperProvider>
      <WeeklyInsightPreviewScreen scenarioId={scenarioId} onOptimizeTomorrow={onOptimizeTomorrow} />
    </PaperProvider>,
  );

  return { onOptimizeTomorrow };
}

function renderEmbeddedWeeklyInsight() {
  const onOptimizeTomorrow = jest.fn();

  render(
    <PaperProvider>
      <WeeklyInsightScreen onOptimizeTomorrow={onOptimizeTomorrow} />
    </PaperProvider>,
  );

  return { onOptimizeTomorrow };
}

const emptyTaskState = { tasks: [] as typeof completedTasks };
const scheduledTaskState = { tasks: scheduledTasks };

describe('WeeklyInsightScreen', () => {
  const useTaskStoreMock = useTaskStore as unknown as jest.Mock;
  const buildWeeklyInsightSummaryMock = jest.mocked(buildWeeklyInsightSummary);
  const getActiveAiApiKeyMock = jest.mocked(getActiveAiApiKey);
  const getAiSuggestionEnabledMock = jest.mocked(getAiSuggestionEnabled);
  const subscribeAiSettingsChangesMock = jest.mocked(subscribeAiSettingsChanges);
  const getOnboardingProfileMock = jest.mocked(getOnboardingProfile);
  const generateGeminiWeeklyInsightMock = jest.mocked(generateGeminiWeeklyInsight);
  const generateWeeklyInsightMock = jest.mocked(generateWeeklyInsight);
  const useDevDemoStateMock = jest.mocked(useDevDemoState);

  beforeEach(() => {
    Reflect.set(globalThis, '__DEV__', false);
    buildWeeklyInsightSummaryMock.mockReset();
    buildWeeklyInsightSummaryMock.mockReturnValue(summary);
    mockAiSettingsListeners.clear();
    getAiSuggestionEnabledMock.mockReset();
    getAiSuggestionEnabledMock.mockResolvedValue(true);
    getActiveAiApiKeyMock.mockReset();
    getActiveAiApiKeyMock.mockResolvedValue(null);
    getOnboardingProfileMock.mockReset();
    getOnboardingProfileMock.mockResolvedValue(null);
    generateGeminiWeeklyInsightMock.mockReset();
    generateWeeklyInsightMock.mockReset();
    useDevDemoStateMock.mockReset();
    useDevDemoStateMock.mockReturnValue({ nowOverride: null, weeklyPreviewEnabled: false });
    subscribeAiSettingsChangesMock.mockClear();
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      if (typeof selector !== 'function') return emptyTaskState;
      return selector(emptyTaskState);
    });
  });

  it('renders weekly insight metrics without AI sections by default', () => {
    renderWeeklyInsightScreen();

    expect(screen.getByText('Weekly Insight')).toBeOnTheScreen();
    expect(screen.getByText('76%')).toBeOnTheScreen();
    expect(screen.queryByText('Patterns')).not.toBeOnTheScreen();
    expect(screen.queryByText('Suggestions')).not.toBeOnTheScreen();
    expect(screen.queryByText('Completion rate drops sharply.')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('Reserve deep work for the morning, before other meetings.'),
    ).not.toBeOnTheScreen();
  });

  it('uses green for all peak time bars and completed progress', () => {
    renderWeeklyInsightScreen();

    expect(screen.getByTestId('weekly-time-chart-bar-8').props.style.backgroundColor).toBe(
      colors.accent,
    );
    expect(screen.getByTestId('weekly-time-chart-bar-10').props.style.backgroundColor).toBe(
      colors.accent,
    );
    expect(screen.getByTestId('weekly-time-chart-bar-12').props.style.backgroundColor).not.toBe(
      colors.accent,
    );
    expect(screen.getByTestId('weekly-completion-progress-bar').props.className).toContain(
      'bg-accent',
    );
  });

  it('opens AI schedule from the optimize button', () => {
    const { navigation } = renderWeeklyInsightScreen();

    fireEvent.press(screen.getByText("Optimize tomorrow's schedule ->"));

    expect(navigation.navigate).toHaveBeenCalledWith('CreateTask', { aiEnabled: true });
  });

  it('hides patterns and suggestions when preview has no weekly data', () => {
    buildWeeklyInsightSummaryMock.mockReturnValueOnce(emptySummary);

    renderWeeklyInsightPreview('weekly-empty');

    expect(screen.getByText('Apr 21 - Apr 28')).toBeOnTheScreen();
    expect(screen.getByText('Build a week of task history')).toBeOnTheScreen();
    expect(screen.queryByText('Patterns')).not.toBeOnTheScreen();
    expect(screen.queryByText('Suggestions')).not.toBeOnTheScreen();
    expect(screen.queryByText('Completion rate drops sharply.')).not.toBeOnTheScreen();
    expect(
      screen.queryByText('Reserve deep work for the morning, before other meetings.'),
    ).not.toBeOnTheScreen();
  });

  it('uses the fixed weekly-data preview content', () => {
    renderWeeklyInsightPreview('weekly-data');

    expect(screen.getByText('Apr 21 - Apr 28')).toBeOnTheScreen();
    expect(screen.getByText('You are most productive in the morning')).toBeOnTheScreen();
    expect(screen.getByText('76%')).toBeOnTheScreen();
    expect(screen.getByText('24%')).toBeOnTheScreen();
    expect(screen.getByText('Completion rate drops sharply.')).toBeOnTheScreen();
    expect(screen.getByText('90-min blocks often left unfinished.')).toBeOnTheScreen();
    expect(screen.getByText('Highest output quality of the day.')).toBeOnTheScreen();
    expect(
      screen.getByText('Reserve deep work for the morning, before other meetings.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Split tasks over 90 minutes into two separate blocks.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Move lower-priority tasks to the afternoon.')).toBeOnTheScreen();
  });

  it('does not request AI weekly insights when AI suggestions are off', async () => {
    getAiSuggestionEnabledMock.mockResolvedValueOnce(false);
    getActiveAiApiKeyMock.mockResolvedValueOnce({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });

    renderWeeklyInsightScreen();

    await waitFor(() => expect(getAiSuggestionEnabledMock).toHaveBeenCalled());
    expect(generateWeeklyInsightMock).not.toHaveBeenCalled();
    expect(generateGeminiWeeklyInsightMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Patterns')).not.toBeOnTheScreen();
    expect(screen.queryByText('Suggestions')).not.toBeOnTheScreen();
  });

  it('does not request AI weekly insights without recent completed or skipped tasks', async () => {
    getActiveAiApiKeyMock.mockResolvedValueOnce({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      if (typeof selector !== 'function') return scheduledTaskState;
      return selector(scheduledTaskState);
    });

    renderWeeklyInsightScreen();

    await waitFor(() => expect(getAiSuggestionEnabledMock).toHaveBeenCalled());
    expect(generateWeeklyInsightMock).not.toHaveBeenCalled();
    expect(generateGeminiWeeklyInsightMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Patterns')).not.toBeOnTheScreen();
    expect(screen.queryByText('Suggestions')).not.toBeOnTheScreen();
  });

  it('uses AI weekly insight patterns and suggestions when enabled with an API key', async () => {
    getActiveAiApiKeyMock.mockResolvedValueOnce({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });
    generateWeeklyInsightMock.mockResolvedValueOnce({
      patterns: [{ label: 'AI Pattern', text: 'Morning blocks are strongest.' }],
      suggestions: [{ text: 'Protect 10 AM for deep work.', action: 'Apply' }],
    });

    renderWeeklyInsightScreen();

    await waitFor(() => expect(generateWeeklyInsightMock).toHaveBeenCalled());
    expect(await screen.findByText('AI Pattern')).toBeOnTheScreen();
    expect(screen.getByText('Morning blocks are strongest.')).toBeOnTheScreen();
    expect(screen.getByText('Protect 10 AM for deep work.')).toBeOnTheScreen();
    expect(generateWeeklyInsightMock).toHaveBeenCalledWith(
      'sk-live',
      completedTasks,
      summary,
      '- Wake-up time: 7:00 AM',
    );
    expect(generateGeminiWeeklyInsightMock).not.toHaveBeenCalled();
  });

  it('uses Gemini weekly insight patterns and suggestions when only a Gemini key is saved', async () => {
    getActiveAiApiKeyMock.mockResolvedValueOnce({ provider: 'google', key: 'gemini-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });
    generateGeminiWeeklyInsightMock.mockResolvedValueOnce({
      patterns: [{ label: 'Gemini Pattern', text: 'Gemini found stronger mornings.' }],
      suggestions: [{ text: 'Use Gemini to plan the next deep work block.', action: 'Apply' }],
    });

    renderWeeklyInsightScreen();

    await waitFor(() => expect(generateGeminiWeeklyInsightMock).toHaveBeenCalled());
    expect(await screen.findByText('Gemini Pattern')).toBeOnTheScreen();
    expect(screen.getByText('Gemini found stronger mornings.')).toBeOnTheScreen();
    expect(screen.getByText('Use Gemini to plan the next deep work block.')).toBeOnTheScreen();
    expect(generateGeminiWeeklyInsightMock).toHaveBeenCalledWith(
      'gemini-live',
      completedTasks,
      summary,
      '- Wake-up time: 7:00 AM',
    );
    expect(generateWeeklyInsightMock).not.toHaveBeenCalled();
  });

  it('reloads AI weekly insights when AI settings change', async () => {
    getAiSuggestionEnabledMock.mockResolvedValueOnce(false).mockResolvedValue(true);
    getActiveAiApiKeyMock
      .mockResolvedValueOnce({ provider: 'openai', key: 'sk-live' })
      .mockResolvedValue({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });
    generateWeeklyInsightMock.mockResolvedValueOnce({
      patterns: [{ label: 'Reloaded AI', text: 'AI settings were refreshed.' }],
      suggestions: [{ text: 'Use the refreshed settings.', action: 'Apply' }],
    });

    renderWeeklyInsightScreen();

    await waitFor(() => expect(getAiSuggestionEnabledMock).toHaveBeenCalledTimes(1));
    expect(generateWeeklyInsightMock).not.toHaveBeenCalled();

    act(() => {
      mockAiSettingsListeners.forEach((listener) => listener());
    });

    await waitFor(() => expect(generateWeeklyInsightMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Reloaded AI')).toBeOnTheScreen();
    expect(screen.getByText('AI settings were refreshed.')).toBeOnTheScreen();
  });

  it('prevents duplicate weekly insight requests while one is already loading', async () => {
    let resolveInsight: (
      value: Awaited<ReturnType<typeof generateWeeklyInsight>>,
    ) => void = () => {};
    getActiveAiApiKeyMock.mockResolvedValue({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });
    generateWeeklyInsightMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInsight = resolve;
        }),
    );

    renderWeeklyInsightScreen();

    await waitFor(() => expect(generateWeeklyInsightMock).toHaveBeenCalledTimes(1));

    act(() => {
      mockAiSettingsListeners.forEach((listener) => listener());
      mockAiSettingsListeners.forEach((listener) => listener());
    });

    expect(generateWeeklyInsightMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveInsight({
        patterns: [{ label: 'Single request', text: 'Only one insight request ran.' }],
        suggestions: [{ text: 'Avoid duplicate insight calls.', action: 'Apply' }],
      });
    });

    await waitFor(() => expect(screen.getByText('Single request')).toBeOnTheScreen());
  });

  it('uses actual weekly data when rendered inside the home tab', async () => {
    getActiveAiApiKeyMock.mockResolvedValueOnce({ provider: 'openai', key: 'sk-live' });
    useTaskStoreMock.mockImplementation((selector: unknown) => {
      const state = { tasks: completedTasks };
      if (typeof selector !== 'function') return state;
      return selector(state);
    });
    generateWeeklyInsightMock.mockResolvedValueOnce({
      patterns: [{ label: 'Home Tab AI', text: 'Home tab uses real tasks.' }],
      suggestions: [{ text: 'Keep the morning protected.', action: 'Apply' }],
    });

    renderEmbeddedWeeklyInsight();

    await waitFor(() => expect(generateWeeklyInsightMock).toHaveBeenCalled());
    expect(screen.getByText('Home Tab AI')).toBeOnTheScreen();
    expect(buildWeeklyInsightSummaryMock).toHaveBeenCalledWith(completedTasks, expect.any(Date));
  });

  it('uses weekly preview data from the real screen when dev preview is enabled', async () => {
    Reflect.set(globalThis, '__DEV__', true);
    useDevDemoStateMock.mockReturnValue({
      nowOverride: null,
      weeklyPreviewEnabled: true,
    });

    renderWeeklyInsightScreen();

    expect(screen.getByText('Apr 21 - Apr 28')).toBeOnTheScreen();
    expect(screen.getByText('You are most productive in the morning')).toBeOnTheScreen();
    expect(generateWeeklyInsightMock).not.toHaveBeenCalled();
    expect(generateGeminiWeeklyInsightMock).not.toHaveBeenCalled();
  });
});
