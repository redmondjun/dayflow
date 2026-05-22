import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { generateScheduleFromText, validateOpenAIApiKey } from './openai';

type MockResponseOptions = {
  ok: boolean;
  status: number;
  jsonValue?: unknown;
};

function createMockResponse({ ok, status, jsonValue }: MockResponseOptions): Response {
  return {
    ok,
    status,
    json: async () => jsonValue,
  } as unknown as Response;
}

describe('openai service', () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('rejects an empty API key during validation', async () => {
    await expect(validateOpenAIApiKey('   ')).rejects.toThrow('Enter an OpenAI API key first.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an empty task list', async () => {
    await expect(generateScheduleFromText('sk-live', ['   '])).rejects.toThrow(
      'Add at least one task first.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends numbered tasks when generating a schedule', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          output_text: JSON.stringify({
            tasks: [{ title: 'Study React', durationMinutes: 45 }],
          }),
        },
      }),
    );

    await generateScheduleFromText('  sk-live  ', [' Study React ', 'Gym']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(typeof request?.body).toBe('string');
    const body = JSON.parse(String(request?.body));
    expect(body.input[1].content).toContain('1. Study React');
    expect(body.input[1].content).toContain('2. Gym');
  });

  it('includes onboarding profile context when generating a schedule', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          output_text: JSON.stringify({
            tasks: [{ title: 'Study React', durationMinutes: 45 }],
          }),
        },
      }),
    );

    await generateScheduleFromText('sk-live', ['Study React'], '- Wake-up time: 7:00 AM');

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(request?.body));
    expect(body.input[1].content).toContain('Create a personalized schedule');
    expect(body.input[1].content).toContain('- Wake-up time: 7:00 AM');
    expect(body.input[1].content).toContain('1. Study React');
  });

  it('maps 401 to the invalid key message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 401,
        jsonValue: { error: { message: 'Incorrect API key provided.' } },
      }),
    );

    await expect(validateOpenAIApiKey('sk-live')).rejects.toThrow(
      'This API key is invalid, expired, or revoked.',
    );
  });

  it('maps 429 quota errors to the billing message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 429,
        jsonValue: { error: { message: 'You exceeded your current quota.' } },
      }),
    );

    await expect(validateOpenAIApiKey('sk-live')).rejects.toThrow(
      'Quota or billing issue. Check your OpenAI billing settings.',
    );
  });

  it('maps 429 non-quota errors to the rate-limit message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 429,
        jsonValue: { error: { message: 'Too many requests.' } },
      }),
    );

    await expect(validateOpenAIApiKey('sk-live')).rejects.toThrow(
      'OpenAI rate limit reached. Try again in a moment.',
    );
  });

  it('maps network failures to the connectivity message', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(validateOpenAIApiKey('sk-live')).rejects.toThrow(
      'Could not reach OpenAI. Check your internet connection and try again.',
    );
  });

  it('maps 5xx responses to the temporary failure message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 503,
        jsonValue: { error: { message: 'upstream unavailable' } },
      }),
    );

    await expect(validateOpenAIApiKey('sk-live')).rejects.toThrow(
      'OpenAI is temporarily unavailable. Try again soon.',
    );
  });

  it('rejects malformed JSON responses', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: { output_text: '{not valid json' },
      }),
    );

    await expect(generateScheduleFromText('sk-live', ['Study React'])).rejects.toThrow(
      'OpenAI returned invalid JSON.',
    );
  });

  it('rejects empty AI responses', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {},
      }),
    );

    await expect(generateScheduleFromText('sk-live', ['Study React'])).rejects.toThrow(
      'OpenAI returned an empty schedule response.',
    );
  });

  it('rejects responses without tasks', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          output_text: JSON.stringify({ notTasks: [] }),
        },
      }),
    );

    await expect(generateScheduleFromText('sk-live', ['Study React'])).rejects.toThrow(
      'AI response did not include tasks.',
    );
  });
});
