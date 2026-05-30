import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../theme/colors';

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <Text className="text-[11px] font-medium uppercase tracking-[2px] text-warm">{children}</Text>
  );
}

export function HairlineDivider() {
  return <View className="mx-6 h-px bg-warm3" />;
}

export function PlannerHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <View className="px-6 pt-7">
      <View className="flex-row items-center justify-between">
        <StepProgress total={4} activeIndex={0} compact />
        {action}
      </View>
      <Text className="pt-[14px] text-[34px] font-bold tracking-[-1.36px] text-ink">{title}</Text>
      <Text className="pt-2 text-[15px] tracking-[-0.15px] text-warm">{subtitle}</Text>
    </View>
  );
}

export function QuickAddChip({
  label,
  onPress,
  emphasized = false,
}: {
  label: string;
  onPress: () => void;
  emphasized?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-[14px] py-[7px] ${
        emphasized ? 'border border-warm3 bg-paper' : 'bg-[rgba(35,36,34,0.05)]'
      }`}
    >
      <Text className={`text-[13px] tracking-[-0.13px] ${emphasized ? 'text-warm' : 'text-warm2'}`}>
        {emphasized ? `+  ${label}` : label}
      </Text>
    </Pressable>
  );
}

export function StepProgress({
  total,
  activeIndex,
  compact = false,
}: {
  total: number;
  activeIndex: number;
  compact?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`rounded-full ${
            index === activeIndex
              ? compact
                ? 'h-[3px] w-6 bg-ink'
                : 'h-[3px] flex-1 bg-ink'
              : compact
                ? 'h-[2.5px] w-1.5 bg-warm3'
                : 'h-[3px] flex-1 bg-warm3'
          }`}
        />
      ))}
    </View>
  );
}

export function PillActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  buttonColor,
  textColor,
  labelStyle,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  buttonColor?: string;
  textColor?: string;
  labelStyle?: {
    fontSize?: number;
    fontWeight?: '400' | '500' | '600' | '700';
    letterSpacing?: number;
    lineHeight?: number;
  };
  testID?: string;
}) {
  return (
    <Button
      testID={testID}
      mode="contained"
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      buttonColor={buttonColor ?? colors.ink}
      textColor={textColor ?? colors.white}
      style={{ borderRadius: 999 }}
      contentStyle={{ height: 52, paddingHorizontal: 16 }}
      labelStyle={labelStyle}
    >
      {label}
    </Button>
  );
}

export function CheckmarkIcon({
  variant = 'hero-green',
}: {
  variant?: 'hero-green' | 'hero-accent' | 'small-green';
}) {
  if (variant === 'hero-accent') {
    return (
      <View className="h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-ink bg-accent">
        <View className="h-[36px] w-[42px]">
          <View
            className="absolute h-[3px] w-[24px] rounded-full bg-ink"
            style={{ transform: [{ rotate: '45deg' }], left: 0, top: 22 }}
          />
          <View
            className="absolute h-[3px] w-[36px] rounded-full bg-ink"
            style={{ transform: [{ rotate: '-45deg' }], left: 14, top: 18 }}
          />
        </View>
      </View>
    );
  }

  if (variant === 'small-green') {
    return (
      <View className="h-[16px] w-[16px] items-center justify-center rounded-full border border-[#01C21B]">
        <View className="h-[6px] w-[7px]">
          <View
            className="absolute h-[1.5px] w-[3px] rounded-full bg-[#01C21B]"
            style={{ transform: [{ rotate: '45deg' }], left: 1, top: 4 }}
          />
          <View
            className="absolute h-[1.5px] w-[6px] rounded-full bg-[#01C21B]"
            style={{ transform: [{ rotate: '-45deg' }], left: 2, top: 3 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-[#01C21B]">
      <View className="h-[28px] w-[30px]">
        <View
          className="absolute h-[2.5px] w-[12px] rounded-full bg-[#01C21B]"
          style={{ transform: [{ rotate: '45deg' }], left: 3, top: 16 }}
        />
        <View
          className="absolute h-[2.5px] w-[22px] rounded-full bg-[#01C21B]"
          style={{ transform: [{ rotate: '-45deg' }], left: 10, top: 14 }}
        />
      </View>
    </View>
  );
}

export function CompletionState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-paper px-6">
      <CheckmarkIcon variant="hero-accent" />
      <Text className="mt-8 text-[32px] font-bold tracking-[-0.6px] text-ink">{title}</Text>
      <Text className="mt-4 max-w-[280px] text-center text-base leading-7 text-warm">{body}</Text>
      <View className="mt-8 w-full">
        <PillActionButton
          label={actionLabel}
          onPress={onAction}
          buttonColor="#01B224"
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
        />
      </View>
    </View>
  );
}
