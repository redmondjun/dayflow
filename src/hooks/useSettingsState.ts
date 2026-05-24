import { useEffect, useState } from 'react';
import {
  deleteGeminiApiKey,
  deleteOpenAIApiKey,
  getAiFeaturesEnabled,
  getAiSuggestionEnabled,
  getGeminiApiKey,
  getOpenAIApiKey,
  saveAiFeaturesEnabled,
  saveAiSuggestionEnabled,
  saveGeminiApiKey,
  saveOpenAIApiKey,
} from '../services/apiKey';
import {
  clearDemoNowOverride,
  setDemoNowOverride,
  setWeeklyPreviewEnabled,
  useDevDemoState,
} from '../services/devDemo';
import { clearOnboardingProfile } from '../services/onboardingProfile';
import { validateOpenAIApiKey } from '../services/openai';
import { useTaskStore } from '../store/taskStore';

export type AiProvider = 'google' | 'openai';

type SaveKeyParams = {
  value: string;
  setLoading: (value: boolean) => void;
  saveKey: (value: string) => Promise<void>;
  setSavedKey: (value: string | null) => void;
  setValue: (value: string) => void;
  successMessage: string;
  removeMessage: string;
  errorMessage: string;
  validate?: (value: string) => Promise<void>;
};

type RemoveKeyParams = {
  setLoading: (value: boolean) => void;
  deleteKey: () => Promise<void>;
  setSavedKey: (value: string | null) => void;
  setValue: (value: string) => void;
  successMessage: string;
  errorMessage: string;
};

export function useSettingsState() {
  const { nowOverride, weeklyPreviewEnabled } = useDevDemoState();
  const deleteTasksForDay = useTaskStore((state) => state.deleteTasksForDay);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('openai');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [savedOpenAiApiKey, setSavedOpenAiApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState<string | null>(null);
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [aiSuggestionEnabled, setAiSuggestionEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [validatingOpenAi, setValidatingOpenAi] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingDemoTasks, setDeletingDemoTasks] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('');

  const currentApiKey = selectedProvider === 'openai' ? openAiApiKey : geminiApiKey;
  const savedCurrentApiKey = selectedProvider === 'openai' ? savedOpenAiApiKey : savedGeminiApiKey;
  const savingCurrentKey = selectedProvider === 'openai' ? validatingOpenAi : savingGemini;

  useEffect(() => {
    Promise.all([
      getOpenAIApiKey(),
      getGeminiApiKey(),
      getAiFeaturesEnabled(),
      getAiSuggestionEnabled(),
    ])
      .then(([openAiKey, geminiKey, aiEnabled, aiSuggestion]) => {
        setSavedOpenAiApiKey(openAiKey);
        setOpenAiApiKey(openAiKey ?? '');
        setSavedGeminiApiKey(geminiKey);
        setGeminiApiKey(geminiKey ?? '');
        setAiFeaturesEnabled(aiEnabled);
        setAiSuggestionEnabled(aiSuggestion);
        if (geminiKey && !openAiKey) setSelectedProvider('google');
      })
      .catch(() => setMessage('Could not load saved settings.'));
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    const source = nowOverride ? new Date(nowOverride) : new Date();
    setDemoDate(formatDateInput(source));
    setDemoTime(formatTimeInput(source));
  }, [nowOverride]);

  const saveKey = async ({
    value,
    setLoading,
    saveKey,
    setSavedKey,
    setValue,
    successMessage,
    removeMessage,
    errorMessage,
    validate,
  }: SaveKeyParams) => {
    const trimmed = value.trim();
    setLoading(true);
    setMessage(null);
    try {
      if (!trimmed) {
        await saveKey('');
        setSavedKey(null);
        setValue('');
        setMessage(removeMessage);
        return;
      }

      if (validate) {
        await validate(trimmed);
      }

      await saveKey(trimmed);
      setSavedKey(trimmed);
      setValue(trimmed);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeKey = async ({
    setLoading,
    deleteKey,
    setSavedKey,
    setValue,
    successMessage,
    errorMessage,
  }: RemoveKeyParams) => {
    setLoading(true);
    setMessage(null);
    try {
      await deleteKey();
      setValue('');
      setSavedKey(null);
      setMessage(successMessage);
    } catch {
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const saveOpenAi = async () => {
    await saveKey({
      value: openAiApiKey,
      setLoading: setValidatingOpenAi,
      saveKey: saveOpenAIApiKey,
      setSavedKey: setSavedOpenAiApiKey,
      setValue: setOpenAiApiKey,
      successMessage: 'OpenAI API key verified and saved.',
      removeMessage: 'OpenAI API key removed.',
      errorMessage: 'Could not save OpenAI API key.',
      validate: validateOpenAIApiKey,
    });
  };

  const saveGemini = async () => {
    await saveKey({
      value: geminiApiKey,
      setLoading: setSavingGemini,
      saveKey: saveGeminiApiKey,
      setSavedKey: setSavedGeminiApiKey,
      setValue: setGeminiApiKey,
      successMessage: 'Gemini API key saved.',
      removeMessage: 'Gemini API key removed.',
      errorMessage: 'Could not save Gemini API key.',
    });
  };

  const saveCurrentProviderKey = async () => {
    if (selectedProvider === 'openai') {
      await saveOpenAi();
      return;
    }
    await saveGemini();
  };

  const removeOpenAi = async () => {
    await removeKey({
      setLoading: setValidatingOpenAi,
      deleteKey: deleteOpenAIApiKey,
      setSavedKey: setSavedOpenAiApiKey,
      setValue: setOpenAiApiKey,
      successMessage: 'OpenAI API key removed.',
      errorMessage: 'Could not remove OpenAI API key.',
    });
  };

  const removeGemini = async () => {
    await removeKey({
      setLoading: setSavingGemini,
      deleteKey: deleteGeminiApiKey,
      setSavedKey: setSavedGeminiApiKey,
      setValue: setGeminiApiKey,
      successMessage: 'Gemini API key removed.',
      errorMessage: 'Could not remove Gemini API key.',
    });
  };

  const removeCurrentProviderKey = async () => {
    if (selectedProvider === 'openai') {
      await removeOpenAi();
      return;
    }
    await removeGemini();
  };

  const setCurrentApiKey = (value: string) => {
    if (selectedProvider === 'openai') {
      setOpenAiApiKey(value);
      return;
    }
    setGeminiApiKey(value);
  };

  const saveAllSettings = async () => {
    setSavingSettings(true);
    setMessage(null);
    try {
      await Promise.all([
        saveAiFeaturesEnabled(aiFeaturesEnabled),
        saveAiSuggestionEnabled(aiSuggestionEnabled),
      ]);
      if (currentApiKey.trim()) {
        if (selectedProvider === 'openai') {
          await saveOpenAi();
        } else {
          await saveGemini();
        }
      } else {
        setMessage('Settings saved.');
      }
    } catch {
      setMessage('Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const saveDemoTime = () => {
    if (!__DEV__) return false;
    const parsed = parseDemoDateTime(demoDate, demoTime);
    if (!parsed) {
      setMessage('Enter a valid demo date and time.');
      return false;
    }
    setDemoNowOverride(parsed.toISOString());
    setMessage(`Demo time set to ${formatDisplayLabel(parsed)}.`);
    return true;
  };

  const resetDemoTime = () => {
    if (!__DEV__) return;
    clearDemoNowOverride();
    const now = new Date();
    setDemoDate(formatDateInput(now));
    setDemoTime(formatTimeInput(now));
    setMessage('Demo time reset to live time.');
  };

  const toggleWeeklyPreview = (value: boolean) => {
    if (!__DEV__) return;
    setWeeklyPreviewEnabled(value);
    setMessage(value ? 'Weekly demo preview enabled.' : 'Weekly demo preview disabled.');
  };

  const deleteDemoDayTasks = async () => {
    if (!__DEV__) return;
    const parsed = parseDemoDateOnly(demoDate);
    if (!parsed) {
      setMessage('Enter a valid demo date.');
      return;
    }

    setDeletingDemoTasks(true);
    setMessage(null);
    try {
      const deletedCount = await deleteTasksForDay(parsed);
      setMessage(
        deletedCount === 0
          ? `No tasks found for ${formatDateLabel(parsed)}.`
          : `Deleted ${deletedCount} task${deletedCount === 1 ? '' : 's'} for ${formatDateLabel(parsed)}.`,
      );
    } catch {
      setMessage('Could not delete demo day tasks.');
    } finally {
      setDeletingDemoTasks(false);
    }
  };

  const clearOnboarding = async () => {
    try {
      await clearOnboardingProfile();
      setMessage('Onboarding profile cleared.');
      return true;
    } catch {
      setMessage('Could not clear onboarding profile.');
      return false;
    }
  };

  return {
    aiFeaturesEnabled,
    aiSuggestionEnabled,
    clearOnboarding,
    currentApiKey,
    deleteDemoDayTasks,
    demoDate,
    demoTime,
    demoNowOverride: nowOverride,
    deletingDemoTasks,
    message,
    removeCurrentProviderKey,
    resetDemoTime,
    saveAllSettings,
    saveCurrentProviderKey,
    savedCurrentApiKey,
    savingCurrentKey,
    savingSettings,
    selectedProvider,
    setAiFeaturesEnabled,
    setAiSuggestionEnabled,
    setCurrentApiKey,
    setDemoDate,
    setDemoTime,
    setMessage,
    setSelectedProvider,
    saveDemoTime,
    toggleWeeklyPreview,
    weeklyPreviewEnabled,
  };
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(value: Date): string {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseDemoDateOnly(dateValue: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  const parsed = new Date(year, month, day, 0, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseDemoDateTime(dateValue: string, timeValue: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  const parsed = new Date(year, month, day, hours, minutes, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) {
    return null;
  }

  return parsed;
}

function formatDisplayLabel(value: Date): string {
  return value.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLabel(value: Date): string {
  return value.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
