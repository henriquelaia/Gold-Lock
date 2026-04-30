/**
 * Motor de cálculo IRS 2024 (Portugal — Categoria A, trabalho dependente).
 *
 * Fonte: Lei n.º 82/2023 de 29 de dezembro (OE 2024) — art.º 68.º CIRS.
 * As parcelas a abater são derivadas da progressividade entre escalões:
 *   parcel(n) = parcel(n-1) + max(n-1) * (rate(n) - rate(n-1))
 */

export interface IrsBracket {
  min: number;
  max: number;
  rate: number;
  parcel: number;
}

export const IRS_BRACKETS_2024: readonly IrsBracket[] = [
  { min: 0,      max: 7703,     rate: 0.1325, parcel: 0       },
  { min: 7703,   max: 11623,    rate: 0.18,   parcel: 365.89  },
  { min: 11623,  max: 16472,    rate: 0.23,   parcel: 947.28  },
  { min: 16472,  max: 21321,    rate: 0.26,   parcel: 1441.20 },
  { min: 21321,  max: 27146,    rate: 0.3275, parcel: 2880.47 },
  { min: 27146,  max: 39791,    rate: 0.37,   parcel: 4034.17 },
  { min: 39791,  max: 51997,    rate: 0.435,  parcel: 6620.43 },
  { min: 51997,  max: 81199,    rate: 0.45,   parcel: 7400.21 },
  { min: 81199,  max: Infinity, rate: 0.48,   parcel: 9836.45 },
];

export const DEDUCTION_LIMITS_2024 = {
  saude:       { rate: 0.15, limit: 1000, name: 'Saúde (art.º 78.º-C)' },
  educacao:    { rate: 0.30, limit: 800,  name: 'Educação (art.º 78.º-D)' },
  habitacao:   { rate: 0.15, limit: 296,  name: 'Habitação (art.º 78.º-E)' },
  restauracao: { rate: 0.15, limit: 250,  name: 'Restauração/Encargos Gerais (art.º 78.º-B)' },
  ppr:         { rate: 0.20, limit: 400,  name: 'PPR (art.º 21.º EBF)' },
} as const;

export interface IrsDeductions {
  saude: number;
  educacao: number;
  habitacao: number;
  restauracao: number;
  ppr: number;
}

export interface IrsInput {
  grossIncome: number;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
  socialSecurity: number;
  withholding: number;
  deductions: IrsDeductions;
}

export interface IrsResult {
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

export function calculateIRS(input: IrsInput): IrsResult {
  const { grossIncome, dependents, socialSecurity, withholding, deductions } = input;

  // 1. Dedução específica Cat. A — máximo entre SS contribuída e 4 104 € (art.º 25.º)
  const specificDeduction = Math.max(socialSecurity, 4104);
  const collectableIncome = Math.max(grossIncome - specificDeduction, 0);

  // 2. Imposto bruto via fórmula parcela-a-abater (art.º 68.º)
  const bracket = IRS_BRACKETS_2024.find(b => collectableIncome <= b.max)
                  ?? IRS_BRACKETS_2024[IRS_BRACKETS_2024.length - 1];
  const grossTax = Math.max(collectableIncome * bracket.rate - bracket.parcel, 0);

  // 3. Deduções à colecta
  const dependentsDeduction = dependents * 600 + (dependents > 3 ? (dependents - 3) * 126 : 0);
  const healthDeduction      = Math.min(deductions.saude       * DEDUCTION_LIMITS_2024.saude.rate,       DEDUCTION_LIMITS_2024.saude.limit);
  const educationDeduction   = Math.min(deductions.educacao    * DEDUCTION_LIMITS_2024.educacao.rate,    DEDUCTION_LIMITS_2024.educacao.limit);
  const housingDeduction     = Math.min(deductions.habitacao   * DEDUCTION_LIMITS_2024.habitacao.rate,   DEDUCTION_LIMITS_2024.habitacao.limit);
  const restauracaoDeduction = Math.min(deductions.restauracao * DEDUCTION_LIMITS_2024.restauracao.rate, DEDUCTION_LIMITS_2024.restauracao.limit);
  const pprDeduction         = Math.min(deductions.ppr         * DEDUCTION_LIMITS_2024.ppr.rate,         DEDUCTION_LIMITS_2024.ppr.limit);
  const totalDeductions = dependentsDeduction + healthDeduction + educationDeduction +
                          housingDeduction + restauracaoDeduction + pprDeduction;

  // 4. Resultado
  const netTax        = Math.max(grossTax - totalDeductions, 0);
  const result        = netTax - withholding;
  const effectiveRate = grossIncome > 0 ? (netTax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    collectableIncome,
    specificDeduction,
    grossTax,
    deductions: {
      dependents:  dependentsDeduction,
      health:      healthDeduction,
      education:   educationDeduction,
      housing:     housingDeduction,
      restauracao: restauracaoDeduction,
      ppr:         pprDeduction,
      total:       totalDeductions,
    },
    netTax,
    withholding,
    result,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    marginalRate:  bracket.rate * 100,
    bracket:       { rate: bracket.rate * 100, min: bracket.min, max: bracket.max === Infinity ? null : bracket.max },
    status:        result > 0 ? 'to_pay' : 'refund',
  };
}
