import type { WeeklyInsightSummary } from '../../types/insight';

const START_TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export function isValidScheduleStartTime(value: string): boolean {
  const match = START_TIME_PATTERN.exec(value.trim());
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export type AiGeneratedTask = {
  title: string;
  durationMinutes: number;
  startTime: string;
};

export type AiWeeklyInsight = Pick<WeeklyInsightSummary, 'patterns' | 'suggestions'>;

export function validateGeneratedTasks(value: unknown): AiGeneratedTask[] {
  if (!value || typeof value !== 'object' || !('tasks' in value)) {
    throw new Error('AI response did not include tasks.');
  }

  const tasks = value.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('AI response did not include any tasks.');
  }

  return tasks.map((task) => {
    if (!task || typeof task !== 'object') {
      throw new Error('AI response included an invalid task.');
    }

    if (!('title' in task) || typeof task.title !== 'string' || !task.title.trim()) {
      throw new Error('AI response included a task without a title.');
    }
    if (
      !('durationMinutes' in task) ||
      typeof task.durationMinutes !== 'number' ||
      !Number.isFinite(task.durationMinutes)
    ) {
      throw new Error('AI response included an invalid duration.');
    }
    if (
      !('startTime' in task) ||
      typeof task.startTime !== 'string' ||
      !isValidScheduleStartTime(task.startTime)
    ) {
      throw new Error('AI response included an invalid start time.');
    }

    return {
      title: task.title.trim(),
      durationMinutes: Math.round(task.durationMinutes),
      startTime: task.startTime.trim(),
    };
  });
}

export function validateWeeklyInsight(value: unknown): AiWeeklyInsight {
  if (!value || typeof value !== 'object') {
    throw new Error('AI response did not include weekly insights.');
  }

  if (!('patterns' in value) || !Array.isArray(value.patterns)) {
    throw new Error('AI response did not include patterns.');
  }
  if (!('suggestions' in value) || !Array.isArray(value.suggestions)) {
    throw new Error('AI response did not include suggestions.');
  }

  const patterns = value.patterns.map((pattern) => {
    if (!pattern || typeof pattern !== 'object') {
      throw new Error('AI response included an invalid pattern.');
    }
    if (!('label' in pattern) || typeof pattern.label !== 'string' || !pattern.label.trim()) {
      throw new Error('AI response included a pattern without a label.');
    }
    if (!('text' in pattern) || typeof pattern.text !== 'string' || !pattern.text.trim()) {
      throw new Error('AI response included a pattern without text.');
    }
    return { label: pattern.label.trim(), text: pattern.text.trim() };
  });

  const suggestions = value.suggestions.map((suggestion) => {
    if (!suggestion || typeof suggestion !== 'object') {
      throw new Error('AI response included an invalid suggestion.');
    }
    if (!('text' in suggestion) || typeof suggestion.text !== 'string' || !suggestion.text.trim()) {
      throw new Error('AI response included a suggestion without text.');
    }
    if (
      !('action' in suggestion) ||
      typeof suggestion.action !== 'string' ||
      !suggestion.action.trim()
    ) {
      throw new Error('AI response included a suggestion without an action.');
    }
    return { text: suggestion.text.trim(), action: suggestion.action.trim() };
  });

  if (patterns.length === 0) throw new Error('AI response did not include any patterns.');
  if (suggestions.length === 0) throw new Error('AI response did not include any suggestions.');

  return { patterns, suggestions };
}
