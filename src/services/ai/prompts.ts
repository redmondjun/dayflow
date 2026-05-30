import type { WeeklyInsightSummary } from '../../types/insight';
import type { Task } from '../../types/task';
import type { ScheduleGenerationContext } from '../../features/taskPlanning/profileScheduling';

function formatTimeWindow(window: { start: string; end: string; label: string }): string {
  return `${window.label}: ${window.start}–${window.end}`;
}

export function buildSchedulePrompt(
  tasks: string[],
  scheduleContext?: ScheduleGenerationContext | null,
): string {
  const taskList = tasks.map((task) => `- ${task}`).join('\n');
  const context = scheduleContext ?? null;

  const lines = [
    'Create a realistic daily schedule for the tasks below.',
    'The user may have listed tasks in random order — ignore input order.',
    'Assign each task a logical start time and realistic duration.',
    '',
    `Planning day: ${context?.planningDayLabel ?? 'Today'}`,
    `Earliest allowed start: ${context?.earliestStart ?? '09:00'}`,
  ];

  if (context?.latestEnd) {
    lines.push(`Latest meaningful activity end: ${context.latestEnd}`);
  }
  if (context?.focusWindow) {
    lines.push(
      `Focus window (place demanding/deep work here): ${formatTimeWindow(context.focusWindow)}`,
    );
  }
  if (context?.commitmentWindows?.length) {
    lines.push(
      'Blocked commitment windows (do not schedule discretionary tasks here):',
      ...context.commitmentWindows.map((window) => `- ${formatTimeWindow(window)}`),
    );
  }
  if (context?.freeTimeBudget) {
    lines.push(
      `Free time budget: ${context.freeTimeBudget.label} (${context.freeTimeBudget.minMinutes}–${context.freeTimeBudget.maxMinutes} total minutes for discretionary tasks)`,
      'Keep the sum of discretionary task durations within this budget.',
    );
  }
  if (context?.scheduleGoal) {
    lines.push(`Schedule goal: ${context.scheduleGoal}`);
  }

  lines.push(
    '',
    'Rules:',
    '- Reorder tasks into a realistic day; do not preserve input order.',
    '- Do not stack all tasks back-to-back from wake time — spread across the day.',
    '- Place breakfast in the morning, lunch midday (~11:30–13:30), dinner in the evening (~17:30–21:00).',
    '- Place sleep/bedtime routines late evening, before bedtime when provided.',
    '- Use 24-hour HH:MM times in 5-minute steps; no overlapping tasks.',
    '- Return tasks sorted by startTime ascending.',
    '',
    'Tasks (order does not matter):',
    taskList,
  );

  if (context?.userProfile?.trim()) {
    lines.push('', 'User profile:', context.userProfile.trim());
  }

  return lines.join('\n');
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
        required: ['title', 'durationMinutes', 'startTime'],
        properties: {
          title: { type: 'string' },
          durationMinutes: { type: 'integer' },
          startTime: { type: 'string' },
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
        required: ['title', 'durationMinutes', 'startTime'],
        properties: {
          title: { type: 'string' },
          durationMinutes: { type: 'integer' },
          startTime: { type: 'string' },
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

export type { ScheduleGenerationContext };
