import { useState } from 'react';
import { Keyboard } from 'react-native';

export function useTimePickerScrollLock() {
  const [scrollEnabled, setScrollEnabled] = useState(true);

  return {
    scrollEnabled,
    onTimeInteractionStart: () => {
      Keyboard.dismiss();
      setScrollEnabled(false);
    },
    onTimeInteractionEnd: () => setScrollEnabled(true),
  };
}
