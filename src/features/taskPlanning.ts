import { makeGeneratedPreviewTasks } from '../dev-preview/mockData';
import { syncManualRowTimes } from './taskPlanning/manualTime';
import type { GeneratedTaskPreview, NewTaskInput, Task, TaskInputRow } from '../types/task';
import { addMinutes, formatInputTime, parseTimeInput, sortByStartTime } from '../utils/time';
import { createId } from '../utils/id';
import type { SchedulingContext } from './taskPlanning/planningDay';
import { findNextAvailableSlot } from './taskPlanning/scheduling';

export const plannerQuickAdd = [
  'Morning walk',
  'Read 30 min',
  'Lunch break',
  'Review notes',
  'Planning',
];

export const missingApiKeyMessage = 'Add an OpenAI or Gemini API key in Settings first.';

type PreviewSeed = {
  apiKey: string | null;
  aiFeaturesEnabled: boolean;
  localError: string | null;
  initialDraftAiScheduled: boolean;
  taskRows: TaskInputRow[];
  selectedTaskId: string | null;
  previewTasks: GeneratedTaskPreview[];
};

export function sortTaskInputs(inputs: NewTaskInput[]) {
  return sortByStartTime(inputs);
}

export function getRoundedStartTime(now = new Date()): string {
  const date = new Date(now);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return formatInputTime(date);
}

export function taskRowTitle(row: Pick<TaskInputRow, 'title'>): string {
  return typeof row.title === 'string' ? row.title : '';
}

export function hasTaskRowTitle(row: Pick<TaskInputRow, 'title'>): boolean {
  return taskRowTitle(row).trim().length > 0;
}

export function serializeTaskRowsForPreview(rows: TaskInputRow[]): string {
  return JSON.stringify(
    rows.filter(hasTaskRowTitle).map((row) => ({
      title: row.title.trim(),
      startTime: row.startTime,
      endTime: row.endTime,
      aiScheduled: Boolean(row.aiScheduled),
      description: row.description?.trim() ?? null,
      durationMinutes: row.durationMinutes ?? null,
      estimatedDurationMinutes: row.estimatedDurationMinutes ?? null,
      timeInputMode: row.timeInputMode ?? 'duration',
    })),
  );
}

export function normalizeTaskInputRow(row: TaskInputRow): TaskInputRow {
  return {
    ...row,
    title: taskRowTitle(row),
  };
}

export function createTaskInputRow({
  title = '',
  startTime = getRoundedStartTime(),
  endTime,
  durationMinutes = 60,
  aiScheduled = false,
  isDraft = false,
  description = null,
  estimatedDurationMinutes = null,
  timeInputMode = 'duration',
  planningDay,
}: {
  title?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  aiScheduled?: boolean;
  isDraft?: boolean;
  description?: string | null;
  estimatedDurationMinutes?: number | null;
  timeInputMode?: 'duration' | 'end';
  planningDay?: Date;
} = {}): TaskInputRow {
  if (aiScheduled) {
    return {
      id: createId(),
      title,
      startTime: '',
      endTime: '',
      aiScheduled: true,
      isDraft,
      description,
      estimatedDurationMinutes,
    };
  }

  const day = planningDay ?? new Date();
  const synced = syncManualRowTimes(
    {
      startTime,
      endTime:
        endTime ??
        formatInputTime(
          addMinutes(parseTimeInput(startTime, day) ?? new Date().toISOString(), durationMinutes),
        ),
      durationMinutes,
      timeInputMode,
    },
    day,
  );

  return {
    id: createId(),
    title,
    startTime: synced.startTime,
    endTime: synced.endTime,
    durationMinutes: synced.durationMinutes,
    aiScheduled: false,
    isDraft,
    description,
    estimatedDurationMinutes,
    timeInputMode,
  };
}

export function createNextTaskInputRow(previous?: TaskInputRow, title = ''): TaskInputRow {
  const startTime = previous
    ? formatInputTime(addMinutes(parseTimeInput(previous.endTime) ?? new Date().toISOString(), 5))
    : getRoundedStartTime();
  return createTaskInputRow({ title, startTime });
}

export function createDraftTaskInputRow(
  previous?: TaskInputRow,
  title = '',
  options?: {
    aiScheduled?: boolean;
    existingTasks?: Task[];
    plannerRows?: TaskInputRow[];
    preferredStart?: string;
    durationMinutes?: number;
    context?: SchedulingContext;
  },
): TaskInputRow {
  if (options?.aiScheduled) {
    return {
      id: createId(),
      title,
      startTime: '',
      endTime: '',
      aiScheduled: true,
      isDraft: true,
      description: null,
      estimatedDurationMinutes: null,
    };
  }

  const context = options?.context ?? {
    planningDay: new Date(),
    referenceNow: new Date(),
  };
  const slot = findNextAvailableSlot({
    existingTasks: options?.existingTasks ?? [],
    plannerRows: options?.plannerRows ?? (previous ? [previous] : []),
    preferredStart: options?.preferredStart,
    durationMinutes: options?.durationMinutes,
    context,
  });
  return createTaskInputRow({
    title,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes: options?.durationMinutes ?? 60,
    aiScheduled: false,
    isDraft: true,
    timeInputMode: 'duration',
    planningDay: context.planningDay,
  });
}

const previewSeedFactories: Record<string, () => PreviewSeed> = {
  default: () => {
    const first = createTaskInputRow({ title: 'Morning workout', startTime: '07:00' });
    const second = createNextTaskInputRow(first, 'label');
    const third = createTaskInputRow({ title: 'Lunch Break', startTime: '12:00' });
    return {
      apiKey: 'preview-key',
      aiFeaturesEnabled: true,
      localError: null,
      initialDraftAiScheduled: false,
      taskRows: [first, second, third],
      selectedTaskId: null,
      previewTasks: [],
    };
  },
  'ai-no-key': () => {
    const first = createTaskInputRow({ title: 'Morning workout', startTime: '07:00' });
    const second = createNextTaskInputRow(first, 'Study React');
    const third = createTaskInputRow({ title: 'Lunch Break', startTime: '12:00' });
    return {
      apiKey: null,
      aiFeaturesEnabled: true,
      localError: missingApiKeyMessage,
      initialDraftAiScheduled: true,
      taskRows: [first, second, third],
      selectedTaskId: null,
      previewTasks: [],
    };
  },
  'ai-empty-list': () => {
    const first = createTaskInputRow({ title: '', startTime: '07:00' });
    return {
      apiKey: 'preview-key',
      aiFeaturesEnabled: true,
      localError: null,
      initialDraftAiScheduled: false,
      taskRows: [first],
      selectedTaskId: null,
      previewTasks: [],
    };
  },
  'ai-preview': () => {
    const first = createTaskInputRow({ title: 'Morning workout', startTime: '07:00' });
    const second = createNextTaskInputRow(first, 'Study React');
    const third = createTaskInputRow({ title: 'Lunch Break', startTime: '12:00' });
    return {
      apiKey: 'preview-key',
      aiFeaturesEnabled: true,
      localError: null,
      initialDraftAiScheduled: true,
      taskRows: [first, second, third],
      selectedTaskId: null,
      previewTasks: makeGeneratedPreviewTasks(),
    };
  },
};

export function getTaskPlanningPreviewSeed(scenarioId?: string) {
  return (previewSeedFactories[scenarioId ?? 'default'] ?? previewSeedFactories.default)();
}
