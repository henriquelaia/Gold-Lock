/**
 * Motor de cálculo IRS 2026 (Portugal — Categoria A, trabalho dependente).
 *
 * Fonte: Lei n.º 73-A/2025 de 31 de dezembro (OE 2026) — art.º 68.º CIRS.
 * Parcelas a abater: parcel(n) = parcel(n-1) + max(n-1) × (rate(n) - rate(n-1))
 * Dedução específica Cat. A: €4,104 (OE 2026 — confirmar publicação AT se atualizado).
 */

export interface IrsBracket {
  min: number;
  max: number;
  rate: number;
  parcel: number;
}

export const IRS_BRACKETS_2026: readonly IrsBracket[] = [
  { min: 0,      max: 8342,     rate: 0.1250, parcel: 0        },
  { min: 8342,   max: 12587,    rate: 0.1570, parcel: 266.94   },
  { min: 12587,  max: 17838,    rate: 0.2120, parcel: 959.23   },
  { min: 17838,  max: 23089,    rate: 0.2410, parcel: 1476.53  },
  { min: 23089,  max: 29397,    rate: 0.3110, parcel: 3092.76  },
  { min: 29397,  max: 43090,    rate: 0.3490, parcel: 4209.85  },
  { min: 43090,  max: 46567,    rate: 0.4310, parcel: 7743.23  },
  { min: 46567,  max: 86634,    rate: 0.4460, parcel: 8441.73  },
  { min: 86634,  max: Infinity, rate: 0.4800, parcel: 11387.29 },
];

export const DEDUCTION_LIMITS_2026 = {
  saude:       { rate: 0.15, limit: 1000, name: 'Saúde (art.º 78.º-C CIRS)' },
  educacao:    { rate: 0.30, limit: 800,  name: 'Educação (art.º 78.º-D CIRS)' },
  habitacao:   { rate: 0.15, limit: 296,  name: 'Habitação/Juros (art.º 78.º-E CIRS)' },
  restauracao: { rate: 0.15, limit: 250,  name: 'Restauração/Encargos Gerais (art.º 78.º-B CIRS)' },
  ppr:         { rate: 0.20, limit: 400,  name: 'PPR (art.º 21.º EBF)' },
} as const;

/** OE 2026 — PPR: limites por faixa etária (art.º 21.º EBF). */
export function getPprLimit(age: number): number {
  if (age <= 34) return 400;
  if (age <= 50) return 350;
  return 300;
}

// IRS Jovem — Art.º 12.º-B CIRS (introduzido OE 2025, mantido OE 2026)
const IRS_JOVEM_EXEMPTION: Record<number, number> = {
  1: 1.00, 2: 0.75, 3: 0.75, 4: 0.75,
  5: 0.50, 6: 0.50, 7: 0.50,
  8: 0.25, 9: 0.25, 10: 0.25,
};
// Teto = 5 × IAS × 14 meses; IAS 2026 = €522,50 → 5 × 522,50 × 14 ≈ €36 575
// Valor de referência usado nas tabelas de retenção: €29 542,15 (confirmar despacho 2026)
const IRS_JOVEM_TETO = 29542.15;

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
  age?: number;          // para limites PPR por faixa etária (art.º 21.º EBF)
  irsJovem?: boolean;    // isenção IRS Jovem (art.º 12.º-B CIRS)
  yearsWorking?: number; // 1–10 anos de carreira após fim de estudos
}

export interface IrsResult {
  grossIncome: number;
  collectableIncome: number;
  specificDeduction: number;
  grossTax: number;
  irsJovemExemption: number;
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
  const { grossIncome, dependents, socialSecurity, withholding, deductions,
          age, irsJovem, yearsWorking } = input;

  // IRS Jovem — isenção parcial (art.º 12.º-B CIRS)
  let irsJovemExemption = 0;
  let taxableGross = grossIncome;
  if (irsJovem && yearsWorking && yearsWorking >= 1 && yearsWorking <= 10) {
    const exemptionRate = IRS_JOVEM_EXEMPTION[Math.min(yearsWorking, 10)] ?? 0;
    irsJovemExemption = Math.min(grossIncome * exemptionRate, IRS_JOVEM_TETO);
    taxableGross = Math.max(grossIncome - irsJovemExemption, 0);
  }

  // 1. Dedução específica Cat. A — art.º 25.º CIRS
  const specificDeduction = Math.max(socialSecurity, 4104);
  const collectableIncome = Math.max(taxableGross - specificDeduction, 0);

  // 2. Imposto bruto via parcela-a-abater (art.º 68.º CIRS — OE 2026)
  const bracket = IRS_BRACKETS_2026.find(b => collectableIncome <= b.max)
                  ?? IRS_BRACKETS_2026[IRS_BRACKETS_2026.length - 1];
  const grossTax = Math.max(collectableIncome * bracket.rate - bracket.parcel, 0);

  // 3. Deduções à coleta
  const dependentsDeduction = dependents * 600 + (dependents > 3 ? (dependents - 3) * 126 : 0);
  const pprLimit = age != null ? getPprLimit(age) : DEDUCTION_LIMITS_2026.ppr.limit;
  const healthDeduction      = Math.min(deductions.saude       * DEDUCTION_LIMITS_2026.saude.rate,       DEDUCTION_LIMITS_2026.saude.limit);
  const educationDeduction   = Math.min(deductions.educacao    * DEDUCTION_LIMITS_2026.educacao.rate,    DEDUCTION_LIMITS_2026.educacao.limit);
  const housingDeduction     = Math.min(deductions.habitacao   * DEDUCTION_LIMITS_2026.habitacao.rate,   DEDUCTION_LIMITS_2026.habitacao.limit);
  const restauracaoDeduction = Math.min(deductions.restauracao * DEDUCTION_LIMITS_2026.restauracao.rate, DEDUCTION_LIMITS_2026.restauracao.limit);
  const pprDeduction         = Math.min(deductions.ppr         * DEDUCTION_LIMITS_2026.ppr.rate,         pprLimit);
  const totalDeductions = dependentsDeduction + healthDeduction + educationDeduction +
                          housingDeduction + restauracaoDeduction + pprDeduction;

  // 4. Resultado final
  const netTax        = Math.max(grossTax - totalDeductions, 0);
  const result        = netTax - withholding;
  const effectiveRate = grossIncome > 0 ? (netTax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    collectableIncome,
    specificDeduction,
    grossTax,
    irsJovemExemption,
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
