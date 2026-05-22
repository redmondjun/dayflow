import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabBar, type MainTabId } from '../components/MainTabBar';
import type { RootStackParamList } from '../navigation/types';
import { MyPageScreen } from '../screens/MyPageScreen';
import { WeeklyInsightScreen } from '../screens/WeeklyInsightScreen';
import { HomeScreenView } from '../views/HomeScreenView';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type PreviewProps = {
  scenarioId: 'home-empty' | 'home-active' | 'home-completed';
  onBack: () => void;
};

type Props = RouteProps | PreviewProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

export function HomeScreen(props: Props) {
  const isRoute = isRouteProps(props);
  const [activeTab, setActiveTab] = useState<MainTabId>('main');

  return (
    <View className="flex-1 bg-paper">
      <View className="flex-1">
        {activeTab === 'main' ? (
          isRoute ? (
            <HomeScreenView
              onEditTask={(taskId) => props.navigation.navigate('EditTask', { taskId })}
              onCreateTask={() => props.navigation.navigate('CreateTask')}
              onOpenAiSchedule={() => props.navigation.navigate('AISchedule')}
            />
          ) : (
            <HomeScreenView scenarioId={props.scenarioId} onBack={props.onBack} />
          )
        ) : activeTab === 'weekly' ? (
          <WeeklyInsightScreen
            onOptimizeTomorrow={
              isRoute ? () => props.navigation.navigate('AISchedule') : props.onBack
            }
          />
        ) : (
          <MyPageScreen
            onEditProfile={
              isRoute ? () => props.navigation.navigate('Onboarding', { mode: 'edit' }) : undefined
            }
            onOpenSettings={isRoute ? () => props.navigation.navigate('Settings') : props.onBack}
            onOpenPreviewCatalog={
              isRoute && __DEV__ ? () => props.navigation.navigate('PreviewCatalog') : undefined
            }
          />
        )}
      </View>
      {isRoute ? <MainTabBar activeTab={activeTab} onSelectTab={setActiveTab} /> : null}
    </View>
  );
}
