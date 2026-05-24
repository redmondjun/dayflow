import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { getTomorrowKey } from '../features/taskPlanning/planningDay';
import { useTaskStore } from '../store/taskStore';
import { HomeScreenView } from './HomeScreenView';

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

jest.mock('../services/devDemo', () => ({
  getDemoAdjustedTasks: jest.fn((tasks) => tasks),
  getEffectiveNow: jest.fn((now = new Date()) => now),
  useDevDemoState: jest.fn(() => ({ nowOverride: null, weeklyPreviewEnabled: false })),
}));

jest.mock('../services/dayCompleteDismissal', () => ({
  getDayCompleteDismissedDate: jest.fn(async () => null),
  saveDayCompleteDismissedDate: jest.fn(async () => undefined),
}));

describe('HomeScreenView day preview', () => {
  beforeEach(() => {
    jest.mocked(useTaskStore).mockReturnValue({
      loading: false,
      error: null,
      clearError: jest.fn(),
      reloadTasks: jest.fn(),
      tasks: [],
      tasksForDay: () => [],
      todayTasks: () => [],
      currentTask: () => undefined,
      upcomingTasks: () => [],
      markCompleted: jest.fn(),
      markSkipped: jest.fn(),
    } as never);
  });

  it('passes selected planning day key when creating from tomorrow view', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 23, 10, 0, 0, 0));
    const onCreateTask = jest.fn();

    render(
      <PaperProvider>
        <HomeScreenView onCreateTask={onCreateTask} />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('Tomorrow'));
    fireEvent.press(screen.getByText('Plan tomorrow'));

    expect(onCreateTask).toHaveBeenCalledWith(getTomorrowKey(new Date(2026, 4, 23, 10, 0, 0, 0)));
  });
});
