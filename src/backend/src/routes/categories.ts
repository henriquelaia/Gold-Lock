import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', authenticate, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, name_pt, icon, color, is_expense, irs_deduction_category, parent_id
       FROM categories ORDER BY name_pt`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

const CategorySchema = z.object({
  name:                  z.string().min(1).max(100),
  namePt:                z.string().min(1).max(100),
  icon:                  z.string().max(50).optional(),
  color:                 z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hex #RRGGBB').optional(),
  isExpense:             z.boolean().default(true),
  parentId:              z.string().uuid().optional(),
  irsDeductionCategory:  z.string().max(50).optional(),
});

categoriesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const body = CategorySchema.parse(req.body);

    if (body.parentId) {
      const parent = await pool.query('SELECT id FROM categories WHERE id = $1', [body.parentId]);
      if (parent.rowCount === 0) {
        return next(new AppError('Categoria-pai não encontrada.', 400));
      }
    }

    const result = await pool.query(
      `INSERT INTO categories (name, name_pt, icon, color, is_expense, parent_id, irs_deduction_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, name_pt, icon, color, is_expense, irs_deduction_category, parent_id`,
      [
        body.name,
        body.namePt,
        body.icon ?? null,
        body.color ?? null,
        body.isExpense,
        body.parentId ?? null,
        body.irsDeductionCategory ?? null,
      ]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new AppError(err.errors[0].message, 400));
    next(err);
  }
});

