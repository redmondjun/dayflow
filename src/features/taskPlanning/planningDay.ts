import {
  addLocalDays,
  formatSchedulePreviewDate,
  getLocalDayKey,
  isSameLocalDay,
} from '../../utils/time';

export type PlanningDayKey = string;

export type SchedulingContext = {
  planningDay: Date;
  referenceNow: Date;
};

export function resolvePlanningDay(key: PlanningDayKey, referenceNow: Date): Date {
  const [yearText, monthText, dayText] = key.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(referenceNow);
  }

  const resolved = new Date(referenceNow);
  resolved.setFullYear(year, month - 1, day);
  resolved.setHours(0, 0, 0, 0);
  return resolved;
}

export function getTodayKey(referenceNow: Date): PlanningDayKey {
  return getLocalDayKey(referenceNow);
}

export function getTomorrowKey(referenceNow: Date): PlanningDayKey {
  return getLocalDayKey(addLocalDays(referenceNow, 1));
}

export function isFuturePlanningDay(planningDay: Date, referenceNow: Date): boolean {
  return getLocalDayKey(planningDay) > getLocalDayKey(referenceNow);
}

export function isTodayKey(dayKey: PlanningDayKey, referenceNow: Date): boolean {
  return dayKey === getTodayKey(referenceNow);
}

export function formatPlanningDayLabel(planningDay: Date): string {
  return formatSchedulePreviewDate(planningDay);
}

export function createSchedulingContext(
  planningDayKey: PlanningDayKey,
  referenceNow: Date,
): SchedulingContext {
  return {
    planningDay: resolvePlanningDay(planningDayKey, referenceNow),
    referenceNow,
  };
}

export function schedulingContextForDay(planningDay: Date, referenceNow: Date): SchedulingContext {
  return { planningDay, referenceNow };
}

export function isSamePlanningDay(a: Date, b: Date): boolean {
  return isSameLocalDay(a, b);
}
