import { useEffect, useState } from 'react';
import { BackHandler, Keyboard } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import {
  AISchedulePlannerSection,
  AIScheduleProvider,
  AIScheduleShell,
} from '../components/aiSchedule';
import type { AIScheduleContextValue } from '../components/aiSchedule';
import { useAIScheduleState } from './useAIScheduleState';
import { SchedulePreviewView } from '../views/SchedulePreviewView';

type Props = {
  onCancel: () => void;
  onOpenSettings: () => void;
  scenarioId?: string;
  initialDraftAiScheduled?: boolean;
  /** @deprecated Use initialDraftAiScheduled */
  initialAiEnabled?: boolean;
  autoOpenDraft?: boolean;
};

export function AIScheduleScreen(props: Props) {
  const navigation = useNavigation();
  const [isTimePickerInteracting, setIsTimePickerInteracting] = useState(false);
  const schedule = useAIScheduleState({
    isPreview: Boolean(props.scenarioId),
    scenarioId: props.scenarioId,
    onComplete: props.onCancel,
    initialDraftAiScheduled: props.initialDraftAiScheduled ?? props.initialAiEnabled,
    autoOpenDraft: props.autoOpenDraft ?? !props.scenarioId,
  });

  const showingPreview = schedule.showingPreview;

  usePreventRemove(showingPreview, () => {
    schedule.onClearPreview();
  });

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !showingPreview,
    });
  }, [navigation, showingPreview]);

  useEffect(() => {
    if (!showingPreview) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      schedule.onClearPreview();
      return true;
    });

    return () => subscription.remove();
  }, [schedule.onClearPreview, showingPreview]);

  if (showingPreview) {
    return (
      <SchedulePreviewView
        tasks={schedule.previewTasks}
        loading={schedule.loading}
        error={schedule.storeError ?? schedule.localError}
        onDismissError={schedule.onDismissError}
        onBack={schedule.onClearPreview}
        onConfirm={schedule.onConfirm}
      />
    );
  }

  const plannerContext: AIScheduleContextValue = {
    localError: schedule.localError,
    storeError: schedule.storeError,
    onDismissError: schedule.onDismissError,
    scrollEnabled: !isTimePickerInteracting,
    aiAvailable: schedule.aiAvailable,
    selectedRowAiScheduled: schedule.selectedRowAiScheduled,
    draftAiScheduled: schedule.draftAiScheduled,
    taskRows: schedule.taskRows,
    selectedTaskId: schedule.selectedTaskId,
    selectedTaskStart: schedule.selectedTaskStart,
    selectedTaskEnd: schedule.selectedTaskEnd,
    selectedTimeValidation: schedule.selectedTimeValidation,
    canSubmit: schedule.canSubmit,
    generating: schedule.generating,
    loading: schedule.loading,
    onToggleRowAiScheduled: schedule.onToggleRowAiScheduled,
    onSelectTaskRow: schedule.onSelectTaskRow,
    onChangeTaskTitle: schedule.onChangeTaskTitle,
    onAddTaskRow: schedule.onAddTaskRow,
    onRemoveSelectedTaskRow: schedule.onRemoveSelectedTaskRow,
    onSelectQuickAdd: schedule.onSelectQuickAdd,
    onChangeSelectedStart: schedule.onChangeSelectedStart,
    onChangeSelectedEnd: schedule.onChangeSelectedEnd,
    onCancelTaskTimeEdit: schedule.onCancelTaskTimeEdit,
    onConfirmTaskTimeEdit: schedule.onConfirmTaskTimeEdit,
    onTimeInteractionStart: () => {
      Keyboard.dismiss();
      setIsTimePickerInteracting(true);
    },
    onTimeInteractionEnd: () => setIsTimePickerInteracting(false),
    onSubmit: schedule.onSubmit,
  };

  return (
    <AIScheduleProvider value={plannerContext}>
      <AIScheduleShell>
        <AISchedulePlannerSection />
      </AIScheduleShell>
    </AIScheduleProvider>
  );
}
