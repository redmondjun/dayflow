import { useAiFeatureSettings } from './useAiFeatureSettings';
import { useApiKeySettings } from './useApiKeySettings';
import { useDemoDevTools } from './useDemoDevTools';
import { useSnackbarMessage } from './useSnackbarMessage';

export type { AiProvider } from './useApiKeySettings';

export function useSettingsState() {
  const { message, setMessage } = useSnackbarMessage();
  const apiKeys = useApiKeySettings(setMessage);
  const aiFeatures = useAiFeatureSettings(setMessage);
  const devTools = useDemoDevTools(setMessage);

  return {
    ...apiKeys,
    ...aiFeatures,
    ...devTools,
    message,
    setMessage,
  };
}
