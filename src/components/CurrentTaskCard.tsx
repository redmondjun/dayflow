import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { Task } from '../types/task';
import { colors } from '../theme/colors';
import {
  durationBetween,
  formatDisplayTime,
  formatDuration,
  getRemainingMinutes,
} from '../utils/time';

type Props = {
  task?: Task;
  nextTask?: Task;
  onComplete?: () => void;
  onSkip?: () => void;
  now?: Date;
};

export function CurrentTaskCard({ task, nextTask, onComplete, onSkip, now }: Props) {
  if (!task) {
    return (
      <View className="mx-4 mt-3 rounded-[30px] bg-warm4 px-[26px] py-[26px]">
        <Text className="text-[11px] font-medium uppercase tracking-[1.8px] text-warm">
          No active task
        </Text>
        <Text className="mt-4 text-[30px] font-bold leading-[33px] tracking-[-0.9px] text-ink">
          Your schedule is clear right now.
        </Text>
        {nextTask ? (
          <Text className="mt-6 text-sm font-medium text-warm">
            Next: {nextTask.title} at {formatDisplayTime(nextTask.startTime)}
          </Text>
        ) : (
          <Text className="mt-6 text-sm font-medium text-warm">
            Create a task or generate a schedule to start the day.
          </Text>
        )}
      </View>
    );
  }

  const total = durationBetween(task.startTime, task.endTime);
  const remaining = getRemainingMinutes(task, now);
  const elapsed = Math.max(0, total - remaining);
  const progress = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

  return (
    <View className="mx-4 mt-3 rounded-[30px] bg-warm4 px-[26px] py-[26px]">
      <View className="flex-row items-center gap-2">
        <View className="h-1.5 w-1.5 rounded-full bg-accent" />
        <Text className="text-[11px] font-medium uppercase tracking-[1.8px] text-ink opacity-45">
          In progress
        </Text>
      </View>

      <Text className="mt-4 text-[30px] font-bold leading-[33px] tracking-[-0.9px] text-ink">
        {task.title}
      </Text>

      <View className="mt-7 flex-row items-end justify-between gap-5">
        <View className="flex-1">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink opacity-45">
            Schedule
          </Text>
          <Text className="mt-1.5 text-[15px] font-semibold text-ink">
            {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] font-normal uppercase tracking-[1.5px] text-ink opacity-45">
            Remaining
          </Text>
          <Text className="mt-1 text-2xl font-medium text-ink opacity-45">
            {formatDuration(remaining)}
          </Text>
        </View>
      </View>

      <View className="mt-5 h-[3px] overflow-hidden rounded-full bg-warm3">
        <View
          style={{ width: `${progress}%`, backgroundColor: colors.accent }}
          className="h-full rounded-full"
        />
      </View>

      {nextTask ? (
        <View className="mt-6 flex-row items-center gap-2">
          <Text className="text-[11px] font-medium uppercase tracking-[1.5px] text-ink opacity-45">
            Next
          </Text>
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 text-sm font-semibold text-ink opacity-85"
          >
            {nextTask.title}
          </Text>
          <Text className="text-[13px] font-semibold text-ink opacity-65">
            {formatDisplayTime(nextTask.startTime)}
          </Text>
        </View>
      ) : null}

      <View className="mt-7 flex-row gap-2">
        <Button
          mode="contained"
          onPress={onComplete}
          buttonColor={colors.accent}
          textColor={colors.white}
          style={{ flex: 1, borderRadius: 999 }}
        >
          Complete early
        </Button>
        <Button
          mode="outlined"
          onPress={onSkip}
          textColor={colors.ink}
          style={{ flex: 1, borderRadius: 999, borderColor: colors.ink }}
        >
          Skip
        </Button>
      </View>
    </View>
  );
}
