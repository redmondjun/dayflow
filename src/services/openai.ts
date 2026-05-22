const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5-nano';

export type AiGeneratedTask = {
  title: string;
  durationMinutes: number;
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tasks'],
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'durationMinutes'],
        properties: {
          title: { type: 'string' },
          durationMinutes: { type: 'integer' },
        },
      },
    },
  },
};

export async function generateScheduleFromText(
  apiKey: string,
  taskTitles: string[],
  userProfile?: string | null,
): Promise<AiGeneratedTask[]> {
  const tasks = taskTitles.map((title) => title.trim()).filter(Boolean);
  if (!apiKey.trim()) throw new Error('Add your OpenAI API key in Settings first.');
  if (tasks.length === 0) throw new Error('Add at least one task first.');

  const response = await postOpenAIResponse(apiKey, {
    model: DEFAULT_MODEL,
    input: [
      {
        role: 'system',
        content:
          'You are a scheduling assistant. Convert separate user tasks into a clear sequential schedule. Estimate realistic durations in minutes. Return structured data only.',
      },
      {
        role: 'user',
        content: buildSchedulePrompt(tasks, userProfile),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'dayflow_schedule',
        strict: true,
        schema: responseSchema,
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

function buildSchedulePrompt(tasks: string[], userProfile?: string | null): string {
  const taskList = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  const profile = userProfile?.trim();

  if (!profile) return `Create a schedule from these separate tasks:\n${taskList}`;

  return `Create a personalized schedule using this user profile:\n${profile}\n\nSeparate tasks:\n${taskList}`;
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
