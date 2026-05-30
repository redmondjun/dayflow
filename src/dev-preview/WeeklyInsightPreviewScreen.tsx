import { weeklyInsightPreviewSummary } from './mockData';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';
import { WeeklyInsightView } from '../views/WeeklyInsightView';

type Props = {
  scenarioId: 'weekly-empty' | 'weekly-data';
  onOptimizeTomorrow: () => void;
  onBack?: () => void;
};

function buildPreviewSummary(scenarioId: Props['scenarioId']) {
  if (scenarioId === 'weekly-data') return weeklyInsightPreviewSummary;

  return {
    ...buildWeeklyInsightSummary([]),
    dateRange: weeklyInsightPreviewSummary.dateRange,
  };
}

export function WeeklyInsightPreviewScreen({ scenarioId, onOptimizeTomorrow, onBack }: Props) {
  return (
    <WeeklyInsightView
      summary={buildPreviewSummary(scenarioId)}
      onOptimizeTomorrow={onOptimizeTomorrow}
      onBack={onBack}
    />
  );
}
