import * as SecureStore from 'expo-secure-store';

const OPENAI_API_KEY = 'dayflow.openaiApiKey';
const GEMINI_API_KEY = 'dayflow.geminiApiKey';
const AI_FEATURES_ENABLED = 'dayflow.aiFeaturesEnabled';

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
}

export async function deleteOpenAIApiKey(): Promise<void> {
  await deleteStoredValue(OPENAI_API_KEY);
}

export async function getGeminiApiKey(): Promise<string | null> {
  return getStoredValue(GEMINI_API_KEY);
}

export async function saveGeminiApiKey(value: string): Promise<void> {
  await saveStoredValue(GEMINI_API_KEY, value);
}

export async function deleteGeminiApiKey(): Promise<void> {
  await deleteStoredValue(GEMINI_API_KEY);
}

export async function getAiFeaturesEnabled(): Promise<boolean> {
  const value = await getStoredValue(AI_FEATURES_ENABLED);
  return value !== 'false';
}

export async function saveAiFeaturesEnabled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(AI_FEATURES_ENABLED, value ? 'true' : 'false');
}
