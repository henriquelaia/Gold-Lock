import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, categoriesApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MOCK_TRANSACTIONS, monthIncome, monthExpenses, monthSavings, CATEGORIES } from '../data/mock';
import type { Transaction, TransactionSummary, TransactionListMeta } from '../types/transactions';

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense';
  search?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

interface TransactionListResult {
  data: Transaction[];
  meta: TransactionListMeta;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

function buildDemoTransactions(filters: TransactionFilters): TransactionListResult {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  let txs = MOCK_TRANSACTIONS.map(t => {
    const cat = CATEGORIES[t.categoryId];
    return {
      id: t.id,
      bank_account_id: t.accountId,
      category_id: t.categoryId,
      description: t.description,
      amount: t.isExpense ? String(-t.amount) : String(t.amount),
      currency: 'EUR',
      transaction_date: t.date,
      is_recurring: t.isRecurring,
      ml_confidence: String(t.mlConfidence ?? 0.9),
      ml_categorized: true,
      notes: null,
      category_name: cat?.name ?? null,
      category_icon: cat?.icon ?? null,
      category_color: cat?.color ?? null,
      bank_name: 'Demo',
    } as Transaction;
  });

  if (filters.type === 'expense') txs = txs.filter(t => Number(t.amount) < 0);
  if (filters.type === 'income')  txs = txs.filter(t => Number(t.amount) > 0);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    txs = txs.filter(t => t.description.toLowerCase().includes(q));
  }

  const total = txs.length;
  const page = filters.page ?? 1;
  const sliceOffset = filters.page ? (page - 1) * limit : offset;

  return {
    data: txs.slice(sliceOffset, sliceOffset + limit),
    meta: { total, limit, offset: sliceOffset },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResult>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') return buildDemoTransactions(filters);
      const { data } = await transactionsApi.list(filters as Record<string, string | number>);
      return {
        data: data.data as Transaction[],
        meta: data.meta as TransactionListMeta,
        pagination: data.pagination,
      };
    },
  });
}

export function useTransactionSummary(month?: string) {
  return useQuery<TransactionSummary>({
    queryKey: ['transactions', 'summary', month ?? 'current'],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') {
        return {
          month: new Date().toISOString().slice(0, 7),
          income: monthIncome,
          expenses: monthExpenses,
          savings: monthSavings,
          transaction_count: MOCK_TRANSACTIONS.length,
          byCategory: [],
          byMonth: [],
        } as TransactionSummary;
      }
      const { data } = await transactionsApi.summary(month);
      return data.data as TransactionSummary;
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      transactionsApi.updateCategory(id, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'summary'] });
    },
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      useAuthStore.getState().accessToken === 'demo-token'
        ? Promise.resolve(undefined as never)
        : transactionsApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
