import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import {
  clearDayCompleteDismissedDate,
  getDayCompleteDismissedDate,
  saveDayCompleteDismissedDate,
} from './dayCompleteDismissal';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('dayCompleteDismissal service', () => {
  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    jest.mocked(SecureStore.setItemAsync).mockReset();
    jest.mocked(SecureStore.deleteItemAsync).mockReset();
  });

  it('saves and reads the dismissed day key', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('2026-05-23');

    await saveDayCompleteDismissedDate('2026-05-23');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'dayflow.dayCompleteDismissedDate',
      '2026-05-23',
    );
    await expect(getDayCompleteDismissedDate()).resolves.toBe('2026-05-23');
  });

  it('clears the dismissed day key', async () => {
    await clearDayCompleteDismissedDate();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('dayflow.dayCompleteDismissedDate');
  });
});
