import { describe, expect, it } from '@jest/globals';
import {
  createSchedulingContext,
  formatPlanningDayLabel,
  getTodayKey,
  getTomorrowKey,
  isFuturePlanningDay,
  isTodayKey,
  resolvePlanningDay,
} from './planningDay';

describe('planningDay', () => {
  const referenceNow = new Date(2026, 4, 23, 14, 0, 0, 0);

  it('resolves day keys to local calendar dates', () => {
    const planningDay = resolvePlanningDay('2026-05-26', referenceNow);

    expect(planningDay.getFullYear()).toBe(2026);
    expect(planningDay.getMonth()).toBe(4);
    expect(planningDay.getDate()).toBe(26);
    expect(planningDay.getHours()).toBe(0);
  });

  it('derives today and tomorrow keys from referenceNow', () => {
    expect(getTodayKey(referenceNow)).toBe('2026-05-23');
    expect(getTomorrowKey(referenceNow)).toBe('2026-05-24');
  });

  it('detects future planning days', () => {
    const tomorrow = resolvePlanningDay(getTomorrowKey(referenceNow), referenceNow);

    expect(isFuturePlanningDay(tomorrow, referenceNow)).toBe(true);
    expect(isFuturePlanningDay(referenceNow, referenceNow)).toBe(false);
  });

  it('identifies today keys', () => {
    expect(isTodayKey(getTodayKey(referenceNow), referenceNow)).toBe(true);
    expect(isTodayKey(getTomorrowKey(referenceNow), referenceNow)).toBe(false);
  });

  it('creates scheduling context from a day key', () => {
    const context = createSchedulingContext(getTomorrowKey(referenceNow), referenceNow);

    expect(context.referenceNow).toBe(referenceNow);
    expect(context.planningDay.getDate()).toBe(24);
  });

  it('formats planning day labels', () => {
    const planningDay = resolvePlanningDay('2026-05-24', referenceNow);

    expect(formatPlanningDayLabel(planningDay)).toBe('Sunday, May 24');
  });
});
