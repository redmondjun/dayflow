import { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabBar, type MainTabId } from '../components/MainTabBar';
import type { RootStackParamList } from '../navigation/types';
import { isRouteScreenProps } from '../navigation/routeProps';
import { MyPageScreen } from '../screens/MyPageScreen';
import { WeeklyInsightScreen } from '../screens/WeeklyInsightScreen';
import { HomeScreenView } from '../views/HomeScreenView';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type PreviewProps = {
  scenarioId: 'home-empty' | 'home-active' | 'home-completed';
  onBack: () => void;
};

type Props = RouteProps | PreviewProps;

export function HomeScreen(props: Props) {
  const isRoute = isRouteScreenProps<RouteProps, PreviewProps>(props);
  const [activeTab, setActiveTab] = useState<MainTabId>('main');

  return (
    <View className="flex-1 bg-paper">
      <View className="flex-1">
        {activeTab === 'main' ? (
          isRoute ? (
            <HomeScreenView
              onEditTask={(taskId) => props.navigation.navigate('EditTask', { taskId })}
              onCreateTask={() => props.navigation.navigate('CreateTask')}
            />
          ) : (
            <HomeScreenView scenarioId={props.scenarioId} onBack={props.onBack} />
          )
        ) : activeTab === 'weekly' ? (
          <WeeklyInsightScreen
            onOptimizeTomorrow={
              isRoute
                ? () => props.navigation.navigate('CreateTask', { aiEnabled: true })
                : props.onBack
            }
          />
        ) : (
          <MyPageScreen
            onEditProfile={
              isRoute ? () => props.navigation.navigate('Onboarding', { mode: 'edit' }) : undefined
            }
            onOpenSettings={isRoute ? () => props.navigation.navigate('Settings') : props.onBack}
          />
        )}
      </View>
      {isRoute ? <MainTabBar activeTab={activeTab} onSelectTab={setActiveTab} /> : null}
    </View>
  );
}
