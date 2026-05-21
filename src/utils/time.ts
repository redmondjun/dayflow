import type { Task } from '../types/task';

export const minutesInDay = 24 * 60;

export function toIsoToday(minutes: number, baseDate = new Date()): string {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutes);
  return date.toISOString();
}

export function minutesFromDate(value: string | Date): number {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.getHours() * 60 + date.getMinutes();
}

export function parseTimeInput(value: string, baseDate = new Date()): string | null {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function formatInputTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function toWheelTime(value: string) {
  const [hoursText = '0', minutesText = '0'] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '7:00 AM';
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

export function fromWheelTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return '07:00';
  const hour12 = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  const hours24 = meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseWheelTimeValue(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i.exec(value ?? '');
  return {
    hour: match?.[1] ?? '7',
    minute: match?.[2] ?? '00',
    meridiem: (match?.[3] ?? 'AM').toUpperCase(),
  };
}

export function composeWheelTimeValue(hour: string, minute: string, meridiem: string) {
  return `${hour}:${minute} ${meridiem}`;
}

export function formatWheelTimeRange(start: string, end: string) {
  return `${toWheelTime(start)} - ${toWheelTime(end)}`;
}

export function formatDisplayTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDisplayDate(value = new Date()): { weekday: string; dayMonth: string } {
  return {
    weekday: value.toLocaleDateString([], { weekday: 'long' }),
    dayMonth: value.toLocaleDateString([], { day: 'numeric', month: 'long' }),
  };
}

export function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function durationBetween(startTime: string, endTime: string): number {
  return Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
  );
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function sortByStartTime(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

export function getTodayTasks(tasks: Task[], now = new Date()): Task[] {
  return sortByStartTime(tasks.filter((task) => isSameLocalDay(new Date(task.startTime), now)));
}

export function getCurrentTask(tasks: Task[], now = new Date()): Task | undefined {
  const nowMs = now.getTime();
  return sortByStartTime(tasks).find((task) => {
    if (task.status !== 'scheduled') return false;
    const start = new Date(task.startTime).getTime();
    const end = new Date(task.endTime).getTime();
    return start <= nowMs && nowMs < end;
  });
}

export function getUpcomingTasks(tasks: Task[], now = new Date()): Task[] {
  const nowMs = now.getTime();
  return sortByStartTime(
    tasks.filter(
      (task) => task.status === 'scheduled' && new Date(task.startTime).getTime() > nowMs,
    ),
  );
}

export function getRemainingMinutes(task: Task, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(task.endTime).getTime() - now.getTime()) / 60000));
}

export function addMinutes(value: string | Date, minutes: number): string {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
