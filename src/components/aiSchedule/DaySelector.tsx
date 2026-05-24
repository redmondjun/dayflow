import { Pressable, Text, View } from 'react-native';
import {
  getTodayKey,
  getTomorrowKey,
  isTodayKey,
  type PlanningDayKey,
} from '../../features/taskPlanning/planningDay';
import { colors } from '../../theme/colors';

export type DaySelectorProps = {
  selectedDayKey: PlanningDayKey;
  onSelectDayKey: (key: PlanningDayKey) => void;
  referenceNow: Date;
  options?: PlanningDayKey[];
};

function getDefaultOptions(referenceNow: Date): PlanningDayKey[] {
  return [getTodayKey(referenceNow), getTomorrowKey(referenceNow)];
}

function getDayLabel(dayKey: PlanningDayKey, referenceNow: Date): string {
  if (isTodayKey(dayKey, referenceNow)) return 'Today';
  if (dayKey === getTomorrowKey(referenceNow)) return 'Tomorrow';
  return dayKey;
}

export function DaySelector({
  selectedDayKey,
  onSelectDayKey,
  referenceNow,
  options,
}: DaySelectorProps) {
  const dayOptions = options ?? getDefaultOptions(referenceNow);

  return (
    <View className="mx-6 mt-4 flex-row gap-2" testID="day-selector">
      {dayOptions.map((dayKey) => {
        const selected = dayKey === selectedDayKey;
        return (
          <Pressable
            key={dayKey}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelectDayKey(dayKey)}
            testID={`day-selector-${dayKey}`}
            className={`rounded-full px-4 py-2 ${
              selected ? 'bg-ink' : 'border border-warm3 bg-paper'
            }`}
          >
            <Text
              className={`text-[13px] tracking-[-0.13px] ${
                selected ? 'font-medium text-white' : 'text-warm2'
              }`}
            >
              {getDayLabel(dayKey, referenceNow)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function getDaySelectorLabelColor(selected: boolean) {
  return selected ? colors.white : colors.warm2;
}
