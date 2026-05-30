import { Pressable, Text, View } from 'react-native';
import type { ManualTimeInputMode } from '../../types/task';
import { colors } from '../../theme/colors';

type Props = {
  mode: ManualTimeInputMode;
  onChange: (mode: ManualTimeInputMode) => void;
};

export function ManualTimeInputModeToggle({ mode, onChange }: Props) {
  return (
    <View className="mt-3 flex-row rounded-full bg-warm4 p-1">
      {(['duration', 'end'] as const).map((option) => {
        const selected = mode === option;
        return (
          <Pressable
            key={option}
            testID={`manual-time-input-mode-${option}`}
            onPress={() => onChange(option)}
            className={`flex-1 items-center rounded-full px-3 py-2 ${selected ? 'bg-white' : ''}`}
          >
            <Text
              className={`text-[11px] tracking-[-0.11px] ${selected ? 'font-medium text-ink' : 'text-warm'}`}
            >
              {option === 'duration' ? 'Duration' : 'End time'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ManualTimeDerivedLabel({ label }: { label: string }) {
  return (
    <Text
      testID="manual-time-derived-label"
      className="mt-2 text-[11px] leading-[18px] tracking-[-0.11px]"
      style={{ color: colors.warm }}
    >
      {label}
    </Text>
  );
}
