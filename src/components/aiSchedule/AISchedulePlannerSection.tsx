import { Button } from 'react-native-paper';
import { PlannerHeader } from '../LightScreenPrimitives';
import { colors } from '../../theme/colors';
import { useAIScheduleContext } from './context';
import { QuickAddSection } from './QuickAddSection';
import { TaskInputCard } from './TaskInputCard';

export function AISchedulePlannerSection() {
  const { onCancel } = useAIScheduleContext();

  return (
    <>
      <PlannerHeader
        title="Plan your day"
        subtitle="Add your tasks and set a time for each."
        action={
          <Button
            mode="text"
            compact
            textColor={colors.warm}
            onPress={onCancel}
            testID="ai-schedule-back"
          >
            Close
          </Button>
        }
      />
      <TaskInputCard />
      <QuickAddSection />
    </>
  );
}
