import type { GeneratedTaskPreview, Task, TaskInputRow } from '../types/task';
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

export type GeneratedDuration = {
  title: string;
  durationMinutes: number;
};

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
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

export function buildHybridPreview(
  rows: TaskInputRow[],
  aiDurations: GeneratedDuration[],
  {
    existingTasks = [],
    now = new Date(),
    preferredStart,
  }: {
    existingTasks?: Task[];
    now?: Date;
    preferredStart?: string;
  } = {},
): GeneratedTaskPreview[] {
  const durationByTitle = new Map(
    alignGeneratedDurations(
      rows.filter((row) => row.aiScheduled).map((row) => row.title.trim()),
      aiDurations,
    ).map((item) => [normalizeTitle(item.title), item.durationMinutes]),
  );
  const pinnedManualRows = manualPlannerRows(rows);
  const preview: GeneratedTaskPreview[] = [];
  let nextPreferredStart = preferredStart;

  for (const [index, row] of rows.entries()) {
    const title = row.title.trim();
    if (!title) continue;

    if (!row.aiScheduled) {
      const start = parseTimeInput(row.startTime, now);
      const end = parseTimeInput(row.endTime, now);
      if (!start || !end) {
        throw new Error(`"${title}" needs a valid start and end time.`);
      }

      preview.push({
        id: `preview-${index}-${normalizeTitle(title).replace(/[^a-z0-9]+/g, '-')}`,
        title,
        durationMinutes: durationBetween(start, end),
        startTime: start,
        endTime: end,
        aiGenerated: false,
      });
      nextPreferredStart = formatInputTime(addMinutes(end, DEFAULT_BUFFER_MINUTES));
      continue;
    }

    const durationMinutes = clampDuration(
      durationByTitle.get(normalizeTitle(title)) ?? DEFAULT_DURATION_MINUTES,
    );
    const slot = findNextAvailableSlot({
      existingTasks,
      plannerRows: [...pinnedManualRows, ...preview.map(previewRowToPlannerRow)],
      preferredStart: nextPreferredStart,
      durationMinutes,
      now,
    });
    const startTime = parseTimeInput(slot.startTime, now);
    const endTime = parseTimeInput(slot.endTime, now);
    if (!startTime || !endTime) {
      throw new Error(`Could not find a time slot for "${title}".`);
    }

    preview.push({
      id: `preview-${index}-${normalizeTitle(title).replace(/[^a-z0-9]+/g, '-')}`,
      title,
      durationMinutes,
      startTime,
      endTime,
      aiGenerated: true,
    });
    nextPreferredStart = formatInputTime(addMinutes(endTime, DEFAULT_BUFFER_MINUTES));
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

export function clampDuration(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(240, Math.max(10, Math.round(value)));
}
