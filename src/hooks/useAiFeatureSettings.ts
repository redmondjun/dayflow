import { useEffect, useState } from 'react';
import {
  getAiFeaturesEnabled,
  getAiSuggestionEnabled,
  saveAiFeaturesEnabled,
  saveAiSuggestionEnabled,
} from '../services/apiKey';

export function useAiFeatureSettings(setMessage: (message: string | null) => void) {
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [aiSuggestionEnabled, setAiSuggestionEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    Promise.all([getAiFeaturesEnabled(), getAiSuggestionEnabled()])
      .then(([aiEnabled, aiSuggestion]) => {
        setAiFeaturesEnabled(aiEnabled);
        setAiSuggestionEnabled(aiSuggestion);
      })
      .catch(() => setMessage('Could not load saved settings.'));
  }, [setMessage]);

  const saveAllSettings = async (saveCurrentKey?: () => Promise<void>, hasCurrentKey?: boolean) => {
    setSavingSettings(true);
    setMessage(null);
    try {
      await Promise.all([
        saveAiFeaturesEnabled(aiFeaturesEnabled),
        saveAiSuggestionEnabled(aiSuggestionEnabled),
      ]);
      if (hasCurrentKey && saveCurrentKey) {
        await saveCurrentKey();
      } else {
        setMessage('Settings saved.');
      }
    } catch {
      setMessage('Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return {
    aiFeaturesEnabled,
    aiSuggestionEnabled,
    savingSettings,
    setAiFeaturesEnabled,
    setAiSuggestionEnabled,
    saveAllSettings,
  };
}
