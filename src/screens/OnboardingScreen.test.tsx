import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, PaperProvider } from 'react-native-paper';
import type { RootStackParamList } from '../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';
import { getOnboardingProfile, saveOnboardingProfile } from '../services/onboardingProfile';

jest.mock('../services/onboardingProfile', () => ({
  getOnboardingProfile: jest.fn(),
  saveOnboardingProfile: jest.fn(),
}));

function renderOnboardingScreen(params?: RootStackParamList['Onboarding']) {
  const navigation = {
    navigate: jest.fn(),
  } as unknown as NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

  const route = {
    key: 'Onboarding-test',
    name: 'Onboarding',
    params,
  } as const;

  return {
    navigation,
    ...render(
      <PaperProvider>
        <OnboardingScreen navigation={navigation} route={route} />
      </PaperProvider>,
    ),
  };
}

function answerName(name = 'Chris') {
  fireEvent.changeText(screen.getByTestId('onboarding-name-input'), name);
  fireEvent.press(screen.getByText('Next'));
}

describe('OnboardingScreen', () => {
  const getOnboardingProfileMock = jest.mocked(getOnboardingProfile);
  const saveOnboardingProfileMock = jest.mocked(saveOnboardingProfile);

  beforeEach(() => {
    getOnboardingProfileMock.mockReset();
    getOnboardingProfileMock.mockResolvedValue(null);
    saveOnboardingProfileMock.mockReset();
    saveOnboardingProfileMock.mockResolvedValue();
  });

  it('walks through the full eight-step flow and saves the onboarding profile', async () => {
    const { navigation } = renderOnboardingScreen();

    expect(screen.getByText("What's your name?")).toBeOnTheScreen();
    expect(screen.getByText('1/8')).toBeOnTheScreen();
    answerName();

    expect(screen.getByText('What time do you usually wake up?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('When do you usually start working?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Next'));

    expect(
      screen.getByText('Do you have fixed commitments like school or work?'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('What time are your fixed commitments?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText("I don't have fixed commitments"));
    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('When do you focus best?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Morning'));
    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('How much free time do you have per day?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('1-2 hours'));
    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('What do you want to create a schedule for?')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Study'));
    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByText('All set!')).toBeOnTheScreen());
    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#01B224');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#FFFFFF');
    expect(saveOnboardingProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Chris',
        wake: '7:00 AM',
        work: '9:00 AM',
        'commitment-presence': 'Yes',
        'commitment-time': { option: "I don't have fixed commitments" },
        focus: 'Morning',
        'free-time': '1-2 hours',
        goal: 'Study',
      }),
    );

    fireEvent.press(screen.getByText('Get Started'));

    expect(navigation.navigate).toHaveBeenCalledWith('Home');
  });

  it('shows an error and lets the user retry when saving the profile fails', async () => {
    saveOnboardingProfileMock
      .mockRejectedValueOnce(new Error('storage failed'))
      .mockResolvedValueOnce();

    renderOnboardingScreen();

    answerName();
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText("I don't have fixed commitments"));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Morning'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('1-2 hours'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Study'));
    fireEvent.press(screen.getByText('Next'));

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't save your onboarding profile. Please try again."),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByText('All set!')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByText('All set!')).toBeOnTheScreen());
    expect(saveOnboardingProfileMock).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate profile saves while the final save is running', async () => {
    let resolveSave: () => void = () => {};
    saveOnboardingProfileMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );

    renderOnboardingScreen();

    answerName();
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText("I don't have fixed commitments"));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Morning'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('1-2 hours'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Study'));

    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));

    expect(saveOnboardingProfileMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.UNSAFE_getByType(Button).props.loading).toBe(true));

    await act(async () => {
      resolveSave();
    });

    await waitFor(() => expect(screen.getByText('All set!')).toBeOnTheScreen());
  });

  it('skips fixed-commitment time when the user says no', () => {
    renderOnboardingScreen();

    answerName();
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));

    fireEvent.press(screen.getByText('No'));
    fireEvent.press(screen.getByText('Next'));

    expect(screen.queryByText('What time are your fixed commitments?')).not.toBeOnTheScreen();
    expect(screen.getByText('When do you focus best?')).toBeOnTheScreen();
  });

  it('uses the onboarding next button layout and text treatment', () => {
    renderOnboardingScreen();

    const nextButton = screen.UNSAFE_getByType(Button);

    expect(nextButton.props.style).toMatchObject({ borderRadius: 999 });
    expect(nextButton.props.style).not.toHaveProperty('opacity');
    expect(nextButton.props.contentStyle).toMatchObject({
      height: 52,
      paddingHorizontal: 16,
    });
    expect(nextButton.props.labelStyle).toMatchObject({
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 15,
      letterSpacing: -0.15,
    });
  });

  it('uses the muted soft background for the onboarding back button after the first step', () => {
    renderOnboardingScreen();

    answerName();

    expect(screen.getByTestId('onboarding-back-button').props.className).toContain('bg-warm3');
  });

  it('uses the active next button color when the current question has an answer', () => {
    renderOnboardingScreen();

    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#E8E3D7');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#8A857A');

    fireEvent.changeText(screen.getByTestId('onboarding-name-input'), 'Chris');

    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#01B224');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#FFFFFF');

    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('What time do you usually wake up?')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#01B224');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#FFFFFF');

    fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('When do you usually start working?')).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#01B224');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#FFFFFF');

    fireEvent.press(screen.getByText('Next'));

    expect(
      screen.getByText('Do you have fixed commitments like school or work?'),
    ).toBeOnTheScreen();
    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#E8E3D7');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#8A857A');

    fireEvent.press(screen.getByText('Yes'));

    expect(screen.UNSAFE_getByType(Button).props.buttonColor).toBe('#01B224');
    expect(screen.UNSAFE_getByType(Button).props.textColor).toBe('#FFFFFF');
  });

  it('updates the meridiem selection when the user drags the time wheel', async () => {
    renderOnboardingScreen();

    answerName();

    fireEvent(screen.getByTestId('onboarding-meridiem-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 7:00 PM',
      ),
    );
  });

  it('commits a fast meridiem drag even when momentum end is not emitted', async () => {
    jest.useFakeTimers();

    try {
      renderOnboardingScreen();

      answerName();

      fireEvent(screen.getByTestId('onboarding-meridiem-wheel'), 'scrollEndDrag', {
        nativeEvent: {
          contentOffset: {
            y: 34,
          },
          velocity: {
            y: 1.2,
          },
        },
      });

      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 7:00 AM',
      );

      act(() => {
        jest.advanceTimersByTime(120);
      });

      await waitFor(() =>
        expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
          'Wake-up time: 7:00 PM',
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses five-minute steps when the user drags the minute wheel', async () => {
    renderOnboardingScreen();

    answerName();

    fireEvent(screen.getByTestId('onboarding-minute-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 7:05 AM',
      ),
    );
  });

  it('waits for momentum to finish before updating a fast time-wheel drag', async () => {
    renderOnboardingScreen();

    answerName();

    fireEvent(screen.getByTestId('onboarding-hour-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 8 * 34,
        },
        velocity: {
          y: 1.2,
        },
      },
    });

    expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent('Wake-up time: 7:00 AM');

    fireEvent(screen.getByTestId('onboarding-hour-wheel'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: {
          y: 8 * 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 9:00 AM',
      ),
    );
  });

  it('ignores incomplete time wheel scroll events', () => {
    renderOnboardingScreen();

    answerName();

    fireEvent(screen.getByTestId('onboarding-hour-wheel'), 'scrollEndDrag', {
      nativeEvent: {},
    });

    expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent('Wake-up time: 7:00 AM');
  });

  it('keeps hour and minute wheels clamped at their final values', async () => {
    renderOnboardingScreen();

    answerName();

    fireEvent(screen.getByTestId('onboarding-hour-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 11 * 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 12:00 AM',
      ),
    );

    fireEvent(screen.getByTestId('onboarding-minute-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 11 * 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 12:55 AM',
      ),
    );

    fireEvent(screen.getByTestId('onboarding-minute-wheel'), 'scrollEndDrag', {
      nativeEvent: {
        contentOffset: {
          y: 30 * 34,
        },
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent(
        'Wake-up time: 12:55 AM',
      ),
    );
  });

  it('keeps fast custom commitment time wheel updates when saving the profile', async () => {
    jest.useFakeTimers();

    try {
      renderOnboardingScreen();

      answerName();
      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('Yes'));
      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('Custom'));

      const startHourWheel = screen.getAllByTestId('onboarding-hour-wheel')[0];
      const startMinuteWheel = screen.getAllByTestId('onboarding-minute-wheel')[0];
      const endHourWheel = screen.getAllByTestId('onboarding-hour-wheel')[1];
      const endMinuteWheel = screen.getAllByTestId('onboarding-minute-wheel')[1];

      fireEvent(startHourWheel, 'scrollEndDrag', {
        nativeEvent: {
          contentOffset: {
            y: 8 * 34,
          },
          velocity: {
            y: 1.2,
          },
        },
      });
      fireEvent(startMinuteWheel, 'scrollEndDrag', {
        nativeEvent: {
          contentOffset: {
            y: 34,
          },
          velocity: {
            y: 1.2,
          },
        },
      });
      fireEvent(endHourWheel, 'scrollEndDrag', {
        nativeEvent: {
          contentOffset: {
            y: 10 * 34,
          },
          velocity: {
            y: 1.2,
          },
        },
      });
      fireEvent(endMinuteWheel, 'scrollEndDrag', {
        nativeEvent: {
          contentOffset: {
            y: 6 * 34,
          },
          velocity: {
            y: 1.2,
          },
        },
      });

      act(() => {
        jest.advanceTimersByTime(120);
      });

      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('Morning'));
      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('1-2 hours'));
      fireEvent.press(screen.getByText('Next'));
      fireEvent.press(screen.getByText('Study'));
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => expect(screen.getByText('All set!')).toBeOnTheScreen());
      expect(saveOnboardingProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          'commitment-time': {
            option: 'Custom',
            startTime: '9:05 AM',
            endTime: '11:30 AM',
          },
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('loads a saved profile in edit mode and goes home after saving', async () => {
    getOnboardingProfileMock.mockResolvedValueOnce({
      name: 'Alex',
      wake: '8:00 AM',
      work: '7:00 AM',
      'commitment-presence': 'No',
      focus: 'Evening',
      'free-time': '2-3 hours',
      goal: 'Exercise',
    });
    const { navigation } = renderOnboardingScreen({ mode: 'edit' });

    await waitFor(() => expect(screen.getByDisplayValue('Alex')).toBeOnTheScreen());

    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(screen.getByText('Next'));

    await waitFor(() => expect(screen.getByText('All set!')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Get Started'));

    expect(saveOnboardingProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex',
        wake: '8:00 AM',
        work: '7:00 AM',
        'commitment-presence': 'No',
        focus: 'Evening',
        'free-time': '2-3 hours',
        goal: 'Exercise',
      }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('Home');
  });

  it('waits for the saved profile before showing edit mode defaults', async () => {
    let resolveProfile: (profile: Awaited<ReturnType<typeof getOnboardingProfile>>) => void;
    getOnboardingProfileMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve;
        }),
    );

    renderOnboardingScreen({ mode: 'edit' });

    expect(screen.queryByText('What time do you usually wake up?')).not.toBeOnTheScreen();
    expect(screen.queryByText('Wake-up time: 7:00 AM')).not.toBeOnTheScreen();

    resolveProfile!({
      name: 'Alex',
      wake: '8:00 AM',
      work: '9:00 AM',
      'commitment-presence': 'No',
      focus: 'Evening',
      'free-time': '2-3 hours',
      goal: 'Exercise',
    });

    await waitFor(() => expect(screen.getByDisplayValue('Alex')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByTestId('onboarding-time-helper')).toHaveTextContent('Wake-up time: 8:00 AM');
  });
});
