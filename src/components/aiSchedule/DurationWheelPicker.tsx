import { Pressable, Text, View } from 'react-native';
import { WheelColumn, wheelHeight } from '../TimeWheelPicker';
import {
  clampDuration,
  MAX_TASK_DURATION_MINUTES,
  MIN_TASK_DURATION_MINUTES,
} from '../../utils/scheduling';
import { formatDuration } from '../../utils/time';

const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
const maxHour = Math.floor(MAX_TASK_DURATION_MINUTES / 60);
const hourOptions = Array.from({ length: maxHour + 1 }, (_, index) => String(index));

export const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
] as const;

export function splitDurationMinutes(totalMinutes: number) {
  const roundedTotal = Math.round(totalMinutes / 5) * 5;
  const clamped = Math.max(0, Math.min(MAX_TASK_DURATION_MINUTES, roundedTotal));
  const hours = Math.min(maxHour, Math.floor(clamped / 60));
  const minutes = clamped - hours * 60;
  return {
    hours: String(hours),
    minutes: String(minutes).padStart(2, '0'),
  };
}

function DurationPresets({
  totalMinutes,
  onSelect,
}: {
  totalMinutes: number;
  onSelect: (minutes: number) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {DURATION_PRESETS.map((preset) => {
        const selected = totalMinutes === preset.minutes;
        return (
          <Pressable
            key={preset.label}
            testID={`duration-preset-${preset.minutes}`}
            onPress={() => onSelect(preset.minutes)}
            hitSlop={4}
            className={`rounded-full px-3 py-1.5 ${
              selected ? 'bg-ink' : 'bg-[rgba(35,36,34,0.05)]'
            }`}
          >
            <Text
              className={`text-[12px] tracking-[-0.12px] ${
                selected ? 'font-medium text-white' : 'text-warm2'
              }`}
            >
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Props = {
  value: number | null | undefined;
  onChange: (minutes: number) => void;
  width?: number;
  testID?: string;
  optional?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
};

export function DurationWheelPicker({
  value,
  onChange,
  width = 220,
  testID = 'duration-wheel-picker',
  optional = false,
  onInteractionStart,
  onInteractionEnd,
}: Props) {
  const hasEstimate = value != null && value > 0;
  const totalMinutes = hasEstimate ? clampDuration(value) : optional ? 0 : clampDuration(60);
  const parts = splitDurationMinutes(
    Math.max(totalMinutes, optional ? 0 : MIN_TASK_DURATION_MINUTES),
  );

  const emitDuration = (hours: string, minutes: string) => {
    const raw = Number(hours) * 60 + Number(minutes);
    if (optional && raw <= 0) {
      onChange(0);
      return;
    }
    onChange(clampDuration(raw));
  };

  const summaryLabel = optional
    ? totalMinutes <= 0
      ? 'Not set — leave at 0:00 and AI will choose'
      : formatDuration(totalMinutes)
    : formatDuration(Math.max(totalMinutes, MIN_TASK_DURATION_MINUTES));

  return (
    <View testID={testID}>
      <DurationPresets totalMinutes={totalMinutes} onSelect={onChange} />

      <View
        className="relative mt-3 items-center self-stretch"
        style={{ height: wheelHeight, width: '100%', maxWidth: width }}
        onTouchStart={onInteractionStart}
        onTouchEnd={onInteractionEnd}
        onTouchCancel={onInteractionEnd}
      >
        <View
          className="absolute left-0 right-0 rounded-[10px] bg-[rgba(35,36,34,0.04)]"
          style={{ top: (wheelHeight - 36) / 2, height: 36 }}
        />
        <View
          className="absolute left-0 right-0 flex-row items-center justify-center"
          style={{ height: wheelHeight }}
        >
          <WheelColumn
            options={hourOptions}
            selectedValue={parts.hours}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
            width={72}
            align="right"
            testID="duration-hour-wheel"
            onChange={(hours) => emitDuration(hours, parts.minutes)}
          />
          <Text className="w-8 text-center text-[13px] font-medium tracking-[-0.13px] text-warm">
            hr
          </Text>
          <WheelColumn
            options={minuteOptions}
            selectedValue={parts.minutes}
            onInteractionStart={onInteractionStart}
            onInteractionEnd={onInteractionEnd}
            width={72}
            testID="duration-minute-wheel"
            onChange={(minutes) => emitDuration(parts.hours, minutes)}
          />
          <Text className="w-10 text-center text-[13px] font-medium tracking-[-0.13px] text-warm">
            min
          </Text>
        </View>
      </View>

      <Text className="mt-2 text-center text-[11px] tracking-[-0.11px] text-warm">
        {summaryLabel}
      </Text>
    </View>
  );
}
