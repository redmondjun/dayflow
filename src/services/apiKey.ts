import * as SecureStore from 'expo-secure-store';

const OPENAI_API_KEY = 'dayflow.openaiApiKey';
const GEMINI_API_KEY = 'dayflow.geminiApiKey';
const AI_FEATURES_ENABLED = 'dayflow.aiFeaturesEnabled';
const AI_SUGGESTION_ENABLED = 'dayflow.aiSuggestionEnabled';

type AiSettingsListener = () => void;

const aiSettingsListeners = new Set<AiSettingsListener>();

function notifyAiSettingsChanged(): void {
  aiSettingsListeners.forEach((listener) => listener());
}

export function subscribeAiSettingsChanges(listener: AiSettingsListener): () => void {
  aiSettingsListeners.add(listener);
  return () => {
    aiSettingsListeners.delete(listener);
  };
}

async function getStoredValue(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

async function saveStoredValue(key: string, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, trimmed);
}

async function deleteStoredValue(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function getOpenAIApiKey(): Promise<string | null> {
  return getStoredValue(OPENAI_API_KEY);
}

export async function saveOpenAIApiKey(value: string): Promise<void> {
  await saveStoredValue(OPENAI_API_KEY, value);
  notifyAiSettingsChanged();
}

export async function deleteOpenAIApiKey(): Promise<void> {
  await deleteStoredValue(OPENAI_API_KEY);
  notifyAiSettingsChanged();
}

export async function getGeminiApiKey(): Promise<string | null> {
  return getStoredValue(GEMINI_API_KEY);
}

export async function saveGeminiApiKey(value: string): Promise<void> {
  await saveStoredValue(GEMINI_API_KEY, value);
  notifyAiSettingsChanged();
}

export async function deleteGeminiApiKey(): Promise<void> {
  await deleteStoredValue(GEMINI_API_KEY);
  notifyAiSettingsChanged();
}

export async function getAiFeaturesEnabled(): Promise<boolean> {
  const value = await getStoredValue(AI_FEATURES_ENABLED);
  return value !== 'false';
}

export async function saveAiFeaturesEnabled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(AI_FEATURES_ENABLED, value ? 'true' : 'false');
  notifyAiSettingsChanged();
}

export async function getAiSuggestionEnabled(): Promise<boolean> {
  const value = await getStoredValue(AI_SUGGESTION_ENABLED);
  return value !== 'false';
}

export async function saveAiSuggestionEnabled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(AI_SUGGESTION_ENABLED, value ? 'true' : 'false');
  notifyAiSettingsChanged();
}

export type ActiveAiProvider = 'openai' | 'google';

export async function getActiveAiApiKey(): Promise<{
  provider: ActiveAiProvider;
  key: string;
} | null> {
  const [openAiKey, geminiKey] = await Promise.all([getOpenAIApiKey(), getGeminiApiKey()]);
  if (openAiKey) return { provider: 'openai', key: openAiKey };
  if (geminiKey) return { provider: 'google', key: geminiKey };
  return null;
}
