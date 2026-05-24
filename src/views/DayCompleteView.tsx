import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckmarkIcon, PillActionButton } from '../components/LightScreenPrimitives';
import { StickyBottomBar } from '../components/StickyBottomBar';
import type { Task } from '../types/task';
import { colors } from '../theme/colors';
import { formatDisplayTime, formatSchedulePreviewDate } from '../utils/time';

function CompletedTaskRow({ task }: { task: Task }) {
  return (
    <View className="flex-row items-center border-t border-warm3 px-4 py-4">
      <View className="mr-3">
        <CheckmarkIcon variant="small-green" />
      </View>
      <Text className="flex-1 text-[14px] tracking-[-0.14px] text-warm">{task.title}</Text>
      <Text className="text-[13px] tracking-[-0.13px] text-warm2">
        {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)}
      </Text>
    </View>
  );
}

type Props = {
  tasks: Task[];
  completedDay?: Date;
  onDismiss: () => void;
};

export function DayCompleteView({ tasks, completedDay, onDismiss }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="flex-grow px-6 pb-32 pt-12">
        <View className="items-center">
          <View className="rounded-full bg-warm4 px-[14px] py-[6px]">
            <Text className="text-[13px] tracking-[-0.13px] text-warm2">
              {formatSchedulePreviewDate(completedDay)}
            </Text>
          </View>

          <View className="pt-10">
            <CheckmarkIcon variant="hero-green" />
          </View>

          <Text className="pt-8 text-center text-[31px] font-bold tracking-[-1.2px] text-ink">
            All done for today.
          </Text>
          <Text className="pt-5 text-center text-[15px] leading-[31px] tracking-[-0.15px] text-warm2">
            Every task checked off.{'\n'}The rest of the day is yours.
          </Text>
        </View>

        <View className="mt-14 overflow-hidden rounded-[18px] border border-warm3 bg-paper">
          <View className="flex-row items-center px-4 py-4">
            <Text className="flex-1 text-[11px] font-medium uppercase tracking-[2px] text-warm2">
              Completed
            </Text>
            <Text className="text-[16px] font-semibold tracking-[-0.16px] text-[#01C21B]">
              {tasks.length}/{tasks.length}
            </Text>
          </View>
          {tasks.map((task) => (
            <CompletedTaskRow key={task.id} task={task} />
          ))}
        </View>
      </ScrollView>

      <StickyBottomBar className="px-4 pb-6 pt-3">
        <PillActionButton
          label="Done"
          onPress={onDismiss}
          buttonColor={colors.accent}
          textColor={colors.ink}
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
        />
      </StickyBottomBar>
    </SafeAreaView>
  );
}
