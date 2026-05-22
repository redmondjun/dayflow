import { createContext, useContext } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Snackbar, TextInput } from 'react-native-paper';
import { ScreenTopBar } from './ScreenTopBar';
import { TimeWheelPicker } from './TimeWheelPicker';
import { colors } from '../theme/colors';
import type { GeneratedTaskPreview } from '../types/task';
import { durationBetween, formatDisplayTime, fromWheelTime, toWheelTime } from '../utils/time';
import type { TaskInputRow } from '../screens/useAIScheduleState';

type AIScheduleContextValue = {
  onCancel: () => void;
  onOpenSettings: () => void;
  localError: string | null;
  storeError: string | null;
  onDismissError: () => void;
  apiKeyPresent: boolean;
  taskRows: TaskInputRow[];
  startTime: string;
  canGenerate: boolean;
  generateStatus: string;
  generating: boolean;
  previewTasks: GeneratedTaskPreview[];
  canConfirmPreview: boolean;
  loading: boolean;
  onChangeTaskTitle: (taskId: string, title: string) => void;
  onAddTaskRow: () => void;
  onRemoveTaskRow: (taskId: string) => void;
  onChangeStartTime: (value: string) => void;
  onGenerate: () => void;
  onClearPreview: () => void;
  onConfirm: () => void;
  onChangePreviewTitle: (taskId: string, title: string) => void;
  onChangePreviewDuration: (taskId: string, value: string) => void;
};

const AIScheduleContext = createContext<AIScheduleContextValue | null>(null);

function useAIScheduleContext() {
  const value = useContext(AIScheduleContext);
  if (!value) {
    throw new Error('AISchedule context is missing.');
  }
  return value;
}

export function AIScheduleProvider({
  value,
  children,
}: {
  value: AIScheduleContextValue;
  children: React.ReactNode;
}) {
  return <AIScheduleContext.Provider value={value}>{children}</AIScheduleContext.Provider>;
}

export function AIScheduleShell({ children }: { children: React.ReactNode }) {
  const { onCancel, onOpenSettings, localError, storeError, onDismissError } =
    useAIScheduleContext();

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="pb-12 pt-14">
        <ScreenTopBar
          title="AI Schedule"
          saveLabel="Settings"
          onCancel={onCancel}
          onSave={onOpenSettings}
        />
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

export function AISchedulePlannerSection() {
  const {
    apiKeyPresent,
    taskRows,
    startTime,
    canGenerate,
    generateStatus,
    generating,
    onOpenSettings,
    onChangeTaskTitle,
    onAddTaskRow,
    onRemoveTaskRow,
    onChangeStartTime,
    onGenerate,
  } = useAIScheduleContext();
  const statusTone = canGenerate ? 'ready' : 'blocked';

  return (
    <View className="px-6 pt-6">
      <View className="rounded-[28px] bg-ink px-5 py-5">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-accent">
          AI Planner
        </Text>
        <Text className="mt-2 text-4xl font-bold tracking-tight text-white">
          Build today from a task list
        </Text>
        <Text className="mt-3 text-sm leading-6 text-warm2">
          Add each task as its own item, choose when the day starts, then generate a schedule you
          can review before saving.
        </Text>
      </View>

      {!apiKeyPresent ? (
        <View className="mt-5 rounded-2xl bg-warm4 p-4">
          <Text className="font-semibold text-ink">AI generation is disabled.</Text>
          <Text className="mt-1 text-sm leading-5 text-warm">
            Add your OpenAI API key in Settings to generate schedules.
          </Text>
          <Button
            mode="contained"
            buttonColor={colors.ink}
            textColor={colors.white}
            onPress={onOpenSettings}
            style={{ marginTop: 12, borderRadius: 999 }}
          >
            Open Settings
          </Button>
        </View>
      ) : null}

      <View className="mt-6 rounded-[28px] border border-warm3 bg-white px-4 py-5">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-warm">Step 1</Text>
        <Text className="mt-2 text-2xl font-bold tracking-tight text-ink">
          List what you need to do
        </Text>
        <Text className="mb-4 mt-2 text-sm leading-6 text-warm">
          One row should represent one real task. This removes ambiguity before the AI plans the
          day.
        </Text>

        <View className="gap-4">
          {taskRows.map((task, index) => (
            <View key={task.id} className="rounded-2xl bg-warm4 p-3">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="rounded-full bg-ink px-3 py-1">
                  <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-white">
                    Task {index + 1}
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  disabled={taskRows.length === 1}
                  onPress={() => onRemoveTaskRow(task.id)}
                  textColor={taskRows.length === 1 ? colors.warm2 : colors.danger}
                >
                  Remove
                </Button>
              </View>
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Task title"
                  value={task.title}
                  onChangeText={(value) => onChangeTaskTitle(task.id, value)}
                  placeholder={
                    index === 0 ? 'Study React' : index === 1 ? 'Go to the gym' : 'Buy groceries'
                  }
                />
              </View>
            </View>
          ))}
        </View>

        <Button
          mode="outlined"
          onPress={onAddTaskRow}
          textColor={colors.ink}
          style={{ marginTop: 16, borderRadius: 999, borderColor: colors.warm3 }}
        >
          Add Another Task
        </Button>
      </View>

      <View className="mt-4 rounded-[28px] border border-warm3 bg-white px-4 py-5">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-warm">Step 2</Text>
        <Text className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Choose the start of your day
        </Text>
        <Text className="mt-4 text-xs font-semibold uppercase tracking-[2px] text-warm">
          Schedule start time
        </Text>
        <TimeWheelPicker
          value={toWheelTime(startTime)}
          onChange={(value) => onChangeStartTime(fromWheelTime(value))}
          containerClassName="mt-3 self-center"
          width={262}
        />
      </View>

      <View
        className={`mt-4 rounded-[28px] px-4 py-5 ${
          statusTone === 'ready' ? 'bg-accent' : 'bg-warm4'
        }`}
      >
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-ink">Step 3</Text>
        <Text className="mt-2 text-2xl font-bold tracking-tight text-ink">
          {canGenerate ? 'Ready to generate' : 'Generation is blocked'}
        </Text>
        <Text className="mt-2 text-sm leading-6 text-ink2">{generateStatus}</Text>
      </View>

      <Button
        mode="contained"
        disabled={!canGenerate}
        loading={generating}
        onPress={onGenerate}
        buttonColor={colors.accent}
        textColor={colors.ink}
        style={{ marginTop: 16, borderRadius: 999 }}
      >
        Generate Schedule
      </Button>
    </View>
  );
}

export function AISchedulePreviewSection() {
  const {
    previewTasks,
    canConfirmPreview,
    loading,
    onClearPreview,
    onConfirm,
    onChangePreviewTitle,
    onChangePreviewDuration,
  } = useAIScheduleContext();

  if (previewTasks.length === 0) return null;

  return (
    <View className="px-6 pt-8">
      <View className="mb-4 flex-row items-baseline justify-between">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-warm">Preview</Text>
        <Text className="text-xs text-warm2">{previewTasks.length} tasks</Text>
      </View>

      <View className="gap-4">
        {previewTasks.map((task) => (
          <View key={task.id} className="rounded-2xl bg-warm4 p-4">
            <TextInput
              mode="flat"
              label="Title"
              value={task.title}
              onChangeText={(value) => onChangePreviewTitle(task.id, value)}
            />
            <TextInput
              mode="flat"
              label="Duration minutes"
              value={String(task.durationMinutes)}
              onChangeText={(value) => onChangePreviewDuration(task.id, value)}
              keyboardType="number-pad"
              style={{ marginTop: 8 }}
            />
            <Text className="mt-3 text-sm font-medium text-warm">
              {formatDisplayTime(task.startTime)} - {formatDisplayTime(task.endTime)} ·{' '}
              {durationBetween(task.startTime, task.endTime)}m
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-6 flex-row gap-3">
        <Button
          mode="outlined"
          onPress={onClearPreview}
          textColor={colors.ink}
          style={{ flex: 1, borderRadius: 999 }}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          disabled={!canConfirmPreview}
          loading={loading}
          onPress={onConfirm}
          buttonColor={colors.ink}
          textColor={colors.white}
          style={{ flex: 1, borderRadius: 999 }}
        >
          Confirm
        </Button>
      </View>
    </View>
  );
}
