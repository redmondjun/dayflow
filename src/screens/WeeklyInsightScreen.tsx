import { useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { weeklyInsightPreviewSummary } from '../dev-preview/mockData';
import { useEffectiveDemoTasks } from '../hooks/useEffectiveDemoTasks';
import { useWeeklyAiInsight } from '../hooks/useWeeklyAiInsight';
import type { RootStackParamList } from '../navigation/types';
import { hasNavigation } from '../navigation/routeProps';
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
  const onOptimizeTomorrow = hasNavigation(props)
    ? () => props.navigation.navigate('CreateTask', { aiEnabled: true })
    : props.onOptimizeTomorrow;

  return (
    <WeeklyInsightView
      summary={{ ...baseSummary, patterns, suggestions }}
      onOptimizeTomorrow={onOptimizeTomorrow}
    />
  );
}
