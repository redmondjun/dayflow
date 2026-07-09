import { useEffect, useState } from 'react';
import {
  deleteGeminiApiKey,
  deleteNvidiaApiKey,
  deleteOpenAIApiKey,
  getGeminiApiKey,
  getNvidiaApiKey,
  getOpenAIApiKey,
  getPreferredAiProvider,
  saveGeminiApiKey,
  saveNvidiaApiKey,
  saveOpenAIApiKey,
  savePreferredAiProvider,
} from '../services/apiKey';
import { validateOpenAIApiKey } from '../services/openai';

export type AiProvider = 'google' | 'openai' | 'nvidia';

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
  const [nvidiaApiKey, setNvidiaApiKey] = useState('');
  const [savedNvidiaApiKey, setSavedNvidiaApiKey] = useState<string | null>(null);
  const [validatingOpenAi, setValidatingOpenAi] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [savingNvidia, setSavingNvidia] = useState(false);

  const providerApiKeys = { openai: openAiApiKey, google: geminiApiKey, nvidia: nvidiaApiKey };
  const providerSavedKeys = {
    openai: savedOpenAiApiKey,
    google: savedGeminiApiKey,
    nvidia: savedNvidiaApiKey,
  };
  const providerLoading = { openai: validatingOpenAi, google: savingGemini, nvidia: savingNvidia };

  const currentApiKey = providerApiKeys[selectedProvider];
  const savedCurrentApiKey = providerSavedKeys[selectedProvider];
  const savingCurrentKey = providerLoading[selectedProvider];

  useEffect(() => {
    Promise.all([getOpenAIApiKey(), getGeminiApiKey(), getNvidiaApiKey(), getPreferredAiProvider()])
      .then(([openAiKey, geminiKey, nvidiaKey, preferredProvider]) => {
        setSavedOpenAiApiKey(openAiKey);
        setOpenAiApiKey(openAiKey ?? '');
        setSavedGeminiApiKey(geminiKey);
        setGeminiApiKey(geminiKey ?? '');
        setSavedNvidiaApiKey(nvidiaKey);
        setNvidiaApiKey(nvidiaKey ?? '');

        if (preferredProvider) {
          setSelectedProvider(preferredProvider);
        } else if (geminiKey && !openAiKey && !nvidiaKey) {
          setSelectedProvider('google');
        } else if (nvidiaKey && !openAiKey && !geminiKey) {
          setSelectedProvider('nvidia');
        }
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

  const saveNvidia = async () => {
    await saveKey({
      value: nvidiaApiKey,
      setLoading: setSavingNvidia,
      saveKey: saveNvidiaApiKey,
      setSavedKey: setSavedNvidiaApiKey,
      setValue: setNvidiaApiKey,
      successMessage: 'NVIDIA API key saved.',
      removeMessage: 'NVIDIA API key removed.',
      errorMessage: 'Could not save NVIDIA API key.',
    });
  };

  const providerSavers = {
    openai: saveOpenAi,
    google: saveGemini,
    nvidia: saveNvidia,
  };
  const saveCurrentProviderKey = () => providerSavers[selectedProvider]();

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

  const removeNvidia = async () => {
    await removeKey({
      setLoading: setSavingNvidia,
      deleteKey: deleteNvidiaApiKey,
      setSavedKey: setSavedNvidiaApiKey,
      setValue: setNvidiaApiKey,
      successMessage: 'NVIDIA API key removed.',
      errorMessage: 'Could not remove NVIDIA API key.',
    });
  };

  const providerRemovers = {
    openai: removeOpenAi,
    google: removeGemini,
    nvidia: removeNvidia,
  };
  const removeCurrentProviderKey = () => providerRemovers[selectedProvider]();

  const setCurrentApiKey = (value: string) => {
    const setters = { openai: setOpenAiApiKey, google: setGeminiApiKey, nvidia: setNvidiaApiKey };
    setters[selectedProvider](value);
  };

  const handleSetSelectedProvider = (provider: AiProvider) => {
    setSelectedProvider(provider);
    savePreferredAiProvider(provider);
  };

  return {
    currentApiKey,
    removeCurrentProviderKey,
    saveCurrentProviderKey,
    saveOpenAi,
    saveGemini,
    saveNvidia,
    savedCurrentApiKey,
    savingCurrentKey,
    selectedProvider,
    setCurrentApiKey,
    setSelectedProvider: handleSetSelectedProvider,
  };
}
