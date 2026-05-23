import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { HomeScreenView } from './HomeScreenView';

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

type MockTaskStoreHook = jest.Mock;

const baseTask: Task = {
  id: 'task-1',
  title: 'Design review',
  startTime: '2026-04-28T18:30:00.000Z',
  endTime: '2026-04-28T19:45:00.000Z',
  status: 'scheduled',
  aiGenerated: false,
  createdAt: '2026-04-28T18:00:00.000Z',
  updatedAt: '2026-04-28T18:00:00.000Z',
};

function createStoreState(overrides = {}) {
  return {
    loading: false,
    error: null,
    clearError: jest.fn(),
    reloadTasks: jest.fn<() => Promise<void>>().mockResolvedValue(),
    todayTasks: jest.fn(() => [baseTask]),
    currentTask: jest.fn(() => baseTask),
    upcomingTasks: jest.fn(() => []),
    updateTask: jest.fn((_taskId: string, _input: Partial<Task>) => Promise.resolve()),
    markCompleted: jest.fn<() => Promise<void>>().mockResolvedValue(),
    markSkipped: jest.fn<() => Promise<void>>().mockResolvedValue(),
    ...overrides,
  };
}

function renderHomeScreenView(overrides = {}) {
  const state = createStoreState(overrides);
  const useTaskStoreMock = useTaskStore as unknown as MockTaskStoreHook;
  useTaskStoreMock.mockReturnValue(state);

  render(
    <PaperProvider>
      <HomeScreenView
        onCreateTask={jest.fn()}
        onOpenAiSchedule={jest.fn()}
        onEditTask={jest.fn()}
      />
    </PaperProvider>,
  );

  return state;
}

describe('HomeScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a bottom sheet from a today task and saves edited title and schedule times', async () => {
    const store = renderHomeScreenView();

    fireEvent.press(screen.getByTestId('task-timeline-row-task-1'));

    expect(screen.getByText('Edit Task')).toBeOnTheScreen();
    expect(screen.queryByTestId('close-task-editor')).toBeNull();
    expect(screen.getAllByText('Design review').length).toBeGreaterThan(0);

    fireEvent.changeText(screen.getByTestId('task-editor-title-input'), 'Morning routine');
    fireEvent.press(screen.getAllByTestId('onboarding-wheel-option-11')[1]);
    fireEvent.press(screen.getAllByTestId('onboarding-wheel-option-55')[1]);
    fireEvent.press(screen.getAllByTestId('onboarding-wheel-option-PM')[1]);
    fireEvent.press(screen.getByText('Add task'));

    await waitFor(() =>
      expect(store.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Morning routine',
          startTime: baseTask.startTime,
          endTime: expect.any(String),
        }),
      ),
    );
    const [, patch] = store.updateTask.mock.calls[0] ?? [];
    expect(patch?.endTime).not.toBe(baseTask.endTime);
  });
});
