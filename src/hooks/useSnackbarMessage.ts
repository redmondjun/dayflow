import { useState } from 'react';

export function useSnackbarMessage() {
  const [message, setMessage] = useState<string | null>(null);
  return { message, setMessage };
}
