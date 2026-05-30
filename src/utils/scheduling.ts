import type { GeneratedTaskPreview, Task, TaskInputRow } from '../types/task';
import type { SchedulingContext } from '../features/taskPlanning/planningDay';
import {
  addMinutes,
  durationBetween,
  formatInputTime,
  parseTimeInput,
  sortGeneratedTasksByStartTime,
} from './time';
import { findNextAvailableSlot } from '../features/taskPlanning/scheduling';

const DEFAULT_BUFFER_MINUTES = 5;
const DEFAULT_DURATION_MINUTES = 30;

export type GeneratedSchedule = {
  title: string;
  durationMinutes: number;
  startTime: string;
};

/** @deprecated Use GeneratedSchedule */
export type GeneratedDuration = {
  title: string;
  durationMinutes: number;
};

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function findGeneratedMatchIndex(
  normalizedInput: string,
  inputIndex: number,
  generated: GeneratedSchedule[],
  used: Set<number>,
): number {
  const findMatch = (predicate: (generatedTitle: string) => boolean) =>
    generated.findIndex((task, index) => !used.has(index) && predicate(normalizeTitle(task.title)));

  let matchIndex = findMatch((generatedTitle) => generatedTitle === normalizedInput);
  if (matchIndex === -1) {
    matchIndex = findMatch(
      (generatedTitle) =>
        generatedTitle.includes(normalizedInput) || normalizedInput.includes(generatedTitle),
    );
  }
  if (matchIndex === -1 && inputIndex < generated.length && !used.has(inputIndex)) {
    matchIndex = inputIndex;
  }

  return matchIndex;
}

export function alignGeneratedSchedule(
  inputTitles: string[],
  generated: GeneratedSchedule[],
): GeneratedSchedule[] {
  const used = new Set<number>();

  const aligned = inputTitles.map((title, inputIndex) => {
    const normalizedInput = normalizeTitle(title);
    const matchIndex = findGeneratedMatchIndex(normalizedInput, inputIndex, generated, used);

    if (matchIndex !== -1) {
      used.add(matchIndex);
      return {
        title,
        durationMinutes: generated[matchIndex].durationMinutes,
        startTime: generated[matchIndex].startTime,
      };
    }

    return {
      title,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      startTime: '09:00',
    };
  });

  return aligned.sort((a, b) => clockToMinutes(a.startTime) - clockToMinutes(b.startTime));
}

function clockToMinutes(clock: string): number {
  const [hoursText, minutesText] = clock.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

export function alignGeneratedDurations(
  inputTitles: string[],
  generated: GeneratedDuration[],
): GeneratedDuration[] {
  const used = new Set<number>();

  return inputTitles.map((title, inputIndex) => {
    const normalizedInput = normalizeTitle(title);
    const findMatch = (predicate: (generatedTitle: string) => boolean) =>
      generated.findIndex(
        (task, index) => !used.has(index) && predicate(normalizeTitle(task.title)),
      );

    let matchIndex = findMatch((generatedTitle) => generatedTitle === normalizedInput);
    if (matchIndex === -1) {
      matchIndex = findMatch(
        (generatedTitle) =>
          generatedTitle.includes(normalizedInput) || normalizedInput.includes(generatedTitle),
      );
    }
    if (matchIndex === -1 && inputIndex < generated.length && !used.has(inputIndex)) {
      matchIndex = inputIndex;
    }

    if (matchIndex !== -1) {
      used.add(matchIndex);
      return {
        title,
        durationMinutes: generated[matchIndex].durationMinutes,
      };
    }

    return {
      title,
      durationMinutes: DEFAULT_DURATION_MINUTES,
    };
  });
}

function previewRowToPlannerRow(task: GeneratedTaskPreview): TaskInputRow {
  return {
    id: task.id,
    title: task.title,
    startTime: formatInputTime(task.startTime),
    endTime: formatInputTime(task.endTime),
  };
}

function manualPlannerRows(rows: TaskInputRow[]): TaskInputRow[] {
  return rows
    .filter((row) => !row.aiScheduled && row.startTime && row.endTime)
    .map((row) => ({
      id: row.id,
      title: row.title,
      startTime: row.startTime,
      endTime: row.endTime,
    }));
}

function previewIdForRow(row: TaskInputRow, index: number, title: string): string {
  return `preview-${index}-${normalizeTitle(title).replace(/[^a-z0-9]+/g, '-')}`;
}

export function buildHybridPreview(
  rows: TaskInputRow[],
  aiSchedule: GeneratedSchedule[],
  {
    existingTasks = [],
    context,
    preferredStart,
  }: {
    existingTasks?: Task[];
    context: SchedulingContext;
    preferredStart?: string;
  },
): GeneratedTaskPreview[] {
  const { planningDay } = context;
  const pinnedManualRows = manualPlannerRows(rows);
  const preview: GeneratedTaskPreview[] = [];

  for (const [index, row] of rows.entries()) {
    const title = row.title.trim();
    if (!title || row.aiScheduled) continue;

    const start = parseTimeInput(row.startTime, planningDay);
    const end = parseTimeInput(row.endTime, planningDay);
    if (!start || !end) {
      throw new Error(`"${title}" needs a valid start and end time.`);
    }

    preview.push({
      id: previewIdForRow(row, index, title),
      title,
      durationMinutes: durationBetween(start, end),
      startTime: start,
      endTime: end,
      aiGenerated: false,
      description: row.description?.trim() || null,
      estimatedDurationMinutes: row.durationMinutes ?? row.estimatedDurationMinutes ?? null,
    });
  }

  const aiTitles = rows
    .filter((row) => row.aiScheduled && row.title.trim())
    .map((row) => row.title.trim());
  const alignedAiTasks = alignGeneratedSchedule(aiTitles, aiSchedule);

  for (const aiTask of alignedAiTasks) {
    const rowIndex = rows.findIndex(
      (row) => row.aiScheduled && normalizeTitle(row.title) === normalizeTitle(aiTask.title),
    );
    const row = rowIndex >= 0 ? rows[rowIndex] : null;
    const durationMinutes = clampDuration(aiTask.durationMinutes);
    const slot = findNextAvailableSlot({
      existingTasks,
      plannerRows: [...pinnedManualRows, ...preview.map(previewRowToPlannerRow)],
      preferredStart: aiTask.startTime || preferredStart,
      durationMinutes,
      context,
    });
    const startTime = parseTimeInput(slot.startTime, planningDay);
    const endTime = parseTimeInput(slot.endTime, planningDay);
    if (!startTime || !endTime) {
      throw new Error(`Could not find a time slot for "${aiTask.title}".`);
    }

    preview.push({
      id: previewIdForRow(
        row ?? { id: aiTask.title, title: aiTask.title, startTime: '', endTime: '' },
        rowIndex >= 0 ? rowIndex : 0,
        aiTask.title,
      ),
      title: aiTask.title,
      durationMinutes,
      startTime,
      endTime,
      aiGenerated: true,
      description: row?.description?.trim() || null,
      estimatedDurationMinutes: row?.estimatedDurationMinutes ?? null,
    });
  }

  return sortGeneratedTasksByStartTime(preview);
}

export function makeSequentialPreview(
  items: GeneratedDuration[],
  startTime: string,
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
): GeneratedTaskPreview[] {
  let cursor = startTime;

  return items.map((item, index) => {
    const durationMinutes = clampDuration(item.durationMinutes);
    const taskStart = cursor;
    const taskEnd = addMinutes(taskStart, durationMinutes);
    cursor = addMinutes(taskEnd, bufferMinutes);

    return {
      id: `preview-${index}-${normalizeTitle(item.title).replace(/[^a-z0-9]+/g, '-')}`,
      title: item.title.trim(),
      durationMinutes,
      startTime: taskStart,
      endTime: taskEnd,
      aiGenerated: true,
    };
  });
}

export const MIN_TASK_DURATION_MINUTES = 10;
export const MAX_TASK_DURATION_MINUTES = 360;

export function clampDuration(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(
    MAX_TASK_DURATION_MINUTES,
    Math.max(MIN_TASK_DURATION_MINUTES, Math.round(value)),
  );
}
