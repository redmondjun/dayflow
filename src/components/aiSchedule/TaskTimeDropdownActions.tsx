import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { colors } from '../../theme/colors';

type Props = {
  onCancel: () => void;
  onAdd: () => void;
  addDisabled?: boolean;
  disabled?: boolean;
};

export function TaskTimeDropdownActions({
  onCancel,
  onAdd,
  addDisabled = false,
  disabled = false,
}: Props) {
  return (
    <View className="mt-3 flex-row gap-3">
      <Button
        testID="ai-schedule-time-cancel"
        mode="outlined"
        onPress={onCancel}
        disabled={disabled}
        textColor={colors.warm2}
        style={{ flex: 1, borderRadius: 999, borderColor: colors.warm3, borderWidth: 1.5 }}
        contentStyle={{ height: 44 }}
        labelStyle={{ fontSize: 13, fontWeight: '600', letterSpacing: -0.13 }}
      >
        Cancel
      </Button>
      <Button
        testID="ai-schedule-time-add"
        mode="contained"
        onPress={onAdd}
        disabled={disabled || addDisabled}
        buttonColor={colors.ink}
        textColor={colors.white}
        style={{ flex: 1, borderRadius: 999 }}
        contentStyle={{ height: 44 }}
        labelStyle={{ fontSize: 13, fontWeight: '600', letterSpacing: -0.13 }}
      >
        Add
      </Button>
    </View>
  );
}
