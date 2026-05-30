import { OnboardingFlowView } from '../views/OnboardingFlowView';

type Props = {
  onExit: () => void;
};

export function OnboardingPreviewScreen({ onExit }: Props) {
  return <OnboardingFlowView onExit={onExit} onFinish={onExit} onSubmit={() => undefined} />;
}
