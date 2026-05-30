import { clampDuration } from '../../utils/scheduling';
import { addMinutes, durationBetween, formatInputTime, parseTimeInput } from '../../utils/time';

export function computeEndFromStartAndDuration(
  startTime: string,
  durationMinutes: number,
  planningDay: Date = new Date(),
): string | null {
  const start = parseTimeInput(startTime, planningDay);
  if (!start) return null;
  const clamped = clampDuration(durationMinutes);
  return formatInputTime(addMinutes(start, clamped));
}

export function computeDurationFromStartAndEnd(
  startTime: string,
  endTime: string,
  planningDay: Date = new Date(),
): number | null {
  const start = parseTimeInput(startTime, planningDay);
  const end = parseTimeInput(endTime, planningDay);
  if (!start || !end) return null;
  const minutes = durationBetween(start, end);
  if (minutes < 10) return null;
  return clampDuration(minutes);
}

export function syncManualRowTimes(
  row: {
    startTime: string;
    endTime: string;
    durationMinutes?: number | null;
    timeInputMode?: 'duration' | 'end';
  },
  planningDay: Date,
): { startTime: string; endTime: string; durationMinutes: number } {
  const mode = row.timeInputMode ?? 'duration';
  const duration =
    row.durationMinutes != null && Number.isFinite(row.durationMinutes)
      ? clampDuration(row.durationMinutes)
      : (computeDurationFromStartAndEnd(row.startTime, row.endTime, planningDay) ??
        clampDuration(60));

  if (mode === 'end') {
    return {
      startTime: row.startTime,
      endTime: row.endTime,
      durationMinutes:
        computeDurationFromStartAndEnd(row.startTime, row.endTime, planningDay) ?? duration,
    };
  }

  const endTime =
    computeEndFromStartAndDuration(row.startTime, duration, planningDay) ?? row.endTime;
  return {
    startTime: row.startTime,
    endTime,
    durationMinutes: duration,
  };
}
