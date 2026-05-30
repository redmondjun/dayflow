import * as SQLite from 'expo-sqlite';
import type { NewTaskInput, Task, TaskStatus } from '../types/task';
import { createId } from '../utils/id';

const DB_NAME = 'dayflow.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type TaskRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: TaskStatus;
  ai_generated: number;
  created_at: string;
  updated_at: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  notification_id: string | null;
  description: string | null;
  category: string | null;
  estimated_duration_minutes: number | null;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    aiGenerated: row.ai_generated === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    actualStartTime: row.actual_start_time,
    actualEndTime: row.actual_end_time,
    notificationId: row.notification_id,
    description: row.description,
    category: row.category,
    estimatedDurationMinutes: row.estimated_duration_minutes,
  };
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      ai_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      actual_start_time TEXT,
      actual_end_time TEXT,
      notification_id TEXT,
      description TEXT,
      category TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_start_time ON tasks(start_time);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);

  try {
    await db.execAsync('ALTER TABLE tasks ADD COLUMN estimated_duration_minutes INTEGER');
  } catch {
    // Column already exists.
  }
}

export async function loadTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>('SELECT * FROM tasks ORDER BY start_time ASC');
  return rows.map(rowToTask);
}

function buildTaskFromInput(input: NewTaskInput): Task {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: input.title.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    status: input.status ?? 'scheduled',
    aiGenerated: input.aiGenerated ?? false,
    createdAt: now,
    updatedAt: now,
    actualStartTime: null,
    actualEndTime: null,
    notificationId: null,
    description: input.description ?? null,
    category: input.category ?? null,
    estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
  };
}

async function insertTask(db: SQLite.SQLiteDatabase, task: Task): Promise<void> {
  await db.runAsync(
    `INSERT INTO tasks (
      id, title, start_time, end_time, status, ai_generated, created_at, updated_at,
      actual_start_time, actual_end_time, notification_id, description, category,
      estimated_duration_minutes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    task.id,
    task.title,
    task.startTime,
    task.endTime,
    task.status,
    task.aiGenerated ? 1 : 0,
    task.createdAt,
    task.updatedAt,
    task.actualStartTime ?? null,
    task.actualEndTime ?? null,
    task.notificationId ?? null,
    task.description ?? null,
    task.category ?? null,
    task.estimatedDurationMinutes ?? null,
  );
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const task = buildTaskFromInput(input);
  const db = await getDb();
  await insertTask(db, task);
  return task;
}

export async function bulkCreateTasks(inputs: NewTaskInput[]): Promise<Task[]> {
  const created: Task[] = [];
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      const task = buildTaskFromInput(input);
      await insertTask(db, task);
      created.push(task);
    }
  });

  return created;
}

export async function updateTask(
  taskId: string,
  input: Partial<NewTaskInput> & { status?: TaskStatus; notificationId?: string | null },
): Promise<Task> {
  const existing = await getTask(taskId);
  if (!existing) throw new Error('Task not found');

  const updated: Task = {
    ...existing,
    title: input.title?.trim() ?? existing.title,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    status: input.status ?? existing.status,
    aiGenerated: input.aiGenerated ?? existing.aiGenerated,
    notificationId:
      input.notificationId !== undefined ? input.notificationId : existing.notificationId,
    description: input.description !== undefined ? input.description : existing.description,
    category: input.category !== undefined ? input.category : existing.category,
    estimatedDurationMinutes:
      input.estimatedDurationMinutes !== undefined
        ? input.estimatedDurationMinutes
        : existing.estimatedDurationMinutes,
    updatedAt: new Date().toISOString(),
  };

  const db = await getDb();
  await db.runAsync(
    `UPDATE tasks
     SET title = ?, start_time = ?, end_time = ?, status = ?, ai_generated = ?, updated_at = ?,
         notification_id = ?, description = ?, category = ?, estimated_duration_minutes = ?
     WHERE id = ?`,
    updated.title,
    updated.startTime,
    updated.endTime,
    updated.status,
    updated.aiGenerated ? 1 : 0,
    updated.updatedAt,
    updated.notificationId ?? null,
    updated.description ?? null,
    updated.category ?? null,
    updated.estimatedDurationMinutes ?? null,
    updated.id,
  );

  return updated;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const now = new Date().toISOString();
  const existing = await getTask(taskId);
  if (!existing) throw new Error('Task not found');

  const actualEndTime =
    status === 'completed' || status === 'skipped' ? now : existing.actualEndTime;
  const db = await getDb();
  await db.runAsync(
    `UPDATE tasks
     SET status = ?, actual_end_time = ?, updated_at = ?
     WHERE id = ?`,
    status,
    actualEndTime ?? null,
    now,
    taskId,
  );

  return {
    ...existing,
    status,
    actualEndTime,
    updatedAt: now,
  };
}

export async function updateTaskNotificationId(
  taskId: string,
  notificationId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE tasks SET notification_id = ?, updated_at = ? WHERE id = ?',
    notificationId,
    new Date().toISOString(),
    taskId,
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', taskId);
}

export async function deleteTasksForDay(day: Date): Promise<Task[]> {
  const startOfDay = new Date(day);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(day);
  endOfDay.setHours(23, 59, 59, 999);

  const db = await getDb();
  const rows = await db.getAllAsync<TaskRow>(
    'SELECT * FROM tasks WHERE start_time >= ? AND start_time <= ? ORDER BY start_time ASC',
    [startOfDay.toISOString(), endOfDay.toISOString()],
  );
  const toDelete = rows.map(rowToTask);

  if (toDelete.length === 0) return [];

  await db.withTransactionAsync(async () => {
    for (const task of toDelete) {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', task.id);
    }
  });

  return toDelete;
}

export async function getTask(taskId: string): Promise<Task | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', taskId);
  return row ? rowToTask(row) : null;
}
