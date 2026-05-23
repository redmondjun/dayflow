import { ScrollView, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useAIScheduleShellState } from './context';

export function AIScheduleShell({ children }: { children: React.ReactNode }) {
  const { localError, storeError, onDismissError, scrollEnabled } = useAIScheduleShellState();

  return (
    <View className="flex-1 bg-paper">
      <ScrollView
        contentContainerClassName="pb-12 pt-7"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>

      <Snackbar
        visible={Boolean(localError || storeError)}
        onDismiss={onDismissError}
        duration={5000}
      >
        {localError || storeError}
      </Snackbar>
    </View>
  );
}
