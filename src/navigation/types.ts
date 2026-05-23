import type { TaskStatus } from '../types/task';

export type RootStackParamList = {
  Home: undefined;
  CreateTask: { aiEnabled?: boolean } | undefined;
  EditTask: { taskId: string };
  Onboarding: { mode?: 'setup' | 'edit' } | undefined;
  WeeklyInsight: undefined;
  Settings: undefined;
  PreviewCatalog: undefined;
  PreviewScenario: { scenarioId: string };
};

export type EditableTaskForm = {
  title: string;
  startTime: string;
  endTime: string;
  status?: TaskStatus;
};
