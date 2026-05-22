import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';
import type { AiGeneratedTask, AiWeeklyInsight } from './openai';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const weeklyInsightSchema = {
  type: 'object',
  required: ['patterns', 'suggestions'],
  properties: {
    patterns: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['label', 'text'],
        properties: {
          label: { type: 'string' },
          text: { type: 'string' },
        },
      },
    },
    suggestions: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['text', 'action'],
        properties: {
          text: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
  },
};

const scheduleSchema = {
  type: 'object',
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'durationMinutes'],
        properties: {
          title: { type: 'string' },
          durationMinutes: { type: 'integer' },
        },
      },
    },
  },
};

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
      responseSchema: scheduleSchema,
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
      responseSchema: weeklyInsightSchema,
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

function buildSchedulePrompt(tasks: string[], userProfile?: string | null): string {
  const taskList = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  const profile = userProfile?.trim();

  if (!profile) return `Create a schedule from these separate tasks:\n${taskList}`;

  return `Create a personalized schedule using this user profile:\n${profile}\n\nSeparate tasks:\n${taskList}`;
}

function buildWeeklyInsightPrompt(
  tasks: Task[],
  summary: WeeklyInsightSummary,
  userProfile?: string | null,
): string {
  const taskLines = tasks
    .map((task, index) => {
      const start = new Date(task.startTime).toISOString();
      const end = new Date(task.endTime).toISOString();
      return `${index + 1}. ${task.title} | ${task.status} | ${start} - ${end}`;
    })
    .join('\n');
  const profile = userProfile?.trim();
  const profileBlock = profile ? `\nUser profile:\n${profile}\n` : '';

  return `Create weekly productivity insights from this data.
${profileBlock}
Summary:
- Date range: ${summary.dateRange}
- Headline: ${summary.headline}
- Completion: ${summary.completionPercent}%
- Skipped: ${summary.skippedPercent}%
- Peak hour: ${summary.peakHourLabel}

Tasks:
${taskLines}

Return exactly 1-3 patterns and 1-3 suggestions. Pattern labels should be short. Suggestion actions should be short button-like phrases.`;
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

function validateGeneratedTasks(value: unknown): AiGeneratedTask[] {
  if (!value || typeof value !== 'object' || !('tasks' in value)) {
    throw new Error('AI response did not include tasks.');
  }

  const tasks = value.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('AI response did not include any tasks.');
  }

  return tasks.map((task) => {
    if (!task || typeof task !== 'object') {
      throw new Error('AI response included an invalid task.');
    }

    if (!('title' in task) || typeof task.title !== 'string' || !task.title.trim()) {
      throw new Error('AI response included a task without a title.');
    }
    if (
      !('durationMinutes' in task) ||
      typeof task.durationMinutes !== 'number' ||
      !Number.isFinite(task.durationMinutes)
    ) {
      throw new Error('AI response included an invalid duration.');
    }

    return {
      title: task.title.trim(),
      durationMinutes: Math.round(task.durationMinutes),
    };
  });
}

function validateWeeklyInsight(value: unknown): AiWeeklyInsight {
  if (!value || typeof value !== 'object') {
    throw new Error('AI response did not include weekly insights.');
  }

  if (!('patterns' in value) || !Array.isArray(value.patterns)) {
    throw new Error('AI response did not include patterns.');
  }
  if (!('suggestions' in value) || !Array.isArray(value.suggestions)) {
    throw new Error('AI response did not include suggestions.');
  }

  const patterns = value.patterns.map((pattern) => {
    if (!pattern || typeof pattern !== 'object') {
      throw new Error('AI response included an invalid pattern.');
    }
    if (!('label' in pattern) || typeof pattern.label !== 'string' || !pattern.label.trim()) {
      throw new Error('AI response included a pattern without a label.');
    }
    if (!('text' in pattern) || typeof pattern.text !== 'string' || !pattern.text.trim()) {
      throw new Error('AI response included a pattern without text.');
    }
    return { label: pattern.label.trim(), text: pattern.text.trim() };
  });

  const suggestions = value.suggestions.map((suggestion) => {
    if (!suggestion || typeof suggestion !== 'object') {
      throw new Error('AI response included an invalid suggestion.');
    }
    if (!('text' in suggestion) || typeof suggestion.text !== 'string' || !suggestion.text.trim()) {
      throw new Error('AI response included a suggestion without text.');
    }
    if (
      !('action' in suggestion) ||
      typeof suggestion.action !== 'string' ||
      !suggestion.action.trim()
    ) {
      throw new Error('AI response included a suggestion without an action.');
    }
    return { text: suggestion.text.trim(), action: suggestion.action.trim() };
  });

  if (patterns.length === 0) throw new Error('AI response did not include any patterns.');
  if (suggestions.length === 0) throw new Error('AI response did not include any suggestions.');

  return { patterns, suggestions };
}
