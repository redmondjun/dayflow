import { Pressable, Text } from 'react-native';

export function TaskRowRemoveButton({
  testID,
  onPress,
  size = 'md',
}: {
  testID: string;
  onPress: () => void;
  size?: 'md' | 'lg';
}) {
  const dimensions = size === 'lg' ? 'h-[30px] w-[30px]' : 'h-[26px] w-[26px]';
  const fontSize = size === 'lg' ? 'text-[12px]' : 'text-[11px]';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      className={`${dimensions} items-center justify-center rounded-full bg-[#C64A3A]`}
    >
      <Text className={`${fontSize} font-semibold text-white`}>x</Text>
    </Pressable>
  );
}
