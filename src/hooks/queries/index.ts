'use client';

import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryFreshness } from '@/lib/query-freshness';
import { queryKeys, type ReportFilters } from '@/lib/query-keys';
import { useApiQuery } from '@/hooks/use-api-query';

function reportApiQuery(filters: ReportFilters) {
  const methodParam = filters.payMethod === 'all' ? '' : `&method=${filters.payMethod}`;
  const cashierParam = filters.cashierId ? `&cashierId=${encodeURIComponent(filters.cashierId)}` : '';
  return `?from=${filters.from}&to=${filters.to}${methodParam}${cashierParam}`;
}

export function useCustomers(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/customers',
    queryKey: queryKeys.customers.all(),
    freshness: 'list',
    enabled,
  });
}

export function useCustomerHistory(customerId: string | undefined, enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: customerId ? `/customers/${customerId}/history` : '',
    queryKey: customerId ? queryKeys.customers.history(customerId) : ['customers', 'history', 'none'],
    freshness: 'detail',
    enabled: enabled && !!customerId,
  });
}

export function usePortalHistory(enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: '/portal/history',
    queryKey: queryKeys.portal.history(),
    freshness: 'detail',
    enabled,
  });
}

export function useCustomerBottles(customerId: string | undefined, enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: customerId ? `/customer-bottles/${customerId}` : '',
    queryKey: customerId ? queryKeys.customers.bottles(customerId) : ['customer-bottles', 'none'],
    freshness: 'detail',
    enabled: enabled && !!customerId,
  });
}

export function useProducts(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/products',
    queryKey: queryKeys.products.all(),
    freshness: 'list',
    enabled,
  });
}

export function useSales(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/sales',
    queryKey: queryKeys.sales.all(),
    freshness: 'list',
    enabled,
  });
}

export function useSale(saleId: string | undefined, enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: saleId ? `/sales/${saleId}` : '',
    queryKey: saleId ? queryKeys.sales.detail(saleId) : ['sales', 'detail', 'none'],
    freshness: 'detail',
    enabled: enabled && !!saleId,
  });
}

export function usePayments(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/payments',
    queryKey: queryKeys.payments.all(),
    freshness: 'list',
    enabled,
  });
}

export function useInventoryBalances(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/inventory/balances',
    queryKey: queryKeys.inventory.balances(),
    freshness: 'list',
    enabled,
  });
}

export function useWarehouseSummary(enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: '/inventory/warehouse-summary',
    queryKey: queryKeys.inventory.warehouseSummary(),
    freshness: 'list',
    enabled,
  });
}

export function useEmptyBottleSummary(enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: '/inventory/empty-bottle-summary',
    queryKey: queryKeys.inventory.emptySummary(),
    freshness: 'list',
    enabled,
  });
}

export function useBottleTypeSummary(bottleTypeId: string, enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: `/inventory/bottle-types/${bottleTypeId}/summary`,
    queryKey: queryKeys.inventory.bottleTypeSummary(bottleTypeId),
    freshness: 'detail',
    enabled: enabled && !!bottleTypeId,
  });
}

export function useBottleTypes(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/bottle-types',
    queryKey: queryKeys.bottleTypes.all(),
    freshness: 'reference',
    enabled,
  });
}

export function useSuppliers(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/suppliers',
    queryKey: queryKeys.suppliers.all(),
    freshness: 'reference',
    enabled,
  });
}

export function useExpenses(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/expenses',
    queryKey: queryKeys.expenses.all(),
    freshness: 'list',
    enabled,
  });
}

export function useUsers(enabled = true) {
  return useApiQuery<Record<string, unknown>[]>({
    path: '/users',
    queryKey: queryKeys.users.all(),
    freshness: 'list',
    enabled,
  });
}

export function useDashboardSummary(enabled = true) {
  return useApiQuery<Record<string, unknown>>({
    path: '/reports/summary',
    queryKey: queryKeys.reports.dashboardSummary(),
    freshness: 'dashboard',
    enabled,
  });
}

export function useReportsSummary(filters: ReportFilters, enabled = true) {
  return useQuery<Record<string, unknown>>({
    queryKey: queryKeys.reports.summary(filters),
    queryFn: () => api(`/reports/summary${reportApiQuery(filters)}`),
    enabled,
    staleTime: queryFreshness.reportFiltered,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
  });
}

export function useReportsActivity(filters: ReportFilters, enabled = true) {
  return useQuery<Record<string, unknown>>({
    queryKey: queryKeys.reports.activity(filters),
    queryFn: () => api(`/reports/activity${reportApiQuery(filters)}`),
    enabled,
    staleTime: queryFreshness.reportFiltered,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
  });
}

export async function prefetchNavRoute(client: QueryClient, section: string) {
  const prefetch = (queryKey: readonly unknown[], path: string, staleTime: number) =>
    client.prefetchQuery({
      queryKey,
      queryFn: () => api(path),
      staleTime,
    });

  switch (section) {
    case 'dashboard':
      await Promise.all([
        prefetch(queryKeys.reports.dashboardSummary(), '/reports/summary', queryFreshness.dashboard),
        prefetch(queryKeys.sales.all(), '/sales', queryFreshness.list),
        prefetch(queryKeys.customers.all(), '/customers', queryFreshness.list),
        prefetch(queryKeys.inventory.balances(), '/inventory/balances', queryFreshness.list),
      ]);
      break;
    case 'customers':
      await prefetch(queryKeys.customers.all(), '/customers', queryFreshness.list);
      break;
    case 'products':
      await Promise.all([
        prefetch(queryKeys.products.all(), '/products', queryFreshness.list),
        prefetch(queryKeys.bottleTypes.all(), '/bottle-types', queryFreshness.reference),
      ]);
      break;
    case 'warehouse':
      await prefetch(
        queryKeys.inventory.warehouseSummary(),
        '/inventory/warehouse-summary',
        queryFreshness.list,
      );
      break;
    case 'inventory':
      await prefetch(
        queryKeys.inventory.emptySummary(),
        '/inventory/empty-bottle-summary',
        queryFreshness.list,
      );
      break;
    case 'sell':
      await Promise.all([
        prefetch(queryKeys.products.all(), '/products', queryFreshness.list),
        prefetch(queryKeys.customers.all(), '/customers', queryFreshness.list),
        prefetch(queryKeys.bottleTypes.all(), '/bottle-types', queryFreshness.reference),
        prefetch(queryKeys.inventory.balances(), '/inventory/balances', queryFreshness.list),
      ]);
      break;
    case 'payments':
      await Promise.all([
        prefetch(queryKeys.payments.all(), '/payments', queryFreshness.list),
        prefetch(queryKeys.customers.all(), '/customers', queryFreshness.list),
        prefetch(queryKeys.bottleTypes.all(), '/bottle-types', queryFreshness.reference),
      ]);
      break;
    case 'sales':
      await prefetch(queryKeys.sales.all(), '/sales', queryFreshness.list);
      break;
    case 'bottles':
      await Promise.all([
        prefetch(queryKeys.customers.all(), '/customers', queryFreshness.list),
        prefetch(queryKeys.bottleTypes.all(), '/bottle-types', queryFreshness.reference),
      ]);
      break;
    default:
      break;
  }
}
