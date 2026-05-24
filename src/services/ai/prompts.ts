import type { WeeklyInsightSummary } from '../../types/insight';
import type { Task } from '../../types/task';

export function buildSchedulePrompt(tasks: string[], userProfile?: string | null): string {
  const taskList = tasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  const profile = userProfile?.trim();

  if (!profile) return `Create a schedule from these separate tasks:\n${taskList}`;

  return `Create a personalized schedule using this user profile:\n${profile}\n\nSeparate tasks:\n${taskList}`;
}

export function buildWeeklyInsightPrompt(
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

export const openAiScheduleSchema = {
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

export const openAiWeeklyInsightSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['patterns', 'suggestions'],
  properties: {
    patterns: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
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
        additionalProperties: false,
        required: ['text', 'action'],
        properties: {
          text: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
  },
};

export const geminiScheduleSchema = {
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

export const geminiWeeklyInsightSchema = {
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
