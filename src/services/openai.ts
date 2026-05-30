import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';
import {
  buildSchedulePrompt,
  buildWeeklyInsightPrompt,
  openAiScheduleSchema,
  openAiWeeklyInsightSchema,
  type ScheduleGenerationContext,
} from './ai/prompts';
import {
  validateGeneratedTasks,
  validateWeeklyInsight,
  type AiGeneratedTask,
  type AiWeeklyInsight,
} from './ai/validators';

export type { AiGeneratedTask, AiWeeklyInsight };

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5-nano';

const SCHEDULE_SYSTEM_PROMPT =
  'You are a scheduling assistant. Build a realistic daily schedule with logical start times and durations for each task. Use the user profile windows and constraints. Return structured data only.';

export async function generateScheduleFromText(
  apiKey: string,
  taskTitles: string[],
  scheduleContext?: ScheduleGenerationContext | null,
): Promise<AiGeneratedTask[]> {
  const tasks = taskTitles.map((title) => title.trim()).filter(Boolean);
  if (!apiKey.trim()) throw new Error('Add your OpenAI API key in Settings first.');
  if (tasks.length === 0) throw new Error('Add at least one task first.');

  const response = await postOpenAIResponse(apiKey, {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'system',
        content: SCHEDULE_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: buildSchedulePrompt(tasks, scheduleContext),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dayflow_schedule',
        strict: true,
        schema: openAiScheduleSchema,
      },
    },
  });

  await throwIfOpenAIError(response);
  const data: unknown = await response.json();
  const output = getResponseText(data);
  if (!output) throw new Error('OpenAI returned an empty schedule response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('OpenAI returned invalid JSON.');
  }

  return validateGeneratedTasks(parsed);
}

export async function generateWeeklyInsight(
  apiKey: string,
  tasks: Task[],
  summary: WeeklyInsightSummary,
  userProfile?: string | null,
): Promise<AiWeeklyInsight> {
  const recentTasks = tasks.slice(0, 80);
  if (!apiKey.trim()) throw new Error('Add your OpenAI API key in Settings first.');
  if (recentTasks.length === 0) throw new Error('Complete tasks to unlock weekly AI insights.');

  const response = await postOpenAIResponse(apiKey, {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'system',
        content:
          'You are a productivity coach. Analyze weekly task history and return concise patterns and actionable suggestions. Return structured data only.',
      },
      {
        role: 'user',
        content: buildWeeklyInsightPrompt(recentTasks, summary, userProfile),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dayflow_weekly_insight',
        strict: true,
        schema: openAiWeeklyInsightSchema,
      },
    },
  });

  await throwIfOpenAIError(response);
  const data: unknown = await response.json();
  const output = getResponseText(data);
  if (!output) throw new Error('OpenAI returned an empty weekly insight response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('OpenAI returned invalid JSON.');
  }

  return validateWeeklyInsight(parsed);
}

export async function validateOpenAIApiKey(apiKey: string): Promise<void> {
  if (!apiKey.trim()) throw new Error('Enter an OpenAI API key first.');

  const response = await postOpenAIResponse(apiKey, {
    model: DEFAULT_MODEL,
    input: 'Reply with OK.',
  });

  await throwIfOpenAIError(response);
}

async function postOpenAIResponse(apiKey: string, body: unknown): Promise<Response> {
  try {
    return await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach OpenAI. Check your internet connection and try again.');
  }
}

async function throwIfOpenAIError(response: Response): Promise<void> {
  if (response.ok) return;

  const detail = await readOpenAIErrorDetail(response);

  if (response.status === 401) {
    throw new Error('This API key is invalid, expired, or revoked.');
  }
  if (response.status === 429) {
    throw new Error(
      detail.toLowerCase().includes('quota')
        ? 'Quota or billing issue. Check your OpenAI billing settings.'
        : 'OpenAI rate limit reached. Try again in a moment.',
    );
  }
  if (response.status >= 500) {
    throw new Error('OpenAI is temporarily unavailable. Try again soon.');
  }

  throw new Error(detail || `OpenAI request failed with status ${response.status}.`);
}

async function readOpenAIErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = getOpenAIErrorMessage(body);
    if (message) return message;
  } catch {
    return '';
  }

  return '';
}

function getOpenAIErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('error' in value)) return null;
  const error = value.error;
  if (!error || typeof error !== 'object' || !('message' in error)) return null;
  return typeof error.message === 'string' ? error.message : null;
}

function getResponseText(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  if ('output_text' in data && typeof data.output_text === 'string') return data.output_text;
  if (!('output' in data) || !Array.isArray(data.output)) return null;

  const texts = data.output.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) {
      return [];
    }

    const contents: unknown[] = item.content;
    return contents.map(getContentText).filter((text): text is string => Boolean(text));
  });

  return texts?.join('\n') || null;
}

function getContentText(content: unknown): string | null {
  if (!content || typeof content !== 'object' || !('text' in content)) return null;
  return typeof content.text === 'string' ? content.text : null;
}
