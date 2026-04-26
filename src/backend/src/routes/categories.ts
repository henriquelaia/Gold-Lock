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

categoriesRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, namePt, icon, color, isExpense = true } = req.body;
    if (!name || !namePt) {
      res.status(400).json({ status: 'error', message: 'name e namePt são obrigatórios' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO categories (name, name_pt, icon, color, is_expense)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, namePt, icon || 'circle-dot', color || '#9E9E9E', isExpense]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});
