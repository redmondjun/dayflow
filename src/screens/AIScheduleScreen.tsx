import {
  AISchedulePlannerSection,
  AIScheduleProvider,
  AIScheduleShell,
} from '../components/aiSchedule';
import type { AIScheduleContextValue } from '../components/aiSchedule';
import { useAIScheduleState } from '../hooks/useAIScheduleState';
import { useSchedulePreviewNavigation } from '../hooks/useSchedulePreviewNavigation';
import { useTimePickerScrollLock } from '../hooks/useTimePickerScrollLock';
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
  const schedule = useAIScheduleState({
    isPreview: Boolean(props.scenarioId),
    scenarioId: props.scenarioId,
    onComplete: props.onCancel,
    initialDraftAiScheduled: props.initialDraftAiScheduled ?? props.initialAiEnabled,
    autoOpenDraft: props.autoOpenDraft ?? !props.scenarioId,
  });
  const { scrollEnabled, onTimeInteractionStart, onTimeInteractionEnd } = useTimePickerScrollLock();

  useSchedulePreviewNavigation({
    showingPreview: schedule.showingPreview,
    onClearPreview: schedule.onClearPreview,
  });

  if (schedule.showingPreview) {
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
    scrollEnabled,
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
    onTimeInteractionStart,
    onTimeInteractionEnd,
    onSubmit: schedule.onSubmit,
    onCancel: props.onCancel,
  };

  return (
    <AIScheduleProvider value={plannerContext}>
      <AIScheduleShell>
        <AISchedulePlannerSection />
      </AIScheduleShell>
    </AIScheduleProvider>
  );
}
