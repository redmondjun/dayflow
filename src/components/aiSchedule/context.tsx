import { createContext, useContext } from 'react';
import type { ManualTaskTimeValidation } from '../../features/taskPlanning/scheduling';
import type { TaskInputRow } from '../../types/task';

export type AIScheduleContextValue = {
  localError: string | null;
  storeError: string | null;
  onDismissError: () => void;
  scrollEnabled: boolean;
  aiAvailable: boolean;
  selectedRowAiScheduled: boolean;
  draftAiScheduled: boolean;
  taskRows: TaskInputRow[];
  selectedTaskId: string | null;
  selectedTaskStart: string;
  selectedTaskEnd: string;
  selectedTimeValidation: ManualTaskTimeValidation | null;
  canSubmit: boolean;
  generating: boolean;
  loading: boolean;
  onToggleRowAiScheduled: (value: boolean) => void;
  onSelectTaskRow: (taskId: string) => void;
  onChangeTaskTitle: (taskId: string, title: string) => void;
  onAddTaskRow: () => void;
  onRemoveSelectedTaskRow: () => void;
  onSelectQuickAdd: (value: string) => void;
  onChangeSelectedStart: (value: string) => void;
  onChangeSelectedEnd: (value: string) => void;
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
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTimeValidation,
    onToggleRowAiScheduled,
    onSelectTaskRow,
    onChangeTaskTitle,
    onAddTaskRow,
    onRemoveSelectedTaskRow,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onCancelTaskTimeEdit,
    onConfirmTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
  } = useAIScheduleContext();

  return {
    aiAvailable,
    selectedRowAiScheduled,
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTimeValidation,
    onToggleRowAiScheduled,
    onSelectTaskRow,
    onChangeTaskTitle,
    onAddTaskRow,
    onRemoveSelectedTaskRow,
    onChangeSelectedStart,
    onChangeSelectedEnd,
    onCancelTaskTimeEdit,
    onConfirmTaskTimeEdit,
    onTimeInteractionStart,
    onTimeInteractionEnd,
  };
}

export function useAIScheduleFooter() {
  const { draftAiScheduled, onSelectQuickAdd, onSubmit, canSubmit, generating, loading } =
    useAIScheduleContext();

  return { draftAiScheduled, onSelectQuickAdd, onSubmit, canSubmit, generating, loading };
}

export function useAIScheduleShellState() {
  const { localError, storeError, onDismissError, scrollEnabled } = useAIScheduleContext();
  return { localError, storeError, onDismissError, scrollEnabled };
}
