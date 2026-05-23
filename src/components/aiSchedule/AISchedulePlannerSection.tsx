import { PlannerHeader } from '../LightScreenPrimitives';
import { QuickAddSection } from './QuickAddSection';
import { TaskInputCard } from './TaskInputCard';

export function AISchedulePlannerSection() {
  return (
    <>
      <PlannerHeader title="Plan your day" subtitle="Add your tasks and set a time for each." />
      <TaskInputCard />
      <QuickAddSection />
    </>
  );
}
