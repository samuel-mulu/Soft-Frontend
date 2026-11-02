import {
  hasStaleRowsWhileFetching,
  showBlockingError,
  showEmpty,
  showErrorBanner,
  showInitialSkeleton,
} from './table-query-state';

describe('table-query-state', () => {
  it('shows skeleton only on first load without data', () => {
    expect(showInitialSkeleton(true, undefined)).toBe(true);
    expect(showInitialSkeleton(true, [])).toBe(false);
    expect(showInitialSkeleton(false, undefined)).toBe(false);
  });

  it('shows empty only after success with zero rows', () => {
    expect(showEmpty(true, 0)).toBe(true);
    expect(showEmpty(true, 2)).toBe(false);
    expect(showEmpty(false, 0)).toBe(false);
  });

  it('keeps rows visible while refetching', () => {
    expect(hasStaleRowsWhileFetching(true, [{ id: '1' }])).toBe(true);
    expect(hasStaleRowsWhileFetching(true, undefined)).toBe(false);
  });

  it('uses non-blocking error when cache exists', () => {
    expect(showErrorBanner(true, [{ id: '1' }])).toBe(true);
    expect(showBlockingError(true, undefined)).toBe(true);
    expect(showBlockingError(true, [{ id: '1' }])).toBe(false);
  });
});
