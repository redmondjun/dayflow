import { Pressable, ScrollView, Text, View } from 'react-native';
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
  onBack?: () => void;
};

export function WeeklyInsightView({ summary, onOptimizeTomorrow, onBack }: Props) {
  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName={`pb-8 ${onBack ? 'pt-16' : 'pt-5'}`}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            testID="weekly-insight-back"
            className="mb-4 h-11 w-11 items-start justify-center px-6"
          >
            <Text className="text-[28px] leading-none text-ink">‹</Text>
          </Pressable>
        ) : null}
        <WeeklyInsightHeader summary={summary} />
        <WeeklyInsightHeadline summary={summary} />
        <WeeklyInsightStats summary={summary} />
        <WeeklyInsightPatterns summary={summary} />
        <WeeklyInsightSuggestions summary={summary} />
        <WeeklyInsightFooter summary={summary} onOptimizeTomorrow={onOptimizeTomorrow} />
      </ScrollView>
    </View>
  );
}
