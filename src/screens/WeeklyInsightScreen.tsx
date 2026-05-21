import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  HairlineDivider,
  PillActionButton,
  SectionEyebrow,
} from '../components/LightScreenPrimitives';
import { makeCompletedHeavyTasks } from '../dev-preview/mockData';
import type { RootStackParamList } from '../navigation/types';
import { useTaskStore } from '../store/taskStore';
import { colors } from '../theme/colors';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'WeeklyInsight'>;
type EmbeddedProps = {
  onOptimizeTomorrow: () => void;
  scenarioId?: 'weekly-empty' | 'weekly-data';
};

type Props = RouteProps | EmbeddedProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

export function WeeklyInsightScreen(props: Props) {
  const tasks = useTaskStore((state) => state.tasks);
  const summary = isRouteProps(props)
    ? buildWeeklyInsightSummary(tasks)
    : buildWeeklyInsightSummary(
        props.scenarioId === 'weekly-empty'
          ? []
          : props.scenarioId === 'weekly-data'
            ? makeCompletedHeavyTasks()
            : tasks,
      );
  const onOptimizeTomorrow = isRouteProps(props)
    ? () => props.navigation.navigate('AISchedule')
    : props.onOptimizeTomorrow;
  const peak = Math.max(1, ...summary.timeChart.map((item) => item.value));

  return (
    <View className="flex-1 bg-paper">
      <ScrollView contentContainerClassName="pb-8 pt-5">
        <View className="px-6 pb-6">
          <SectionEyebrow>{summary.dateRange}</SectionEyebrow>
          <Text className="mt-3 text-[34px] font-bold leading-[39px] tracking-[-1.3px] text-ink">
            Weekly Insight
          </Text>
          <Text className="mt-2 text-sm font-medium text-warm">{summary.basedOn}</Text>
        </View>

        <HairlineDivider />

        <View className="px-6 py-8">
          <SectionEyebrow>Main Insight</SectionEyebrow>
          <Text className="mt-4 text-[28px] font-bold leading-[39px] tracking-[-0.9px] text-ink">
            {summary.headline}
          </Text>
          <View className="mt-6 h-[2.5px] w-8 rounded-full bg-accent" />
        </View>

        <View className="grid-cols-2 flex-row gap-2 px-6 pb-8">
          <View className="flex-1 rounded-2xl border border-warm3 bg-paper px-3.5 py-3.5">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-warm">
              Time of day
            </Text>
            <View className="mt-4 h-[68px] flex-row items-end justify-center gap-1.5">
              {summary.timeChart.map((item) => (
                <View key={item.label} className="items-center gap-1">
                  <View
                    style={{
                      height: Math.max(4, (item.value / peak) * 52),
                      backgroundColor:
                        item.label === summary.timeChart[1]?.label ? colors.accent : colors.warm3,
                    }}
                    className="w-[15px] rounded-t-[3px]"
                  />
                  <Text className="text-[9px] text-warm2">{item.label}</Text>
                </View>
              ))}
            </View>
            <Text className="mt-2 text-[11px] text-warm3">
              Peak <Text className="font-semibold text-ink">{summary.peakHourLabel}</Text>
            </Text>
          </View>

          <View className="flex-1 rounded-2xl border border-warm3 bg-paper px-3.5 py-3.5">
            <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-warm">
              Completion
            </Text>
            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-warm3">
              <View
                style={{ width: `${summary.completionPercent}%` }}
                className="h-full rounded-full bg-ink"
              />
            </View>
            <Text className="mt-3 text-2xl font-bold tracking-[-1px] text-ink">
              {summary.completionPercent}%
            </Text>
            <Text className="text-[10px] uppercase tracking-[0.6px] text-warm">Done</Text>
            <Text className="mt-2 text-base font-semibold text-warm">
              {summary.skippedPercent}%
            </Text>
            <Text className="text-[10px] uppercase tracking-[0.6px] text-warm2">Skipped</Text>
          </View>
        </View>

        <HairlineDivider />

        <View className="px-6 py-8">
          <SectionEyebrow>Patterns</SectionEyebrow>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {summary.patterns.map((pattern, index) => (
              <View
                key={pattern.label}
                className={`${index === summary.patterns.length - 1 ? 'w-full' : 'flex-1'} rounded-[14px] bg-warm4 px-4 py-4`}
              >
                <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-ink">
                  {pattern.label}
                </Text>
                <View className="my-2 h-[1.5px] w-4 rounded-full bg-warm2" />
                <Text className="text-[13px] leading-4 tracking-[-0.1px] text-warm">
                  {pattern.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <HairlineDivider />

        <View className="px-6 py-8">
          <SectionEyebrow>Suggestions</SectionEyebrow>
          <View className="mt-4 gap-2.5">
            {summary.suggestions.map((suggestion) => (
              <View
                key={suggestion.text}
                className="rounded-2xl border-[1.5px] border-warm2 bg-paper px-[18px] py-4"
              >
                <Text className="text-[15px] font-medium tracking-[-0.1px] text-ink">
                  {suggestion.text}
                </Text>
                <Text className="mt-3 text-right text-xs font-medium text-warm">
                  {suggestion.action} {'->'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="px-6">
          <PillActionButton
            label={`Optimize tomorrow's schedule ->`}
            onPress={onOptimizeTomorrow}
          />
          <Text className="mt-5 text-center text-xs text-warm2">{summary.reflection}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
