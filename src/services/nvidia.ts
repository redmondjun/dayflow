import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';
import {
  buildSchedulePrompt,
  buildWeeklyInsightPrompt,
  SCHEDULE_SYSTEM_PROMPT,
  WEEKLY_INSIGHT_SYSTEM_PROMPT,
  type ScheduleGenerationContext,
  type ScheduleTaskInput,
} from './ai/prompts';
import {
  validateGeneratedTasks,
  validateWeeklyInsight,
  type AiGeneratedTask,
  type AiWeeklyInsight,
} from './ai/validators';

export type { AiGeneratedTask, AiWeeklyInsight };

export const NVIDIA_MODEL = 'meta/llama-3.1-70b-instruct';

const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const SCHEDULE_JSON_SUFFIX =
  ' Output only a raw JSON object with no extra commentary, no markdown fences, and no chain-of-thought reasoning. The JSON must have this exact shape: {"tasks":[{"title":"...","durationMinutes":45,"startTime":"09:30"}]}. Use 24-hour HH:MM for startTime, integer for durationMinutes. No extra fields.';

const INSIGHT_JSON_SUFFIX =
  ' Output only a raw JSON object with no extra commentary, no markdown fences, and no chain-of-thought reasoning. The JSON must have this exact shape: {"patterns":[{"label":"...","text":"..."},{"label":"...","text":"..."}],"suggestions":[{"text":"...","action":"..."},{"text":"...","action":"..."}]}. No extra fields.';

export async function generateNvidiaScheduleFromText(
  apiKey: string,
  tasks: ScheduleTaskInput[],
  scheduleContext?: ScheduleGenerationContext | null,
): Promise<AiGeneratedTask[]> {
  const normalizedTasks = tasks
    .map((task) => ({
      title: task.title.trim(),
      description: task.description?.trim() || null,
      estimatedDurationMinutes: task.estimatedDurationMinutes ?? null,
    }))
    .filter((task) => task.title.length > 0);
  if (!apiKey.trim()) throw new Error('Add your NVIDIA API key in Settings first.');
  if (normalizedTasks.length === 0) throw new Error('Add at least one task first.');

  const response = await postNvidiaChatCompletions(apiKey, [
    { role: 'system', content: `${SCHEDULE_SYSTEM_PROMPT}${SCHEDULE_JSON_SUFFIX}` },
    { role: 'user', content: buildSchedulePrompt(normalizedTasks, scheduleContext) },
  ]);

  await throwIfNvidiaError(response);
  const data: unknown = await response.json();
  console.log('[NVIDIA] Raw API response data:', JSON.stringify(data).slice(0, 1000));
  const output = getNvidiaResponseText(data);
  if (!output) throw new Error('NVIDIA returned an empty schedule response.');

  const parsed = parseNvidiaJson(output);
  return validateGeneratedTasks(parsed);
}

export async function generateNvidiaWeeklyInsight(
  apiKey: string,
  tasks: Task[],
  summary: WeeklyInsightSummary,
  userProfile?: string | null,
): Promise<AiWeeklyInsight> {
  const recentTasks = tasks.slice(0, 80);
  if (!apiKey.trim()) throw new Error('Add your NVIDIA API key in Settings first.');
  if (recentTasks.length === 0) throw new Error('Complete tasks to unlock weekly AI insights.');

  const response = await postNvidiaChatCompletions(apiKey, [
    { role: 'system', content: `${WEEKLY_INSIGHT_SYSTEM_PROMPT}${INSIGHT_JSON_SUFFIX}` },
    { role: 'user', content: buildWeeklyInsightPrompt(recentTasks, summary, userProfile) },
  ]);

  await throwIfNvidiaError(response);
  const data: unknown = await response.json();
  console.log('[NVIDIA] Raw API response data:', JSON.stringify(data).slice(0, 1000));
  const output = getNvidiaResponseText(data);
  if (!output) throw new Error('NVIDIA returned an empty weekly insight response.');

  const parsed = parseNvidiaJson(output);
  return validateWeeklyInsight(parsed);
}

async function postNvidiaChatCompletions(
  apiKey: string,
  messages: { role: string; content: string }[],
): Promise<Response> {
  try {
    return await fetch(NVIDIA_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        temperature: 0,
        max_tokens: 4096,
      }),
    });
  } catch {
    throw new Error('Could not reach NVIDIA. Check your internet connection and try again.');
  }
}

async function throwIfNvidiaError(response: Response): Promise<void> {
  if (response.ok) return;

  const detail = await readNvidiaErrorDetail(response);

  if (response.status === 401 || response.status === 403) {
    throw new Error('This NVIDIA API key is invalid, expired, or not allowed.');
  }
  if (response.status === 429) {
    throw new Error('NVIDIA rate limit reached. Try again in a moment.');
  }
  if (response.status >= 500) {
    throw new Error('NVIDIA is temporarily unavailable. Try again soon.');
  }

  throw new Error(detail || `NVIDIA request failed with status ${response.status}.`);
}

async function readNvidiaErrorDetail(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = getNvidiaErrorMessage(body);
    if (message) return message;
  } catch {
    return '';
  }
  return '';
}

function getNvidiaErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  if ('error' in value) {
    const error = value.error;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
  }
  if ('message' in value && typeof value.message === 'string') {
    return value.message;
  }
  return null;
}

function getNvidiaResponseText(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    console.error('[NVIDIA] Unexpected response shape:', JSON.stringify(data));
    return null;
  }
  if (!('choices' in data)) {
    console.error('[NVIDIA] No choices in response:', JSON.stringify(data));
    return null;
  }
  if (!Array.isArray(data.choices)) return null;
  const firstChoice = data.choices[0];
  if (!firstChoice || typeof firstChoice !== 'object' || !('message' in firstChoice)) {
    console.error('[NVIDIA] No message in first choice:', JSON.stringify(firstChoice));
    return null;
  }
  const message = firstChoice.message;
  if (!message || typeof message !== 'object') {
    console.error('[NVIDIA] Invalid message:', JSON.stringify(message));
    return null;
  }

  const content = typeof message.content === 'string' ? message.content : null;
  const reasoning =
    typeof message.reasoning_content === 'string' ? message.reasoning_content : null;

  if (content && (content.startsWith('{') || content.startsWith('['))) {
    return content;
  }

  if (reasoning && (reasoning.startsWith('{') || reasoning.startsWith('['))) {
    return reasoning;
  }

  if (content) {
    const extracted = extractJsonFromText(content);
    if (extracted) return extracted;
  }
  if (reasoning) {
    const extracted = extractJsonFromText(reasoning);
    if (extracted) return extracted;
  }

  return content || reasoning || null;
}

function extractJsonFromText(raw: string): string | null {
  const text = raw.trim();

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0].trim();

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0].trim();

  return null;
}

function parseNvidiaJson(raw: string): unknown {
  const extracted = extractJsonFromText(raw);
  const text = extracted ?? raw;

  const cleaned = text.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('[NVIDIA] Failed to parse JSON.');
    console.error('[NVIDIA] Raw input:', raw);
    console.error('[NVIDIA] Extracted JSON:', extracted);
    console.error('[NVIDIA] Cleaned JSON:', cleaned);
    console.error('[NVIDIA] Parse error:', parseError);
    throw new Error('NVIDIA returned invalid JSON.');
  }
}
