import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  calculateIRS,
  IRS_BRACKETS_2024,
  DEDUCTION_LIMITS_2024,
} from '../services/irsCalculator.js';

export const irsRouter = Router();

// ── POST /simulate — calcular IRS (opcionalmente persistir) ──────────────

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
    const result = calculateIRS({
      grossIncome:    body.grossIncome,
      maritalStatus:  body.maritalStatus,
      dependents:     body.dependents,
      socialSecurity: body.socialSecurityContributions,
      withholding:    body.withholdingTax,
      deductions:     body.deductions,
    });

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

// ── GET /brackets — escalões 2024 ────────────────────────────────────────

irsRouter.get('/brackets', authenticate, (_req, res) => {
  res.json({ status: 'success', data: { year: 2024, brackets: IRS_BRACKETS_2024 } });
});

// ── GET /deductions — limites de dedução ─────────────────────────────────

irsRouter.get('/deductions', authenticate, (_req, res) => {
  res.json({ status: 'success', data: DEDUCTION_LIMITS_2024 });
});

// ── GET /simulations — histórico do utilizador ───────────────────────────

irsRouter.get('/simulations', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, tax_year, gross_income, marital_status, dependents,
              (result->>'netTax')::numeric        AS net_tax,
              (result->>'result')::numeric        AS final_result,
              (result->>'status')                 AS status,
              (result->>'effectiveRate')::numeric AS effective_rate,
              created_at
         FROM irs_simulations
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [req.user!.id],
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /simulations/:id — detalhe de simulação ──────────────────────────

const idParamSchema = z.object({ id: z.string().uuid() });

irsRouter.get('/simulations/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await pool.query(
      `SELECT * FROM irs_simulations WHERE id = $1 AND user_id = $2`,
      [id, req.user!.id],
    );
    if (result.rowCount === 0) throw new AppError('Simulação não encontrada.', 404);
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError('ID de simulação inválido.', 400));
    next(err);
  }
});

// ── DELETE /simulations/:id ──────────────────────────────────────────────

irsRouter.delete('/simulations/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await pool.query(
      `DELETE FROM irs_simulations WHERE id = $1 AND user_id = $2`,
      [id, req.user!.id],
    );
    if (result.rowCount === 0) throw new AppError('Simulação não encontrada.', 404);
    res.json({ status: 'success', message: 'Simulação eliminada.' });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError('ID de simulação inválido.', 400));
    next(err);
  }
});

// ── GET /deduction-alerts — alertas pendentes ────────────────────────────

irsRouter.get('/deduction-alerts', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT da.*, t.description, t.transaction_date
         FROM deduction_alerts da
         LEFT JOIN transactions t ON da.transaction_id = t.id
        WHERE da.user_id = $1 AND da.status = 'pending'
        ORDER BY da.ml_confidence DESC`,
      [req.user!.id],
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── PUT /deduction-alerts/:id/confirm ────────────────────────────────────

const VALID_DEDUCTION_TYPES = [
  'saude_dedutivel', 'educacao_dedutivel', 'habitacao_dedutivel',
  'encargos_gerais_dedutivel', 'ppr_dedutivel', 'nao_dedutivel',
] as const;

const confirmAlertSchema = z.object({
  confirmedType: z.enum(VALID_DEDUCTION_TYPES),
});

irsRouter.put('/deduction-alerts/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { confirmedType } = confirmAlertSchema.parse(req.body);
    const result = await pool.query(
      `UPDATE deduction_alerts
          SET status = 'confirmed', user_confirmed_type = $1
        WHERE id = $2 AND user_id = $3
        RETURNING *`,
      [confirmedType, id, req.user!.id],
    );
    if (result.rowCount === 0) throw new AppError('Alerta não encontrado.', 404);
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
