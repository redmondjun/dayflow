import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

export function useSchedulePreviewNavigation({
  showingPreview,
  onClearPreview,
}: {
  showingPreview: boolean;
  onClearPreview: () => void;
}) {
  const navigation = useNavigation();

  usePreventRemove(showingPreview, () => {
    onClearPreview();
  });

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !showingPreview,
    });
  }, [navigation, showingPreview]);

  useEffect(() => {
    if (!showingPreview) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClearPreview();
      return true;
    });

    return () => subscription.remove();
  }, [onClearPreview, showingPreview]);
}
