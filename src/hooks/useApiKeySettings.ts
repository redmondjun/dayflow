import { useEffect, useState } from 'react';
import {
  deleteGeminiApiKey,
  deleteOpenAIApiKey,
  getGeminiApiKey,
  getOpenAIApiKey,
  saveGeminiApiKey,
  saveOpenAIApiKey,
} from '../services/apiKey';
import { validateOpenAIApiKey } from '../services/openai';

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

export function useApiKeySettings(setMessage: (message: string | null) => void) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('openai');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [savedOpenAiApiKey, setSavedOpenAiApiKey] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState<string | null>(null);
  const [validatingOpenAi, setValidatingOpenAi] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);

  const currentApiKey = selectedProvider === 'openai' ? openAiApiKey : geminiApiKey;
  const savedCurrentApiKey = selectedProvider === 'openai' ? savedOpenAiApiKey : savedGeminiApiKey;
  const savingCurrentKey = selectedProvider === 'openai' ? validatingOpenAi : savingGemini;

  useEffect(() => {
    Promise.all([getOpenAIApiKey(), getGeminiApiKey()])
      .then(([openAiKey, geminiKey]) => {
        setSavedOpenAiApiKey(openAiKey);
        setOpenAiApiKey(openAiKey ?? '');
        setSavedGeminiApiKey(geminiKey);
        setGeminiApiKey(geminiKey ?? '');
        if (geminiKey && !openAiKey) setSelectedProvider('google');
      })
      .catch(() => setMessage('Could not load saved settings.'));
  }, [setMessage]);

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

  return {
    currentApiKey,
    removeCurrentProviderKey,
    saveCurrentProviderKey,
    saveOpenAi,
    saveGemini,
    savedCurrentApiKey,
    savingCurrentKey,
    selectedProvider,
    setCurrentApiKey,
    setSelectedProvider,
  };
}
