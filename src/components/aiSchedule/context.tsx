import { createContext, useContext } from 'react';
import type { ManualTaskTimeValidation } from '../../features/taskPlanning/scheduling';
import type { PlanningDayKey } from '../../features/taskPlanning/planningDay';
import type { ManualTimeInputMode, TaskInputRow } from '../../types/task';

export type AIScheduleContextValue = {
  localError: string | null;
  storeError: string | null;
  onDismissError: () => void;
  scrollEnabled: boolean;
  aiAvailable: boolean;
  selectedRowAiScheduled: boolean;
  draftAiScheduled: boolean;
  planningDayKey: PlanningDayKey;
  setPlanningDayKey: (key: PlanningDayKey) => void;
  planningDay: Date;
  effectiveNow: Date;
  isFuturePlanningDay: boolean;
  taskRows: TaskInputRow[];
  selectedTaskId: string | null;
  selectedTaskStart: string;
  selectedTaskEnd: string;
  selectedTaskDuration: number;
  selectedTimeInputMode: ManualTimeInputMode;
  selectedTaskDescription: string | null;
  selectedTaskEstimatedDuration: number | null;
  selectedTimeValidation: ManualTaskTimeValidation | null;
  canSubmit: boolean;
  generating: boolean;
  loading: boolean;
  isSubmitting: boolean;
  onToggleRowAiScheduled: (value: boolean) => void;
  onSelectTaskRow: (taskId: string) => void;
  onChangeTaskTitle: (taskId: string, title: string) => void;
  onCommitTitleMemory: (taskId: string) => void;
  onAddTaskRow: () => void;
  onRemoveSelectedTaskRow: () => void;
  onSelectQuickAdd: (value: string) => void;
  onChangeSelectedStart: (value: string) => void;
  onChangeSelectedEnd: (value: string) => void;
  onChangeSelectedDuration: (minutes: number) => void;
  onChangeSelectedTimeInputMode: (mode: ManualTimeInputMode) => void;
  onChangeDescription: (value: string) => void;
  onChangeEstimatedDuration: (minutes: number) => void;
  onCancelTaskTimeEdit: () => void;
  onConfirmTaskTimeEdit: () => boolean;
  onTimeInteractionStart: () => void;
  onTimeInteractionEnd: () => void;
  onSubmit: () => void;
  onCancel: () => void;
};

const AIScheduleContext = createContext<AIScheduleContextValue | null>(null);

export function AIScheduleProvider({
  value,
  children,
}: {
  value: AIScheduleContextValue;
  children: React.ReactNode;
}) {
  return <AIScheduleContext.Provider value={value}>{children}</AIScheduleContext.Provider>;
}

export function useAIScheduleContext() {
  const value = useContext(AIScheduleContext);
  if (!value) {
    throw new Error('AISchedule context is missing.');
  }
  return value;
}

export function useAIScheduleTaskInput() {
  const {
    aiAvailable,
    selectedRowAiScheduled,
    isSubmitting,
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTaskDuration,
    selectedTimeInputMode,
    selectedTaskDescription,
    selectedTaskEstimatedDuration,
    selectedTimeValidation,
    onToggleRowAiScheduled,
    onSelectTaskRow,
    onChangeTaskTitle,
    onCommitTitleMemory,
    onAddTaskRow,
    onRemoveSelectedTaskRow,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onChangeSelectedDuration,
    onChangeSelectedTimeInputMode,
    onChangeDescription,
    onChangeEstimatedDuration,
    onCancelTaskTimeEdit,
    onConfirmTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
  } = useAIScheduleContext();

  return {
    aiAvailable,
    selectedRowAiScheduled,
    isSubmitting,
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTaskDuration,
    selectedTimeInputMode,
    selectedTaskDescription,
    selectedTaskEstimatedDuration,
    selectedTimeValidation,
    onToggleRowAiScheduled,
    onSelectTaskRow,
    onChangeTaskTitle,
    onCommitTitleMemory,
    onAddTaskRow,
    onRemoveSelectedTaskRow,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onChangeSelectedDuration,
    onChangeSelectedTimeInputMode,
    onChangeDescription,
    onChangeEstimatedDuration,
    onCancelTaskTimeEdit,
    onConfirmTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
  };
}

export function useAIScheduleFooter() {
  const { draftAiScheduled, onSelectQuickAdd, onSubmit, canSubmit, isSubmitting } =
    useAIScheduleContext();

  return { draftAiScheduled, onSelectQuickAdd, onSubmit, canSubmit, isSubmitting };
}

export function useAIScheduleShellState() {
  const { localError, storeError, onDismissError, scrollEnabled } = useAIScheduleContext();
  return { localError, storeError, onDismissError, scrollEnabled };
}
