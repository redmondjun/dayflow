import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  clearDemoNowOverride,
  clearWeeklyPreviewEnabled,
  getDemoAdjustedTasks,
  getDevDemoSnapshot,
  getEffectiveNow,
  resetDevDemoState,
  setDemoNowOverride,
  setWeeklyPreviewEnabled,
} from './devDemo';

describe('devDemo service', () => {
  beforeEach(() => {
    resetDevDemoState();
  });

  afterEach(() => {
    resetDevDemoState();
  });

  it('uses the override time when one is set', () => {
    setDemoNowOverride('2026-05-30T15:45:00.000Z');

    expect(getEffectiveNow(new Date('2026-01-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-05-30T15:45:00.000Z',
    );
  });

  it('falls back to the provided current time when the override is cleared', () => {
    setDemoNowOverride('2026-05-30T15:45:00.000Z');
    clearDemoNowOverride();

    expect(getEffectiveNow(new Date('2026-01-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('tracks the weekly preview toggle in memory', () => {
    setWeeklyPreviewEnabled(true);
    expect(getDevDemoSnapshot().weeklyPreviewEnabled).toBe(true);

    clearWeeklyPreviewEnabled();
    expect(getDevDemoSnapshot().weeklyPreviewEnabled).toBe(false);
  });

  it('marks past scheduled tasks as completed while demo time override is active', () => {
    setDemoNowOverride('2026-05-30T15:45:00.000Z');

    const adjusted = getDemoAdjustedTasks(
      [
        {
          id: 'past',
          title: 'Past task',
          startTime: '2026-05-30T13:00:00.000Z',
          endTime: '2026-05-30T14:00:00.000Z',
          status: 'scheduled',
          aiGenerated: false,
          createdAt: '2026-05-30T12:00:00.000Z',
          updatedAt: '2026-05-30T12:00:00.000Z',
        },
        {
          id: 'future',
          title: 'Future task',
          startTime: '2026-05-30T16:00:00.000Z',
          endTime: '2026-05-30T17:00:00.000Z',
          status: 'scheduled',
          aiGenerated: false,
          createdAt: '2026-05-30T12:00:00.000Z',
          updatedAt: '2026-05-30T12:00:00.000Z',
        },
      ],
      new Date('2026-05-30T15:45:00.000Z'),
    );

    expect(adjusted[0].status).toBe('completed');
    expect(adjusted[0].actualEndTime).toBe('2026-05-30T14:00:00.000Z');
    expect(adjusted[1].status).toBe('scheduled');
  });

  it('ignores demo overrides outside dev mode', () => {
    Reflect.set(globalThis, '__DEV__', false);

    setDemoNowOverride('2026-05-30T15:45:00.000Z');
    setWeeklyPreviewEnabled(true);

    expect(getEffectiveNow(new Date('2026-01-01T00:00:00.000Z')).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(getDevDemoSnapshot().nowOverride).toBeNull();
    expect(getDevDemoSnapshot().weeklyPreviewEnabled).toBe(false);
  });
});
