import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { pool } from '../config/database.js';

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

