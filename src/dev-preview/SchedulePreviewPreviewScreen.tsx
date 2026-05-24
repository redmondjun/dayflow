import { SchedulePreviewView } from '../views/SchedulePreviewView';
import { makeGeneratedPreviewTasks } from './mockData';

type Props = {
  onBack: () => void;
};

export function SchedulePreviewPreviewScreen({ onBack }: Props) {
  return (
    <SchedulePreviewView
      tasks={makeGeneratedPreviewTasks()}
      loading={false}
      error={null}
      onDismissError={() => {}}
      onBack={onBack}
      onConfirm={onBack}
    />
  );
}
