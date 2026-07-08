import { useEffect, useRef, useState } from 'react';
import {
  getActiveAiApiKey,
  getAiSuggestionEnabled,
  subscribeAiSettingsChanges,
} from '../services/apiKey';
import { generateGeminiWeeklyInsight } from '../services/gemini';
import { generateNvidiaWeeklyInsight } from '../services/nvidia';
import {
  formatOnboardingProfileForPrompt,
  getOnboardingProfile,
} from '../services/onboardingProfile';
import { generateWeeklyInsight, type AiWeeklyInsight } from '../services/openai';
import type { Task } from '../types/task';
import type { WeeklyInsightSummary } from '../types/insight';
import { hasRecentCompletedOrSkippedTasks } from '../utils/weeklyInsight';
import { useMountedRef } from './useMountedRef';

type Params = {
  tasks: Task[];
  baseSummary: WeeklyInsightSummary;
  effectiveNow: Date;
  weeklyPreviewEnabled: boolean;
};

export function useWeeklyAiInsight({
  tasks,
  baseSummary,
  effectiveNow,
  weeklyPreviewEnabled,
}: Params) {
  const [patterns, setPatterns] = useState<WeeklyInsightSummary['patterns']>([]);
  const [suggestions, setSuggestions] = useState<WeeklyInsightSummary['suggestions']>([]);
  const [aiSettingsVersion, setAiSettingsVersion] = useState(0);
  const loadingRef = useRef(false);
  const mountedRef = useMountedRef();

  useEffect(() => {
    return subscribeAiSettingsChanges(() => {
      setAiSettingsVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    setPatterns([]);
    setSuggestions([]);

    async function loadAiInsight() {
      if (__DEV__ && weeklyPreviewEnabled) return;
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const [activeKey, aiSuggestionEnabled] = await Promise.all([
          getActiveAiApiKey(),
          getAiSuggestionEnabled(),
        ]);
        if (
          !mountedRef.current ||
          !aiSuggestionEnabled ||
          !hasRecentCompletedOrSkippedTasks(tasks, effectiveNow) ||
          !activeKey
        ) {
          return;
        }

        const profile = await getOnboardingProfile();
        if (!mountedRef.current) return;

        const formattedProfile = formatOnboardingProfileForPrompt(profile);
        const insightGenerators: Record<string, (key: string) => Promise<AiWeeklyInsight>> = {
          openai: (key) => generateWeeklyInsight(key, tasks, baseSummary, formattedProfile),
          google: (key) => generateGeminiWeeklyInsight(key, tasks, baseSummary, formattedProfile),
          nvidia: (key) => generateNvidiaWeeklyInsight(key, tasks, baseSummary, formattedProfile),
        };
        const insight: AiWeeklyInsight = await insightGenerators[activeKey.provider](activeKey.key);
        if (mountedRef.current) {
          setPatterns(insight.patterns);
          setSuggestions(insight.suggestions);
        }
      } catch {
        if (mountedRef.current) {
          setPatterns([]);
          setSuggestions([]);
        }
      } finally {
        loadingRef.current = false;
      }
    }

    void loadAiInsight();
  }, [aiSettingsVersion, baseSummary, effectiveNow, tasks, weeklyPreviewEnabled]);

  return { patterns, suggestions };
}
