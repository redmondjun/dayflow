import type { EditableTaskForm } from '../navigation/types';
import type { Task } from '../types/task';

export function toEditableTaskForm(task: Task | null | undefined): EditableTaskForm | undefined {
  if (!task) return undefined;
  return {
    title: task.title,
    startTime: task.startTime,
    endTime: task.endTime,
    status: task.status,
  };
}
