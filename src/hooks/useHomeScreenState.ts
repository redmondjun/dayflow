import { useEffect, useMemo, useState } from 'react';
import { makeActiveDayTasks, makeCompletedHeavyTasks } from '../dev-preview/mockData';
import { resolveDayCompleteCandidate } from '../features/dayComplete';
import { getDemoAdjustedTasks, getEffectiveNow, useDevDemoState } from '../services/devDemo';
import {
  getDayCompleteDismissedDate,
  saveDayCompleteDismissedDate,
} from '../services/dayCompleteDismissal';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { formatDisplayDate, getCurrentTask, getUpcomingTasks } from '../utils/time';
import { hasScenarioId } from '../navigation/routeProps';
import { useMountedRef } from './useMountedRef';

export type HomePreviewScenarioId = 'home-empty' | 'home-active' | 'home-completed';

export type HomeScreenRouteProps = {
  onEditTask?: (taskId: string) => void;
  onCreateTask: () => void;
  onOpenSettings?: () => void;
};

export type HomeScreenPreviewProps = {
  scenarioId: HomePreviewScenarioId;
  onBack: () => void;
};

export type HomeScreenViewProps = HomeScreenRouteProps | HomeScreenPreviewProps;

function buildPreviewTasks(scenarioId: HomePreviewScenarioId): Task[] {
  const previewTaskMap: Record<HomePreviewScenarioId, Task[]> = {
    'home-empty': [],
    'home-active': makeActiveDayTasks(),
    'home-completed': makeCompletedHeavyTasks(),
  };
  return previewTaskMap[scenarioId];
}

function updatePreviewTaskStatus(
  setPreviewTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  taskId: string,
  status: Task['status'],
) {
  setPreviewTasks((tasks) =>
    tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
  );
}

export function useHomeScreenState(props: HomeScreenViewProps) {
  const isPreview = hasScenarioId(props);
  const previewScenarioId = isPreview ? props.scenarioId : null;
  const [tick, setTick] = useState(Date.now());
  const { nowOverride } = useDevDemoState();
  const [previewTasks, setPreviewTasks] = useState<Task[]>(
    previewScenarioId ? buildPreviewTasks(previewScenarioId) : [],
  );
  const {
    loading,
    error,
    clearError,
    reloadTasks,
    tasks: storeTasks,
    todayTasks,
    currentTask,
    upcomingTasks,
    markCompleted,
    markSkipped,
  } = useTaskStore();
  const [dismissedDayKey, setDismissedDayKey] = useState<string | null>(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(isPreview);
  const mountedRef = useMountedRef();

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (previewScenarioId) {
      setPreviewTasks(buildPreviewTasks(previewScenarioId));
    }
  }, [previewScenarioId]);

  useEffect(() => {
    if (isPreview) return;

    setDismissalLoaded(false);
    getDayCompleteDismissedDate()
      .then((value) => {
        if (mountedRef.current) setDismissedDayKey(value);
      })
      .finally(() => {
        if (mountedRef.current) setDismissalLoaded(true);
      });
  }, [isPreview, nowOverride, mountedRef]);

  const effectiveNow = useMemo(
    () => (isPreview ? new Date(tick) : getEffectiveNow(new Date(tick))),
    [isPreview, tick, nowOverride],
  );
  const adjustedStoreTasks = useMemo(
    () => (isPreview ? [] : getDemoAdjustedTasks(storeTasks, effectiveNow)),
    [effectiveNow, isPreview, storeTasks, nowOverride],
  );
  const dayCompleteCandidate = useMemo(
    () => (isPreview ? null : resolveDayCompleteCandidate(adjustedStoreTasks, effectiveNow)),
    [adjustedStoreTasks, effectiveNow, isPreview],
  );
  const showingDayComplete = Boolean(
    !isPreview &&
    dismissalLoaded &&
    dayCompleteCandidate &&
    dayCompleteCandidate.dayKey !== dismissedDayKey,
  );
  const date = formatDisplayDate(effectiveNow);
  const tasks = isPreview
    ? previewTasks
    : getDemoAdjustedTasks(todayTasks(effectiveNow), effectiveNow);
  const current = isPreview ? getCurrentTask(tasks, effectiveNow) : currentTask(effectiveNow);
  const next = isPreview
    ? getUpcomingTasks(tasks, effectiveNow)[0]
    : upcomingTasks(effectiveNow)[0];

  const onDismissDayComplete = async () => {
    if (!dayCompleteCandidate) return;
    await saveDayCompleteDismissedDate(dayCompleteCandidate.dayKey);
    setDismissedDayKey(dayCompleteCandidate.dayKey);
  };

  const mode = isPreview
    ? {
        onHeaderPress: props.onBack,
        pullToRefresh: undefined,
        onCurrentComplete: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'completed')
          : undefined,
        onCurrentSkip: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'skipped')
          : undefined,
        onTaskPress: undefined,
        onPrimaryAction: props.onBack,
        showError: false,
      }
    : {
        onHeaderPress: props.onOpenSettings,
        pullToRefresh: { loading, onRefresh: reloadTasks },
        onCurrentComplete: current ? () => markCompleted(current.id) : undefined,
        onCurrentSkip: current ? () => markSkipped(current.id) : undefined,
        onTaskPress: props.onEditTask,
        onPrimaryAction: props.onCreateTask,
        showError: true,
      };

  return {
    clearError,
    current,
    date,
    dayCompleteCandidate,
    effectiveNow,
    error,
    next,
    onDismissDayComplete,
    showingDayComplete,
    tasks,
    ...mode,
  };
}
