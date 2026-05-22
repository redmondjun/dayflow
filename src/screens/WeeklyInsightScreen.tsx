import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  HairlineDivider,
  PillActionButton,
  SectionEyebrow,
} from '../components/LightScreenPrimitives';
import { makeCompletedHeavyTasks } from '../dev-preview/mockData';
import type { RootStackParamList } from '../navigation/types';
import {
  getAiFeaturesEnabled,
  getGeminiApiKey,
  getOpenAIApiKey,
  subscribeAiSettingsChanges,
} from '../services/apiKey';
import { generateGeminiWeeklyInsight } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { generateWeeklyInsight, type AiWeeklyInsight } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import { colors } from '../theme/colors';
import type { WeeklyInsightSummary } from '../types/insight';
import type { Task } from '../types/task';
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

function buildEmbeddedSummary(props: EmbeddedProps) {
  if (props.scenarioId === 'weekly-data') return weeklyInsightDataPreviewSummary;
  if (props.scenarioId === 'weekly-empty') {
    return {
      ...buildWeeklyInsightSummary([]),
      dateRange: weeklyInsightDataPreviewSummary.dateRange,
    };
  }
  return buildWeeklyInsightSummary(makeCompletedHeavyTasks());
}

function hasRecentCompletedOrSkippedTasks(tasks: Task[]): boolean {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return tasks.some((task) => {
    const start = new Date(task.startTime);
    return (
      start >= weekStart &&
      start <= now &&
      (task.status === 'completed' || task.status === 'skipped')
    );
  });
}

const weeklyInsightDataPreviewSummary: WeeklyInsightSummary = {
  dateRange: 'Apr 21 - Apr 28',
  headline: 'You are most productive in the morning',
  basedOn: 'Based on your last 7 days',
  completionPercent: 76,
  skippedPercent: 24,
  peakHourLabel: '10 AM',
  timeChart: [
    { label: '8', value: 1 },
    { label: '10', value: 4 },
    { label: '12', value: 3 },
    { label: '2', value: 2 },
    { label: '4', value: 1 },
    { label: '6', value: 0 },
  ],
  patterns: [
    { label: 'After 4 PM', text: 'Completion rate drops sharply.' },
    { label: 'Long tasks', text: '90-min blocks often left unfinished.' },
    { label: '9-11 AM', text: 'Highest output quality of the day.' },
  ],
  suggestions: [
    {
      text: 'Reserve deep work for the morning, before other meetings.',
      action: 'Apply to tomorrow',
    },
    {
      text: 'Split tasks over 90 minutes into two separate blocks.',
      action: 'Use this plan',
    },
    {
      text: 'Move lower-priority tasks to the afternoon.',
      action: 'Try this week',
    },
  ],
  reflection: 'Your schedule is improving compared to last week.',
};

export function WeeklyInsightScreen(props: Props) {
  const tasks = useTaskStore((state) => state.tasks);
  const routeMode = isRouteProps(props);
  const previewMode = !routeMode && Boolean(props.scenarioId);
  const actualMode = routeMode || !previewMode;
  const baseSummary = useMemo(
    () => (actualMode ? buildWeeklyInsightSummary(tasks) : buildEmbeddedSummary(props)),
    [actualMode, props, tasks],
  );
  const [aiInsight, setAiInsight] = useState<AiWeeklyInsight | null>(null);
  const [aiSettingsVersion, setAiSettingsVersion] = useState(0);
  const loadingAiInsightRef = useRef(false);
  const mountedRef = useRef(true);
  const summary = actualMode
    ? {
        ...baseSummary,
        patterns: aiInsight?.patterns ?? [],
        suggestions: aiInsight?.suggestions ?? [],
      }
    : baseSummary;
  const onOptimizeTomorrow = isRouteProps(props)
    ? () => props.navigation.navigate('AISchedule')
    : props.onOptimizeTomorrow;
  const peak = Math.max(1, ...summary.timeChart.map((item) => item.value));

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!actualMode) return undefined;
    return subscribeAiSettingsChanges(() => {
      setAiSettingsVersion((version) => version + 1);
    });
  }, [actualMode]);

  useEffect(() => {
    if (!actualMode) return;
    setAiInsight(null);

    async function loadAiInsight() {
      if (loadingAiInsightRef.current) return;
      loadingAiInsightRef.current = true;
      try {
        const [openAiApiKey, geminiApiKey, aiFeaturesEnabled] = await Promise.all([
          getOpenAIApiKey(),
          getGeminiApiKey(),
          getAiFeaturesEnabled(),
        ]);
        if (!mountedRef.current || !aiFeaturesEnabled || !hasRecentCompletedOrSkippedTasks(tasks)) {
          return;
        }
        if (!openAiApiKey && !geminiApiKey) return;

        const profile = await getOnboardingProfile();
        if (!mountedRef.current) return;

        const formattedProfile = formatOnboardingProfileForPrompt(profile);
        const insight = openAiApiKey
          ? await generateWeeklyInsight(openAiApiKey, tasks, baseSummary, formattedProfile)
          : await generateGeminiWeeklyInsight(
              geminiApiKey ?? '',
              tasks,
              baseSummary,
              formattedProfile,
            );
        if (mountedRef.current) setAiInsight(insight);
      } catch {
        if (mountedRef.current) setAiInsight(null);
      } finally {
        loadingAiInsightRef.current = false;
      }
    }

    void loadAiInsight();
  }, [actualMode, aiSettingsVersion, baseSummary, tasks]);

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
                    testID={`weekly-time-chart-bar-${item.label}`}
                    style={{
                      height: Math.max(4, (item.value / peak) * 52),
                      backgroundColor:
                        item.value > 0 && item.value === peak ? colors.accent : colors.warm3,
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
                testID="weekly-completion-progress-bar"
                style={{ width: `${summary.completionPercent}%` }}
                className="h-full rounded-full bg-accent"
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

        {summary.patterns.length > 0 ? (
          <>
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
          </>
        ) : null}

        {summary.suggestions.length > 0 ? (
          <>
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
          </>
        ) : null}

        <View className="px-6">
          <PillActionButton
            label={`Optimize tomorrow's schedule ->`}
            onPress={onOptimizeTomorrow}
            buttonColor={colors.accent}
          />
          <Text className="mt-5 text-center text-xs text-warm2">{summary.reflection}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
