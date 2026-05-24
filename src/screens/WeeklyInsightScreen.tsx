import { useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  getAiSuggestionEnabled,
  getGeminiApiKey,
  getOpenAIApiKey,
  subscribeAiSettingsChanges,
} from '../services/apiKey';
import { generateGeminiWeeklyInsight } from '../services/gemini';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { getDemoAdjustedTasks, getEffectiveNow, useDevDemoState } from '../services/devDemo';
import { generateWeeklyInsight, type AiWeeklyInsight } from '../services/openai';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types/task';
import { buildWeeklyInsightSummary } from '../utils/weeklyInsight';
import { WeeklyInsightView } from '../views/WeeklyInsightView';
import { weeklyInsightPreviewSummary } from '../dev-preview/mockData';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'WeeklyInsight'>;
type EmbeddedProps = {
  onOptimizeTomorrow: () => void;
};

type Props = RouteProps | EmbeddedProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

function hasRecentCompletedOrSkippedTasks(tasks: Task[], now: Date): boolean {
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

export function WeeklyInsightScreen(props: Props) {
  const tasks = useTaskStore((state) => state.tasks);
  const { nowOverride, weeklyPreviewEnabled } = useDevDemoState();
  const effectiveNow = useMemo(() => getEffectiveNow(), [nowOverride]);
  const effectiveTasks = useMemo(
    () => getDemoAdjustedTasks(tasks, effectiveNow),
    [effectiveNow, tasks],
  );
  const baseSummary = useMemo(
    () =>
      __DEV__ && weeklyPreviewEnabled
        ? weeklyInsightPreviewSummary
        : buildWeeklyInsightSummary(effectiveTasks, effectiveNow),
    [effectiveNow, effectiveTasks, weeklyPreviewEnabled],
  );
  const [aiInsight, setAiInsight] = useState<AiWeeklyInsight | null>(null);
  const [aiSettingsVersion, setAiSettingsVersion] = useState(0);
  const loadingAiInsightRef = useRef(false);
  const mountedRef = useRef(true);
  const summary = {
    ...baseSummary,
    patterns: aiInsight?.patterns ?? [],
    suggestions: aiInsight?.suggestions ?? [],
  };
  const onOptimizeTomorrow = isRouteProps(props)
    ? () => props.navigation.navigate('CreateTask', { aiEnabled: true })
    : props.onOptimizeTomorrow;

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    return subscribeAiSettingsChanges(() => {
      setAiSettingsVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    setAiInsight(null);

    async function loadAiInsight() {
      if (__DEV__ && weeklyPreviewEnabled) return;
      if (loadingAiInsightRef.current) return;
      loadingAiInsightRef.current = true;
      try {
        const [openAiApiKey, geminiApiKey, aiSuggestionEnabled] = await Promise.all([
          getOpenAIApiKey(),
          getGeminiApiKey(),
          getAiSuggestionEnabled(),
        ]);
        if (
          !mountedRef.current ||
          !aiSuggestionEnabled ||
          !hasRecentCompletedOrSkippedTasks(effectiveTasks, effectiveNow)
        ) {
          return;
        }
        if (!openAiApiKey && !geminiApiKey) return;

        const profile = await getOnboardingProfile();
        if (!mountedRef.current) return;

        const formattedProfile = formatOnboardingProfileForPrompt(profile);
        const insight = openAiApiKey
          ? await generateWeeklyInsight(openAiApiKey, effectiveTasks, baseSummary, formattedProfile)
          : await generateGeminiWeeklyInsight(
              geminiApiKey ?? '',
              effectiveTasks,
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
  }, [aiSettingsVersion, baseSummary, effectiveNow, effectiveTasks, weeklyPreviewEnabled]);

  return <WeeklyInsightView summary={summary} onOptimizeTomorrow={onOptimizeTomorrow} />;
}
