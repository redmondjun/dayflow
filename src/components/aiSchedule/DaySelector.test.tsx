import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DaySelector } from './DaySelector';
import { getTodayKey, getTomorrowKey } from '../../features/taskPlanning/planningDay';

describe('DaySelector', () => {
  it('renders today and tomorrow options by default', () => {
    const referenceNow = new Date(2026, 4, 23, 10, 0, 0, 0);
    const onSelectDayKey = jest.fn();

    render(
      <DaySelector
        selectedDayKey={getTodayKey(referenceNow)}
        onSelectDayKey={onSelectDayKey}
        referenceNow={referenceNow}
      />,
    );

    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('Tomorrow')).toBeOnTheScreen();
  });

  it('fires onSelectDayKey with tomorrow key', () => {
    const referenceNow = new Date(2026, 4, 23, 10, 0, 0, 0);
    const onSelectDayKey = jest.fn();

    render(
      <DaySelector
        selectedDayKey={getTodayKey(referenceNow)}
        onSelectDayKey={onSelectDayKey}
        referenceNow={referenceNow}
      />,
    );

    fireEvent.press(screen.getByText('Tomorrow'));

    expect(onSelectDayKey).toHaveBeenCalledWith(getTomorrowKey(referenceNow));
  });
});
