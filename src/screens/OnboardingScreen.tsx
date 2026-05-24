import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { defaultOnboardingAnswers, type OnboardingAnswer } from '../features/onboarding';
import type { RootStackParamList } from '../navigation/types';
import { getOnboardingProfile, saveOnboardingProfile } from '../services/onboardingProfile';
import { OnboardingFlowView } from '../views/OnboardingFlowView';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation, route }: Props) {
  const editMode = route.params?.mode === 'edit';
  const [initialAnswers, setInitialAnswers] =
    useState<Record<string, OnboardingAnswer>>(defaultOnboardingAnswers);
  const [loadingProfile, setLoadingProfile] = useState(editMode);

  useEffect(() => {
    if (!editMode) {
      setLoadingProfile(false);
      return;
    }

    let mounted = true;
    setLoadingProfile(true);
    getOnboardingProfile()
      .then((profile) => {
        if (!mounted || !profile) return;
        setInitialAnswers({ ...defaultOnboardingAnswers, ...profile });
      })
      .catch(() => {
        if (mounted) setInitialAnswers(defaultOnboardingAnswers);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [editMode]);

  if (loadingProfile) return null;

  return (
    <OnboardingFlowView
      initialAnswers={initialAnswers}
      onFinish={() => navigation.navigate('Home')}
      onExit={editMode ? () => navigation.goBack() : undefined}
      onSubmit={saveOnboardingProfile}
    />
  );
}
