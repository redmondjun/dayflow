import { useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { weeklyInsightPreviewSummary } from '../dev-preview/mockData';
import { getTomorrowKey } from '../features/taskPlanning/planningDay';
import { useEffectiveDemoTasks } from '../hooks/useEffectiveDemoTasks';
import { useWeeklyAiInsight } from '../hooks/useWeeklyAiInsight';
import type { RootStackParamList } from '../navigation/types';
import { isRouteScreenProps } from '../navigation/routeProps';
import { getEffectiveNow } from '../services/devDemo';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';
import { WeeklyInsightView } from '../views/WeeklyInsightView';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'WeeklyInsight'>;
type EmbeddedProps = {
  onOptimizeTomorrow: () => void;
};

type Props = RouteProps | EmbeddedProps;

export function WeeklyInsightScreen(props: Props) {
  const { effectiveNow, effectiveTasks, weeklyPreviewEnabled } = useEffectiveDemoTasks();
  const baseSummary = useMemo(
    () =>
      __DEV__ && weeklyPreviewEnabled
        ? weeklyInsightPreviewSummary
        : buildWeeklyInsightSummary(effectiveTasks, effectiveNow),
    [effectiveNow, effectiveTasks, weeklyPreviewEnabled],
  );
  const { patterns, suggestions } = useWeeklyAiInsight({
    tasks: effectiveTasks,
    baseSummary,
    effectiveNow,
    weeklyPreviewEnabled,
  });
  const onOptimizeTomorrow = isRouteScreenProps<RouteProps, EmbeddedProps>(props)
    ? () =>
        props.navigation.navigate('CreateTask', {
          aiEnabled: true,
          planningDayKey: getTomorrowKey(getEffectiveNow()),
        })
    : props.onOptimizeTomorrow;
  const onBack = isRouteScreenProps<RouteProps, EmbeddedProps>(props)
    ? () => props.navigation.goBack()
    : undefined;

  return (
    <WeeklyInsightView
      summary={{ ...baseSummary, patterns, suggestions }}
      onOptimizeTomorrow={onOptimizeTomorrow}
      onBack={onBack}
    />
  );
}
