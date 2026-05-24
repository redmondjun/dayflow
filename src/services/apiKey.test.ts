import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { getActiveAiApiKey } from '../services/apiKey';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const getItemAsyncMock = jest.mocked(SecureStore.getItemAsync);

describe('getActiveAiApiKey', () => {
  beforeEach(() => {
    getItemAsyncMock.mockReset();
  });

  it('prefers OpenAI when both keys exist', async () => {
    getItemAsyncMock.mockImplementation(async (key) => {
      if (key === 'dayflow.openaiApiKey') return 'sk-live';
      if (key === 'dayflow.geminiApiKey') return 'gemini-live';
      return null;
    });

    await expect(getActiveAiApiKey()).resolves.toEqual({
      provider: 'openai',
      key: 'sk-live',
    });
  });

  it('falls back to Gemini when OpenAI is missing', async () => {
    getItemAsyncMock.mockImplementation(async (key) => {
      if (key === 'dayflow.geminiApiKey') return 'gemini-live';
      return null;
    });

    await expect(getActiveAiApiKey()).resolves.toEqual({
      provider: 'google',
      key: 'gemini-live',
    });
  });

  it('returns null when no keys are saved', async () => {
    getItemAsyncMock.mockResolvedValue(null);

    await expect(getActiveAiApiKey()).resolves.toBeNull();
  });
});
