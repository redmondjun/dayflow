import type { Task } from '../types/task';
import type { WeeklyInsightSummary } from '../types/insight';
import { minutesFromDate } from './time';

const hourLabels = ['8', '10', '12', '2', '4', '6'];

function formatRange(end = new Date()): string {
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  const monthDay = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${monthDay(start)} - ${monthDay(end)}`;
}

function getPeakDayPart(label: string): 'morning' | 'afternoon' | 'evening' {
  if (label === '8' || label === '10') return 'morning';
  if (label === '12' || label === '2' || label === '4') return 'afternoon';
  return 'evening';
}

export function buildWeeklyInsightSummary(tasks: Task[], now = new Date()): WeeklyInsightSummary {
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekTasks = tasks.filter((task) => {
    const start = new Date(task.startTime);
    return start >= weekStart && start <= now;
  });

  const total = weekTasks.length;
  const completed = weekTasks.filter((task) => task.status === 'completed').length;
  const skipped = weekTasks.filter((task) => task.status === 'skipped').length;
  const completionPercent = total ? Math.round((completed / total) * 100) : 0;
  const skippedPercent = total ? Math.round((skipped / total) * 100) : 0;

  const buckets = hourLabels.map((label) => ({ label, value: 0 }));
  for (const task of weekTasks) {
    if (task.status !== 'completed') continue;
    const hour = Math.floor(minutesFromDate(task.startTime) / 60);
    const bucketIndex = Math.min(buckets.length - 1, Math.max(0, Math.floor((hour - 8) / 2)));
    buckets[bucketIndex].value += 1;
  }

  const peak = buckets.reduce((best, item) => (item.value > best.value ? item : best), buckets[0]);
  const peakHourLabel =
    peak.value > 0
      ? `${peak.label} ${peak.label === '12' || Number(peak.label) < 8 ? 'PM' : 'AM'}`
      : 'N/A';

  const hasData = completed + skipped > 0;

  return {
    dateRange: formatRange(now),
    headline:
      peak.value > 0
        ? `You are most productive in the ${getPeakDayPart(peak.label)}`
        : 'Build a week of task history',
    basedOn: hasData ? 'Based on your last 7 days' : 'Complete tasks to unlock sharper patterns',
    completionPercent,
    skippedPercent,
    peakHourLabel,
    timeChart: buckets,
    patterns: [],
    suggestions: [],
    reflection: hasData
      ? 'Your schedule is improving compared to last week.'
      : 'A weekly pattern will appear here soon.',
  };
}
