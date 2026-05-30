import { useMemo, useState } from 'react';
import {
  createDraftTaskInputRow,
  getRoundedStartTime,
  hasTaskRowTitle,
  normalizeTaskInputRow,
} from '../features/taskPlanning';
import { syncManualRowTimes } from '../features/taskPlanning/manualTime';
import {
  validateManualTaskTimes,
  type ManualTaskTimeValidation,
} from '../features/taskPlanning/scheduling';
import type { TaskPlanningDefaults } from '../features/taskPlanning/profileDefaults';
import type { SchedulingContext } from '../features/taskPlanning/planningDay';
import {
  findRememberedEstimatedDuration,
  findRememberedTaskDescription,
} from '../features/taskPlanning/taskTitleMemory';
import type { ManualTimeInputMode, Task, TaskInputRow } from '../types/task';
import { clampDuration } from '../utils/scheduling';
import { addMinutes, formatInputTime, parseTimeInput } from '../utils/time';

type UseTaskInputRowsArgs = {
  initialRows: TaskInputRow[];
  initialSelectedTaskId: string | null;
  defaultDraftAiScheduled?: boolean;
  getExistingTasks?: () => Task[];
  planningDefaults?: TaskPlanningDefaults;
  schedulingContext: SchedulingContext;
};

function normalizeRows(rows: TaskInputRow[]) {
  return rows.map(normalizeTaskInputRow);
}

function buildDraftRowOptions(
  rows: TaskInputRow[],
  aiScheduled: boolean,
  getExistingTasks?: () => Task[],
  planningDefaults?: TaskPlanningDefaults,
  schedulingContext?: SchedulingContext,
) {
  return {
    aiScheduled,
    existingTasks: getExistingTasks?.() ?? [],
    plannerRows: rows.filter((row) => !row.isDraft && hasTaskRowTitle(row)),
    preferredStart: planningDefaults?.preferredStart,
    durationMinutes: planningDefaults?.durationMinutes,
    context: schedulingContext,
  };
}

function applyTitleMemory(row: TaskInputRow, tasks: Task[]): Partial<TaskInputRow> {
  if (!hasTaskRowTitle(row)) return {};

  const patch: Partial<TaskInputRow> = {};
  if (!row.description?.trim()) {
    const description = findRememberedTaskDescription(tasks, row.title);
    if (description) patch.description = description;
  }

  const rememberedDuration = findRememberedEstimatedDuration(tasks, row.title);
  if (rememberedDuration != null) {
    if (row.aiScheduled && row.estimatedDurationMinutes == null) {
      patch.estimatedDurationMinutes = rememberedDuration;
    }
    if (!row.aiScheduled && (row.durationMinutes == null || row.durationMinutes === 60)) {
      patch.durationMinutes = rememberedDuration;
    }
  }

  return patch;
}

function withSyncedManualTimes(row: TaskInputRow, planningDay: Date): TaskInputRow {
  if (row.aiScheduled || !row.startTime) return row;
  const synced = syncManualRowTimes(row, planningDay);
  return {
    ...row,
    startTime: synced.startTime,
    endTime: synced.endTime,
    durationMinutes: synced.durationMinutes,
    timeInputMode: row.timeInputMode ?? 'duration',
  };
}

export function useTaskInputRows({
  initialRows,
  initialSelectedTaskId,
  defaultDraftAiScheduled = false,
  getExistingTasks,
  planningDefaults,
  schedulingContext,
}: UseTaskInputRowsArgs) {
  const [taskRows, setTaskRowsState] = useState(() => normalizeRows(initialRows));
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId);
  const { planningDay, referenceNow } = schedulingContext;

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
  const defaultDuration = planningDefaults?.durationMinutes ?? 60;

  const selectedTaskStart =
    expandedTask?.startTime ??
    planningDefaults?.preferredStart ??
    getRoundedStartTime(referenceNow);
  const selectedTaskEnd =
    expandedTask?.endTime ??
    formatInputTime(
      addMinutes(
        parseTimeInput(selectedTaskStart, planningDay) ?? planningDay.toISOString(),
        expandedTask?.durationMinutes ?? defaultDuration,
      ),
    );
  const selectedTaskDuration = expandedTask?.durationMinutes ?? defaultDuration;
  const selectedTimeInputMode: ManualTimeInputMode = expandedTask?.timeInputMode ?? 'duration';

  const selectedTimeValidation: ManualTaskTimeValidation | null = useMemo(() => {
    if (!expandedTask || expandedTask.aiScheduled) return null;
    const synced = withSyncedManualTimes(expandedTask, planningDay);
    return validateManualTaskTimes(synced.startTime, synced.endTime, schedulingContext, {
      existingTasks: getExistingTasks?.() ?? [],
      plannerRows: committedRows,
      excludeRowId: expandedTask.id,
    });
  }, [committedRows, expandedTask, getExistingTasks, planningDay, schedulingContext]);

  const updateTaskRow = (taskId: string, patch: Partial<TaskInputRow>) => {
    setTaskRows((rows) =>
      rows.map((row) => {
        if (row.id !== taskId) return row;
        const next = normalizeTaskInputRow({ ...row, ...patch });
        if (next.aiScheduled) return next;
        return withSyncedManualTimes(next, planningDay);
      }),
    );
  };

  const applyMemoryForRow = (taskId: string) => {
    const row = taskRows.find((item) => item.id === taskId);
    if (!row || !hasTaskRowTitle(row)) return;
    const memoryPatch = applyTitleMemory(row, getExistingTasks?.() ?? []);
    if (Object.keys(memoryPatch).length > 0) {
      updateTaskRow(taskId, memoryPatch);
    }
  };

  const closeDraftRow = () => {
    setTaskRows((rows) =>
      rows.flatMap((row) => {
        if (!row.isDraft) return [row];
        if (!hasTaskRowTitle(row)) return [];
        return [withSyncedManualTimes({ ...row, isDraft: false }, planningDay)];
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

    if (!expandedTask.aiScheduled && selectedTimeValidation?.error) {
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
        row.id === expandedTask.id
          ? withSyncedManualTimes({ ...row, isDraft: false }, planningDay)
          : row,
      );
      const withoutDraft = committed.filter((row) => !row.isDraft);
      const nextDraft = createDraftTaskInputRow(
        withoutDraft.at(-1),
        '',
        buildDraftRowOptions(
          withoutDraft,
          defaultDraftAiScheduled,
          getExistingTasks,
          planningDefaults,
          schedulingContext,
        ),
      );
      setSelectedTaskId(nextDraft.id);
      return [...withoutDraft, nextDraft];
    });
    return false;
  };

  const addTaskRow = (title = '') => {
    if (draftTask) {
      setSelectedTaskId(draftTask.id);
      if (title) {
        updateTaskRow(draftTask.id, { title });
        applyMemoryForRow(draftTask.id);
      }
      return;
    }

    setTaskRows((rows) => {
      const next = createDraftTaskInputRow(
        rows.at(-1),
        title,
        buildDraftRowOptions(
          rows,
          defaultDraftAiScheduled,
          getExistingTasks,
          planningDefaults,
          schedulingContext,
        ),
      );
      const withMemory = title
        ? withSyncedManualTimes(
            normalizeTaskInputRow({
              ...next,
              ...applyTitleMemory({ ...next, title }, getExistingTasks?.() ?? []),
            }),
            planningDay,
          )
        : next;
      setSelectedTaskId(withMemory.id);
      return [...rows, withMemory];
    });
  };

  const removeSelectedTaskRow = () => {
    setTaskRows((rows) => {
      if (rows.length === 1) {
        setSelectedTaskId(null);
        return [];
      }

      setSelectedTaskId(null);
      return rows.filter((row) => row.id !== selectedTaskId);
    });
  };

  const selectQuickAdd = (value: string) => {
    if (expandedTask && !hasTaskRowTitle(expandedTask)) {
      updateTaskRow(expandedTask.id, { title: value });
      applyMemoryForRow(expandedTask.id);
      return;
    }
    addTaskRow(value);
  };

  const changeTaskTitle = (taskId: string, title: string) => {
    updateTaskRow(taskId, { title: title ?? '' });
  };

  const commitTitleMemory = (taskId: string) => {
    applyMemoryForRow(taskId);
  };

  const changeSelectedTimeInputMode = (mode: ManualTimeInputMode) => {
    if (!expandedTask || expandedTask.aiScheduled) return;
    const synced = withSyncedManualTimes({ ...expandedTask, timeInputMode: mode }, planningDay);
    updateTaskRow(expandedTask.id, synced);
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
    selectedTaskDuration,
    selectedTimeInputMode,
    selectedTimeValidation,
    selectTaskRow,
    changeTaskTitle,
    commitTitleMemory,
    addTaskRow,
    removeSelectedTaskRow,
    selectQuickAdd,
    cancelTaskTimeEdit,
    confirmTaskTimeEdit,
    updateTaskRow,
    changeSelectedStart: (value: string) => {
      if (expandedTask && !expandedTask.aiScheduled) {
        updateTaskRow(expandedTask.id, { startTime: value });
      }
    },
    changeSelectedEnd: (value: string) => {
      if (expandedTask && !expandedTask.aiScheduled) {
        updateTaskRow(expandedTask.id, { endTime: value, timeInputMode: 'end' });
      }
    },
    changeSelectedDuration: (value: number) => {
      if (expandedTask && !expandedTask.aiScheduled) {
        updateTaskRow(expandedTask.id, {
          durationMinutes: clampDuration(value),
          timeInputMode: 'duration',
        });
      }
    },
    changeSelectedTimeInputMode,
    changeDescription: (taskId: string, description: string) => {
      updateTaskRow(taskId, { description: description || null });
    },
    changeEstimatedDuration: (taskId: string, value: number | null) => {
      updateTaskRow(taskId, {
        estimatedDurationMinutes: value != null && value > 0 ? clampDuration(value) : null,
      });
    },
  };
}
