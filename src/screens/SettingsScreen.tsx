import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSettingsState } from '../hooks/useSettingsState';
import type { RootStackParamList } from '../navigation/types';
import { isRouteScreenProps } from '../navigation/routeProps';
import { SettingsView } from '../views/SettingsView';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type EmbeddedProps = {
  onCancel?: () => void;
  onOpenPreviewCatalog?: () => void;
  hideDeveloperTools?: boolean;
};

type Props = RouteProps | EmbeddedProps;

export function SettingsScreen(props: Props) {
  const settings = useSettingsState();
  const isRoute = isRouteScreenProps<RouteProps, EmbeddedProps>(props);

  const onCancel = isRoute ? () => props.navigation.goBack() : props.onCancel;
  const onOpenPreviewCatalog = isRoute
    ? __DEV__
      ? () => props.navigation.navigate('PreviewCatalog')
      : undefined
    : props.onOpenPreviewCatalog;
  const onOpenWeeklyInsight = isRoute
    ? () => props.navigation.navigate('WeeklyInsight')
    : undefined;
  const hideDeveloperTools = isRoute ? false : Boolean(props.hideDeveloperTools);
  const showDeveloperTools = __DEV__ && !hideDeveloperTools;
  const onResetOnboarding = isRoute
    ? async () => {
        const cleared = await settings.clearOnboarding();
        if (cleared) props.navigation.replace('Onboarding');
      }
    : async () => {
        await settings.clearOnboarding();
      };

  return (
    <SettingsView
      {...settings}
      onCancel={onCancel}
      onOpenPreviewCatalog={onOpenPreviewCatalog}
      onOpenWeeklyInsight={onOpenWeeklyInsight}
      onResetOnboarding={onResetOnboarding}
      showDeveloperTools={showDeveloperTools}
    />
  );
}
