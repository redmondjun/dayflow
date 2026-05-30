import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { DayCompleteView } from '../views/DayCompleteView';
import { makeDayCompleteTasks } from './mockData';
import { OnboardingPreviewScreen } from './OnboardingPreviewScreen';
import { previewScenarios } from './scenarios';
import { SchedulePreviewPreviewScreen } from './SchedulePreviewPreviewScreen';
import { WeeklyInsightPreviewScreen } from './WeeklyInsightPreviewScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'PreviewScenario'>;

export function PreviewScenarioScreen({ navigation, route }: Props) {
  const scenario = previewScenarios.find((item) => item.id === route.params.scenarioId);
  const onBack = () => navigation.goBack();

  if (!scenario) {
    return (
      <View className="flex-1 bg-paper px-6 pt-16">
        <Pressable
          onPress={onBack}
          testID="preview-scenario-back"
          className="mb-7 h-11 w-11 items-start justify-center"
        >
          <Text className="text-[28px] leading-none text-ink">‹</Text>
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold text-ink">Unknown preview scenario.</Text>
        </View>
      </View>
    );
  }

  if (scenario.id.startsWith('home-')) {
    return (
      <HomeScreen
        scenarioId={scenario.id as 'home-empty' | 'home-active' | 'home-completed'}
        onBack={onBack}
      />
    );
  }

  if (scenario.id === 'onboarding') {
    return <OnboardingPreviewScreen onExit={onBack} />;
  }

  if (scenario.id.startsWith('task-')) {
    return (
      <TaskFormScreen scenarioId={scenario.id as 'task-create' | 'task-edit'} onCancel={onBack} />
    );
  }

  if (scenario.id === 'ai-schedule-preview') {
    return <SchedulePreviewPreviewScreen onBack={onBack} />;
  }

  if (scenario.id === 'day-complete') {
    return <DayCompleteView tasks={makeDayCompleteTasks()} onDismiss={onBack} />;
  }

  if (scenario.id.startsWith('weekly-')) {
    return (
      <WeeklyInsightPreviewScreen
        scenarioId={scenario.id as 'weekly-empty' | 'weekly-data'}
        onOptimizeTomorrow={onBack}
        onBack={onBack}
      />
    );
  }

  return <SettingsScreen onCancel={onBack} hideDeveloperTools />;
}
