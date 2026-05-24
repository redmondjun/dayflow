import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { createTaskPlanningPreviewStore } from '../features/taskPlanning/previewStore';
import {
  getRoundedStartTime,
  getTaskPlanningPreviewSeed,
  missingApiKeyMessage,
  serializeTaskRowsForPreview,
  sortTaskInputs,
} from '../features/taskPlanning';
import {
  findNextAvailableSlot,
  validateManualTaskTimes,
} from '../features/taskPlanning/scheduling';
import {
  getTaskPlanningDefaultsFromProfile,
  type TaskPlanningDefaults,
} from '../features/taskPlanning/profileDefaults';
import { useTaskInputRows } from '../hooks/useTaskInputRows';
import { getAiFeaturesEnabled, getGeminiApiKey, getOpenAIApiKey } from '../services/apiKey';
import { getEffectiveNow, useDevDemoState } from '../services/devDemo';
import { generateGeminiScheduleFromText } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { generateScheduleFromText } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import type { GeneratedTaskPreview, NewTaskInput, TaskInputRow } from '../types/task';
import { buildHybridPreview } from '../utils/scheduling';
import { parseTimeInput } from '../utils/time';

type UseAIScheduleStateArgs = {
  isPreview: boolean;
  scenarioId?: string;
  onComplete: () => void;
  initialDraftAiScheduled?: boolean;
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
  initialAiEnabled,
  autoOpenDraft = false,
}: UseAIScheduleStateArgs) {
  const initialDraftAiScheduled = initialAiEnabled ?? initialDraftAiScheduledProp;
  const isFocused = useIsFocused();
  const { nowOverride } = useDevDemoState();
  const effectiveNow = useMemo(() => getEffectiveNow(), [nowOverride]);
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
    isPreview ? getTaskPlanningDefaultsFromProfile(null) : null,
  );

  const aiAvailable = Boolean(apiKey) && aiFeaturesEnabled;
  const defaultDraftAiScheduled = isPreview ? initialState.initialDraftAiScheduled : aiAvailable;

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
    return useTaskStore.getState().todayTasks(effectiveNow);
  }, [effectiveNow, isPreview]);

  const { setTaskRows, setSelectedTaskId, updateTaskRow, ...taskInput } = useTaskInputRows({
    initialRows: initialState.taskRows,
    initialSelectedTaskId: initialState.selectedTaskId,
    defaultDraftAiScheduled,
    getExistingTasks,
    planningDefaults: planningDefaults ?? undefined,
    now: effectiveNow,
  });

  const didAutoOpenDraft = useRef(false);

  useEffect(() => {
    if (isPreview) return;

    let mounted = true;
    getOnboardingProfile()
      .then((profile) => {
        if (!mounted) return;
        setPlanningDefaults(getTaskPlanningDefaultsFromProfile(profile, effectiveNow));
      })
      .catch(() => {
        if (!mounted) return;
        setPlanningDefaults(getTaskPlanningDefaultsFromProfile(null, effectiveNow));
      });

    return () => {
      mounted = false;
    };
  }, [effectiveNow, isPreview]);

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

    Promise.all([getOpenAIApiKey(), getGeminiApiKey(), getAiFeaturesEnabled()])
      .then(([nextOpenAiApiKey, nextGeminiApiKey, nextAiFeaturesEnabled]) => {
        setApiKey(nextOpenAiApiKey ?? nextGeminiApiKey);
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
    () => serializeTaskRowsForPreview(taskInput.titledRows),
    [taskInput.titledRows],
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
      updateTaskRow(row.id, { aiScheduled: true, startTime: '', endTime: '' });
      return;
    }

    const slot = findNextAvailableSlot({
      existingTasks: getExistingTasks(),
      plannerRows: taskInput.committedRows.filter((committed) => committed.id !== row.id),
      preferredStart: planningDefaults?.preferredStart,
      durationMinutes: planningDefaults?.durationMinutes,
      now: effectiveNow,
    });
    updateTaskRow(row.id, {
      aiScheduled: false,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const saveManualSchedule = async () => {
    const manualRows = taskInput.titledRows.filter((row) => !row.aiScheduled);
    if (manualRows.length === 0) {
      setLocalError('Add at least one task first.');
      return;
    }

    const inputs: NewTaskInput[] = [];
    const existingTasks = getExistingTasks();
    for (const task of manualRows) {
      const start = parseTimeInput(task.startTime, effectiveNow);
      const end = parseTimeInput(task.endTime, effectiveNow);
      const validation = validateManualTaskTimes(task.startTime, task.endTime, effectiveNow, {
        existingTasks,
        plannerRows: manualRows,
        excludeRowId: task.id,
      });
      if (!start || !end || validation.error) {
        setLocalError(validation.error ?? 'Each task needs a valid start and end time.');
        return;
      }
      inputs.push({
        title: task.title,
        startTime: start,
        endTime: end,
        aiGenerated: false,
        status: validation.willMarkCompleted ? 'completed' : 'scheduled',
      });
    }

    setLocalError(null);
    await addTasks(sortTaskInputs(inputs));
    onComplete();
  };

  const generateHybridSchedule = async () => {
    const rows = taskInput.titledRows;
    const aiRows = rows.filter((row) => row.aiScheduled);
    const manualRows = rows.filter((row) => !row.aiScheduled);

    if (rows.length === 0) {
      setLocalError('Add at least one task first.');
      return;
    }

    const existingTasks = getExistingTasks();
    for (const task of manualRows) {
      const validation = validateManualTaskTimes(task.startTime, task.endTime, effectiveNow, {
        existingTasks,
        plannerRows: manualRows,
        excludeRowId: task.id,
      });
      if (validation.error) {
        setLocalError(validation.error);
        return;
      }
    }

    const latestOpenAiApiKey = isPreview ? apiKey : await getOpenAIApiKey();
    const latestGeminiApiKey = isPreview ? null : await getGeminiApiKey();
    const latestApiKey = latestOpenAiApiKey ?? latestGeminiApiKey;
    if (!isPreview) setApiKey(latestApiKey);

    if (aiRows.length > 0 && !latestApiKey) {
      setLocalError(missingApiKeyMessage);
      return;
    }

    setGenerating(true);
    setLocalError(null);
    try {
      let aiDurations = aiRows.map((row, index) => ({
        title: row.title.trim(),
        durationMinutes: initialState.previewTasks[index]?.durationMinutes ?? 45,
      }));

      if (aiRows.length > 0 && !isPreview) {
        const onboardingProfile = await getOnboardingProfile();
        const formattedProfile = formatOnboardingProfileForPrompt(onboardingProfile);
        const titles = aiRows.map((row) => row.title.trim());
        aiDurations = latestOpenAiApiKey
          ? await generateScheduleFromText(latestOpenAiApiKey, titles, formattedProfile)
          : await generateGeminiScheduleFromText(
              latestGeminiApiKey ?? '',
              titles,
              formattedProfile,
            );
      }

      previewStore.writeTasks(
        buildHybridPreview(rows, aiDurations, {
          existingTasks,
          now: effectiveNow,
          preferredStart: planningDefaults?.preferredStart ?? getRoundedStartTime(),
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
    const hasAiRows = taskInput.titledRows.some((row) => row.aiScheduled);
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
    previewTasks,
    showingPreview,
    canSubmit: taskInput.titledRows.length > 0 && !generating && !activeLoading,
    canConfirmPreview,
    selectedRowAiScheduled,
    draftAiScheduled,
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
    selectedTimeValidation: taskInput.selectedTimeValidation,
    onSelectTaskRow: taskInput.selectTaskRow,
    onChangeTaskTitle: taskInput.changeTaskTitle,
    onAddTaskRow: taskInput.addTaskRow,
    onRemoveSelectedTaskRow: taskInput.removeSelectedTaskRow,
    onSelectQuickAdd: taskInput.selectQuickAdd,
    onChangeSelectedStart: taskInput.changeSelectedStart,
    onChangeSelectedEnd: taskInput.changeSelectedEnd,
    onCancelTaskTimeEdit: taskInput.cancelTaskTimeEdit,
    onConfirmTaskTimeEdit: taskInput.confirmTaskTimeEdit,
  };
}
