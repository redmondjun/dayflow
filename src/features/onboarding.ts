export type OnboardingCommitmentAnswer = {
  option: string;
  startTime?: string;
  endTime?: string;
};

export type OnboardingAnswer = string | OnboardingCommitmentAnswer;

export type OnboardingOption = {
  value: string;
  label: string;
};

export type OnboardingStep = {
  id: string;
  question: string;
  kind: 'text' | 'time' | 'options' | 'commitments' | 'weekdays';
  helperLabel?: string;
  helperText?: string;
  options?: readonly string[];
  optionItems?: readonly OnboardingOption[];
  selectionStyle?: 'default' | 'centered';
};

export const FOCUS_WINDOW_OPTIONS = [
  { value: 'Morning', label: 'Morning (6 AM – 11 AM)' },
  { value: 'Afternoon', label: 'Afternoon (12 PM – 5 PM)' },
  { value: 'Evening', label: 'Evening (5 PM – 9 PM)' },
  { value: 'Late night', label: 'Late night (9 PM – 11:30 PM)' },
] as const;

export const WEEKEND_RHYTHM_SAME = 'Same as weekdays';
export const WEEKEND_RHYTHM_DIFFERENT = 'Different on weekends';

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'name',
    question: "What's your name?",
    kind: 'text',
  },
  {
    id: 'wake',
    question: 'What time do you usually wake up?',
    kind: 'time',
    helperLabel: 'Wake-up time',
  },
  {
    id: 'sleep',
    question: 'What time do you usually go to sleep?',
    kind: 'time',
    helperLabel: 'Bedtime',
  },
  {
    id: 'work',
    question: 'When do you usually start working?',
    kind: 'time',
    helperLabel: 'Work start',
  },
  {
    id: 'work-end',
    question: 'When do you usually finish work?',
    kind: 'time',
    helperLabel: 'Work end',
  },
  {
    id: 'work-days',
    question: 'Which days do you usually work?',
    kind: 'weekdays',
    helperText: "Tasks on other days won't be blocked by work hours.",
  },
  {
    id: 'weekend-rhythm',
    question: 'How are your weekends different?',
    kind: 'options',
    options: [WEEKEND_RHYTHM_SAME, WEEKEND_RHYTHM_DIFFERENT],
  },
  {
    id: 'weekend-wake',
    question: 'What time do you usually wake up on weekends?',
    kind: 'time',
    helperLabel: 'Weekend wake-up',
  },
  {
    id: 'weekend-focus',
    question: 'When do you focus best on weekends?',
    kind: 'options',
    optionItems: FOCUS_WINDOW_OPTIONS,
  },
  {
    id: 'weekend-free-time',
    question: 'How much free time do you have on weekends?',
    kind: 'options',
    options: ['Less than 1 hour', '1-2 hours', '2-3 hours', '3-4 hours', '4+ hours'],
  },
  {
    id: 'commitment-presence',
    question: 'Do you have fixed commitments like school or work?',
    kind: 'options',
    options: ['Yes', 'No'],
  },
  {
    id: 'commitment-time',
    question: 'What time are your fixed commitments?',
    kind: 'commitments',
    options: [
      "I don't have fixed commitments",
      'Morning (6AM - 12PM)',
      'Afternoon (12PM - 6PM)',
      'Evening (6PM - 10PM)',
      'Custom',
    ],
  },
  {
    id: 'focus',
    question: 'When do you focus best?',
    kind: 'options',
    optionItems: FOCUS_WINDOW_OPTIONS,
  },
  {
    id: 'free-time',
    question: 'How much free time do you have per day?',
    kind: 'options',
    options: ['Less than 1 hour', '1-2 hours', '2-3 hours', '3-4 hours', '4+ hours'],
  },
  {
    id: 'goal',
    question: 'What do you want to create a schedule for?',
    kind: 'options',
    options: ['Study', 'Work', 'Exercise', 'Self-improvement', 'Build habits', 'Other'],
  },
];

export const defaultOnboardingAnswers: Record<string, OnboardingAnswer> = {
  name: '',
  wake: '7:00 AM',
  sleep: '11:00 PM',
  work: '9:00 AM',
  'work-end': '5:00 PM',
  'work-days': 'Mon,Tue,Wed,Thu,Fri',
  'weekend-rhythm': WEEKEND_RHYTHM_SAME,
  'weekend-wake': '8:00 AM',
  'weekend-focus': 'Morning',
  'weekend-free-time': '2-3 hours',
};

const weekendStepIds = new Set(['weekend-wake', 'weekend-focus', 'weekend-free-time']);

export function getVisibleOnboardingSteps(answers: Record<string, OnboardingAnswer>) {
  const hasFixedCommitments = answers['commitment-presence'] === 'Yes';
  const hasAnsweredNoFixedCommitments = answers['commitment-presence'] === 'No';
  const usesDifferentWeekends = answers['weekend-rhythm'] === WEEKEND_RHYTHM_DIFFERENT;

  return onboardingSteps.filter((step) => {
    if (weekendStepIds.has(step.id)) return usesDifferentWeekends;
    if (step.id === 'commitment-time') return hasFixedCommitments || !hasAnsweredNoFixedCommitments;
    return true;
  });
}
