import { Pressable, ScrollView, Text, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillActionButton } from '../components/LightScreenPrimitives';
import { StickyBottomBar } from '../components/StickyBottomBar';
import { TimelineConnector } from '../components/TimelineConnector';
import type { GeneratedTaskPreview } from '../types/task';
import { colors } from '../theme/colors';
import {
  formatDisplayTime,
  formatDuration,
  formatScheduleSummary,
  sortByStartTime,
} from '../utils/time';

function PreviewScheduleRow({
  task,
  isFirst,
  isLast,
}: {
  task: GeneratedTaskPreview;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <View className="min-h-[74px] flex-row">
      <TimelineConnector isFirst={isFirst} isLast={isLast}>
        <View className="h-[10px] w-[10px] rounded-full bg-ink" />
      </TimelineConnector>

      <View className="flex-1 flex-row items-center justify-between py-[15px] pl-1 pr-6">
        <View className="min-w-0 flex-1">
          <Text className="text-[16px] font-semibold tracking-[-0.288px] text-ink">
            {task.title}
          </Text>
          <Text className="mt-[10px] text-[12px] tracking-[0.12px] text-warm">
            {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)}
          </Text>
        </View>
        <View className="rounded-full bg-warm3 px-[9px] py-1">
          <Text className="text-[12px] font-medium tracking-[0.12px] text-ink">
            {formatDuration(task.durationMinutes)}
          </Text>
        </View>
      </View>
    </View>
  );
}

type Props = {
  tasks: GeneratedTaskPreview[];
  loading: boolean;
  error: string | null;
  onDismissError: () => void;
  onBack: () => void;
  onConfirm: () => void;
};

export function SchedulePreviewView({
  tasks,
  loading,
  error,
  onDismissError,
  onBack,
  onConfirm,
}: Props) {
  const sortedTasks = sortByStartTime(tasks);
  const totalMinutes = sortedTasks.reduce((sum, task) => sum + task.durationMinutes, 0);

  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="pb-32 pt-4">
        <View className="px-6 pt-4">
          <Pressable
            testID="schedule-preview-back"
            onPress={onBack}
            className="h-[34px] w-[34px] items-center justify-center rounded-full bg-warm3"
          >
            <Text className="text-2xl text-ink">‹</Text>
          </Pressable>
        </View>

        <View className="px-6 pt-7">
          <Text className="text-[34px] font-bold tracking-[-1.36px] text-ink">Your schedule</Text>
          <Text className="text-[34px] font-bold tracking-[-1.36px] text-ink">is ready</Text>

          <View className="flex-row items-center gap-3 pt-3">
            <View className="flex-row items-center gap-[6px] rounded-full border border-[#E8F7E9] bg-ink py-[5px] pl-[11px] pr-2">
              <View className="h-[5px] w-[5px] rounded-full bg-accent" />
              <Text className="text-[11px] font-semibold tracking-[0.22px] text-white">
                AI organized
              </Text>
            </View>
            <Text className="text-[13px] font-medium tracking-[0.26px] text-warm">
              {formatScheduleSummary(sortedTasks.length, totalMinutes)}
            </Text>
          </View>
        </View>

        <View className="px-6 pb-2 pt-7">
          <Text className="text-[11px] font-semibold uppercase tracking-[1.98px] text-warm">
            Schedule
          </Text>
        </View>

        {sortedTasks.map((task, index) => (
          <PreviewScheduleRow
            key={task.id}
            task={task}
            isFirst={index === 0}
            isLast={index === sortedTasks.length - 1}
          />
        ))}
      </ScrollView>

      <StickyBottomBar className="px-6 pb-7 pt-5">
        <PillActionButton
          testID="schedule-preview-confirm"
          label="Confirm Schedule ->"
          onPress={onConfirm}
          loading={loading}
          buttonColor={colors.accent}
          textColor={colors.white}
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
        />
      </StickyBottomBar>

      <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={5000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}
