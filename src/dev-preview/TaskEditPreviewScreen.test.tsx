import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { TaskEditPreviewScreen } from './TaskEditPreviewScreen';

const mockUpdateTask = jest.fn();

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(() => ({
    loading: false,
    error: null,
    clearError: jest.fn(),
    reloadTasks: jest.fn(),
    todayTasks: jest.fn(() => []),
    currentTask: jest.fn(),
    upcomingTasks: jest.fn(() => []),
    updateTask: mockUpdateTask,
    markCompleted: jest.fn(),
    markSkipped: jest.fn(),
  })),
}));

describe('TaskEditPreviewScreen', () => {
  beforeEach(() => {
    mockUpdateTask.mockClear();
  });

  it('renders the fixed task edit bottom sheet preview content', () => {
    render(
      <PaperProvider>
        <TaskEditPreviewScreen onCancel={jest.fn()} />
      </PaperProvider>,
    );

    expect(screen.getByText('Tuesday')).toBeOnTheScreen();
    expect(screen.getByText('April 28')).toBeOnTheScreen();
    expect(screen.getAllByText('Design review').length).toBeGreaterThan(0);
    expect(screen.getByText('Edit Task')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Morning routine')).toBeOnTheScreen();
    expect(screen.getByText('Add task')).toBeOnTheScreen();
  });

  it('keeps preview task edits out of the real task store', () => {
    render(
      <PaperProvider>
        <TaskEditPreviewScreen onCancel={jest.fn()} />
      </PaperProvider>,
    );

    screen.getByText('Add task').props.onPress?.();

    expect(mockUpdateTask).not.toHaveBeenCalled();
  });
});
