import { Pressable, Text, TextInput, View } from 'react-native';
import { TaskRowRemoveButton } from './TaskRowRemoveButton';
import { hasTaskRowTitle } from '../../features/taskPlanning';
import { colors } from '../../theme/colors';
import type { TaskInputRow } from '../../types/task';

type Props = {
  task: TaskInputRow | null;
  selected: boolean;
  inputRef: React.RefObject<TextInput | null>;
  onPress: () => void;
  onFocusInput: () => void;
  onChangeTitle: (value: string) => void;
  onRemove: () => void;
};

export function DraftTaskRow({
  task,
  selected,
  inputRef,
  onPress,
  onFocusInput,
  onChangeTitle,
  onRemove,
}: Props) {
  if (!task) {
    return (
      <Pressable
        testID="ai-schedule-add-row"
        onPress={onPress}
        className="flex-row items-center px-[18px] py-[14px]"
      >
        <View className="mr-2.5 h-4 w-4 items-center justify-center rounded-full bg-ink">
          <Text className="text-[10px] font-bold text-white">+</Text>
        </View>
        <Text className="flex-1 text-[13px] tracking-[-0.13px] text-warm">Add a task</Text>
      </Pressable>
    );
  }

  return (
    <View
      className={`flex-row items-center gap-3 px-[18px] py-[14px] ${selected ? 'bg-warm4' : ''}`}
    >
      <View className="h-4 w-4 items-center justify-center rounded-full bg-ink">
        <Text className="text-[10px] font-bold text-white">+</Text>
      </View>
      <TextInput
        ref={inputRef}
        testID="ai-schedule-draft-input"
        value={task.title ?? ''}
        onFocus={onFocusInput}
        onChangeText={onChangeTitle}
        placeholder="Add a task"
        placeholderTextColor={colors.warm}
        className="flex-1 text-[13px] tracking-[-0.13px] text-ink"
      />
      {hasTaskRowTitle(task) ? (
        <TaskRowRemoveButton testID="ai-schedule-remove-row" onPress={onRemove} size="lg" />
      ) : null}
    </View>
  );
}
