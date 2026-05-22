import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { AIScheduleScreen } from '../screens/AIScheduleScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { WeeklyInsightScreen } from '../screens/WeeklyInsightScreen';
import { previewScenarios } from './scenarios';

type Props = NativeStackScreenProps<RootStackParamList, 'PreviewScenario'>;

export function PreviewScenarioScreen({ navigation, route }: Props) {
  const scenario = previewScenarios.find((item) => item.id === route.params.scenarioId);
  const onBack = () => navigation.goBack();

  if (!scenario) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="text-lg font-semibold text-ink">Unknown preview scenario.</Text>
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
    return <OnboardingScreen onExit={onBack} />;
  }

  if (scenario.id.startsWith('task-')) {
    return (
      <TaskFormScreen scenarioId={scenario.id as 'task-create' | 'task-edit'} onCancel={onBack} />
    );
  }

  if (scenario.id.startsWith('ai-')) {
    return <AIScheduleScreen onCancel={onBack} onOpenSettings={onBack} scenarioId={scenario.id} />;
  }

  if (scenario.id.startsWith('weekly-')) {
    return (
      <WeeklyInsightScreen
        scenarioId={scenario.id as 'weekly-empty' | 'weekly-data'}
        onOptimizeTomorrow={onBack}
      />
    );
  }

  return <SettingsScreen onCancel={onBack} onOpenPreviewCatalog={onBack} />;
}
