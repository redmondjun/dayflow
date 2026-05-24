import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SettingsScreen } from '../screens/SettingsScreen';

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

const mockSettingsState = {
  aiFeaturesEnabled: true,
  aiSuggestionEnabled: true,
  clearOnboarding: jest.fn(async () => true),
  currentApiKey: '',
  deleteDemoDayTasks: jest.fn(),
  demoDate: '2026-05-22',
  demoTime: '09:30',
  demoNowOverride: null as string | null,
  deletingDemoTasks: false,
  message: null as string | null,
  removeCurrentProviderKey: jest.fn(),
  resetDemoTime: jest.fn(),
  saveAllSettings: jest.fn(),
  saveCurrentProviderKey: jest.fn(),
  savedCurrentApiKey: null as string | null,
  savingCurrentKey: false,
  savingSettings: false,
  selectedProvider: 'openai' as const,
  setAiFeaturesEnabled: jest.fn(),
  setAiSuggestionEnabled: jest.fn(),
  setCurrentApiKey: jest.fn(),
  setDemoDate: jest.fn(),
  setDemoTime: jest.fn(),
  setMessage: jest.fn(),
  setSelectedProvider: jest.fn(),
  saveDemoTime: jest.fn(),
  toggleWeeklyPreview: jest.fn(),
  weeklyPreviewEnabled: false,
};

jest.mock('../hooks/useSettingsState', () => ({
  useSettingsState: () => mockSettingsState,
}));

function renderSettingsScreen(
  overrideProps: Partial<{
    onCancel: () => void;
    onOpenPreviewCatalog: () => void;
    hideDeveloperTools: boolean;
  }> = {},
) {
  return render(
    <PaperProvider>
      <SettingsScreen {...overrideProps} />
    </PaperProvider>,
  );
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    Reflect.set(globalThis, '__DEV__', false);
    mockSettingsState.savedCurrentApiKey = null;
    mockSettingsState.currentApiKey = '';
    mockSettingsState.selectedProvider = 'openai';
    mockSettingsState.savingCurrentKey = false;
  });

  it('renders the redesigned AI settings sections', () => {
    renderSettingsScreen();

    expect(screen.getByText('Setting')).toBeOnTheScreen();
    expect(screen.getByText('Google')).toBeOnTheScreen();
    expect(screen.getByText('OpenAI')).toBeOnTheScreen();
    expect(screen.getByText('AI Features')).toBeOnTheScreen();
    expect(screen.getByText('AI Suggestion')).toBeOnTheScreen();
    expect(screen.getByText('Weekly insight suggestions on')).toBeOnTheScreen();
    expect(screen.getAllByText('Save')).toHaveLength(2);
  });

  it('shows empty-state copy when no keys are saved', () => {
    renderSettingsScreen();

    expect(screen.getByText('No saved keys - add one above')).toBeOnTheScreen();
  });

  it('reveals saved key row when a key exists', () => {
    mockSettingsState.savedCurrentApiKey = 'sk-proj-1234567890abcdef';

    renderSettingsScreen();

    expect(screen.getByText('sk-pro  •••••••••••••  cdef')).toBeOnTheScreen();

    mockSettingsState.savedCurrentApiKey = null;
  });

  it('shows validating copy while checking the API key', () => {
    mockSettingsState.savingCurrentKey = true;

    renderSettingsScreen();

    expect(screen.getByText('Checking your API key...')).toBeOnTheScreen();

    mockSettingsState.savingCurrentKey = false;
  });

  it('calls the AI features toggle handler', () => {
    renderSettingsScreen();

    fireEvent(screen.getAllByRole('switch')[0], 'valueChange', false);
    expect(mockSettingsState.setAiFeaturesEnabled).toHaveBeenCalledWith(false);
  });

  it('calls the AI suggestion toggle handler', () => {
    renderSettingsScreen();

    fireEvent(screen.getByTestId('settings-ai-suggestion-switch'), 'valueChange', false);
    expect(mockSettingsState.setAiSuggestionEnabled).toHaveBeenCalledWith(false);
  });

  it('calls save all settings from the bottom button', () => {
    renderSettingsScreen();

    fireEvent.press(screen.getByTestId('settings-save-all-button'));
    expect(mockSettingsState.saveAllSettings).toHaveBeenCalled();
  });

  it('shows developer demo controls only in dev mode', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsScreen();

    expect(screen.getByText('Developer')).toBeOnTheScreen();
    expect(screen.getByText('Demo time')).toBeOnTheScreen();
    expect(screen.getByText('Delete demo day tasks')).toBeOnTheScreen();
    expect(screen.getByText('Weekly demo data')).toBeOnTheScreen();
    expect(screen.getByText('Reset Onboarding')).toBeOnTheScreen();
  });

  it('calls delete demo day tasks from the developer section', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsScreen();

    fireEvent.press(screen.getByTestId('settings-delete-demo-tasks-button'));
    expect(mockSettingsState.deleteDemoDayTasks).toHaveBeenCalled();
  });

  it('hides developer demo controls in UI preview mode', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsScreen({ hideDeveloperTools: true });

    expect(screen.queryByText('Developer')).not.toBeOnTheScreen();
    expect(screen.queryByText('Demo time')).not.toBeOnTheScreen();
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();
  });

  it('shows UI Preview in the developer section when a preview handler is provided', () => {
    Reflect.set(globalThis, '__DEV__', true);

    renderSettingsScreen();
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();

    renderSettingsScreen({ onOpenPreviewCatalog: jest.fn() });
    expect(screen.getByText('Developer')).toBeOnTheScreen();
    expect(screen.getByText('UI Preview')).toBeOnTheScreen();
    expect(screen.queryByText('Preview')).not.toBeOnTheScreen();
  });

  it('hides developer demo controls outside dev mode', () => {
    Reflect.set(globalThis, '__DEV__', false);

    renderSettingsScreen({ onOpenPreviewCatalog: jest.fn() });

    expect(screen.queryByText('Developer')).not.toBeOnTheScreen();
    expect(screen.queryByText('Demo time')).not.toBeOnTheScreen();
    expect(screen.queryByText('UI Preview')).not.toBeOnTheScreen();
  });
});
