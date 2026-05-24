import { sortTaskInputs } from '../taskPlanning';
import { validateManualTaskTimes } from './scheduling';
import type { NewTaskInput, Task, TaskInputRow } from '../../types/task';
import { parseTimeInput } from '../../utils/time';

type ValidateOptions = {
  existingTasks: Task[];
  now: Date;
};

export function validateManualTaskRows(
  rows: TaskInputRow[],
  { existingTasks, now }: ValidateOptions,
): { error: string | null; inputs: NewTaskInput[] } {
  const inputs: NewTaskInput[] = [];

  for (const task of rows) {
    const start = parseTimeInput(task.startTime, now);
    const end = parseTimeInput(task.endTime, now);
    const validation = validateManualTaskTimes(task.startTime, task.endTime, now, {
      existingTasks,
      plannerRows: rows,
      excludeRowId: task.id,
    });
    if (!start || !end || validation.error) {
      return {
        error: validation.error ?? 'Each task needs a valid start and end time.',
        inputs: [],
      };
    }
    inputs.push({
      title: task.title,
      startTime: start,
      endTime: end,
      aiGenerated: false,
      status: validation.willMarkCompleted ? 'completed' : 'scheduled',
    });
  }

  return { error: null, inputs };
}

export async function submitManualSchedule({
  manualRows,
  existingTasks,
  now,
  addTasks,
}: {
  manualRows: TaskInputRow[];
  existingTasks: Task[];
  now: Date;
  addTasks: (inputs: NewTaskInput[]) => Promise<void>;
}): Promise<{ error: string | null }> {
  if (manualRows.length === 0) {
    return { error: 'Add at least one task first.' };
  }

  const { error, inputs } = validateManualTaskRows(manualRows, { existingTasks, now });
  if (error) return { error };

  await addTasks(sortTaskInputs(inputs));
  return { error: null };
}

export function validateHybridManualRows(
  manualRows: TaskInputRow[],
  existingTasks: Task[],
  now: Date,
): string | null {
  for (const task of manualRows) {
    const validation = validateManualTaskTimes(task.startTime, task.endTime, now, {
      existingTasks,
      plannerRows: manualRows,
      excludeRowId: task.id,
    });
    if (validation.error) return validation.error;
  }
  return null;
}
