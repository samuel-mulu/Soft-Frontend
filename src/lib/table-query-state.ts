/** UI state helpers for tables backed by TanStack Query. */

export function showInitialSkeleton(isLoading: boolean, data: unknown): boolean {
  return isLoading && data === undefined;
}

export function showEmpty(isSuccess: boolean, rowCount: number): boolean {
  return isSuccess && rowCount === 0;
}

export function hasStaleRowsWhileFetching(isFetching: boolean, data: unknown): boolean {
  return isFetching && data !== undefined;
}

export function showErrorBanner(isError: boolean, data: unknown): boolean {
  return isError && data !== undefined;
}

export function showBlockingError(isError: boolean, data: unknown): boolean {
  return isError && data === undefined;
}
