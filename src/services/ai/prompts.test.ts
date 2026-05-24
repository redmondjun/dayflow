import { describe, expect, it } from '@jest/globals';
import { buildSchedulePrompt } from './prompts';
import type { ScheduleGenerationContext } from '../../features/taskPlanning/profileScheduling';

describe('buildSchedulePrompt', () => {
  it('includes focus window, free-time budget, and ignore-order rules', () => {
    const scheduleContext: ScheduleGenerationContext = {
      planningDayLabel: 'Today, May 23',
      earliestStart: '07:00',
      latestEnd: '23:00',
      focusWindow: { start: '17:00', end: '21:00', label: 'Evening' },
      freeTimeBudget: { minMinutes: 60, maxMinutes: 120, label: '1-2 hours' },
      scheduleGoal: 'Study',
      userProfile: '- Focus best: Evening',
    };

    const prompt = buildSchedulePrompt(['Deep work', 'Email'], scheduleContext);

    expect(prompt).toContain('ignore input order');
    expect(prompt).toContain('Focus window (place demanding/deep work here): Evening: 17:00–21:00');
    expect(prompt).toContain('Free time budget: 1-2 hours (60–120 total minutes');
    expect(prompt).toContain('Schedule goal: Study');
    expect(prompt).toContain('- Deep work');
    expect(prompt).toContain('- Email');
  });
});
