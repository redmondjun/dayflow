import type { Task, TaskInputRow } from '../../types/task';
import {
  addMinutes,
  formatInputTime,
  getTodayTasks,
  parseTimeInput,
  roundUpToFiveMinutes,
} from '../../utils/time';

function hasTaskRowTitle(row: TaskInputRow) {
  return Boolean(row.title?.trim());
}

export type ManualTaskTimeValidation = {
  error: string | null;
  pastNotice: string | null;
  willMarkCompleted: boolean;
};

type TimeInterval = {
  startMs: number;
  endMs: number;
};

function toInterval(
  startTime: string,
  endTime: string,
  baseDate = new Date(),
): TimeInterval | null {
  const start = parseTimeInput(startTime, baseDate);
  const end = parseTimeInput(endTime, baseDate);
  if (!start || !end) return null;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (endMs <= startMs) return null;

  return { startMs, endMs };
}

function taskToInterval(task: Task): TimeInterval | null {
  const startMs = new Date(task.startTime).getTime();
  const endMs = new Date(task.endTime).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { startMs, endMs };
}

function intervalsOverlap(a: TimeInterval, b: TimeInterval) {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

function collectExistingIntervals(
  existingTasks: Task[],
  plannerRows: TaskInputRow[],
  now = new Date(),
  excludeRowId?: string,
): TimeInterval[] {
  const intervals = getTodayTasks(existingTasks, now)
    .filter((task) => task.status === 'scheduled')
    .map((task) => taskToInterval(task))
    .filter((interval): interval is TimeInterval => interval !== null);

  for (const row of plannerRows) {
    if (row.id === excludeRowId || row.isDraft || !hasTaskRowTitle(row)) continue;
    const interval = toInterval(row.startTime, row.endTime, now);
    if (interval) intervals.push(interval);
  }

  return intervals.sort((a, b) => a.startMs - b.startMs);
}

function findOverlappingInterval(
  startTime: string,
  endTime: string,
  {
    existingTasks = [],
    plannerRows = [],
    excludeRowId,
    now = new Date(),
  }: {
    existingTasks?: Task[];
    plannerRows?: TaskInputRow[];
    excludeRowId?: string;
    now?: Date;
  } = {},
): boolean {
  const candidate = toInterval(startTime, endTime, now);
  if (!candidate) return false;

  const blocking = collectExistingIntervals(existingTasks, plannerRows, now, excludeRowId);
  return blocking.some((interval) => intervalsOverlap(candidate, interval));
}

export function findNextAvailableSlot({
  existingTasks = [],
  plannerRows = [],
  durationMinutes = 60,
  gapMinutes = 5,
  preferredStart,
  now = new Date(),
}: {
  existingTasks?: Task[];
  plannerRows?: TaskInputRow[];
  durationMinutes?: number;
  gapMinutes?: number;
  preferredStart?: string;
  now?: Date;
}): { startTime: string; endTime: string } {
  const intervals = collectExistingIntervals(existingTasks, plannerRows, now);
  const roundedNow = roundUpToFiveMinutes(now);
  let candidateStart = roundedNow;

  if (preferredStart) {
    const preferred = parseTimeInput(preferredStart, now);
    if (preferred) {
      const preferredDate = roundUpToFiveMinutes(new Date(preferred));
      candidateStart = preferredDate.getTime() < roundedNow.getTime() ? roundedNow : preferredDate;
    }
  }

  while (true) {
    const candidateEnd = new Date(addMinutes(candidateStart, durationMinutes));
    const candidate: TimeInterval = {
      startMs: candidateStart.getTime(),
      endMs: candidateEnd.getTime(),
    };
    const conflict = intervals.find((interval) => intervalsOverlap(candidate, interval));

    if (!conflict) {
      return {
        startTime: formatInputTime(candidateStart),
        endTime: formatInputTime(candidateEnd),
      };
    }

    candidateStart = roundUpToFiveMinutes(new Date(conflict.endMs + gapMinutes * 60_000));
  }
}

export function validateManualTaskTimes(
  startTime: string,
  endTime: string,
  now = new Date(),
  options?: {
    existingTasks?: Task[];
    plannerRows?: TaskInputRow[];
    excludeRowId?: string;
  },
): ManualTaskTimeValidation {
  const start = parseTimeInput(startTime, now);
  const end = parseTimeInput(endTime, now);

  if (!start || !end) {
    return {
      error: 'Use a valid start and end time.',
      pastNotice: null,
      willMarkCompleted: false,
    };
  }

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const nowMs = now.getTime();

  if (endMs <= startMs) {
    return {
      error: 'End time must be later than start time.',
      pastNotice: null,
      willMarkCompleted: false,
    };
  }

  if (
    options &&
    findOverlappingInterval(startTime, endTime, {
      existingTasks: options.existingTasks,
      plannerRows: options.plannerRows,
      excludeRowId: options.excludeRowId,
      now,
    })
  ) {
    return {
      error: 'This time overlaps with another scheduled task.',
      pastNotice: null,
      willMarkCompleted: false,
    };
  }

  if (endMs <= nowMs) {
    return {
      error: null,
      pastNotice: 'This task is entirely in the past and will be saved as completed.',
      willMarkCompleted: true,
    };
  }

  if (startMs < nowMs) {
    return {
      error: null,
      pastNotice: 'This task already started and will be saved as completed.',
      willMarkCompleted: true,
    };
  }

  return {
    error: null,
    pastNotice: null,
    willMarkCompleted: false,
  };
}
