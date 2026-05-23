import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AIScheduleScreen } from './AIScheduleScreen';
import { useTaskStore } from '../store/taskStore';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

describe('AIScheduleScreen preview', () => {
  function mockStore() {
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
    } as never);
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

  it('keeps the dropdown closed until the add-row button is pressed', async () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.queryByText('End')).not.toBeOnTheScreen();
    expect(screen.queryByText('Morning workout')).not.toBeOnTheScreen();

    const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

    fireEvent.press(screen.getByTestId('ai-schedule-add-row'));

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

  it('shows Cancel and Add when AI scheduling is enabled', () => {
    mockStore();

    render(
      <PaperProvider>
        <AIScheduleScreen onCancel={jest.fn()} onOpenSettings={jest.fn()} initialAiEnabled />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByTestId('ai-schedule-add-row'));

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-cancel')).toBeOnTheScreen();
    expect(screen.getByTestId('ai-schedule-time-add')).toBeOnTheScreen();
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
    expect(screen.queryByTestId(/ai-schedule-remove-row-/)).not.toBeOnTheScreen();
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

    fireEvent.press(screen.getByTestId('ai-schedule-add-row'));

    expect(screen.getByText('Start')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ai-schedule-time-cancel'));

    expect(screen.queryByText('Start')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('ai-schedule-time-add')).not.toBeOnTheScreen();
  });
});
