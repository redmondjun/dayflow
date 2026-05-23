import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { OnboardingPreviewScreen } from './OnboardingPreviewScreen';
import { previewScenarios } from './scenarios';
import { WeeklyInsightPreviewScreen } from './WeeklyInsightPreviewScreen';

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
    return <OnboardingPreviewScreen onExit={onBack} />;
  }

  if (scenario.id.startsWith('task-')) {
    return (
      <TaskFormScreen scenarioId={scenario.id as 'task-create' | 'task-edit'} onCancel={onBack} />
    );
  }

  if (scenario.id.startsWith('weekly-')) {
    return (
      <WeeklyInsightPreviewScreen
        scenarioId={scenario.id as 'weekly-empty' | 'weekly-data'}
        onOptimizeTomorrow={onBack}
      />
    );
  }

  return <SettingsScreen onCancel={onBack} onOpenPreviewCatalog={onBack} />;
}
