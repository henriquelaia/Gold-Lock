import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { MOCK_ACCOUNTS } from '../data/mock';
import type { BankAccount } from '../types/accounts';

const DEMO_ACCOUNTS: BankAccount[] = MOCK_ACCOUNTS.map(a => ({
  id: a.id,
  bank_name: a.bankName,
  account_name: a.accountName,
  iban: a.iban,
  balance: String(a.balance),
  currency: a.currency,
  status: 'active' as const,
  last_synced_at: a.lastSynced,
}));

export function useAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      if (useAuthStore.getState().accessToken === 'demo-token') return DEMO_ACCOUNTS;
      const { data } = await accountsApi.list();
      return data.data as BankAccount[];
    },
  });
}

export function useConnectBank() {
  return useMutation({
    mutationFn: async (returnTo?: string) => {
      const { data } = await accountsApi.connect(returnTo);
      return data.data as { connect_url: string };
    },
    onSuccess: ({ connect_url }) => {
      window.open(connect_url, '_blank', 'noopener,noreferrer');
    },
  });
}

export function useDisconnectBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useSyncAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      useAuthStore.getState().accessToken === 'demo-token'
        ? Promise.resolve(undefined as never)
        : accountsApi.balance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
