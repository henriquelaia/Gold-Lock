import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const irsRouter = Router();

// ── Escalões IRS 2024 (Portugal) ──────────────────────────────────────────
const IRS_BRACKETS_2024 = [
  { min: 0,      max: 7703,     rate: 0.1325, parcel: 0 },
  { min: 7703,   max: 11623,    rate: 0.18,   parcel: 411.91 },
  { min: 11623,  max: 16472,    rate: 0.23,   parcel: 992.97 },
  { min: 16472,  max: 21321,    rate: 0.26,   parcel: 1486.92 },
  { min: 21321,  max: 27146,    rate: 0.3275, parcel: 2149.32 },
  { min: 27146,  max: 39791,    rate: 0.37,   parcel: 3395.42 },
  { min: 39791,  max: 51997,    rate: 0.435,  parcel: 5982.08 },
  { min: 51997,  max: 81199,    rate: 0.45,   parcel: 6760.06 },
  { min: 81199,  max: Infinity, rate: 0.48,   parcel: 9196.07 },
];

// ── Limites de deduções à coleta 2024 ────────────────────────────────────
const DEDUCTION_LIMITS_2024 = {
  saude:       { rate: 0.15, limit: 1000, name: 'Saúde (art.º 78.º-C)' },
  educacao:    { rate: 0.30, limit: 800,  name: 'Educação (art.º 78.º-D)' },
  habitacao:   { rate: 0.15, limit: 296,  name: 'Habitação (art.º 78.º-E)' },
  restauracao: { rate: 0.15, limit: 250,  name: 'Restauração/Encargos Gerais (art.º 78.º-B)' },
  ppr:         { rateUnder35: 0.20, rateOver35: 0.20, limitUnder35: 400, limit35to50: 350, limitOver50: 300, name: 'PPR (art.º 21.º EBF)' },
};

function calculateIRS(
  grossIncome: number,
  _maritalStatus: string,
  dependents: number,
  socialSecurity: number,
  withholding: number,
  deductions: Record<string, number>
) {
  const specificDeduction = Math.max(socialSecurity, 4104);
  const collectableIncome = Math.max(grossIncome - specificDeduction, 0);

  const bracket = IRS_BRACKETS_2024.find(b => collectableIncome <= b.max) || IRS_BRACKETS_2024[IRS_BRACKETS_2024.length - 1];
  const grossTax = Math.max(collectableIncome * bracket.rate - bracket.parcel, 0);

  const dependentsDeduction = dependents * 600 + (dependents > 3 ? (dependents - 3) * 126 : 0);
  const healthDeduction     = Math.min((deductions.saude       || 0) * 0.15, 1000);
  const educationDeduction  = Math.min((deductions.educacao    || 0) * 0.30, 800);
  const housingDeduction    = Math.min((deductions.habitacao   || 0) * 0.15, 296);
  const restauracaoDeduction = Math.min((deductions.restauracao || 0) * 0.15, 250);
  const pprDeduction        = Math.min((deductions.ppr         || 0) * 0.20, 400);
  const totalDeductions = dependentsDeduction + healthDeduction + educationDeduction +
                          housingDeduction + restauracaoDeduction + pprDeduction;

  const netTax       = Math.max(grossTax - totalDeductions, 0);
  const result       = netTax - withholding;
  const effectiveRate = grossIncome > 0 ? (netTax / grossIncome) * 100 : 0;

  return {
    grossIncome,
    collectableIncome,
    specificDeduction,
    grossTax,
    deductions: {
      dependents:   dependentsDeduction,
      health:       healthDeduction,
      education:    educationDeduction,
      housing:      housingDeduction,
      restauracao:  restauracaoDeduction,
      ppr:          pprDeduction,
      total:        totalDeductions,
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

const SimulateSchema = z.object({
  grossIncome:                   z.number().positive(),
  maritalStatus:                 z.enum(['single', 'married', 'divorced', 'widowed']).default('single'),
  dependents:                    z.number().int().min(0).default(0),
  socialSecurityContributions:   z.number().min(0).default(0),
  withholdingTax:                z.number().min(0).default(0),
  deductions: z.object({
    saude:       z.number().min(0).default(0),
    educacao:    z.number().min(0).default(0),
    habitacao:   z.number().min(0).default(0),
    restauracao: z.number().min(0).default(0),
    ppr:         z.number().min(0).default(0),
  }).default({}),
  saveSimulation: z.boolean().default(false),
});

irsRouter.post('/simulate', authenticate, async (req, res, next) => {
  try {
    const body = SimulateSchema.parse(req.body);
    const result = calculateIRS(
      body.grossIncome,
      body.maritalStatus,
      body.dependents,
      body.socialSecurityContributions,
      body.withholdingTax,
      body.deductions
    );

    if (body.saveSimulation) {
      await pool.query(
        `INSERT INTO irs_simulations
           (user_id, tax_year, income_category, gross_income, marital_status, dependents, deductions, result)
         VALUES ($1, $2, 'A', $3, $4, $5, $6, $7)`,
        [
          req.user!.id,
          new Date().getFullYear(),
          body.grossIncome,
          body.maritalStatus,
          body.dependents,
          JSON.stringify(body.deductions),
          JSON.stringify(result),
        ]
      );
    }

    res.json({ status: 'success', data: result });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

irsRouter.get('/brackets', authenticate, (_req, res) => {
  res.json({ status: 'success', data: { year: 2024, brackets: IRS_BRACKETS_2024 } });
});

irsRouter.get('/deductions', authenticate, (_req, res) => {
  res.json({ status: 'success', data: DEDUCTION_LIMITS_2024 });
});

irsRouter.get('/deduction-alerts', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT da.*, t.description, t.transaction_date
       FROM deduction_alerts da
       LEFT JOIN transactions t ON da.transaction_id = t.id
       WHERE da.user_id = $1 AND da.status = 'pending'
       ORDER BY da.ml_confidence DESC`,
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

const VALID_DEDUCTION_TYPES = [
  'saude_dedutivel', 'educacao_dedutivel', 'habitacao_dedutivel',
  'encargos_gerais_dedutivel', 'ppr_dedutivel', 'nao_dedutivel',
] as const;

const confirmAlertSchema = z.object({
  confirmedType: z.enum(VALID_DEDUCTION_TYPES),
});

irsRouter.put('/deduction-alerts/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const { confirmedType } = confirmAlertSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE deduction_alerts
       SET status = 'confirmed', user_confirmed_type = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [confirmedType, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Alerta não encontrado' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
