import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WeeklyInsightSummary } from '../types/insight';
import {
  WeeklyInsightFooter,
  WeeklyInsightHeader,
  WeeklyInsightHeadline,
  WeeklyInsightPatterns,
  WeeklyInsightStats,
  WeeklyInsightSuggestions,
} from './WeeklyInsightSections';

type Props = {
  summary: WeeklyInsightSummary;
  onOptimizeTomorrow: () => void;
};

export function WeeklyInsightView({ summary, onOptimizeTomorrow }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-paper" edges={['top']}>
      <ScrollView contentContainerClassName="pb-8 pt-5">
        <WeeklyInsightHeader summary={summary} />
        <WeeklyInsightHeadline summary={summary} />
        <WeeklyInsightStats summary={summary} />
        <WeeklyInsightPatterns summary={summary} />
        <WeeklyInsightSuggestions summary={summary} />
        <WeeklyInsightFooter summary={summary} onOptimizeTomorrow={onOptimizeTomorrow} />
      </ScrollView>
    </SafeAreaView>
  );
}
