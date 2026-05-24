import { useEffect, useState } from 'react';
import {
  clearDemoNowOverride,
  setDemoNowOverride,
  setWeeklyPreviewEnabled,
  useDevDemoState,
} from '../services/devDemo';
import { clearOnboardingProfile } from '../services/onboardingProfile';
import { useTaskStore } from '../store/taskStore';
import {
  formatDateInput,
  formatDateLabel,
  formatDisplayLabel,
  formatTimeInput,
  parseDemoDateOnly,
  parseDemoDateTime,
} from '../utils/demoDateTime';

export function useDemoDevTools(setMessage: (message: string | null) => void) {
  const { nowOverride, weeklyPreviewEnabled } = useDevDemoState();
  const deleteTasksForDay = useTaskStore((state) => state.deleteTasksForDay);
  const [deletingDemoTasks, setDeletingDemoTasks] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('');

  useEffect(() => {
    if (!__DEV__) return;
    const source = nowOverride ? new Date(nowOverride) : new Date();
    setDemoDate(formatDateInput(source));
    setDemoTime(formatTimeInput(source));
  }, [nowOverride]);

  const saveDemoTime = () => {
    if (!__DEV__) return false;
    const parsed = parseDemoDateTime(demoDate, demoTime);
    if (!parsed) {
      setMessage('Enter a valid demo date and time.');
      return false;
    }
    setDemoNowOverride(parsed.toISOString());
    setMessage(`Demo time set to ${formatDisplayLabel(parsed)}.`);
    return true;
  };

  const resetDemoTime = () => {
    if (!__DEV__) return;
    clearDemoNowOverride();
    const now = new Date();
    setDemoDate(formatDateInput(now));
    setDemoTime(formatTimeInput(now));
    setMessage('Demo time reset to live time.');
  };

  const toggleWeeklyPreview = (value: boolean) => {
    if (!__DEV__) return;
    setWeeklyPreviewEnabled(value);
    setMessage(value ? 'Weekly demo preview enabled.' : 'Weekly demo preview disabled.');
  };

  const deleteDemoDayTasks = async () => {
    if (!__DEV__) return;
    const parsed = parseDemoDateOnly(demoDate);
    if (!parsed) {
      setMessage('Enter a valid demo date.');
      return;
    }

    setDeletingDemoTasks(true);
    setMessage(null);
    try {
      const deletedCount = await deleteTasksForDay(parsed);
      setMessage(
        deletedCount === 0
          ? `No tasks found for ${formatDateLabel(parsed)}.`
          : `Deleted ${deletedCount} task${deletedCount === 1 ? '' : 's'} for ${formatDateLabel(parsed)}.`,
      );
    } catch {
      setMessage('Could not delete demo day tasks.');
    } finally {
      setDeletingDemoTasks(false);
    }
  };

  const clearOnboarding = async () => {
    try {
      await clearOnboardingProfile();
      setMessage('Onboarding profile cleared.');
      return true;
    } catch {
      setMessage('Could not clear onboarding profile.');
      return false;
    }
  };

  return {
    clearOnboarding,
    deleteDemoDayTasks,
    demoDate,
    demoNowOverride: nowOverride,
    demoTime,
    deletingDemoTasks,
    resetDemoTime,
    saveDemoTime,
    setDemoDate,
    setDemoTime,
    toggleWeeklyPreview,
    weeklyPreviewEnabled,
  };
}
