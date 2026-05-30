import React from 'react';
import { describe, expect, it, jest, afterEach, beforeEach } from '@jest/globals';
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AIScheduleScreen } from './AIScheduleScreen';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import * as scheduling from '../features/taskPlanning/scheduling';
import { getActiveAiApiKey, getAiFeaturesEnabled } from '../services/apiKey';
import { getOnboardingProfile } from '../services/onboardingProfile';
import { resetDevDemoState, setDemoNowOverride } from '../services/devDemo';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
  useNavigation: jest.fn(() => ({
    addListener: jest.fn(() => jest.fn()),
    setOptions: jest.fn(),
  })),
  usePreventRemove: jest.fn(),
}));

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

jest.mock('../services/apiKey', () => ({
  getActiveAiApiKey: jest.fn(),
  getOpenAIApiKey: jest.fn(),
  getGeminiApiKey: jest.fn(),
  getAiFeaturesEnabled: jest.fn(),
}));

jest.mock('../services/onboardingProfile', () => ({
  getOnboardingProfile: jest.fn(),
  formatOnboardingProfileForPrompt: jest.fn(() => null),
}));

describe('AIScheduleScreen preview', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    resetDevDemoState();
  });

  beforeEach(() => {
    jest.mocked(getOnboardingProfile).mockResolvedValue(null);
    jest.mocked(getActiveAiApiKey).mockResolvedValue(null);
    jest.mocked(getAiFeaturesEnabled).mockResolvedValue(true);
    resetDevDemoState();
  });

  function mockAiAvailable() {
    jest.mocked(getActiveAiApiKey).mockResolvedValue({ provider: 'openai', key: 'test-key' });
    jest.mocked(getAiFeaturesEnabled).mockResolvedValue(true);
  }

  function makeExistingTask(
    startHour: number,
    startMin: number,
    endHour: number,
    endMin: number,
  ): Task {
    const start = new Date(2026, 4, 23, startHour, startMin, 0, 0);
    const end = new Date(2026, 4, 23, endHour, endMin, 0, 0);

    return {
      id: `${startHour}:${startMin}-${endHour}:${endMin}`,
      title: 'Existing task',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'scheduled',
      aiGenerated: false,
      createdAt: start.toISOString(),
      updatedAt: start.toISOString(),
    };
  }

  function mockStore(tasksForDayFn: () => Task[] = () => [], loading = false) {
    jest.mocked(useTaskStore).mockReturnValue({
      previewTasks: [],
      setPreviewTasks: jest.fn(),
      updatePreviewTask: jest.fn(),
      clearPreviewTasks: jest.fn(),
      confirmPreviewTasks: jest.fn(),
      addTasks: jest.fn(),
      error: null,
      clearError: jest.fn(),
      loading,
      todayTasks: tasksForDayFn,
      tasksForDay: () => tasksForDayFn(),
    } as never);
    jest.mocked(useTaskStore).getState = jest.fn(() => ({
      todayTasks: tasksForDayFn,
      tasksForDay: () => tasksForDayFn(),
    })) as never;
  }

  it('renders the AI schedule preview for generated schedules', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="ai-preview" />
      </PaperProvider>,
    );

    expect(screen.getByText('Your schedule')).toBeOnTheScreen();
    expect(screen.getByText('is ready')).toBeOnTheScreen();
    expect(screen.getByText('AI organized')).toBeOnTheScreen();
    expect(screen.getByText('3 tasks · 2h 15m')).toBeOnTheScreen();
    expect(screen.getByText('Schedule')).toBeOnTheScreen();
    expect(screen.getByText('Study React hooks')).toBeOnTheScreen();
    expect(screen.getByText('Gym session')).toBeOnTheScreen();
    expect(screen.getByText('Groceries')).toBeOnTheScreen();
    expect(screen.getByText('Confirm Schedule ->')).toBeOnTheScreen();
  });

  it('returns to the planner with task rows intact when preview back is pressed', () => {
    const clearPreviewTasks = jest.fn();
    jest.mocked(useTaskStore).mockReturnValue({
      previewTasks: [],
      setPreviewTasks: jest.fn(),
      updatePreviewTask: jest.fn(),
      clearPreviewTasks,
      confirmPreviewTasks: jest.fn(),
      addTasks: jest.fn(),
      error: null,
      clearError: jest.fn(),
      loading: false,
      todayTasks: () => [],
    } as never);
    jest.mocked(useTaskStore).getState = jest.fn(() => ({
      todayTasks: () => [],
    })) as never;

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="ai-preview" />
      </PaperProvider>,
    );

    expect(screen.getByText('Your schedule')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('schedule-preview-back'));

    expect(screen.getByText('Plan your day')).toBeOnTheScreen();
    expect(screen.getByText('Morning workout')).toBeOnTheScreen();
    expect(screen.getByText('Study React')).toBeOnTheScreen();
    expect(screen.getByText('Lunch Break')).toBeOnTheScreen();
    expect(clearPreviewTasks).not.toHaveBeenCalled();
  });

  it('opens the draft dropdown and focuses the title when entering create flow', async () => {
    mockStore();

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });
    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-duration-input')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-cancel')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-add')).toBeOnTheScreen();
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('keeps Confirm Schedule disabled until a task is committed', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('ai-schedule-submit')).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('ai-schedule-draft-input'), 'Morning walk');
    expect(screen.getByTestId('ai-schedule-submit')).toBeDisabled();
  });

  it('disables add task and edit task while confirm schedule is loading', async () => {
    mockStore(() => [], true);

    render(
      <PaperProvider>
        <AIScheduleScreen
          onCancel={jest.fn()}
          onOpenSettings={jest.fn()}
          autoOpenDraft={false}
          scenarioId="default"
        />
      </PaperProvider>,
    );

    expect(screen.getByTestId('ai-schedule-add-row')).toBeDisabled();

    fireEvent.press(screen.getByText('Lunch Break'));
    expect(screen.queryByTestId('ai-schedule-time-add')).not.toBeOnTheScreen();
  });

  it('keeps the dropdown closed until the add-row button is pressed when auto-open is disabled', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} autoOpenDraft={false} />
      </PaperProvider>,
    );

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-schedule-duration-input')).not.toBeOnTheScreen();

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    fireEvent.press(screen.getByTestId('ai-schedule-add-row'));

    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-duration-input')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('hides the AI toggle when AI is unavailable', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('ai-schedule-toggle')).not.toBeOnTheScreen();
    expect(screen.getByText('Start')).toBeOnTheScreen();
  });

  it('shows per-row AI toggle and hides time wheels when AI is available and draft is AI-scheduled', async () => {
    mockStore();
    mockAiAvailable();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} initialAiEnabled />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-toggle')).toBeOnTheScreen();
    });
    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-add')).toBeOnTheScreen();
  });

  it('defaults draft to manual scheduling when adding to an existing schedule', async () => {
    mockStore(() => [makeExistingTask(9, 0, 10, 0)]);
    mockAiAvailable();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('ai-schedule-toggle').props.value).toBe(false);
    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(
      screen.queryByText("No need to set time - we'll organize your day."),
    ).not.toBeOnTheScreen();
  });

  it('defaults draft to AI scheduling when starting from an empty schedule', async () => {
    mockStore();
    mockAiAvailable();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-toggle')).toBeOnTheScreen();
    });
    expect(screen.getByTestId('ai-schedule-toggle').props.value).toBe(true);
    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
  });

  it('does not show placeholder times on AI-scheduled committed rows', async () => {
    mockStore();
    mockAiAvailable();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} initialAiEnabled />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });

    fireEvent.changeText(screen.getByTestId('ai-schedule-draft-input'), 'Morning workout');
    fireEvent.press(screen.getByTestId('ai-schedule-time-add'));

    expect(screen.getByText('Morning workout')).toBeOnTheScreen();
    expect(screen.getByText('AI')).toBeOnTheScreen();
    expect(screen.queryByText(/\d:\d{2}\s(?:AM|PM)\s-\s\d:\d{2}\s(?:AM|PM)/)).not.toBeOnTheScreen();
  });

  it('toggles a committed row between AI and manual scheduling independently', async () => {
    mockStore();
    mockAiAvailable();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="default" />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('Morning workout'));
    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-toggle')).toBeOnTheScreen();
    });

    fireEvent(screen.getByTestId('ai-schedule-toggle'), 'valueChange', true);
    expect(screen.queryByText('Start')).not.toBeOnTheScreen();

    fireEvent(screen.getByTestId('ai-schedule-time-add'), 'press');
    fireEvent.press(screen.getByText('Lunch Break'));

    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-toggle').props.value).toBe(false);
  });

  it('shows a delete button when a committed task is selected', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="default" />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('Morning workout'));

    expect(screen.getByTestId(/ai-schedule-remove-row-/)).toBeOnTheScreen();
    expect(screen.queryByTestId('ai-schedule-remove-row')).not.toBeOnTheScreen();
  });

  it('does not show a delete button on an empty draft row', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('ai-schedule-remove-row')).not.toBeOnTheScreen();
  });

  it('opens the dropdown on the selected task and hides add-a-task when editing a committed row', async () => {
    mockStore();
    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="default" />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('Morning workout'));

    expect(screen.queryByTestId('ai-schedule-add-row')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-schedule-draft-input')).not.toBeOnTheScreen();
    expect(screen.getByDisplayValue('Morning workout')).toBeOnTheScreen();
    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByTestId(/ai-schedule-remove-row-/)).toBeOnTheScreen();
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('closes the dropdown when Cancel is pressed', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Start')).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId('ai-schedule-time-cancel'));

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-schedule-time-add')).not.toBeOnTheScreen();
  });

  it('shows an overlap error and disables Add when times conflict with another task', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="default" />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('Lunch Break'));

    const hourSevens = screen.getAllByTestId('onboarding-wheel-option-7');
    fireEvent.press(hourSevens[0]);
    const minuteThirties = screen.getAllByTestId('onboarding-wheel-option-30');
    fireEvent.press(minuteThirties[0]);
    const amOptions = screen.getAllByTestId('onboarding-wheel-option-AM');
    fireEvent.press(amOptions[0]);

    expect(screen.getByTestId('ai-schedule-time-error')).toHaveTextContent(
      'This time overlaps with another scheduled task.',
    );
    expect(screen.getByTestId('ai-schedule-time-add')).toBeDisabled();
  });

  it('defaults new draft times after an in-progress task instead of overlapping it', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 14, 12, 0, 0));

    const existingTask = makeExistingTask(13, 55, 14, 55);
    mockStore(() => [existingTask]);

    const findNextAvailableSlotSpy = jest.spyOn(scheduling, 'findNextAvailableSlot');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(findNextAvailableSlotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          existingTasks: [existingTask],
        }),
      );
    });
    expect(findNextAvailableSlotSpy).toHaveReturnedWith({
      startTime: '15:00',
      endTime: '16:00',
    });
    expect(findNextAvailableSlotSpy).not.toHaveReturnedWith({
      startTime: '14:15',
      endTime: '15:15',
    });
  });

  it('defaults empty-schedule draft times from onboarding profile wake time', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 6, 7, 0, 0));
    jest.mocked(getOnboardingProfile).mockResolvedValue({
      work: '9:00 AM',
      wake: '7:00 AM',
      'free-time': '1-2 hours',
    });

    mockStore();
    const findNextAvailableSlotSpy = jest.spyOn(scheduling, 'findNextAvailableSlot');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(findNextAvailableSlotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredStart: '07:00',
          durationMinutes: 60,
        }),
      );
    });
    expect(findNextAvailableSlotSpy).toHaveReturnedWith({
      startTime: '07:00',
      endTime: '08:00',
    });
  });

  it('bumps profile-based defaults to now when wake time is already past', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 14, 12, 0, 0));
    jest.mocked(getOnboardingProfile).mockResolvedValue({
      work: '9:00 AM',
      wake: '7:00 AM',
      'free-time': '2-3 hours',
    });

    mockStore();
    const findNextAvailableSlotSpy = jest.spyOn(scheduling, 'findNextAvailableSlot');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(findNextAvailableSlotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredStart: '14:15',
          durationMinutes: 60,
        }),
      );
    });
    expect(findNextAvailableSlotSpy).toHaveReturnedWith({
      startTime: '14:15',
      endTime: '15:15',
    });
  });

  it('uses demo time instead of real clock when computing profile-based defaults', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 18, 12, 0, 0));
    setDemoNowOverride(new Date(2026, 4, 24, 8, 0, 0, 0).toISOString());
    jest.mocked(getOnboardingProfile).mockResolvedValue({
      work: '9:00 AM',
      wake: '7:00 AM',
      'free-time': '1-2 hours',
    });

    mockStore();
    const findNextAvailableSlotSpy = jest.spyOn(scheduling, 'findNextAvailableSlot');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(findNextAvailableSlotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredStart: '08:00',
          durationMinutes: 60,
          context: expect.objectContaining({
            referenceNow: new Date(2026, 4, 24, 8, 0, 0, 0),
          }),
        }),
      );
    });
    expect(findNextAvailableSlotSpy).toHaveReturnedWith({
      startTime: '08:00',
      endTime: '09:00',
    });
  });

  it('shows plan ahead copy when planning for tomorrow', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 10, 0, 0, 0));
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen
          onCancel={jest.fn()}
          onOpenSettings={jest.fn()}
          initialPlanningDayKey="2026-05-24"
        />
      </PaperProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Plan ahead')).toBeOnTheScreen();
    });
    expect(screen.getByText('Sunday, May 24')).toBeOnTheScreen();
    expect(screen.getByText('Tomorrow')).toBeOnTheScreen();
  });
});
