import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { createTaskPlanningPreviewStore } from '../features/taskPlanning/previewStore';
import {
  getRoundedStartTime,
  getTaskPlanningPreviewSeed,
  missingApiKeyMessage,
  sortTaskInputs,
} from '../features/taskPlanning';
import { useTaskInputRows } from '../hooks/useTaskInputRows';
import { getGeminiApiKey, getOpenAIApiKey } from '../services/apiKey';
import { getEffectiveNow, useDevDemoState } from '../services/devDemo';
import { generateGeminiScheduleFromText } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { generateScheduleFromText } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import type { GeneratedTaskPreview, NewTaskInput, TaskInputRow } from '../types/task';
import { makeSequentialPreview } from '../utils/scheduling';
import { parseTimeInput } from '../utils/time';
import { validateManualTaskTimes } from '../features/taskPlanning/scheduling';
import {
  getTaskPlanningDefaultsFromProfile,
  type TaskPlanningDefaults,
} from '../features/taskPlanning/profileDefaults';

type UseAIScheduleStateArgs = {
  isPreview: boolean;
  scenarioId?: string;
  onComplete: () => void;
  initialAiEnabled?: boolean;
  autoOpenDraft?: boolean;
};

function getLiveCreateState() {
  return {
    apiKey: null as string | null,
    localError: null as string | null,
    aiEnabled: false,
    taskRows: [] as TaskInputRow[],
    selectedTaskId: null as string | null,
    previewTasks: [] as GeneratedTaskPreview[],
  };
}

export function useAIScheduleState({
  isPreview,
  scenarioId,
  onComplete,
  initialAiEnabled,
  autoOpenDraft = false,
}: UseAIScheduleStateArgs) {
  const isFocused = useIsFocused();
  const { nowOverride } = useDevDemoState();
  const effectiveNow = useMemo(() => getEffectiveNow(), [nowOverride]);
  const initialState = isPreview ? getTaskPlanningPreviewSeed(scenarioId) : getLiveCreateState();
  const [apiKey, setApiKey] = useState<string | null>(initialState.apiKey);
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled ?? initialState.aiEnabled);
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(initialState.localError);
  const [localPreviewTasks, setLocalPreviewTasks] = useState(initialState.previewTasks);
  const [planningDefaults, setPlanningDefaults] = useState<TaskPlanningDefaults | null>(
    isPreview ? getTaskPlanningDefaultsFromProfile(null) : null,
  );

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

  const manualScheduling = !aiEnabled;
  const getExistingTasks = useCallback(() => {
    if (isPreview) return [];
    return useTaskStore.getState().todayTasks(effectiveNow);
  }, [effectiveNow, isPreview]);

  const { setTaskRows, setSelectedTaskId, ...taskInput } = useTaskInputRows({
    initialRows: initialState.taskRows,
    initialSelectedTaskId: initialState.selectedTaskId,
    manualScheduling,
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
    if (!isPreview && planningDefaults === null) return;
    didAutoOpenDraft.current = true;
    taskInput.addTaskRow();
  }, [autoOpenDraft, isPreview, planningDefaults, taskInput.addTaskRow]);

  useEffect(() => {
    if (!isPreview || !scenarioId) return;

    const nextSeed = getTaskPlanningPreviewSeed(scenarioId);
    setApiKey(nextSeed.apiKey);
    setAiEnabled(initialAiEnabled ?? nextSeed.aiEnabled);
    setTaskRows(nextSeed.taskRows);
    setSelectedTaskId(nextSeed.selectedTaskId);
    setGenerating(false);
    setLocalError(nextSeed.localError);
    setLocalPreviewTasks(nextSeed.previewTasks);
  }, [initialAiEnabled, isPreview, scenarioId]);

  useEffect(() => {
    if (isPreview || !isFocused) return;

    Promise.all([getOpenAIApiKey(), getGeminiApiKey()])
      .then(([nextOpenAiApiKey, nextGeminiApiKey]) => {
        setApiKey(nextOpenAiApiKey ?? nextGeminiApiKey);
      })
      .catch(() => setApiKey(null));
  }, [isFocused, isPreview]);

  useEffect(() => {
    if (isPreview) return undefined;
    return () => clearPreviewTasks();
  }, [clearPreviewTasks, isPreview]);

  const previewStore = createTaskPlanningPreviewStore({
    isPreview,
    localPreviewTasks,
    storePreviewTasks,
    setLocalPreviewTasks,
    setLocalError,
    onComplete,
    setPreviewTasks,
    updatePreviewTask,
    clearPreviewTasks,
    confirmPreviewTasks,
    clearError,
  });

  const previewTasks = isPreview ? localPreviewTasks : storePreviewTasks;
  const activeStoreError = isPreview ? null : storeError;
  const activeLoading = isPreview ? false : loading;
  const firstScheduledStart =
    taskInput.expandedTask?.startTime ||
    taskInput.titledRows[0]?.startTime ||
    planningDefaults?.preferredStart ||
    getRoundedStartTime();
  const canConfirmPreview =
    previewTasks.length > 0 &&
    previewTasks.every((task) => task.title.trim() && task.durationMinutes >= 10);

  const saveManualSchedule = async () => {
    if (taskInput.titledRows.length === 0) {
      setLocalError('Add at least one task first.');
      return;
    }

    const inputs: NewTaskInput[] = [];
    const existingTasks = getExistingTasks();
    for (const task of taskInput.titledRows) {
      const start = parseTimeInput(task.startTime, effectiveNow);
      const end = parseTimeInput(task.endTime, effectiveNow);
      const validation = validateManualTaskTimes(task.startTime, task.endTime, effectiveNow, {
        existingTasks,
        plannerRows: taskInput.titledRows,
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

  const generateSchedule = async () => {
    const latestOpenAiApiKey = isPreview ? apiKey : await getOpenAIApiKey();
    const latestGeminiApiKey = isPreview ? null : await getGeminiApiKey();
    const latestApiKey = latestOpenAiApiKey ?? latestGeminiApiKey;
    if (!isPreview) setApiKey(latestApiKey);

    if (!latestApiKey) {
      setLocalError(missingApiKeyMessage);
      return;
    }
    if (taskInput.titledRows.length === 0) {
      setLocalError('Add at least one task first.');
      return;
    }

    const parsedStartTime = parseTimeInput(firstScheduledStart, effectiveNow);
    if (!parsedStartTime) {
      setLocalError('Use a valid start time before generating.');
      return;
    }

    setGenerating(true);
    setLocalError(null);
    try {
      if (isPreview) {
        previewStore.writeTasks(
          makeSequentialPreview(
            taskInput.titledRows.map((task, index) => ({
              title: task.title.trim(),
              durationMinutes: initialState.previewTasks[index]?.durationMinutes ?? 45,
            })),
            parsedStartTime,
          ),
        );
      } else {
        const onboardingProfile = await getOnboardingProfile();
        const formattedProfile = formatOnboardingProfileForPrompt(onboardingProfile);
        const titles = taskInput.titledRows.map((task) => task.title.trim());
        const generated = latestOpenAiApiKey
          ? await generateScheduleFromText(latestOpenAiApiKey, titles, formattedProfile)
          : await generateGeminiScheduleFromText(
              latestGeminiApiKey ?? '',
              titles,
              formattedProfile,
            );
        previewStore.writeTasks(makeSequentialPreview(generated, parsedStartTime));
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to generate a schedule.');
    } finally {
      setGenerating(false);
    }
  };

  return {
    apiKeyPresent: Boolean(apiKey),
    aiEnabled,
    generating,
    localError,
    storeError: activeStoreError,
    loading: activeLoading,
    previewTasks,
    canSubmit: taskInput.titledRows.length > 0 && !generating && !activeLoading,
    canConfirmPreview,
    onDismissError: previewStore.dismissError,
    onToggleAiEnabled: setAiEnabled,
    onSubmit: () => (aiEnabled ? generateSchedule() : saveManualSchedule()),
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
