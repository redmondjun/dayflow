import React from 'react';
import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AIScheduleScreen } from './AIScheduleScreen';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import * as scheduling from '../features/taskPlanning/scheduling';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

describe('AIScheduleScreen preview', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

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

  function mockStore(todayTasks: () => Task[] = () => []) {
    jest.mocked(useTaskStore).mockReturnValue({
      previewTasks: [],
      setPreviewTasks: jest.fn(),
      updatePreviewTask: jest.fn(),
      clearPreviewTasks: jest.fn(),
      confirmPreviewTasks: jest.fn(),
      addTasks: jest.fn(),
      error: null,
      clearError: jest.fn(),
      loading: false,
      todayTasks,
    } as never);
    jest.mocked(useTaskStore).getState = jest.fn(() => ({
      todayTasks,
    })) as never;
  }

  it('renders the dedicated task-complete preview screen for generated schedules', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} scenarioId="ai-preview" />
      </PaperProvider>,
    );

    expect(screen.getByText('All done for today.')).toBeOnTheScreen();
    expect(screen.getByText('Completed')).toBeOnTheScreen();
    expect(screen.getByText('3/3')).toBeOnTheScreen();
    expect(screen.getByText('Study React hooks')).toBeOnTheScreen();
    expect(screen.getByText('Confirm schedule ->')).toBeOnTheScreen();
  });

  it('opens the draft dropdown and focuses the title when entering create flow', async () => {
    mockStore();

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByText('End')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-cancel')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-add')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('keeps the dropdown closed until the add-row button is pressed when auto-open is disabled', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} autoOpenDraft={false} />
      </PaperProvider>,
    );

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.queryByText('End')).not.toBeOnTheScreen();

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    fireEvent.press(screen.getByTestId('ai-schedule-add-row'));

    expect(screen.getByText('Start')).toBeOnTheScreen();
    expect(screen.getByText('End')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
    await waitFor(() => {
      expect(focusSpy).toHaveBeenCalled();
    });

    focusSpy.mockRestore();
  });

  it('shows Cancel and Add when AI scheduling is enabled', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} initialAiEnabled />
      </PaperProvider>,
    );

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-cancel')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-add')).toBeOnTheScreen();
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

  it('does not show a delete button on an empty draft row', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByTestId('ai-schedule-draft-input')).toBeOnTheScreen();
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

    expect(screen.getByText('Start')).toBeOnTheScreen();
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

  it('defaults new draft times after an in-progress task instead of overlapping it', () => {
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

    expect(findNextAvailableSlotSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        existingTasks: [existingTask],
      }),
    );
    expect(findNextAvailableSlotSpy).toHaveReturnedWith({
      startTime: '15:00',
      endTime: '16:00',
    });
    expect(findNextAvailableSlotSpy).not.toHaveReturnedWith({
      startTime: '14:15',
      endTime: '15:15',
    });
  });
});
