import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { PreviewCatalogScreen } from '../dev-preview/PreviewCatalogScreen';
import { PreviewScenarioScreen } from '../dev-preview/PreviewScenarioScreen';
import { AIScheduleScreen } from '../screens/AIScheduleScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { WeeklyInsightScreen } from '../screens/WeeklyInsightScreen';
import { hasCompletedOnboarding } from '../services/onboardingProfile';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [initialRouteName, setInitialRouteName] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let mounted = true;

    hasCompletedOnboarding()
      .then((completed) => {
        if (mounted) setInitialRouteName(completed ? 'Home' : 'Onboarding');
      })
      .catch(() => {
        if (mounted) setInitialRouteName('Onboarding');
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!initialRouteName) return <View className="flex-1 bg-paper" />;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F4' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreateTask" component={TaskFormScreen} />
      <Stack.Screen name="EditTask" component={TaskFormScreen} />
      <Stack.Screen name="AISchedule" component={AIScheduleScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="WeeklyInsight" component={WeeklyInsightScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {__DEV__ ? <Stack.Screen name="PreviewCatalog" component={PreviewCatalogScreen} /> : null}
      {__DEV__ ? <Stack.Screen name="PreviewScenario" component={PreviewScenarioScreen} /> : null}
    </Stack.Navigator>
  );
}
