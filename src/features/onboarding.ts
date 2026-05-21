export type OnboardingCommitmentAnswer = {
  option: string;
  startTime?: string;
  endTime?: string;
};

export type OnboardingAnswer = string | OnboardingCommitmentAnswer;

export type OnboardingStep = {
  id: string;
  question: string;
  kind: 'text' | 'time' | 'options' | 'commitments';
  helperLabel?: string;
  options?: readonly string[];
  selectionStyle?: 'default' | 'centered';
};

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
    id: 'work',
    question: 'When do you usually start working?',
    kind: 'time',
    helperLabel: 'Work start',
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
    options: ['Morning', 'Afternoon', 'Evening', 'Late night'],
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
  work: '9:00 AM',
};

export function getVisibleOnboardingSteps(answers: Record<string, OnboardingAnswer>) {
  const hasFixedCommitments = answers['commitment-presence'] === 'Yes';
  const hasAnsweredNoFixedCommitments = answers['commitment-presence'] === 'No';

  return onboardingSteps.filter((step) => {
    if (step.id === 'commitment-time') return hasFixedCommitments || !hasAnsweredNoFixedCommitments;
    return true;
  });
}
