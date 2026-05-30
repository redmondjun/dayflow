import { useCallback, useEffect, useState } from 'react';
import {
  getAiFeaturesEnabled,
  getAiSuggestionEnabled,
  saveAiFeaturesEnabled,
  saveAiSuggestionEnabled,
} from '../services/apiKey';

export function useAiFeatureSettings(setMessage: (message: string | null) => void) {
  const [aiFeaturesEnabled, setAiFeaturesEnabledState] = useState(true);
  const [aiSuggestionEnabled, setAiSuggestionEnabledState] = useState(true);

  useEffect(() => {
    Promise.all([getAiFeaturesEnabled(), getAiSuggestionEnabled()])
      .then(([aiEnabled, aiSuggestion]) => {
        setAiFeaturesEnabledState(aiEnabled);
        setAiSuggestionEnabledState(aiSuggestion);
      })
      .catch(() => setMessage('Could not load saved settings.'));
  }, [setMessage]);

  const setAiFeaturesEnabled = useCallback(
    async (value: boolean) => {
      setAiFeaturesEnabledState(value);
      try {
        await saveAiFeaturesEnabled(value);
      } catch {
        setMessage('Could not save settings.');
      }
    },
    [setMessage],
  );

  const setAiSuggestionEnabled = useCallback(
    async (value: boolean) => {
      setAiSuggestionEnabledState(value);
      try {
        await saveAiSuggestionEnabled(value);
      } catch {
        setMessage('Could not save settings.');
      }
    },
    [setMessage],
  );

  return {
    aiFeaturesEnabled,
    aiSuggestionEnabled,
    setAiFeaturesEnabled,
    setAiSuggestionEnabled,
  };
}
