import { useEffect, useMemo, useState } from 'react';
import { makeActiveDayTasks, makeCompletedHeavyTasks } from '../dev-preview/mockData';
import { resolveDayCompleteCandidate } from '../features/dayComplete';
import {
  getTodayKey,
  getTomorrowKey,
  isTodayKey,
  resolvePlanningDay,
  type PlanningDayKey,
} from '../features/taskPlanning/planningDay';
import { getDemoAdjustedTasks, getEffectiveNow, useDevDemoState } from '../services/devDemo';
import {
  getDayCompleteDismissedDate,
  saveDayCompleteDismissedDate,
} from '../services/dayCompleteDismissal';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { formatDisplayDate, getCurrentTask, getUpcomingTasks } from '../utils/time';
import { useMountedRef } from './useMountedRef';

export type HomePreviewScenarioId = 'home-empty' | 'home-active' | 'home-completed';

export type HomeScreenRouteProps = {
  onEditTask?: (taskId: string) => void;
  onCreateTask: (planningDayKey?: PlanningDayKey) => void;
  onOpenSettings?: () => void;
};

export type HomeScreenPreviewProps = {
  scenarioId: HomePreviewScenarioId;
  onBack: () => void;
};

export type HomeScreenViewProps = HomeScreenRouteProps | HomeScreenPreviewProps;

function isHomePreviewProps(props: HomeScreenViewProps): props is HomeScreenPreviewProps {
  return 'scenarioId' in props;
}

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
  const isPreview = isHomePreviewProps(props);
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
    tasksForDay,
    currentTask,
    upcomingTasks,
    markCompleted,
    markSkipped,
  } = useTaskStore();
  const [dismissedDayKey, setDismissedDayKey] = useState<string | null>(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(isPreview);
  const [selectedDayKey, setSelectedDayKey] = useState<PlanningDayKey>(() =>
    getTodayKey(getEffectiveNow()),
  );
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
  const todayKey = getTodayKey(effectiveNow);
  const tomorrowKey = getTomorrowKey(effectiveNow);
  const activeDayKey = selectedDayKey;
  const viewingToday = isTodayKey(activeDayKey, effectiveNow);
  const viewingDay = resolvePlanningDay(activeDayKey, effectiveNow);

  useEffect(() => {
    if (isPreview) return;
    setSelectedDayKey((current) => {
      if (current === todayKey || current === tomorrowKey) return current;
      return todayKey;
    });
  }, [effectiveNow, isPreview, todayKey, tomorrowKey]);

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
    viewingToday &&
    dismissalLoaded &&
    dayCompleteCandidate &&
    dayCompleteCandidate.dayKey !== dismissedDayKey,
  );
  const date = formatDisplayDate(viewingToday ? effectiveNow : viewingDay);
  const tasks = isPreview
    ? previewTasks
    : getDemoAdjustedTasks(tasksForDay(activeDayKey, effectiveNow), effectiveNow);
  const tomorrowTaskCount = isPreview ? 0 : tasksForDay(tomorrowKey, effectiveNow).length;
  const current = viewingToday
    ? isPreview
      ? getCurrentTask(tasks, effectiveNow)
      : currentTask(effectiveNow)
    : undefined;
  const next = viewingToday
    ? isPreview
      ? getUpcomingTasks(tasks, effectiveNow)[0]
      : upcomingTasks(effectiveNow)[0]
    : undefined;

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
        onPrimaryAction: () => props.onCreateTask(activeDayKey),
        showError: true,
      };

  return {
    activeDayKey,
    clearError,
    current,
    date,
    dayCompleteCandidate,
    effectiveNow,
    error,
    next,
    onDismissDayComplete,
    onSelectDayKey: setSelectedDayKey,
    showingDayComplete,
    tasks,
    todayKey,
    tomorrowKey,
    tomorrowTaskCount,
    viewingToday,
    ...mode,
  };
}
