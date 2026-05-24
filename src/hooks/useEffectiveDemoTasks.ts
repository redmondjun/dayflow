import { useMemo } from 'react';
import { getDemoAdjustedTasks, getEffectiveNow, useDevDemoState } from '../services/devDemo';
import { useTaskStore } from '../store/taskStore';

export function useEffectiveDemoTasks() {
  const tasks = useTaskStore((state) => state.tasks);
  const { nowOverride, weeklyPreviewEnabled } = useDevDemoState();
  const effectiveNow = useMemo(() => getEffectiveNow(), [nowOverride]);
  const effectiveTasks = useMemo(
    () => getDemoAdjustedTasks(tasks, effectiveNow),
    [effectiveNow, tasks],
  );

  return {
    effectiveNow,
    effectiveTasks,
    nowOverride,
    weeklyPreviewEnabled,
    tasks,
  };
}
