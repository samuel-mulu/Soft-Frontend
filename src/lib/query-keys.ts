/** TanStack Query key roots for targeted invalidation. */
export const queryKeys = {
  customers: () => ['/customers'] as const,
  customerHistory: (id: string) => [`/customers/${id}/history`] as const,
  customerBottles: (id: string) => [`/customer-bottles/${id}`] as const,
  products: () => ['/products'] as const,
  sales: () => ['/sales'] as const,
  payments: () => ['/payments'] as const,
  inventoryBalances: () => ['/inventory/balances'] as const,
  reportsSummary: () => ['reports', 'summary'] as const,
  reportsActivity: () => ['reports', 'activity'] as const,
  portalHistory: () => ['/portal/history'] as const,
};

export async function invalidateBalanceQueries(
  client: { invalidateQueries: (opts: { queryKey?: readonly string[] }) => Promise<void> },
  customerId?: string,
) {
  const tasks = [
    client.invalidateQueries({ queryKey: queryKeys.customers() }),
    client.invalidateQueries({ queryKey: queryKeys.sales() }),
    client.invalidateQueries({ queryKey: queryKeys.payments() }),
    client.invalidateQueries({ queryKey: queryKeys.inventoryBalances() }),
    client.invalidateQueries({ queryKey: queryKeys.products() }),
    client.invalidateQueries({ queryKey: queryKeys.reportsSummary() }),
    client.invalidateQueries({ queryKey: queryKeys.reportsActivity() }),
  ];
  if (customerId) {
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customerHistory(customerId) }));
    tasks.push(client.invalidateQueries({ queryKey: queryKeys.customerBottles(customerId) }));
  }
  await Promise.all(tasks);
}
