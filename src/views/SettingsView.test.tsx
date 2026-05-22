import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
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
  openAiApiKey: '',
  savedOpenAiApiKey: null as string | null,
  geminiApiKey: '',
  savedGeminiApiKey: null as string | null,
  aiFeaturesEnabled: true,
  message: null as string | null,
  validatingOpenAi: false,
  savingGemini: false,
  setOpenAiApiKey: jest.fn(),
  setGeminiApiKey: jest.fn(),
  setMessage: jest.fn(),
  saveOpenAi: jest.fn(),
  saveGemini: jest.fn(),
  removeOpenAi: jest.fn(),
  removeGemini: jest.fn(),
  toggleAiFeatures: jest.fn(),
};

function mockBuildApiKeySections() {
  return [
    {
      id: 'openai' as const,
      provider: 'OpenAI',
      placeholder: 'sk-proj-...',
      value: mockSettingsState.openAiApiKey,
      savedKey: mockSettingsState.savedOpenAiApiKey,
      loading: mockSettingsState.validatingOpenAi,
      onChange: mockSettingsState.setOpenAiApiKey,
      onSave: mockSettingsState.saveOpenAi,
      onRemove: mockSettingsState.removeOpenAi,
    },
    {
      id: 'gemini' as const,
      provider: 'Gemini',
      placeholder: 'AIza...',
      value: mockSettingsState.geminiApiKey,
      savedKey: mockSettingsState.savedGeminiApiKey,
      loading: mockSettingsState.savingGemini,
      onChange: mockSettingsState.setGeminiApiKey,
      onSave: mockSettingsState.saveGemini,
      onRemove: mockSettingsState.removeGemini,
    },
  ];
}

jest.mock('../hooks/useSettingsState', () => ({
  useSettingsState: () => ({
    ...mockSettingsState,
    apiKeySections: mockBuildApiKeySections(),
  }),
}));

function renderSettingsScreen(
  overrideProps: Partial<{
    onCancel: () => void;
    onOpenPreviewCatalog: () => void;
  }> = {},
) {
  return render(
    <PaperProvider>
      <SettingsScreen {...overrideProps} />
    </PaperProvider>,
  );
}

describe('SettingsScreen', () => {
  it('renders the new AI settings sections', () => {
    renderSettingsScreen();

    expect(screen.getByText('Settings')).toBeOnTheScreen();
    expect(screen.getByText('OpenAI API Key')).toBeOnTheScreen();
    expect(screen.getByText('Gemini API Key')).toBeOnTheScreen();
    expect(screen.getByText('AI Features')).toBeOnTheScreen();
  });

  it('shows empty-state copy when no keys are saved', () => {
    renderSettingsScreen();

    expect(screen.getAllByText('No saved keys — add one above')).toHaveLength(2);
  });

  it('reveals saved key sections when keys exist', () => {
    mockSettingsState.savedOpenAiApiKey = 'sk-proj-1234567890abcdef';
    mockSettingsState.savedGeminiApiKey = 'AIza1234567890abcdef';

    renderSettingsScreen();

    expect(screen.getAllByText('Saved keys')).toHaveLength(2);

    mockSettingsState.savedOpenAiApiKey = null;
    mockSettingsState.savedGeminiApiKey = null;
  });

  it('shows validating copy while checking the OpenAI key', () => {
    mockSettingsState.validatingOpenAi = true;

    renderSettingsScreen();

    expect(screen.getByText('Checking your OpenAI API key...')).toBeOnTheScreen();

    mockSettingsState.validatingOpenAi = false;
  });

  it('calls the AI features toggle handler', () => {
    renderSettingsScreen();

    fireEvent(screen.getByRole('switch'), 'valueChange', false);
    expect(mockSettingsState.toggleAiFeatures).toHaveBeenCalledWith(false);
  });
});
