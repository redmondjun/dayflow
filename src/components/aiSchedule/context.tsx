import { createContext, useContext } from 'react';
import type { TaskInputRow } from '../../types/task';

export type AIScheduleContextValue = {
  localError: string | null;
  storeError: string | null;
  onDismissError: () => void;
  scrollEnabled: boolean;
  aiEnabled: boolean;
  taskRows: TaskInputRow[];
  selectedTaskId: string | null;
  selectedTaskStart: string;
  selectedTaskEnd: string;
  canSubmit: boolean;
  generating: boolean;
  loading: boolean;
  onToggleAiEnabled: (value: boolean) => void;
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
    aiEnabled,
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    onToggleAiEnabled,
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
    aiEnabled,
    taskRows,
    selectedTaskId,
    selectedTaskStart,
    selectedTaskEnd,
    onToggleAiEnabled,
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
  const { aiEnabled, onSelectQuickAdd, onSubmit, canSubmit, generating, loading } =
    useAIScheduleContext();

  return { aiEnabled, onSelectQuickAdd, onSubmit, canSubmit, generating, loading };
}

export function useAIScheduleShellState() {
  const { localError, storeError, onDismissError, scrollEnabled } = useAIScheduleContext();
  return { localError, storeError, onDismissError, scrollEnabled };
}
