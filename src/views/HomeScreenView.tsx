import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DaySelector } from '../components/aiSchedule/DaySelector';
import { CurrentTaskCard } from '../components/CurrentTaskCard';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { TaskTimelineRow } from '../components/TaskTimelineRow';
import { useHomeScreenState, type HomeScreenViewProps } from '../hooks/useHomeScreenState';
import { colors } from '../theme/colors';
import { DayCompleteView } from './DayCompleteView';

export function HomeScreenView(props: HomeScreenViewProps) {
  const {
    activeDayKey,
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
    onSelectDayKey,
    onTaskPress,
    pullToRefresh,
    showError,
    showingDayComplete,
    tasks,
    tomorrowKey,
    tomorrowTaskCount,
    viewingToday,
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

  const sectionLabel = viewingToday ? 'Today' : 'Tomorrow';
  const stickyLabel = viewingToday
    ? tasks.length > 0
      ? 'Add task'
      : 'Create Task'
    : tasks.length > 0
      ? 'Add task'
      : 'Plan tomorrow';

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
        <View className="flex-row items-start justify-between gap-4 px-4 pb-4">
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

        <DaySelector
          selectedDayKey={activeDayKey}
          onSelectDayKey={onSelectDayKey}
          referenceNow={effectiveNow}
        />

        {viewingToday ? (
          <CurrentTaskCard
            task={current}
            nextTask={next}
            onComplete={onCurrentComplete}
            onSkip={onCurrentSkip}
            now={effectiveNow}
          />
        ) : null}

        <View className="mt-7 flex-row items-baseline justify-between px-4 pb-1.5">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink">
            {sectionLabel}
          </Text>
          <Text className="text-xs font-medium text-warm2">{tasks.length} tasks</Text>
        </View>

        {tasks.length === 0 ? (
          <View className="px-6 py-8">
            <Text className="text-base font-medium text-ink">
              {viewingToday ? 'No tasks yet.' : 'Nothing planned yet.'}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-warm">
              {viewingToday
                ? 'Create your first task to start planning the day.'
                : 'Add tasks to build tomorrow’s schedule.'}
            </Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <TaskTimelineRow
              key={task.id}
              task={task}
              isCurrent={viewingToday && task.id === current?.id}
              isFirst={index === 0}
              isLast={index === tasks.length - 1}
              onPress={onTaskPress ? () => onTaskPress(task.id) : undefined}
            />
          ))
        )}

        {viewingToday && tomorrowTaskCount > 0 ? (
          <Pressable
            className="mx-6 mt-2 py-3"
            onPress={() => onSelectDayKey(tomorrowKey)}
            testID="home-tomorrow-link"
          >
            <Text className="text-sm font-medium text-warm">
              Tomorrow · {tomorrowTaskCount} {tomorrowTaskCount === 1 ? 'task' : 'tasks'} →
            </Text>
          </Pressable>
        ) : null}

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
          {stickyLabel}
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
