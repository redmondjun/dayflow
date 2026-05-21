import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  addMinutes,
  formatDisplayDate,
  formatDuration,
  formatInputTime,
  getCurrentTask,
  getUpcomingTasks,
  parseTimeInput,
} from '../utils/time';
import type { RootStackParamList } from '../navigation/types';
import type { GeneratedTaskPreview, Task, TaskStatus } from '../types/task';
import { HomeScreenView } from '../views/HomeScreenView';
import { TaskFormView } from '../views/TaskFormView';
import { AIScheduleView } from '../views/AIScheduleView';
import { SettingsView } from '../views/SettingsView';
import { WeeklyInsightView } from '../views/WeeklyInsightView';
import { OnboardingPreview } from './OnboardingPreview';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';
import {
  buildMockTask,
  makeActiveDayTasks,
  makeCompletedHeavyTasks,
  makeGeneratedPreviewTasks,
} from './mockData';
import { previewScenarios } from './scenarios';

type Props = NativeStackScreenProps<RootStackParamList, 'PreviewScenario'>;

export function PreviewScenarioScreen({ navigation, route }: Props) {
  const scenario = previewScenarios.find((item) => item.id === route.params.scenarioId);

  if (!scenario) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="text-lg font-semibold text-ink">Unknown preview scenario.</Text>
      </View>
    );
  }

  if (scenario.id.startsWith('home-')) {
    return <HomePreview scenarioId={scenario.id} onBack={() => navigation.goBack()} />;
  }

  if (scenario.id === 'onboarding') {
    return <OnboardingPreview onExit={() => navigation.goBack()} />;
  }

  if (scenario.id.startsWith('task-')) {
    return <TaskFormPreview scenarioId={scenario.id} onBack={() => navigation.goBack()} />;
  }

  if (scenario.id.startsWith('ai-')) {
    return <AiSchedulePreview scenarioId={scenario.id} onBack={() => navigation.goBack()} />;
  }

  if (scenario.id.startsWith('weekly-')) {
    return <WeeklyInsightPreview scenarioId={scenario.id} onBack={() => navigation.goBack()} />;
  }

  return (
    <SettingsPreview
      onBack={() => navigation.goBack()}
      onOpenPreviewCatalog={() => navigation.goBack()}
    />
  );
}

function HomePreview({ scenarioId, onBack }: { scenarioId: string; onBack: () => void }) {
  const [tasks, setTasks] = useState<Task[]>(
    scenarioId === 'home-empty'
      ? []
      : scenarioId === 'home-completed'
        ? makeCompletedHeavyTasks()
        : makeActiveDayTasks(),
  );
  const date = formatDisplayDate(new Date());
  const current = getCurrentTask(tasks);
  const next = getUpcomingTasks(tasks)[0];

  return (
    <HomeScreenView
      weekday={date.weekday}
      dayMonth={date.dayMonth}
      tasks={tasks}
      currentTask={current}
      nextTask={next}
      loading={false}
      error={null}
      onDismissError={() => {}}
      onRefresh={() => {}}
      onPressTask={() => {}}
      onCompleteCurrent={
        current
          ? () =>
              setTasks((value) =>
                value.map((task) =>
                  task.id === current.id ? { ...task, status: 'completed' } : task,
                ),
              )
          : undefined
      }
      onSkipCurrent={
        current
          ? () =>
              setTasks((value) =>
                value.map((task) =>
                  task.id === current.id ? { ...task, status: 'skipped' } : task,
                ),
              )
          : undefined
      }
      onCreateTask={onBack}
      onOpenAiSchedule={onBack}
      onOpenSettings={onBack}
    />
  );
}

function TaskFormPreview({ scenarioId, onBack }: { scenarioId: string; onBack: () => void }) {
  const editPreviewStart = new Date(2026, 3, 28, 11, 30);
  const editPreviewEnd = new Date(2026, 3, 28, 12, 45);
  const existing =
    scenarioId === 'task-edit'
      ? buildMockTask(
          'Design review',
          editPreviewStart.toISOString(),
          editPreviewEnd.toISOString(),
          'scheduled',
        )
      : null;
  const previewPreviousTask = existing
    ? buildMockTask(
        'Coffee & walk',
        new Date(2026, 3, 28, 10, 30).toISOString(),
        new Date(2026, 3, 28, 11, 0).toISOString(),
        'completed',
      )
    : undefined;
  const previewNextTask = existing
    ? buildMockTask(
        'Lunch',
        new Date(2026, 3, 28, 13, 0).toISOString(),
        new Date(2026, 3, 28, 13, 45).toISOString(),
        'scheduled',
      )
    : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [start, setStart] = useState(
    existing ? formatInputTime(existing.startTime) : formatInputTime(new Date()),
  );
  const [end, setEnd] = useState(
    existing ? formatInputTime(existing.endTime) : formatInputTime(addMinutes(new Date(), 45)),
  );
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'scheduled');
  const parsedStart = parseTimeInput(start, existing ? new Date(existing.startTime) : new Date());
  const parsedEnd = parseTimeInput(end, existing ? new Date(existing.endTime) : new Date());
  const validation = !title.trim()
    ? 'Title is required.'
    : !parsedStart || !parsedEnd
      ? 'Use 24-hour time like 09:30.'
      : new Date(parsedEnd).getTime() <= new Date(parsedStart).getTime()
        ? 'End time must be after start time.'
        : null;
  const durationLabel =
    parsedStart && parsedEnd
      ? formatDuration(
          Math.round((new Date(parsedEnd).getTime() - new Date(parsedStart).getTime()) / 60000),
        )
      : '0m';

  return (
    <TaskFormView
      mode={existing ? 'edit' : 'create'}
      title={title}
      start={start}
      end={end}
      status={status}
      durationLabel={durationLabel}
      dayLabel={existing ? 'Tue · Apr 28' : undefined}
      previousTask={previewPreviousTask}
      nextTask={previewNextTask}
      validation={validation}
      loading={false}
      error={null}
      onDismissError={() => {}}
      onChangeTitle={setTitle}
      onChangeStart={setStart}
      onChangeEnd={setEnd}
      onChangeStatus={setStatus}
      onCancel={onBack}
      onSave={onBack}
      onDelete={existing ? onBack : undefined}
    />
  );
}

function AiSchedulePreview({ scenarioId, onBack }: { scenarioId: string; onBack: () => void }) {
  const [taskRows, setTaskRows] = useState(() =>
    scenarioId === 'ai-empty-list'
      ? [{ id: 'preview-task-1', title: '' }]
      : [
          { id: 'preview-task-1', title: 'Study React' },
          { id: 'preview-task-2', title: 'Gym' },
          { id: 'preview-task-3', title: 'Groceries' },
        ],
  );
  const [startTime, setStartTime] = useState('09:00');
  const [previewTasks, setPreviewTasks] = useState<GeneratedTaskPreview[]>(
    scenarioId === 'ai-preview' ? makeGeneratedPreviewTasks() : [],
  );
  const apiKeyPresent = scenarioId !== 'ai-no-key';
  const taskCount = taskRows.filter((task) => task.title.trim()).length;
  const generateStatus = !apiKeyPresent
    ? 'Add and verify your OpenAI API key in Settings first.'
    : taskCount === 0
      ? 'Add at least one task to schedule.'
      : 'Ready to generate a schedule.';
  const canGenerate = apiKeyPresent && taskCount > 0;
  const canConfirmPreview =
    previewTasks.length > 0 &&
    previewTasks.every((task) => task.title.trim() && task.durationMinutes >= 10);

  const updateDuration = (taskId: string, value: string) => {
    const duration = Math.max(10, Number(value.replace(/[^0-9]/g, '')) || 10);
    let cursor = previewTasks[0]?.startTime ?? new Date().toISOString();
    setPreviewTasks((tasks) =>
      tasks.map((task) => {
        const start = cursor;
        const end = addMinutes(start, task.id === taskId ? duration : task.durationMinutes);
        cursor = addMinutes(end, 5);
        return {
          ...task,
          durationMinutes: task.id === taskId ? duration : task.durationMinutes,
          startTime: start,
          endTime: end,
        };
      }),
    );
  };

  return (
    <AIScheduleView
      apiKeyPresent={apiKeyPresent}
      taskRows={taskRows}
      startTime={startTime}
      generating={false}
      localError={scenarioId === 'ai-no-key' ? 'Add your OpenAI API key in Settings first.' : null}
      storeError={null}
      loading={false}
      previewTasks={previewTasks}
      canGenerate={canGenerate}
      generateStatus={generateStatus}
      canConfirmPreview={canConfirmPreview}
      onDismissError={() => {}}
      onChangeTaskTitle={(rowId, value) =>
        setTaskRows((rows) =>
          rows.map((row) => (row.id === rowId ? { ...row, title: value } : row)),
        )
      }
      onAddTaskRow={() =>
        setTaskRows((rows) => [...rows, { id: `preview-task-${rows.length + 1}`, title: '' }])
      }
      onRemoveTaskRow={(rowId) =>
        setTaskRows((rows) => {
          const nextRows = rows.filter((row) => row.id !== rowId);
          return nextRows.length > 0 ? nextRows : [{ id: 'preview-task-1', title: '' }];
        })
      }
      onChangeStartTime={setStartTime}
      onGenerate={() => {
        if (canGenerate) setPreviewTasks(makeGeneratedPreviewTasks());
      }}
      onOpenSettings={onBack}
      onCancel={onBack}
      onConfirm={onBack}
      onClearPreview={() => setPreviewTasks([])}
      onChangePreviewTitle={(taskId, value) =>
        setPreviewTasks((tasks) =>
          tasks.map((task) => (task.id === taskId ? { ...task, title: value } : task)),
        )
      }
      onChangePreviewDuration={updateDuration}
    />
  );
}

function WeeklyInsightPreview({ scenarioId, onBack }: { scenarioId: string; onBack: () => void }) {
  const tasks = scenarioId === 'weekly-empty' ? [] : makeCompletedHeavyTasks();
  return (
    <WeeklyInsightView summary={buildWeeklyInsightSummary(tasks)} onOptimizeTomorrow={onBack} />
  );
}

function SettingsPreview({
  onBack,
  onOpenPreviewCatalog,
}: {
  onBack: () => void;
  onOpenPreviewCatalog: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <SettingsView
      apiKey={apiKey}
      saved={saved}
      hasUnsavedApiKeyChange={false}
      message={message}
      validating={false}
      showPreviewCatalog
      onDismissMessage={() => setMessage(null)}
      onChangeApiKey={setApiKey}
      onCancel={onBack}
      onSave={() => {
        setSaved(Boolean(apiKey.trim()));
        setMessage(apiKey.trim() ? 'API key verified and saved.' : 'API key removed.');
      }}
      onRemove={() => {
        setApiKey('');
        setSaved(false);
        setMessage('API key removed.');
      }}
      onOpenPreviewCatalog={onOpenPreviewCatalog}
    />
  );
}
