import { View } from 'react-native';
import type { TaskStatus } from '../types/task';
import { colors } from '../theme/colors';

type DotStatus = TaskStatus | 'current';

const dotRenderers: Record<DotStatus, () => React.JSX.Element> = {
  current: () => (
    <View className="h-[22px] w-[22px] items-center justify-center">
      <View className="absolute h-[22px] w-[22px] rounded-full bg-accent opacity-25" />
      <View className="h-[10px] w-[10px] rounded-full bg-accent" />
    </View>
  ),
  completed: () => (
    <View className="h-[22px] w-[22px] items-center justify-center">
      <View className="h-[10px] w-[10px] rounded-full bg-ink" />
    </View>
  ),
  skipped: () => (
    <View className="h-[22px] w-[22px] items-center justify-center">
      <View className="h-[10px] w-[10px] rounded-full border border-warm bg-paper">
        <View
          style={{
            position: 'absolute',
            left: -3,
            top: 4,
            width: 14,
            height: 1.5,
            backgroundColor: colors.warm,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  ),
  scheduled: () => (
    <View className="h-[22px] w-[22px] items-center justify-center">
      <View className="h-2 w-2 rounded-full border border-warm2 bg-paper" />
    </View>
  ),
};

export function StationDot({ status }: { status: DotStatus }) {
  return dotRenderers[status]();
}
