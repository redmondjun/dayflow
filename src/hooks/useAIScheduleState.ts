import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { createTaskPlanningPreviewStore } from '../features/taskPlanning/previewStore';
import {
  getRoundedStartTime,
  getTaskPlanningPreviewSeed,
  hasTaskRowTitle,
  missingApiKeyMessage,
  serializeTaskRowsForPreview,
} from '../features/taskPlanning';
import {
  submitManualSchedule,
  validateHybridManualRows,
} from '../features/taskPlanning/submitSchedule';
import { findNextAvailableSlot } from '../features/taskPlanning/scheduling';
import {
  getTaskPlanningDefaultsFromProfile,
  type TaskPlanningDefaults,
} from '../features/taskPlanning/profileDefaults';
import {
  createSchedulingContext,
  getTodayKey,
  isFuturePlanningDay,
  type PlanningDayKey,
} from '../features/taskPlanning/planningDay';
import { useTaskInputRows } from './useTaskInputRows';
import { useMountedRef } from './useMountedRef';
import { getActiveAiApiKey, getAiFeaturesEnabled } from '../services/apiKey';
import { getEffectiveNow, useDevDemoState } from '../services/devDemo';
import { generateGeminiScheduleFromText } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { getProfileSchedulingContext } from '../features/taskPlanning/profileScheduling';
import { generateScheduleFromText } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import type { GeneratedTaskPreview, TaskInputRow } from '../types/task';
import { buildHybridPreview } from '../utils/scheduling';
import { formatInputTime } from '../utils/time';

type UseAIScheduleStateArgs = {
  isPreview: boolean;
  scenarioId?: string;
  onComplete: () => void;
  initialDraftAiScheduled?: boolean;
  initialPlanningDayKey?: PlanningDayKey;
  autoOpenDraft?: boolean;
  /** @deprecated Use initialDraftAiScheduled */
  initialAiEnabled?: boolean;
};

function getLiveCreateState() {
  return {
    apiKey: null as string | null,
    aiFeaturesEnabled: false,
    localError: null as string | null,
    initialDraftAiScheduled: false,
    taskRows: [] as TaskInputRow[],
    selectedTaskId: null as string | null,
    previewTasks: [] as GeneratedTaskPreview[],
  };
}

export function useAIScheduleState({
  isPreview,
  scenarioId,
  onComplete,
  initialDraftAiScheduled: initialDraftAiScheduledProp = false,
  initialPlanningDayKey,
  initialAiEnabled,
  autoOpenDraft = false,
}: UseAIScheduleStateArgs) {
  const initialDraftAiScheduled = initialAiEnabled ?? initialDraftAiScheduledProp;
  const isFocused = useIsFocused();
  const { nowOverride } = useDevDemoState();
  const effectiveNow = useMemo(() => getEffectiveNow(), [nowOverride]);
  const [planningDayKey, setPlanningDayKey] = useState<PlanningDayKey>(
    initialPlanningDayKey ?? getTodayKey(effectiveNow),
  );
  const schedulingContext = useMemo(
    () => createSchedulingContext(planningDayKey, effectiveNow),
    [effectiveNow, planningDayKey],
  );
  const { planningDay } = schedulingContext;
  const initialState = isPreview ? getTaskPlanningPreviewSeed(scenarioId) : getLiveCreateState();
  const [apiKey, setApiKey] = useState<string | null>(initialState.apiKey);
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(initialState.aiFeaturesEnabled);
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState(isPreview);
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(initialState.localError);
  const [localPreviewTasks, setLocalPreviewTasks] = useState(initialState.previewTasks);
  const [previewVisible, setPreviewVisible] = useState(initialState.previewTasks.length > 0);
  const cachedPreviewSignatureRef = useRef<string | null>(
    initialState.previewTasks.length > 0
      ? serializeTaskRowsForPreview(initialState.taskRows.filter((row) => row.title?.trim()))
      : null,
  );
  const [planningDefaults, setPlanningDefaults] = useState<TaskPlanningDefaults | null>(
    isPreview ? getTaskPlanningDefaultsFromProfile(null, schedulingContext) : null,
  );
  const mountedRef = useMountedRef();

  const aiAvailable = Boolean(apiKey) && aiFeaturesEnabled;
  const hasExistingSchedule =
    !isPreview && useTaskStore.getState().tasksForDay(planningDayKey, effectiveNow).length > 0;
  const defaultDraftAiScheduled = isPreview
    ? initialState.initialDraftAiScheduled
    : initialDraftAiScheduled
      ? aiAvailable
      : aiAvailable && !hasExistingSchedule;

  const {
    previewTasks: storePreviewTasks,
    setPreviewTasks,
    updatePreviewTask,
    clearPreviewTasks,
    confirmPreviewTasks,
    addTasks,
    error: storeError,
    clearError,
    loading,
  } = useTaskStore();

  const getExistingTasks = useCallback(() => {
    if (isPreview) return [];
    return useTaskStore.getState().tasksForDay(planningDayKey, effectiveNow);
  }, [effectiveNow, isPreview, planningDayKey]);

  const { setTaskRows, setSelectedTaskId, updateTaskRow, ...taskInput } = useTaskInputRows({
    initialRows: initialState.taskRows,
    initialSelectedTaskId: initialState.selectedTaskId,
    defaultDraftAiScheduled,
    getExistingTasks,
    planningDefaults: planningDefaults ?? undefined,
    schedulingContext,
  });

  const committedTitledRows = useMemo(
    () => taskInput.committedRows.filter(hasTaskRowTitle),
    [taskInput.committedRows],
  );

  const didAutoOpenDraft = useRef(false);

  useEffect(() => {
    if (isPreview) return;

    getOnboardingProfile()
      .then((profile) => {
        if (!mountedRef.current) return;
        setPlanningDefaults(getTaskPlanningDefaultsFromProfile(profile, schedulingContext));
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setPlanningDefaults(getTaskPlanningDefaultsFromProfile(null, schedulingContext));
      });
  }, [isPreview, mountedRef, schedulingContext]);

  useEffect(() => {
    if (!autoOpenDraft || didAutoOpenDraft.current) return;
    if (!isPreview && (planningDefaults === null || !aiSettingsLoaded)) return;
    didAutoOpenDraft.current = true;
    taskInput.addTaskRow();
  }, [aiSettingsLoaded, autoOpenDraft, isPreview, planningDefaults, taskInput.addTaskRow]);

  useEffect(() => {
    if (!isPreview || !scenarioId) return;

    const nextSeed = getTaskPlanningPreviewSeed(scenarioId);
    setApiKey(nextSeed.apiKey);
    setAiFeaturesEnabled(nextSeed.aiFeaturesEnabled);
    setTaskRows(nextSeed.taskRows);
    setSelectedTaskId(nextSeed.selectedTaskId);
    setGenerating(false);
    setLocalError(nextSeed.localError);
    setLocalPreviewTasks(nextSeed.previewTasks);
    setPreviewVisible(nextSeed.previewTasks.length > 0);
    cachedPreviewSignatureRef.current =
      nextSeed.previewTasks.length > 0
        ? serializeTaskRowsForPreview(nextSeed.taskRows.filter((row) => row.title?.trim()))
        : null;
  }, [isPreview, scenarioId]);

  useEffect(() => {
    if (isPreview || !isFocused) return;

    Promise.all([getActiveAiApiKey(), getAiFeaturesEnabled()])
      .then(([activeKey, nextAiFeaturesEnabled]) => {
        setApiKey(activeKey?.key ?? null);
        setAiFeaturesEnabled(nextAiFeaturesEnabled);
      })
      .catch(() => {
        setApiKey(null);
        setAiFeaturesEnabled(false);
      })
      .finally(() => setAiSettingsLoaded(true));
  }, [isFocused, isPreview]);

  useEffect(() => {
    if (isPreview) return undefined;
    return () => {
      clearPreviewTasks();
      cachedPreviewSignatureRef.current = null;
    };
  }, [clearPreviewTasks, isPreview]);

  const dismissPreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const previewInputSignature = useMemo(
    () => serializeTaskRowsForPreview(committedTitledRows),
    [committedTitledRows],
  );

  const previewStore = createTaskPlanningPreviewStore({
    isPreview,
    localPreviewTasks,
    storePreviewTasks,
    setLocalPreviewTasks,
    setLocalError,
    onComplete,
    setPreviewTasks,
    updatePreviewTask,
    dismissPreview,
    confirmPreviewTasks,
    clearError,
  });

  const previewTasks = isPreview ? localPreviewTasks : storePreviewTasks;
  const showingPreview = previewVisible && previewTasks.length > 0;
  const activeStoreError = isPreview ? null : storeError;
  const activeLoading = isPreview ? false : loading;
  const selectedRowAiScheduled = Boolean(aiAvailable && taskInput.expandedTask?.aiScheduled);
  const draftAiScheduled = Boolean(aiAvailable && taskInput.draftTask?.aiScheduled);
  const canConfirmPreview =
    previewTasks.length > 0 &&
    previewTasks.every((task) => task.title.trim() && task.durationMinutes >= 10);

  const toggleRowAiScheduled = (value: boolean) => {
    const row = taskInput.expandedTask;
    if (!row || !aiAvailable) return;

    if (value) {
      updateTaskRow(row.id, {
        aiScheduled: true,
        startTime: '',
        endTime: '',
      });
      return;
    }

    const slot = findNextAvailableSlot({
      existingTasks: getExistingTasks(),
      plannerRows: taskInput.committedRows.filter((committed) => committed.id !== row.id),
      preferredStart: planningDefaults?.preferredStart,
      durationMinutes:
        row.estimatedDurationMinutes ?? row.durationMinutes ?? planningDefaults?.durationMinutes,
      context: schedulingContext,
    });
    updateTaskRow(row.id, {
      aiScheduled: false,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes:
        row.durationMinutes ??
        row.estimatedDurationMinutes ??
        planningDefaults?.durationMinutes ??
        60,
      timeInputMode: row.timeInputMode ?? 'duration',
    });
  };

  const saveManualSchedule = async () => {
    const manualRows = committedTitledRows.filter((row) => !row.aiScheduled);
    const result = await submitManualSchedule({
      manualRows,
      existingTasks: getExistingTasks(),
      context: schedulingContext,
      addTasks,
    });
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    onComplete();
  };

  const generateHybridSchedule = async () => {
    const rows = committedTitledRows;
    const aiRows = rows.filter((row) => row.aiScheduled);
    const manualRows = rows.filter((row) => !row.aiScheduled);

    if (rows.length === 0) {
      setLocalError('Add at least one task first.');
      return;
    }

    const manualError = validateHybridManualRows(manualRows, getExistingTasks(), schedulingContext);
    if (manualError) {
      setLocalError(manualError);
      return;
    }

    let latestOpenAiApiKey = apiKey;
    let latestGeminiApiKey: string | null = null;
    if (!isPreview) {
      const activeKey = await getActiveAiApiKey();
      latestOpenAiApiKey = activeKey?.provider === 'openai' ? activeKey.key : null;
      latestGeminiApiKey = activeKey?.provider === 'google' ? activeKey.key : null;
      setApiKey(activeKey?.key ?? null);
    }

    const latestApiKey = latestOpenAiApiKey ?? latestGeminiApiKey;
    if (aiRows.length > 0 && !latestApiKey) {
      setLocalError(missingApiKeyMessage);
      return;
    }

    setGenerating(true);
    setLocalError(null);
    try {
      let aiSchedule = aiRows.map((row, index) => ({
        title: row.title.trim(),
        durationMinutes: initialState.previewTasks[index]?.durationMinutes ?? 45,
        startTime: formatInputTime(
          initialState.previewTasks[index]?.startTime ??
            planningDefaults?.preferredStart ??
            getRoundedStartTime(effectiveNow),
        ),
      }));

      if (aiRows.length > 0 && !isPreview) {
        const onboardingProfile = await getOnboardingProfile();
        const formattedProfile = formatOnboardingProfileForPrompt(onboardingProfile);
        const scheduleContext = getProfileSchedulingContext(
          onboardingProfile,
          schedulingContext,
          formattedProfile,
        );
        const scheduleTasks = aiRows.map((row) => ({
          title: row.title.trim(),
          description: row.description?.trim() || null,
          estimatedDurationMinutes: row.estimatedDurationMinutes ?? null,
        }));
        aiSchedule = latestOpenAiApiKey
          ? await generateScheduleFromText(latestOpenAiApiKey, scheduleTasks, scheduleContext)
          : await generateGeminiScheduleFromText(
              latestGeminiApiKey ?? '',
              scheduleTasks,
              scheduleContext,
            );
      }

      previewStore.writeTasks(
        buildHybridPreview(rows, aiSchedule, {
          existingTasks: getExistingTasks(),
          context: schedulingContext,
          preferredStart: planningDefaults?.preferredStart ?? getRoundedStartTime(effectiveNow),
        }),
      );
      cachedPreviewSignatureRef.current = previewInputSignature;
      setPreviewVisible(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to generate a schedule.');
    } finally {
      setGenerating(false);
    }
  };

  const onSubmit = () => {
    const hasAiRows = committedTitledRows.some((row) => row.aiScheduled);
    if (!hasAiRows) {
      return saveManualSchedule();
    }

    const hasCachedPreview =
      previewTasks.length > 0 && cachedPreviewSignatureRef.current === previewInputSignature;
    if (hasCachedPreview) {
      setPreviewVisible(true);
      return;
    }

    return generateHybridSchedule();
  };

  return {
    apiKeyPresent: Boolean(apiKey),
    aiAvailable,
    generating,
    localError,
    storeError: activeStoreError,
    loading: activeLoading,
    isSubmitting: generating || loading,
    previewTasks,
    showingPreview,
    canSubmit: committedTitledRows.length > 0 && !generating && !activeLoading,
    canConfirmPreview,
    selectedRowAiScheduled,
    draftAiScheduled,
    planningDayKey,
    setPlanningDayKey,
    planningDay,
    schedulingContext,
    isFuturePlanningDay: isFuturePlanningDay(planningDay, effectiveNow),
    effectiveNow,
    onDismissError: previewStore.dismissError,
    onToggleRowAiScheduled: toggleRowAiScheduled,
    onSubmit,
    onClearPreview: previewStore.clear,
    onChangePreviewTitle: previewStore.updateTitle,
    onChangePreviewDuration: (taskId: string, rawValue: string) => {
      const duration = Math.max(10, Number(rawValue.replace(/[^0-9]/g, '')) || 10);
      previewStore.updateDuration(taskId, duration);
    },
    onConfirm: previewStore.confirm,
    taskRows: taskInput.taskRows,
    selectedTaskId: taskInput.selectedTaskId,
    selectedTaskStart: taskInput.selectedTaskStart,
    selectedTaskEnd: taskInput.selectedTaskEnd,
    selectedTaskDuration: taskInput.selectedTaskDuration,
    selectedTimeInputMode: taskInput.selectedTimeInputMode,
    selectedTaskDescription: taskInput.expandedTask?.description ?? null,
    selectedTaskEstimatedDuration: taskInput.expandedTask?.estimatedDurationMinutes ?? null,
    selectedTimeValidation: taskInput.selectedTimeValidation,
    onSelectTaskRow: taskInput.selectTaskRow,
    onChangeTaskTitle: taskInput.changeTaskTitle,
    onCommitTitleMemory: taskInput.commitTitleMemory,
    onAddTaskRow: taskInput.addTaskRow,
    onRemoveSelectedTaskRow: taskInput.removeSelectedTaskRow,
    onSelectQuickAdd: taskInput.selectQuickAdd,
    onChangeSelectedStart: taskInput.changeSelectedStart,
    onChangeSelectedEnd: taskInput.changeSelectedEnd,
    onChangeSelectedDuration: taskInput.changeSelectedDuration,
    onChangeSelectedTimeInputMode: taskInput.changeSelectedTimeInputMode,
    onChangeDescription: (value: string) => {
      const row = taskInput.expandedTask;
      if (row) taskInput.changeDescription(row.id, value);
    },
    onChangeEstimatedDuration: (minutes: number) => {
      const row = taskInput.expandedTask;
      if (row) taskInput.changeEstimatedDuration(row.id, minutes > 0 ? minutes : null);
    },
    onCancelTaskTimeEdit: taskInput.cancelTaskTimeEdit,
    onConfirmTaskTimeEdit: taskInput.confirmTaskTimeEdit,
  };
}
