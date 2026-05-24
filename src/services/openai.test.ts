import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { generateScheduleFromText, generateWeeklyInsight, validateOpenAIApiKey } from './openai';
import type { ScheduleGenerationContext } from './ai/prompts';
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

const scheduleContext: ScheduleGenerationContext = {
  planningDayLabel: 'Today, May 23',
  earliestStart: '07:00',
  focusWindow: { start: '17:00', end: '21:00', label: 'Evening' },
  freeTimeBudget: { minMinutes: 60, maxMinutes: 120, label: '1-2 hours' },
  userProfile: '- Wake-up time: 7:00 AM\n- Focus best: Evening',
};

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
            tasks: [{ title: 'Study React', durationMinutes: 45, startTime: '09:00' }],
          }),
        },
      }),
    );

    await generateScheduleFromText('  sk-live  ', [' Study React ', 'Gym']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(typeof request?.body).toBe('string');
    const body = JSON.parse(String(request?.body));
    expect(body.input[1].content).toContain('- Study React');
    expect(body.input[1].content).toContain('- Gym');
    expect(body.input[1].content).toContain('ignore input order');
  });

  it('includes scheduling context when generating a schedule', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          output_text: JSON.stringify({
            tasks: [{ title: 'Study React', durationMinutes: 45, startTime: '18:00' }],
          }),
        },
      }),
    );

    await generateScheduleFromText('sk-live', ['Study React'], scheduleContext);

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(request?.body));
    expect(body.input[1].content).toContain(
      'Focus window (place demanding/deep work here): Evening: 17:00–21:00',
    );
    expect(body.input[1].content).toContain('Free time budget: 1-2 hours');
    expect(body.input[1].content).toContain('- Wake-up time: 7:00 AM');
    expect(body.input[1].content).toContain('- Study React');
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

  it('sends task history and profile context when generating weekly insights', async () => {
    fetchMock.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        jsonValue: {
          output_text: JSON.stringify({
            patterns: [{ label: 'Morning', text: 'Morning tasks finish more often.' }],
            suggestions: [{ text: 'Protect 10 AM for deep work.', action: 'Apply' }],
          }),
        },
      }),
    );

    const insight = await generateWeeklyInsight(
      'sk-live',
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

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(request?.body));
    expect(body.input[1].content).toContain('- Wake-up time: 7:00 AM');
    expect(body.input[1].content).toContain('Deep work');
    expect(body.text.format.name).toBe('dayflow_weekly_insight');
  });

  it('does not generate weekly insights without task history', async () => {
    await expect(generateWeeklyInsight('sk-live', [], weeklySummary)).rejects.toThrow(
      'Complete tasks to unlock weekly AI insights.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
