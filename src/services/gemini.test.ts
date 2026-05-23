import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  generateGeminiScheduleFromText,
  generateGeminiWeeklyInsight,
  validateGeminiApiKey,
} from './gemini';
import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';

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

const weeklySummary: WeeklyInsightSummary = {
  dateRange: 'Apr 21 - Apr 28',
  headline: 'You are most productive in the morning',
  basedOn: 'Based on your last 7 days',
  completionPercent: 76,
  skippedPercent: 24,
  peakHourLabel: '10 AM',
  timeChart: [
    { label: '8', value: 1 },
    { label: '10', value: 4 },
  ],
  patterns: [],
  suggestions: [],
  reflection: 'Your schedule is improving compared to last week.',
};

const weeklyTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Deep work',
    startTime: new Date(2026, 3, 28, 10, 0).toISOString(),
    endTime: new Date(2026, 3, 28, 11, 0).toISOString(),
    status: 'completed',
    aiGenerated: false,
    createdAt: new Date(2026, 3, 28, 9, 0).toISOString(),
    updatedAt: new Date(2026, 3, 28, 11, 0).toISOString(),
  },
];

describe('gemini service', () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it('sends task history and profile context when generating weekly insights', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      patterns: [{ label: 'Morning', text: 'Morning tasks finish more often.' }],
                      suggestions: [{ text: 'Protect 10 AM for deep work.', action: 'Apply' }],
                    }),
                  },
                ],
              },
            },
          ],
        },
      }),
    );

    const insight = await generateGeminiWeeklyInsight(
      'gemini-live',
      weeklyTasks,
      weeklySummary,
      '- Wake-up time: 7:00 AM',
    );

    expect(insight.patterns[0]).toEqual({
      label: 'Morning',
      text: 'Morning tasks finish more often.',
    });
    expect(insight.suggestions[0]).toEqual({
      text: 'Protect 10 AM for deep work.',
      action: 'Apply',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('models/gemini-2.5-flash:generateContent');
    expect(String(url)).toContain('key=gemini-live');
    const body = JSON.parse(String((request as RequestInit | undefined)?.body));
    expect(body.contents[0].parts[0].text).toContain('- Wake-up time: 7:00 AM');
    expect(body.contents[0].parts[0].text).toContain('Deep work');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.required).toEqual(['patterns', 'suggestions']);
  });

  it('validates a Gemini API key with a lightweight request', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        },
      }),
    );

    await validateGeminiApiKey('  gemini-live  ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('key=gemini-live');
    const body = JSON.parse(String((request as RequestInit | undefined)?.body));
    expect(body.contents[0].parts[0].text).toBe('Reply with OK.');
  });

  it('rejects an empty Gemini API key during validation', async () => {
    await expect(validateGeminiApiKey('   ')).rejects.toThrow('Enter a Gemini API key first.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends numbered tasks when generating a schedule', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      tasks: [{ title: 'Study React', durationMinutes: 45 }],
                    }),
                  },
                ],
              },
            },
          ],
        },
      }),
    );

    const tasks = await generateGeminiScheduleFromText(
      'gemini-live',
      [' Study React ', 'Gym'],
      '- Wake-up time: 7:00 AM',
    );

    expect(tasks).toEqual([{ title: 'Study React', durationMinutes: 45 }]);
    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String((request as RequestInit | undefined)?.body));
    expect(body.contents[0].parts[0].text).toContain('- Wake-up time: 7:00 AM');
    expect(body.contents[0].parts[0].text).toContain('1. Study React');
    expect(body.contents[0].parts[0].text).toContain('2. Gym');
    expect(body.generationConfig.responseSchema.required).toEqual(['tasks']);
  });

  it('does not generate weekly insights without task history', async () => {
    await expect(generateGeminiWeeklyInsight('gemini-live', [], weeklySummary)).rejects.toThrow(
      'Complete tasks to unlock weekly AI insights.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps invalid key errors to the Gemini key message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 403,
        jsonValue: { error: { message: 'API key not valid.' } },
      }),
    );

    await expect(
      generateGeminiWeeklyInsight('bad-key', weeklyTasks, weeklySummary),
    ).rejects.toThrow('This Gemini API key is invalid, expired, or not allowed.');
  });

  it('maps invalid key errors during Gemini validation', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 403,
        jsonValue: { error: { message: 'API key not valid.' } },
      }),
    );

    await expect(validateGeminiApiKey('bad-key')).rejects.toThrow(
      'This Gemini API key is invalid, expired, or not allowed.',
    );
  });

  it('maps Gemini quota errors to the billing message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 429,
        jsonValue: { error: { message: 'You exceeded your current quota.' } },
      }),
    );

    await expect(validateGeminiApiKey('gemini-live')).rejects.toThrow(
      'Quota or billing issue. Check your Gemini billing settings.',
    );
  });

  it('maps Gemini non-quota 429 errors to the rate-limit message', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: false,
        status: 429,
        jsonValue: { error: { message: 'Too many requests.' } },
      }),
    );

    await expect(validateGeminiApiKey('gemini-live')).rejects.toThrow(
      'Gemini rate limit reached. Try again in a moment.',
    );
  });

  it('rejects malformed JSON responses', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          candidates: [{ content: { parts: [{ text: '{not valid json' }] } }],
        },
      }),
    );

    await expect(
      generateGeminiWeeklyInsight('gemini-live', weeklyTasks, weeklySummary),
    ).rejects.toThrow('Gemini returned invalid JSON.');
  });
});
