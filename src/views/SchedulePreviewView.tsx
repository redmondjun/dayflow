import { ScrollView, Text, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillActionButton } from '../components/LightScreenPrimitives';
import type { GeneratedTaskPreview } from '../types/task';
import { formatDisplayTime, formatSchedulePreviewDate } from '../utils/time';

function PreviewCheckmark() {
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

function PreviewTaskRow({ task }: { task: GeneratedTaskPreview }) {
  return (
    <View className="flex-row items-center border-t border-warm3 px-4 py-4">
      <View className="mr-3 h-[16px] w-[16px] items-center justify-center rounded-full border border-[#01C21B]">
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
      <Text className="flex-1 text-[14px] tracking-[-0.14px] text-warm">{task.title}</Text>
      <Text className="text-[13px] tracking-[-0.13px] text-warm2">
        {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)}
      </Text>
    </View>
  );
}

type Props = {
  tasks: GeneratedTaskPreview[];
  loading: boolean;
  error: string | null;
  onDismissError: () => void;
  onConfirm: () => void;
};

export function SchedulePreviewView({ tasks, loading, error, onDismissError, onConfirm }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="flex-grow px-6 pb-32 pt-12">
        <View className="items-center">
          <View className="rounded-full bg-warm4 px-[14px] py-[6px]">
            <Text className="text-[13px] tracking-[-0.13px] text-warm2">
              {formatSchedulePreviewDate()}
            </Text>
          </View>

          <View className="pt-10">
            <PreviewCheckmark />
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
            <PreviewTaskRow key={task.id} task={task} />
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-paper px-4 pb-6 pt-3">
        <PillActionButton
          label="Confirm schedule ->"
          onPress={onConfirm}
          loading={loading}
          buttonColor="#01C21B"
          textColor="#232422"
          labelStyle={{ fontSize: 15, fontWeight: '700', lineHeight: 15, letterSpacing: -0.15 }}
        />
      </View>

      <Snackbar visible={Boolean(error)} onDismiss={onDismissError} duration={5000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}
