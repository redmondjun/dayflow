import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';
import {
  buildSchedulePrompt,
  buildWeeklyInsightPrompt,
  geminiScheduleSchema,
  geminiWeeklyInsightSchema,
} from './ai/prompts';
import {
  validateGeneratedTasks,
  validateWeeklyInsight,
  type AiGeneratedTask,
  type AiWeeklyInsight,
} from './ai/validators';

export type { AiGeneratedTask, AiWeeklyInsight };

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateGeminiScheduleFromText(
  apiKey: string,
  taskTitles: string[],
  userProfile?: string | null,
): Promise<AiGeneratedTask[]> {
  const tasks = taskTitles.map((title) => title.trim()).filter(Boolean);
  if (!apiKey.trim()) throw new Error('Add your Gemini API key in Settings first.');
  if (tasks.length === 0) throw new Error('Add at least one task first.');

  const response = await postGeminiGenerateContent(apiKey, {
    systemInstruction: {
      parts: [
        {
          text: 'You are a scheduling assistant. Convert separate user tasks into a clear sequential schedule. Estimate realistic durations in minutes. Return JSON only.',
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildSchedulePrompt(tasks, userProfile) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: geminiScheduleSchema,
    },
  });

  await throwIfGeminiError(response);
  const data: unknown = await response.json();
  const output = getGeminiResponseText(data);
  if (!output) throw new Error('Gemini returned an empty schedule response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Gemini returned invalid JSON.');
  }

  return validateGeneratedTasks(parsed);
}

export async function generateGeminiWeeklyInsight(
  apiKey: string,
  tasks: Task[],
  summary: WeeklyInsightSummary,
  userProfile?: string | null,
): Promise<AiWeeklyInsight> {
  const recentTasks = tasks.slice(0, 80);
  if (!apiKey.trim()) throw new Error('Add your Gemini API key in Settings first.');
  if (recentTasks.length === 0) throw new Error('Complete tasks to unlock weekly AI insights.');

  const response = await postGeminiGenerateContent(apiKey, {
    systemInstruction: {
      parts: [
        {
          text: 'You are a productivity coach. Analyze weekly task history and return concise patterns and actionable suggestions. Return JSON only.',
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildWeeklyInsightPrompt(recentTasks, summary, userProfile) }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: geminiWeeklyInsightSchema,
    },
  });

  await throwIfGeminiError(response);
  const data: unknown = await response.json();
  const output = getGeminiResponseText(data);
  if (!output) throw new Error('Gemini returned an empty weekly insight response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Gemini returned invalid JSON.');
  }

  return validateWeeklyInsight(parsed);
}

async function postGeminiGenerateContent(apiKey: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${GEMINI_GENERATE_CONTENT_URL}?key=${encodeURIComponent(apiKey.trim())}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach Gemini. Check your internet connection and try again.');
  }
}

async function throwIfGeminiError(response: Response): Promise<void> {
  if (response.ok) return;

  const detail = await readGeminiErrorDetail(response);

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new Error('This Gemini API key is invalid, expired, or not allowed.');
  }
  if (response.status === 429) {
    throw new Error('Gemini rate limit reached. Try again in a moment.');
  }
  if (response.status >= 500) {
    throw new Error('Gemini is temporarily unavailable. Try again soon.');
  }

  throw new Error(detail || `Gemini request failed with status ${response.status}.`);
}

async function readGeminiErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = getGeminiErrorMessage(body);
    if (message) return message;
  } catch {
    return '';
  }

  return '';
}

function getGeminiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('error' in value)) return null;
  const error = value.error;
  if (!error || typeof error !== 'object' || !('message' in error)) return null;
  return typeof error.message === 'string' ? error.message : null;
}

function getGeminiResponseText(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('candidates' in data)) return null;
  if (!Array.isArray(data.candidates)) return null;
  const firstCandidate = data.candidates[0];
  if (!firstCandidate || typeof firstCandidate !== 'object' || !('content' in firstCandidate)) {
    return null;
  }
  const content = firstCandidate.content;
  if (!content || typeof content !== 'object' || !('parts' in content)) return null;
  if (!Array.isArray(content.parts)) return null;

  const parts: unknown[] = content.parts;
  const texts = parts
    .map((part) => {
      if (!part || typeof part !== 'object' || !('text' in part)) return null;
      return typeof part.text === 'string' ? part.text : null;
    })
    .filter((text: string | null): text is string => Boolean(text));

  return texts.join('\n') || null;
}
