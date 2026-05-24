import { Pressable, Text, View } from 'react-native';
import type { Task } from '../types/task';
import { colors } from '../theme/colors';
import { durationBetween, formatDisplayTime, formatDuration } from '../utils/time';
import { StationDot } from './StationDot';
import { TimelineConnector } from './TimelineConnector';

type Props = {
  task: Task;
  isCurrent?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress?: () => void;
};

export function TaskTimelineRow({ task, isCurrent, isFirst, isLast, onPress }: Props) {
  const status = isCurrent ? 'current' : task.status;
  const muted = task.status === 'completed' || task.status === 'skipped';

  return (
    <Pressable onPress={onPress} className="min-h-16 flex-row">
      <TimelineConnector isFirst={isFirst} isLast={isLast}>
        <StationDot status={status} />
      </TimelineConnector>

      <View className="flex-1 flex-row items-center gap-3 py-3 pr-6">
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className={`text-base font-semibold tracking-tight ${muted ? 'text-warm' : 'text-ink'}`}
          >
            {task.title}
          </Text>
          <Text className="mt-1 text-xs font-medium text-warm">
            {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)}
            {task.status === 'skipped' ? '  skipped' : ''}
          </Text>
        </View>
        <Text style={{ color: colors.warm2 }} className="text-xs font-medium">
          {formatDuration(durationBetween(task.startTime, task.endTime))}
        </Text>
      </View>
    </Pressable>
  );
}
