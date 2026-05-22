import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { TaskFormView, type TaskFormSubmit } from './TaskFormView';

function renderTaskFormView(
  overrideProps: Partial<React.ComponentProps<typeof TaskFormView>> = {},
) {
  const props: React.ComponentProps<typeof TaskFormView> = {
    mode: 'create',
    loading: false,
    error: null,
    onDismissError: jest.fn(),
    onCancel: jest.fn(),
    onSave: jest.fn<(_values: TaskFormSubmit) => void>(),
    onDelete: jest.fn(),
    ...overrideProps,
  };

  return {
    ...render(
      <PaperProvider>
        <TaskFormView {...props} />
      </PaperProvider>,
    ),
    props,
  };
}

describe('TaskFormView', () => {
  it('renders the current task input-style create screen and its quick add actions', () => {
    const onCancel = jest.fn();

    renderTaskFormView({
      onCancel,
    });

    expect(screen.getByText('Plan your day')).toBeOnTheScreen();
    expect(screen.getByText('Quick add')).toBeOnTheScreen();
    expect(screen.getByText('Confirm schedule')).toBeOnTheScreen();

    fireEvent.press(screen.getByText(/Morning walk/));
    expect(screen.getByDisplayValue('Morning walk')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Close'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows duration copy and allows save when the create form is valid', () => {
    const onSave = jest.fn<(_values: TaskFormSubmit) => void>();

    renderTaskFormView({
      initialTask: {
        title: 'Morning walk',
        startTime: '2026-05-20T07:00:00-07:00',
        endTime: '2026-05-20T07:45:00-07:00',
        status: 'scheduled',
      },
      onSave,
    });

    expect(screen.getByText('Duration: 45m')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Confirm schedule'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Morning walk',
        start: '07:00',
        end: '07:45',
        status: 'scheduled',
      }),
    );
  });

  it('shows validation errors instead of duration when the form is invalid', () => {
    renderTaskFormView();

    expect(screen.getByText('Title is required.')).toBeOnTheScreen();
    expect(screen.queryByText('Duration: 45m')).not.toBeOnTheScreen();
  });

  it('renders edit-specific controls and saves status changes', () => {
    const onSave = jest.fn<(_values: TaskFormSubmit) => void>();

    renderTaskFormView({
      mode: 'edit',
      initialTask: {
        title: 'Review notes',
        startTime: '2026-05-20T07:00:00-07:00',
        endTime: '2026-05-20T07:45:00-07:00',
        status: 'scheduled',
      },
      onSave,
    });

    expect(screen.getByText('Edit Task')).toBeOnTheScreen();
    expect(screen.getByText('Task')).toBeOnTheScreen();
    expect(screen.getByText('Schedule')).toBeOnTheScreen();
    expect(screen.getAllByText('State').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect(screen.getByText('skipped')).toBeOnTheScreen();
    expect(screen.getByText('completed')).toBeOnTheScreen();
    expect(screen.getByText('In your day')).toBeOnTheScreen();
    expect(screen.getByText('No previous task')).toBeOnTheScreen();
    expect(screen.getByText('Review notes')).toBeOnTheScreen();
    expect(screen.getByText('No next task')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('skipped'));
    fireEvent.press(screen.getByText('Save changes'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ status: 'skipped' }));
  });

  it('preserves cross-midnight tasks when saving an edited task', () => {
    const onSave = jest.fn<(_values: TaskFormSubmit) => void>();

    renderTaskFormView({
      mode: 'edit',
      initialTask: {
        title: 'Late study',
        startTime: '2026-05-20T23:30:00-07:00',
        endTime: '2026-05-21T00:15:00-07:00',
        status: 'scheduled',
      },
      onSave,
    });

    fireEvent.press(screen.getByText('Save changes'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        start: '23:30',
        end: '00:15',
        startTime: '2026-05-21T06:30:00.000Z',
        endTime: '2026-05-21T07:15:00.000Z',
      }),
    );
  });
});
