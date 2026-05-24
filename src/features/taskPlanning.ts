import { makeGeneratedPreviewTasks } from '../dev-preview/mockData';
import type { GeneratedTaskPreview, NewTaskInput, Task, TaskInputRow } from '../types/task';
import { addMinutes, formatInputTime, parseTimeInput } from '../utils/time';
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

function createRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRoundedStartTime(): string {
  const date = new Date();
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
}: {
  title?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  aiScheduled?: boolean;
  isDraft?: boolean;
} = {}): TaskInputRow {
  return {
    id: createRowId(),
    title,
    startTime: aiScheduled ? '' : startTime,
    endTime:
      aiScheduled || !startTime
        ? ''
        : (endTime ??
          formatInputTime(
            addMinutes(parseTimeInput(startTime) ?? new Date().toISOString(), durationMinutes),
          )),
    aiScheduled,
    isDraft,
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
    now?: Date;
  },
): TaskInputRow {
  if (options?.aiScheduled) {
    return {
      id: createRowId(),
      title,
      startTime: '',
      endTime: '',
      aiScheduled: true,
      isDraft: true,
    };
  }

  const slot = findNextAvailableSlot({
    existingTasks: options?.existingTasks ?? [],
    plannerRows: options?.plannerRows ?? (previous ? [previous] : []),
    preferredStart: options?.preferredStart,
    durationMinutes: options?.durationMinutes,
    now: options?.now,
  });
  return createTaskInputRow({
    title,
    startTime: slot.startTime,
    endTime: slot.endTime,
    aiScheduled: false,
    isDraft: true,
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

export function sortTaskInputs(inputs: NewTaskInput[]) {
  return [...inputs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
