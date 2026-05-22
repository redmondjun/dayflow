import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrentTaskCard } from '../components/CurrentTaskCard';
import { TaskTimelineRow } from '../components/TaskTimelineRow';
import { makeActiveDayTasks, makeCompletedHeavyTasks } from '../dev-preview/mockData';
import { useTaskStore } from '../store/taskStore';
import { colors } from '../theme/colors';
import type { Task } from '../types/task';
import { formatDisplayDate, getCurrentTask, getUpcomingTasks } from '../utils/time';

type RouteProps = {
  onEditTask?: (taskId: string) => void;
  onCreateTask: () => void;
  onOpenAiSchedule: () => void;
  onOpenSettings?: () => void;
};

type PreviewProps = {
  scenarioId: 'home-empty' | 'home-active' | 'home-completed';
  onBack: () => void;
};

type Props = RouteProps | PreviewProps;

function isPreviewProps(props: Props): props is PreviewProps {
  return 'scenarioId' in props;
}

function buildPreviewTasks(scenarioId: PreviewProps['scenarioId']): Task[] {
  const previewTaskMap: Record<PreviewProps['scenarioId'], Task[]> = {
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

export function HomeScreenView(props: Props) {
  const isPreview = isPreviewProps(props);
  const previewScenarioId = isPreview ? props.scenarioId : null;
  const [tick, setTick] = useState(Date.now());
  const [previewTasks, setPreviewTasks] = useState<Task[]>(
    previewScenarioId ? buildPreviewTasks(previewScenarioId) : [],
  );
  const {
    loading,
    error,
    clearError,
    reloadTasks,
    todayTasks,
    currentTask,
    upcomingTasks,
    markCompleted,
    markSkipped,
  } = useTaskStore();

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (previewScenarioId) {
      setPreviewTasks(buildPreviewTasks(previewScenarioId));
    }
  }, [previewScenarioId]);

  const date = formatDisplayDate(new Date(tick));
  const tasks = isPreview ? previewTasks : todayTasks();
  const current = isPreview ? getCurrentTask(tasks) : currentTask();
  const next = isPreview ? getUpcomingTasks(tasks)[0] : upcomingTasks()[0];
  const routeOnEditTask = 'onEditTask' in props ? props.onEditTask : undefined;
  const mode = isPreview
    ? {
        onHeaderPress: props.onBack,
        refreshControl: undefined,
        onCurrentComplete: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'completed')
          : undefined,
        onCurrentSkip: current
          ? () => updatePreviewTaskStatus(setPreviewTasks, current.id, 'skipped')
          : undefined,
        onTaskPress: undefined,
        onPrimaryAction: props.onBack,
        onSecondaryAction: props.onBack,
        showError: false,
      }
    : {
        onHeaderPress: props.onOpenSettings,
        refreshControl: (
          <RefreshControl refreshing={loading} onRefresh={reloadTasks} tintColor={colors.ink} />
        ),
        onCurrentComplete: current ? () => markCompleted(current.id) : undefined,
        onCurrentSkip: current ? () => markSkipped(current.id) : undefined,
        onTaskPress: routeOnEditTask,
        onPrimaryAction: props.onCreateTask,
        onSecondaryAction: props.onOpenAiSchedule,
        showError: true,
      };
  const {
    onCurrentComplete,
    onCurrentSkip,
    onHeaderPress,
    onPrimaryAction,
    onSecondaryAction,
    onTaskPress,
    refreshControl,
    showError,
  } = mode;

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerClassName="pb-28 pt-3" refreshControl={refreshControl}>
        <View className="flex-row items-start justify-between gap-4 px-4 pb-7">
          <View>
            <Text className="text-[11px] font-normal uppercase text-warm">{date.weekday}</Text>
            <Text className="mt-1.5 text-4xl font-bold tracking-[-1.4px] text-ink">
              {date.dayMonth}
            </Text>
          </View>
          {onHeaderPress ? (
            <Button mode="text" compact onPress={onHeaderPress} textColor={colors.warm}>
              Settings
            </Button>
          ) : null}
        </View>

        <CurrentTaskCard
          task={current}
          nextTask={next}
          onComplete={onCurrentComplete}
          onSkip={onCurrentSkip}
        />

        <View className="mt-7 flex-row items-baseline justify-between px-4 pb-1.5">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink">Today</Text>
          <Text className="text-xs font-medium text-warm2">{tasks.length} tasks</Text>
        </View>

        {tasks.length === 0 ? (
          <View className="px-6 py-8">
            <Text className="text-base font-medium text-ink">No tasks yet.</Text>
            <Text className="mt-2 text-sm leading-6 text-warm">
              Create a task manually or generate a schedule from a rough plan.
            </Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <TaskTimelineRow
              key={task.id}
              task={task}
              isCurrent={task.id === current?.id}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              onPress={onTaskPress ? () => onTaskPress(task.id) : undefined}
            />
          ))
        )}

        <View className="flex-row items-center gap-2 px-6 py-8">
          <View className="h-px flex-1 bg-warm3" />
          <Text className="text-xs font-medium uppercase tracking-[2px] text-warm2">
            End of day
          </Text>
          <View className="h-px flex-1 bg-warm3" />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 bg-paper px-5 pb-7 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.ink}
          textColor={colors.white}
          onPress={onPrimaryAction}
          style={{ borderRadius: 999 }}
        >
          Create Task
        </Button>
        <Button
          mode="contained"
          buttonColor={colors.accent}
          textColor={colors.ink}
          onPress={onSecondaryAction}
          style={{ borderRadius: 999 }}
        >
          Generate Schedule with AI
        </Button>
      </View>

      {showError ? (
        <Snackbar visible={Boolean(error)} onDismiss={clearError} duration={4000}>
          {error}
        </Snackbar>
      ) : null}
    </SafeAreaView>
  );
}
