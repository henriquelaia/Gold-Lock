import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const budgetsRouter = Router();

const BudgetSchema = z.object({
  name:            z.string().min(1).max(255),
  categoryId:      z.string().uuid().optional(),
  amountLimit:     z.number().positive(),
  period:          z.enum(['monthly', 'weekly', 'yearly']).default('monthly'),
  alertThreshold:  z.number().min(1).max(100).default(80),
  startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

budgetsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              c.name_pt AS category_name, c.icon AS category_icon, c.color AS category_color,
              COALESCE((
                SELECT SUM(ABS(t.amount))
                FROM transactions t
                WHERE t.category_id = b.category_id
                  AND t.user_id     = b.user_id
                  AND t.amount < 0
                  AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
              ), 0) AS spent
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

budgetsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = BudgetSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO budgets
         (user_id, category_id, name, amount_limit, period, alert_threshold, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user!.id,
        body.categoryId || null,
        body.name,
        body.amountLimit,
        body.period,
        body.alertThreshold,
        body.startDate,
        body.endDate || null,
      ]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

budgetsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const body = BudgetSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.name           !== undefined) { sets.push(`name = $${i++}`);            params.push(body.name); }
    if (body.amountLimit    !== undefined) { sets.push(`amount_limit = $${i++}`);    params.push(body.amountLimit); }
    if (body.alertThreshold !== undefined) { sets.push(`alert_threshold = $${i++}`); params.push(body.alertThreshold); }
    if (body.categoryId     !== undefined) { sets.push(`category_id = $${i++}`);     params.push(body.categoryId); }
    if (body.endDate        !== undefined) { sets.push(`end_date = $${i++}`);        params.push(body.endDate); }

    if (sets.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nenhum campo para actualizar' });
      return;
    }
    sets.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE budgets SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

budgetsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' });
      return;
    }
    res.json({ status: 'success', message: 'Orçamento eliminado' });
  } catch (err) {
    next(err);
  }
});

budgetsRouter.get('/:id/progress', authenticate, async (req, res, next) => {
  try {
    const budget = await pool.query(
      'SELECT * FROM budgets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (budget.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Orçamento não encontrado' });
      return;
    }
    const b = budget.rows[0];

    const spent = await pool.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) AS spent
       FROM transactions
       WHERE category_id = $1 AND user_id = $2 AND amount < 0
         AND transaction_date >= $3::date
         AND ($4::date IS NULL OR transaction_date <= $4::date)`,
      [b.category_id, req.user!.id, b.start_date, b.end_date ?? null]
    );

    const spentAmount = Number(spent.rows[0].spent);
    const limit = Number(b.amount_limit);
    const percentage = limit > 0 ? Math.round((spentAmount / limit) * 100) : 0;

    res.json({
      status: 'success',
      data: { ...b, spent: spentAmount, percentage, isOverBudget: percentage > 100 },
    });
  } catch (err) {
    next(err);
  }
});
