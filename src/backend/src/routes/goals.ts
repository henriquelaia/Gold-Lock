import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const goalsRouter = Router();

const GoalSchema = z.object({
  name:          z.string().min(1).max(255),
  targetAmount:  z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  deadline:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon:          z.string().optional(),
  color:         z.string().optional(),
});

goalsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

goalsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = GoalSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO savings_goals
         (user_id, name, target_amount, current_amount, deadline, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user!.id,
        body.name,
        body.targetAmount,
        body.currentAmount,
        body.deadline || null,
        body.icon  || '🎯',
        body.color || 'var(--gold)',
      ]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

goalsRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const body = GoalSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.name          !== undefined) { sets.push(`name = $${i++}`);           params.push(body.name); }
    if (body.targetAmount  !== undefined) { sets.push(`target_amount = $${i++}`);  params.push(body.targetAmount); }
    if (body.deadline      !== undefined) { sets.push(`deadline = $${i++}`);       params.push(body.deadline); }
    if (body.icon          !== undefined) { sets.push(`icon = $${i++}`);           params.push(body.icon); }
    if (body.color         !== undefined) { sets.push(`color = $${i++}`);          params.push(body.color); }

    if (sets.length === 0) {
      res.status(400).json({ status: 'error', message: 'Nenhum campo para actualizar' });
      return;
    }
    sets.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE savings_goals SET ${sets.join(', ')} WHERE id = $${i++} AND user_id = $${i++} RETURNING *`,
      [...params, req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Meta não encontrada' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

goalsRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM savings_goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Meta não encontrada' });
      return;
    }
    res.json({ status: 'success', message: 'Meta eliminada' });
  } catch (err) {
    next(err);
  }
});

goalsRouter.put('/:id/deposit', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      res.status(400).json({ status: 'error', message: 'amount deve ser positivo' });
      return;
    }
    const result = await pool.query(
      `UPDATE savings_goals
       SET current_amount = LEAST(current_amount + $1, target_amount), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [Number(amount), req.params.id, req.user!.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ status: 'error', message: 'Meta não encontrada' });
      return;
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
