import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import type { SettingsViewProps } from '../views/SettingsView';
import { SettingsView } from '../views/SettingsView';

function mockEyeClosed() {
  return <Text>eye-closed</Text>;
}
mockEyeClosed.displayName = 'EyeClosedMock';

function mockEyeOpen() {
  return <Text>eye-open</Text>;
}
mockEyeOpen.displayName = 'EyeOpenMock';

function mockTrash() {
  return <Text>trash</Text>;
}
mockTrash.displayName = 'TrashMock';

jest.mock('../assets/icons/eye-closed.svg', () => {
  return mockEyeClosed;
});
jest.mock('../assets/icons/eye-open.svg', () => {
  return mockEyeOpen;
});
jest.mock('../assets/icons/trash.svg', () => {
  return mockTrash;
});

const mockSettingsProps: SettingsViewProps = {
  aiFeaturesEnabled: true,
  aiSuggestionEnabled: true,
  currentApiKey: '',
  deleteDemoDayTasks: jest.fn(),
  demoDate: '2026-05-22',
  demoTime: '09:30',
  demoNowOverride: null,
  deletingDemoTasks: false,
  message: null,
  onResetOnboarding: jest.fn(async () => true),
  removeCurrentProviderKey: jest.fn(),
  resetDemoTime: jest.fn(),
  saveAllSettings: jest.fn(),
  saveCurrentProviderKey: jest.fn(),
  saveDemoTime: jest.fn(),
  savedCurrentApiKey: null,
  savingCurrentKey: false,
  savingSettings: false,
  selectedProvider: 'openai',
  setAiFeaturesEnabled: jest.fn(),
  setAiSuggestionEnabled: jest.fn(),
  setCurrentApiKey: jest.fn(),
  setDemoDate: jest.fn(),
  setDemoTime: jest.fn(),
  setMessage: jest.fn(),
  setSelectedProvider: jest.fn(),
  showDeveloperTools: false,
  toggleWeeklyPreview: jest.fn(),
  weeklyPreviewEnabled: false,
};

function renderSettingsView(overrideProps: Partial<SettingsViewProps> = {}) {
  return render(
    <PaperProvider>
      <SettingsView {...mockSettingsProps} {...overrideProps} />
    </PaperProvider>,
  );
}

describe('SettingsView', () => {
  beforeEach(() => {
    Reflect.set(globalThis, '__DEV__', false);
    mockSettingsProps.savedCurrentApiKey = null;
    mockSettingsProps.currentApiKey = '';
    mockSettingsProps.selectedProvider = 'openai';
    mockSettingsProps.savingCurrentKey = false;
    mockSettingsProps.showDeveloperTools = false;
  });

  it('renders the redesigned AI settings sections', () => {
    renderSettingsView();

    expect(screen.getByText('Setting')).toBeOnTheScreen();
    expect(screen.getByText('Google')).toBeOnTheScreen();
    expect(screen.getByText('OpenAI')).toBeOnTheScreen();
    expect(screen.getByText('AI Features')).toBeOnTheScreen();
    expect(screen.getByText('AI Suggestion')).toBeOnTheScreen();
    expect(screen.getByText('Weekly insight suggestions on')).toBeOnTheScreen();
    expect(screen.getAllByText('Save')).toHaveLength(2);
  });

  it('shows empty-state copy when no keys are saved', () => {
    renderSettingsView();

    expect(screen.getByText('No saved keys - add one above')).toBeOnTheScreen();
  });

  it('reveals saved key row when a key exists', () => {
    renderSettingsView({ savedCurrentApiKey: 'sk-proj-1234567890abcdef' });

    expect(screen.getByText('sk-pro  •••••••••••••  cdef')).toBeOnTheScreen();
  });

  it('shows validating copy while checking the API key', () => {
    renderSettingsView({ savingCurrentKey: true });

    expect(screen.getByText('Checking your API key...')).toBeOnTheScreen();
  });

  it('calls the AI features toggle handler', () => {
    renderSettingsView();

    fireEvent(screen.getAllByRole('switch')[0], 'valueChange', false);
    expect(mockSettingsProps.setAiFeaturesEnabled).toHaveBeenCalledWith(false);
  });

  it('calls the AI suggestion toggle handler', () => {
    renderSettingsView();

    fireEvent(screen.getByTestId('settings-ai-suggestion-switch'), 'valueChange', false);
    expect(mockSettingsProps.setAiSuggestionEnabled).toHaveBeenCalledWith(false);
  });

  it('calls save all settings from the bottom button', () => {
    renderSettingsView();

    fireEvent.press(screen.getByTestId('settings-save-all-button'));
    expect(mockSettingsProps.saveAllSettings).toHaveBeenCalled();
  });

  it('shows developer demo controls only in dev mode', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsView({ showDeveloperTools: true });

    expect(screen.getByText('Developer')).toBeOnTheScreen();
    expect(screen.getByText('Demo time')).toBeOnTheScreen();
    expect(screen.getByText('Delete demo day tasks')).toBeOnTheScreen();
    expect(screen.getByText('Weekly demo data')).toBeOnTheScreen();
    expect(screen.getByText('Reset Onboarding')).toBeOnTheScreen();
  });

  it('calls delete demo day tasks from the developer section', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsView({ showDeveloperTools: true });

    fireEvent.press(screen.getByTestId('settings-delete-demo-tasks-button'));
    expect(mockSettingsProps.deleteDemoDayTasks).toHaveBeenCalled();
  });

  it('hides developer demo controls in UI preview mode', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsView({ showDeveloperTools: false });

    expect(screen.queryByText('Developer')).not.toBeOnTheScreen();
    expect(screen.queryByText('Demo time')).not.toBeOnTheScreen();
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();
  });

  it('shows UI Preview in the developer section when a preview handler is provided', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsView({ showDeveloperTools: true });
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();

    renderSettingsView({ showDeveloperTools: true, onOpenPreviewCatalog: jest.fn() });
    expect(screen.getByText('Developer')).toBeOnTheScreen();
    expect(screen.getByText('UI Preview')).toBeOnTheScreen();
    expect(screen.queryByText('Preview')).not.toBeOnTheScreen();
  });

  it('hides developer demo controls outside dev mode', () => {
    Reflect.set(globalThis, '__DEV__', false);

    renderSettingsView({ showDeveloperTools: false, onOpenPreviewCatalog: jest.fn() });

    expect(screen.queryByText('Developer')).not.toBeOnTheScreen();
    expect(screen.queryByText('Demo time')).not.toBeOnTheScreen();
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();
  });
});
