import { useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import type { TaskInputRow } from '../types/task';

type Args = {
  selectedTaskId: string | null;
  selectedTask: TaskInputRow | null;
};

export function useTaskTitleFocus({ selectedTaskId, selectedTask }: Args) {
  const titleInputRef = useRef<TextInput>(null);
  const [titleFocusRequest, setTitleFocusRequest] = useState(0);

  const focusTitle = () => {
    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  };

  useEffect(() => {
    if (!selectedTaskId || !selectedTask) return undefined;
    return focusTitle();
  }, [selectedTask?.id, selectedTaskId]);

  useEffect(() => {
    if (!titleFocusRequest) return undefined;
    return focusTitle();
  }, [titleFocusRequest]);

  const requestTitleFocus = () => {
    setTitleFocusRequest((count) => count + 1);
  };

  const confirmWithTitleFocus = (needsTitleFocus: boolean) => {
    if (needsTitleFocus) {
      requestTitleFocus();
    }
  };

  return { titleInputRef, confirmWithTitleFocus };
}
