import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('keeps stable list roots for invalidation', () => {
    expect(queryKeys.customers.all()).toEqual(['/customers']);
    expect(queryKeys.products.all()).toEqual(['/products']);
    expect(queryKeys.inventory.warehouseSummary()).toEqual(['/inventory/warehouse-summary']);
  });

  it('includes report filters in keys', () => {
    const filters = { from: '2026-01-01', to: '2026-01-31', payMethod: 'CASH' as const };
    expect(queryKeys.reports.summary(filters)).toEqual([
      'reports',
      'summary',
      '2026-01-01',
      '2026-01-31',
      'CASH',
    ]);
    expect(queryKeys.reports.activity(filters)).toEqual([
      'reports',
      'activity',
      '2026-01-01',
      '2026-01-31',
      'CASH',
    ]);
  });

  it('scopes bottle type detail keys', () => {
    expect(queryKeys.inventory.bottleTypeSummary('bt-1')).toEqual([
      '/inventory/bottle-types/bt-1/summary',
    ]);
  });
});
