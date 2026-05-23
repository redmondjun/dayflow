import { useEffect, useState } from 'react';
import {
  deleteGeminiApiKey,
  deleteOpenAIApiKey,
  getAiFeaturesEnabled,
  getGeminiApiKey,
  getOpenAIApiKey,
  saveAiFeaturesEnabled,
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

type ApiKeySectionState = {
  id: 'openai' | 'gemini';
  provider: string;
  placeholder: string;
  value: string;
  savedKey: string | null;
  loading: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onRemove: () => void;
};

export function useSettingsState() {
  const { nowOverride, weeklyPreviewEnabled } = useDevDemoState();
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [savedOpenAiApiKey, setSavedOpenAiApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState<string | null>(null);
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [validatingOpenAi, setValidatingOpenAi] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('');

  useEffect(() => {
    Promise.all([getOpenAIApiKey(), getGeminiApiKey(), getAiFeaturesEnabled()])
      .then(([openAiKey, geminiKey, aiEnabled]) => {
        setSavedOpenAiApiKey(openAiKey);
        setOpenAiApiKey(openAiKey ?? '');
        setSavedGeminiApiKey(geminiKey);
        setGeminiApiKey(geminiKey ?? '');
        setAiFeaturesEnabled(aiEnabled);
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

  const toggleAiFeatures = async (value: boolean) => {
    setAiFeaturesEnabled(value);
    try {
      await saveAiFeaturesEnabled(value);
    } catch {
      setAiFeaturesEnabled(!value);
      setMessage('Could not update AI features setting.');
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

  const apiKeySections: ApiKeySectionState[] = [
    {
      id: 'openai',
      provider: 'OpenAI',
      placeholder: 'sk-proj-...',
      value: openAiApiKey,
      savedKey: savedOpenAiApiKey,
      loading: validatingOpenAi,
      onChange: setOpenAiApiKey,
      onSave: saveOpenAi,
      onRemove: removeOpenAi,
    },
    {
      id: 'gemini',
      provider: 'Gemini',
      placeholder: 'AIza...',
      value: geminiApiKey,
      savedKey: savedGeminiApiKey,
      loading: savingGemini,
      onChange: setGeminiApiKey,
      onSave: saveGemini,
      onRemove: removeGemini,
    },
  ];

  return {
    apiKeySections,
    openAiApiKey,
    savedOpenAiApiKey,
    geminiApiKey,
    savedGeminiApiKey,
    aiFeaturesEnabled,
    clearOnboarding,
    message,
    demoDate,
    demoTime,
    demoNowOverride: nowOverride,
    weeklyPreviewEnabled,
    validatingOpenAi,
    savingGemini,
    setOpenAiApiKey,
    setGeminiApiKey,
    setMessage,
    setDemoDate,
    setDemoTime,
    saveOpenAi,
    saveGemini,
    saveDemoTime,
    removeOpenAi,
    removeGemini,
    resetDemoTime,
    toggleAiFeatures,
    toggleWeeklyPreview,
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
