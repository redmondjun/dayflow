import { Text, View } from 'react-native';
import { PillActionButton, QuickAddChip } from '../LightScreenPrimitives';
import { useAIScheduleFooter } from './context';
import { colors } from '../../theme/colors';
import { plannerQuickAdd } from '../../features/taskPlanning';

export function QuickAddSection() {
  const { draftAiScheduled, onSelectQuickAdd, onSubmit, canSubmit, isSubmitting } =
    useAIScheduleFooter();

  return (
    <>
      {draftAiScheduled ? (
        <View className="flex-row items-center gap-[7px] px-6 pt-4">
          <View className="h-1 w-1 rounded-full bg-[#01C21B]" />
          <Text className="text-[12px] tracking-[0.12px] text-ink2">
            No need to set time - we&apos;ll organize your day.
          </Text>
        </View>
      ) : null}

      <View className="px-6 pt-8">
        <Text className="pb-[14px] text-[11px] font-medium uppercase tracking-[-0.11px] text-warm2">
          Quick add
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {plannerQuickAdd.map((label) => (
            <QuickAddChip key={label} label={label} onPress={() => onSelectQuickAdd(label)} />
          ))}
        </View>
      </View>

      <View className="px-6 pt-8">
        <PillActionButton
          testID="ai-schedule-submit"
          label="Confirm Schedule ->"
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          buttonColor={canSubmit ? '#01C21B' : undefined}
          textColor={canSubmit ? colors.ink : undefined}
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
        />
      </View>
    </>
  );
}
