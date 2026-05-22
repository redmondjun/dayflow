import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AISchedulePlannerSection,
  AIScheduleProvider,
  AISchedulePreviewSection,
  AIScheduleShell,
} from '../components/AIScheduleSections';
import type { RootStackParamList } from '../navigation/types';
import { useAIScheduleState } from './useAIScheduleState';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'AISchedule'>;

type EmbeddedProps = {
  onCancel: () => void;
  onOpenSettings: () => void;
  scenarioId?: string;
};

type Props = RouteProps | EmbeddedProps;

function isRouteProps(props: Props): props is RouteProps {
  return 'navigation' in props;
}

export function AIScheduleScreen(props: Props) {
  const isPreview = !isRouteProps(props);
  const scenarioId = isRouteProps(props) ? undefined : props.scenarioId;
  const onCancel = isRouteProps(props) ? () => props.navigation.goBack() : props.onCancel;
  const onOpenSettings = isRouteProps(props)
    ? () => props.navigation.navigate('Settings')
    : props.onOpenSettings;
  const onComplete = isRouteProps(props) ? () => props.navigation.goBack() : props.onCancel;
  const schedule = useAIScheduleState({ isPreview, scenarioId, onComplete });

  return (
    <AIScheduleProvider value={{ ...schedule, onCancel, onOpenSettings }}>
      <AIScheduleShell>
        <AISchedulePlannerSection />
        <AISchedulePreviewSection />
      </AIScheduleShell>
    </AIScheduleProvider>
  );
}
