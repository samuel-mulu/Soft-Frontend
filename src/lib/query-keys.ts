/** TanStack Query key factory for targeted invalidation and hooks. */

export type ReportFilters = {
  from: string;
  to: string;
  payMethod: 'all' | 'CASH' | 'BANK' | 'MOBILE';
  /** Empty or omitted means every cashier. A staff id limits the report to that person. */
  cashierId?: string;
};

export const queryKeys = {
  customers: {
    all: () => ['/customers'] as const,
    history: (id: string) => [`/customers/${id}/history`] as const,
    bottles: (id: string) => [`/customer-bottles/${id}`] as const,
  },
  products: {
    all: () => ['/products'] as const,
  },
  sales: {
    all: () => ['/sales'] as const,
    detail: (id: string) => [`/sales/${id}`] as const,
  },
  payments: {
    all: () => ['/payments'] as const,
  },
  inventory: {
    balances: () => ['/inventory/balances'] as const,
    warehouseSummary: () => ['/inventory/warehouse-summary'] as const,
    emptySummary: () => ['/inventory/empty-bottle-summary'] as const,
    bottleTypeSummary: (id: string) => [`/inventory/bottle-types/${id}/summary`] as const,
  },
  bottleTypes: {
    all: () => ['/bottle-types'] as const,
  },
  suppliers: {
    all: () => ['/suppliers'] as const,
  },
  expenses: {
    all: () => ['/expenses'] as const,
  },
  users: {
    all: () => ['/users'] as const,
  },
  reports: {
    summaryRoot: () => ['reports', 'summary'] as const,
    activityRoot: () => ['reports', 'activity'] as const,
    summary: (filters: ReportFilters) =>
      ['reports', 'summary', filters.from, filters.to, filters.payMethod, filters.cashierId || 'all'] as const,
    activity: (filters: ReportFilters) =>
      ['reports', 'activity', filters.from, filters.to, filters.payMethod, filters.cashierId || 'all'] as const,
    dashboardSummary: () => ['/reports/summary'] as const,
  },
  portal: {
    history: () => ['/portal/history'] as const,
  },
  auth: {
    me: () => ['/auth/me'] as const,
  },
};

/** @deprecated Use queryKeys.customers.all() */
export function customersKey() {
  return queryKeys.customers.all();
}

type InvalidationClient = {
  invalidateQueries: (opts: {
    queryKey?: readonly unknown[];
    predicate?: (query: { queryKey: readonly unknown[] }) => boolean;
  }) => Promise<void>;
};

async function invalidateInventorySummaries(client: InvalidationClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.inventory.balances() }),
    client.invalidateQueries({ queryKey: queryKeys.inventory.warehouseSummary() }),
    client.invalidateQueries({ queryKey: queryKeys.inventory.emptySummary() }),
    client.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/inventory/bottle-types/');
      },
    }),
  ]);
}

async function invalidateReports(client: InvalidationClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.reports.summaryRoot() }),
    client.invalidateQueries({ queryKey: queryKeys.reports.activityRoot() }),
    client.invalidateQueries({ queryKey: queryKeys.reports.dashboardSummary() }),
  ]);
}

export async function invalidateAfterProductWrite(client: InvalidationClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.products.all() }),
    invalidateInventorySummaries(client),
    invalidateReports(client),
  ]);
}

export async function invalidateAfterStockMovement(client: InvalidationClient) {
  await invalidateAfterProductWrite(client);
}

export async function invalidateAfterPayment(client: InvalidationClient, customerId?: string) {
  const tasks = [
    client.invalidateQueries({ queryKey: queryKeys.customers.all() }),
    client.invalidateQueries({ queryKey: queryKeys.payments.all() }),
    invalidateReports(client),
  ];
  if (customerId) {
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customers.history(customerId) }));
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customers.bottles(customerId) }));
  }
  await Promise.all(tasks);
}

export async function invalidateAfterExpense(client: InvalidationClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.expenses.all() }),
    invalidateReports(client),
  ]);
}

export async function invalidateAfterSale(client: InvalidationClient, customerId?: string) {
  const tasks = [
    client.invalidateQueries({ queryKey: queryKeys.customers.all() }),
    client.invalidateQueries({ queryKey: queryKeys.sales.all() }),
    client.invalidateQueries({ queryKey: queryKeys.payments.all() }),
    client.invalidateQueries({ queryKey: queryKeys.products.all() }),
    invalidateInventorySummaries(client),
    invalidateReports(client),
  ];
  if (customerId) {
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customers.history(customerId) }));
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customers.bottles(customerId) }));
  }
  await Promise.all(tasks);
}

/** Broad invalidation after mutations (sales, payments, stock, products). */
export async function invalidateBalanceQueries(client: InvalidationClient, customerId?: string) {
  await invalidateAfterSale(client, customerId);
}
