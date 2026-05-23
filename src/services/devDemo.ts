import { useSyncExternalStore } from 'react';
import type { Task } from '../types/task';

type DevDemoSnapshot = {
  nowOverride: string | null;
  weeklyPreviewEnabled: boolean;
};

const defaultSnapshot: DevDemoSnapshot = {
  nowOverride: null,
  weeklyPreviewEnabled: false,
};

let snapshot: DevDemoSnapshot = defaultSnapshot;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function updateSnapshot(next: Partial<DevDemoSnapshot>) {
  if (!__DEV__) return;
  snapshot = { ...snapshot, ...next };
  emitChange();
}

export function subscribeDevDemo(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevDemoSnapshot(): DevDemoSnapshot {
  return snapshot;
}

export function useDevDemoState(): DevDemoSnapshot {
  return useSyncExternalStore(subscribeDevDemo, getDevDemoSnapshot, getDevDemoSnapshot);
}

export function getEffectiveNow(now = new Date()): Date {
  if (!__DEV__ || !snapshot.nowOverride) return now;
  return new Date(snapshot.nowOverride);
}

export function getDemoAdjustedTasks(tasks: Task[], now = new Date()): Task[] {
  if (!__DEV__ || !snapshot.nowOverride) return tasks;

  const nowMs = now.getTime();
  return tasks.map((task) => {
    if (task.status !== 'scheduled') return task;
    const endMs = new Date(task.endTime).getTime();
    if (Number.isNaN(endMs) || endMs > nowMs) return task;
    return {
      ...task,
      status: 'completed',
      actualEndTime: task.actualEndTime ?? task.endTime,
    };
  });
}

export function setDemoNowOverride(isoValue: string) {
  updateSnapshot({ nowOverride: isoValue });
}

export function clearDemoNowOverride() {
  updateSnapshot({ nowOverride: null });
}

export function setWeeklyPreviewEnabled(enabled: boolean) {
  updateSnapshot({ weeklyPreviewEnabled: enabled });
}

export function clearWeeklyPreviewEnabled() {
  updateSnapshot({ weeklyPreviewEnabled: false });
}

export function resetDevDemoState() {
  snapshot = defaultSnapshot;
  emitChange();
}
