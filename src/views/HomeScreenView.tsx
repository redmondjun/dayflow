import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrentTaskCard } from '../components/CurrentTaskCard';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { TaskTimelineRow } from '../components/TaskTimelineRow';
import { useHomeScreenState, type HomeScreenViewProps } from '../hooks/useHomeScreenState';
import { colors } from '../theme/colors';
import { DayCompleteView } from './DayCompleteView';

export function HomeScreenView(props: HomeScreenViewProps) {
  const {
    clearError,
    current,
    date,
    dayCompleteCandidate,
    effectiveNow,
    error,
    next,
    onCurrentComplete,
    onCurrentSkip,
    onDismissDayComplete,
    onHeaderPress,
    onPrimaryAction,
    onTaskPress,
    pullToRefresh,
    showError,
    showingDayComplete,
    tasks,
  } = useHomeScreenState(props);

  if (showingDayComplete && dayCompleteCandidate) {
    return (
      <DayCompleteView
        tasks={dayCompleteCandidate.tasks}
        completedDay={dayCompleteCandidate.day}
        onDismiss={onDismissDayComplete}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView
        contentContainerClassName="pb-28 pt-3"
        refreshControl={
          pullToRefresh ? (
            <RefreshControl
              refreshing={pullToRefresh.loading}
              onRefresh={pullToRefresh.onRefresh}
              tintColor={colors.ink}
            />
          ) : undefined
        }
      >
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
          now={effectiveNow}
        />

        <View className="mt-7 flex-row items-baseline justify-between px-4 pb-1.5">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink">Today</Text>
          <Text className="text-xs font-medium text-warm2">{tasks.length} tasks</Text>
        </View>

        {tasks.length === 0 ? (
          <View className="px-6 py-8">
            <Text className="text-base font-medium text-ink">No tasks yet.</Text>
            <Text className="mt-2 text-sm leading-6 text-warm">
              Create your first task to start planning the day.
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

      <StickyBottomBar className="gap-2 px-5 pb-7 pt-3">
        <Button
          mode="contained"
          buttonColor={colors.ink}
          textColor={colors.white}
          onPress={onPrimaryAction}
          style={{ borderRadius: 999 }}
        >
          {tasks.length > 0 ? 'Add task' : 'Create Task'}
        </Button>
      </StickyBottomBar>

      {showError ? (
        <Snackbar visible={Boolean(error)} onDismiss={clearError} duration={4000}>
          {error}
        </Snackbar>
      ) : null}
    </SafeAreaView>
  );
}
