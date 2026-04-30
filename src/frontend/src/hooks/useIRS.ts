import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { irsApi } from '../services/api';
import { toast } from '../store/toastStore';

export interface SimulateInput {
  grossIncome: number;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
  socialSecurityContributions: number;
  withholdingTax: number;
  deductions: {
    saude: number;
    educacao: number;
    habitacao: number;
    restauracao: number;
    ppr: number;
  };
}

export interface SimulationResult {
  grossIncome: number;
  collectableIncome: number;
  specificDeduction: number;
  grossTax: number;
  deductions: {
    dependents: number;
    health: number;
    education: number;
    housing: number;
    restauracao: number;
    ppr: number;
    total: number;
  };
  netTax: number;
  withholding: number;
  result: number;
  effectiveRate: number;
  marginalRate: number;
  bracket: { rate: number; min: number; max: number | null };
  status: 'to_pay' | 'refund';
}

export interface SimulationListItem {
  id: string;
  tax_year: number;
  gross_income: string;
  marital_status: string;
  dependents: number;
  net_tax: string;
  final_result: string;
  status: 'to_pay' | 'refund';
  effective_rate: string;
  created_at: string;
}

export interface DeductionAlert {
  id: string;
  user_id: string;
  transaction_id: string | null;
  deduction_type: string;
  amount: string;
  estimated_deduction: string | null;
  ml_confidence: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  user_confirmed_type: string | null;
  legal_limit: string | null;
  cumulative_amount: string | null;
  limit_reached: boolean;
  fiscal_year: number;
  description: string | null;
  transaction_date: string | null;
}

// ── Cálculo em tempo real (debounced no caller) ─────────────────────────

export function useSimulateIRSPreview(input: SimulateInput | null) {
  return useQuery<SimulationResult>({
    queryKey: ['irs', 'preview', input],
    queryFn: async () => {
      const { data } = await irsApi.simulate({ ...input, saveSimulation: false } as Record<string, unknown>);
      return data.data as SimulationResult;
    },
    enabled: input !== null && input.grossIncome > 0,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}

// ── Persistir simulação ─────────────────────────────────────────────────

export function useSaveSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SimulateInput) =>
      irsApi.simulate({ ...input, saveSimulation: true } as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['irs', 'simulations'] });
      toast.success('Simulação guardada');
    },
    onError: () => toast.error('Erro ao guardar simulação'),
  });
}

// ── Histórico ────────────────────────────────────────────────────────────

export function useIRSSimulations() {
  return useQuery<SimulationListItem[]>({
    queryKey: ['irs', 'simulations'],
    queryFn: async () => {
      const { data } = await irsApi.simulations();
      return data.data as SimulationListItem[];
    },
  });
}

export function useDeleteSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => irsApi.deleteSimulation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['irs', 'simulations'] });
      toast.success('Simulação eliminada');
    },
    onError: () => toast.error('Erro ao eliminar simulação'),
  });
}

// ── Alertas de dedução ──────────────────────────────────────────────────

export function useDeductionAlerts() {
  return useQuery<DeductionAlert[]>({
    queryKey: ['irs', 'deduction-alerts'],
    queryFn: async () => {
      const { data } = await irsApi.deductionAlerts();
      return data.data as DeductionAlert[];
    },
  });
}

export function useConfirmDeductionAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmedType }: { id: string; confirmedType: string }) =>
      irsApi.confirmAlert(id, confirmedType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['irs', 'deduction-alerts'] });
      toast.success('Alerta confirmado');
    },
    onError: () => toast.error('Erro ao confirmar alerta'),
  });
}
