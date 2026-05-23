import { useMemo, useState } from 'react';
import {
  createDraftTaskInputRow,
  createTaskInputRow,
  getRoundedStartTime,
  hasTaskRowTitle,
  normalizeTaskInputRow,
} from '../features/taskPlanning';
import {
  validateManualTaskTimes,
  type ManualTaskTimeValidation,
} from '../features/taskPlanning/scheduling';
import type { Task, TaskInputRow } from '../types/task';
import { addMinutes, formatInputTime } from '../utils/time';

type UseTaskInputRowsArgs = {
  initialRows: TaskInputRow[];
  initialSelectedTaskId: string | null;
  manualScheduling?: boolean;
  getExistingTasks?: () => Task[];
};

function normalizeRows(rows: TaskInputRow[]) {
  return rows.map(normalizeTaskInputRow);
}

function buildDraftRowOptions(
  rows: TaskInputRow[],
  manualScheduling: boolean,
  getExistingTasks?: () => Task[],
) {
  if (!manualScheduling) return undefined;

  return {
    manualScheduling: true,
    existingTasks: getExistingTasks?.() ?? [],
    plannerRows: rows.filter((row) => !row.isDraft && hasTaskRowTitle(row)),
  };
}

export function useTaskInputRows({
  initialRows,
  initialSelectedTaskId,
  manualScheduling = false,
  getExistingTasks,
}: UseTaskInputRowsArgs) {
  const [taskRows, setTaskRowsState] = useState(() => normalizeRows(initialRows));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId);

  const setTaskRows = (value: TaskInputRow[] | ((rows: TaskInputRow[]) => TaskInputRow[])) => {
    setTaskRowsState((rows) => {
      const next = typeof value === 'function' ? value(rows) : value;
      return normalizeRows(next);
    });
  };

  const draftTask = taskRows.find((task) => task.isDraft) ?? null;
  const expandedTask = taskRows.find((task) => task.id === selectedTaskId) ?? null;
  const committedRows = useMemo(() => taskRows.filter((task) => !task.isDraft), [taskRows]);
  const titledRows = useMemo(() => taskRows.filter(hasTaskRowTitle), [taskRows]);
  const selectedTaskStart = expandedTask?.startTime ?? getRoundedStartTime();
  const selectedTaskEnd = expandedTask?.endTime ?? formatInputTime(addMinutes(new Date(), 60));
  const selectedTimeValidation: ManualTaskTimeValidation | null = useMemo(() => {
    if (!manualScheduling || !expandedTask) return null;
    return validateManualTaskTimes(expandedTask.startTime, expandedTask.endTime, new Date(), {
      existingTasks: getExistingTasks?.() ?? [],
      plannerRows: committedRows,
      excludeRowId: expandedTask.id,
    });
  }, [committedRows, expandedTask, getExistingTasks, manualScheduling]);

  const updateTaskRow = (taskId: string, patch: Partial<TaskInputRow>) => {
    setTaskRows((rows) =>
      rows.map((row) => (row.id === taskId ? normalizeTaskInputRow({ ...row, ...patch }) : row)),
    );
  };

  const closeDraftRow = () => {
    setTaskRows((rows) =>
      rows.flatMap((row) => {
        if (!row.isDraft) return [row];
        if (!hasTaskRowTitle(row)) return [];
        return [{ ...row, isDraft: false }];
      }),
    );
    setSelectedTaskId(null);
  };

  const selectTaskRow = (taskId: string) => {
    const clickedTask = taskRows.find((task) => task.id === taskId);
    if (!clickedTask) return;

    if (selectedTaskId === taskId) {
      if (clickedTask.isDraft) {
        closeDraftRow();
        return;
      }
      setSelectedTaskId(null);
      return;
    }

    setSelectedTaskId(taskId);
  };

  const cancelTaskTimeEdit = () => {
    if (!expandedTask) {
      setSelectedTaskId(null);
      return;
    }

    if (expandedTask.isDraft && !hasTaskRowTitle(expandedTask)) {
      setTaskRows((rows) => rows.filter((row) => row.id !== expandedTask.id));
    }
    setSelectedTaskId(null);
  };

  const confirmTaskTimeEdit = () => {
    if (!expandedTask) return false;

    if (manualScheduling && selectedTimeValidation?.error) {
      return false;
    }

    if (!hasTaskRowTitle(expandedTask)) {
      return true;
    }

    if (!expandedTask.isDraft) {
      setSelectedTaskId(null);
      return false;
    }

    setTaskRows((rows) => {
      const committed = rows.map((row) =>
        row.id === expandedTask.id ? { ...row, isDraft: false } : row,
      );
      const withoutDraft = committed.filter((row) => !row.isDraft);
      const nextDraft = createDraftTaskInputRow(
        withoutDraft.at(-1),
        '',
        buildDraftRowOptions(withoutDraft, manualScheduling, getExistingTasks),
      );
      setSelectedTaskId(nextDraft.id);
      return [...withoutDraft, nextDraft];
    });
    return false;
  };

  const addTaskRow = (title = '') => {
    if (draftTask) {
      setSelectedTaskId(draftTask.id);
      return;
    }

    setTaskRows((rows) => {
      const next = createDraftTaskInputRow(
        rows.at(-1),
        title,
        buildDraftRowOptions(rows, manualScheduling, getExistingTasks),
      );
      setSelectedTaskId(next.id);
      return [...rows, next];
    });
  };

  const removeSelectedTaskRow = () => {
    setTaskRows((rows) => {
      if (rows.length === 1) {
        setSelectedTaskId(null);
        return [createTaskInputRow()];
      }

      setSelectedTaskId(null);
      return rows.filter((row) => row.id !== selectedTaskId);
    });
  };

  const selectQuickAdd = (value: string) => {
    if (expandedTask && !hasTaskRowTitle(expandedTask)) {
      updateTaskRow(expandedTask.id, { title: value });
      return;
    }
    addTaskRow(value);
  };

  return {
    taskRows,
    setTaskRows,
    setSelectedTaskId,
    selectedTaskId,
    draftTask,
    expandedTask,
    committedRows,
    titledRows,
    selectedTaskStart,
    selectedTaskEnd,
    selectedTimeValidation,
    selectTaskRow,
    changeTaskTitle: (taskId: string, title: string) =>
      updateTaskRow(taskId, { title: title ?? '' }),
    addTaskRow,
    removeSelectedTaskRow,
    selectQuickAdd,
    cancelTaskTimeEdit,
    confirmTaskTimeEdit,
    changeSelectedStart: (value: string) => {
      if (expandedTask) updateTaskRow(expandedTask.id, { startTime: value });
    },
    changeSelectedEnd: (value: string) => {
      if (expandedTask) updateTaskRow(expandedTask.id, { endTime: value });
    },
  };
}
