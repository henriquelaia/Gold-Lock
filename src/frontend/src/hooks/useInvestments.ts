import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi } from '../services/api';
import { toast } from '../store/toastStore';

export interface ParsedTxAnnotated {
  isin?: string;
  ticker?: string;
  name: string;
  type: 'stock' | 'etf' | 'crypto';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: string;
  institution: string;
  duplicate: boolean;
}

export interface ImportPreview {
  broker: string;
  transactions: ParsedTxAnnotated[];
  total: number;
}

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: () => investmentsApi.list().then(r => r.data.data),
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: investmentsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento adicionado');
    },
    onError: () => toast.error('Erro ao adicionar investimento'),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: investmentsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success('Investimento removido');
    },
    onError: () => toast.error('Erro ao remover investimento'),
  });
}

export function useImportPdf() {
  return useMutation({
    mutationFn: (file: File) =>
      investmentsApi.importPdf(file).then(r => r.data.data as ImportPreview),
    onError: () => toast.error('Erro ao processar PDF'),
  });
}

export function useConfirmImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactions: Omit<ParsedTxAnnotated, 'duplicate'>[]) =>
      investmentsApi.confirmImport(transactions).then(r => r.data.data as { inserted: number; skipped: number }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['investments'] });
      toast.success(`${data.inserted} importados, ${data.skipped} ignorados`);
    },
    onError: () => toast.error('Erro ao confirmar importação'),
  });
}
