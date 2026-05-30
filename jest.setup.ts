import '@testing-library/jest-native/extend-expect';
import { afterEach } from '@jest/globals';

// Jest runs against the Expo dev runtime. Default to dev mode so __DEV__-gated
// code is testable without each suite fighting a production baseline.
const DEV_MODE_BASELINE = true;

Reflect.set(globalThis, '__DEV__', DEV_MODE_BASELINE);

afterEach(() => {
  Reflect.set(globalThis, '__DEV__', DEV_MODE_BASELINE);
});
