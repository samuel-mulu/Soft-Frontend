/** TanStack Query staleTime presets (ms). */
export const queryFreshness = {
  list: 45_000,
  detail: 30_000,
  dashboard: 30_000,
  reportFiltered: 15_000,
  reference: 5 * 60 * 1000,
} as const;

export type QueryFreshnessPreset = keyof typeof queryFreshness;
