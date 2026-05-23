import { Pressable, Text, View } from 'react-native';
import type { Task } from '../types/task';
import { colors } from '../theme/colors';
import { durationBetween, formatDisplayTime, formatDuration } from '../utils/time';
import { StationDot } from './StationDot';

type Props = {
  task: Task;
  isCurrent?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress?: () => void;
  testID?: string;
};

export function TaskTimelineRow({ task, isCurrent, isFirst, isLast, onPress, testID }: Props) {
  const status = isCurrent ? 'current' : task.status;
  const muted = task.status === 'completed' || task.status === 'skipped';

  return (
    <Pressable onPress={onPress} className="min-h-16 flex-row" testID={testID}>
      <View className="w-14 items-center">
        <View
          style={{
            position: 'absolute',
            top: 0,
            height: '50%',
            width: 2,
            backgroundColor: isFirst ? 'transparent' : 'rgba(35,36,34,0.10)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: '50%',
            height: '50%',
            width: 2,
            backgroundColor: isLast ? 'transparent' : 'rgba(35,36,34,0.10)',
          }}
        />
        <View className="absolute top-1/2 -translate-y-1/2">
          <StationDot status={status} />
        </View>
      </View>

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
