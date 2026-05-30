import { describe, expect, it } from '@jest/globals';
import { splitDurationMinutes } from './DurationWheelPicker';

describe('splitDurationMinutes', () => {
  it('rounds 58 minutes up to 1 hour', () => {
    expect(splitDurationMinutes(58)).toEqual({ hours: '1', minutes: '00' });
  });

  it('rounds 59 minutes up to 1 hour', () => {
    expect(splitDurationMinutes(59)).toEqual({ hours: '1', minutes: '00' });
  });

  it('keeps 60 minutes as 1 hour', () => {
    expect(splitDurationMinutes(60)).toEqual({ hours: '1', minutes: '00' });
  });

  it('splits 125 minutes into 2 hours 5 minutes', () => {
    expect(splitDurationMinutes(125)).toEqual({ hours: '2', minutes: '05' });
  });
});
