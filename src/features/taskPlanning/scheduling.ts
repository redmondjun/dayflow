import type { Task, TaskInputRow } from '../../types/task';
import { hasTaskRowTitle } from '../taskPlanning';
import { isFuturePlanningDay, type SchedulingContext } from './planningDay';
import {
  addMinutes,
  formatInputTime,
  getTasksForDay,
  parseTimeInput,
  roundUpToFiveMinutes,
} from '../../utils/time';

export type ManualTaskTimeValidation = {
  error: string | null;
  pastNotice: string | null;
  willMarkCompleted: boolean;
};

type TimeInterval = {
  startMs: number;
  endMs: number;
};

function toInterval(startTime: string, endTime: string, planningDay: Date): TimeInterval | null {
  const start = parseTimeInput(startTime, planningDay);
  const end = parseTimeInput(endTime, planningDay);
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
  planningDay: Date,
  excludeRowId?: string,
): TimeInterval[] {
  const intervals = getTasksForDay(existingTasks, planningDay)
    .filter((task) => task.status === 'scheduled')
    .map((task) => taskToInterval(task))
    .filter((interval): interval is TimeInterval => interval !== null);

  for (const row of plannerRows) {
    if (row.id === excludeRowId || row.isDraft || !hasTaskRowTitle(row)) continue;
    const interval = toInterval(row.startTime, row.endTime, planningDay);
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
    context,
  }: {
    existingTasks?: Task[];
    plannerRows?: TaskInputRow[];
    excludeRowId?: string;
    context: SchedulingContext;
  },
): boolean {
  const candidate = toInterval(startTime, endTime, context.planningDay);
  if (!candidate) return false;

  const blocking = collectExistingIntervals(
    existingTasks,
    plannerRows,
    context.planningDay,
    excludeRowId,
  );
  return blocking.some((interval) => intervalsOverlap(candidate, interval));
}

function getEarliestCandidateStart(context: SchedulingContext, preferredStart?: string): Date {
  const { planningDay, referenceNow } = context;
  const isFuture = isFuturePlanningDay(planningDay, referenceNow);
  let candidateStart: Date;

  if (preferredStart) {
    const preferred = parseTimeInput(preferredStart, planningDay);
    candidateStart = preferred
      ? roundUpToFiveMinutes(new Date(preferred))
      : roundUpToFiveMinutes(referenceNow);
  } else {
    candidateStart = roundUpToFiveMinutes(referenceNow);
  }

  if (!isFuture) {
    const floor = roundUpToFiveMinutes(referenceNow);
    if (candidateStart.getTime() < floor.getTime()) {
      candidateStart = floor;
    }
  }

  return candidateStart;
}

export function findNextAvailableSlot({
  existingTasks = [],
  plannerRows = [],
  durationMinutes = 60,
  gapMinutes = 5,
  preferredStart,
  context,
}: {
  existingTasks?: Task[];
  plannerRows?: TaskInputRow[];
  durationMinutes?: number;
  gapMinutes?: number;
  preferredStart?: string;
  context: SchedulingContext;
}): { startTime: string; endTime: string } {
  const { planningDay } = context;
  const intervals = collectExistingIntervals(existingTasks, plannerRows, planningDay);
  let candidateStart = getEarliestCandidateStart(context, preferredStart);

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
  context: SchedulingContext,
  options?: {
    existingTasks?: Task[];
    plannerRows?: TaskInputRow[];
    excludeRowId?: string;
  },
): ManualTaskTimeValidation {
  const { planningDay, referenceNow } = context;
  const start = parseTimeInput(startTime, planningDay);
  const end = parseTimeInput(endTime, planningDay);

  if (!start || !end) {
    return {
      error: 'Use a valid start and end time.',
      pastNotice: null,
      willMarkCompleted: false,
    };
  }

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

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
      context,
    })
  ) {
    return {
      error: 'This time overlaps with another scheduled task.',
      pastNotice: null,
      willMarkCompleted: false,
    };
  }

  if (!isFuturePlanningDay(planningDay, referenceNow)) {
    const nowMs = referenceNow.getTime();

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
  }

  return {
    error: null,
    pastNotice: null,
    willMarkCompleted: false,
  };
}
