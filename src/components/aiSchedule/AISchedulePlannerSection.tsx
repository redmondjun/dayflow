import { Button } from 'react-native-paper';
import { PlannerHeader } from '../LightScreenPrimitives';
import { colors } from '../../theme/colors';
import { formatPlanningDayLabel } from '../../features/taskPlanning/planningDay';
import { useAIScheduleContext } from './context';
import { DaySelector } from './DaySelector';
import { QuickAddSection } from './QuickAddSection';
import { TaskInputCard } from './TaskInputCard';

export function AISchedulePlannerSection() {
  const {
    onCancel,
    planningDayKey,
    setPlanningDayKey,
    planningDay,
    effectiveNow,
    isFuturePlanningDay,
  } = useAIScheduleContext();

  const title = isFuturePlanningDay ? 'Plan ahead' : 'Plan your day';
  const subtitle = isFuturePlanningDay
    ? formatPlanningDayLabel(planningDay)
    : 'Add your tasks and set a time for each.';

  return (
    <>
      <PlannerHeader
        title={title}
        subtitle={subtitle}
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
      <DaySelector
        selectedDayKey={planningDayKey}
        onSelectDayKey={setPlanningDayKey}
        referenceNow={effectiveNow}
      />
      <TaskInputCard />
      <QuickAddSection />
    </>
  );
}
