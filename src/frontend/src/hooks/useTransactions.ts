import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, categoriesApi } from '../services/api';
import type { Transaction, TransactionSummary, TransactionListMeta } from '../types/transactions';
import { toast } from '../store/toastStore';

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

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionListResult>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
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
      toast.success('Categoria atualizada');
    },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });
}

export function useSyncTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => transactionsApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transações sincronizadas');
    },
    onError: () => toast.error('Erro na sincronização'),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });
}
