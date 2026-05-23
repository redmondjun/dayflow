import { Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { TaskInputRow } from '../../types/task';
import { formatWheelTimeRange } from '../../utils/time';

type Props = {
  task: TaskInputRow;
  selected: boolean;
  titleInputRef?: React.RefObject<TextInput | null>;
  onPress: () => void;
  onChangeTitle: (value: string) => void;
};

export function TaskRow({ task, selected, titleInputRef, onPress, onChangeTitle }: Props) {
  if (selected) {
    return (
      <View className="flex-row items-center gap-3 bg-warm4 px-[18px] py-4">
        <View className="h-[4px] w-[4px] rounded-full bg-ink2" />
        <TextInput
          ref={titleInputRef}
          testID={`ai-schedule-task-input-${task.id}`}
          value={task.title ?? ''}
          onChangeText={onChangeTitle}
          placeholder="Add a task"
          placeholderTextColor={colors.warm}
          className="flex-1 text-[13px] tracking-[-0.13px] text-ink"
        />
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-[18px] py-4">
      <View className="h-[4px] w-[4px] rounded-full bg-ink2" />
      <Text
        className={`flex-1 text-[13px] tracking-[-0.13px] ${task.title ? 'text-ink' : 'text-warm'}`}
      >
        {task.title || 'Add a task'}
      </Text>
      <View className="rounded-full bg-warm4 px-[10px] py-[5px]">
        <Text className="text-[9px] tracking-[-0.09px] text-warm">
          {formatWheelTimeRange(task.startTime, task.endTime)}
        </Text>
      </View>
    </Pressable>
  );
}
