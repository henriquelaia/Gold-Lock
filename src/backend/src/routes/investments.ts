import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const investmentsRouter = Router();

const InvestmentSchema = z.object({
  name:          z.string().min(1).max(255),
  ticker:        z.string().max(20).optional(),
  type:          z.enum(['stock', 'etf', 'bond', 'crypto', 'certificado', 'deposito']),
  quantity:      z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  currency:      z.string().length(3).default('EUR'),
  riskLevel:     z.enum(['guaranteed', 'moderate', 'high']).default('moderate'),
  institution:   z.string().optional(),
  maturityDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  annualRate:    z.number().min(0).optional(),
  notes:         z.string().optional(),
});

investmentsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

investmentsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = InvestmentSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO investments
         (user_id, name, ticker, type, quantity, purchase_price, purchase_date,
          currency, risk_level, institution, maturity_date, annual_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user!.id,
        body.name,
        body.ticker     ?? null,
        body.type,
        body.quantity,
        body.purchasePrice,
        body.purchaseDate  ?? null,
        body.currency,
        body.riskLevel,
        body.institution  ?? null,
        body.maturityDate ?? null,
        body.annualRate   ?? null,
        body.notes        ?? null,
      ]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

investmentsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const body = InvestmentSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.name          !== undefined) { sets.push(`name = $${i++}`);            params.push(body.name); }
    if (body.ticker        !== undefined) { sets.push(`ticker = $${i++}`);          params.push(body.ticker); }
    if (body.type          !== undefined) { sets.push(`type = $${i++}`);            params.push(body.type); }
    if (body.quantity      !== undefined) { sets.push(`quantity = $${i++}`);        params.push(body.quantity); }
    if (body.purchasePrice !== undefined) { sets.push(`purchase_price = $${i++}`);  params.push(body.purchasePrice); }
    if (body.purchaseDate  !== undefined) { sets.push(`purchase_date = $${i++}`);   params.push(body.purchaseDate); }
    if (body.currency      !== undefined) { sets.push(`currency = $${i++}`);        params.push(body.currency); }
    if (body.riskLevel     !== undefined) { sets.push(`risk_level = $${i++}`);      params.push(body.riskLevel); }
    if (body.institution   !== undefined) { sets.push(`institution = $${i++}`);     params.push(body.institution); }
    if (body.maturityDate  !== undefined) { sets.push(`maturity_date = $${i++}`);   params.push(body.maturityDate); }
    if (body.annualRate    !== undefined) { sets.push(`annual_rate = $${i++}`);     params.push(body.annualRate); }
    if (body.notes         !== undefined) { sets.push(`notes = $${i++}`);           params.push(body.notes); }

    if (sets.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nenhum campo para actualizar' });
      return;
    }
    sets.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE investments SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Investimento não encontrado' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

investmentsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Investimento não encontrado' });
      return;
    }
    res.json({ status: 'success', message: 'Investimento eliminado' });
  } catch (err) {
    next(err);
  }
});
