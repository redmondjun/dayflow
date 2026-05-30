import { sortTaskInputs } from '../taskPlanning';
import { validateManualTaskTimes } from './scheduling';
import type { SchedulingContext } from './planningDay';
import type { NewTaskInput, Task, TaskInputRow } from '../../types/task';
import { parseTimeInput } from '../../utils/time';

type ValidateOptions = {
  existingTasks: Task[];
  context: SchedulingContext;
};

export function validateManualTaskRows(
  rows: TaskInputRow[],
  { existingTasks, context }: ValidateOptions,
): { error: string | null; inputs: NewTaskInput[] } {
  const inputs: NewTaskInput[] = [];

  for (const task of rows) {
    const start = parseTimeInput(task.startTime, context.planningDay);
    const end = parseTimeInput(task.endTime, context.planningDay);
    const validation = validateManualTaskTimes(task.startTime, task.endTime, context, {
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
  context,
  addTasks,
}: {
  manualRows: TaskInputRow[];
  existingTasks: Task[];
  context: SchedulingContext;
  addTasks: (inputs: NewTaskInput[]) => Promise<void>;
}): Promise<{ error: string | null }> {
  if (manualRows.length === 0) {
    return { error: 'Add at least one task first.' };
  }

  const { error, inputs } = validateManualTaskRows(manualRows, { existingTasks, context });
  if (error) return { error };

  await addTasks(sortTaskInputs(inputs));
  return { error: null };
}

export function validateHybridManualRows(
  manualRows: TaskInputRow[],
  existingTasks: Task[],
  context: SchedulingContext,
): string | null {
  for (const task of manualRows) {
    const validation = validateManualTaskTimes(task.startTime, task.endTime, context, {
      existingTasks,
      plannerRows: manualRows,
      excludeRowId: task.id,
    });
    if (validation.error) return validation.error;
  }
  return null;
}
