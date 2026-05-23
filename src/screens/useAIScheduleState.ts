import { useEffect, useState } from 'react';
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

type UseAIScheduleStateArgs = {
  isPreview: boolean;
  scenarioId?: string;
  onComplete: () => void;
  initialAiEnabled?: boolean;
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
}: UseAIScheduleStateArgs) {
  const isFocused = useIsFocused();
  const initialState = isPreview ? getTaskPlanningPreviewSeed(scenarioId) : getLiveCreateState();
  const [apiKey, setApiKey] = useState<string | null>(initialState.apiKey);
  const [aiEnabled, setAiEnabled] = useState(initialAiEnabled ?? initialState.aiEnabled);
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(initialState.localError);
  const [localPreviewTasks, setLocalPreviewTasks] = useState(initialState.previewTasks);

  const { setTaskRows, setSelectedTaskId, ...taskInput } = useTaskInputRows({
    initialRows: initialState.taskRows,
    initialSelectedTaskId: initialState.selectedTaskId,
  });

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
    for (const task of taskInput.titledRows) {
      const start = parseTimeInput(task.startTime);
      const end = parseTimeInput(task.endTime);
      if (!start || !end || new Date(end).getTime() <= new Date(start).getTime()) {
        setLocalError('Each task needs a valid start and end time.');
        return;
      }
      inputs.push({ title: task.title, startTime: start, endTime: end, aiGenerated: false });
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

    const parsedStartTime = parseTimeInput(firstScheduledStart);
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
