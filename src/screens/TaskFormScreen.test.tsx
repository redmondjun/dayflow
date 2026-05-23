import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import { useTaskStore } from '../store/taskStore';
import { TaskFormPreviewScreen } from '../dev-preview/TaskFormPreviewScreen';
import { TaskFormScreen } from './TaskFormScreen';

jest.mock('../store/taskStore', () => ({
  useTaskStore: jest.fn(),
}));

type MockTaskStoreHook = jest.Mock & {
  getState: jest.Mock;
};

const baseTask = {
  id: 'task-1',
  title: 'Design review',
  startTime: '2026-04-28T18:30:00.000Z',
  endTime: '2026-04-28T19:45:00.000Z',
  status: 'scheduled' as const,
  aiGenerated: false,
  createdAt: '2026-04-28T18:00:00.000Z',
  updatedAt: '2026-04-28T18:00:00.000Z',
};

function mockTaskStore(overrides: Partial<ReturnType<typeof createStoreState>> = {}) {
  const state = createStoreState(overrides);
  const useTaskStoreMock = useTaskStore as unknown as MockTaskStoreHook;
  useTaskStoreMock.mockImplementation(() => state);
  useTaskStoreMock.getState = jest.fn(() => state);
  return state;
}

function createStoreState(overrides = {}) {
  return {
    tasks: [baseTask],
    addTask: jest.fn<() => Promise<void>>().mockResolvedValue(),
    updateTask: jest.fn<() => Promise<void>>().mockResolvedValue(),
    deleteTask: jest.fn<() => Promise<void>>().mockResolvedValue(),
    error: null,
    clearError: jest.fn(),
    loading: false,
    ...overrides,
  };
}

function renderEditTaskScreen() {
  const navigation = { goBack: jest.fn() };
  const route = {
    key: 'EditTask-test',
    name: 'EditTask',
    params: { taskId: 'task-1' },
  } as const;

  render(
    <PaperProvider>
      <TaskFormScreen
        navigation={navigation as never}
        route={route as RootStackParamList['EditTask'] & never}
      />
    </PaperProvider>,
  );

  return { navigation };
}

describe('TaskFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the selected task in the real edit route', async () => {
    const store = mockTaskStore();
    const { navigation } = renderEditTaskScreen();

    fireEvent.press(screen.getByText('completed'));
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() =>
      expect(store.updateTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          title: 'Design review',
          status: 'completed',
        }),
      ),
    );
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('keeps task form preview saves out of the real task store', async () => {
    const store = mockTaskStore();
    const onCancel = jest.fn();

    render(
      <PaperProvider>
        <TaskFormPreviewScreen scenarioId="task-edit" onCancel={onCancel} />
      </PaperProvider>,
    );

    fireEvent.press(screen.getByText('completed'));
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(store.addTask).not.toHaveBeenCalled();
    expect(store.updateTask).not.toHaveBeenCalled();
    expect(store.deleteTask).not.toHaveBeenCalled();
  });
});
