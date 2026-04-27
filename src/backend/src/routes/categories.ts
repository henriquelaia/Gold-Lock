import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, name_pt, icon, color, is_expense, irs_deduction_category
       FROM categories ORDER BY name_pt`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

const createCategorySchema = z.object({
  name:      z.string().min(1).max(100),
  namePt:    z.string().min(1).max(100),
  icon:      z.string().max(10).optional(),
  color:     z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isExpense: z.boolean().optional(),
});

categoriesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = createCategorySchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO categories (name, name_pt, icon, color, is_expense)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [body.name, body.namePt, body.icon ?? 'circle-dot', body.color ?? '#9E9E9E', body.isExpense ?? true]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});
