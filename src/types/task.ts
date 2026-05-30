export type TaskStatus = 'scheduled' | 'completed' | 'skipped';

export type ManualTimeInputMode = 'duration' | 'end';

export type Task = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: TaskStatus;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  notificationId?: string | null;
  description?: string | null;
  category?: string | null;
  estimatedDurationMinutes?: number | null;
};

export type NewTaskInput = {
  title: string;
  startTime: string;
  endTime: string;
  aiGenerated?: boolean;
  status?: TaskStatus;
  description?: string | null;
  category?: string | null;
  estimatedDurationMinutes?: number | null;
};

export type GeneratedTaskPreview = {
  id: string;
  title: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  aiGenerated?: boolean;
  description?: string | null;
  estimatedDurationMinutes?: number | null;
};

export type TaskInputRow = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  aiScheduled?: boolean;
  isDraft?: boolean;
  description?: string | null;
  durationMinutes?: number | null;
  estimatedDurationMinutes?: number | null;
  timeInputMode?: ManualTimeInputMode;
};
