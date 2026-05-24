import * as SecureStore from 'expo-secure-store';

const DAY_COMPLETE_DISMISSED_KEY = 'dayflow.dayCompleteDismissedDate';

export async function getDayCompleteDismissedDate(): Promise<string | null> {
  const value = await SecureStore.getItemAsync(DAY_COMPLETE_DISMISSED_KEY);
  return value?.trim() || null;
}

export async function saveDayCompleteDismissedDate(dayKey: string): Promise<void> {
  await SecureStore.setItemAsync(DAY_COMPLETE_DISMISSED_KEY, dayKey);
}

export async function clearDayCompleteDismissedDate(): Promise<void> {
  await SecureStore.deleteItemAsync(DAY_COMPLETE_DISMISSED_KEY);
}
