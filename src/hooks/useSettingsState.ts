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
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [savedOpenAiApiKey, setSavedOpenAiApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState<string | null>(null);
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [validatingOpenAi, setValidatingOpenAi] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);

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
    message,
    validatingOpenAi,
    savingGemini,
    setOpenAiApiKey,
    setGeminiApiKey,
    setMessage,
    saveOpenAi,
    saveGemini,
    removeOpenAi,
    removeGemini,
    toggleAiFeatures,
  };
}
