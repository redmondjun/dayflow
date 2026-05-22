import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { makeGeneratedPreviewTasks } from '../dev-preview/mockData';
import { getGeminiApiKey, getOpenAIApiKey } from '../services/apiKey';
import { generateGeminiScheduleFromText } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { generateScheduleFromText } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import type { GeneratedTaskPreview } from '../types/task';
import { makeSequentialPreview } from '../utils/scheduling';
import { addMinutes, formatInputTime, parseTimeInput } from '../utils/time';

export type TaskInputRow = {
  id: string;
  title: string;
};

type UseAIScheduleStateArgs = {
  isPreview: boolean;
  scenarioId?: string;
  onComplete: () => void;
};

type PreviewSeed = {
  apiKey: string | null;
  localError: string | null;
  taskRows: TaskInputRow[];
  startTime: string;
  previewTasks: GeneratedTaskPreview[];
};

function createTaskInputRow(title = ''): TaskInputRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    title,
  };
}

function getRoundedStartTime(): string {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return formatInputTime(date);
}

const previewSeedFactories: Record<string, () => PreviewSeed> = {
  default: () => ({
    apiKey: null,
    localError: null,
    taskRows: [createTaskInputRow()],
    startTime: getRoundedStartTime(),
    previewTasks: [],
  }),
  'ai-no-key': () => ({
    apiKey: null,
    localError: 'Add an OpenAI or Gemini API key in Settings first.',
    taskRows: [
      createTaskInputRow('Study React'),
      createTaskInputRow('Gym'),
      createTaskInputRow('Groceries'),
    ],
    startTime: '09:00',
    previewTasks: [],
  }),
  'ai-empty-list': () => ({
    apiKey: 'preview-key',
    localError: null,
    taskRows: [createTaskInputRow('')],
    startTime: '09:00',
    previewTasks: [],
  }),
  'ai-preview': () => ({
    apiKey: 'preview-key',
    localError: null,
    taskRows: [
      createTaskInputRow('Study React'),
      createTaskInputRow('Gym'),
      createTaskInputRow('Groceries'),
    ],
    startTime: '09:00',
    previewTasks: makeGeneratedPreviewTasks(),
  }),
};

function getPreviewSeed(scenarioId?: string) {
  return (previewSeedFactories[scenarioId ?? 'default'] ?? previewSeedFactories.default)();
}

function getGenerateDisabledReason({
  apiKeyPresent,
  taskCount,
  startTimeValid,
  generating,
}: {
  apiKeyPresent: boolean;
  taskCount: number;
  startTimeValid: boolean;
  generating: boolean;
}): string | null {
  if (generating) return 'Generating your schedule...';
  if (!apiKeyPresent) return 'Add an OpenAI or Gemini API key in Settings first.';
  if (taskCount === 0) return 'Add at least one task to schedule.';
  if (!startTimeValid) return 'Use a valid 24-hour start time like 09:00.';
  return null;
}

function reflowPreviewTasks(tasks: GeneratedTaskPreview[]): GeneratedTaskPreview[] {
  if (tasks.length === 0) return tasks;

  let cursor = tasks[0].startTime;
  return tasks.map((task) => {
    const start = cursor;
    const end = addMinutes(start, task.durationMinutes);
    cursor = addMinutes(end, 5);
    return { ...task, startTime: start, endTime: end };
  });
}

function applyPreviewDuration(tasks: GeneratedTaskPreview[], taskId: string, duration: number) {
  return reflowPreviewTasks(
    tasks.map((task) => (task.id === taskId ? { ...task, durationMinutes: duration } : task)),
  );
}

function applyPreviewTitle(tasks: GeneratedTaskPreview[], taskId: string, title: string) {
  return tasks.map((task) => (task.id === taskId ? { ...task, title } : task));
}

export function useAIScheduleState({ isPreview, scenarioId, onComplete }: UseAIScheduleStateArgs) {
  const isFocused = useIsFocused();
  const previewSeed = getPreviewSeed(scenarioId);
  const [apiKey, setApiKey] = useState<string | null>(previewSeed.apiKey);
  const [taskRows, setTaskRows] = useState<TaskInputRow[]>(previewSeed.taskRows);
  const [startTime, setStartTime] = useState(previewSeed.startTime);
  const [generating, setGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(previewSeed.localError);
  const [localPreviewTasks, setLocalPreviewTasks] = useState<GeneratedTaskPreview[]>(
    previewSeed.previewTasks,
  );

  const {
    previewTasks: storePreviewTasks,
    setPreviewTasks,
    updatePreviewTask,
    clearPreviewTasks,
    confirmPreviewTasks,
    error: storeError,
    clearError,
    loading,
  } = useTaskStore();

  useEffect(() => {
    if (!isPreview || !scenarioId) return;

    const nextSeed = getPreviewSeed(scenarioId);
    setApiKey(nextSeed.apiKey);
    setTaskRows(nextSeed.taskRows);
    setStartTime(nextSeed.startTime);
    setGenerating(false);
    setLocalError(nextSeed.localError);
    setLocalPreviewTasks(nextSeed.previewTasks);
  }, [isPreview, scenarioId]);

  useEffect(() => {
    if (isPreview || !isFocused) return;

    Promise.all([getOpenAIApiKey(), getGeminiApiKey()])
      .then(([nextOpenAiApiKey, nextGeminiApiKey]) => {
        setApiKey(nextOpenAiApiKey ?? nextGeminiApiKey);
      })
      .catch(() => {
        setApiKey(null);
      });
  }, [isPreview, isFocused]);

  useEffect(() => {
    if (isPreview) return undefined;

    return () => clearPreviewTasks();
  }, [clearPreviewTasks, isPreview]);

  const previewTasks = isPreview ? localPreviewTasks : storePreviewTasks;
  const activeStoreError = isPreview ? null : storeError;
  const activeLoading = isPreview ? false : loading;
  const parsedStartTime = parseTimeInput(startTime);
  const taskTitles = taskRows.map((task) => task.title.trim()).filter(Boolean);
  const generateDisabledReason = getGenerateDisabledReason({
    apiKeyPresent: Boolean(apiKey),
    taskCount: taskTitles.length,
    startTimeValid: Boolean(parsedStartTime),
    generating,
  });
  const canGenerate = !generateDisabledReason;
  const canConfirmPreview =
    previewTasks.length > 0 &&
    previewTasks.every((task) => task.title.trim() && task.durationMinutes >= 10);
  const previewStore = isPreview
    ? {
        tasks: localPreviewTasks,
        writeTasks: setLocalPreviewTasks,
        updateTitle: (taskId: string, title: string) =>
          setLocalPreviewTasks((tasks) => applyPreviewTitle(tasks, taskId, title)),
        updateDuration: (taskId: string, duration: number) =>
          setLocalPreviewTasks((tasks) => applyPreviewDuration(tasks, taskId, duration)),
        clear: () => setLocalPreviewTasks([]),
        confirm: async () => {
          onComplete();
        },
        dismissError: () => setLocalError(null),
      }
    : {
        tasks: storePreviewTasks,
        writeTasks: setPreviewTasks,
        updateTitle: (taskId: string, title: string) => updatePreviewTask(taskId, { title }),
        updateDuration: (taskId: string, duration: number) =>
          setPreviewTasks(
            applyPreviewDuration(useTaskStore.getState().previewTasks, taskId, duration),
          ),
        clear: clearPreviewTasks,
        confirm: async () => {
          await confirmPreviewTasks();
          onComplete();
        },
        dismissError: () => {
          setLocalError(null);
          clearError();
        },
      };

  const updateTaskTitle = (taskId: string, title: string) => {
    setTaskRows((rows) => rows.map((row) => (row.id === taskId ? { ...row, title } : row)));
  };

  const addTaskRow = () => {
    setTaskRows((rows) => [...rows, createTaskInputRow()]);
  };

  const removeTaskRow = (taskId: string) => {
    setTaskRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== taskId);
      return nextRows.length > 0 ? nextRows : [createTaskInputRow()];
    });
  };

  const generate = async () => {
    const latestOpenAiApiKey = isPreview ? apiKey : await getOpenAIApiKey();
    const latestGeminiApiKey = isPreview ? null : await getGeminiApiKey();
    const latestApiKey = latestOpenAiApiKey ?? latestGeminiApiKey;
    if (!isPreview) setApiKey(latestApiKey);

    if (!latestApiKey) {
      setLocalError('Add an OpenAI or Gemini API key in Settings first.');
      return;
    }
    if (!parsedStartTime) {
      setLocalError('Use 24-hour start time like 09:00.');
      return;
    }

    setGenerating(true);
    setLocalError(null);
    try {
      if (isPreview) {
        const mockTasks = makeGeneratedPreviewTasks();
        const seededTasks = taskTitles.map((title, index) => ({
          title,
          durationMinutes: mockTasks[index]?.durationMinutes ?? 45,
        }));
        previewStore.writeTasks(makeSequentialPreview(seededTasks, parsedStartTime));
      } else {
        const onboardingProfile = await getOnboardingProfile();
        const formattedProfile = formatOnboardingProfileForPrompt(onboardingProfile);
        const generated = latestOpenAiApiKey
          ? await generateScheduleFromText(latestOpenAiApiKey, taskTitles, formattedProfile)
          : await generateGeminiScheduleFromText(
              latestGeminiApiKey ?? '',
              taskTitles,
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

  const updatePreviewDuration = (taskId: string, rawValue: string) => {
    const duration = Math.max(10, Number(rawValue.replace(/[^0-9]/g, '')) || 10);
    previewStore.updateDuration(taskId, duration);
  };

  const updatePreviewTitle = (taskId: string, title: string) => {
    previewStore.updateTitle(taskId, title);
  };

  const clearPreview = () => {
    previewStore.clear();
  };

  const confirm = async () => {
    await previewStore.confirm();
  };

  const dismissError = () => {
    previewStore.dismissError();
  };

  return {
    apiKeyPresent: Boolean(apiKey),
    taskRows,
    startTime,
    generating,
    localError,
    storeError: activeStoreError,
    loading: activeLoading,
    previewTasks,
    canGenerate,
    generateStatus: generateDisabledReason ?? 'Ready to generate a schedule.',
    canConfirmPreview,
    onDismissError: dismissError,
    onChangeTaskTitle: updateTaskTitle,
    onAddTaskRow: addTaskRow,
    onRemoveTaskRow: removeTaskRow,
    onChangeStartTime: setStartTime,
    onGenerate: generate,
    onClearPreview: clearPreview,
    onChangePreviewTitle: updatePreviewTitle,
    onChangePreviewDuration: updatePreviewDuration,
    onConfirm: confirm,
  };
}
