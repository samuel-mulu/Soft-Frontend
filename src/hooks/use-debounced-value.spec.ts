import { useDebouncedValue } from './use-debounced-value';

jest.useFakeTimers();

describe('useDebouncedValue', () => {
  it('is exported', () => {
    expect(typeof useDebouncedValue).toBe('function');
  });
});
