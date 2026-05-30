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
  initialPlanningDayKey?: string;
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
    initialPlanningDayKey: props.initialPlanningDayKey,
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
    planningDayKey: schedule.planningDayKey,
    setPlanningDayKey: schedule.setPlanningDayKey,
    planningDay: schedule.planningDay,
    effectiveNow: schedule.effectiveNow,
    isFuturePlanningDay: schedule.isFuturePlanningDay,
    taskRows: schedule.taskRows,
    selectedTaskId: schedule.selectedTaskId,
    selectedTaskStart: schedule.selectedTaskStart,
    selectedTaskEnd: schedule.selectedTaskEnd,
    selectedTaskDuration: schedule.selectedTaskDuration,
    selectedTimeInputMode: schedule.selectedTimeInputMode,
    selectedTaskDescription: schedule.selectedTaskDescription,
    selectedTaskEstimatedDuration: schedule.selectedTaskEstimatedDuration,
    selectedTimeValidation: schedule.selectedTimeValidation,
    canSubmit: schedule.canSubmit,
    generating: schedule.generating,
    loading: schedule.loading,
    isSubmitting: schedule.isSubmitting,
    onToggleRowAiScheduled: schedule.onToggleRowAiScheduled,
    onSelectTaskRow: schedule.onSelectTaskRow,
    onChangeTaskTitle: schedule.onChangeTaskTitle,
    onCommitTitleMemory: schedule.onCommitTitleMemory,
    onAddTaskRow: schedule.onAddTaskRow,
    onRemoveSelectedTaskRow: schedule.onRemoveSelectedTaskRow,
    onSelectQuickAdd: schedule.onSelectQuickAdd,
    onChangeSelectedStart: schedule.onChangeSelectedStart,
    onChangeSelectedEnd: schedule.onChangeSelectedEnd,
    onChangeSelectedDuration: schedule.onChangeSelectedDuration,
    onChangeSelectedTimeInputMode: schedule.onChangeSelectedTimeInputMode,
    onChangeDescription: schedule.onChangeDescription,
    onChangeEstimatedDuration: schedule.onChangeEstimatedDuration,
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
