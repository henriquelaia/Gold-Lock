import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fiscalAssistantApi } from '../services/api';
import { toast } from '../store/toastStore';

export interface DeductionRecommendation {
  transaction_id: string | null;
  merchant: string;
  amount: number;
  deduction_type: string;
  confidence: number;
  legal_article: string;
  deduction_rate: number;
  limit_eur: number;
  estimated_deduction_eur: number;
  is_deductible: boolean;
}

export interface FiscalScenario {
  scenario_id: string;
  label: string;
  tax_saving_eur: number;
  tax_saving_pct: number;
  new_result: number;
  new_effective_rate: number;
  actions: string[];
  status: 'baseline' | 'recomendado' | 'possível';
  irs_jovem_exemption?: number;
}

export interface NextYearLesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'subutilized' | 'non_deductible';
  category?: string;
  category_label?: string;
  merchant?: string;
}

export interface KeepDoingItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'good_habit' | 'good_merchant';
  category?: string;
  category_label?: string;
  merchant?: string;
}

export interface CategoryPrediction {
  cumulative_so_far: number;
  predicted_year_end: number;
  limit_expense: number;
  limit_deduction: number;
  gap_eur: number;
  will_reach_limit: boolean;
  confidence: number;
  alert: string;
  method: string;
}

export interface FiscalScore {
  score: number;
  badge: string;
  breakdown: {
    deduction_coverage: number;
    limit_utilization: number;
    ppr_status: number;
    effective_rate: number;
    bracket_proximity: number;
  };
  optimization_potential_eur: number;
  marginal_rate_pct: number;
  categories_used: string[];
}

export interface FiscalAnalysis {
  fiscal_score: FiscalScore;
  deduction_recommendations: DeductionRecommendation[];
  scenarios: FiscalScenario[];
  predictions: Record<string, CategoryPrediction>;
  this_year_actions: FiscalScenario[];
  next_year_lessons: NextYearLesson[];
  keep_doing: KeepDoingItem[];
  meta: {
    transactions_analysed: number;
    deductible_found: number;
    deduction_agent_trained: boolean;
    predictor_trained: boolean;
    current_month?: number;
  };
}

export function useFiscalAssistant() {
  return useQuery({
    queryKey: ['fiscal-assistant'],
    queryFn: () => fiscalAssistantApi.analyze().then(r => r.data.data as FiscalAnalysis),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTrainFiscalModels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fiscalAssistantApi.train().then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fiscal-assistant'] });
      toast.success('Modelos treinados com sucesso');
    },
    onError: () => toast.error('Erro ao treinar modelos'),
  });
}
